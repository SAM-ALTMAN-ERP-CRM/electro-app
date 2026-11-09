-- Database seed for ERP-5 General Ledger
-- All IDs follow Section 5 shared seed contracts (CUST-0001, CUST-0002, INV-0001, INV-0002)

-- Reset existing seed entries to be cleanly re-runnable
DELETE FROM ledger_entries WHERE id IN ('LED-0001', 'LED-0002', 'LED-0003', 'LED-0004', 'LED-0005', 'LED-0006');

-- Transaction 1: Invoice INV-0001 for Customer CUST-0001 (Total ₹59,000.00)
-- Balanced pair: Debit receivables, Credit sales
INSERT INTO ledger_entries (id, entry_date, account, debit, credit, reference, description, transaction_type)
VALUES
  ('LED-0001', '2026-11-01', 'receivables', 59000.00, 0.00, 'INV-0001', 'Invoice INV-0001 for CUST-0001', 'invoice'),
  ('LED-0002', '2026-11-01', 'sales', 0.00, 59000.00, 'INV-0001', 'Invoice INV-0001 for CUST-0001', 'invoice');

-- Transaction 2: Payment PAY-0001 against Invoice INV-0001 (Total ₹59,000.00)
-- Balanced pair: Debit cash, Credit receivables
INSERT INTO ledger_entries (id, entry_date, account, debit, credit, reference, description, transaction_type)
VALUES
  ('LED-0003', '2026-11-03', 'cash', 59000.00, 0.00, 'PAY-0001', 'Payment received for INV-0001', 'payment'),
  ('LED-0004', '2026-11-03', 'receivables', 0.00, 59000.00, 'PAY-0001', 'Payment received for INV-0001', 'payment');

-- Transaction 3: Invoice INV-0002 for Customer CUST-0002 (Total ₹29,500.00)
-- Balanced pair: Debit receivables, Credit sales
INSERT INTO ledger_entries (id, entry_date, account, debit, credit, reference, description, transaction_type)
VALUES
  ('LED-0005', '2026-11-05', 'receivables', 29500.00, 0.00, 'INV-0002', 'Invoice INV-0002 for CUST-0002', 'invoice'),
  ('LED-0006', '2026-11-05', 'sales', 0.00, 29500.00, 'INV-0002', 'Invoice INV-0002 for CUST-0002', 'invoice');

-- Synchronize sequence to continue after seed IDs
SELECT setval('ledger_seq', 6, true);
