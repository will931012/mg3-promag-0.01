import "dotenv/config";
import pool from "./pool.js";
import { resetDatabase } from "./reset-schema.js";

const main = async () => {
  await resetDatabase();
  console.log("Database reset complete. Fresh Node SQL schema created.");
  await pool.end();
};

main().catch(async (error) => {
  console.error("Database reset failed:", error.message);
  await pool.end();
  process.exit(1);
});