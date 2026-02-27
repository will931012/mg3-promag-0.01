import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM rfi_tracker ORDER BY id DESC");
    return res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    return res.status(500).json({ detail: "Failed to load RFIs." });
  }
});

router.post("/", async (req, res) => {
  const {
    project_id,
    rfi_number,
    subject,
    description,
    from_contractor,
    date_sent,
    sent_to,
    response_due,
    date_answered,
    status,
    days_open,
    responsible,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO rfi_tracker (
        project_id, rfi_number, subject, description, from_contractor, date_sent, sent_to,
        response_due, date_answered, status, days_open, responsible, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        project_id, rfi_number, subject, description, from_contractor, date_sent, sent_to,
        response_due, date_answered, status, days_open, responsible, notes
      ]
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ detail: "Failed to create RFI." });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });

  const {
    project_id,
    rfi_number,
    subject,
    description,
    from_contractor,
    date_sent,
    sent_to,
    response_due,
    date_answered,
    status,
    days_open,
    responsible,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `UPDATE rfi_tracker
       SET project_id = $2,
           rfi_number = $3,
           subject = $4,
           description = $5,
           from_contractor = $6,
           date_sent = $7,
           sent_to = $8,
           response_due = $9,
           date_answered = $10,
           status = $11,
           days_open = $12,
           responsible = $13,
           notes = $14
       WHERE id = $1
       RETURNING *`,
      [id, project_id, rfi_number, subject, description, from_contractor, date_sent, sent_to, response_due, date_answered, status, days_open, responsible, notes]
    );
    if (!rows[0]) return res.status(404).json({ detail: "RFI not found." });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ detail: "Failed to update RFI." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });
  try {
    const { rowCount } = await pool.query("DELETE FROM rfi_tracker WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ detail: "RFI not found." });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ detail: "Failed to delete RFI." });
  }
});

export default router;
