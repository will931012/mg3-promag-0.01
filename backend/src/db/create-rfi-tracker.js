import pool from "./pool.js";

const createRfiTrackerSql = `
CREATE TABLE IF NOT EXISTS rfi_tracker (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64),
  rfi_number VARCHAR(100),
  subject VARCHAR(255),
  description TEXT,
  from_contractor VARCHAR(255),
  date_sent DATE,
  sent_to_aor VARCHAR(255),
  sent_to_eor TEXT,
  sent_to_subcontractor VARCHAR(255),
  sent_to_date DATE,
  response_due DATE,
  date_answered DATE,
  status VARCHAR(100),
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'opened',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsible VARCHAR(255),
  notes TEXT
);
`;

const main = async () => {
  await pool.query(createRfiTrackerSql);
  console.log("Table rfi_tracker created.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});
