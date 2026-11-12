-- Database seed for CRM-1 Sales Pipeline (Port 5101, Database crm1_db)
-- Build Issue: [CRM1-C1] Quotes tables and API

INSERT INTO quotes (
  id, opportunity_id, customer_id, dealer_id, sales_rep_id,
  status, discount_percent, needs_approval, approved, rejection_reason, created_at
) VALUES
  ('QUO-0001', 'OPP-0001', 'CUST-0001', NULL, 'EMP-0001', 'draft', 0.00, FALSE, FALSE, NULL, NOW() - INTERVAL '4 days'),
  ('QUO-0002', 'OPP-0002', 'CUST-0004', 'DLR-0001', 'EMP-0002', 'sent', 5.00, FALSE, FALSE, NULL, NOW() - INTERVAL '3 days'),
  ('QUO-0003', 'OPP-0003', 'CUST-0003', NULL, 'EMP-0003', 'accepted', 10.00, TRUE, TRUE, NULL, NOW() - INTERVAL '2 days'),
  ('QUO-0004', 'OPP-0004', 'CUST-0002', NULL, 'EMP-0001', 'rejected', 15.00, TRUE, FALSE, 'Requested discount exceeds maximum allowable limit', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quote_items (
  id, quote_id, sku, product_name, quantity, unit_price
) VALUES
  ('QI-0001', 'QUO-0001', 'SKU-0001', '55-inch 4K Smart TV', 1, 42990.00),
  ('QI-0002', 'QUO-0001', 'SKU-0004', 'Soundbar 2.1', 1, 8990.00),
  ('QI-0003', 'QUO-0002', 'SKU-0002', '43-inch Full HD TV', 2, 24990.00),
  ('QI-0004', 'QUO-0002', 'SKU-0004', 'Soundbar 2.1', 2, 8990.00),
  ('QI-0005', 'QUO-0003', 'SKU-0003', '65-inch OLED TV', 1, 94990.00),
  ('QI-0006', 'QUO-0003', 'SKU-0005', 'Soundbar 5.1', 1, 17990.00),
  ('QI-0007', 'QUO-0004', 'SKU-0001', '55-inch 4K Smart TV', 2, 42990.00)
ON CONFLICT (id) DO NOTHING;

SELECT setval('quote_seq', GREATEST(4, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM quotes WHERE id LIKE 'QUO-%')));
SELECT setval('quote_items_seq', GREATEST(7, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) FROM quote_items WHERE id LIKE 'QI-%')));

-- Build Issue: [CRM1-D1] Seed dealers (DLR-0001 to DLR-0005)
INSERT INTO dealers (
  id, name, contact_person, phone, email, city, tier, credit_limit, status, created_at
) VALUES
  ('DLR-0001', 'BrightHome Retail', 'Rahul Deshmukh', '020-25671199', 'rahul@brighthome.in', 'Pune', 'gold', 1500000.00, 'active', NOW() - INTERVAL '30 days'),
  ('DLR-0002', 'Gadget Hub', 'Suresh Rao', '080-22345678', 'contact@gadgethub.in', 'Bengaluru', 'silver', 800000.00, 'active', NOW() - INTERVAL '25 days'),
  ('DLR-0003', 'Metro Electronics', 'Amit Verma', '011-23456789', 'amit@metroelec.com', 'Delhi', 'gold', 2000000.00, 'active', NOW() - INTERVAL '20 days'),
  ('DLR-0004', 'Western Appliance Mart', 'Manoj Joshi', '022-26789012', 'manoj@westernmart.com', 'Mumbai', 'bronze', 300000.00, 'active', NOW() - INTERVAL '15 days'),
  ('DLR-0005', 'Royal Vision Hub', 'Priya S.', '044-24567890', 'priya@royalvision.com', 'Chennai', 'silver', 600000.00, 'active', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

SELECT setval('dealer_seq', GREATEST(5, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM dealers WHERE id LIKE 'DLR-%')));

-- Seed leads once so repeated database setup does not create duplicates.
INSERT INTO leads (
  id, name, phone, email, source, product_interest, status, score, sales_rep_id
) VALUES
  ('LEAD-0001', 'Aarav Mehta', '9820011223', 'aarav@gmail.com', 'dealer', '55-inch 4K Smart TV', 'qualified', 70, 'EMP-0001'),
  ('LEAD-0002', 'Sunrise Electronics', '022-28491029', 'procurement@sunrise.com', 'web', 'Soundbar 5.1', 'contacted', 50, 'EMP-0002'),
  ('LEAD-0003', 'Priya Nair', '9847012345', 'priya.nair@yahoo.com', 'walk-in', 'Microwave Oven 25L', 'new', 30, 'EMP-0003'),
  ('LEAD-0004', 'BrightHome Retail', '020-25671199', 'orders@brighthome.in', 'dealer', '65-inch OLED TV', 'qualified', 80, 'EMP-0001'),
  ('LEAD-0005', 'Kiran Patel', '9825098765', 'kiran.patel@rediffmail.com', 'web', 'Air Fryer 4L', 'new', 40, 'EMP-0004')
ON CONFLICT (id) DO NOTHING;

SELECT setval(
  'leads_seq',
  GREATEST(
    (SELECT last_value FROM leads_seq),
    5,
    (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM leads WHERE id LIKE 'LEAD-%')
  )
);

-- Build Issue: [CRM1-B1] Seed opportunities (OPP-0001 to OPP-0006)
INSERT INTO opportunities (
  id, lead_id, customer_id, title, expected_value, stage, sales_rep_id, created_at
) VALUES
  ('OPP-0001', 'LEAD-0001', 'CUST-0001', '55" Smart TV bulk purchase', 128970.00, 'won', 'EMP-0001', NOW() - INTERVAL '6 days'),
  ('OPP-0002', 'LEAD-0002', 'CUST-0002', 'Corporate sound system setup', 89950.00, 'proposal', 'EMP-0002', NOW() - INTERVAL '5 days'),
  ('OPP-0003', 'LEAD-0003', 'CUST-0003', 'Kitchen appliances bundle', 25490.00, 'negotiation', 'EMP-0003', NOW() - INTERVAL '4 days'),
  ('OPP-0004', 'LEAD-0004', 'CUST-0004', 'Dealer annual TV quota', 474950.00, 'proposal', 'EMP-0001', NOW() - INTERVAL '3 days'),
  ('OPP-0005', 'LEAD-0005', 'CUST-0005', 'Home audio upgrades', 35980.00, 'prospect', 'EMP-0004', NOW() - INTERVAL '2 days'),
  ('OPP-0006', 'LEAD-0002', 'CUST-0006', 'Office TV installation', 94990.00, 'lost', 'EMP-0002', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

SELECT setval('opp_seq', GREATEST(6, (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM opportunities WHERE id LIKE 'OPP-%')));
