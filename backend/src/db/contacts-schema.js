import pool from "./pool.js";
import { CONTACT_CATEGORIES } from "../constants/submittal-register.js";

// Contacts directory laid out like the contacts sheet: roles (design team) and trades (GC and subs)
// live in contact_roles; contacts hold company / contact / email / phone / notes for a role.

const schemaSql = `
CREATE TABLE IF NOT EXISTS contact_roles (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(30) NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, name)
);

CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(30) NOT NULL,
  role VARCHAR(120) NOT NULL DEFAULT '',
  company VARCHAR(255) NOT NULL DEFAULT '',
  contact VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(255) NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_category_role ON contacts(category, role);

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

const tableExists = async (client, table) => {
  const { rows } = await client.query("SELECT to_regclass($1) IS NOT NULL AS exists", [`public.${table}`]);
  return rows[0].exists;
};

const EOR_ROLE = { "Civil EOR": "Civil Engineer", "Structural EOR": "Structural Engineer", "MEP EOR": "MEP Engineer" };

// One-time copy of the old AOR / EOR / contractor / subcontractor names into the directory.
const migrateOldLists = async (client) => {
  const { rowCount } = await client.query(
    "INSERT INTO app_migrations (name) VALUES ('contacts_from_old_lists') ON CONFLICT (name) DO NOTHING"
  );
  if (!rowCount) return 0;

  const copied = [];
  if (await tableExists(client, "aors")) {
    const { rows } = await client.query("SELECT name FROM aors");
    rows.forEach(({ name }) => copied.push(["design_team", "Architect", name]));
  }
  if (await tableExists(client, "eors")) {
    const { rows } = await client.query("SELECT type, name FROM eors");
    rows.forEach(({ type, name }) => copied.push(["design_team", EOR_ROLE[type] || "", name]));
  }
  if (await tableExists(client, "contractors")) {
    const { rows } = await client.query("SELECT name FROM contractors");
    rows.forEach(({ name }) => copied.push(["contractors", "General Contractor", name]));
  }
  if (await tableExists(client, "subcontractors")) {
    // The old list had no trade; it can be set afterwards.
    const { rows } = await client.query("SELECT name FROM subcontractors");
    rows.forEach(({ name }) => copied.push(["contractors", "", name]));
  }
  for (const [category, role, company] of copied) {
    await client.query("INSERT INTO contacts (category, role, company) VALUES ($1, $2, $3)", [category, role, company]);
  }
  return copied.length;
};

export const ensureContactsSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('contacts_setup'))");
    await client.query(schemaSql);
    await seedRoles(client);
    const migrated = await migrateOldLists(client);
    await client.query("COMMIT");
    if (migrated) console.log(`Contacts: copied ${migrated} names from the old AOR/EOR/contractor lists.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Roles per category from the database, in sheet order: { design_team: [...], contractors: [...] }.
 */
export const loadContactRoles = async (db = pool) => {
  const { rows } = await db.query("SELECT id, category, name FROM contact_roles ORDER BY sort_order, id");
  const byCategory = Object.fromEntries(Object.keys(CONTACT_CATEGORIES).map((key) => [key, []]));
  rows.forEach((row) => byCategory[row.category]?.push({ id: Number(row.id), name: row.name }));
  return byCategory;
};
