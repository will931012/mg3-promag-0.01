import pool from "./pool.js";

const createProductListSql = `
CREATE TABLE IF NOT EXISTS product_list (
  project_id VARCHAR(64) PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  address TEXT,
  developer VARCHAR(255),
  aor DATE,
  eor DATE,
  start_date DATE,
  end_date DATE,
  status VARCHAR(100),
  priority VARCHAR(100),
  notes TEXT
);
`;

const main = async () => {
  await pool.query(createProductListSql);
  console.log("Table product_list created.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});