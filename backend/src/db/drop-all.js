import pool from "./pool.js";

const dropAllPublicTablesSql = `
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(rec.tablename) || ' CASCADE';
  END LOOP;
END $$;
`;

const main = async () => {
  await pool.query(dropAllPublicTablesSql);
  console.log("All public tables dropped.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Drop failed:", error.message);
  await pool.end();
  process.exit(1);
});