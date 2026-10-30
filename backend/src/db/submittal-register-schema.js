import { readFileSync } from "node:fs";
import pool from "./pool.js";
import { DEFAULT_REVIEW_DAYS } from "../constants/submittal-register.js";

const masterItemsSeed = JSON.parse(readFileSync(new URL("../data/submittal-master-items.json", import.meta.url), "utf8"));

const ITEM_TEXT_COLUMNS = `
  spec_section VARCHAR(20) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  discipline VARCHAR(60) NOT NULL DEFAULT '',
  submittal_type VARCHAR(60) NOT NULL DEFAULT '',
  reviewer VARCHAR(80) NOT NULL DEFAULT '',
  ahj VARCHAR(120) NOT NULL DEFAULT '',
  signed_sealed BOOLEAN NOT NULL DEFAULT FALSE,
  long_lead BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_related BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
`;

const schemaSql = `
CREATE TABLE IF NOT EXISTS submittal_master_items (
  id BIGSERIAL PRIMARY KEY,
  submittal_no VARCHAR(40) NOT NULL UNIQUE,
  ${ITEM_TEXT_COLUMNS}
  seen_on TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_register_items (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES product_list(project_id) ON DELETE CASCADE ON UPDATE CASCADE,
  master_item_id BIGINT REFERENCES submittal_master_items(id) ON DELETE SET NULL,
  submittal_no VARCHAR(40) NOT NULL,
  ${ITEM_TEXT_COLUMNS}
  in_use BOOLEAN NOT NULL DEFAULT TRUE,
  subcontractor VARCHAR(255) NOT NULL DEFAULT '',
  lead_time_weeks INTEGER CHECK (lead_time_weeks >= 0),
  needed_on_site DATE,
  sent_to_ahj DATE,
  ahj_approved DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, submittal_no)
);

CREATE TABLE IF NOT EXISTS submittal_log_entries (
  id BIGSERIAL PRIMARY KEY,
  register_item_id BIGINT NOT NULL REFERENCES project_register_items(id) ON DELETE CASCADE,
  rev INTEGER NOT NULL CHECK (rev >= 0),
  received_from_sub DATE,
  sent_to VARCHAR(80) NOT NULL DEFAULT '',
  date_sent DATE,
  returned_by_reviewer DATE,
  action_code VARCHAR(40) NOT NULL DEFAULT '',
  returned_to_sub DATE,
  gc_transmittal_no VARCHAR(80) NOT NULL DEFAULT '',
  comments TEXT NOT NULL DEFAULT '',
  legacy_submittal_id BIGINT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (register_item_id, rev)
);

CREATE INDEX IF NOT EXISTS idx_register_items_project ON project_register_items(project_id);

ALTER TABLE product_list ADD COLUMN IF NOT EXISTS review_days INTEGER NOT NULL DEFAULT ${DEFAULT_REVIEW_DAYS};
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
`;

export const COPYABLE_ITEM_COLUMNS = [
  "submittal_no",
  "spec_section",
  "description",
  "discipline",
  "submittal_type",
  "reviewer",
  "ahj",
  "signed_sealed",
  "long_lead",
  "inspection_related",
  "notes"
];

/**
 * Copy the active master items into a project's register. Items the project already has are skipped.
 */
export const copyMasterItemsToProject = async (client, projectId, { inUse = true, masterItemIds = null } = {}) => {
  const columns = COPYABLE_ITEM_COLUMNS.join(", ");
  const { rowCount } = await client.query(
    `INSERT INTO project_register_items (project_id, master_item_id, in_use, ${columns})
     SELECT $1, m.id, $2, ${COPYABLE_ITEM_COLUMNS.map((column) => `m.${column}`).join(", ")}
     FROM submittal_master_items m
     WHERE m.is_active AND ($3::bigint[] IS NULL OR m.id = ANY($3::bigint[]))
     ORDER BY m.submittal_no
     ON CONFLICT (project_id, submittal_no) DO NOTHING`,
    [projectId, inUse, masterItemIds]
  );
  return rowCount;
};

const seedMasterItems = async (client) => {
  const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM submittal_master_items");
  if (rows[0].count > 0) return 0;

  const columns = [...COPYABLE_ITEM_COLUMNS, "seen_on"];
  for (const item of masterItemsSeed) {
    await client.query(
      `INSERT INTO submittal_master_items (${columns.join(", ")})
       VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})
       ON CONFLICT (submittal_no) DO NOTHING`,
      columns.map((column) => item[column])
    );
  }
  return masterItemsSeed.length;
};

// Every project gets the full register; projects created before it existed are filled in here.
const backfillProjects = async (client) => {
  const { rows } = await client.query(
    `SELECT p.project_id
     FROM product_list p
     WHERE NOT EXISTS (SELECT 1 FROM project_register_items r WHERE r.project_id = p.project_id)`
  );
  for (const { project_id: projectId } of rows) {
    await copyMasterItemsToProject(client, projectId);
  }
  return rows.length;
};

const LEGACY_ACTION_CODES = {
  approved: "Approved",
  "not approved": "Rejected",
  "under revision": "Revise & Resubmit"
};

