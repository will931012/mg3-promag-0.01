import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();
const asOptionalText = (value) => String(value ?? "").trim();
const asNullableDate = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length ? trimmed : null;
};
const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const getPgErrorDetail = (error) => ({
  code: error?.code ?? null,
  detail: error?.detail ?? null,
  message: error?.message ?? "Unknown database error",
});
const normalizeLifecycleStatus = (rawLifecycleStatus, status) => {
  const explicit = asOptionalText(rawLifecycleStatus).toLowerCase();
  if (explicit === "opened" || explicit === "closed") return explicit;

  const statusText = asOptionalText(status).toLowerCase();
  if (!statusText) return "opened";
  if (
    statusText.includes("approved") ||
    statusText.includes("closed") ||
    statusText.includes("complete") ||
    statusText.includes("resolved") ||
    statusText.includes("answered")
  ) {
    return "closed";
  }
  return "opened";
};

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
    lifecycle_status,
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
    project_id: rawProjectId,
    rfi_number: rawRfiNumber,
    subject: rawSubject,
    description: rawDescription,
    from_contractor: rawFromContractor,
    date_sent: rawDateSent,
    sent_to_aor: rawSentToAor,
    sent_to_eor: rawSentToEor,
    sent_to_subcontractor: rawSentToSubcontractor,
    sent_to_date: rawSentToDate,
    response_due: rawResponseDue,
    date_answered: rawDateAnswered,
    status: rawStatus,
    lifecycle_status: rawLifecycleStatus,
    responsible: rawResponsible,
    notes: rawNotes
  } = req.body || {};
  const project_id = asOptionalText(rawProjectId);
  if (!project_id) return res.status(400).json({ detail: "project_id is required." });
  const rfi_number = asOptionalText(rawRfiNumber);
  const subject = asOptionalText(rawSubject);
  const description = asOptionalText(rawDescription);
  const from_contractor = asOptionalText(rawFromContractor);
  const date_sent = asNullableDate(rawDateSent);
  const sent_to_aor = asOptionalText(rawSentToAor);
  const sent_to_eor = asOptionalText(rawSentToEor);
  const sent_to_subcontractor = asOptionalText(rawSentToSubcontractor);
  const sent_to_date_input = asNullableDate(rawSentToDate);
  const response_due = asNullableDate(rawResponseDue);
  const status = asOptionalText(rawStatus);
  const lifecycle_status = normalizeLifecycleStatus(rawLifecycleStatus, rawStatus);
  const responsible = asOptionalText(rawResponsible);
  const notes = asOptionalText(rawNotes);
  const hasSentToRecipient = Boolean(sent_to_aor || sent_to_eor);
  const sent_to_date = hasSentToRecipient ? (sent_to_date_input ?? todayIsoDate()) : sent_to_date_input;
  const date_answered_input = asNullableDate(rawDateAnswered);
  const date_answered = status === "Approved" ? (date_answered_input ?? todayIsoDate()) : date_answered_input;

  try {
    const { rows } = await pool.query(
      `INSERT INTO rfi_tracker (
        project_id, rfi_number, subject, description, from_contractor, date_sent, sent_to_aor, sent_to_eor,
        sent_to_subcontractor, sent_to_date, response_due, date_answered, status, lifecycle_status, responsible, notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16
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
        lifecycle_status,
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
        lifecycle_status,
        responsible,
        notes
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    const pgError = getPgErrorDetail(error);
    console.error("Create RFI failed:", pgError);
    return res.status(500).json({ detail: `Failed to create RFI: ${pgError.message}` });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });

  const {
    project_id: rawProjectId,
    rfi_number: rawRfiNumber,
    subject: rawSubject,
    description: rawDescription,
    from_contractor: rawFromContractor,
    date_sent: rawDateSent,
    sent_to_aor: rawSentToAor,
    sent_to_eor: rawSentToEor,
    sent_to_subcontractor: rawSentToSubcontractor,
    sent_to_date: rawSentToDate,
    response_due: rawResponseDue,
    date_answered: rawDateAnswered,
    status: rawStatus,
    lifecycle_status: rawLifecycleStatus,
    responsible: rawResponsible,
    notes: rawNotes
  } = req.body || {};
  const project_id = asOptionalText(rawProjectId);
  if (!project_id) return res.status(400).json({ detail: "project_id is required." });
  const rfi_number = asOptionalText(rawRfiNumber);
  const subject = asOptionalText(rawSubject);
  const description = asOptionalText(rawDescription);
  const from_contractor = asOptionalText(rawFromContractor);
  const date_sent = asNullableDate(rawDateSent);
  const sent_to_aor = asOptionalText(rawSentToAor);
  const sent_to_eor = asOptionalText(rawSentToEor);
  const sent_to_subcontractor = asOptionalText(rawSentToSubcontractor);
  const sent_to_date = asNullableDate(rawSentToDate);
  const response_due = asNullableDate(rawResponseDue);
  const date_answered = asNullableDate(rawDateAnswered);
  const status = asOptionalText(rawStatus);
  const lifecycle_status = normalizeLifecycleStatus(rawLifecycleStatus, rawStatus);
  const responsible = asOptionalText(rawResponsible);
  const notes = asOptionalText(rawNotes);

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
           lifecycle_status = $15,
           responsible = $16,
           notes = $17
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
         lifecycle_status,
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
        lifecycle_status,
        responsible,
        notes
      ]
    );
    if (!rows[0]) return res.status(404).json({ detail: "RFI not found." });
    return res.json(rows[0]);
  } catch (error) {
    const pgError = getPgErrorDetail(error);
    console.error("Update RFI failed:", pgError);
    return res.status(500).json({ detail: `Failed to update RFI: ${pgError.message}` });
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

