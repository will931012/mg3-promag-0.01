import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

const summarySql = `
WITH project_counts AS (
  SELECT COUNT(*)::int AS active_projects
  FROM product_list
  WHERE COALESCE(NULLIF(TRIM(status), ''), 'active') !~* '^(done|completed|closed|cancelled)$'
),
submittal_base AS (
  SELECT
    due_date,
    COALESCE(NULLIF(TRIM(overall_status), ''), NULLIF(TRIM(approval_status), ''), 'open') AS status_text
  FROM submittal_tracker
),
submittal_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE status_text !~* '^(approved|closed|complete|completed|resolved)$'
    )::int AS submittals_open,
    COUNT(*) FILTER (
      WHERE status_text !~* '^(approved|closed|complete|completed|resolved)$'
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
    )::int AS submittals_late
  FROM submittal_base
),
rfi_base AS (
  SELECT
    response_due,
    COALESCE(NULLIF(TRIM(status), ''), 'open') AS status_text
  FROM rfi_tracker
),
rfi_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE status_text !~* '^(closed|answered|resolved|complete|completed)$'
    )::int AS rfis_open,
    COUNT(*) FILTER (
      WHERE status_text !~* '^(closed|answered|resolved|complete|completed)$'
        AND response_due IS NOT NULL
        AND response_due < CURRENT_DATE
    )::int AS rfis_overdue_open
  FROM rfi_base
),
task_base AS (
  SELECT
    due_date,
    COALESCE(NULLIF(TRIM(status), ''), 'open') AS status_text
  FROM action_items
),
task_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE status_text ~* '(open|in progress|in-progress|pending)'
         OR status_text !~* '^(done|completed|closed|cancelled)$'
    )::int AS tasks_open_in_progress,
    COUNT(*) FILTER (
      WHERE (status_text ~* '(open|in progress|in-progress|pending)'
         OR status_text !~* '^(done|completed|closed|cancelled)$')
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
    )::int AS tasks_overdue
  FROM task_base
)
SELECT
  p.active_projects,
  s.submittals_open,
  s.submittals_late,
  r.rfis_open,
  r.rfis_overdue_open,
  t.tasks_open_in_progress,
  t.tasks_overdue
FROM project_counts p
CROSS JOIN submittal_counts s
CROSS JOIN rfi_counts r
CROSS JOIN task_counts t;
`;

router.get("/summary", async (_req, res) => {
  try {
    const { rows } = await pool.query(summarySql);
    const summary = rows[0] ?? {
      active_projects: 0,
      submittals_open: 0,
      submittals_late: 0,
      rfis_open: 0,
      rfis_overdue_open: 0,
      tasks_open_in_progress: 0,
      tasks_overdue: 0
    };

    res.json(summary);
  } catch (error) {
    if (error?.code === "42P01") {
      return res.json({
        active_projects: 0,
        submittals_open: 0,
        submittals_late: 0,
        rfis_open: 0,
        rfis_overdue_open: 0,
        tasks_open_in_progress: 0,
        tasks_overdue: 0
      });
    }
    res.status(500).json({
      detail: "Failed to load dashboard summary",
      error: error instanceof Error ? error.message : "unknown_error"
    });
  }
});

export default router;
