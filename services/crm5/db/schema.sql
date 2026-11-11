-- Database schema for CRM-5 Portal & Analytics (Port 5105, Database crm5_db)
-- Build Issues: [CRM5-A1] Portal overview, [CRM5-B1] Sales summary, [CRM5-C1] Targets, [CRM5-D1] Reports

-- 1. Dashboard Snapshots ([CRM5-B1]): stores historical KPI captures for sales dashboard trends
CREATE SEQUENCE IF NOT EXISTS snapshot_seq START 1;

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('SNP-' || LPAD(nextval('snapshot_seq')::TEXT, 4, '0')),
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metrics JSONB NOT NULL
);

-- 2. Monthly Sales Forecasts ([CRM5-C1]): stores monthly revenue targets in INR (YYYY-MM)
CREATE SEQUENCE IF NOT EXISTS forecast_seq START 1;

CREATE TABLE IF NOT EXISTS forecasts (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('FCST-' || LPAD(nextval('forecast_seq')::TEXT, 4, '0')),
  month VARCHAR(7) NOT NULL UNIQUE CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Customer Portal Visits ([CRM5-A1]): audit log of customer self-service portal lookups
-- customer_id is a logical cross-service reference to CRM-3 customers (CUST-0001..CUST-0008)
CREATE SEQUENCE IF NOT EXISTS portal_visit_seq START 1;

CREATE TABLE IF NOT EXISTS portal_visits (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('PV-' || LPAD(nextval('portal_visit_seq')::TEXT, 4, '0')),
  customer_id VARCHAR(20) NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Role-Based Reports ([CRM5-D1]): catalog of cross-team reports and allowed user roles
CREATE SEQUENCE IF NOT EXISTS report_seq START 1;

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('RPT-' || LPAD(nextval('report_seq')::TEXT, 4, '0')),
  name VARCHAR(150) NOT NULL UNIQUE,
  source VARCHAR(50) NOT NULL,
  allowed_roles TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes for sorting and filtering queries
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_taken_at ON dashboard_snapshots(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_visits_customer_id ON portal_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_visits_visited_at ON portal_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_source ON reports(source);
