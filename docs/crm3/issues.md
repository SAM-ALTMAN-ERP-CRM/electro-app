# Issues for Team CRM3

**Context Line**:
> Team: CRM-3 Customer 360. Database: crm3_db. Backend services/crm3 on port 5103. Frontend module frontend/src/modules/crm3 (id crm3, title Customers, roles admin, sales and support). Our job: keep the single customer master (used by every other team) with contacts, history, segments and clean data.

## Build Issues

### [CRM3-A1] Customers and contacts API

- **Build**: Tables customers (id CUST-0001, name, type = retail/corporate/dealer, email, phone, gstin nullable, billing_address, shipping_address, city, created_at) and contacts (id, customer_id, name, phone, email, designation). CRUD for customers (GET list supports ?q= and ?type=), GET /api/customers/:id (returns gstin; used by ERP-4, ERP-5, CRM-5), POST and GET /api/customers/:id/contacts. Seed exactly the 10 customers in the shared seed contract (CUST-0001 to CUST-0010, including the two duplicate rows), each with 1 to 2 contacts.
- **Depends on**: nothing. This is the most-used API in the project: merge it early.
- **Needed by**: CRM3-A2 and the rest of CRM3-A2, CRM3-B1, ERP4-A3, ERP5-A1, CRM5-A1, CRM5-D1.
- **Done when**: all endpoints work; the 10 seed customers match the shared seed contract.

### [CRM3-A2] Customer screens

- **Build**: Page /customers (table, search box, type filter, add/edit form including both addresses). Page / customers/:id (details, contacts table, add-contact form).
- **Depends on**: CRM3-A1 (WAIT).
- **Done when**: you can add, edit and search customers and add contacts from the browser.

### [CRM3-A3] Validation rules

- **Build**: Backend validation plus inline messages in the form: phone must be 10 digits; email format; email unique (409 on duplicate); GSTIN required and 15 characters for corporate and dealer types; a "Same as billing address" checkbox copies the address. Enforce email uniqueness in the API code (not as a database UNIQUE constraint), because the shared seed deliberately contains two duplicate rows (CUST-0009 and CUST-0010) for the merge feature.
- **Depends on**: CRM3-A1 (WAIT), CRM3-A2 (WAIT, for the form).
- **Done when**: each bad input is rejected with a clear message and nothing is saved.

### [CRM3-B1] Interactions API

- **Build**: Table interactions (id, customer_id, type = call/email/meeting/ticket/order, summary, source_team, created_by, created_at). POST /api/interactions, GET /api/customers/:id/interactions (newest first, supports ? type= and ?from=&to=). 10 seed interactions over CUST-0001 to CUST-0003.
- **Depends on**: nothing.
- **Done when**: adding and listing work; filters work; 10 seed interactions.

### [CRM3-B2] Timeline screen

- **Build**: Page /customers/:id/timeline: vertical list with icon per type, date, summary, source team. "Add note" form at the top. Link to this page from the customer detail page.
- **Depends on**: CRM3-B1 (WAIT). CRM3-A2 (MOCK: /crm3/customers/:id/timeline opens directly; customer detail page link connects once A2 is merged).
- **Done when**: the timeline is sorted newest first and a new note appears at once.

### [CRM3-B3] Events from other teams

- **Build**: POST /api/interactions/from-event for other teams {customer_id, type, summary, source_team}; returns 201 and ignores exact duplicates sent within the same minute. Type filter dropdown and a date range on the timeline page. This is the endpoint four teams call (CRM1-C3, CRM2-A1, CRM2-C3, CRM4-A3, ERP4-C3), so keep the body exactly as written and merge early.
- **Depends on**: CRM3-B1 (WAIT), CRM3-B2 (WAIT).
- **Needed by**: CRM1-C3, CRM2-A1, CRM2-C3, CRM4-A3, ERP4-C3.
- **Done when**: a Postman call from "another team" shows up on the timeline; duplicates are ignored.

### [CRM3-C1] Segments API

- **Build**: Table segments (id SEG-0001, name, customer_type nullable, city nullable, created_at). CRUD, plus GET /api/segments/:id/customers returning customers matching type and city (blank means any; calls this service's own customers table). 4 seed segments, including "Corporate in Mumbai" (matches CUST-0002 only).
- **Depends on**: CRM3-A1 (WAIT, needs the customers table).
- **Needed by**: CRM3-C2, C3, CRM4-A2, A3, B3.
- **Done when**: "Corporate in Mumbai" returns only matching customers.

### [CRM3-C2] Segment screens

- **Build**: Page /segments (list, create form with name, type dropdown, city dropdown). /segments/:id shows the matching customers table and a count.
- **Depends on**: CRM3-C1 (WAIT).
- **Done when**: creating a segment and opening it shows the right customers and count.

### [CRM3-C3] Tags and CSV export

- **Build**: Table customer_tags (customer_id, tag) with POST and DELETE /api/customers/:id/tags; tags as small chips on the customer detail page. GET /api/segments/:id/export.csv and a "Download CSV" button on the segment page (columns name, email, phone, city).
- **Depends on**: CRM3-A2 (WAIT, detail page), CRM3-C1 (WAIT), CRM3-C2 (WAIT).
- **Done when**: tags can be added and removed; the CSV opens in Excel.

### [CRM3-D1] Duplicate detection and merge API

- **Build**: GET /api/customers/duplicates returns groups sharing the same email or the same phone (the shared seed has 2 pairs: 0001/0009 and 0002/0010). POST /api/customers/merge {keep_id, remove_id} moves contacts, interactions and tags of remove_id to keep_id, then deletes remove_id, all in one database transaction. Skip tag rows that would duplicate.
- **Depends on**: CRM3-A1, CRM3-B1 (WAIT). CRM3-C3 (MOCK: add the tag move after C3 is merged).
- **Done when**: merging one pair leaves one customer with all contacts.

### [CRM3-D2] Duplicates screen

- **Build**: Page /duplicates: each group side by side with a "Keep this one" button and a confirmation popup before merging. Refresh after a merge.
- **Depends on**: CRM3-D1 (WAIT).
- **Done when**: merging from the page works and the group disappears.

### [CRM3-D3] CSV import

- **Build**: Page /import with a file input; read the CSV in the browser (split by lines and commas, no library), show a preview table, then a button posting a JSON array to POST /api/customers/import. The backend inserts valid rows (same validation as CRM3-A3), skips invalid ones and returns {inserted, skipped, errors[]}. Show the result.
- **Depends on**: CRM3-A3 (WAIT, reuses the validation).
- **Done when**: a 10-row CSV with 2 bad rows imports 8 and lists the 2 errors.

## Role Issues (Section 8b)

### [CRM3-R1] Team Lead: README and demo script

- **Build**: Keep docs/crm3/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/crm3/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [CRM3-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/crm3/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [CRM3-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/crm3/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/crm3/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /crm3/... and looks consistent.

### [CRM3-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/crm3/tests.md. Write the API spec docs/crm3/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 4, 8, 10, 12, 19.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
