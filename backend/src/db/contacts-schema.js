import pool from "./pool.js";
import { CONTACT_CATEGORIES } from "../constants/submittal-register.js";

// Contacts are kept per project (project_contacts, one sheet per project). The roles (design team)
// and trades (GC and subs) that make up the rows of every sheet live in contact_roles.

const schemaSql = `
CREATE TABLE IF NOT EXISTS contact_roles (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, name)
);

CREATE TABLE IF NOT EXISTS app_migrations (
  name VARCHAR(120) PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

// The roles start from the contacts sheet; after that they are managed in the database.
const seedRoles = async (client) => {
  const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM contact_roles");
  if (rows[0].count > 0) return;
  for (const [category, { roles }] of Object.entries(CONTACT_CATEGORIES)) {
    for (const [index, name] of roles.entries()) {
      await client.query(
        "INSERT INTO contact_roles (category, name, sort_order) VALUES ($1, $2, $3) ON CONFLICT (category, name) DO NOTHING",
        [category, name, (index + 1) * 10]
      );
    }
  }
};

/**
 * Add a role to contact_roles unless it is there already (case-insensitive). Returns the stored spelling.
 */
export const ensureRole = async (db, category, role) => {
  const name = String(role ?? "").trim();
  if (!name) return "";
  const { rows } = await db.query("SELECT name FROM contact_roles WHERE category = $1 AND LOWER(name) = LOWER($2)", [category, name]);
  if (rows[0]) return rows[0].name;
  await db.query(
    `INSERT INTO contact_roles (category, name, sort_order)
     SELECT $1, $2, COALESCE(MAX(sort_order), 0) + 10 FROM contact_roles WHERE category = $1
     ON CONFLICT (category, name) DO NOTHING`,
    [category, name]
  );
  return name;
};

// Older projects stored EORs as "Civil EOR: Name"; newer ones as "<role>: Name".
const EOR_ROLE = { "Civil EOR": "Civil Engineer", "Structural EOR": "Structural Engineer", "MEP EOR": "MEP Engineer" };

/**
 * The design team rows a project's AOR / EOR fields describe: [{ role, company }].
 */
export const designTeamFromProjectFields = (aor, eor) => {
  const rows = [];
  const architect = String(aor ?? "").trim();
  if (architect) rows.push({ role: "Architect", company: architect });
  String(eor ?? "")
    .split(" | ")
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      const separator = value.indexOf(":");
      if (separator < 0) return;
      const type = value.slice(0, separator).trim();
      const company = value.slice(separator + 1).trim();
      if (type && company) rows.push({ role: EOR_ROLE[type] || type, company });
    });
  return rows;
};

/**
 * Fill the project's design team rows from its AOR / EOR fields. Rows someone already filled in are left alone.
 */
export const syncProjectDesignTeam = async (db, projectId, aor, eor) => {
  for (const { role, company } of designTeamFromProjectFields(aor, eor)) {
    const name = await ensureRole(db, "design_team", role);
    await db.query(
      `INSERT INTO project_contacts (project_id, category, role, company)
       VALUES ($1, 'design_team', $2, $3)
       ON CONFLICT (project_id, category, role) DO UPDATE SET company = EXCLUDED.company, updated_at = NOW()
       WHERE project_contacts.company = ''`,
      [projectId, name, company]
    );
  }
};

// One-time: existing projects get their AOR / EOR into their contact sheet.
const migrateProjectFields = async (client) => {
  const { rowCount } = await client.query(
    "INSERT INTO app_migrations (name) VALUES ('project_contacts_from_aor_eor') ON CONFLICT (name) DO NOTHING"
  );
  if (!rowCount) return 0;
  const { rows } = await client.query("SELECT project_id, aor, eor FROM product_list WHERE COALESCE(aor, '') <> '' OR COALESCE(eor, '') <> ''");
  for (const project of rows) {
    await syncProjectDesignTeam(client, project.project_id, project.aor, project.eor);
  }
  return rows.length;
};

export const ensureContactsSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('contacts_setup'))");
    await client.query(schemaSql);
    await seedRoles(client);
    const migrated = await migrateProjectFields(client);
    await client.query("COMMIT");
    if (migrated) console.log(`Contacts: filled the design team of ${migrated} projects from their AOR/EOR.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Roles per category from the database, in sheet order: { design_team: [{ id, name }], contractors: [...] }.
 */
export const loadContactRoles = async (db = pool) => {
  const { rows } = await db.query("SELECT id, category, name FROM contact_roles ORDER BY sort_order, id");
  const byCategory = Object.fromEntries(Object.keys(CONTACT_CATEGORIES).map((key) => [key, []]));
  rows.forEach((row) => byCategory[row.category]?.push({ id: Number(row.id), name: row.name }));
  return byCategory;
};
