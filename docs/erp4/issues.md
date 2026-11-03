# Issues for Team ERP4

**Context Line**:
> Team: ERP-4 Orders and dispatch. Database: erp4_db. Backend services/erp4 on port 5204. Frontend module frontend/src/modules/erp4 (id erp4, title Orders and Dispatch, roles admin, sales and warehouse). Our job: turn accepted quotes into sales orders, reserve stock, dispatch with a courier and handle returns.

## Build Issues

### [ERP4-A1] Sales orders API

- **Build**: Tables sales_orders (id SO-0001, quote_id nullable unique, customer_id, customer_name, customer_gstin nullable, sales_rep_id, status = created/confirmed/dispatched/delivered/cancelled default created, total_amount, created_at) and so_items (id, so_id, sku, product_name, quantity, unit_price). POST / api/sales-orders accepts items (CRM-1 calls this with quote_id; a repeated quote_id returns 409). GET /:id with items; GET list supports ?customer_id= and ?status=. Seed SO-0001 to SO-0005 as in the shared seed contract (each for CUST-0001 to CUST-0005, each containing SKU-0001).
- **Depends on**: nothing (CRM1-C3 is the caller, not a dependency).
- **Needed by**: CRM1-C3, CRM5-A1, A3, ERP4-A2, A3, B1, C1.
- **Done when**: creating an order with 3 items stores the correct total; duplicate quote_id returns 409; 5 seed orders.

### [ERP4-A2] Order screens

- **Build**: Page /orders (table, filters, "New order" form with customer ID and item rows). Page /orders/:id shows items, subtotal, GST 18%, grand total in ₹ and the status.
- **Depends on**: ERP4-A1 (WAIT).
- **Done when**: you can create and view orders from the browser.

### [ERP4-A3] Confirm, cancel and customer lookup

- **Build**: PATCH /api/sales-orders/:id/confirm (only from created) and /cancel (only before dispatched). On create, fetch the customer from CRM-3 GET /api/customers/:id ( mock: 'customer') to fill customer_name and customer_gstin. Status timeline on the order page.
- **Depends on**: ERP4-A1, ERP4-A2 (WAIT). CRM3-A1 (MOCK).
- **Done when**: illegal status moves return 400; customer_name and gstin are filled automatically (corporate customers show a 15-character GSTIN).

### [ERP4-B1] Reservation API

- **Build**: Table reservations (id, so_id, sku, quantity, status = reserved/released/shortage, created_at). POST / api/sales-orders/:id/reserve: for each item call ERP-1 GET /api/stock/check?sku=&qty= ( mock: 'stock-check': available except one SKU); create a reservation row per item as reserved or shortage and return a summary. Running it again updates rows, never duplicates.
- **Depends on**: ERP4-A1 (WAIT). ERP1-B3 (MOCK: mock stock check).
- **Needed by**: ERP4-B2, B3, C1.
- **Done when**: a mixed order produces both reserved and shortage rows (with real ERP-1 data, SKU-0003 gives a shortage); running twice does not duplicate rows.

### [ERP4-B2] Reservation panel

- **Build**: On the order detail page add a "Reservation" panel: "Reserve stock" button, table of items with status chips (green reserved, red shortage) and a warning banner if any item is short.
- **Depends on**: ERP4-B1 (WAIT), ERP4-A2 (WAIT).
- **Done when**: pressing the button fills the panel with the right chips.

### [ERP4-B3] Shortage and release

- **Build**: For each shortage item POST ERP-3 /api/work-orders {product_sku, quantity, source: "shortage"} ( mock: 'work-order') and show "Production requested". DELETE /api/sales-orders/:id/reservations sets reservations to released; call it automatically when an order is cancelled.
- **Depends on**: ERP4-B1, ERP4-B2 (WAIT). ERP3-B3 (MOCK: log it).
- **Done when**: shortage items create a real work order in ERP-3 (or log); cancelling an order releases its reservations.

### [ERP4-C1] Dispatch API

- **Build**: Tables dispatches (id DSP-0001, so_id, courier = BlueDart/Delhivery/DTDC, tracking_no, status = picked/shipped/delivered, ship_date, delivered_date, address) and dispatch_serials (dispatch_id, sku, serial_number). POST /api/dispatches only for orders where every reservation is reserved (else 400); it gets serials from ERP-1 POST /api/serials/allocate {sku, qty} ( mock: 'serials-allocate': generate fake serials). GET /api/dispatches returns rows {serial_number, sku, customer_id, ship_date} (CRM-2 uses this). PATCH / api/dispatches/:id/status. Seed DSP-0001 to DSP-0005 with serials TV55-2611-0001 to 0005 (shared seed contract).
- **Depends on**: ERP4-B1 (WAIT). ERP1-C3 (MOCK: fake serials).
- **Needed by**: CRM2-B3, ERP4-C2, C3, D1.
- **Done when**: dispatching an unreserved order returns 400; serials are stored per dispatch; with real ERP-1 the allocated serials are reserved in ERP-1.

