-- Database schema for ERP-5 Finance, Access & App Shell
-- Port: 5205 | Database: erp5_db

-- Sequence for Ledger Entries (LED-0001..)
CREATE SEQUENCE IF NOT EXISTS ledger_seq START WITH 1;

-- Table: ledger_entries (General Ledger Double-Entry Records)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id VARCHAR(20) PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account VARCHAR(30) NOT NULL CHECK (account IN ('sales', 'receivables', 'cash', 'purchases', 'salary_expense')),
  debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (debit >= 0),
  credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (credit >= 0),
  reference VARCHAR(100),
  description TEXT,
  transaction_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance on queries and filters
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_date ON ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_entries(reference);
CREATE INDEX IF NOT EXISTS idx_ledger_ref_type ON ledger_entries(reference, transaction_type);
