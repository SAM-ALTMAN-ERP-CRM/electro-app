-- Database seed for CRM-4 Marketing & Engagement (Port 5104, Database crm4_db)
-- Strictly conforms to Section 5 shared seed contract and CRM-4 build issues.

-- 1. Seed Templates [CRM4-C1] (TPL-0001 to TPL-0004)
INSERT INTO templates (id, name, channel, subject, body, created_at)
VALUES
  ('TPL-0001', 'Product Launch Announcement', 'whatsapp', NULL,
   'Hi {{name}}! We are thrilled to introduce our newest {{product}} with an exclusive launch offer: {{offer}}. Order today at Electro App!',
   '2026-10-10 10:00:00+05:30'),
  ('TPL-0002', 'Festive Special Offer', 'email', 'Exclusive {{offer}} on {{product}} for {{name}}',
   'Dear {{name}},\n\nCelebrate this festive season with Electro App! We are pleased to offer you {{offer}} on our best-selling {{product}}.\n\nWarm regards,\nElectro Sales Team',
   '2026-10-15 11:30:00+05:30'),
  ('TPL-0003', 'Warranty Care Reminder', 'sms', NULL,
   'Dear {{name}}, protect your {{product}} today! Avail our exclusive {{offer}}. Reply YES or call 1800-ELECTRO.',
   '2026-11-01 09:15:00+05:30'),
  ('TPL-0004', 'Customer Feedback Request', 'whatsapp', NULL,
   'Hello {{name}}! Thank you for choosing {{product}}. Please share 1 minute of feedback to claim {{offer}} on your next order.',
   '2026-11-05 14:00:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  channel = EXCLUDED.channel,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body;

-- 2. Seed Campaigns [CRM4-A1] (5 campaigns in different statuses)
INSERT INTO campaigns (id, name, objective, channel, status, segment_id, template_id, scheduled_at, created_at)
VALUES
  ('CMP-0001', 'Diwali Festive Sale', 'Drive festive season revenue with exclusive retail discounts', 'email', 'sent', 'SEG-0001', 'TPL-0002', '2026-10-25 10:00:00+05:30', '2026-10-15 10:00:00+05:30'),
  ('CMP-0002', 'Smart LED TV Launch', 'Introduce new 4K UHD smart televisions to corporate accounts', 'whatsapp', 'scheduled', 'SEG-0002', 'TPL-0001', '2026-11-20 11:00:00+05:30', '2026-11-01 09:00:00+05:30'),
  ('CMP-0003', 'Warranty Care Reminder', 'Post-purchase warranty extension offer with AMC plans', 'sms', 'draft', 'SEG-0003', 'TPL-0003', '2026-12-01 10:00:00+05:30', '2026-11-05 14:30:00+05:30'),
  ('CMP-0004', 'Corporate Fleet Upgrade', 'B2B commercial display promotions for Delhi NCR clients', 'email', 'sent', 'SEG-0004', 'TPL-0002', '2026-10-30 09:30:00+05:30', '2026-10-20 11:00:00+05:30'),
  ('CMP-0005', 'Post-Purchase CSAT Survey', 'Solicit product feedback and NPS ratings from recent buyers', 'whatsapp', 'draft', 'SEG-0001', 'TPL-0004', '2026-12-10 12:00:00+05:30', '2026-11-10 16:00:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  objective = EXCLUDED.objective,
  channel = EXCLUDED.channel,
  status = EXCLUDED.status,
  segment_id = EXCLUDED.segment_id,
  template_id = EXCLUDED.template_id,
  scheduled_at = EXCLUDED.scheduled_at;

-- 3. Seed Campaign Messages [CRM4-A3] (Sent to 8 customers CUST-0001 to CUST-0008)
INSERT INTO campaign_messages (id, campaign_id, customer_id, status, sent_at)
VALUES
  ('MSG-0001', 'CMP-0001', 'CUST-0001', 'sent', '2026-10-25 10:00:01+05:30'),
  ('MSG-0002', 'CMP-0001', 'CUST-0002', 'sent', '2026-10-25 10:00:02+05:30'),
  ('MSG-0003', 'CMP-0001', 'CUST-0003', 'sent', '2026-10-25 10:00:03+05:30'),
  ('MSG-0004', 'CMP-0001', 'CUST-0004', 'sent', '2026-10-25 10:00:04+05:30'),
  ('MSG-0005', 'CMP-0001', 'CUST-0005', 'sent', '2026-10-25 10:00:05+05:30'),
  ('MSG-0006', 'CMP-0001', 'CUST-0006', 'sent', '2026-10-25 10:00:06+05:30'),
  ('MSG-0007', 'CMP-0001', 'CUST-0007', 'sent', '2026-10-25 10:00:07+05:30'),
  ('MSG-0008', 'CMP-0001', 'CUST-0008', 'sent', '2026-10-25 10:00:08+05:30')
ON CONFLICT (id) DO UPDATE SET
  campaign_id = EXCLUDED.campaign_id,
  customer_id = EXCLUDED.customer_id,
  status = EXCLUDED.status;

-- 4. Seed Audiences [CRM4-B1] (AUD-0001 to AUD-0003)
INSERT INTO audiences (id, name, description, created_at)
VALUES
  ('AUD-0001', 'Festive Shoppers 2026', 'High-intent retail buyers for seasonal festive electronics promotions', '2026-10-15 10:00:00+05:30'),
  ('AUD-0002', 'Corporate Fleet Accounts', 'B2B commercial accounts evaluated for commercial monitors and hardware', '2026-10-20 11:00:00+05:30'),
  ('AUD-0003', 'Warranty Care Leads', 'Home appliance buyers nearing warranty expiration eligible for AMC plans', '2026-11-01 09:00:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 5. Seed Audience Members [CRM4-B1, CRM4-B3] (CUST-0001 to CUST-0008)
INSERT INTO audience_members (id, audience_id, customer_id, name, email, phone, opted_out, created_at)
VALUES
  ('MEM-0001', 'AUD-0001', 'CUST-0001', 'Aarav Mehta', 'aarav.mehta@example.com', '9820112345', false, '2026-10-15 10:05:00+05:30'),
  ('MEM-0002', 'AUD-0001', 'CUST-0002', 'Sunrise Electronics Pvt Ltd', 'purchase@sunrise.com', '9820223456', false, '2026-10-15 10:05:00+05:30'),
  ('MEM-0003', 'AUD-0001', 'CUST-0003', 'Priya Nair', 'priya.nair@example.com', '9847134567', true, '2026-10-15 10:05:00+05:30'),
  ('MEM-0004', 'AUD-0001', 'CUST-0004', 'BrightHome Retail LLP', 'contact@brighthome.com', '9850145678', false, '2026-10-15 10:05:00+05:30'),
  ('MEM-0005', 'AUD-0001', 'CUST-0005', 'Kiran Patel', 'kiran.patel@example.com', '9879156789', false, '2026-10-15 10:05:00+05:30'),
  ('MEM-0006', 'AUD-0001', 'CUST-0006', 'Metro Offices Ltd', 'admin@metrooffices.com', '9811167890', false, '2026-10-15 10:05:00+05:30'),
  ('MEM-0007', 'AUD-0001', 'CUST-0007', 'Sneha Iyer', 'sneha.iyer@example.com', '9840178901', false, '2026-10-15 10:05:00+05:30'),
  ('MEM-0008', 'AUD-0001', 'CUST-0008', 'Gadget Hub', 'sales@gadgethub.com', '9845189012', false, '2026-10-15 10:05:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  audience_id = EXCLUDED.audience_id,
  customer_id = EXCLUDED.customer_id,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  opted_out = EXCLUDED.opted_out;

-- 6. Seed Enquiries [CRM4-B4] (ENQ-0001 to ENQ-0005)
INSERT INTO enquiries (id, name, phone, email, source, product_interest, lead_id, sales_rep_id, notes, created_at)
VALUES
  ('ENQ-0001', 'Rajiv Verma', '9820066666', 'rajiv.verma@example.com', 'web', 'SKU-0001', 'LEAD-0001', 'EMP-0001', 'Inquired about 55-inch smart TV festive bundle discount', '2026-11-10 10:30:00+05:30'),
  ('ENQ-0002', 'Apex Electronics Dealer', '9820077777', 'purchasing@apexelectronics.com', 'dealer', 'SKU-0002', 'LEAD-0002', 'EMP-0001', 'Dealer enquiry for 10 units double-door refrigerator', '2026-11-11 14:15:00+05:30'),
  ('ENQ-0003', 'Priya Nair', '9820088888', 'priya.nair@example.com', 'walk-in', 'SKU-0004', 'LEAD-0003', 'EMP-0001', 'Showroom walk-in customer interested in microwave oven', '2026-11-12 11:00:00+05:30'),
  ('ENQ-0004', 'Kiran Patel', '9879156789', 'kiran.patel@example.com', 'web', 'SKU-0005', 'LEAD-0004', 'EMP-0001', 'Web form request for split AC installation quote', '2026-11-12 16:45:00+05:30'),
  ('ENQ-0005', 'Metro Offices Ltd', '9811167890', 'admin@metrooffices.com', 'dealer', 'SKU-0003', 'LEAD-0005', 'EMP-0001', 'Commercial purchase inquiry for washing machine fleet', '2026-11-13 09:20:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  source = EXCLUDED.source,
  product_interest = EXCLUDED.product_interest,
  lead_id = EXCLUDED.lead_id,
  sales_rep_id = EXCLUDED.sales_rep_id,
  notes = EXCLUDED.notes;

-- 7. Seed Surveys [CRM4-D1] (SRV-0001 NPS, SRV-0002 CSAT)
INSERT INTO surveys (id, title, type, created_at)
VALUES
  ('SRV-0001', 'Annual Product Experience NPS', 'nps', '2026-10-10 09:00:00+05:30'),
  ('SRV-0002', 'Post-Delivery Installation CSAT', 'csat', '2026-10-18 10:30:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  type = EXCLUDED.type;

-- 8. Seed Survey Responses [CRM4-D1, CRM4-D3]
-- SRV-0001 NPS (10 responses: 6 Promoters, 2 Passives, 2 Detractors -> NPS = 60% - 20% = +40)
INSERT INTO survey_responses (id, survey_id, customer_id, score, comment, created_at)
VALUES
  ('RES-0001', 'SRV-0001', 'CUST-0001', 10, 'Exceptional TV clarity and the technician calibrated the wall mount perfectly!', '2026-10-12 11:00:00+05:30'),
  ('RES-0002', 'SRV-0001', 'CUST-0002', 9, 'Commercial displays for our conference rooms have been reliable for 6 months.', '2026-10-14 14:30:00+05:30'),
  ('RES-0003', 'SRV-0001', 'CUST-0003', 10, 'Excellent customer support when scheduling product installation.', '2026-10-16 10:15:00+05:30'),
  ('RES-0004', 'SRV-0001', 'CUST-0004', 8, 'Product is good but dealer delivery took 2 days longer than scheduled.', '2026-10-20 16:45:00+05:30'),
  ('RES-0005', 'SRV-0001', 'CUST-0005', 8, 'Satisfactory performance on the refrigerator; energy efficiency is good.', '2026-10-21 12:20:00+05:30'),
  ('RES-0006', 'SRV-0001', 'CUST-0006', 5, 'Remote controller stopped pairing after 3 weeks. Awaiting warranty replacement.', '2026-10-22 09:40:00+05:30'),
  ('RES-0007', 'SRV-0001', 'CUST-0007', 4, 'Delivery was delayed and the instruction manual was missing from the box.', '2026-10-24 15:10:00+05:30'),
  ('RES-0008', 'SRV-0001', 'CUST-0008', 10, 'Flawless soundbar integration with our home theatre setup. Highly recommended!', '2026-10-25 11:50:00+05:30'),
  ('RES-0009', 'SRV-0001', 'CUST-0001', 9, 'Very satisfied with seasonal festive discounts and courteous service engineer.', '2026-10-28 13:25:00+05:30'),
  ('RES-0010', 'SRV-0001', 'CUST-0002', 9, 'Outstanding procurement support and prompt GST invoice generation.', '2026-10-29 17:05:00+05:30'),

  -- SRV-0002 CSAT (10 responses: average score = 4.4 / 5.0)
  ('RES-0011', 'SRV-0002', 'CUST-0001', 5, 'Technician arrived right on time and explained all smart TV settings.', '2026-10-19 10:00:00+05:30'),
  ('RES-0012', 'SRV-0002', 'CUST-0002', 4, 'Good delivery experience and clean installation.', '2026-10-19 11:30:00+05:30'),
  ('RES-0013', 'SRV-0002', 'CUST-0003', 5, 'Very courteous installation engineer. Tested audio and video thoroughly.', '2026-10-20 14:15:00+05:30'),
  ('RES-0014', 'SRV-0002', 'CUST-0004', 4, 'Installation was seamless once technician arrived.', '2026-10-21 09:45:00+05:30'),
  ('RES-0015', 'SRV-0002', 'CUST-0005', 3, 'Delivery slot was rescheduled once, but installation itself was fine.', '2026-10-22 13:00:00+05:30'),
  ('RES-0016', 'SRV-0002', 'CUST-0006', 5, 'Professional corporate installation for office displays.', '2026-10-23 15:30:00+05:30'),
  ('RES-0017', 'SRV-0002', 'CUST-0007', 4, 'Polite staff and quick demo of remote functions.', '2026-10-24 10:20:00+05:30'),
  ('RES-0018', 'SRV-0002', 'CUST-0008', 5, 'Flawless unboxing and demonstration. 5 stars!', '2026-10-25 12:40:00+05:30'),
  ('RES-0019', 'SRV-0002', 'CUST-0001', 4, 'Prompt assistance with demo.', '2026-10-26 14:50:00+05:30'),
  ('RES-0020', 'SRV-0002', 'CUST-0002', 5, 'Great support from the local installation team.', '2026-10-27 16:10:00+05:30')
ON CONFLICT (id) DO UPDATE SET
  survey_id = EXCLUDED.survey_id,
  customer_id = EXCLUDED.customer_id,
  score = EXCLUDED.score,
  comment = EXCLUDED.comment;

-- 9. Sequence Synchronization (advance sequences past seed records)
SELECT setval('template_seq', 4, true);
SELECT setval('campaign_seq', 5, true);
SELECT setval('campaign_message_seq', 8, true);
SELECT setval('audience_seq', 3, true);
SELECT setval('audience_member_seq', 8, true);
SELECT setval('enquiry_seq', 5, true);
SELECT setval('survey_seq', 2, true);
SELECT setval('survey_response_seq', 20, true);
