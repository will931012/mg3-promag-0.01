import { Router } from "express";
import pool from "../db/pool.js";
import { loadComputedItems } from "../services/register-repository.js";
import { summarizeRegister } from "../services/register-status.js";

const router = Router();

const summarySql = `
WITH project_counts AS (
  SELECT COUNT(*)::int AS active_projects
  FROM product_list
  WHERE COALESCE(NULLIF(TRIM(status), ''), 'active') !~* '^(done|completed|closed|cancelled)$'
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
  r.rfis_open,
  r.rfis_overdue_open
FROM project_counts p
CROSS JOIN rfi_counts r;
`;

router.get("/summary", async (_req, res) => {
  try {
    const [{ rows }, registerItems] = await Promise.all([pool.query(summarySql), loadComputedItems({ inUseOnly: true })]);
    const { submittals_open, submittals_late } = summarizeRegister(registerItems);

    res.json({
      active_projects: 0,
      rfis_open: 0,
      rfis_overdue_open: 0,
      ...rows[0],
      submittals_open,
      submittals_late
    });
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
