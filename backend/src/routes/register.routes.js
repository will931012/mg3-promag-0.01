import { Router } from "express";
import pool from "../db/pool.js";
import { copyMasterItemsToProject } from "../db/submittal-register-schema.js";
import { adminRequired } from "../middleware/auth.js";
import {
  ACTION_CODES,
  ACTION_CODES_SET,
  ALERTS,
  DEFAULT_REVIEW_DAYS,
  DISCIPLINES,
  REVIEWERS,
  SUBMITTAL_TYPES,
  TRADES
} from "../constants/submittal-register.js";
import { loadComputedItem, loadComputedItems } from "../services/register-repository.js";
import { summarizeRegister } from "../services/register-status.js";

const router = Router();

class ValidationError extends Error {}

const asText = (value) => String(value ?? "").trim();

const asDate = (value, label) => {
  const text = asText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) {
    throw new ValidationError(`${label} must be a date (YYYY-MM-DD).`);
  }
  return text;
};

const asWholeNumber = (value, label, { nullable = true } = {}) => {
  const text = asText(value);
  if (!text && nullable) return null;
  const number = Number(text);
  if (!Number.isInteger(number) || number < 0) throw new ValidationError(`${label} must be a whole number of 0 or more.`);
  return number;
};

const asId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError("Invalid id.");
  return id;
};

const ITEM_FIELD_PARSERS = {
  submittal_no: (value) => {
    const text = asText(value);
    if (!text) throw new ValidationError("Submittal No. is required.");
    return text;
  },
  description: (value) => {
    const text = asText(value);
    if (!text) throw new ValidationError("Description is required.");
    return text;
  },
  spec_section: asText,
  discipline: asText,
  submittal_type: asText,
  reviewer: asText,
  ahj: asText,
  notes: asText,
  signed_sealed: Boolean,
  long_lead: Boolean,
  inspection_related: Boolean
};

const PROJECT_ITEM_FIELD_PARSERS = {
  ...ITEM_FIELD_PARSERS,
  in_use: Boolean,
  subcontractor: asText,
  lead_time_weeks: (value) => asWholeNumber(value, "Lead time (weeks)"),
  needed_on_site: (value) => asDate(value, "Needed on site"),
  sent_to_ahj: (value) => asDate(value, "Sent to AHJ"),
  ahj_approved: (value) => asDate(value, "AHJ approved")
};

const MASTER_FIELD_PARSERS = { ...ITEM_FIELD_PARSERS, seen_on: asText, is_active: Boolean };

const LOG_FIELD_PARSERS = {
  rev: (value) => asWholeNumber(value, "Rev", { nullable: false }),
  received_from_sub: (value) => asDate(value, "Received from subcontractor"),
  sent_to: asText,
  date_sent: (value) => asDate(value, "Date sent to reviewer"),
  returned_by_reviewer: (value) => asDate(value, "Returned by reviewer"),
  action_code: (value) => {
    const text = asText(value);
    if (text && !ACTION_CODES_SET.has(text)) throw new ValidationError(`Action code must be one of: ${ACTION_CODES.join(", ")}.`);
    return text;
  },
  returned_to_sub: (value) => asDate(value, "Returned to subcontractor"),
  gc_transmittal_no: asText,
  comments: asText
};

/**
 * Parse the fields present in `body`. With `all`, every listed field is parsed (missing ones get their empty value).
 */
const parseFields = (body, parsers, { all = false } = {}) => {
  const values = {};
  for (const [field, parse] of Object.entries(parsers)) {
    if (all || Object.prototype.hasOwnProperty.call(body ?? {}, field)) values[field] = parse(body?.[field]);
  }
  return values;
};

const buildUpdate = (table, id, values) => {
  const fields = Object.keys(values);
  const assignments = fields.map((field, index) => `${field} = $${index + 2}`);
  return {
    sql: `UPDATE ${table} SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $1`,
    params: [id, ...fields.map((field) => values[field])]
  };
};

const handle = (label, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ detail: error.message });
    if (error?.code === "23505") return res.status(409).json({ detail: `${label}: that number is already used.` });
    console.error(`${label} failed:`, error?.message || error);
    return res.status(500).json({ detail: `${label} failed.` });
  }
};

router.get("/meta", (_req, res) =>
  res.json({
    default_review_days: DEFAULT_REVIEW_DAYS,
    reviewers: REVIEWERS,
    action_codes: ACTION_CODES,
    disciplines: DISCIPLINES,
    submittal_types: SUBMITTAL_TYPES,
    trades: TRADES,
    alerts: Object.values(ALERTS)
  })
);

