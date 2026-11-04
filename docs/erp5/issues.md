# Issues for Team ERP5

**Context Line**:
> Team: ERP-5 Finance, access and the app shell. Database: erp5_db. Backend services/erp5 on port 5205. Frontend module frontend/src/modules/erp5 (id erp5, title Finance and Users, roles admin and finance). Our job: GST invoices, payments, credit notes, a simple ledger, finance reports, user login and roles, and the one shared app (shell, shared helpers, start-everything script, end-to-end test) that connects all 11 teams.

## Build Issues

### [ERP5-A1] Invoices API

- **Build**: Tables invoices (id INV-0001, so_id, customer_id, customer_name, customer_gstin nullable, sales_rep_id, invoice_date, due_date = invoice_date + 15 days, subtotal, cgst, sgst, total, status = unpaid/ partially_paid/paid default unpaid, created_at) and invoice_items (id, invoice_id, sku, description, quantity, unit_price, tax_rate default 18). POST /api/invoices (ERP-4 calls this) calculates CGST 9% and SGST 9% on the subtotal. If customer_gstin is missing in the body and the customer is corporate or dealer, fetch it from CRM-3 GET /api/customers/:id ( mock: 'customer'). A repeated so_id returns the existing invoice (200), so ERP-4 can safely retry. After saving, post the ledger pair by calling the same internal function as POST /api/ledger/auto {type:'invoice', reference: invoice id, amount: total} (ERP5-D1); do it in the same database transaction. GET list (?customer_id= ?status=) and GET /:id with items. Seed INV-0001 to INV-0005 for SO-0001 to SO-0005 (shared seed contract), GSTIN present for corporate and dealer customers.
- **Depends on**: ERP5-D1 (MOCK: until the ledger function exists, skip the ledger line and add it once D1 is merged). CRM3-A1 (MOCK).
- **Needed by**: ERP4-C3 (creates invoices), CRM5-A1 (reads invoices), ERP5-A2, A3, B1.
- **Done when**: an invoice with 2 items has the correct subtotal, CGST, SGST and total; the same so_id twice returns one invoice; creating an invoice adds a balanced pair of ledger rows.

### [ERP5-A2] Invoice screens

- **Build**: Page /invoices (table with status badges). Page /invoices/:id looks like a bill: company header, customer with GSTIN, items table, tax breakdown, grand total in ₹ and a Print button ( @media print hides the shell sidebar).
- **Depends on**: ERP5-A1 (WAIT).
- **Done when**: the invoice page prints cleanly on one page.

### [ERP5-A3] Amount in words, filters and manual invoice

- **Build**: Total in words (for example "Rupees Twelve Thousand Five Hundred Only") with a small function you write yourself. Date range and status filters on the list. "Create manual invoice" form for non-order items (so_id empty). GET /api/invoices/summary returns total billed and total outstanding.
- **Depends on**: ERP5-A1, ERP5-A2 (WAIT).
- **Done when**: words are correct for 5 test amounts; filters and summary work.

### [ERP5-A4] Credit notes NEW

- **Build**: Table credit_notes (id CN-0001, so_id, invoice_id nullable, serial_number, amount, created_at). POST /api/creditnotes {so_id, serial_number, amount} (ERP-4 calls this when a return is credited): finds the invoice by so_id, stores the note, reduces that invoice's outstanding balance (a fully credited unpaid invoice becomes paid), and posts the ledger pair via type:'credit_note' (debit sales, credit receivables). GET /api/creditnotes. Page /credit-notes with a table, and a link from the invoice page. 2 seed credit notes.
- **Depends on**: ERP5-A1 (WAIT). ERP5-D1 (MOCK: skip the ledger line until D1 is merged).
- **Needed by**: ERP4-D3.
- **Done when**: posting a credit note lowers the invoice balance and adds balanced ledger rows; a second POST for the same serial and order returns 409.

### [ERP5-B1] Payments API

- **Build**: Table payments (id PAY-0001, invoice_id, amount, method = upi/card/bank_transfer/cash, reference, paid_on). POST /api/payments stores the payment and updates the invoice: paid when payments add up to the total (after credit notes), otherwise partially_paid. Overpaying returns 400. After saving, post the ledger pair ( type:'payment', debit cash, credit receivables) in the same transaction. GET /api/payments?invoice_id=.
- **Depends on**: ERP5-A1 (WAIT). ERP5-D1 (MOCK: skip the ledger line until D1 is merged).
- **Done when**: two part payments turn an invoice from unpaid to partially_paid to paid; each payment adds balanced ledger rows.

### [ERP5-B2] Payment screens

- **Build**: Page /payments: "Record payment" form (choose an unpaid invoice, amount prefilled with the balance, method, reference) and a payments table. On the invoice detail page show payment history and the balance due.
- **Depends on**: ERP5-B1 (WAIT), ERP5-A2 (WAIT).
- **Done when**: recording a payment updates the invoice status shown in the browser.

