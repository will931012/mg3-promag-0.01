import "dotenv/config";
import pool from "./pool.js";

const createProvidersSql = `
CREATE TABLE IF NOT EXISTS providers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);
`;

const ensureSubmittalProviderTextSql = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'submittal_tracker'
      AND column_name = 'sent_to_provider'
      AND data_type <> 'character varying'
  ) THEN
    ALTER TABLE submittal_tracker
    ALTER COLUMN sent_to_provider TYPE VARCHAR(255)
    USING sent_to_provider::text;
  END IF;
END $$;
`;

const main = async () => {
  await pool.query(createProvidersSql);
  await pool.query(ensureSubmittalProviderTextSql);
  console.log("Table providers created and submittal_tracker.sent_to_provider verified as text.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});
