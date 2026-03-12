import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name FROM subcontractors ORDER BY name ASC"
    );
    return res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    return res.status(500).json({ detail: "Failed to load subcontractors." });
  }
});

router.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ detail: "name is required." });

  try {
    const { rows } = await pool.query(
      "INSERT INTO subcontractors (name) VALUES ($1) RETURNING id, name",
      [name]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ detail: "Subcontractor already exists." });
    }
    return res.status(500).json({ detail: "Failed to create subcontractor." });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || "").trim();
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });
  if (!name) return res.status(400).json({ detail: "name is required." });

  try {
    const { rows } = await pool.query(
      "UPDATE subcontractors SET name = $2 WHERE id = $1 RETURNING id, name",
      [id, name]
    );
    if (!rows[0]) return res.status(404).json({ detail: "Subcontractor not found." });
    return res.json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") return res.status(409).json({ detail: "Subcontractor already exists." });
    return res.status(500).json({ detail: "Failed to update subcontractor." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });
  try {
    const { rowCount } = await pool.query("DELETE FROM subcontractors WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ detail: "Subcontractor not found." });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ detail: "Failed to delete subcontractor." });
  }
});

export default router;
