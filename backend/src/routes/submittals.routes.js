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

const selectSubmittalSql = `
  SELECT
    id,
    project_id,
    division_csi,
    submittal_number,
    subject,
    contractor,
    date_received,
    sent_to_aor,
    sent_to_eor,
    sent_to_subcontractor,
    sent_to_date,
    approvers,
    approval_status,
    revision,
    due_date,
    CASE WHEN date_received IS NULL THEN NULL ELSE (CURRENT_DATE - date_received)::int END AS days_pending,
    overall_status,
    responsible,
    workflow_stage,
    notes
  FROM submittal_tracker
`;

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`${selectSubmittalSql} ORDER BY id DESC`);
    return res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    return res.status(500).json({ detail: "Failed to load submittals." });
  }
});

router.post("/", async (req, res) => {
  const {
    project_id: rawProjectId,
    division_csi: rawDivisionCsi,
    submittal_number: rawSubmittalNumber,
    subject: rawSubject,
    contractor: rawContractor,
    date_received: rawDateReceived,
    sent_to_aor: rawSentToAor,
    sent_to_eor: rawSentToEor,
    sent_to_subcontractor: rawSentToSubcontractor,
    sent_to_date: rawSentToDate,
    approvers: rawApprovers,
    approval_status: rawApprovalStatus,
    revision: rawRevision,
    due_date: rawDueDate,
    overall_status: rawOverallStatus,
    responsible: rawResponsible,
    workflow_stage: rawWorkflowStage,
    notes: rawNotes
  } = req.body || {};
  const project_id = asOptionalText(rawProjectId);
  if (!project_id) return res.status(400).json({ detail: "project_id is required." });
  const division_csi = asOptionalText(rawDivisionCsi);
  const submittal_number = asOptionalText(rawSubmittalNumber);
  const subject = asOptionalText(rawSubject);
  const contractor = asOptionalText(rawContractor);
  const date_received = asNullableDate(rawDateReceived);
  const sent_to_aor = asOptionalText(rawSentToAor);
  const sent_to_eor = asOptionalText(rawSentToEor);
  const sent_to_subcontractor = asOptionalText(rawSentToSubcontractor);
  const sent_to_date_input = asNullableDate(rawSentToDate);
  const hasSentToRecipient = Boolean(sent_to_aor || sent_to_eor);
  const sent_to_date = hasSentToRecipient ? (sent_to_date_input ?? todayIsoDate()) : sent_to_date_input;
  const approvers = asOptionalText(rawApprovers);
  const approval_status = asOptionalText(rawApprovalStatus);
  const revision = asOptionalText(rawRevision);
  const due_date = asNullableDate(rawDueDate);
  const overall_status = asOptionalText(rawOverallStatus);
  const responsible = asOptionalText(rawResponsible);
  const workflow_stage = asOptionalText(rawWorkflowStage);
  const notes = asOptionalText(rawNotes);

  try {
    const { rows } = await pool.query(
      `INSERT INTO submittal_tracker (
        project_id, division_csi, submittal_number, subject, contractor, date_received, sent_to_aor, sent_to_eor,
        sent_to_subcontractor, sent_to_date, approvers, approval_status, revision, due_date, overall_status, responsible, workflow_stage, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING
        id,
        project_id,
        division_csi,
        submittal_number,
        subject,
        contractor,
        date_received,
        sent_to_aor,
        sent_to_eor,
        sent_to_subcontractor,
        sent_to_date,
        approvers,
        approval_status,
        revision,
        due_date,
        CASE WHEN date_received IS NULL THEN NULL ELSE (CURRENT_DATE - date_received)::int END AS days_pending,
        overall_status,
        responsible,
        workflow_stage,
        notes`,
      [
        project_id,
        division_csi,
        submittal_number,
        subject,
        contractor,
        date_received,
        sent_to_aor,
        sent_to_eor,
        sent_to_subcontractor,
        sent_to_date,
        approvers,
        approval_status,
        revision,
        due_date,
        overall_status,
        responsible,
        workflow_stage,
        notes
      ]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    const pgError = getPgErrorDetail(error);
    console.error("Create submittal failed:", pgError);
    return res.status(500).json({ detail: `Failed to create submittal: ${pgError.message}` });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });

  const {
    project_id: rawProjectId,
    division_csi: rawDivisionCsi,
    submittal_number: rawSubmittalNumber,
    subject: rawSubject,
    contractor: rawContractor,
    date_received: rawDateReceived,
    sent_to_aor: rawSentToAor,
    sent_to_eor: rawSentToEor,
    sent_to_subcontractor: rawSentToSubcontractor,
    sent_to_date: rawSentToDate,
    approvers: rawApprovers,
    approval_status: rawApprovalStatus,
    revision: rawRevision,
    due_date: rawDueDate,
    overall_status: rawOverallStatus,
    responsible: rawResponsible,
    workflow_stage: rawWorkflowStage,
    notes: rawNotes
  } = req.body || {};
  const project_id = asOptionalText(rawProjectId);
  if (!project_id) return res.status(400).json({ detail: "project_id is required." });
  const division_csi = asOptionalText(rawDivisionCsi);
  const submittal_number = asOptionalText(rawSubmittalNumber);
  const subject = asOptionalText(rawSubject);
  const contractor = asOptionalText(rawContractor);
  const date_received = asNullableDate(rawDateReceived);
  const sent_to_aor = asOptionalText(rawSentToAor);
  const sent_to_eor = asOptionalText(rawSentToEor);
  const sent_to_subcontractor = asOptionalText(rawSentToSubcontractor);
  const sent_to_date = asNullableDate(rawSentToDate);
  const approvers = asOptionalText(rawApprovers);
  const approval_status = asOptionalText(rawApprovalStatus);
  const revision = asOptionalText(rawRevision);
  const due_date = asNullableDate(rawDueDate);
  const overall_status = asOptionalText(rawOverallStatus);
  const responsible = asOptionalText(rawResponsible);
  const workflow_stage = asOptionalText(rawWorkflowStage);
  const notes = asOptionalText(rawNotes);

  try {
    const { rows } = await pool.query(
      `UPDATE submittal_tracker
       SET project_id = $2,
           division_csi = $3,
           submittal_number = $4,
           subject = $5,
           contractor = $6,
           date_received = $7,
           sent_to_aor = $8,
           sent_to_eor = $9,
           sent_to_subcontractor = $10,
           sent_to_date = CASE
             WHEN ($8 IS DISTINCT FROM sent_to_aor OR $9 IS DISTINCT FROM sent_to_eor) THEN COALESCE($11, CURRENT_DATE)
             ELSE COALESCE($11, sent_to_date)
           END,
           approvers = $12,
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
         subject,
         contractor,
         date_received,
         sent_to_aor,
         sent_to_eor,
         sent_to_subcontractor,
         sent_to_date,
         approvers,
         approval_status,
         revision,
         due_date,
         CASE WHEN date_received IS NULL THEN NULL ELSE (CURRENT_DATE - date_received)::int END AS days_pending,
         overall_status,
         responsible,
         workflow_stage,
         notes`,
      [
        id,
        project_id,
        division_csi,
        submittal_number,
        subject,
        contractor,
        date_received,
        sent_to_aor,
        sent_to_eor,
        sent_to_subcontractor,
        sent_to_date,
        approvers,
        approval_status,
        revision,
        due_date,
        overall_status,
        responsible,
        workflow_stage,
        notes
      ]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Submittal not found." });
    return res.json(rows[0]);
  } catch (error) {
    const pgError = getPgErrorDetail(error);
    console.error("Update submittal failed:", pgError);
    return res.status(500).json({ detail: `Failed to update submittal: ${pgError.message}` });
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

