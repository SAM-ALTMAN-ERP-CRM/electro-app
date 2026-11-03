# Issues for Team CRM2

**Context Line**:
> Team: CRM-2 Support and warranty. Database: crm2_db. Backend services/crm2 on port 5102. Frontend module frontend/src/modules/crm2 (id crm2, title Support, roles admin and support). Our job: handle customer support tickets, warranty checks by serial number and product returns (RMA).

## Build Issues

### [CRM2-A1] Tickets table and API

- **Build**: Table tickets (id TKT-0001, customer_id, customer_name, serial_number nullable, subject, description, priority = low/medium/high, status = open/in_progress/resolved/closed default open, assigned_to nullable (an EMP id of a service engineer), created_at, due_at, resolved_at). Endpoints: GET /api/tickets (filters ?status= ? priority= ?customer_id=), GET /:id, POST, PUT /:id, PATCH /api/tickets/:id/status. Setting resolved fills resolved_at. After a ticket is created, post a timeline event to CRM-3 /api/interactions/from-event {customer_id, type:'ticket', summary:'Ticket TKT-xxxx: <subject>', source_team:'CRM-2'} (side effect, try/ catch). 6 seed tickets using CUST-0001 to CUST-0008 and EMP-0005 to EMP-0007.
- **Depends on**: CRM3-B3 (MOCK: log the payload until the endpoint exists).
- **Needed by**: CRM2-A2, A3, C1 (ticket_id), D1, CRM5-A1, A3 (portal reads and creates tickets), CRM5-D1.
- **Done when**: all endpoints work; 6 seed tickets; resolved fills resolved_at; a created ticket produces a timeline event (or the mock log).

### [CRM2-A2] Ticket screens

- **Build**: Page /tickets (table, status and priority filters, "New ticket" form) and /tickets/:id (details, status dropdown that saves). The "assigned to" field is a dropdown from ERP-6: api('erp6', '/api/employees? role_title=Service Engineer').
- **Depends on**: CRM2-A1 (WAIT). ERP6-A1 (MOCK: hard-code EMP-0005 to EMP-0007 until merged).
- **Done when**: you can create a ticket, filter the list and change status from the browser.

### [CRM2-A3] SLA timer and comments

- **Build**: On create set due_at = created_at + 4 hours (high), 24 hours (medium), 72 hours (low). GET /api/ tickets/overdue (past due and not resolved). In the UI show a red "Overdue" badge or "x h left". Table ticket_comments (id, ticket_id, author, text, created_at) with POST and GET /api/tickets/:id/comments, shown on the ticket page; the author is the logged-in user's name.
- **Depends on**: CRM2-A1 (WAIT), CRM2-A2 (WAIT, for the ticket page).
- **Done when**: due_at is set automatically; overdue tickets show a red badge; comments can be added and listed.

### [CRM2-B1] Warranty table and lookup API

- **Build**: Table warranties (serial_number primary key, sku, product_name, customer_id, purchase_date, warranty_months default 12, created_at). GET /api/warranties, POST /api/warranties, GET /api/warranty/:serial returning the record plus expires_on and status (active/expired) calculated from today. Seed the 5 serials TV55-2611-0001 to 0005 as in the shared seed contract (0001 to 0003 active, 0004 and 0005 expired).
- **Depends on**: nothing.
- **Needed by**: CRM2-B2, B3, C3.
- **Done when**: lookup of a seeded serial returns correct expires_on and status; unknown serial returns 404.

### [CRM2-B2] Warranty check screen

- **Build**: Page /warranty: search box for serial number; result card (product, purchase date, expires on) with a green "In warranty" or red "Expired" badge; a "not found" message; below it, a list of all registered serials.
- **Depends on**: CRM2-B1 (WAIT).
- **Done when**: searching works for found, expired and unknown serials; the list shows below.

### [CRM2-B3] Sync warranties from dispatch

- **Build**: POST /api/warranty/sync calls ERP-4 GET /api/dispatches (rows with serial_number, sku, customer_id, ship_date; mock: 'dispatches' with 5 rows), inserts serials not yet present using ship_date as purchase_date (product_name looked up by sku is optional, use sku if unknown), and returns how many were added. "Sync from dispatch" button on the screen.
- **Depends on**: CRM2-B1 (WAIT). ERP4-C1 (MOCK: 5-row mock until the dispatch API is merged).
- **Done when**: pressing the button adds new rows; pressing it again adds none.