// ---------------------------------------------------------------------------
// Project register
// ---------------------------------------------------------------------------

router.get(
  "/projects/:projectId",
  handle("Load register", async (req, res) => {
    const { rows } = await pool.query("SELECT project_id, project_name, review_days FROM product_list WHERE project_id = $1", [
      req.params.projectId
    ]);
    if (!rows[0]) return res.status(404).json({ detail: "Project not found." });
    const items = await loadComputedItems({ projectId: req.params.projectId });
    return res.json({ project: rows[0], items });
  })
);

router.patch(
  "/projects/:projectId/settings",
  handle("Update review period", async (req, res) => {
    const reviewDays = asWholeNumber(req.body?.review_days, "Review period (days)", { nullable: false });
    const { rows } = await pool.query(
      "UPDATE product_list SET review_days = $2 WHERE project_id = $1 RETURNING project_id, project_name, review_days",
      [req.params.projectId, reviewDays]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Project not found." });
    return res.json(rows[0]);
  })
);

router.post(
  "/projects/:projectId/items",
  handle("Add register item", async (req, res) => {
    const values = parseFields(req.body, PROJECT_ITEM_FIELD_PARSERS, { all: true });
    if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, "in_use")) values.in_use = true;
    const fields = ["project_id", ...Object.keys(values)];
    const { rows } = await pool.query(
      `INSERT INTO project_register_items (${fields.join(", ")})
       SELECT $1::varchar, ${fields.slice(1).map((_, index) => `$${index + 2}`).join(", ")}
       WHERE EXISTS (SELECT 1 FROM product_list WHERE project_id = $1::varchar)
       RETURNING id`,
      [req.params.projectId, ...Object.values(values)]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Project not found." });
    return res.status(201).json(await loadComputedItem(rows[0].id));
  })
);

router.patch(
  "/items/:id",
  handle("Update register item", async (req, res) => {
    const id = asId(req.params.id);
    const values = parseFields(req.body, PROJECT_ITEM_FIELD_PARSERS);
    if (!Object.keys(values).length) throw new ValidationError("Nothing to update.");
    const { sql, params } = buildUpdate("project_register_items", id, values);
    const { rowCount } = await pool.query(sql, params);
    if (!rowCount) return res.status(404).json({ detail: "Register item not found." });
    return res.json(await loadComputedItem(id));
  })
);

