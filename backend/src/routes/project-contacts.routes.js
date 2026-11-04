import { Router } from "express";
import pool from "../db/pool.js";
import { CONTACT_CATEGORIES, DEFAULT_CONTACT_COMPANIES } from "../constants/submittal-register.js";
import { ensureRole, loadContactRoles } from "../db/contacts-schema.js";

// Project contacts, laid out like the contacts sheet: every role/trade in contact_roles always shows as a row,
// and only rows someone filled in are stored. A new role/trade typed here is added to contact_roles,
// so it becomes a row on every project's sheet.

const router = Router();

const CONTACT_FIELDS = ["company", "contact", "email", "phone", "notes"];
const asText = (value, max = 255) => String(value ?? "").trim().slice(0, max);

const projectExists = async (projectId) => {
  const { rowCount } = await pool.query("SELECT 1 FROM product_list WHERE project_id = $1", [projectId]);
  return rowCount > 0;
};

const emptyRow = (category, role) => ({
  id: null,
  role,
  company: DEFAULT_CONTACT_COMPANIES[category]?.[role] ?? "",
  contact: "",
  email: "",
  phone: "",
  notes: "",
  custom: false
});

/**
 * `rolesByCategory` is { design_team: ["Architect", ...], contractors: [...] } from contact_roles.
 */
export const buildContactSheet = (storedRows, rolesByCategory) =>
  Object.entries(CONTACT_CATEGORIES).map(([key, { title }]) => {
    const roles = rolesByCategory[key] ?? [];
    const stored = storedRows.filter((row) => row.category === key);
    const byRole = new Map(stored.map((row) => [row.role, row]));
    const toRow = (row, custom) => ({ id: Number(row.id), role: row.role, ...Object.fromEntries(CONTACT_FIELDS.map((f) => [f, row[f]])), custom });
    const listed = roles.map((role) => (byRole.has(role) ? toRow(byRole.get(role), false) : emptyRow(key, role)));
    const extra = stored.filter((row) => !roles.includes(row.role)).map((row) => toRow(row, true));
    return { key, title, rows: [...listed, ...extra] };
  });

router.get("/:projectId", async (req, res) => {
  try {
    if (!(await projectExists(req.params.projectId))) return res.status(404).json({ detail: "Project not found." });
    const { rows } = await pool.query(
      `SELECT id, category, role, ${CONTACT_FIELDS.join(", ")} FROM project_contacts WHERE project_id = $1 ORDER BY id`,
      [req.params.projectId]
    );
    const roles = await loadContactRoles();
    const roleNames = Object.fromEntries(Object.entries(roles).map(([key, list]) => [key, list.map((role) => role.name)]));
    return res.json({ project_id: req.params.projectId, categories: buildContactSheet(rows, roleNames) });
  } catch (error) {
    console.error("Load project contacts failed:", error?.message || error);
    return res.status(500).json({ detail: "Load project contacts failed." });
  }
});

// Save one row (insert or update by category + role).
router.put("/:projectId", async (req, res) => {
  try {
    const category = asText(req.body?.category, 30);
    if (!CONTACT_CATEGORIES[category]) return res.status(400).json({ detail: "Unknown contact category." });
    if (!asText(req.body?.role, 120)) return res.status(400).json({ detail: "Role / trade is required." });
    if (!(await projectExists(req.params.projectId))) return res.status(404).json({ detail: "Project not found." });
    const role = await ensureRole(pool, category, asText(req.body?.role, 120));

    const values = CONTACT_FIELDS.map((field) => asText(req.body?.[field], field === "notes" ? 2000 : 255));
    const { rows } = await pool.query(
      `INSERT INTO project_contacts (project_id, category, role, ${CONTACT_FIELDS.join(", ")})
       VALUES ($1, $2, $3, ${CONTACT_FIELDS.map((_, index) => `$${index + 4}`).join(", ")})
       ON CONFLICT (project_id, category, role) DO UPDATE SET
         ${CONTACT_FIELDS.map((field) => `${field} = EXCLUDED.${field}`).join(", ")}, updated_at = NOW()
       RETURNING id, role, ${CONTACT_FIELDS.join(", ")}`,
      [req.params.projectId, category, role, ...values]
    );
    const saved = rows[0];
    const roles = await loadContactRoles();
    return res.json({ ...saved, id: Number(saved.id), custom: !roles[category].some((item) => item.name === role) });
  } catch (error) {
    console.error("Save project contact failed:", error?.message || error);
    return res.status(500).json({ detail: "Save project contact failed." });
  }
});

// Removing a listed role only clears it (the row stays on the sheet); an extra row disappears.
router.delete("/:projectId/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ detail: "Invalid id." });
    const { rowCount } = await pool.query("DELETE FROM project_contacts WHERE id = $1 AND project_id = $2", [id, req.params.projectId]);
    if (!rowCount) return res.status(404).json({ detail: "Contact not found." });
    return res.status(204).end();
  } catch (error) {
    console.error("Delete project contact failed:", error?.message || error);
    return res.status(500).json({ detail: "Delete project contact failed." });
  }
});

export default router;
