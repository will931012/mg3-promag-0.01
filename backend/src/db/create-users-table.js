import pool from "./pool.js";

const createUsersTableSql = `
CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL DEFAULT '',
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  api_token VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_api_token ON app_users(api_token);
`;

const main = async () => {
  await pool.query(createUsersTableSql);
  console.log("Table app_users created.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create users table failed:", error.message);
  await pool.end();
  process.exit(1);
});
