-- Database seed for CRM-5 Portal & Analytics
-- Provides historical snapshots, forecasts, and customer portal visit logs adhering to Section 5 shared IDs

INSERT INTO dashboard_snapshots (id, taken_at, metrics)
VALUES
  ('SNP-0001', NOW() - INTERVAL '4 days', '{"total_leads": 5, "open_opportunities": 3, "won_value": 45000.00, "quotes_accepted": 1, "opportunities_by_stage": {"prospect": 1, "proposal": 1, "negotiation": 1, "won": 1, "lost": 1}}'::jsonb),
  ('SNP-0002', NOW() - INTERVAL '3 days', '{"total_leads": 7, "open_opportunities": 4, "won_value": 45000.00, "quotes_accepted": 1, "opportunities_by_stage": {"prospect": 2, "proposal": 1, "negotiation": 1, "won": 1, "lost": 1}}'::jsonb),
  ('SNP-0003', NOW() - INTERVAL '2 days', '{"total_leads": 9, "open_opportunities": 5, "won_value": 96980.00, "quotes_accepted": 2, "opportunities_by_stage": {"prospect": 2, "proposal": 2, "negotiation": 1, "won": 2, "lost": 1}}'::jsonb),
  ('SNP-0004', NOW() - INTERVAL '1 day', '{"total_leads": 10, "open_opportunities": 6, "won_value": 150000.00, "quotes_accepted": 3, "opportunities_by_stage": {"prospect": 3, "proposal": 2, "negotiation": 1, "won": 3, "lost": 1}}'::jsonb),
  ('SNP-0005', NOW(), '{"total_leads": 12, "open_opportunities": 7, "won_value": 209970.00, "quotes_accepted": 4, "opportunities_by_stage": {"prospect": 3, "proposal": 2, "negotiation": 2, "won": 4, "lost": 1}}'::jsonb)
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
