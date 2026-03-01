import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

const selectRfiSql = `
  SELECT
    id,
    project_id,
    rfi_number,
    subject,
    description,
    from_contractor,
    date_sent,
    sent_to_aor,
    sent_to_eor,
    sent_to_subcontractor,
    sent_to_date,
    response_due,
    date_answered,
    status,
    CASE
      WHEN status = 'Approved' THEN (COALESCE(date_answered, CURRENT_DATE) - created_at::date)::int
      ELSE (CURRENT_DATE - created_at::date)::int
    END AS days_open,
    responsible,
    notes
  FROM rfi_tracker
`;

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`${selectRfiSql} ORDER BY id DESC`);
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
    sent_to_aor,
    sent_to_eor,
    sent_to_subcontractor,
    sent_to_date,
    response_due,
    date_answered,
    status,
    responsible,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO rfi_tracker (
        project_id, rfi_number, subject, description, from_contractor, date_sent, sent_to_aor, sent_to_eor,
        sent_to_subcontractor, sent_to_date, response_due, date_answered, status, responsible, notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        CASE WHEN ($7 IS NOT NULL OR $8 IS NOT NULL) THEN COALESCE($10, CURRENT_DATE) ELSE $10 END,
        $11,CASE WHEN $13 = 'Approved' THEN COALESCE($12, CURRENT_DATE) ELSE $12 END,$13,$14,$15
      )
      RETURNING
        id,
        project_id,
        rfi_number,
        subject,
        description,
        from_contractor,
        date_sent,
        sent_to_aor,
        sent_to_eor,
        sent_to_subcontractor,
        sent_to_date,
        response_due,
        date_answered,
        status,
        CASE
          WHEN status = 'Approved' THEN (COALESCE(date_answered, CURRENT_DATE) - created_at::date)::int
          ELSE (CURRENT_DATE - created_at::date)::int
        END AS days_open,
        responsible,
        notes`,
      [
        project_id,
        rfi_number,
        subject,
        description,
        from_contractor,
        date_sent,
        sent_to_aor,
        sent_to_eor,
        sent_to_subcontractor,
        sent_to_date,
        response_due,
        date_answered,
        status,
        responsible,
        notes
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
    sent_to_aor,
    sent_to_eor,
    sent_to_subcontractor,
    sent_to_date,
    response_due,
    date_answered,
    status,
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
           sent_to_aor = $8,
           sent_to_eor = $9,
           sent_to_subcontractor = $10,
           sent_to_date = CASE
             WHEN ($8 IS DISTINCT FROM sent_to_aor OR $9 IS DISTINCT FROM sent_to_eor) THEN COALESCE($11, CURRENT_DATE)
             ELSE COALESCE($11, sent_to_date)
           END,
           response_due = $12,
           date_answered = CASE
             WHEN $14 = 'Approved' THEN COALESCE($13, date_answered, CURRENT_DATE)
             ELSE $13
           END,
           status = $14,
           responsible = $15,
           notes = $16
       WHERE id = $1
       RETURNING
         id,
         project_id,
         rfi_number,
         subject,
         description,
         from_contractor,
         date_sent,
         sent_to_aor,
         sent_to_eor,
         sent_to_subcontractor,
         sent_to_date,
         response_due,         
         date_answered,
         status,
         CASE
           WHEN status = 'Approved' THEN (COALESCE(date_answered, CURRENT_DATE) - created_at::date)::int
           ELSE (CURRENT_DATE - created_at::date)::int
         END AS days_open,
         responsible,
         notes`,
      [
        id,
        project_id,
        rfi_number,
        subject,
        description,
        from_contractor,
        date_sent,
        sent_to_aor,
        sent_to_eor,
        sent_to_subcontractor,
        sent_to_date,
        response_due,
        date_answered,
        status,
        responsible,
        notes
      ]
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

