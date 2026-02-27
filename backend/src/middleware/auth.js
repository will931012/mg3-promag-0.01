import pool from "../db/pool.js";

export const authRequired = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Token ") ? authHeader.slice(6).trim() : "";

  if (!token) {
    return res.status(401).json({ detail: "Authentication credentials were not provided." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, full_name
       FROM app_users
       WHERE api_token = $1`,
      [token]
    );

    if (!rows[0]) {
      return res.status(401).json({ detail: "Invalid token." });
    }

    req.user = rows[0];
    return next();
  } catch (error) {
    if (error?.code === "42P01") {
      return res.status(500).json({ detail: "Users table is missing. Run db:create:users first." });
    }
    return res.status(500).json({ detail: "Authentication failed." });
  }
};
