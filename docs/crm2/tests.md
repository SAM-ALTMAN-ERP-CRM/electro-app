# QA Test Cases & Cross-Team Verification Matrix — Team CRM-2 (Support & Warranty)

**Team**: CRM-2 Support & Warranty  
**Service Port**: `5102` (`services/crm2`) | **Database**: `crm2_db`  
**Frontend Module**: `frontend/src/modules/crm2` (`roles: ["admin", "support"]`)  
**Order-to-Cash Workflow**: Step 9 of 9 (Customer Support, Warranty Checks & RMA Product Returns)  
**QA & Docs Owner (Role R4)**: `@kumbharadi3106-collab` (Aditya Kumbhar)

---

## 1. Test Cases per Build Issue (Minimum 3 per issue)

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-CRM2-A1-01** | `[CRM2-A1]` | Send `GET /api/tickets` with authenticated header | Returns array of 6 seed tickets (`TKT-0001` through `TKT-0006`) with customer info, priority, status, and SLA dates | Returned 6 seed tickets matching Section 5 contract | **PASS** |
| **TC-CRM2-A1-02** | `[CRM2-A1]` | Send `GET /api/tickets?status=open&priority=high` | Returns filtered array containing only open high-priority tickets (e.g. `TKT-0004`) | Filtered correctly to high-priority open tickets | **PASS** |
| **TC-CRM2-A1-03** | `[CRM2-A1]` | Send `POST /api/tickets` with valid `{ customer_id: 'CUST-0001', customer_name: 'Aarav Mehta', subject: 'TV buzz' }` | Generates new `TKT-xxxx` ID, inserts row with status `open`, calculates `due_at`, emits CRM-3 timeline event, returns `201 Created` | Ticket `TKT-0007` created, timeline event dispatched | **PASS** |
| **TC-CRM2-A1-04** | `[CRM2-A1]` | Send `PATCH /api/tickets/TKT-0001/status` with `{ status: 'resolved' }` | Updates ticket status to `resolved` and automatically stamps `resolved_at = now()` | Status updated, `resolved_at` filled | **PASS** |
| **TC-CRM2-A2-01** | `[CRM2-A2]` | Navigate to `/crm2/tickets` in browser | Table displays all tickets with colored badges (`open`: blue, `in_progress`: amber, `resolved`: green, `closed`: plain) and engineer names | Table renders with proper columns and badge styles | **PASS** |
| **TC-CRM2-A2-02** | `[CRM2-A2]` | Filter tickets list by Status = "open" and Priority = "high" | Table dynamically updates to display matching tickets without full page reload | Grid filtered accurately | **PASS** |
| **TC-CRM2-A2-03** | `[CRM2-A2]` | Click "New ticket", choose customer, enter subject, select engineer, and submit | Submits to `POST /api/tickets`, displays success notification, new ticket appears at top of table | New ticket created and rendered in list | **PASS** |
| **TC-CRM2-A2-04** | `[CRM2-A2]` | Open `/crm2/tickets/TKT-0001` and change status dropdown to "resolved" | Sends `PATCH /api/tickets/TKT-0001/status`, status badge dynamically turns green | Status updated live in UI | **PASS** |
| **TC-CRM2-A3-01** | `[CRM2-A3]` | Create high priority ticket via `POST /api/tickets` | `due_at` is set to exactly `created_at + 4 hours` | `due_at` equals `created_at + 4h` | **PASS** |
| **TC-CRM2-A3-02** | `[CRM2-A3]` | Send `GET /api/tickets/overdue` | Returns list of unresolved tickets where `now() > due_at` (`TKT-0001`, `TKT-0002`, `TKT-0005`) | Returns overdue tickets with calculated delay | **PASS** |
| **TC-CRM2-A3-03** | `[CRM2-A3]` | Send `POST /api/tickets/TKT-0001/comments` with `{ text: 'Engineer dispatched' }` | Creates comment record linked to `TKT-0001` with author from logged-in user; returns `201 Created` | Comment record created and linked | **PASS** |
| **TC-CRM2-A3-04** | `[CRM2-A3]` | View ticket details for `TKT-0001` in browser | Overdue badge is displayed and comments thread renders all chronological notes | Overdue tag and comments list rendered | **PASS** |
| **TC-CRM2-B1-01** | `[CRM2-B1]` | Send `GET /api/warranty/TV55-2611-0001` | Returns warranty record with dynamically computed `status: 'active'` and `expires_on` (purchase date + 12 months) | Returns active status and valid future expiration | **PASS** |
| **TC-CRM2-B1-02** | `[CRM2-B1]` | Send `GET /api/warranty/TV55-2611-0004` | Returns warranty record with dynamically computed `status: 'expired'` (bought 2 years ago) | Returns expired status | **PASS** |
| **TC-CRM2-B1-03** | `[CRM2-B1]` | Send `GET /api/warranty/TV55-2611-9999` (non-existent) | Returns `404 Not Found` with clear error message | `404 Not Found` returned | **PASS** |
| **TC-CRM2-B2-01** | `[CRM2-B2]` | Navigate to `/crm2/warranty` in browser | Page renders search input for serial number and list of all 5 seed warranties below | Input and warranty table render correctly | **PASS** |
| **TC-CRM2-B2-02** | `[CRM2-B2]` | Enter `TV55-2611-0001` in warranty lookup input | Displays result card with product name, purchase date, expires date, and green "In warranty" badge | Active warranty card displayed with green badge | **PASS** |
| **TC-CRM2-B2-03** | `[CRM2-B2]` | Enter `TV55-2611-0004` in warranty lookup input | Displays result card with red "Expired" badge | Expired warranty card displayed with red badge | **PASS** |
| **TC-CRM2-B3-01** | `[CRM2-B3]` | Send `POST /api/warranty/sync` with ERP-4 dispatches mock | Syncs new serials from dispatch records; inserts new warranties; returns count of added records | Newly found serials inserted | **PASS** |
| **TC-CRM2-B3-02** | `[CRM2-B3]` | Send `POST /api/warranty/sync` immediately again | Detects existing serials and skips them; returns `{ added: 0 }` | 0 added on second sync (idempotent) | **PASS** |
| **TC-CRM2-B3-03** | `[CRM2-B3]` | Click "Sync from dispatch" button on `/crm2/warranty` | Triggers sync API call, shows toast with imported count, updates warranty table | UI triggers sync and updates table | **PASS** |
| **TC-CRM2-C1-01** | `[CRM2-C1]` | Send `GET /api/rmas` with authentication | Returns array of 3 seeded RMAs (`RMA-0001` through `RMA-0003`) matching Section 5 seed contract | 3 seed RMAs returned | **PASS** |
| **TC-CRM2-C1-02** | `[CRM2-C1]` | Send `POST /api/rmas` with `{ ticket_id: 'TKT-0001', serial_number: 'TV55-2611-0001', reason: 'Flicker' }` | Generates new `RMA-xxxx` ID, default status `requested`, outcome `null`, returns `201 Created` | New RMA created with 201 | **PASS** |
| **TC-CRM2-C1-03** | `[CRM2-C1]` | Send `PATCH /api/rmas/RMA-0001/decision` with `{ status: 'approved' }` (no outcome) | Rejects request with `400 Bad Request` ("Outcome is required when approving an RMA") | `400 Bad Request` returned | **PASS** |
| **TC-CRM2-C1-04** | `[CRM2-C1]` | Send `PATCH /api/rmas/RMA-0001/decision` with `{ status: 'approved', outcome: 'repair' }` | Updates status to `approved`, outcome to `repair`, stamps `decided_at = now()`, returns `200 OK` | Decision recorded with outcome and timestamp | **PASS** |
| **TC-CRM2-C2-01** | `[CRM2-C2]` | Navigate to `/crm2/rmas` in browser | Table renders all RMAs with columns: RMA ID, Ticket, Serial, Reason, Status badge, and Requested At | Table renders properly with colored badges | **PASS** |
| **TC-CRM2-C2-02** | `[CRM2-C2]` | Click "+ Request RMA", fill ticket, serial, reason, and submit | Creates RMA via `POST /api/rmas`, hides form, refreshes table to display new RMA row | Form submits and new RMA appears in list | **PASS** |
| **TC-CRM2-C2-03** | `[CRM2-C2]` | Open `/crm2/rmas/RMA-0001` (status requested) | Displays full RMA info, Approve button, Reject button, and Outcome dropdown | Detail view and decision controls displayed | **PASS** |
| **TC-CRM2-C2-04** | `[CRM2-C2]` | On `/crm2/rmas/RMA-0001`, click Approve without selecting outcome | Client-side and server-side validation error displayed; decision blocked | Inline validation error prevents approval | **PASS** |
| **TC-CRM2-C3-01** | `[CRM2-C3]` | Send `POST /api/rmas` with expired serial `TV55-2611-0004` | Rejects request with `400 Bad Request` ("Product serial is out of warranty; cannot request RMA") | Expired serial RMA rejected | **PASS** |
| **TC-CRM2-C3-02** | `[CRM2-C3]` | Approve an RMA via `PATCH /api/rmas/:id/decision` | Dispatches return record to ERP-4 `POST /api/returns/from-rma` and timeline event to CRM-3 `POST /api/interactions/from-event` | Integrations invoked; return record registered | **PASS** |
| **TC-CRM2-C3-03** | `[CRM2-C3]` | View `/crm2/rmas/:id` in browser | Renders multi-step lifecycle timeline (requested -> approved -> received -> closed) with active state | Status timeline rendered with active step | **PASS** |
| **TC-CRM2-D1-01** | `[CRM2-D1]` | Send `GET /api/centres` | Returns list of 4 seeded service centres (`SC-0001` through `SC-0004`) across Mumbai, Pune, Delhi, Bengaluru | Returns 4 seed centres | **PASS** |
| **TC-CRM2-D1-02** | `[CRM2-D1]` | Send `POST /api/assignments` with `{ ticket_id: 'TKT-0004', centre_id: 'SC-0001' }` | Assigns ticket to centre; returns `201 Created` with generated assignment ID | Ticket assigned to centre | **PASS** |
| **TC-CRM2-D1-03** | `[CRM2-D1]` | Assign `TKT-0004` again to centre `SC-0002` | Replaces earlier assignment for `TKT-0004` (unique constraint on `ticket_id`) without duplicating | Earlier assignment replaced cleanly | **PASS** |
| **TC-CRM2-D2-01** | `[CRM2-D2]` | Navigate to `/crm2/centres` in browser | Displays management table of all service centres with city, phone, capacity, and active status | Centres table renders properly | **PASS** |
| **TC-CRM2-D2-02** | `[CRM2-D2]` | Navigate to `/crm2/assign` in browser | Lists all unassigned tickets with a dropdown of active service centres and "Assign" button | Unassigned tickets and centre dropdown render | **PASS** |
| **TC-CRM2-D2-03** | `[CRM2-D2]` | Select centre for an unassigned ticket and click "Assign" | Calls `POST /api/assignments`, shows confirmation toast, removes ticket from unassigned list | Ticket assigned and removed from queue | **PASS** |
| **TC-CRM2-D3-01** | `[CRM2-D3]` | Send `GET /api/reports/tickets-summary` | Returns aggregated metrics: counts by status, counts by priority, overdue count, average resolution hours, tickets per centre | Accurate aggregate metrics returned | **PASS** |
| **TC-CRM2-D3-02** | `[CRM2-D3]` | Navigate to `/crm2/reports` in browser | Renders summary metric cards, breakdown tables, and HTML/CSS bar charts without external chart libraries | Summary cards and bar charts render cleanly | **PASS** |
| **TC-CRM2-D3-03** | `[CRM2-D3]` | Verify metrics calculation on `/crm2/reports` with empty database | Displays zeroes and clean empty state without crashing or throwing console errors | Graceful zero-state handling verified | **PASS** |

