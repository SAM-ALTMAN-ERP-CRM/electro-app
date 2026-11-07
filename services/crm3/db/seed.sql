-- =============================================================================
-- Team CRM-3: Customer 360 (Port 5103)
-- Database Seed Data for crm3_db
-- Adheres strictly to Section 5 Shared Seed Contract
-- Re-runnable & idempotent across initial loads and test resets
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED CUSTOMERS (Section 5: CUST-0001 to CUST-0010)
-- Note: CUST-0009 duplicates CUST-0001 phone (9820011111)
--       CUST-0010 duplicates CUST-0002 email (contact@sunrise.com)
-- -----------------------------------------------------------------------------
INSERT INTO customers (id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at)
VALUES
  ('CUST-0001', 'Aarav Mehta', 'retail', 'aarav.mehta@example.com', '9820011111', NULL, '12 Linking Road, Bandra West', '12 Linking Road, Bandra West', 'Mumbai', '2026-11-01 10:00:00+05:30'),
  ('CUST-0002', 'Sunrise Electronics Pvt Ltd', 'corporate', 'contact@sunrise.com', '9820022222', '27AABCS1234F1Z5', '88 Nariman Point, Express Towers', 'Plot 42 MIDC Andheri East', 'Mumbai', '2026-11-01 10:05:00+05:30'),
  ('CUST-0003', 'Priya Nair', 'retail', 'priya.nair@example.com', '9847012345', NULL, '5 Marine Drive', '5 Marine Drive', 'Kochi', '2026-11-01 10:10:00+05:30'),
  ('CUST-0004', 'BrightHome Retail LLP', 'dealer', 'sales@brighthome.com', '9822098765', '27AABCB9876E1Z2', '45 FC Road, Shivajinagar', 'Warehouse 3, Hadapsar Industrial Estate', 'Pune', '2026-11-01 10:15:00+05:30'),
  ('CUST-0005', 'Kiran Patel', 'retail', 'kiran.patel@example.com', '9825012345', NULL, '23 Ashram Road', '23 Ashram Road', 'Ahmedabad', '2026-11-01 10:20:00+05:30'),
  ('CUST-0006', 'Metro Offices Ltd', 'corporate', 'admin@metrooffices.com', '9811054321', '07AABCM5432D1Z9', '10 Barakhamba Road, Connaught Place', 'Building 5 DLF Phase 2', 'Delhi', '2026-11-01 10:25:00+05:30'),
  ('CUST-0007', 'Sneha Iyer', 'retail', 'sneha.iyer@example.com', '9840012345', NULL, '77 Anna Salai', '77 Anna Salai', 'Chennai', '2026-11-01 10:30:00+05:30'),
  ('CUST-0008', 'Gadget Hub', 'dealer', 'info@gadgethub.com', '9845012345', '29AABCG1234H1Z1', '150 Brigade Road', 'Electronics City Phase 1', 'Bengaluru', '2026-11-01 10:35:00+05:30'),
  ('CUST-0009', 'Aarav Mehta (Duplicate)', 'retail', 'aarav.duplicate@example.com', '9820011111', NULL, '12 Linking Road, Bandra West', '12 Linking Road, Bandra West', 'Mumbai', '2026-11-01 10:40:00+05:30'),
  ('CUST-0010', 'Sunrise Electronics (Branch)', 'corporate', 'contact@sunrise.com', '9820033333', '27AABCS1234F1Z5', '18 Senapati Bapat Road', 'Hinjewadi Tech Park Phase 2', 'Pune', '2026-11-01 10:45:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  gstin = EXCLUDED.gstin,
  billing_address = EXCLUDED.billing_address,
  shipping_address = EXCLUDED.shipping_address,
  city = EXCLUDED.city;

-- -----------------------------------------------------------------------------
-- 2. SEED CONTACTS (1 to 2 contacts per customer, CONT-0001 to CONT-0015)
-- -----------------------------------------------------------------------------
INSERT INTO contacts (id, customer_id, name, phone, email, designation)
VALUES
  ('CONT-0001', 'CUST-0001', 'Aarav Mehta', '9820011111', 'aarav.mehta@example.com', 'Primary Contact'),
  ('CONT-0002', 'CUST-0002', 'Rajesh Sharma', '9820022221', 'rsharma@sunrise.com', 'Procurement Manager'),
  ('CONT-0003', 'CUST-0002', 'Anita Desai', '9820022223', 'adesai@sunrise.com', 'Accounts Lead'),
  ('CONT-0004', 'CUST-0003', 'Priya Nair', '9847012345', 'priya.nair@example.com', 'Primary Contact'),
  ('CONT-0005', 'CUST-0004', 'Vikram Joshi', '9822098766', 'vjoshi@brighthome.com', 'Dealer Representative'),
  ('CONT-0006', 'CUST-0005', 'Kiran Patel', '9825012345', 'kiran.patel@example.com', 'Primary Contact'),
  ('CONT-0007', 'CUST-0006', 'Sunil Kapoor', '9811054321', 'skapoor@metrooffices.com', 'Operations Director'),
  ('CONT-0008', 'CUST-0007', 'Sneha Iyer', '9840012345', 'sneha.iyer@example.com', 'Primary Contact'),
  ('CONT-0009', 'CUST-0008', 'Girish Reddy', '9845012345', 'greddy@gadgethub.com', 'Store Manager'),
  ('CONT-0010', 'CUST-0009', 'Aarav Mehta Jr', '9820011111', 'aarav.duplicate@example.com', 'Associate'),
  ('CONT-0011', 'CUST-0010', 'Rajesh Sharma', '9820033333', 'contact@sunrise.com', 'Branch Lead'),
  ('CONT-0012', 'CUST-0004', 'Ritu Joshi', '9822098767', 'ritu@brighthome.com', 'Accounts Executive'),
  ('CONT-0013', 'CUST-0006', 'Neha Kapoor', '9811054322', 'nkapoor@metrooffices.com', 'Facility Manager'),
  ('CONT-0014', 'CUST-0008', 'Suresh Reddy', '9845012346', 'sreddy@gadgethub.com', 'Commercial Head'),
  ('CONT-0015', 'CUST-0001', 'Meera Mehta', '9820011112', 'meera.mehta@example.com', 'Secondary Contact')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  designation = EXCLUDED.designation;

-- -----------------------------------------------------------------------------
-- 3. SEED INTERACTIONS (CRM3-B1: 10 interactions over CUST-0001 to CUST-0003)
-- Strict Section 5 cross-team IDs:
-- EMP-0001 to EMP-0004 (Sales), EMP-0005 to EMP-0007 (Service), EMP-0012 (Admin)
-- SKU-0001 (55" TV), SKU-0002 (43" TV), SKU-0003 (65" TV)
-- SO-0001, SO-0002 (Orders)
-- -----------------------------------------------------------------------------
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
  ('INT-0010', 'CUST-0003', 'email', 'Welcome onboarding email and digital invoice copy delivered', 'CRM-3', 'EMP-0012', '2026-11-01 10:00:00+05:30'),
  ('INT-0011', 'CUST-0009', 'call', 'Branch enquiry regarding bulk order discount for retail displays', 'CRM-3', 'EMP-0001', '2026-11-05 15:00:00+05:30'),
  ('INT-0012', 'CUST-0010', 'email', 'Branch procurement requirements follow-up and catalog delivery', 'CRM-3', 'EMP-0002', '2026-11-06 09:30:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  type = EXCLUDED.type,
  summary = EXCLUDED.summary,
  source_team = EXCLUDED.source_team,
  created_by = EXCLUDED.created_by,
  created_at = EXCLUDED.created_at;

-- -----------------------------------------------------------------------------
-- 4. SEED SEGMENTS (CRM3-C1: 4 seed segments including 'Corporate in Mumbai')
-- Note: 'Corporate in Mumbai' (SEG-0001) matches CUST-0002 ONLY
--       (CUST-0006 is Delhi, CUST-0010 is Pune)
-- -----------------------------------------------------------------------------
INSERT INTO segments (id, name, customer_type, city, created_at)
VALUES
  ('SEG-0001', 'Corporate in Mumbai', 'corporate', 'Mumbai', '2026-11-02 09:00:00+05:30'),
  ('SEG-0002', 'All Retail Customers', 'retail', NULL, '2026-11-02 09:30:00+05:30'),
  ('SEG-0003', 'Dealers in Pune', 'dealer', 'Pune', '2026-11-02 10:00:00+05:30'),
  ('SEG-0004', 'Delhi NCR Clients', NULL, 'Delhi', '2026-11-02 10:30:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  customer_type = EXCLUDED.customer_type,
  city = EXCLUDED.city;

-- -----------------------------------------------------------------------------
-- 5. SEED CUSTOMER TAGS (CRM3-C3 / CRM3-D1)
-- -----------------------------------------------------------------------------
INSERT INTO customer_tags (customer_id, tag)
VALUES
  ('CUST-0001', 'VIP'),
  ('CUST-0001', 'Priority Support'),
  ('CUST-0002', 'Corporate Account'),
  ('CUST-0002', 'High Value'),
  ('CUST-0003', 'Loyal'),
  ('CUST-0004', 'Tier 1 Dealer'),
  ('CUST-0005', 'High Value'),
  ('CUST-0006', 'Corporate Tier 1'),
  ('CUST-0007', 'Repeat Buyer'),
  ('CUST-0008', 'Regional Distributor'),
  ('CUST-0009', 'Priority Support'),
  ('CUST-0009', 'Branch Customer'),
  ('CUST-0010', 'High Value'),
  ('CUST-0010', 'Regional Branch')
ON CONFLICT (customer_id, tag) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. ADVANCE SEQUENCES TO PREVENT COLLISION WITH NEW INSERTIONS
-- -----------------------------------------------------------------------------
SELECT setval('customers_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM customers));
SELECT setval('contacts_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) FROM contacts));
SELECT setval('interactions_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM interactions));
SELECT setval('segment_id_seq', (SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) FROM segments));
