import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM action_items ORDER BY id DESC");
    return res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    return res.status(500).json({ detail: "Failed to load action items." });
  }
});

router.post("/", async (req, res) => {
  const {
    project_id,
    task,
    description,
    assigned_to,
    start_date,
    due_date,
    status,
    priority,
    days_left,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO action_items (
        project_id, task, description, assigned_to, start_date, due_date, status, priority, days_left, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [project_id, task, description, assigned_to, start_date, due_date, status, priority, days_left, notes]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ detail: "Failed to create action item." });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });

  const {
    project_id,
    task,
    description,
    assigned_to,
    start_date,
    due_date,
    status,
    priority,
    days_left,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `UPDATE action_items
       SET project_id = $2,
           task = $3,
           description = $4,
           assigned_to = $5,
           start_date = $6,
           due_date = $7,
           status = $8,
           priority = $9,
           days_left = $10,
           notes = $11
       WHERE id = $1
       RETURNING *`,
      [id, project_id, task, description, assigned_to, start_date, due_date, status, priority, days_left, notes]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Action item not found." });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ detail: "Failed to update action item." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });
  try {
    const { rowCount } = await pool.query("DELETE FROM action_items WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ detail: "Action item not found." });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ detail: "Failed to delete action item." });
  }
});

export default router;
