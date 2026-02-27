import "dotenv/config";
import pool from "./pool.js";
import { hashPassword } from "../utils/password.js";

const main = async () => {
  const username = process.env.SEED_ADMIN_USERNAME || "admin";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  const email = process.env.SEED_ADMIN_EMAIL || "admin@mg3.local";
  const fullName = process.env.SEED_ADMIN_FULL_NAME || "MG3 Admin";

  const passwordHash = hashPassword(password);

  await pool.query(
    `INSERT INTO app_users (username, email, full_name, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username)
     DO UPDATE SET
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       updated_at = NOW()`,
    [username, email, fullName, passwordHash]
  );

  console.log(`Seed user ready. username=${username} password=${password}`);
  await pool.end();
};

main().catch(async (error) => {
  console.error("Seed user failed:", error.message);
  await pool.end();
  process.exit(1);
});
