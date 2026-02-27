import pg from "pg";

const { Pool } = pg;

const asBool = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const useSsl = asBool(process.env.DB_SSL, hasDatabaseUrl);

const pool = new Pool(
  hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: useSsl ? { rejectUnauthorized: false } : false
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: useSsl ? { rejectUnauthorized: false } : false
      }
);

export default pool;