---

## 2. Cross-Team Integration Table Verification (Section 7 Rows)

The following rows in the cross-team contract table involve Team CRM-2. All checks have been validated with `USE_MOCKS=false`:

| Row # | Calling Team | Calling Endpoint | Providing Team | Target Endpoint | CRM-2 Issue | Contract Payload & Response | Verification Status |
| :---: | :---: | :--- | :---: | :--- | :---: | :--- | :---: |
| **4** | CRM-2 (Support) | `POST /api/tickets`<br/>`PATCH /api/rmas/:id/decision` | CRM-3 (Customer 360) | `POST /api/interactions/from-event` | `CRM2-A1`<br/>`CRM2-C3` | Payload: `{ customer_id: 'CUST-0001', type: 'ticket', summary: 'Ticket TKT-0001: TV screen flickers', source_team: 'CRM-2' }`<br/>Returns `201 Created` with generated interaction ID; adds event to customer 360 timeline. | **VERIFIED (PASS)** |
| **5** | CRM-2 (Support) | `loadEngineers()` in `TicketsPage.jsx` | ERP-6 (HR & Payroll) | `GET /api/employees?role_title=Service Engineer` | `CRM2-A2` | Returns array of service engineers. Fallback hardcoded on Section 5 shared IDs (`EMP-0005` Imran Qureshi, `EMP-0006` Deepa Menon, `EMP-0007` Suresh Kumar) when service is offline. | **VERIFIED (PASS)** |
| **6** | CRM-2 (Support) | `POST /api/warranty/sync` | ERP-4 (Dispatch) | `GET /api/dispatches` | `CRM2-B3` | Reads dispatch records (`serial_number`, `sku`, `customer_id`, `ship_date`). Syncs serials into `warranties` table with `purchase_date = ship_date`. | **VERIFIED (PASS)** |
| **7** | CRM-2 (Support) | `PATCH /api/rmas/:id/decision` | ERP-4 (Sales & Returns) | `POST /api/returns/from-rma` | `CRM2-C3` | Approved RMA hands off return record to ERP-4 `{ rma_id: 'RMA-0001', serial_number: 'TV55-2611-0001', outcome: 'repair' }` which initiates downstream inventory and credit note workflows. | **VERIFIED (PASS)** |
| **10** | CRM-5 (Customer Portal) | `GET /api/tickets`<br/>`POST /api/tickets` | CRM-2 (Support) | `GET /api/tickets`<br/>`POST /api/tickets` | `CRM2-A1` | Allows customers on self-service portal to view tickets and raise new support requests. *(See Known Issue note below)*. | **KNOWN ISSUE LOGGED** |
| **12** | CRM-5 (Customer Portal) | `GET /api/tickets` | CRM-2 (Support) | `GET /api/tickets` | `CRM2-A1` | Customer portal dashboard correlates open support tickets with customer orders and warranties. | **VERIFIED (PASS)** |

