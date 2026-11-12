# CRM-2 Support & Warranty: 5-step demo script

A walkthrough anyone outside the team can follow, using only the Section 5 shared IDs. Each step lists the page, what to click, what you should see, and the same thing as a `curl` command.

All five steps were run end to end on 12 Nov 2026 against `main` plus the open PRs **#338 (CRM2-C3)** and **#339 (CRM2-D3)**. Steps 4 (warranty rule, ERP-4 handoff, timeline) and 5 (reports) need those two PRs merged.

---

## Test data (Section 5)

| What | ID | Details |
|---|---|---|
| Customer | `CUST-0001` | Aarav Mehta |
| Product | `SKU-0001` | 55-inch 4K Smart TV |
| Serial in warranty | `TV55-2611-0001` | Sold to CUST-0001 three months ago |
| Serial out of warranty | `TV55-2611-0004` | Sold to CUST-0004 (BrightHome Retail LLP) two years ago |
| Service engineer | `EMP-0005` | Imran Qureshi |
| Service centre | `SC-0001` | Mumbai Central Electronics Care |
| Seed tickets | `TKT-0001`–`TKT-0006` | TKT-0001, 0002, 0005 are already overdue |

## Before you start

1. **Reset the database.** Seed dates are relative to the moment it is loaded (purchase dates, SLA deadlines), so reset just before the demo:
   ```bash
   npm run reset
   # until npm run reset is implemented:
   dropdb --force crm2_db; createdb crm2_db
   psql -d crm2_db -f services/crm2/db/schema.sql
   psql -d crm2_db -f services/crm2/db/seed.sql
   ```
2. **Start the app:** `npm run dev` (or only `npm --workspace=services/crm2 run dev` and `npm --workspace=frontend run dev`).
3. Open **http://localhost:3000** and log in as `admin@demo.com` (with `AUTH_REQUIRED=false` you are logged in as System Administrator automatically). Open **Support** in the menu.

After a reset the next new IDs are `TKT-0007`, `CMT-0005`, `ASG-0004` and `RMA-0004`.

---

## Step 1 · Warranty check by serial

**Page:** Support → **Warranty** (`/crm2/warranty`)

1. Type `TV55-2611-0001` and press **Check Warranty**.
   **You see:** SKU-0001, 55-inch 4K Smart TV, customer CUST-0001, purchased three months ago, expires one year after purchase, and a green **In warranty** badge.
2. Check `TV55-2611-0004`.
   **You see:** customer CUST-0004, bought two years ago, already expired, and a red **Expired** badge.

```bash
curl -s localhost:5102/api/warranty/TV55-2611-0001
# TV55-2611-0001 CUST-0001 2026-08-12 -> 2027-08-12 "status":"active"
curl -s localhost:5102/api/warranty/TV55-2611-0004
# TV55-2611-0004 CUST-0004 2024-11-12 -> 2025-11-12 "status":"expired"
```

## Step 2 · Open a ticket, assign an engineer, see the SLA

**Page:** Support → **Tickets** (`/crm2/tickets`)

1. Click **+ New ticket** and fill in:
   - Customer: **Aarav Mehta (CUST-0001)**
   - Serial number: `TV55-2611-0001`
   - Priority: **High**
   - Assigned to: **Imran Qureshi (EMP-0005)**
   - Subject: `No picture, sound works`
   - Description: `Screen stays black after power on; audio is fine.`
2. Click **Create ticket**.
   **You see:** "Ticket **TKT-0007** created." The new row is at the top with a red **High** badge, blue **Open** badge and **3 h left** in the SLA column (high priority = 4-hour SLA).
3. Tick **Overdue only**.
   **You see:** TKT-0002, TKT-0001 and TKT-0005, each with a red **Overdue** badge. Untick it.
4. Click **TKT-0007**. Change **Status** to **In progress**.
   **You see:** "Status changed to In progress." and an amber badge.
5. Under **Comments**, type `Called customer. Engineer visit booked for tomorrow 10am.` and click **Add comment**.
   **You see:** the comment, signed **System Administrator** (the logged-in user).

```bash
curl -s -X POST localhost:5102/api/tickets -H 'Content-Type: application/json' -d '{
  "customer_id":"CUST-0001","customer_name":"Aarav Mehta","serial_number":"TV55-2611-0001",
  "subject":"No picture, sound works","description":"Screen stays black after power on; audio is fine.",
  "priority":"high","assigned_to":"EMP-0005"}'
# {"data":{"id":"TKT-0007", ... "priority":"high","status":"open","assigned_to":"EMP-0005", ...}}   due_at = created_at + 4 h

curl -s localhost:5102/api/tickets/overdue                 # TKT-0002 TKT-0001 TKT-0005
curl -s -X PATCH localhost:5102/api/tickets/TKT-0007/status -H 'Content-Type: application/json' -d '{"status":"in_progress"}'
curl -s -X POST localhost:5102/api/tickets/TKT-0007/comments -H 'Content-Type: application/json' \
  -d '{"text":"Called customer. Engineer visit booked for tomorrow 10am."}'
# {"data":{"id":"CMT-0005","ticket_id":"TKT-0007","author":"System Administrator", ...}}
```

