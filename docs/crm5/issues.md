# Issues for Team CRM5

**Context Line**:
> Team: CRM-5 Portal and analytics. Database: crm5_db. Backend services/crm5 on port 5105. Frontend module frontend/src/modules/crm5 (id crm5, title Portal and Dashboards, roles all). Our job: a customer self-service portal and management dashboards. We mostly read data from other teams' APIs (use mocks only until they are merged).

## Build Issues

### [CRM5-A1] Portal overview API

- **Build**: Table portal_visits (id, customer_id, visited_at). GET /api/portal/:customer_id/overview returns the customer (CRM-3 /api/customers/:id), their orders (ERP-4 /api/sales-orders?customer_id=), tickets (CRM-2 /api/tickets?customer_id=) and invoices (ERP-5 /api/invoices?customer_id=), each with its own mock file. Each part is fetched independently: if one team is down, return that part as [] with "unavailable": true, but with USE_MOCKS=false the response must say which team failed. Every call logs a row in portal_visits.
- **Depends on**: CRM3-A1, ERP4-A1, CRM2-A1, ERP5-A1 (all MOCK: one mock file each).
- **Done when**: the overview returns all four parts (mock data is fine at first); visits are logged; with real services running, CUST-0001 shows SO-0001, its invoice and its tickets.

### [CRM5-A2] Portal screens

- **Build**: Page /portal with a box to enter a customer ID (like CUST-0001). Page /portal/home shows the customer name and three cards/tables: My orders, My tickets, My invoices, with status badges.
- **Depends on**: CRM5-A1 (WAIT).
- **Done when**: entering a customer ID shows that customer's data; an unknown ID shows a friendly message.

### [CRM5-A3] Raise a ticket and track an order

- **Build**: A "Raise a ticket" form on the portal (subject, description, priority) posting through this service to CRM-2 POST /api/tickets with customer_id and customer_name (from the overview), showing the new ticket ID. Page /portal/orders/:id shows the order status (read from ERP-4 GET /api/sales-orders/:id) as steps: created, confirmed, dispatched, delivered, with the current step highlighted.
- **Depends on**: CRM5-A1, CRM5-A2 (WAIT). CRM2-A1 (MOCK: log it and return TKT-MOCK). ERP4-A1 (MOCK).
- **Done when**: submitting the form shows a ticket ID (a real one once CRM2-A1 is merged); the order page highlights the right step.

### [CRM5-B1] Sales summary API and snapshots

- **Build**: GET /api/dashboard/sales-summary: total leads, opportunities per stage, won value, quotes sent/ accepted, using CRM-1 /api/leads, /api/opportunities, /api/quotes (one mock file each). Table dashboard_snapshots (id, taken_at, metrics JSON text). POST /api/dashboard/snapshot saves the current numbers; GET /api/dashboard/snapshots lists them.
- **Depends on**: CRM1-A1, CRM1-B1, CRM1-C1 (MOCK each).
- **Done when**: summary numbers are correct on mock data and on real CRM-1 data; snapshots can be saved and listed.

### [CRM5-B2] Dashboard screen

- **Build**: Page /dashboard: 4 KPI cards (leads, open opportunities, won value in ₹, quotes accepted) and an HTML/CSS bar chart of opportunities per stage (no chart library).
- **Depends on**: CRM5-B1 (WAIT).
- **Done when**: the page shows live numbers and the bars scale with the values.

### [CRM5-B3] Date filter and history

- **Build**: Date filter (this week, this month, all time) sent as ?range= and applied to created_at. "Save snapshot" button and a history table of snapshots at the bottom.
- **Depends on**: CRM5-B1, CRM5-B2 (WAIT).
- **Done when**: changing the filter changes the numbers; saved snapshots appear in the history.

### [CRM5-C1] Targets and weighted pipeline API

- **Build**: Table forecasts (id, month text YYYY-MM, target_amount numeric, notes). CRUD. GET /api/forecast/ weighted: sum of expected_value times stage probability (prospect 10%, proposal 30%, negotiation 60%) from CRM-1 /api/opportunities ( mock: 'opportunities').
- **Depends on**: CRM1-B1 (MOCK).
- **Done when**: CRUD works; the weighted value matches a hand calculation.

### [CRM5-C2] Forecast screen

- **Build**: Page /forecast: table of monthly targets, add/edit form, a card with the weighted pipeline value, and a progress bar comparing it with the current month's target.
- **Depends on**: CRM5-C1 (WAIT).
- **Done when**: you can set a target and the progress bar shows the percentage.

### [CRM5-C3] Trend and next-month estimate

- **Build**: GET /api/forecast/trend: won value per month for the last 6 months (CRM-1 opportunities with stage won) and next-month estimate = average of the last 3 months. 6 CSS bars plus the estimate, with the formula in small text on the page.
- **Depends on**: CRM5-C1 (WAIT), CRM5-C2 (WAIT). CRM1-B1 (MOCK).
- **Done when**: bars show 6 months; the estimate equals the average of the last 3 bars.

### [CRM5-D1] Reports API with roles

- **Build**: Table reports (id, name, source, allowed_roles text). Seed 3 reports: leads by source (CRM-1, allowed "sales,admin"), tickets by status (CRM-2, "support,admin"), customers by type (CRM-3, "sales,support,admin"). GET /api/reports returns only reports allowed for the logged-in user's role ( req.user.role; admin sees all). Admin may pass ?role=sales|support to preview another role. GET /api/reports/:id/run returns rows from the source team (one mock file each). Manager means admin.
- **Depends on**: CRM1-A1, CRM2-A1, CRM3-A1 (MOCK each).
- **Done when**: logging in as sales shows only leads and customers; support shows tickets and customers; admin sees all three; running each returns rows.

### [CRM5-D2] Reports screen

- **Build**: Page /reports: the list of reports the logged-in role may see, and a results table when you click Run. A role dropdown appears only for admin (to preview other roles). The role comes from the login, not from a dropdown for everyone else.
- **Depends on**: CRM5-D1 (WAIT).
- **Done when**: logging in as different demo users changes the report list; running a report shows its table.

### [CRM5-D3] CSV and print

- **Build**: "Download CSV" button for the report shown (build the CSV in the browser) and a "Print" button with a print-friendly style (hide the shell sidebar and the buttons when printing, using @media print).
- **Depends on**: CRM5-D2 (WAIT).
- **Done when**: the CSV opens in Excel with the right columns; the print preview shows only the report.

## Role Issues (Section 8b)

### [CRM5-R1] Team Lead: README and demo script

- **Build**: Keep docs/crm5/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/crm5/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [CRM5-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/crm5/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [CRM5-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/crm5/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/crm5/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /crm5/... and looks consistent.

### [CRM5-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/crm5/tests.md. Write the API spec docs/crm5/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 10, 11, 12.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
