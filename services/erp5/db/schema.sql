-- Database schema for ERP-5 Finance, Access & App Shell
-- Port: 5205 | Database: erp5_db

-- Table: users (Auth & Demo Users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','sales','support','warehouse','finance','hr')),
  employee_id TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS users_seq START 1;

-- Sequence for Invoices (INV-0001..)
CREATE SEQUENCE IF NOT EXISTS invoices_seq START WITH 1;

-- Table: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(20) PRIMARY KEY,
  so_id VARCHAR(50),
  customer_id VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_gstin VARCHAR(20),
  sales_rep_id VARCHAR(20),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for Invoice Line Items (ITM-0001..)
CREATE SEQUENCE IF NOT EXISTS invoice_items_seq START WITH 1;

-- Table: invoice_items
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(20) PRIMARY KEY,
  invoice_id VARCHAR(20) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for Payments (PAY-0001..)
CREATE SEQUENCE IF NOT EXISTS payments_seq START WITH 1;

-- Table: payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('upi', 'card', 'bank_transfer', 'cash')),
  reference TEXT,
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sequence for Credit Notes (CN-0001..)
CREATE SEQUENCE IF NOT EXISTS credit_notes_seq START WITH 1;

-- Table: credit_notes (used when a return is credited against an invoice)
CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY,
  so_id VARCHAR(50),
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  serial_number TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_notes_so_serial
  ON credit_notes (so_id, serial_number)
  WHERE so_id IS NOT NULL AND serial_number IS NOT NULL;

-- Sequence for Ledger Entries (LE-0001..)
CREATE SEQUENCE IF NOT EXISTS ledger_entries_seq START WITH 1;

-- Table: ledger_entries (double-entry ledger, ERP5-D1)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY DEFAULT ('LE-' || LPAD(nextval('ledger_entries_seq')::text, 4, '0')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account TEXT NOT NULL CHECK (account IN ('sales', 'receivables', 'cash', 'purchases', 'salary_expense')),
  debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  reference TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_so_id ON invoices(so_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_so_id ON credit_notes(so_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_reference ON ledger_entries(reference);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_entry_date ON ledger_entries(entry_date);
