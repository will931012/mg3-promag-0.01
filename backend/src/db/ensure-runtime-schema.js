import pool from "./pool.js";
import { ensureSubmittalRegisterSchema } from "./submittal-register-schema.js";
import { ensureContactsSchema } from "./contacts-schema.js";

const ensureRuntimeSchemaSql = `
ALTER TABLE product_list
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE submittal_tracker
ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'opened';

ALTER TABLE rfi_tracker
ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'opened';

CREATE TABLE IF NOT EXISTS project_contacts (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES product_list(project_id) ON DELETE CASCADE ON UPDATE CASCADE,
  category VARCHAR(30) NOT NULL,
  role VARCHAR(120) NOT NULL,
  company VARCHAR(255) NOT NULL DEFAULT '',
  contact VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(255) NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, category, role)
);
`;

export const ensureRuntimeSchema = async () => {
  await pool.query(ensureRuntimeSchemaSql);
  await ensureSubmittalRegisterSchema();
  await ensureContactsSchema();
};
