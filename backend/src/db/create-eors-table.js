import "dotenv/config";
import { EOR_TYPES } from "../constants/eor-types.js";
import pool from "./pool.js";

const eorTypesSql = EOR_TYPES.map((type) => `'${type.replace(/'/g, "''")}'`).join(", ");

const createEorsSql = `
CREATE TABLE IF NOT EXISTS eors (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  CONSTRAINT chk_eor_type CHECK (type IN (${eorTypesSql})),
  CONSTRAINT uq_eor_type_name UNIQUE (type, name)
);
`;

const ensureProductListEorTextSql = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_list'
      AND column_name = 'eor'
      AND data_type <> 'character varying'
  ) THEN
    ALTER TABLE product_list
    ALTER COLUMN eor TYPE VARCHAR(255)
    USING eor::text;
  END IF;
END $$;
`;

const main = async () => {
  await pool.query(createEorsSql);
  await pool.query(ensureProductListEorTextSql);
  console.log("Table eors created and product_list.eor verified as text.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});