### [ERP5-B3] Receivables ageing and paid-invoice feed

- **Build**: GET /api/receivables/ageing groups outstanding amounts by customer into buckets: not yet due, 1 to 15 days overdue, 16 to 30, 31 or more. Page with the table. GET /api/invoices/paid returns {invoice_id, sales_rep_id, total, paid_on} for paid invoices (ERP-6 uses this for commission).
- **Depends on**: ERP5-B1, ERP5-B2 (WAIT).
- **Needed by**: ERP6-D1.
- **Done when**: ageing buckets are correct for the seed data; the paid feed lists only paid invoices.

### [ERP5-C1] Monorepo foundation and shared helpers (everyone waits for this; merge in the first 2 days)

- **Build**: Create, in this order: 1. Root: package.json (npm workspaces services/* and frontend; scripts dev, db:setup, reset, e2e; concurrently as dev dependency), .env.example (all 11 <TEAM>_URL, DATABASE_URL template per team, JWT_SECRET, AUTH_REQUIRED=false, USE_MOCKS=true), .gitignore, a first README. 2. services/_shared/auth.js ( requireAuth, requireRole exactly as in Section 3.3, using jsonwebtoken), callService.js (exactly the rules in Section 3.3), db.js (exports makePool(dbName)). 3. 11 service skeletons services/<team>/ each with package.json, server.js (loads dotenv, enables cors and JSON, GET /api/health, then auto-mounts every file in routes/ at /api, then a JSON 404 and error handler, listens on the team's port), empty db/schema.sql, db/seed.sql, routes/, mocks/. 4. Frontend: Vite + React + react-router-dom in frontend/ on port 3000; vite.config.js proxying /svc/<team> to http://localhost:<port> (strip the prefix); src/api.js (Section 3.2); src/App.jsx that loads modules with import.meta.glob('./modules/*/index.jsx', { eager: true }), builds a sidebar grouped by module title and routes /<id>/<path>; src/modules/<team>/ index.jsx for all 11 teams with routes: [] and a "Coming soon" placeholder route so every module already shows in the menu.
- **Depends on**: nothing. This issue is the first thing to merge. Tell the class on the group chat when it is merged.
- **Needed by**: every other issue in the project.
- **Done when**: npm install && npm run dev starts 11 backends and the frontend; GET /api/health works on all 11 ports; the browser at localhost:3000 shows 11 menu groups; a test route added to a module file appears in the menu without touching App.jsx.

### [ERP5-C2] Auth API and demo users

- **Build**: (extra packages: bcryptjs, jsonwebtoken) Table users (id USR-0001, name, email unique, password_hash, role = admin/sales/support/warehouse/finance/hr, employee_id nullable (an EMP id), active boolean default true). POST /api/auth/login returns a JWT (8 hours; payload id, name, role, employee_id), GET /api/auth/me, POST /api/users (admin only) with a hashed password, GET /api/users (admin only), GET /api/auth/ verify?token= (returns the payload or 401, for any outside caller). Seed the 6 demo users from Section 4 (password demo123, hashed); sales@demo.com links to EMP-0001.
- **Depends on**: ERP5-C1 (WAIT).
- **Needed by**: ERP5-C3, and every team once login is switched on.
- **Done when**: login with a seeded user returns a token that _shared/auth.js accepts on another team's API; a wrong password returns 401; no password is ever stored in plain text.

### [ERP5-C3] Login screen, role-based menu and route guards (the thing that makes it one app)

- **Build**: In the shell: page /login; an auth context that keeps the token in localStorage; a protected layout that redirects to /login when there is no token; sidebar that shows only modules whose roles include the user's role and, inside a module, only routes whose own roles (if any) include it; a header with the user's name, role and a Logout button; api() sends the token and redirects to /login on any 401; a "Not allowed" page for URLs the role may not open. In the module erp5: page /users (admin only) with a users table and an "Add user" form. Backend: use requireRole('admin') on /api/users. Last step of this issue: change AUTH_REQUIRED to true in .env.example, announce it to the class, and make sure every team's service picks it up (they already use requireAuth).
- **Depends on**: ERP5-C1 (WAIT), ERP5-C2 (WAIT, the login endpoint).
- **Needed by**: everyone (login switches on for the whole app).
- **Done when**: with the 6 demo users each sees only their own menu groups; a logged-out browser cannot open any page or any /api call (401); a non-admin gets 403 on /api/users; logout works.

### [ERP5-C4] Start-everything script, database setup and README NEW

- **Build**: docker-compose.yml with one Postgres 16 container and an init script that creates the 11 databases ( crm1_db ... erp6_db). scripts/db-setup.js: for each team runs services/<team>/db/schema.sql then seed.sql, in this order: ERP-6, CRM-3, ERP-1, then the rest (it drops and recreates each database first, so it can be run again and again; if a team's files are empty it prints "skipped" and carries on). Scripts: npm run db:setup, npm run reset (db:setup plus fresh seed), npm run dev (11 backends plus frontend with prefixed coloured logs). The README: install Node and Docker, the 4 commands to run the whole app, the demo logins, the port table, how to switch USE_MOCKS and AUTH_REQUIRED, and a troubleshooting section. Also a docs/ link to this issues pack.
- **Depends on**: ERP5-C1 (WAIT). All teams' schema.sql/ seed.sql (MOCK: the script handles missing or empty files; re-test every Friday as teams merge).
- **Done when**: on a clean laptop, docker compose up -d && npm install && npm run db:setup && npm run dev brings up the full app with all merged seed data and login.

### [ERP5-C5] End-to-end test script NEW

- **Build**: scripts/e2e.js (Node, no framework): sets USE_MOCKS=false, logs in as admin@demo.com, runs the 9- step demo from the workflow doc step by step and prints PASS or FAIL with the reason for each step, then exits non-zero if any step failed. Suggested chain (rename to match your workflow doc): 1 enquiry via CRM-4 creates a CRM-1 lead; 2 opportunity plus a quote with 3 items, discount 10%, approve, send, accept, which creates an ERP-4 order and a CRM-3 timeline entry; 3 reserve stock, a shortage creates an ERP-3 work order and an ERP-3 purchase request in ERP-2; 4 approve, convert to PO, send, goods receipt which raises ERP-1 stock and a purchase ledger entry; 5 issue materials, QC pass, post finished goods (ERP-1 stock and serials); 6 dispatch the order (ERP-1 stock goes down, serials become sold) and ERP-5 creates the invoice with GSTIN and ledger entries; 7 record the payment (invoice paid, ledger balanced); 8 ERP-6 commission sync creates a commission and payroll picks it up; 9 warranty sync, an RMA is approved with outcome credit_note, ERP-4 return is restocked and an ERP-5 credit note appears. After each step it checks the receiving team's data, not just the response. Add a docs/e2e-checklist.md with the same steps for a manual run in the browser. Run it every week from week 4 and post the result in the group chat.
- **Depends on**: ERP5-C4 (WAIT). All teams (MOCK: start with the steps whose teams are merged and mark the rest SKIPPED, then fill in as teams merge; in integration week no step may be SKIPPED).
- **Done when**: npm run e2e runs on a freshly reset database with mocks off and every step passes; one deliberately stopped service makes its step fail loudly instead of passing on mock data.

### [ERP5-D1] Ledger API

- **Build**: Table ledger_entries (id, entry_date, account = sales/receivables/cash/purchases/salary_expense, debit numeric default 0, credit numeric default 0, reference, description). POST /api/ledger adds one entry. POST /api/ledger/auto {type, reference, amount} adds the balanced pair for: invoice (debit receivables, credit sales); payment (debit cash, credit receivables); credit_note (debit sales, credit receivables); purchase (debit purchases, credit cash); salary (debit salary_expense, credit cash). Export the pairing as a plain function the invoice, payment and credit-note code in this same service can call. GET /api/ledger with ? account= and date range. Requests with the same type and reference return the existing pair (safe to retry).
- **Depends on**: nothing.
- **Needed by**: ERP5-A1, A4, B1 (own service), ERP2-D1 (purchase), ERP6-C3 (salary), ERP5-D2, D3.
- **Done when**: auto entries always have equal debit and credit totals for all 5 types; a repeated call changes nothing.

### [ERP5-D2] Ledger screen

- **Build**: Page /ledger: table, account and date filters, a manual entry form, and totals of debit and credit at the bottom (they must match).
- **Depends on**: ERP5-D1 (WAIT).
- **Done when**: filters work and the totals update.

### [ERP5-D3] Finance reports

- **Build**: GET /api/reports/summary: total sales (credit minus debit on sales), total received (debit on cash from payments), outstanding (debit minus credit on receivables) and cash balance (debit minus credit on cash). GET /api/reports/monthly-sales groups sales by month. Page /reports with 4 KPI cards, CSS bars per month and a CSV download button.
- **Depends on**: ERP5-D1, ERP5-D2 (WAIT). ERP5-A1, B1 (WAIT for real numbers; the seed ledger is enough to start).
- **Done when**: the summary numbers match the ledger and the invoices table; CSV downloads.

## Role Issues (Section 8b)

### [ERP5-R1] Team Lead: README and demo script

- **Build**: Keep docs/erp5/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/erp5/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 15 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [ERP5-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/erp5/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [ERP5-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/erp5/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/erp5/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /erp5/... and looks consistent.

### [ERP5-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/erp5/tests.md. Write the API spec docs/erp5/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 10, 15, 19, 24, 26, 27, 28, 29.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
