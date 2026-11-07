-- Database schema for CRM-3 Customer 360 (Port 5103)
-- Customer Master Directory, Contacts & Unified Event Timeline

-- Interactions Table & Sequence (CRM3-B1 Unified Event Timeline)
CREATE SEQUENCE IF NOT EXISTS interactions_seq START WITH 1;

CREATE TABLE IF NOT EXISTS interactions (
  id VARCHAR(20) PRIMARY KEY DEFAULT ('INT-' || LPAD(nextval('interactions_seq')::TEXT, 4, '0')),
  customer_id VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'ticket', 'order')),
  summary TEXT NOT NULL,
  source_team VARCHAR(20) NOT NULL DEFAULT 'CRM-3',
  created_by VARCHAR(100) DEFAULT 'EMP-0001',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
