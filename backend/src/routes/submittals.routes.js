import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM submittal_tracker ORDER BY id DESC");
    return res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    return res.status(500).json({ detail: "Failed to load submittals." });
  }
});

router.post("/", async (req, res) => {
  const {
    project_id,
    division_csi,
    submittal_number,
    description,
    contractor,
    date_received,
    sent_to_aor,
    sent_to_eor,
    approval_status,
    revision,
    due_date,
    days_pending,
    overall_status,
    responsible,
    workflow_stage,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO submittal_tracker (
        project_id, division_csi, submittal_number, description, contractor, date_received, sent_to_aor, sent_to_eor,
        approval_status, revision, due_date, days_pending, overall_status, responsible, workflow_stage, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        project_id, division_csi, submittal_number, description, contractor, date_received, sent_to_aor, sent_to_eor,
        approval_status, revision, due_date, days_pending, overall_status, responsible, workflow_stage, notes
      ]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ detail: "Failed to create submittal." });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });

  const {
    project_id,
    division_csi,
    submittal_number,
    description,
    contractor,
    date_received,
    sent_to_aor,
    sent_to_eor,
    approval_status,
    revision,
    due_date,
    days_pending,
    overall_status,
    responsible,
    workflow_stage,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `UPDATE submittal_tracker
       SET project_id = $2,
           division_csi = $3,
           submittal_number = $4,
           description = $5,
           contractor = $6,
           date_received = $7,
           sent_to_aor = $8,
           sent_to_eor = $9,
           approval_status = $10,
           revision = $11,
           due_date = $12,
           days_pending = $13,
           overall_status = $14,
           responsible = $15,
           workflow_stage = $16,
           notes = $17
       WHERE id = $1
       RETURNING *`,
      [
        id, project_id, division_csi, submittal_number, description, contractor, date_received, sent_to_aor, sent_to_eor,
        approval_status, revision, due_date, days_pending, overall_status, responsible, workflow_stage, notes
      ]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Submittal not found." });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ detail: "Failed to update submittal." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });
  try {
    const { rowCount } = await pool.query("DELETE FROM submittal_tracker WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ detail: "Submittal not found." });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ detail: "Failed to delete submittal." });
  }
});

export default router;
