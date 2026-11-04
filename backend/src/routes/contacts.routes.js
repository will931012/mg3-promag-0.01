import { Router } from "express";
import pool from "../db/pool.js";
import { loadContactRoles } from "../db/contacts-schema.js";
import { CONTACT_CATEGORIES } from "../constants/submittal-register.js";

// Contacts directory (like the contacts sheet). Roles are stored in contact_roles; a role typed
// that isn't there yet is added, so it is suggested next time.

const router = Router();

class ValidationError extends Error {}

const FIELDS = ["company", "contact", "email", "phone", "notes"];
const SELECT = `SELECT id::int AS id, category, role, ${FIELDS.join(", ")} FROM contacts`;
const asText = (value, max = 255) => String(value ?? "").trim().slice(0, max);

const parseCategory = (value) => {
  const category = asText(value, 30);
  if (!CONTACT_CATEGORIES[category]) throw new ValidationError("Unknown contact category.");
  return category;
};

const parseContact = (body) => {
  const values = {
    category: parseCategory(body?.category),
    role: asText(body?.role, 120),
    ...Object.fromEntries(FIELDS.map((field) => [field, asText(body?.[field], field === "notes" ? 2000 : 255)]))
  };
  if (!values.company && !values.contact) throw new ValidationError("Enter a company or a contact name.");
  return values;
};

// Case-insensitive match against the stored roles, so "architect" saves as "Architect".
const ensureRole = async (client, category, role) => {
  if (!role) return "";
  const { rows } = await client.query("SELECT name FROM contact_roles WHERE category = $1 AND LOWER(name) = LOWER($2)", [category, role]);
  if (rows[0]) return rows[0].name;
  await client.query(
    `INSERT INTO contact_roles (category, name, sort_order)
     SELECT $1, $2, COALESCE(MAX(sort_order), 0) + 10 FROM contact_roles WHERE category = $1
     ON CONFLICT (category, name) DO NOTHING`,
    [category, role]
  );
  return role;
};

const handle = (label, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ detail: error.message });
    console.error(`${label} failed:`, error?.message || error);
    return res.status(500).json({ detail: `${label} failed.` });
  }
};

router.get(
  "/roles",
  handle("Load contact roles", async (_req, res) => res.json(await loadContactRoles()))
);

router.post(
  "/roles",
  handle("Add contact role", async (req, res) => {
    const category = parseCategory(req.body?.category);
    const name = asText(req.body?.name, 120);
    if (!name) throw new ValidationError("Role name is required.");
    await ensureRole(pool, category, name);
    return res.status(201).json(await loadContactRoles());
  })
);

// A role in use by a contact can't be removed, so nobody loses where a contact belongs.
router.delete(
  "/roles/:id",
  handle("Remove contact role", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT r.category, r.name,
              (SELECT COUNT(*)::int FROM contacts c WHERE c.category = r.category AND c.role = r.name) AS used
       FROM contact_roles r WHERE r.id = $1`,
      [Number(req.params.id) || 0]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Role not found." });
    if (rows[0].used) throw new ValidationError(`${rows[0].name} has ${rows[0].used} contact(s). Move or delete them first.`);
    await pool.query("DELETE FROM contact_roles WHERE id = $1", [Number(req.params.id)]);
    return res.json(await loadContactRoles());
  })
);

router.get(
  "/",
  handle("Load contacts", async (_req, res) => {
    const { rows } = await pool.query(`${SELECT} ORDER BY category, role, company, contact`);
    return res.json(rows);
  })
);

router.post(
  "/",
  handle("Add contact", async (req, res) => {
    const values = parseContact(req.body);
    values.role = await ensureRole(pool, values.category, values.role);
    const fields = Object.keys(values);
    const { rows } = await pool.query(
      `INSERT INTO contacts (${fields.join(", ")}) VALUES (${fields.map((_, index) => `$${index + 1}`).join(", ")}) RETURNING id`,
      Object.values(values)
    );
    const { rows: created } = await pool.query(`${SELECT} WHERE id = $1`, [rows[0].id]);
    return res.status(201).json(created[0]);
  })
);

router.put(
  "/:id",
  handle("Update contact", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError("Invalid id.");
    const values = parseContact(req.body);
    values.role = await ensureRole(pool, values.category, values.role);
    const fields = Object.keys(values);
    const { rowCount } = await pool.query(
      `UPDATE contacts SET ${fields.map((field, index) => `${field} = $${index + 2}`).join(", ")}, updated_at = NOW() WHERE id = $1`,
      [id, ...Object.values(values)]
    );
    if (!rowCount) return res.status(404).json({ detail: "Contact not found." });
    const { rows } = await pool.query(`${SELECT} WHERE id = $1`, [id]);
    return res.json(rows[0]);
  })
);

router.delete(
  "/:id",
  handle("Delete contact", async (req, res) => {
    const { rowCount } = await pool.query("DELETE FROM contacts WHERE id = $1", [Number(req.params.id) || 0]);
    if (!rowCount) return res.status(404).json({ detail: "Contact not found." });
    return res.status(204).end();
  })
);

export default router;
