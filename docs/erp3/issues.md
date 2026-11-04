# Issues for Team ERP3

**Context Line**:
> Team: ERP-3 Production and quality. Database: erp3_db. Backend services/erp3 on port 5203. Frontend module frontend/src/modules/erp3 (id erp3, title Production, roles admin and warehouse). Our job: define what each product is made of (bill of materials), run work orders on the assembly line and do quality checks.

## Build Issues

### [ERP3-A1] BOM tables and API

- **Build**: Tables boms (id BOM-0001, product_sku, product_name, version int default 1, active boolean default true) and bom_items (id, bom_id, component_sku, component_name, qty_per_unit numeric). POST /api/boms accepts items in the same request; GET /api/boms/:id returns the items; GET /api/boms?product_sku=. Seed BOMs for SKU-0001 (55-inch TV) and SKU-0003 (65-inch OLED TV) with the 5 shared component SKUs: SKU-0101 panel, SKU-0102 mainboard, SKU-0103 power supply, SKU-0104 remote, SKU-0105 packaging box (1 each).
- **Depends on**: nothing.
- **Needed by**: ERP3-A2, A3, B1, B3.
- **Done when**: a BOM with 5 components can be created and read; the seed BOMs for SKU-0001 and SKU-0003 use the shared component SKUs.

### [ERP3-A2] BOM screens

- **Build**: Page /boms listing BOMs. Page /boms/new: product SKU and name plus component rows (SKU, name, quantity per unit) with an "Add row" button. Page /boms/:id shows the components table.
- **Depends on**: ERP3-A1 (WAIT).
- **Done when**: you can build and view a BOM from the browser.

### [ERP3-A3] Material requirement, availability and purchase request

- **Build**: GET /api/boms/:id/requirements?qty= returns each component with qty_per_unit times qty. For each component call ERP-1 GET /api/stock/check?sku=&qty= ( mock: 'stock-check': available for all except one component). "Check materials" button on the BOM page shows a green tick or red cross per component and the shortfall. New: a "Request purchase" button on every red row posts {sku, product_name, quantity: shortfall, requested_by:'ERP-3 production', reason:'Work order shortage'} to ERP-2 POST /api/purchase-requests (mock: log it) and shows "Purchase requested". This is how a production shortage reaches Purchasing.
- **Depends on**: ERP3-A1 (WAIT). ERP3-A2 (MOCK: requirements endpoint and purchase trigger testable via API before BOM UI is merged). ERP1-B3 (MOCK: mock stock check). ERP2-B1 (MOCK: log the request).
- **Done when**: requirements scale with quantity; with real ERP-1 data a 20-TV requirement shows SKU-0102 in red; pressing "Request purchase" creates a pending request in ERP-2 (or logs the mock).

### [ERP3-B1] Work orders API

- **Build**: Table work_orders (id WO-0001, bom_id, product_sku, quantity, status = planned/in_progress/ completed/cancelled default planned, source = manual/shortage default manual, planned_start, planned_end, created_at, completed_at). CRUD, GET ?status=&source=, PATCH /api/work-orders/:id/status (planned to in_progress to completed; cancel only from planned). 5 seed work orders.
- **Depends on**: ERP3-A1 (WAIT, bom_id).
- **Needed by**: ERP3-B2, B3, C1, C3, D1.
- **Done when**: legal status moves work, illegal ones return 400; 5 seed work orders.

### [ERP3-B2] Work order screens

- **Build**: Page /work-orders: table with status badges, a create form (choose BOM, quantity, dates), Start / Complete / Cancel buttons on the rows.
- **Depends on**: ERP3-B1 (WAIT).
- **Done when**: you can create a work order and move it through its states from the browser.

### [ERP3-B3] Auto materials and shortage requests

- **Build**: When a work order is created, copy the BOM requirements into work_order_materials (wo_id, component_sku, required_qty, issued_qty default 0). POST /api/work-orders must also accept only {product_sku, quantity, source: "shortage"} (use the active BOM for that SKU; 400 if there is none) because ERP-4 calls it this way. Show materials on the work order detail page /work-orders/:id.
- **Depends on**: ERP3-B1 (WAIT), ERP3-A1 (WAIT).
- **Needed by**: ERP4-B3, ERP3-C1, C2.
- **Done when**: creating a work order fills its materials; a shortage-style request works without a bom_id.

