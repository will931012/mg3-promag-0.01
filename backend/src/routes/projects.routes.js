import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

const baseSelect = `
  SELECT
    project_id,
    project_name,
    address,
    developer,
    aor,
    eor,
    start_date,
    end_date,
    status,
    priority,
    notes
  FROM product_list
`;

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`${baseSelect} ORDER BY project_name ASC`);
    res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    res.status(500).json({ detail: "Failed to load projects." });
  }
});

router.post("/", async (req, res) => {
  const {
    project_id,
    project_name,
    address,
    developer,
    aor,
    eor,
    start_date,
    end_date,
    status,
    priority,
    notes
  } = req.body || {};

  if (!project_id || !project_name) {
    return res.status(400).json({ detail: "project_id and project_name are required." });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO product_list (
        project_id, project_name, address, developer, aor, eor, start_date, end_date, status, priority, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [project_id, project_name, address, developer, aor, eor, start_date, end_date, status, priority, notes]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") return res.status(409).json({ detail: "Project ID already exists." });
    return res.status(500).json({ detail: "Failed to create project." });
  }
});

router.put("/:projectId", async (req, res) => {
  const projectId = req.params.projectId;
  const {
    project_name,
    address,
    developer,
    aor,
    eor,
    start_date,
    end_date,
    status,
    priority,
    notes
  } = req.body || {};

  try {
    const { rows } = await pool.query(
      `UPDATE product_list
       SET project_name = $2,
           address = $3,
           developer = $4,
           aor = $5,
           eor = $6,
           start_date = $7,
           end_date = $8,
           status = $9,
           priority = $10,
           notes = $11
       WHERE project_id = $1
       RETURNING *`,
      [projectId, project_name, address, developer, aor, eor, start_date, end_date, status, priority, notes]
    );

    if (!rows[0]) return res.status(404).json({ detail: "Project not found." });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ detail: "Failed to update project." });
  }
});

router.delete("/:projectId", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM product_list WHERE project_id = $1", [req.params.projectId]);
    if (!rowCount) return res.status(404).json({ detail: "Project not found." });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ detail: "Failed to delete project." });
  }
});

export default router;
