import { Router } from "express";
import { EOR_TYPES_SET } from "../constants/eor-types.js";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
  const type = String(req.query?.type || "").trim();

  try {
    if (type) {
      const { rows } = await pool.query(
        "SELECT id, type, name FROM eors WHERE type = $1 ORDER BY name ASC",
        [type]
      );
      return res.json(rows);
    }

    const { rows } = await pool.query(
      "SELECT id, type, name FROM eors ORDER BY type ASC, name ASC"
    );
    return res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    return res.status(500).json({ detail: "Failed to load EOR list." });
  }
});

router.post("/", async (req, res) => {
  const type = String(req.body?.type || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!type || !EOR_TYPES_SET.has(type)) {
    return res.status(400).json({ detail: "Valid type is required." });
  }
  if (!name) {
    return res.status(400).json({ detail: "name is required." });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO eors (type, name) VALUES ($1, $2) RETURNING id, type, name",
      [type, name]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ detail: "EOR already exists for this type." });
    }
    return res.status(500).json({ detail: "Failed to create EOR." });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const type = String(req.body?.type || "").trim();
  const name = String(req.body?.name || "").trim();
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });
  if (!type || !EOR_TYPES_SET.has(type)) return res.status(400).json({ detail: "Valid type is required." });
  if (!name) return res.status(400).json({ detail: "name is required." });

  try {
    const { rows } = await pool.query(
      "UPDATE eors SET type = $2, name = $3 WHERE id = $1 RETURNING id, type, name",
      [id, type, name]
    );
    if (!rows[0]) return res.status(404).json({ detail: "EOR not found." });
    return res.json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") return res.status(409).json({ detail: "EOR already exists for this type." });
    return res.status(500).json({ detail: "Failed to update EOR." });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ detail: "Invalid id." });
  try {
    const { rowCount } = await pool.query("DELETE FROM eors WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ detail: "EOR not found." });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ detail: "Failed to delete EOR." });
  }
});

export default router;