### [ERP4-C2] Dispatch screens

- **Build**: Page /dispatch: orders ready to dispatch with a dispatch form (courier dropdown, tracking number, address). Table of dispatches with Shipped and Delivered buttons.
- **Depends on**: ERP4-C1 (WAIT).
- **Done when**: you can dispatch an order and move it to shipped and delivered.

### [ERP4-C3] Status sync, stock deduction, invoice, timeline and dispatch note

- **Build**: When a dispatch becomes shipped: (1) set the order to dispatched; (2) deduct stock: for each item POST ERP-1 /api/stock/adjust {sku, warehouse_id:'WH-01', delta: -quantity, reason: dispatch id} and PATCH each serial in ERP-1 /api/serials/:serial/status {status:'sold'}; (3) create the invoice: POST ERP-5 /api/invoices {so_id, customer_id, customer_name, customer_gstin, sales_rep_id, items} (mock: log it); (4) timeline event to CRM-3 /api/interactions/from-event {customer_id, type:'order', summary:'Order SO-xxxx dispatched', source_team:'ERP-4'}. When delivered set the order to delivered (and another timeline event). Steps 2 to 4 are side effects: try/catch and log [integration-error]. Page /dispatch/:id/note is a printable dispatch note with serial numbers and address.
- **Depends on**: ERP4-C1, ERP4-C2 (WAIT). ERP1-B1, ERP1-C3 (MOCK: log). ERP5-A1 (MOCK: log). CRM3-B3 (MOCK: log).
- **Needed by**: ERP5-A1 (receives invoices), ERP6-D1 (commission follows paid invoices), ERP5-C5.
- **Done when**: statuses change together; with real services running, shipping an order lowers ERP-1 stock, flips serials to sold, creates an ERP-5 invoice with the customer GSTIN, and adds a timeline entry; the note prints cleanly.

### [ERP4-D1] Returns API

- **Build**: Table returns (id RET-0001, so_id, serial_number, reason, rma_id nullable unique, outcome nullable, status = requested/received/restocked/scrapped default requested, created_at). POST /api/returns checks that the serial exists in dispatch_serials for that order (else 400). CRUD, PATCH /api/returns/:id/status. New: POST / api/returns/from-rma {rma_id, serial_number, reason, outcome} (CRM-2 calls this): finds the order from dispatch_serials by serial (400 if the serial was never dispatched), creates the return with status requested; a repeated rma_id returns the existing return with 200. Seed 4 returns using serials TV55-2611-0001 to 0004.
- **Depends on**: ERP4-C1 (WAIT, dispatch_serials). CRM2-C1 (MOCK: test from-rma with Postman until CRM-2 calls it).
- **Needed by**: CRM2-C3, ERP4-D2, D3.
- **Done when**: a return for a serial not in the order is refused; from-rma creates a return and is safe to call twice; 4 seed returns.

### [ERP4-D2] Return screens

- **Build**: Page /returns (table and "New return" form: order ID, serial, reason). Page /returns/:id with details and status buttons (Received, Restocked, Scrapped). Show the linked RMA id and outcome when present.
- **Depends on**: ERP4-D1 (WAIT).
- **Done when**: you can raise a return and move it through its statuses.

### [ERP4-D3] Restock, credit note and summary

- **Build**: When a return becomes restocked: ERP-1 PATCH /api/serials/:serial/status to returned and then to in_stock, and ERP-1 POST /api/stock/adjust {sku, warehouse_id:'WH-01', delta:+1, reason: return id} (mock: log it). If the return's outcome is credit_note (or it has none and the user ticks "issue credit note"), POST ERP-5 /api/creditnotes {so_id, serial_number, amount} where amount is that item's unit_price from so_items (mock: log it). GET /api/returns/summary (counts by status and by reason) shown as cards.
- **Depends on**: ERP4-D1, ERP4-D2 (WAIT). ERP1-B1, ERP1-C3 (MOCK: log). ERP5-A4 (MOCK: log).
- **Done when**: restocking changes the serial and stock in ERP-1 and, for credit-note returns, creates a credit note in ERP-5 (or logs); summary matches the data.

## Role Issues (Section 8b)

### [ERP4-R1] Team Lead: README and demo script

- **Build**: Keep docs/erp4/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/erp4/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a 10-minute check every Friday: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [ERP4-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/erp4/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [ERP4-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/erp4/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/erp4/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /erp4/... and looks consistent.

### [ERP4-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/erp4/tests.md. Write the API spec docs/erp4/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 3, 4, 6, 7, 10, 19 to 26.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.

