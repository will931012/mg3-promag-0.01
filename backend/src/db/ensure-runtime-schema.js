import pool from "./pool.js";

const ensureRuntimeSchemaSql = `
ALTER TABLE product_list
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE submittal_tracker
ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'opened';

ALTER TABLE rfi_tracker
ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'opened';
`;

export const ensureRuntimeSchema = async () => {
  await pool.query(ensureRuntimeSchemaSql);
};