const parseRevision = (value) => {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

/**
 * Copy rows from the old flat submittal_tracker into the register as log entries.
 * The old table is left untouched; each row is copied once (tracked by legacy_submittal_id).
 */
const migrateLegacySubmittals = async (client) => {
  const { rows: tableExists } = await client.query("SELECT to_regclass('public.submittal_tracker') IS NOT NULL AS exists");
  if (!tableExists[0].exists) return 0;

  const { rows: legacyRows } = await client.query(
    `SELECT s.id, s.project_id, s.division_csi, s.submittal_number, s.subject, s.contractor,
            s.date_received::text, s.sent_to_aor, s.sent_to_eor, s.sent_to_subcontractor, s.sent_to_date::text,
            s.approvers, s.approval_status, s.lifecycle_status, s.revision, s.due_date::text,
            s.overall_status, s.responsible, s.workflow_stage, s.notes
     FROM submittal_tracker s
     JOIN product_list p ON p.project_id = s.project_id
     WHERE NOT EXISTS (SELECT 1 FROM submittal_log_entries l WHERE l.legacy_submittal_id = s.id)
     ORDER BY s.id`
  );

  for (const legacy of legacyRows) {
    const number = String(legacy.submittal_number || "").trim() || `LEGACY-${legacy.id}`;
    let { rows: items } = await client.query(
      "SELECT id, reviewer FROM project_register_items WHERE project_id = $1 AND submittal_no = $2",
      [legacy.project_id, number]
    );
    if (!items[0]) {
      ({ rows: items } = await client.query(
        `INSERT INTO project_register_items (project_id, submittal_no, description, subcontractor, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, reviewer`,
        [
          legacy.project_id,
          number,
          String(legacy.subject || "").trim() || "Migrated submittal",
          String(legacy.contractor || "").trim(),
          legacy.division_csi ? `Division: ${legacy.division_csi}` : ""
        ]
      ));
    }
    const registerItem = items[0];
    await client.query("UPDATE project_register_items SET in_use = TRUE WHERE id = $1 AND NOT in_use", [registerItem.id]);

    const { rows: usedRevs } = await client.query("SELECT rev FROM submittal_log_entries WHERE register_item_id = $1", [registerItem.id]);
    const taken = new Set(usedRevs.map((row) => row.rev));
    let rev = parseRevision(legacy.revision) ?? 0;
    while (taken.has(rev)) rev += 1;

    const statusText = String(legacy.overall_status || legacy.approval_status || "").trim();
    const actionCode = LEGACY_ACTION_CODES[statusText.toLowerCase()] || "";
    const wasSent = Boolean(String(legacy.sent_to_aor || "").trim() || String(legacy.sent_to_eor || "").trim());
    const isClosed = String(legacy.lifecycle_status || "").toLowerCase() === "closed";
    // The old tracker had no return dates. Closed rows get the best date available so they stay closed.
    const approximateReturn = isClosed ? legacy.sent_to_date || legacy.date_received || legacy.due_date : null;

    const commentLines = [
      "Migrated from the previous submittal tracker.",
      legacy.sent_to_aor && `Sent to AOR: ${legacy.sent_to_aor}`,
      legacy.sent_to_eor && `Sent to EOR: ${legacy.sent_to_eor}`,
      legacy.sent_to_subcontractor && `Sent to subcontractor: ${legacy.sent_to_subcontractor}`,
      legacy.approvers && `Approvers: ${legacy.approvers}`,
      statusText && `Status: ${statusText}`,
      legacy.responsible && `Responsible: ${legacy.responsible}`,
      legacy.workflow_stage && `Workflow stage: ${legacy.workflow_stage}`,
      legacy.due_date && `Due date: ${legacy.due_date}`,
      approximateReturn && `Return dates set to ${approximateReturn} (not recorded in the old tracker).`,
      legacy.notes && `Notes: ${legacy.notes}`
    ].filter(Boolean);

    await client.query(
      `INSERT INTO submittal_log_entries (
         register_item_id, rev, received_from_sub, sent_to, date_sent, returned_by_reviewer,
         action_code, returned_to_sub, comments, legacy_submittal_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        registerItem.id,
        rev,
        legacy.date_received,
        wasSent ? registerItem.reviewer || (legacy.sent_to_aor ? "Architect" : "Reviewer") : "",
        legacy.sent_to_date,
        approximateReturn,
        isClosed && !actionCode ? "Approved" : actionCode,
        approximateReturn,
        commentLines.join("\n"),
        legacy.id
      ]
    );
  }
  return legacyRows.length;
};

// Without an admin nobody could edit the master list, so the oldest account becomes admin.
const bootstrapAdmin = async (client) => {
  await client.query(
    `UPDATE app_users SET is_admin = TRUE
     WHERE id = (SELECT MIN(id) FROM app_users)
       AND NOT EXISTS (SELECT 1 FROM app_users WHERE is_admin)`
  );
};

export const ensureSubmittalRegisterSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('submittal_register_setup'))");
    await client.query(schemaSql);
    const seeded = await seedMasterItems(client);
    const backfilled = await backfillProjects(client);
    const migrated = await migrateLegacySubmittals(client);
    await bootstrapAdmin(client);
    await client.query("COMMIT");
    if (seeded || backfilled || migrated) {
      console.log(`Submittal register: seeded ${seeded} master items, filled ${backfilled} projects, migrated ${migrated} submittals.`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
