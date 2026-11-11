-- Database schema for CRM2

-- [CRM2-A1] tickets
-- One row per customer support ticket. IDs look like TKT-0001.
CREATE SEQUENCE IF NOT EXISTS crm2_ticket_seq START 1;

CREATE TABLE IF NOT EXISTS tickets (
  id            TEXT PRIMARY KEY DEFAULT ('TKT-' || LPAD(nextval('crm2_ticket_seq')::text, 4, '0')),
  customer_id   TEXT NOT NULL,                 -- CRM-3 customer, e.g. CUST-0001
  customer_name TEXT NOT NULL,
  serial_number TEXT,                          -- product serial, e.g. TV55-2611-0001 (optional)
  subject       TEXT NOT NULL,
  description   TEXT,
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to   TEXT,                          -- ERP-6 service engineer, e.g. EMP-0005 (optional)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at        TIMESTAMPTZ,                   -- filled by the SLA rule in CRM2-A3
  resolved_at   TIMESTAMPTZ                    -- set when status becomes 'resolved'
);

-- [CRM2-B1] warranties
-- Serial-level warranty records. Serial number is primary key.
CREATE TABLE IF NOT EXISTS warranties (
  serial_number   TEXT PRIMARY KEY,
  sku             TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  customer_id     TEXT NOT NULL,
  purchase_date   DATE NOT NULL,
  warranty_months INTEGER NOT NULL DEFAULT 12,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

