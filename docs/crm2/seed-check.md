# CRM-2 seed check and schema review

Data owner: Ashutosh (CRM2-R2). Checks that `services/crm2/db/seed.sql` follows the shared seed contract (Section 5 of the issues pack) and that `schema.sql` + `seed.sql` load cleanly, twice.

**Last run:** 12 Nov 2026 on `main` at `c18721c`, with all six CRM-2 tables merged (A1, A3, B1 via B3, C1, D1). CRM2-C3 (#338) and CRM2-D3 (#339) change no SQL.

---

## 1. Load test (reset runs clean)

`npm run reset` is still a placeholder on `main` (`scripts/db-setup.js` only prints a message), so the load was checked with `psql` on a fresh database:

```bash
dropdb --force crm2_db; createdb crm2_db
psql -v ON_ERROR_STOP=1 -d crm2_db -f services/crm2/db/schema.sql
psql -v ON_ERROR_STOP=1 -d crm2_db -f services/crm2/db/seed.sql
# run both files a second time
```

| Check | Result |
|---|---|
| First load on an empty database | ✅ no errors |
| Second load on the same database (re-runnable) | ✅ no errors (only "already exists, skipping" notices) |
| Row counts after two loads | ✅ tickets 6, ticket_comments 4, warranties 5, rmas 3, service_centres 4, ticket_assignments 3 (no duplicates) |
| `npm run reset` | ⏳ re-check once ERP5-C4 replaces the placeholder script |

---

## 2. Shared seed contract (Section 5)

Run the queries in section 4 against `crm2_db`. Every "must be empty" query returned 0 rows.

| # | Rule | Result |
|---|---|---|
| 1 | Every `customer_id` (tickets, warranties) is `CUST-0001`..`CUST-0008` | ✅ 0 rows outside the range |
| 2 | `tickets.customer_name` matches the Section 5 name for that ID (CUST-0001 Aarav Mehta … CUST-0008 Gadget Hub) | ✅ 0 mismatches |
| 3 | Every `tickets.assigned_to` is a service engineer `EMP-0005`..`EMP-0007` (or empty) | ✅ 0 rows outside the range |
| 4 | Every `warranties.sku` is `SKU-0001` (55-inch 4K Smart TV) | ✅ 0 rows |
| 5 | Serials `TV55-2611-0001`..`0005` belong to `CUST-0001`..`0005` in order; 0001–0003 active, 0004–0005 expired | ✅ see table below |
| 6 | A ticket's `serial_number` belongs to that ticket's customer | ✅ 0 mismatches (TKT-0001..0004 ↔ TV55-2611-0001..0004) |
| 7 | `TKT-0001`..`TKT-0006` exist (RMA and assignment seeds point at them) | ✅ all 6 present |
| 8 | Sequences continue after the seeded IDs | ✅ ticket 6, comment 4, rma 3, centre 4, assignment 3 (next IDs TKT-0007, CMT-0005, RMA-0004, SC-0005, ASG-0004) |
| 9 | Every comment points at an existing ticket | ✅ 0 orphans (also enforced by the FK) |
| 10 | At least 2 seed tickets are overdue for the demo | ✅ TKT-0001, TKT-0002, TKT-0005 |
| 11 | RMA seeds use existing tickets `TKT-0001`..`0003`, in-warranty serials, and the serial of that ticket | ✅ RMA-0001..0003 → TKT-0001..0003 / TV55-2611-0001..0003, all `active`, all match the ticket's serial |
| 12 | Service centres are `SC-0001`..`SC-0004`; every assignment points at an existing ticket | ✅ SC-0001..0004; TKT-0001→SC-0001, TKT-0002→SC-0002, TKT-0003→SC-0004 |

Rule 5 result (`expires_on` = purchase date + 12 months, compared with 12 Nov 2026):

| Serial | Customer | Purchased | Expires | Status |
|---|---|---|---|---|
| TV55-2611-0001 | CUST-0001 | 2026-08-12 | 2027-08-12 | active |
| TV55-2611-0002 | CUST-0002 | 2026-08-12 | 2027-08-12 | active |
| TV55-2611-0003 | CUST-0003 | 2026-08-12 | 2027-08-12 | active |
| TV55-2611-0004 | CUST-0004 | 2024-11-12 | 2025-11-12 | expired |
| TV55-2611-0005 | CUST-0005 | 2024-11-12 | 2025-11-12 | expired |

Purchase dates are relative to the load date (`CURRENT_DATE - 3 months / 2 years`), so the status stays correct whenever the demo database is reset.

---

## 3. Schema review log

Every `schema.sql` block in the team, reviewed against its issue.

| Block | PR | Review |
|---|---|---|
| `-- [CRM2-A1] tickets` | #289 | ✅ Columns match the issue. CHECKs on `priority` and `status`. `CREATE … IF NOT EXISTS`; seed uses `ON CONFLICT DO NOTHING` + `setval(GREATEST(…))`. |
| `-- [CRM2-A3] ticket_comments` | #291 | ✅ FK to `tickets(id)`. Seed `due_at` uses `UPDATE … WHERE due_at IS NULL`, so it also fixes databases seeded before A3. |
| `-- [CRM2-B1] warranties` | #294 (B3 contains B1) | ✅ Columns match the issue; `serial_number` as PK; seed re-runnable. Suggestion: `CHECK (warranty_months > 0)`. Note: #292 (B1) and #293 (B2) are still open but their code is already on `main` via #294; they can be closed. |
| `-- [CRM2-D1] service_centres, ticket_assignments` | #300 | ✅ Columns match the issue. `capacity >= 0` CHECK, `centre_id` FK, `ticket_id` UNIQUE (re-assigning replaces). `ticket_id` is plain text (built before A1 merged); seed rows all point at real tickets. |
| `-- [CRM2-C1] rmas` | #330 | ✅ Columns match the issue. CHECKs on `status` and `outcome`. `ticket_id` is plain text (same reason); seed rows all point at real tickets and in-warranty serials. |

---

## 4. Check queries

Copy into `psql -d crm2_db`. Queries 1–4, 6 and 9 must return no rows.

```sql
-- 1 customers outside CUST-0001..0008
SELECT 'tickets' AS t, id, customer_id FROM tickets WHERE customer_id !~ '^CUST-000[1-8]$'
UNION ALL
SELECT 'warranties', serial_number, customer_id FROM warranties WHERE customer_id !~ '^CUST-000[1-8]$';

-- 2 customer_name differs from Section 5
SELECT id, customer_id, customer_name FROM tickets
 WHERE (customer_id, customer_name) NOT IN (VALUES
   ('CUST-0001','Aarav Mehta'), ('CUST-0002','Sunrise Electronics Pvt Ltd'), ('CUST-0003','Priya Nair'),
   ('CUST-0004','BrightHome Retail LLP'), ('CUST-0005','Kiran Patel'), ('CUST-0006','Metro Offices Ltd'),
   ('CUST-0007','Sneha Iyer'), ('CUST-0008','Gadget Hub'));

-- 3 engineers outside EMP-0005..0007
SELECT id, assigned_to FROM tickets WHERE assigned_to IS NOT NULL AND assigned_to !~ '^EMP-000[5-7]$';

-- 4 SKU other than SKU-0001
SELECT serial_number, sku FROM warranties WHERE sku <> 'SKU-0001';

-- 5 serial owners and warranty status
SELECT serial_number, customer_id, purchase_date,
       (purchase_date + warranty_months * interval '1 month')::date AS expires_on,
       CASE WHEN purchase_date + warranty_months * interval '1 month' >= CURRENT_DATE
            THEN 'active' ELSE 'expired' END AS status
  FROM warranties ORDER BY 1;

-- 6 ticket serial unknown or owned by a different customer
SELECT t.id, t.serial_number, t.customer_id, w.customer_id AS owner
  FROM tickets t LEFT JOIN warranties w USING (serial_number)
 WHERE t.serial_number IS NOT NULL AND (w.customer_id IS NULL OR w.customer_id <> t.customer_id);

-- 7 required ticket IDs (expect all 6)
SELECT string_agg(id, ' ' ORDER BY id) FROM tickets
 WHERE id IN ('TKT-0001','TKT-0002','TKT-0003','TKT-0004','TKT-0005','TKT-0006');

-- 8 sequences
SELECT 'ticket' AS seq, last_value FROM crm2_ticket_seq
UNION ALL SELECT 'comment', last_value FROM crm2_comment_seq
UNION ALL SELECT 'rma', last_value FROM crm2_rma_seq
UNION ALL SELECT 'centre', last_value FROM crm2_centre_seq
UNION ALL SELECT 'assignment', last_value FROM crm2_assignment_seq;

-- 9 comments on missing tickets
SELECT c.id FROM ticket_comments c LEFT JOIN tickets t ON t.id = c.ticket_id WHERE t.id IS NULL;

-- 10 overdue seed tickets (expect at least 2)
SELECT string_agg(id, ' ' ORDER BY id) FROM tickets
 WHERE due_at < now() AND status NOT IN ('resolved', 'closed');

-- 11 RMAs: ticket exists, serial in warranty, serial matches the ticket (expect all true)
SELECT r.id, r.ticket_id, r.serial_number,
       t.id IS NOT NULL AS ticket_exists,
       (w.purchase_date + (w.warranty_months || ' months')::interval)::date >= CURRENT_DATE AS in_warranty,
       t.serial_number = r.serial_number AS serial_matches_ticket
  FROM rmas r
  LEFT JOIN warranties w USING (serial_number)
  LEFT JOIN tickets t ON t.id = r.ticket_id
 ORDER BY r.id;

-- 12 assignments pointing at missing tickets (must be empty)
SELECT a.id, a.ticket_id FROM ticket_assignments a LEFT JOIN tickets t ON t.id = a.ticket_id WHERE t.id IS NULL;
```
