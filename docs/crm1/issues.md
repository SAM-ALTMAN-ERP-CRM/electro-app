# Issues for Team CRM1

**Context Line**:
> Team: CRM-1 Sales pipeline. Database: crm1_db. Backend services/crm1 on port 5101. Frontend module frontend/src/modules/crm1 (id crm1, title Sales, roles admin and sales). Our job: track sales leads, opportunities and quotes for dealers and direct customers.

## Build Issues

### [CRM1-A1] Leads table and API

- **Build**: Table leads (id LEAD-0001, name, phone, email, source = dealer/web/walk-in, product_interest, status = new/contacted/qualified/lost default new, score int default 0, sales_rep_id text (an EMP id), created_at). Endpoints in routes/leads.js: GET /api/leads (optional ?status=), GET /api/leads/:id, POST, PUT /:id, DELETE /:id. Validate: name required, source and status must be from the allowed lists. Seed 5 leads with a mix of sources and sales_rep_id from EMP-0001 to EMP-0004.
- **Depends on**: nothing from other teams.
- **Needed by**: CRM1-A2, A3, B1 (lead_id), CRM4-B4 (creates leads here), CRM5-B1 and CRM5-D1 (read leads).
- **Done when**: table and 5 seed leads exist; all five endpoints work in Postman; no name returns 400.

### [CRM1-A2] Lead screens

- **Build**: Pages /leads (table of name, source, status, score; status filter dropdown; "Add lead" form; edit form; delete button) and register them in modules/crm1/index.jsx. The "sales rep" field is a dropdown filled from ERP-6: api('erp6', '/api/employees?role_title=Sales Rep'). Status is a coloured badge.
- **Depends on**: CRM1-A1 (WAIT, same person). ERP6-A1 (MOCK: until merged, use a hard-coded list of the 4 reps EMP-0001 to EMP-0004 in the page, then switch to the API call).
- **Done when**: you can add, edit, delete and filter leads from the one app at /crm1/leads; the list refreshes after each change; the rep dropdown shows real ERP-6 employees once ERP6-A1 is merged.

### [CRM1-A3] Lead scoring and Hot leads

- **Build**: On create and update calculate score: source dealer +30, web +20, walk-in +10; email present +10; phone present +10; product_interest filled +10 (maximum 100). Recalculate on every PUT. Add GET /api/leads/ hot (score 60 or more); define this route before /:id. Show a "Hot" badge in the table.
- **Depends on**: CRM1-A1 (WAIT), CRM1-A2 (WAIT, for the badge).
- **Done when**: new leads get a score automatically; editing a lead updates it; /api/leads/hot returns only 60+ leads; the badge shows in the UI.

### [CRM1-B1] Opportunities table and API

- **Build**: Table opportunities (id OPP-0001, lead_id, customer_id nullable (a CUST id), title, expected_value numeric, stage = prospect/proposal/negotiation/won/lost default prospect, expected_close_date, sales_rep_id, created_at). CRUD plus PATCH /api/opportunities/:id/stage {stage}. lead_id must exist in leads (400 if not). 6 seed rows spread over the stages, lead_ids from the seed leads, customer_ids from CUST-0001 to CUST-0008.
- **Depends on**: CRM1-A1 (WAIT, needs lead IDs).
- **Needed by**: CRM1-B2, B3, C1 (opportunity_id), CRM5-B1, C1, C3 (read opportunities).
- **Done when**: CRUD and the stage endpoint work; seed rows cover all stages; invalid stage returns 400.

### [CRM1-B2] Pipeline board

- **Build**: Page /pipeline: 5 columns (one per stage). Each card shows title and ₹ value, with a "Move to next stage" button (no drag and drop). Total ₹ value at the top of each column.
- **Depends on**: CRM1-B1 (WAIT).
- **Done when**: cards appear in the right columns; clicking the button moves a card and updates the column totals.

### [CRM1-B3] Stage rules and summary

- **Build**: A stage can only move one step forward (or to lost). Moving to won is allowed only if an accepted quote exists: query GET /api/quotes?opportunity_id=...&status=accepted from this same service (use callService('crm1', ...) with mock: 'quotes-accepted' until C1 is merged). Add GET /api/opportunities/ summary (count and total value per stage) and show it above the board.
- **Depends on**: CRM1-B1 (WAIT). CRM1-C1 (MOCK: use the mock file until the quotes API is merged).
- **Done when**: skipping stages returns 400 with a clear message; won without an accepted quote is blocked; summary numbers match the board.

### [CRM1-C1] Quotes tables and API