**Integration:** creating the ticket posts *"Ticket TKT-0007: No picture, sound works"* to the CRM-3 customer timeline (CRM3-B3 is merged). With CRM-3 running, open Customers → Aarav Mehta → timeline to show it. If CRM-3 is not running, the CRM-2 log shows
`[integration-error] CRM-3 timeline event failed (crm3 is not reachable). Payload: {"customer_id":"CUST-0001","type":"ticket","summary":"Ticket TKT-0007: No picture, sound works","source_team":"CRM-2"}`
and the ticket is still created.

## Step 3 · Send the ticket to a service centre

**Page:** Support → **Assign Tickets** (`/crm2/assign`)

1. Find **TKT-0007** in the list of tickets awaiting a service centre.
2. In **Assign to centre** choose **Mumbai Central Electronics Care** (`SC-0001`) and click **Assign**.
   **You see:** TKT-0007 leaves the unassigned list. (Assigning a ticket again through the API replaces its earlier centre.)

```bash
curl -s -X POST localhost:5102/api/assignments -H 'Content-Type: application/json' -d '{"ticket_id":"TKT-0007","centre_id":"SC-0001"}'
# {"data":{"id":"ASG-0004","ticket_id":"TKT-0007","centre_id":"SC-0001", ...}}
curl -s "localhost:5102/api/assignments?ticket_id=TKT-0007"
# [{"id":"ASG-0004", ... "centre_name":"Mumbai Central Electronics Care","centre_city":"Mumbai"}]
```

## Step 4 · Return (RMA): approve one, refuse an expired one (needs #338)

**Page:** Support → **Returns (RMA)** (`/crm2/rmas`)

1. Click **+ Request RMA** and fill in Ticket ID `TKT-0007`, Serial Number `TV55-2611-0001`, Reason `Panel fault, no picture`. Submit.
   **You see:** **RMA-0004** with status **requested**.
2. Open **RMA-0004**, choose outcome **Repair** and click **✓ Approve**.
   **You see:** "RMA approved successfully." followed by either "Return handed to ERP-4." (ERP-4 running) or "ERP-4 is not reachable right now; the handoff was logged." The **Status** timeline shows ✓ Requested → **Approved** (highlighted) → Received → Closed.
3. Click **Mark unit received**, then **Close RMA**, to walk the timeline to the end.
4. Back on Returns, request an RMA for Ticket ID `TKT-0004`, Serial Number `TV55-2611-0004` (BrightHome Retail LLP), Reason `Dead pixels`.
   **You see:** the form refuses it with **Out of warranty**.

```bash
curl -s -X POST localhost:5102/api/rmas -H 'Content-Type: application/json' \
  -d '{"ticket_id":"TKT-0007","serial_number":"TV55-2611-0001","reason":"Panel fault, no picture"}'
# RMA-0004 requested
curl -s -X PATCH localhost:5102/api/rmas/RMA-0004/decision -H 'Content-Type: application/json' \
  -d '{"status":"approved","outcome":"repair"}'
# RMA-0004 approved repair, "erp4_handoff":"failed" while ERP-4 is not running ("sent" once it is)
curl -s -X POST localhost:5102/api/rmas -H 'Content-Type: application/json' \
  -d '{"ticket_id":"TKT-0004","serial_number":"TV55-2611-0004","reason":"Dead pixels"}'
# 400 {"error":"Out of warranty"}
```

**Integration:** approval sends `{"rma_id":"RMA-0004","serial_number":"TV55-2611-0001","reason":"Panel fault, no picture","outcome":"repair"}` to ERP-4 `POST /api/returns/from-rma` (ERP-4 then calls ERP-1 and ERP-5) and posts *"RMA RMA-0004 approved (repair)"* to Aarav Mehta's CRM-3 timeline. Until ERP4-D1 is merged the CRM-2 log shows
`[integration-error] ERP-4 return handoff failed (erp4 is not reachable). Payload: {...}`.

## Step 5 · Support reports (needs #339)

**Page:** Support → **Reports** (`/crm2/reports`)

**You see** (after steps 2–4 on a fresh database): **Total tickets 7**, **Overdue tickets 3** (red; TKT-0001, TKT-0002, TKT-0005), **Avg resolution 24 h** (from seed tickets TKT-0003 and TKT-0006), **Active centres 4**; status bars Open 3 · In progress 2 · Resolved 1 · Closed 1; priority bars High 3 · Medium 2 · Low 2; and **Mumbai Central Electronics Care** with 2 tickets (TKT-0001 and TKT-0007).

```bash
curl -s localhost:5102/api/reports/tickets-summary
# by_status, by_priority, total_tickets, overdue_count, avg_resolution_hours, active_centres, by_centre
```

---

## If something goes wrong

| What you see | Why | What to do |
|---|---|---|
| A page says it could not load data | CRM-2 service or database is not running | `curl localhost:5102/api/health`; reload the database (Before you start, 1) |
| Engineer / customer dropdowns still work but the browser shows 500 for `/svc/erp6` or `/svc/crm3` | ERP-6 or CRM-3 not running | Fine for a CRM-2-only demo: the dropdowns fall back to the Section 5 lists |
| `[integration-error] …` in the CRM-2 log | Another team's endpoint is down or not merged | The CRM-2 action still succeeds; start that team's service for the full story |
| New ticket is not `TKT-0007` (or RMA not `RMA-0004`) | Database was not reset since the last run | Reset (Before you start, 1) |
| No tickets show as overdue | The overdue seed tickets were resolved or closed in an earlier run | Reset just before the demo |
| Approving says "already approved" (409) | The RMA was decided earlier | Request a new RMA, or reset |
