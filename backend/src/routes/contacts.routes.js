import { Router } from "express";
import pool from "../db/pool.js";
import { ensureRole, loadContactRoles } from "../db/contacts-schema.js";
import { CONTACT_CATEGORIES } from "../constants/submittal-register.js";

// Shared pieces of the per-project contact sheets: the roles/trades (rows of every sheet) and the
// contacts already used on any project, which are suggested when filling in another project.

const router = Router();

const asText = (value, max = 255) => String(value ?? "").trim().slice(0, max);

const handle = (label, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
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
    const category = asText(req.body?.category, 30);
    const name = asText(req.body?.name, 120);
    if (!CONTACT_CATEGORIES[category]) return res.status(400).json({ detail: "Unknown contact category." });
    if (!name) return res.status(400).json({ detail: "Role name is required." });
    await ensureRole(pool, category, name);
    return res.status(201).json(await loadContactRoles());
  })
);

// A role filled in on any project can't be removed, so no project loses a contact.
router.delete(
  "/roles/:id",
  handle("Remove contact role", async (req, res) => {
    const id = Number(req.params.id) || 0;
    const { rows } = await pool.query(
      `SELECT r.name,
              (SELECT COUNT(*)::int FROM project_contacts c WHERE c.category = r.category AND c.role = r.name) AS used
       FROM contact_roles r WHERE r.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Role not found." });
    if (rows[0].used) return res.status(409).json({ detail: `${rows[0].name} is filled in on ${rows[0].used} project(s).` });
    await pool.query("DELETE FROM contact_roles WHERE id = $1", [id]);
    return res.json(await loadContactRoles());
  })
);

// Contacts used on any project, one per company + contact, most recently updated first.
router.get(
  "/known",
  handle("Load known contacts", async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (category, role, LOWER(company), LOWER(contact))
              id::int AS id, category, role, company, contact, email, phone
       FROM project_contacts
       WHERE company <> '' OR contact <> ''
       ORDER BY category, role, LOWER(company), LOWER(contact), updated_at DESC`
    );
    return res.json(rows);
  })
);

export default router;
