-- Database seed for CRM-3 Customer 360
-- Seed 10 interactions over CUST-0001 to CUST-0003 adhering to Section 5 shared seed contract

INSERT INTO interactions (id, customer_id, type, summary, source_team, created_by, created_at)
VALUES
  ('INT-0001', 'CUST-0001', 'order', 'Order SO-0001 placed for 55-inch 4K Smart TV (SKU-0001)', 'ERP-4', 'EMP-0001', '2026-11-06 14:30:00+05:30'),
  ('INT-0002', 'CUST-0001', 'call', 'Outbound sales call confirming delivery address and installation schedule', 'CRM-1', 'EMP-0001', '2026-11-05 11:15:00+05:30'),
  ('INT-0003', 'CUST-0001', 'ticket', 'Customer enquired about extended warranty options for Smart TV', 'CRM-2', 'EMP-0005', '2026-11-04 16:45:00+05:30'),
  ('INT-0004', 'CUST-0001', 'email', 'Product catalog and festival discount brochure sent via email', 'CRM-4', 'EMP-0002', '2026-11-02 09:00:00+05:30'),
  ('INT-0005', 'CUST-0002', 'meeting', 'Quarterly corporate procurement review and bulk discount agreement', 'CRM-1', 'EMP-0003', '2026-11-06 16:00:00+05:30'),
  ('INT-0006', 'CUST-0002', 'order', 'Purchase order SO-0002 received for 20x 43-inch Full HD TV (SKU-0002)', 'ERP-4', 'EMP-0003', '2026-11-05 10:20:00+05:30'),
  ('INT-0007', 'CUST-0002', 'call', 'Credit terms and GST invoice 27AABCS1234F1Z5 reconciliation call with finance', 'ERP-5', 'EMP-0004', '2026-11-03 15:10:00+05:30'),
  ('INT-0008', 'CUST-0003', 'ticket', 'Installation ticket raised for 65-inch OLED TV (SKU-0003) at Kochi residence', 'CRM-2', 'EMP-0006', '2026-11-06 12:00:00+05:30'),
  ('INT-0009', 'CUST-0003', 'call', 'Feedback call post service engineer visit: customer satisfied with setup', 'CRM-2', 'EMP-0006', '2026-11-05 14:30:00+05:30'),
  ('INT-0010', 'CUST-0003', 'email', 'Welcome onboarding email and digital invoice copy delivered', 'CRM-3', 'EMP-0012', '2026-11-01 10:00:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  type = EXCLUDED.type,
  summary = EXCLUDED.summary,
  source_team = EXCLUDED.source_team,
  created_by = EXCLUDED.created_by,
  created_at = EXCLUDED.created_at;

SELECT setval('interactions_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM interactions));
