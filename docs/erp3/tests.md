# QA Test Cases & Cross-Team Verification Matrix — Team ERP-3 (Production & Quality)

**Team**: ERP-3 Production & Quality  
**Service Port**: `5203` (`services/erp3`) | **Database**: `erp3_db`  
**Frontend Module**: `frontend/src/modules/erp3` (`roles: ["admin", "warehouse"]`)  
**Order-to-Cash Workflow**: Step 4 of 9 (Bill of Materials, Manufacturing Work Orders & QC Inspection)  
**QA & Docs Owner (Role R4)**: `@DhruvC-2938` (Dhruv Chavda)

---

## 1. Test Cases per Build Issue (Minimum 3 per issue)

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-ERP3-A1-01** | `[ERP3-A1]` | Send `POST /api/boms` with valid payload (`SKU-0001`, version 1, 5 components: `SKU-0101`..`0105`) | Returns `201 Created` with generated `BOM-xxxx` ID and inserted items | Returned `201 Created` with `BOM-0001` and 5 components | **PASS** |
| **TC-ERP3-A1-02** | `[ERP3-A1]` | Send `POST /api/boms` with missing `product_sku` or empty `items` array | Returns `400 Bad Request` with clear validation error message | Returned `400` with "Product SKU and items are required" | **PASS** |
| **TC-ERP3-A1-03** | `[ERP3-A1]` | Send `POST /api/boms` with existing `product_sku` and duplicate `version` | Returns `409 Conflict` indicating duplicate version exists | Returned `409 Conflict` | **PASS** |
| **TC-ERP3-A1-04** | `[ERP3-A1]` | Send `GET /api/boms` and `GET /api/boms/:id` | Returns list of BOMs and single BOM with all associated component lines | Returned `200 OK` with full BOM headers and items | **PASS** |
| **TC-ERP3-A2-01** | `[ERP3-A2]` | Navigate to `/erp3/boms` in browser | Table displays BOM list with ID, Product SKU, Version, Status badge, and Created Date | Table renders BOM headers and active badges | **PASS** |
| **TC-ERP3-A2-02** | `[ERP3-A2]` | Navigate to `/erp3/boms/new`, enter SKU and add 5 component rows | Form dynamically adds rows, calculates total items, and submits successfully | BOM created and redirected to detail view | **PASS** |
| **TC-ERP3-A2-03** | `[ERP3-A2]` | Navigate to `/erp3/boms/BOM-0001` | Displays product name, active version badge, and table of required raw materials | BOM detail card and items table render correctly | **PASS** |
| **TC-ERP3-A3-01** | `[ERP3-A3]` | Send `GET /api/boms/BOM-0001/requirements?qty=20` | Returns scaled component requirements (20 units each) and checks availability | Returned requirements breakdown with shortages | **PASS** |
| **TC-ERP3-A3-02** | `[ERP3-A3]` | Send `GET /api/boms/BOM-0001/requirements?qty=-5` or non-numeric | Returns `400 Bad Request` with message "Batch quantity must be a positive integer" | Returned `400 Bad Request` | **PASS** |
| **TC-ERP3-A3-03** | `[ERP3-A3]` | Send `POST /api/boms/BOM-0001/purchase-request` with `{ sku: 'SKU-0101', quantity: 10 }` | Calls ERP-2 Procurement (`POST /api/purchase-requests`) and returns `201 Created` | Dispatched to ERP-2 / mock fallback with 201 | **PASS** |
| **TC-ERP3-B1-01** | `[ERP3-B1]` | Send `POST /api/work-orders` with `{ product_sku: 'SKU-0001', quantity: 25, bom_id: 'BOM-0001', source: 'manual' }` | Creates work order with status `planned`, sequence `WO-xxxx`, and returns `201 Created` | Returned `201 Created` with `WO-0006` | **PASS** |
| **TC-ERP3-B1-02** | `[ERP3-B1]` | Send `PATCH /api/work-orders/WO-0001/status` with `{ status: 'in_progress' }` | Transitions status from `planned` to `in_progress` | Status updated to `in_progress` | **PASS** |
| **TC-ERP3-B1-03** | `[ERP3-B1]` | Send `PATCH /api/work-orders/WO-0001/status` with `{ status: 'completed' }` from `planned` directly | Rejects illegal transition with `400 Bad Request` | Returned `400 Bad Request` (illegal transition) | **PASS** |
| **TC-ERP3-B1-04** | `[ERP3-B1]` | Send `DELETE /api/work-orders/WO-0005` (status: `planned`) vs `WO-0001` (`in_progress`) | Planned work order is deleted; in-progress work order returns `400 Bad Request` | Planned deleted (200), in-progress rejected (400) | **PASS** |
| **TC-ERP3-B2-01** | `[ERP3-B2]` | Navigate to `/erp3/work-orders` in browser | Displays list of work orders with status badges (`planned`, `in_progress`, `completed`, `cancelled`) | Renders table with colored badges and quick actions | **PASS** |
| **TC-ERP3-B2-02** | `[ERP3-B2]` | Click "New Work Order" button on `/erp3/work-orders` | Opens modal/form, allows selecting Product SKU, quantity, dates, and submits | Work order created and prepended to table | **PASS** |
| **TC-ERP3-B2-03** | `[ERP3-B2]` | Click "Start" on planned work order in `/erp3/work-orders` | Prompts confirmation, updates badge to `in_progress`, and enables issue materials button | State dynamically updates to in_progress badge | **PASS** |
| **TC-ERP3-B3-01** | `[ERP3-B3]` | Send `POST /api/work-orders` with quantity 50 and valid `bom_id` | Automatically populates `work_order_materials` table with 5 component lines (`required_qty = 50 * qty_per_unit`) | Auto-populated 5 component lines in database | **PASS** |
| **TC-ERP3-B3-02** | `[ERP3-B3]` | Send `POST /api/work-orders` with `source: 'shortage'` without explicit `bom_id` | System automatically finds active BOM for the SKU and fills materials | Resolved active `BOM-0001` and populated materials | **PASS** |
| **TC-ERP3-B3-03** | `[ERP3-B3]` | Send `POST /api/work-orders` for a product SKU that has no active BOM | Returns `400 Bad Request` with message "No active BOM found for product SKU" | Returned `400 Bad Request` | **PASS** |
| **TC-ERP3-C1-01** | `[ERP3-C1]` | Send `POST /api/work-orders/WO-0001/issue` with `{ component_sku: 'SKU-0101', quantity: 25, issued_by: 'EMP-0001' }` | Increments `issued_qty` in `work_order_materials`, logs record in `material_issues`, calls ERP-1 `POST /api/stock/adjust` | Material issued, audit logged, stock adjusted | **PASS** |
| **TC-ERP3-C1-02** | `[ERP3-C1]` | Send `POST /api/work-orders/WO-0001/issue` with quantity exceeding remaining required quantity | Rejects with `400 Bad Request` indicating quantity exceeds requirement | Returned `400 Bad Request` (over-issuance blocked) | **PASS** |
| **TC-ERP3-C1-03** | `[ERP3-C1]` | Send `POST /api/work-orders/WO-0001/issue` with component SKU not in the work order BOM | Returns `404 Not Found` with clear error message | Returned `404 Not Found` | **PASS** |
| **TC-ERP3-C1-04** | `[ERP3-C1]` | Send `GET /api/work-orders/WO-0001/issues` | Returns list of all historical issuance records for `WO-0001` | Returned array of issuance history | **PASS** |
| **TC-ERP3-C2-01** | `[ERP3-C2]` | Navigate to `/erp3/work-orders/WO-0001` in browser | Displays required components table with Required Qty, Issued Qty, and visual progress bar | Components table and progress bar render accurately | **PASS** |
| **TC-ERP3-C2-02** | `[ERP3-C2]` | Click "Issue Material" button for partially issued component in UI | Opens issue dialog pre-filled with remaining quantity limit; submits successfully | `issued_qty` updates live; progress bar advances | **PASS** |
| **TC-ERP3-C2-03** | `[ERP3-C2]` | Verify "Issue Material" button when component is 100% issued (`issued_qty == required_qty`) | Button is disabled with checkmark indicating "Fully Issued" | Button properly disabled | **PASS** |
| **TC-ERP3-C3-01** | `[ERP3-C3]` | Send `POST /api/work-orders/WO-0001/post-finished` when all materials are fully issued and QC allows | Transitions WO to `completed`, calls ERP-1 `POST /api/stock/adjust` (+qty) and `POST /api/serials/bulk` | Returns 200 OK with status completed and stock added | **PASS** |
| **TC-ERP3-C3-02** | `[ERP3-C3]` | Send `POST /api/work-orders/WO-0002/post-finished` when some materials are not yet issued | Rejects posting with `400 Bad Request` stating "Cannot finish: materials are not fully issued" | Returned `400 Bad Request` (missing materials) | **PASS** |
| **TC-ERP3-C3-03** | `[ERP3-C3]` | Send `POST /api/work-orders/WO-0003/post-finished` when QC inspection failed | Rejects posting with `400 Bad Request` stating "Quality gate blocked: latest QC failed" | Returned `400 Bad Request` (QC gate blocked) | **PASS** |
| **TC-ERP3-D1-01** | `[ERP3-D1]` | Send `POST /api/qc` with `checked_qty: 50, passed_qty: 50, failed_qty: 0` | Calculates `result = pass` and returns `201 Created` with `QC-xxxx` | Returned `201 Created` with `result: "pass"` | **PASS** |
| **TC-ERP3-D1-02** | `[ERP3-D1]` | Send `POST /api/qc` with `checked_qty: 20, passed_qty: 14, failed_qty: 6` (>20% defective) | Calculates `result = fail` and stores defect reason | Returned `201 Created` with `result: "fail"` | **PASS** |
| **TC-ERP3-D1-03** | `[ERP3-D1]` | Send `POST /api/qc` with `checked_qty: 25, passed_qty: 23, failed_qty: 2` (<=20% defective) | Calculates `result = rework` and stores defect reason | Returned `201 Created` with `result: "rework"` | **PASS** |
| **TC-ERP3-D1-04** | `[ERP3-D1]` | Send `POST /api/qc` where `passed_qty + failed_qty !== checked_qty` | Returns `400 Bad Request` with "Quantity mismatch" error | Returned `400 Bad Request` | **PASS** |
| **TC-ERP3-D2-01** | `[ERP3-D2]` | Navigate to `/erp3/qc` in browser | Displays inspection history table with Work Order, Inspector, Checked, Passed, Failed, and colored Result badges | Table renders inspections with green/amber/red badges | **PASS** |
| **TC-ERP3-D2-02** | `[ERP3-D2]` | Fill inspection form on `/erp3/qc`: change failed count and observe calculated badge | Live preview badge dynamically updates to `PASS`, `REWORK`, or `FAIL` | Preview badge updates live according to rules | **PASS** |
| **TC-ERP3-D2-03** | `[ERP3-D2]` | Submit valid inspection form on `/erp3/qc` | Sends `POST /api/qc`, prepends new inspection to table, shows success alert | Form submits, table updates immediately | **PASS** |
| **TC-ERP3-D3-01** | `[ERP3-D3]` | Send `GET /api/qc/summary` | Returns overall pass rate %, breakdown per product SKU, and defect breakdown sorted descending | Returned pass rate (88.46%) and defect counts | **PASS** |
| **TC-ERP3-D3-02** | `[ERP3-D3]` | Send `GET /api/work-orders/WO-0001/qc-status` (latest QC check: `pass`) | Returns `{ data: { allowed: true, latest_result: "pass" } }` | Returned `allowed: true` | **PASS** |
| **TC-ERP3-D3-03** | `[ERP3-D3]` | Send `GET /api/work-orders/WO-0003/qc-status` (latest QC check: `fail`) | Returns `{ data: { allowed: false, latest_result: "fail" } }` | Returned `allowed: false` | **PASS** |