// Only items added to this project (not from the master list) can be deleted, and only before anything was logged.
// Master items are switched off with in_use instead, like marking N in the spreadsheet.
router.delete(
  "/items/:id",
  handle("Delete register item", async (req, res) => {
    const id = asId(req.params.id);
    const { rows } = await pool.query(
      `SELECT r.master_item_id, (SELECT COUNT(*)::int FROM submittal_log_entries l WHERE l.register_item_id = r.id) AS submissions
       FROM project_register_items r WHERE r.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Register item not found." });
    if (rows[0].master_item_id) return res.status(409).json({ detail: "Items from the master list can't be deleted. Mark them as not used instead." });
    if (rows[0].submissions) return res.status(409).json({ detail: "This item has submissions logged. Delete those first." });
    await pool.query("DELETE FROM project_register_items WHERE id = $1", [id]);
    return res.status(204).send();
  })
);

// ---------------------------------------------------------------------------
// Submission log
// ---------------------------------------------------------------------------

router.post(
  "/items/:id/log",
  handle("Add submission", async (req, res) => {
    const itemId = asId(req.params.id);
    const body = { ...req.body };
    if (asText(body.rev) === "") {
      const { rows } = await pool.query("SELECT COALESCE(MAX(rev) + 1, 0) AS next_rev FROM submittal_log_entries WHERE register_item_id = $1", [
        itemId
      ]);
      body.rev = rows[0].next_rev;
    }
    const values = parseFields(body, LOG_FIELD_PARSERS, { all: true });
    const fields = ["register_item_id", ...Object.keys(values)];
    const { rowCount } = await pool.query(
      `INSERT INTO submittal_log_entries (${fields.join(", ")})
       SELECT ${fields.map((_, index) => `$${index + 1}`).join(", ")}
       WHERE EXISTS (SELECT 1 FROM project_register_items WHERE id = $1)`,
      [itemId, ...Object.values(values)]
    );
    if (!rowCount) return res.status(404).json({ detail: "Register item not found." });
    return res.status(201).json(await loadComputedItem(itemId));
  })
);

router.patch(
  "/log/:id",
  handle("Update submission", async (req, res) => {
    const id = asId(req.params.id);
    const values = parseFields(req.body, LOG_FIELD_PARSERS);
    if (!Object.keys(values).length) throw new ValidationError("Nothing to update.");
    const { sql, params } = buildUpdate("submittal_log_entries", id, values);
    const { rows } = await pool.query(`${sql} RETURNING register_item_id`, params);
    if (!rows[0]) return res.status(404).json({ detail: "Submission not found." });
    return res.json(await loadComputedItem(rows[0].register_item_id));
  })
);

router.delete(
  "/log/:id",
  handle("Delete submission", async (req, res) => {
    const { rows } = await pool.query("DELETE FROM submittal_log_entries WHERE id = $1 RETURNING register_item_id", [asId(req.params.id)]);
    if (!rows[0]) return res.status(404).json({ detail: "Submission not found." });
    return res.json(await loadComputedItem(rows[0].register_item_id));
  })
);

// ---------------------------------------------------------------------------
// Across all projects (dashboard, search)
// ---------------------------------------------------------------------------

const ATTENTION_LIMIT = 50;

const toActivityRow = (item) => {
  const latest = item.log[0] ?? null;
  return {
    id: item.id,
    project_id: item.project_id,
    project_name: item.project_name,
    submittal_no: item.submittal_no,
    description: item.description,
    discipline: item.discipline,
    current_status: item.current_status,
    ball_in_court: item.ball_in_court,
    days_with_ball: item.days_with_ball,
    alert: item.alert,
    latest_rev: item.latest_rev,
    review_due: latest && !latest.returned_by_reviewer ? latest.review_due : null,
    submit_by: item.submit_by
  };
};

router.get(
  "/activity",
  handle("Load register activity", async (_req, res) => {
    const items = await loadComputedItems({ inUseOnly: true });
    // Items that have been submitted or need attention; untouched items would just be noise here.
    const active = items.filter((item) => item.submissions > 0 || item.alert).map(toActivityRow);
    const attention = active
      .filter((item) => item.alert)
      .sort((a, b) => (b.days_with_ball ?? -1) - (a.days_with_ball ?? -1))
      .slice(0, ATTENTION_LIMIT);
    return res.json({ ...summarizeRegister(items), items: active, attention });
  })
);

// ---------------------------------------------------------------------------
// Master list (template for every project)
// ---------------------------------------------------------------------------

const MASTER_SELECT = `
  SELECT id::int AS id, submittal_no, spec_section, description, discipline, submittal_type, reviewer, ahj,
         signed_sealed, long_lead, inspection_related, notes, seen_on, is_active, updated_at
  FROM submittal_master_items
`;

router.get(
  "/master",
  handle("Load master list", async (_req, res) => {
    const { rows } = await pool.query(`${MASTER_SELECT} ORDER BY submittal_no`);
    return res.json(rows);
  })
);

// New master items go into every new project switched on, and into existing projects switched off,
// so current registers don't change until someone decides the item applies.
router.post(
  "/master",
  adminRequired,
  handle("Add master item", async (req, res) => {
    const values = parseFields(req.body, MASTER_FIELD_PARSERS, { all: true });
    if (!Object.prototype.hasOwnProperty.call(req.body ?? {}, "is_active")) values.is_active = true;
    const fields = Object.keys(values);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO submittal_master_items (${fields.join(", ")})
         VALUES (${fields.map((_, index) => `$${index + 1}`).join(", ")})
         RETURNING id`,
        Object.values(values)
      );
      const masterId = rows[0].id;
      const { rows: projects } = await client.query("SELECT project_id FROM product_list");
      for (const { project_id: projectId } of projects) {
        await copyMasterItemsToProject(client, projectId, { inUse: false, masterItemIds: [masterId] });
      }
      await client.query("COMMIT");
      const { rows: created } = await pool.query(`${MASTER_SELECT} WHERE id = $1`, [masterId]);
      return res.status(201).json(created[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

router.patch(
  "/master/:id",
  adminRequired,
  handle("Update master item", async (req, res) => {
    const id = asId(req.params.id);
    const values = parseFields(req.body, MASTER_FIELD_PARSERS);
    if (!Object.keys(values).length) throw new ValidationError("Nothing to update.");
    const { sql, params } = buildUpdate("submittal_master_items", id, values);
    const { rowCount } = await pool.query(sql, params);
    if (!rowCount) return res.status(404).json({ detail: "Master item not found." });
    const { rows } = await pool.query(`${MASTER_SELECT} WHERE id = $1`, [id]);
    return res.json(rows[0]);
  })
);

export default router;
