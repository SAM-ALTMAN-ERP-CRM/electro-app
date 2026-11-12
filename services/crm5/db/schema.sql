-- Database schema for CRM-5 Portal & Analytics (Port 5105, Database crm5_db)
-- Build Issues: [CRM5-A1] Portal overview, [CRM5-B1] Sales summary, [CRM5-C1] Targets

CREATE SEQUENCE IF NOT EXISTS snapshot_seq START 1;

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SNP-' || LPAD(nextval('snapshot_seq')::TEXT, 4, '0')),
  range VARCHAR(20) NOT NULL DEFAULT 'all_time',
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics JSONB NOT NULL
);

-- Ensure range column exists for existing database instances [CRM5-B3]
ALTER TABLE dashboard_snapshots ADD COLUMN IF NOT EXISTS range VARCHAR(20) NOT NULL DEFAULT 'all_time';

CREATE SEQUENCE IF NOT EXISTS forecast_seq START 1;

CREATE TABLE IF NOT EXISTS forecasts (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('FCST-' || LPAD(nextval('forecast_seq')::TEXT, 4, '0')),
  month VARCHAR(7) NOT NULL UNIQUE,
  target_amount NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS portal_visit_seq START 1;

CREATE TABLE IF NOT EXISTS portal_visits (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('PV-' || LPAD(nextval('portal_visit_seq')::TEXT, 4, '0')),
  customer_id VARCHAR(20) NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
