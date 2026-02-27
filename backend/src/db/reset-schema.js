import pool from "./pool.js";

const dropPublicSchemaObjectsSql = `
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

  FOR rec IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(rec.typname) || ' CASCADE';
  END LOOP;
END $$;
`;

const createSchemaSql = `
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  location VARCHAR(180) NOT NULL,
  client VARCHAR(180) NOT NULL,
  budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'planning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_projects_progress_range CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT chk_projects_status CHECK (status IN ('planning', 'active', 'at_risk', 'done')),
  CONSTRAINT chk_projects_budget_non_negative CHECK (budget >= 0)
);

CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  assignee VARCHAR(180) NOT NULL,
  due_date DATE NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium',
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tasks_priority CHECK (priority IN ('low', 'medium', 'high'))
);

CREATE TABLE milestones (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  target_date DATE NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE risks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  severity VARCHAR(10) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  mitigation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_risks_severity CHECK (severity IN ('low', 'medium', 'high')),
  CONSTRAINT chk_risks_status CHECK (status IN ('open', 'mitigated'))
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_risks_project_id ON risks(project_id);
`;

export const resetDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(dropPublicSchemaObjectsSql);
    await client.query(createSchemaSql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};