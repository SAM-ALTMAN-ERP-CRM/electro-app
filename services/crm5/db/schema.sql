-- Database schema for CRM-5 Portal & Analytics (Port 5105, Database crm5_db)
-- Build Issue: [CRM5-B1] Sales summary & [CRM5-C1] Targets and weighted pipeline

CREATE SEQUENCE IF NOT EXISTS snapshot_seq START 1;

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SNP-' || LPAD(nextval('snapshot_seq')::TEXT, 4, '0')),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics JSONB NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS forecast_seq START 1;

CREATE TABLE IF NOT EXISTS forecasts (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('FCST-' || LPAD(nextval('forecast_seq')::TEXT, 4, '0')),
  month VARCHAR(7) NOT NULL UNIQUE,
  target_amount NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
