# Issues for Team ERP1

**Context Line**:
> Team: ERP-1 Inventory and warehouse. Database: erp1_db. Backend services/erp1 on port 5201. Frontend module frontend/src/modules/erp1 (id erp1, title Inventory, roles admin, warehouse and sales). Our job: the product (SKU) master and the stock of every warehouse. Other teams call us to check prices and stock.

## Build Issues

### [ERP1-A1] Products table and API

- **Build**: Table products (id SKU-0001, name, category = TV/Audio/Mobile accessory/Appliance/Component, brand, price numeric, tax_rate default 18, reorder_level int default 10, active boolean default true, created_at). CRUD plus GET /api/products?category=&q=. Price must be above 0; duplicate name returns 409.
- **Depends on**: nothing.
- **Needed by**: CRM1-C2, CRM4-B4, and every ERP1 issue.
- **Done when**: CRUD and filters work; price above 0 enforced; duplicate name returns 409.

### [ERP1-A2] Product screens

- **Build**: Page /products (table, search box, category filter, add/edit form, Deactivate button, price in ₹).
- **Depends on**: ERP1-A1 (WAIT).
- **Done when**: you can add, edit, search and deactivate products from the browser.

### [ERP1-A3] Seed data and price lookup

- **Build**: seed.sql with exactly the 15 products SKU-0001 to SKU-0015 and the 5 components SKU-0101 to SKU-0105 from the shared seed contract (same names, categories and prices). GET /api/products/:id/price returns price, tax_rate and price with tax. "Export CSV" button on the products page.
- **Depends on**: ERP1-A1 (WAIT). ERP1-A2 (MOCK: /api/products/:id/price and seed.sql are ready in G1; 'Export CSV' button connects once ERP1-A2 is merged in G2).
- **Done when**: the seed loads with npm run db:setup; the price endpoint is correct; CSV downloads.

### [ERP1-B1] Stock tables and API

- **Build**: Tables warehouses (id WH-01, name, city), stock (sku, warehouse_id, quantity int, primary key sku + warehouse_id) and stock_movements (id, sku, warehouse_id, delta int, reason, created_at). GET /api/stock?sku= (per warehouse and total), POST /api/stock/adjust {sku, warehouse_id, delta, reason} which updates stock and logs a movement. Seed WH-01 to WH-03 and stock following the stock rule in the shared seed contract (SKU-0003 total 3, SKU-0102 total 4, others 25 to 120).
- **Depends on**: ERP1-A1 (WAIT, SKU ids; no foreign key needed across seed order).
- **Needed by**: ERP2-D1, ERP3-C1, C3, ERP4-C3, D3 (all call stock/adjust), ERP1-B2, B3, D1.
- **Done when**: adjusting stock changes the quantity and adds a movement row; stock can never go below 0 (400).

### [ERP1-B2] Stock screens

- **Build**: Page /stock: table of SKU, name, one column per warehouse, total. "Adjust stock" form (SKU, warehouse, +/- quantity, reason). Page /movements with history, newest first.
- **Depends on**: ERP1-B1 (WAIT).
- **Done when**: adjusting from the form updates the table; the movement appears in history.

### [ERP1-B3] Transfers and stock check

- **Build**: POST /api/transfers {sku, from_wh, to_wh, qty}: reject if the source has too little stock; both updates inside one database transaction; log two movements. GET /api/stock/check?sku=&qty= returns {available: true/false, total}. Transfer form on the stock page.
- **Depends on**: ERP1-B1 (WAIT). ERP1-B2 (MOCK: POST /api/transfers and GET /api/stock/check are testable independently before stock page UI is merged).
- **Needed by**: ERP3-A3, ERP4-B1 (stock/check). Merge early.
- **Done when**: a transfer moves stock between warehouses; an over-transfer returns 400 and changes nothing; stock/check answers correctly.

### [ERP1-C1] Serials and batches API