### [ERP3-C1] Material issue API

- **Build**: Table material_issues (id, wo_id, component_sku, qty, issued_at). POST /api/work-orders/:id/issue {component_sku, qty} adds to issued_qty (cannot exceed required_qty, else 400), logs the issue and calls ERP-1 POST /api/stock/adjust with a negative delta ( warehouse_id:'WH-01', reason = WO id; mock: 'stock-adjust'). GET /api/work-orders/:id/issues.
- **Depends on**: ERP3-B1 (WAIT). ERP3-B3 (MOCK: treat materials as available until B3 is merged in G3). ERP1-B1 (MOCK: log it).
- **Done when**: issuing more than required is refused; issued_qty and history update; ERP-1 stock goes down (or the mock log appears).

### [ERP3-C2] Issue materials screen

- **Build**: On the work order detail page add an "Issue materials" section: table (component, required, issued, pending) with a quantity box and an Issue button per row, and a history table below.
- **Depends on**: ERP3-C1 (WAIT), ERP3-B2 (WAIT, detail page).
- **Done when**: pressing Issue updates the table and the history.

### [ERP3-C3] Finished goods posting

- **Build**: POST /api/work-orders/:id/post-finished: allowed only when every component is fully issued and GET /api/work-orders/:id/qc-status (ERP3-D3, same service) says allowed. It calls ERP-1 POST /api/stock/adjust with +quantity for the finished SKU in WH-01 and ERP-1 POST /api/serials/bulk {sku, batch_no: WO id, count: quantity, prefix} (mock: log both), then sets the work order to completed. The button is disabled until materials are fully issued.
- **Depends on**: ERP3-C1, ERP3-C2 (WAIT). ERP3-D3 (MOCK: treat qc-status as allowed until D3 is merged). ERP1-B1, ERP1-C1 (MOCK: log both).
- **Done when**: posting is blocked with a clear message when materials are missing; success marks the work order completed and adds stock and serials in ERP-1 (or logs).

### [ERP3-D1] QC API

- **Build**: Table qc_checks (id QC-0001, wo_id, inspector, checked_qty, passed_qty, failed_qty, defect_reason nullable, result = pass/fail/rework, checked_at). POST validates passed + failed = checked. Result rule: pass if failed is 0; fail if failed is more than 20% of checked; otherwise rework. GET /api/qc?wo_id=.
- **Depends on**: ERP3-B1 (MOCK: wo_id is plain text; seed with WO-0001 to WO-0005).
- **Done when**: the result is calculated correctly for the 3 cases; bad sums return 400.

### [ERP3-D2] QC screens

- **Build**: Page /qc: list of checks (result badge) and a form: work order, inspector, checked, passed, failed, defect reason (dropdown: scratch, dead pixel, no power, wrong label, other). Check that the numbers add up before submitting.
- **Depends on**: ERP3-D1 (WAIT).
- **Done when**: submitting shows the calculated result badge.

### [ERP3-D3] QC summary and gate

- **Build**: GET /api/qc/summary: overall pass rate % and per product, plus a count per defect reason. GET /api/work-orders/:id/qc-status returns {allowed: true/false}: false if the latest QC result for that work order is fail (ERP3-C3 calls it). Page card with pass rate and CSS bars per defect reason.
- **Depends on**: ERP3-D1, ERP3-D2 (WAIT).
- **Needed by**: ERP3-C3.
- **Done when**: pass rate matches a manual calculation; a failed QC makes allowed false.

## Role Issues (Section 8b)

### [ERP3-R1] Team Lead: README and demo script

- **Build**: Keep docs/erp3/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/erp3/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 12 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [ERP3-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/erp3/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [ERP3-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/erp3/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/erp3/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /erp3/... and looks consistent.

### [ERP3-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/erp3/tests.md. Write the API spec docs/erp3/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 16, 17, 18, 21.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
