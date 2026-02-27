import pool from "./pool.js";

const createActionItemsSql = `
CREATE TABLE IF NOT EXISTS action_items (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64),
  task VARCHAR(255),
  description TEXT,
  assigned_to VARCHAR(255),
  start_date DATE,
  due_date DATE,
  status VARCHAR(100),
  priority VARCHAR(100),
  days_left INTEGER,
  notes TEXT
);
`;

const main = async () => {
  await pool.query(createActionItemsSql);
  console.log("Table action_items created.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});