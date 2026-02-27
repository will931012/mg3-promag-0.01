import { Router } from "express";
import pool from "../db/pool.js";
import { generateApiToken, verifyPassword } from "../utils/password.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

const userSelect = "id, username, email, full_name";

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ detail: "Username and password are required." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, full_name, password_hash
       FROM app_users
       WHERE username = $1`,
      [username]
    );

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ detail: "Invalid credentials." });
    }

    const token = generateApiToken();
    await pool.query("UPDATE app_users SET api_token = $1, updated_at = NOW() WHERE id = $2", [token, user.id]);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    if (error?.code === "42P01") {
      return res.status(500).json({ detail: "Users table is missing. Run db:create:users first." });
    }
    return res.status(500).json({ detail: "Login failed." });
  }
});

router.get("/me", authRequired, async (req, res) => res.json({ user: req.user }));

router.post("/logout", authRequired, async (req, res) => {
  try {
    await pool.query("UPDATE app_users SET api_token = NULL, updated_at = NOW() WHERE id = $1", [req.user.id]);
    return res.json({ detail: "Logged out." });
  } catch {
    return res.status(500).json({ detail: "Logout failed." });
  }
});

router.get("/users", authRequired, async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${userSelect} FROM app_users ORDER BY id`);
    return res.json(rows);
  } catch {
    return res.status(500).json({ detail: "Failed to fetch users." });
  }
});

export default router;
