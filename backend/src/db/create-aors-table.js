import pool from "./pool.js";

const createAorsSql = `
CREATE TABLE IF NOT EXISTS aors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);
`;

const ensureProductListAorTextSql = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_list'
      AND column_name = 'aor'
      AND data_type <> 'character varying'
  ) THEN
    ALTER TABLE product_list
    ALTER COLUMN aor TYPE VARCHAR(255)
    USING aor::text;
  END IF;
END $$;
`;

const main = async () => {
  await pool.query(createAorsSql);
  await pool.query(ensureProductListAorTextSql);
  console.log("Table aors created and product_list.aor verified as text.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Create table failed:", error.message);
  await pool.end();
  process.exit(1);
});
