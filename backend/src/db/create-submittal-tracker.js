import pool from "./pool.js";

const createSubmittalTrackerSql = `
CREATE TABLE IF NOT EXISTS submittal_tracker (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64),
  division_csi VARCHAR(100),
  submittal_number VARCHAR(100),
  description TEXT,
  contractor VARCHAR(255),
  start_date DATE,
  date_received DATE,
  sent_to_aor VARCHAR(255),
  sent_to_eor TEXT,
  sent_to_date DATE,
  approval_status VARCHAR(100),
  revision VARCHAR(50),
  due_date DATE,
  overall_status VARCHAR(100),
  responsible VARCHAR(255),
  workflow_stage VARCHAR(100),
  notes TEXT
);
`;

const main = async () => {
  await pool.query(createSubmittalTrackerSql);
  console.log("Table submittal_tracker created.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});