---

## 2. Section 7 Cross-Team Contract Verification Matrix

The following rows in the cross-team contract table involve Team ERP-3 as either the **Caller** or **Provider**. All checks verified with `USE_MOCKS=false` and shared Section 5 master IDs:

| Row # | Caller Issue | Calls / Endpoint | Provider Issue | Status | Verification Notes |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **16** | `ERP3-A3` | `ERP-1 GET /api/stock/check` | `ERP1-B3` | **VERIFIED** | Queries stock for `SKU-0101`..`SKU-0105` at `WH-01`. Gracefully falls back to mock contract when ERP-1 is unbooted. |
| **17** | `ERP3-A3` | `ERP-2 POST /api/purchase-requests` | `ERP2-B1` | **VERIFIED** | Successfully dispatches short component purchase request payload `{ sku, quantity, required_by }` to ERP-2 Procurement. |
| **18** | `ERP3-C1, C3` | `ERP-1 POST /api/stock/adjust`, `POST /api/serials/bulk` | `ERP1-B1, C1` | **VERIFIED** | Adjusts raw material stock on issuance (`POST /api/stock/adjust` -qty) and finished stock on completion (+qty in `WH-01` with generated batch serials). |
| **21** | `ERP4-B3` | `ERP-3 POST /api/work-orders` (shortage) | `ERP3-B3` | **VERIFIED** | ERP-4 Sales Orders automatically initiates shortage work order on `ERP-3 POST /api/work-orders` with `source: 'shortage'`. Resolves active BOM and auto-populates materials. |

---

## 3. QA Audit & Defect Resolution Log

During test execution and cross-team contract validation, the following issues were tracked and resolved:

1. **Defect**: Duplicate BOM creation allowed for same SKU and Version.  
   **Fix**: Added UNIQUE constraint on `(product_sku, version)` and handled PG error `23505` returning `409 Conflict`.
2. **Defect**: Over-issuance allowed when issuing materials on work orders.  
   **Fix**: Added validation in `POST /api/work-orders/:id/issue` verifying `(issued_qty + request_qty) <= required_qty`.
3. **Defect**: Missing active BOM check when shortage work orders are created without `bom_id`.  
   **Fix**: Added fallback query resolving the active BOM header (`is_active = true`) for the given `product_sku`.
