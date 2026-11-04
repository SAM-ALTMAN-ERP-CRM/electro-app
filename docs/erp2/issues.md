# Issues for Team ERP2

**Context Line**:
> Team: ERP-2 Procurement and suppliers. Database: erp2_db. Backend services/erp2 on port 5202. Frontend module frontend/src/modules/erp2 (id erp2, title Purchasing, roles admin, warehouse and finance). Our job: buy components and products from suppliers: supplier list, purchase requests, purchase orders and goods receipt.

## Build Issues

### [ERP2-A1] Suppliers table and API

- **Build**: Table suppliers (id SUP-0001, name, contact_person, phone, email, city, gstin, payment_terms = advance/net15/net30, rating numeric default 0, active boolean default true). CRUD plus GET /api/suppliers? q=&city=. 6 seed suppliers SUP-0001 to SUP-0006.
- **Depends on**: nothing.
- **Needed by**: ERP2-A2, A3, B3 (supplier_id), C1 (supplier_id).
- **Done when**: CRUD and filters work; 6 seed suppliers.

### [ERP2-A2] Supplier screens

- **Build**: Page /suppliers (table, search, add/edit form). Page /suppliers/:id with all details.
- **Depends on**: ERP2-A1 (WAIT).
- **Done when**: you can add, edit and search suppliers from the browser.

### [ERP2-A3] Supplier rating

- **Build**: Table supplier_ratings (id, supplier_id, delivery_score 1 to 5, quality_score 1 to 5, comment, created_at). POST /api/suppliers/:id/ratings stores the rating and recalculates suppliers.rating as the average of all scores. GET /api/suppliers/top returns the 3 best. Stars on the list and a "Rate supplier" form on the detail page.
- **Depends on**: ERP2-A1, ERP2-A2 (WAIT).
- **Done when**: submitting a rating changes the supplier's average; the top 3 are correct.

### [ERP2-B1] Purchase requests API

- **Build**: Table purchase_requests (id PR-0001, sku, product_name, quantity, requested_by, reason, status = pending/approved/rejected/converted default pending, created_at). CRUD, GET with ?status=, PATCH /api/purchase-requests/:id/decision {status}. Only pending requests can be decided (else 400). ERP-1 (low stock) and ERP-3 (short components) post requests here, so POST must accept {sku, product_name, quantity, requested_by, reason} with no other required fields.
- **Depends on**: nothing.
- **Needed by**: ERP1-D3, ERP3-A3 (both create requests), ERP2-B2, B3.
- **Done when**: CRUD and decision work; a POST from another team works with only the five fields above.

### [ERP2-B2] Request screens

- **Build**: Page /requests: table, status filter, "New request" form, Approve/Reject buttons on pending rows.
- **Depends on**: ERP2-B1 (WAIT).
- **Done when**: you can create a request and approve or reject it from the browser.

### [ERP2-B3] Convert request to purchase order

- **Build**: POST /api/purchase-requests/:id/convert {supplier_id}: only for approved requests; creates a draft purchase order with one item through this service's PO API (ERP2-C1; unit_cost from the request's product price if known, otherwise from the form) and sets the request to converted. "Create PO" button with a supplier dropdown on approved rows.
- **Depends on**: ERP2-B1, ERP2-B2 (WAIT). ERP2-C1 (WAIT: the PO table is needed; until then build the endpoint up to the "create PO" call and test with a stub). ERP2-A1 (WAIT, supplier ids).
- **Done when**: converting an approved request creates a PO; converting a pending one returns 400.

### [ERP2-C1] Purchase orders API

- **Build**: Tables purchase_orders (id PO-0001, supplier_id, status = draft/sent/partially_received/received/ cancelled default draft, expected_date, total_amount, sent_at, created_at) and po_items (id, po_id, sku, product_name, quantity, unit_cost, received_qty default 0). POST creates a PO with items (one transaction) and calculates total_amount; GET /:id returns items; GET list supports ?status=; PATCH /api/purchase-orders/:id/ status. 4 seed POs (sent, partially_received, received, draft) using SUP-0001 to SUP-0006 and SKU-0101 to SKU-0105.
- **Depends on**: ERP2-A1 (MOCK: supplier_id is plain text; seed with seed contract (Section 5)).
- **Needed by**: ERP2-B3, C2, C3, D1.
- **Done when**: creating a PO with 3 items gives the correct total; 4 seed POs.

### [ERP2-C2] PO screens

- **Build**: Page /orders listing POs. Page /orders/new: supplier dropdown, expected date, item rows (SKU, name, quantity, unit cost) with a running total. Page /orders/:id shows items and status buttons (Send, Cancel).
- **Depends on**: ERP2-C1 (WAIT). ERP2-A1 (WAIT, supplier dropdown).
- **Done when**: you can build and save a PO and see the total update as you add rows.

### [ERP2-C3] PO rules and printable view

- **Build**: Only draft POs can be edited or deleted. Send sets status sent and sent_at. Validate quantity above 0 and unit_cost above 0. Print-friendly view of the PO (supplier details, items, total in ₹) with a Print button ( @media print hides the shell sidebar).
- **Depends on**: ERP2-C1, ERP2-C2 (WAIT).
- **Done when**: editing a sent PO returns 400; print preview looks like a clean document.

### [ERP2-D1] Goods receipt API

- **Build**: Tables goods_receipts (id GRN-0001, po_id, received_by, received_on, notes) and grn_items (id, grn_id, sku, received_qty). POST /api/goods-receipts saves the receipt, adds to po_items.received_qty and sets the PO to partially_received or received. For each item call ERP-1 POST /api/stock/adjust {sku, warehouse_id:'WH-01', delta, reason: GRN id} ( mock: 'stock-adjust'). After saving, post the purchase to the ledger: ERP-5 POST /api/ledger/auto {type:'purchase', reference: GRN id, amount: sum(received_qty x unit_cost)} (side effect, try/catch).
- **Depends on**: ERP2-C1 (WAIT). ERP1-B1 (MOCK: log it). ERP5-D1 (MOCK: log it).
- **Done when**: a partial receipt gives partially_received; a full one gives received; ERP-1 stock goes up and the ledger gets a purchase entry (or both mock logs appear).

### [ERP2-D2] Receipt screens

- **Build**: Page /receipts: choose a sent PO, see each item with ordered, already received, remaining and an input "received now". Submit button. Below, a list of past receipts.
- **Depends on**: ERP2-D1 (WAIT).
- **Done when**: receiving from the page updates the PO and appears in the list.

### [ERP2-D3] Receipt checks and late orders

- **Build**: Refuse receiving more than the remaining quantity (400). GET /api/receipts/pending lists sent POs not yet fully received. Show POs whose expected_date has passed in red as "Late". Print-friendly GRN page.
- **Depends on**: ERP2-D1, ERP2-D2 (WAIT).
- **Done when**: over-receiving is refused; late POs show in red.

## Role Issues (Section 8b)

### [ERP2-R1] Team Lead: README and demo script

- **Build**: Keep docs/erp2/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/erp2/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [ERP2-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/erp2/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [ERP2-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/erp2/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/erp2/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /erp2/... and looks consistent.

### [ERP2-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/erp2/tests.md. Write the API spec docs/erp2/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 13, 14, 15, 17.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
