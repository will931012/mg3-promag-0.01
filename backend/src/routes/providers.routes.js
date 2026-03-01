import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name FROM providers ORDER BY name ASC"
    );
    return res.json(rows);
  } catch (error) {
    if (error?.code === "42P01") return res.json([]);
    return res.status(500).json({ detail: "Failed to load providers." });
  }
});

router.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ detail: "name is required." });

  try {
    const { rows } = await pool.query(
      "INSERT INTO providers (name) VALUES ($1) RETURNING id, name",
      [name]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ detail: "Provider already exists." });
    }
    return res.status(500).json({ detail: "Failed to create provider." });
  }
});

export default router;