### Known Cross-Team Issue (Row 10)
> **Notice to Team Lead (Ashutosh) & CRM-5 Team**:  
> CRM-5's portal code currently invokes `callService('crm5', '/api/tickets')` (calling its own service instead of `crm2`). Furthermore, CRM-5's internal mock structure uses `in-progress` (hyphenated) and field `assigned_engineer`, whereas the official CRM-2 shared contract specifies `in_progress` (underscore) and `assigned_to`.  
> CRM-2 adheres strictly to the official contract specification (`in_progress`, `assigned_to`). Logged as cross-team issue for PMO synchronization.

---

## 3. Bug Register (Bugs Logged & Resolved)

During development, unit testing, and cross-team contract validation, the following issues were logged, debugged, and resolved:

| Bug ID | Related Issue | Severity | Description | Root Cause | Resolution | Status |
| :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **BUG-CRM2-001** | `[CRM2-C1]` | High | Approving an RMA via `PATCH /api/rmas/:id/decision` without passing an `outcome` allowed the status to become `approved`. | Missing guard condition on `req.body.outcome` when `status === 'approved'`. | Added strict check requiring `outcome` in `['restock', 'repair', 'credit_note']` before approval; returns `400 Bad Request` if omitted. | **CLOSED** |
| **BUG-CRM2-002** | `[CRM2-A3]` | Medium | Tickets created with priority `high` calculated overdue time based on 24 hours instead of SLA rule of 4 hours. | Hardcoded interval fallback was overriding priority map lookup. | Refactored SLA interval logic to use `SLA_HOURS = { high: 4, medium: 24, low: 72 }` with `make_interval(hours => $x)`. | **CLOSED** |
| **BUG-CRM2-003** | `[CRM2-D1]` | Medium | Assigning a ticket to a second service centre threw PostgreSQL unique constraint violation on `ticket_id`. | Used simple `INSERT` without handling conflict on `ticket_id`. | Added `ON CONFLICT (ticket_id) DO UPDATE SET centre_id = EXCLUDED.centre_id, assigned_at = now()`. | **CLOSED** |
| **BUG-CRM2-004** | `[CRM2-C2]` | Low | RMA detail screen did not disable Approve button when no outcome was selected in dropdown. | Button click handler attempted API call and relied solely on server error response. | Added client-side validation guard and disabled state so user is prompted to select an outcome first. | **CLOSED** |
