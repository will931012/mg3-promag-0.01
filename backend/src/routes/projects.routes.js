import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "project";
}

function currentDateKey() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

async function generateProjectId(projectName) {
  const baseId = `${toSlug(projectName)}-${currentDateKey()}`;

  const { rowCount } = await pool.query(
    "SELECT 1 FROM product_list WHERE project_id = $1 LIMIT 1",
    [baseId]
  );
  if (!rowCount) return baseId;

  for (let attempt = 1; attempt < 1000; attempt += 1) {
    const candidate = `${baseId}-${String(attempt).padStart(2, "0")}`;
    const result = await pool.query(
      "SELECT 1 FROM product_list WHERE project_id = $1 LIMIT 1",
      [candidate]
    );
    if (!result.rowCount) return candidate;
  }

  throw new Error("Unable to generate unique project ID.");
}

const baseSelect = `
  SELECT
    project_id,
    project_name,
    address,
    developer,
    aor,
    eor,
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
    project_name,
    address,
    developer,
    aor,
    eor,
    end_date,
    status,
    priority,
    notes
  } = req.body || {};

  if (!project_name) {
    return res.status(400).json({ detail: "project_name is required." });
  }

  try {
    const project_id = await generateProjectId(project_name);
    const { rows } = await pool.query(
      `INSERT INTO product_list (
        project_id, project_name, address, developer, aor, eor, end_date, status, priority, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [project_id, project_name, address, developer, aor, eor, end_date, status, priority, notes]
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
           end_date = $7,
           status = $8,
           priority = $9,
           notes = $10
       WHERE project_id = $1
       RETURNING *`,
      [projectId, project_name, address, developer, aor, eor, end_date, status, priority, notes]
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