- **Build**: Tables batches (batch_no, sku, quantity, manufactured_on) and serials (serial_number primary key, sku, batch_no, warehouse_id, status = in_stock/reserved/sold/returned default in_stock, created_at). POST /api/serials/bulk {sku, batch_no, count, prefix} generates serials like TV55-2611-0001; GET /api/serials? sku=&status=; GET /api/serials/:serial. Seed the 30 serials TV55-2611-0001 to 0030 as in the shared seed contract (0001 to 0005 sold).
- **Depends on**: ERP1-A1 (WAIT).
- **Needed by**: ERP3-C3 (serials/bulk), CRM2-B1 and ERP4 seeds (same serial numbers).
- **Done when**: generating 10 serials creates 10 unique rows; filters work; seeded serials exist.

### [ERP1-C2] Serial screens

- **Build**: Page /serials: generate form (SKU, batch no, count, prefix), table with status filter and a serial- number search box, and a batches list.
- **Depends on**: ERP1-C1 (WAIT).
- **Done when**: generating and searching work from the browser.

### [ERP1-C3] Status rules and allocation

- **Build**: PATCH /api/serials/:serial/status with allowed moves only: in_stock to reserved, reserved to sold, sold to returned, returned to in_stock (else 400). POST /api/serials/allocate {sku, qty} returns qty in_stock serials and marks them reserved (400 if not enough). Status badge in the UI.
- **Depends on**: ERP1-C1 (WAIT). ERP1-C2 (MOCK: PATCH /api/serials/:serial/status and POST /api/serials/allocate testable via API; status badge connects once serials UI is merged).
- **Needed by**: ERP4-C1 (allocate), ERP4-C3 (reserved to sold), ERP4-D3 (sold to returned to in_stock).
- **Done when**: an illegal move is refused; allocate returns the right count and flips them to reserved.

### [ERP1-D1] Low-stock API

- **Build**: GET /api/alerts/low-stock returns products whose total stock is at or below reorder_level, with shortfall. Table alerts_log (id, sku, message, acknowledged boolean default false, created_at). POST /api/alerts/scan inserts alerts for low items that have no unacknowledged alert; PATCH /api/alerts/:id/ack. PUT /api/products/:id/ reorder-level {reorder_level}.
- **Depends on**: ERP1-A1, ERP1-B1 (WAIT).
- **Done when**: scanning twice creates no duplicates (SKU-0003 is flagged by the seed data); acknowledging hides the alert from the open list.

### [ERP1-D2] Alerts screen

- **Build**: Page /alerts: red banner with the count of open alerts, table (SKU, stock, reorder level, shortfall), "Run scan" button, Acknowledge per row. The open-alert count also appears as a badge next to the module's menu label: set label in index.jsx from a small hook that calls the count endpoint, or show it on the page header if the shell does not support dynamic labels.
- **Depends on**: ERP1-D1 (WAIT).
- **Done when**: running a scan shows alerts; acknowledging removes them and updates the count.

### [ERP1-D3] Reorder suggestion and summary

- **Build**: Suggested order quantity = (reorder_level times 2) minus current stock. "Create purchase request" button posts {sku, product_name, quantity, requested_by:'ERP-1 low stock', reason} to ERP-2 POST /api/purchase-requests using callService('erp2', ..., mock: 'purchase-request'). GET /api/inventory/summary (total SKUs, low-stock count, out-of-stock count) shown as 3 cards on the alerts page.
- **Depends on**: ERP1-D1, ERP1-D2 (WAIT). ERP2-B1 (MOCK: log it).
- **Done when**: the suggestion number is correct; the button creates a real request in ERP-2 (or logs the mock); cards match the data.

## Role Issues (Section 8b)

### [ERP1-R1] Team Lead: README and demo script

- **Build**: Keep docs/erp1/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/erp1/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [ERP1-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/erp1/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [ERP1-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/erp1/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/erp1/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /erp1/... and looks consistent.

### [ERP1-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/erp1/tests.md. Write the API spec docs/erp1/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 2, 13, 14, 16, 18, 20, 22, 23, 25.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
