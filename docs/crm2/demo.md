# CRM-2 Support & Warranty: 5-step demo script

A walkthrough anyone outside the team can follow, using only the Section 5 shared IDs. Each step lists the page, what to click, what you should see, and the same thing as a `curl` command.

Steps marked **(final after CRM2-xx merges)** describe work that is still in an open or planned PR; their wording will be checked against the merged code before G4.

---

## Test data (Section 5)

| What | ID | Details |
|---|---|---|
| Customer | `CUST-0001` | Aarav Mehta |
| Product | `SKU-0001` | 55-inch 4K Smart TV |
| Serial in warranty | `TV55-2611-0001` | Sold to CUST-0001 three months ago |
| Serial out of warranty | `TV55-2611-0004` | Sold to CUST-0004 (BrightHome Retail LLP) two years ago |
| Service engineer | `EMP-0005` | Imran Qureshi |
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

After a reset the first new ticket is `TKT-0007` and the first new comment is `CMT-0005`.

---

## Step 1 · Warranty check by serial (final after CRM2-B1, B2 merge)

**Page:** Support → **Warranty** (`/crm2/warranty`)

1. Type `TV55-2611-0001` and press **Check Warranty**.
   **You see:** SKU-0001, 55-inch 4K Smart TV, customer CUST-0001, purchase date three months ago, expiry one year after purchase, and a green **In warranty** badge.
2. Check `TV55-2611-0004`.
   **You see:** customer CUST-0004, bought two years ago, and a red **Expired** badge.

```bash
curl -s localhost:5102/api/warranty/TV55-2611-0001   # "status": "active"
curl -s localhost:5102/api/warranty/TV55-2611-0004   # "status": "expired"
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
# {"data":{"id":"TKT-0007", ... "priority":"high","status":"open","assigned_to":"EMP-0005",
#   "created_at":"…T20:53:18.590Z","due_at":"…T00:53:18.590Z", ...}}      ← due_at = created_at + 4 h

curl -s localhost:5102/api/tickets/overdue                 # TKT-0002, TKT-0001, TKT-0005
curl -s -X PATCH localhost:5102/api/tickets/TKT-0007/status -H 'Content-Type: application/json' -d '{"status":"in_progress"}'
curl -s -X POST localhost:5102/api/tickets/TKT-0007/comments -H 'Content-Type: application/json' \
  -d '{"text":"Called customer. Engineer visit booked for tomorrow 10am."}'
# {"data":{"id":"CMT-0005","ticket_id":"TKT-0007","author":"System Administrator", ...}}
```

**Integration:** creating the ticket posts *"Ticket TKT-0007: No picture, sound works"* to the CRM-3 customer timeline. Open Customers → Aarav Mehta → timeline to show it. If CRM-3 is not running, the CRM-2 log shows
`[integration-error] CRM-3 timeline event failed (crm3 is not reachable). Payload: {"customer_id":"CUST-0001","type":"ticket","summary":"Ticket TKT-0007: No picture, sound works","source_team":"CRM-2"}`
and the ticket is still created.

## Step 3 · Send the ticket to a service centre (final after CRM2-D1, D2 merge)

**Page:** Support → **Assign** (`/crm2/assign`)

1. Choose ticket **TKT-0007** and a service centre (e.g. `SC-0001`), click **Assign**.
   **You see:** TKT-0007 listed against that centre. Assigning it again to another centre replaces the first assignment.

```bash
curl -s -X POST localhost:5102/api/assignments -H 'Content-Type: application/json' -d '{"ticket_id":"TKT-0007","centre_id":"SC-0001"}'
curl -s "localhost:5102/api/assignments?ticket_id=TKT-0007"
```

## Step 4 · Return (RMA): approve one, refuse an expired one (final after CRM2-C1, C2, C3 merge)

**Page:** Support → **Returns** (`/crm2/rmas`)

1. Request a return for ticket **TKT-0007**, serial `TV55-2611-0001`, reason `Panel fault, no picture`.
   **You see:** a new RMA with status **Requested**.
2. Open it and **Approve** with outcome **repair**.
   **You see:** status **Approved**; the status timeline (requested → approved → received → closed) highlights *approved*. The return is handed to ERP-4: show the new return in ERP-4 (Orders and Dispatch), or the CRM-2 log line for `POST /api/returns/from-rma`. "RMA … approved (repair)" also appears on Aarav Mehta's CRM-3 timeline.
3. Try to request a return for serial `TV55-2611-0004` (e.g. on seed ticket **TKT-0004**, BrightHome Retail LLP).
   **You see:** the request is refused with **"Out of warranty"**.

```bash
curl -s -X POST localhost:5102/api/rmas -H 'Content-Type: application/json' \
  -d '{"ticket_id":"TKT-0007","serial_number":"TV55-2611-0001","reason":"Panel fault, no picture"}'
curl -s -X PATCH localhost:5102/api/rmas/<RMA id>/decision -H 'Content-Type: application/json' \
  -d '{"status":"approved","outcome":"repair"}'
curl -s -X POST localhost:5102/api/rmas -H 'Content-Type: application/json' \
  -d '{"ticket_id":"TKT-0004","serial_number":"TV55-2611-0004","reason":"Dead pixels"}'
# 400 {"error":"Out of warranty"}
```

## Step 5 · Support reports (final after CRM2-D3 merges)

**Page:** Support → **Reports** (`/crm2/reports`)

**You see:** ticket counts by status and priority, average resolution time (from seed tickets TKT-0003 and TKT-0006), the overdue count (TKT-0001, TKT-0002, TKT-0005), and tickets per service centre including TKT-0007.

```bash
curl -s localhost:5102/api/reports/tickets-summary
```

---

## If something goes wrong

| What you see | Why | What to do |
|---|---|---|
| Ticket list says "Could not load tickets" | CRM-2 service or database is not running | `curl localhost:5102/api/health`; reload the database (Before you start, 1) |
| Engineer / customer dropdown still works but CRM-2 log or browser shows 500 for `/svc/erp6` or `/svc/crm3` | ERP-6 or CRM-3 not running | Fine for a CRM-2-only demo: the dropdowns fall back to the Section 5 lists |
| `[integration-error] …` in the CRM-2 log | Another team's endpoint is down or not merged | The CRM-2 action still succeeds; start that team's service for the full story |
| New ticket is not `TKT-0007` | Database was not reset since the last run | Reset (Before you start, 1) |
| No tickets show as overdue | The overdue seed tickets were resolved or closed in an earlier run | Reset just before the demo |
