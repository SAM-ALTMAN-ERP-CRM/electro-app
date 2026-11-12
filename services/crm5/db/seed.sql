-- Database seed for CRM-5 Portal & Analytics
-- Provides historical snapshots, forecasts, and customer portal visit logs adhering to Section 5 shared IDs

INSERT INTO dashboard_snapshots (id, range, taken_at, metrics)
VALUES
  ('SNP-0001', 'all_time', NOW() - INTERVAL '4 days', '{"total_leads": 5, "open_opportunities": 3, "won_value": 45000.00, "quotes_accepted": 1, "opportunities_by_stage": {"prospect": 1, "proposal": 1, "negotiation": 1, "won": 1, "lost": 1}}'::jsonb),
  ('SNP-0002', 'this_month', NOW() - INTERVAL '3 days', '{"total_leads": 7, "open_opportunities": 4, "won_value": 45000.00, "quotes_accepted": 1, "opportunities_by_stage": {"prospect": 2, "proposal": 1, "negotiation": 1, "won": 1, "lost": 1}}'::jsonb),
  ('SNP-0003', 'this_week', NOW() - INTERVAL '2 days', '{"total_leads": 9, "open_opportunities": 5, "won_value": 96980.00, "quotes_accepted": 2, "opportunities_by_stage": {"prospect": 2, "proposal": 2, "negotiation": 1, "won": 2, "lost": 1}}'::jsonb),
  ('SNP-0004', 'this_week', NOW() - INTERVAL '1 day', '{"total_leads": 10, "open_opportunities": 6, "won_value": 150000.00, "quotes_accepted": 3, "opportunities_by_stage": {"prospect": 3, "proposal": 2, "negotiation": 1, "won": 3, "lost": 1}}'::jsonb),
  ('SNP-0005', 'all_time', NOW(), '{"total_leads": 12, "open_opportunities": 7, "won_value": 209970.00, "quotes_accepted": 4, "opportunities_by_stage": {"prospect": 3, "proposal": 2, "negotiation": 2, "won": 4, "lost": 1}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO forecasts (id, month, target_amount, notes)
VALUES
  ('FCST-0001', '2026-08', 120000.00, 'Q3 August baseline sales target'),
  ('FCST-0002', '2026-09', 150000.00, 'Festival season kickoff campaign target'),
  ('FCST-0003', '2026-10', 180000.00, 'Diwali promotional retail push'),
  ('FCST-0004', '2026-11', 150000.00, 'Post-festival corporate accounts target (Current Month)'),
  ('FCST-0005', '2026-12', 200000.00, 'Year-end enterprise closure and institutional renewals')
ON CONFLICT (month) DO NOTHING;

INSERT INTO portal_visits (id, customer_id, visited_at)
VALUES
  ('PV-0001', 'CUST-0001', NOW() - INTERVAL '2 hours'),
  ('PV-0002', 'CUST-0002', NOW() - INTERVAL '1 hour'),
  ('PV-0003', 'CUST-0003', NOW() - INTERVAL '45 minutes'),
  ('PV-0004', 'CUST-0004', NOW() - INTERVAL '20 minutes'),
  ('PV-0005', 'CUST-0001', NOW() - INTERVAL '5 minutes')
ON CONFLICT (id) DO NOTHING;

-- Seed the 3 core role-based reports specified in [CRM5-D1]
INSERT INTO reports (id, name, source, allowed_roles)
VALUES
  ('RPT-0001', 'Leads by Source', 'CRM-1', 'sales,admin'),
  ('RPT-0002', 'Tickets by Status', 'CRM-2', 'support,admin'),
  ('RPT-0003', 'Customers by Type', 'CRM-3', 'sales,support,admin')
ON CONFLICT DO NOTHING;

-- Sync PostgreSQL sequences past seeded IDs so new inserts do not collide on primary keys
SELECT setval('snapshot_seq', GREATEST(1, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM dashboard_snapshots WHERE id ~ '^SNP-[0-9]+$')));
SELECT setval('forecast_seq', GREATEST(1, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM forecasts WHERE id ~ '^FCST-[0-9]+$')));
SELECT setval('portal_visit_seq', GREATEST(1, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) FROM portal_visits WHERE id ~ '^PV-[0-9]+$')));
SELECT setval('report_seq', GREATEST(1, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM reports WHERE id ~ '^RPT-[0-9]+$')));
