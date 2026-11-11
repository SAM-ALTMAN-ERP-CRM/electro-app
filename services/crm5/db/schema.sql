-- Database schema for CRM-5 Portal & Analytics (Port 5105, Database crm5_db)
-- Build Issue: [CRM5-B1] Sales summary API and snapshots & [CRM5-B2] Dashboard screen

CREATE SEQUENCE IF NOT EXISTS snapshot_seq START 1;

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SNP-' || LPAD(nextval('snapshot_seq')::TEXT, 4, '0')),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics JSONB NOT NULL
);
