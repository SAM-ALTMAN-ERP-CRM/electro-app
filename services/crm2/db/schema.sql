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

-- [CRM2-A3] ticket_comments
-- Notes added to a ticket by support staff. IDs look like CMT-0001.
-- (The SLA due time uses the existing tickets.due_at column from CRM2-A1.)
CREATE SEQUENCE IF NOT EXISTS crm2_comment_seq START 1;

CREATE TABLE IF NOT EXISTS ticket_comments (
  id         TEXT PRIMARY KEY DEFAULT ('CMT-' || LPAD(nextval('crm2_comment_seq')::text, 4, '0')),
  ticket_id  TEXT NOT NULL REFERENCES tickets(id),
  author     TEXT NOT NULL,                  -- name of the logged-in user who wrote it
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- [CRM2-D1] service_centres and ticket_assignments
-- Repair and service centres across cities, and ticket-to-centre assignments.
-- IDs look like SC-0001 and ASG-0001.
CREATE SEQUENCE IF NOT EXISTS crm2_centre_seq START 1;

CREATE TABLE IF NOT EXISTS service_centres (
  id       TEXT PRIMARY KEY DEFAULT ('SC-' || LPAD(nextval('crm2_centre_seq')::text, 4, '0')),
  name     TEXT NOT NULL,
  city     TEXT NOT NULL,
  phone    TEXT,
  capacity INT NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  active   BOOLEAN NOT NULL DEFAULT true
);

CREATE SEQUENCE IF NOT EXISTS crm2_assignment_seq START 1;

CREATE TABLE IF NOT EXISTS ticket_assignments (
  id          TEXT PRIMARY KEY DEFAULT ('ASG-' || LPAD(nextval('crm2_assignment_seq')::text, 4, '0')),
  ticket_id   TEXT NOT NULL UNIQUE,          -- Plain text ID (e.g. TKT-0001); assigning twice replaces earlier assignment
  centre_id   TEXT NOT NULL REFERENCES service_centres(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