- **Build**: Tables quotes (id QUO-0001, opportunity_id, customer_id, dealer_id nullable (a DLR id), sales_rep_id, status = draft/sent/accepted/rejected default draft, discount_percent default 0, needs_approval boolean default false, approved boolean default false, rejection_reason text nullable, created_at) and quote_items (id, quote_id, sku, product_name, quantity, unit_price). POST /api/quotes accepts items in the same request (one transaction). GET /api/quotes/:id returns items plus subtotal, discount amount, GST 18% and total. GET /api/ quotes supports ?opportunity_id=, ?status=, ?dealer_id=. Seed 4 quotes using SKU-0001 to SKU-0015 and customers CUST-0001 to CUST-0008.
- **Depends on**: CRM1-B1 (MOCK: store opportunity_id as plain text and use OPP-0001 to OPP-0006 in seeds, no foreign key needed).
- **Needed by**: CRM1-B3, C2, C3, D2, D3, CRM5-B1, B3.
- **Done when**: you can create a quote with 3 items and GET shows the correct totals; the three filters work.

### [CRM1-C2] Quote builder screen

- **Build**: Page /quotes/new: choose opportunity ID, add item rows (SKU dropdown, quantity, price filled automatically), discount % box, live totals (subtotal, discount, GST, total). Product list from ERP-1: api('erp1', '/api/products'). Page /quotes lists all quotes. Save as draft.
- **Depends on**: CRM1-C1 (WAIT). ERP1-A1 (MOCK: until merged, use a local array of 3 products from the shared seed list).
- **Done when**: totals update live as you type; saving creates a quote that appears in the list.

### [CRM1-C3] Discount rule, quote status and order handoff

- **Build**: If discount_percent is above 5, set needs_approval = true and block moving to sent until approved = true (set by CRM1-D3). Add PATCH /api/quotes/:id/status (draft to sent, sent to accepted or rejected). When a quote becomes accepted: (1) POST to ERP-4 /api/sales-orders with {quote_id, customer_id, sales_rep_id, items:[{sku, product_name, quantity, unit_price}]}; (2) post a timeline event to CRM-3 /api/interactions/ from-event {customer_id, type:'order', summary:'Quote QUO-xxxx accepted', source_team:'CRM-1'}. Both are side effects: wrap in try/catch and log failures; a 409 from ERP-4 (order already exists) is fine.
- **Depends on**: CRM1-C1 (WAIT). CRM1-D3 (MOCK: until approvals exist, set approved=true by hand in the database to test). ERP4-A1 (MOCK: log the payload). CRM3-B3 (MOCK: log the payload).
- **Needed by**: CRM1-B3 (accepted quotes), ERP4-A1 (receives the order).
- **Done when**: a 10% discount quote cannot be sent without approval; accepting a quote creates an ERP-4 order (or logs the mock) and a timeline entry.

### [CRM1-D1] Dealers table and API

- **Build**: Table dealers (id DLR-0001, name, contact_person, phone, email, city, tier = gold/silver/bronze, credit_limit numeric, status = active/inactive default active). CRUD plus GET /api/dealers?q=&city=. Seed DLR-0001 to DLR-0005 as in the shared seed contract (tiers spread across gold, silver, bronze).
- **Depends on**: nothing.
- **Needed by**: CRM1-D2, D3, C1 (dealer_id).
- **Done when**: CRUD works; search by name or city works; 5 seed dealers across tiers.

### [CRM1-D2] Dealer screens

- **Build**: Page /dealers (table, search box, city filter, add/edit form). Page /dealers/:id shows dealer details and that dealer's quotes via GET /api/quotes?dealer_id=....
- **Depends on**: CRM1-D1 (WAIT). CRM1-C1 (MOCK: show an empty "No quotes yet" state until the quotes API exists).
- **Done when**: you can manage dealers from the browser and see each dealer's quotes on its page.

### [CRM1-D3] Quote approval screen

- **Build**: GET /api/approvals (quotes with needs_approval = true, approved = false and status draft), PATCH /api/ quotes/:id/approve (sets approved = true) and /reject {reason} (stores rejection_reason). Both only for role admin ( requireRole('admin')). Page /approvals (route-level roles: ['admin']): table with approve and reject buttons. Show each dealer's tier next to the quote (gold up to 15% discount, silver 10%, bronze 5%) as a hint.
- **Depends on**: CRM1-C1 (WAIT), CRM1-D1 (WAIT).
- **Needed by**: CRM1-C3 (the send step checks approved).
- **Done when**: approving a quote lets CRM1-C3's flow send it; rejecting stores the reason and shows it on the quote; a non-admin gets 403.

## Role Issues (Section 8b)

### [CRM1-R1] Team Lead: README and demo script

- **Build**: Keep docs/crm1/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/crm1/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a 10-minute check every Friday: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [CRM1-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/crm1/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [CRM1-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/crm1/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/crm1/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /crm1/... and looks consistent.

### [CRM1-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/crm1/tests.md. Write the API spec docs/crm1/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 1, 2, 3, 4, 9, 11.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.

