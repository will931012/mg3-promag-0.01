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
    COALESCE(
      NULLIF(TRIM(lifecycle_status), ''),
      CASE
        WHEN COALESCE(NULLIF(TRIM(overall_status), ''), NULLIF(TRIM(approval_status), ''), 'open')
          ~* '^(approved|closed|complete|completed|resolved)$'
          THEN 'closed'
        ELSE 'opened'
      END
    ) AS lifecycle_status_text
  FROM submittal_tracker
),
submittal_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE lifecycle_status_text = 'opened'
    )::int AS submittals_open,
    COUNT(*) FILTER (
      WHERE lifecycle_status_text = 'opened'
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
    )::int AS submittals_late
  FROM submittal_base
),
rfi_base AS (
  SELECT
    response_due,
    COALESCE(
      NULLIF(TRIM(lifecycle_status), ''),
      CASE
        WHEN COALESCE(NULLIF(TRIM(status), ''), 'open')
          ~* '^(closed|answered|resolved|complete|completed|approved)$'
          THEN 'closed'
        ELSE 'opened'
      END
    ) AS lifecycle_status_text
  FROM rfi_tracker
),
rfi_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE lifecycle_status_text = 'opened'
    )::int AS rfis_open,
    COUNT(*) FILTER (
      WHERE lifecycle_status_text = 'opened'
        AND response_due IS NOT NULL
        AND response_due < CURRENT_DATE
    )::int AS rfis_overdue_open
  FROM rfi_base
)
SELECT
  p.active_projects,
  s.submittals_open,
  s.submittals_late,
  r.rfis_open,
  r.rfis_overdue_open
FROM project_counts p
CROSS JOIN submittal_counts s
CROSS JOIN rfi_counts r;
`;

router.get("/summary", async (_req, res) => {
  try {
    const { rows } = await pool.query(summarySql);
    const summary = rows[0] ?? {
      active_projects: 0,
      submittals_open: 0,
      submittals_late: 0,
      rfis_open: 0,
      rfis_overdue_open: 0
    };

    res.json(summary);
  } catch (error) {
    if (error?.code === "42P01") {
      return res.json({
        active_projects: 0,
        submittals_open: 0,
        submittals_late: 0,
        rfis_open: 0,
        rfis_overdue_open: 0
      });
    }
    res.status(500).json({
      detail: "Failed to load dashboard summary",
      error: error instanceof Error ? error.message : "unknown_error"
    });
  }
});

export default router;
