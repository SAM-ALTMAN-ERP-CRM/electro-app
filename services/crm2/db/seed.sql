-- Database seed for CRM2

-- [CRM2-A1] tickets
-- 6 tickets (TKT-0001 to TKT-0006). Teammates' RMA and assignment seeds point at these IDs.
-- Serials TV55-2611-000N belong to the customer who bought them (CUST-000N).
INSERT INTO tickets (id, customer_id, customer_name, serial_number, subject, description, priority, status, assigned_to, created_at, resolved_at) VALUES
  ('TKT-0001', 'CUST-0001', 'Aarav Mehta',                'TV55-2611-0001', 'TV screen flickers',          'Screen flickers every few minutes after the TV warms up.',   'high',   'in_progress', 'EMP-0005', now() - interval '6 hours',  NULL),
  ('TKT-0002', 'CUST-0002', 'Sunrise Electronics Pvt Ltd', 'TV55-2611-0002', 'No sound from HDMI input',    'Picture works on HDMI 1 but there is no audio.',              'medium', 'open',        'EMP-0006', now() - interval '30 hours', NULL),
  ('TKT-0003', 'CUST-0003', 'Priya Nair',                  'TV55-2611-0003', 'Remote not pairing',          'Voice remote does not pair after battery change.',            'low',    'resolved',    NULL,       now() - interval '3 days',   now() - interval '2 days'),
  ('TKT-0004', 'CUST-0004', 'BrightHome Retail LLP',       'TV55-2611-0004', 'Dead pixels on panel',        'Cluster of dead pixels in the top-left corner.',              'high',   'open',        'EMP-0007', now() - interval '2 hours',  NULL),
  ('TKT-0005', 'CUST-0006', 'Metro Offices Ltd',           NULL,             'Installation visit request',  'Need wall-mount installation for 3 TVs at the new office.', 'medium', 'open',        NULL,       now() - interval '1 day',    NULL),
  ('TKT-0006', 'CUST-0008', 'Gadget Hub',                  NULL,             'Smart TV app keeps crashing', 'Streaming app crashes on launch after the latest update.',   'low',    'closed',      'EMP-0005', now() - interval '5 days',   now() - interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- Move the ticket sequence past the seeded IDs so the next new ticket is TKT-0007.
SELECT setval('crm2_ticket_seq', GREATEST((SELECT last_value FROM crm2_ticket_seq), 6));

-- [CRM2-A3] SLA due times and ticket comments
-- SLA rule: due_at = created_at + 4 h (high), 24 h (medium), 72 h (low).
-- Only fills tickets that have no due_at yet, so it is safe to run twice.
-- With the seed times above, TKT-0001, TKT-0002 and TKT-0005 are already overdue (for the demo).
UPDATE tickets
   SET due_at = created_at + CASE priority
                               WHEN 'high'   THEN interval '4 hours'
                               WHEN 'medium' THEN interval '24 hours'
                               ELSE               interval '72 hours'
                             END
 WHERE due_at IS NULL;

INSERT INTO ticket_comments (id, ticket_id, author, text, created_at) VALUES
  ('CMT-0001', 'TKT-0001', 'System Administrator', 'Customer confirmed the flicker starts after about 10 minutes. Engineer visit booked.', now() - interval '5 hours'),
  ('CMT-0002', 'TKT-0001', 'Imran Qureshi',        'Visited site. Backlight driver board suspected, part requested.',                     now() - interval '2 hours'),
  ('CMT-0003', 'TKT-0002', 'System Administrator', 'Asked customer to try a different HDMI cable and check ARC settings.',               now() - interval '28 hours'),
  ('CMT-0004', 'TKT-0003', 'Deepa Menon',          'Re-paired the remote after a factory reset. Working now.',                            now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Move the comment sequence past the seeded IDs so the next new comment is CMT-0005.
SELECT setval('crm2_comment_seq', GREATEST((SELECT last_value FROM crm2_comment_seq), 4));
