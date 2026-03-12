import "dotenv/config";
import pool from "./pool.js";

const createContractorsSql = `
CREATE TABLE IF NOT EXISTS contractors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);
`;

const main = async () => {
  await pool.query(createContractorsSql);
  console.log("Table contractors created.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});
