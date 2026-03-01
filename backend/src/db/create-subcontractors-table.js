import "dotenv/config";
import pool from "./pool.js";

const createSubcontractorsSql = `
CREATE TABLE IF NOT EXISTS subcontractors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);
`;

const ensureSubmittalSubcontractorTextSql = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submittal_tracker'
      AND column_name = 'sent_to_subcontractor'
      AND data_type <> 'character varying'
  ) THEN
    ALTER TABLE submittal_tracker
    ALTER COLUMN sent_to_subcontractor TYPE VARCHAR(255)
    USING sent_to_subcontractor::text;
  END IF;
END $$;
`;

const ensureRfiSubcontractorTextSql = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rfi_tracker'
      AND column_name = 'sent_to_subcontractor'
      AND data_type <> 'character varying'
  ) THEN
    ALTER TABLE rfi_tracker
    ALTER COLUMN sent_to_subcontractor TYPE VARCHAR(255)
    USING sent_to_subcontractor::text;
  END IF;
END $$;
`;

const main = async () => {
  await pool.query(createSubcontractorsSql);
  await pool.query(ensureSubmittalSubcontractorTextSql);
  await pool.query(ensureRfiSubcontractorTextSql);
  console.log("Table subcontractors created and sent_to_subcontractor columns verified as text.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});
