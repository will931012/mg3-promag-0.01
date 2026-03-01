import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        project_id,
        division_csi,
        submittal_number,
        description,
        contractor,
        start_date,
        date_received,
        sent_to_aor,
        sent_to_eor,
        sent_to_date,
        approved_by,
        approval_status,
        revision,
        due_date,
        CASE WHEN date_received IS NULL THEN NULL ELSE (CURRENT_DATE - date_received)::int END AS days_pending,
        overall_status,
        responsible,
        workflow_stage,
        notes
      FROM submittal_tracker
      ORDER BY id DESC
    `);
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
    start_date,
    date_received,
    sent_to_aor,
    sent_to_eor,
    sent_to_date,
    approved_by,
    approval_status,
    revision,
    due_date,
    overall_status,
    responsible,
    workflow_stage,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO submittal_tracker (
        project_id, division_csi, submittal_number, description, contractor, start_date, date_received, sent_to_aor, sent_to_eor,
        sent_to_date, approved_by, approval_status, revision, due_date, overall_status, responsible, workflow_stage, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN ($8 IS NOT NULL OR $9 IS NOT NULL) THEN COALESCE($10, CURRENT_DATE) ELSE $10 END,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING
        id,
        project_id,
        division_csi,
        submittal_number,
        description,
        contractor,
        start_date,
        date_received,
        sent_to_aor,
        sent_to_eor,
        sent_to_date,
        approved_by,
        approval_status,
        revision,
        due_date,
        CASE WHEN date_received IS NULL THEN NULL ELSE (CURRENT_DATE - date_received)::int END AS days_pending,
        overall_status,
        responsible,
        workflow_stage,
        notes`,
      [
        project_id, division_csi, submittal_number, description, contractor, start_date, date_received, sent_to_aor, sent_to_eor,
        sent_to_date, approved_by, approval_status, revision, due_date, overall_status, responsible, workflow_stage, notes
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
    start_date,
    date_received,
    sent_to_aor,
    sent_to_eor,
    sent_to_date,
    approved_by,
    approval_status,
    revision,
    due_date,
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
           start_date = $7,
           date_received = $8,
           sent_to_aor = $9,
           sent_to_eor = $10,
           sent_to_date = CASE
             WHEN ($9 IS DISTINCT FROM sent_to_aor OR $10 IS DISTINCT FROM sent_to_eor) THEN COALESCE($11, CURRENT_DATE)
             ELSE COALESCE($11, sent_to_date)
           END,
           approved_by = $12,
           approval_status = $13,
           revision = $14,
           due_date = $15,
           overall_status = $16,
           responsible = $17,
           workflow_stage = $18,
           notes = $19
       WHERE id = $1
       RETURNING
         id,
         project_id,
         division_csi,
         submittal_number,
         description,
         contractor,
         start_date,
         date_received,
         sent_to_aor,
         sent_to_eor,
         sent_to_date,
         approved_by,
         approval_status,
         revision,
         due_date,
         CASE WHEN date_received IS NULL THEN NULL ELSE (CURRENT_DATE - date_received)::int END AS days_pending,
         overall_status,
         responsible,
         workflow_stage,
         notes`,
      [
        id, project_id, division_csi, submittal_number, description, contractor, start_date, date_received, sent_to_aor, sent_to_eor,
        sent_to_date, approved_by, approval_status, revision, due_date, overall_status, responsible, workflow_stage, notes
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