### [CRM2-C1] RMA table and API

- **Build**: Table rmas (id RMA-0001, ticket_id, serial_number, reason, status = requested/approved/rejected/ received/closed default requested, outcome = restock/repair/credit_note nullable, requested_at, decided_at). CRUD plus PATCH /api/rmas/:id/decision {status, outcome}. Approving requires an outcome (else 400). Seed 3 RMAs.
- **Depends on**: CRM2-A1 (MOCK: ticket_id is plain text, seed with TKT-0001 to TKT-0003).
- **Needed by**: CRM2-C2, C3, ERP4-D1 (receives RMAs).
- **Done when**: CRUD and decision endpoint work; approving without outcome returns 400.

### [CRM2-C2] RMA screens

- **Build**: Page /rmas (table and "Request RMA" form: ticket id, serial, reason). Page /rmas/:id (details, approve and reject buttons, outcome dropdown).
- **Depends on**: CRM2-C1 (WAIT).
- **Done when**: you can request, approve and reject an RMA from the browser.

### [CRM2-C3] Warranty rule and return handoff

- **Build**: An RMA can only be requested if the serial is in warranty (call this service's GET /api/warranty/:serial; expired returns 400 "Out of warranty"). When an RMA is approved with an outcome, POST to ERP-4 /api/ returns/from-rma with {rma_id, serial_number, reason, outcome} (ERP-4 owns returns; ERP-4 then calls ERP-1 and ERP-5). Also post a timeline event to CRM-3 (type ticket, source_team CRM-2). Both are side effects: log failures. Status timeline (requested, approved, received, closed) on the detail page.
- **Depends on**: CRM2-C1 (WAIT), CRM2-B1 (WAIT). ERP4-D1 (MOCK: log the payload until /api/returns/from-rma exists). CRM3-B3 (MOCK: log).
- **Needed by**: ERP4-D1.
- **Done when**: an expired serial is refused; approving creates an ERP-4 return (or logs the mock); the timeline highlights the current step.

### [CRM2-D1] Service centres and assignment API

- **Build**: Tables service_centres (id SC-0001, name, city, phone, capacity int, active boolean default true) and ticket_assignments (id, ticket_id, centre_id, assigned_at). CRUD for centres, POST /api/assignments {ticket_id, centre_id}, GET /api/assignments?ticket_id=. Assigning a ticket twice replaces the earlier assignment. 4 seed centres.
- **Depends on**: CRM2-A1 (MOCK: ticket_id is plain text, use TKT-0001 to TKT-0006 in seeds).
- **Done when**: centres CRUD works; assigning twice replaces; 4 seed centres.

### [CRM2-D2] Assign screen

- **Build**: Page /centres to manage centres. Page /assign lists unassigned tickets (from this service's GET /api/ tickets, minus assigned ones) with a centre dropdown and an Assign button.
- **Depends on**: CRM2-D1 (WAIT), CRM2-A1 (WAIT).
- **Done when**: assigning from the page removes the ticket from the unassigned list.

### [CRM2-D3] Support reports

- **Build**: GET /api/reports/tickets-summary: counts by status and priority, average resolution hours, overdue count, tickets per centre. Page /reports with tables plus simple HTML/CSS bar charts (no chart library).
- **Depends on**: CRM2-A1 (WAIT), CRM2-A3 (WAIT, for overdue), CRM2-D1 (WAIT).
- **Done when**: the numbers match the tickets table; the page loads without errors even with no data.

## Role Issues (Section 8b)

### [CRM2-R1] Team Lead: README and demo script

- **Build**: Keep docs/crm2/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/crm2/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a 10-minute check every Friday: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [CRM2-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/crm2/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [CRM2-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/crm2/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/crm2/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /crm2/... and looks consistent.

### [CRM2-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/crm2/tests.md. Write the API spec docs/crm2/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 4, 5, 6, 7, 10, 12.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.

