# QA Test Cases & Cross-Team Verification Matrix — Team ERP-4 (Orders & Dispatch)

**Team**: ERP-4 Orders & Dispatch  
**Service Port**: `5204` (`services/erp4`) | **Database**: `erp4_db`  
**Frontend Module**: `frontend/src/modules/erp4` (`roles: ["admin", "sales", "warehouse"]`)  
**Order-to-Cash Workflow**: Steps 3, 5 & 6 of 9 (Sales Orders, Courier Dispatch & Return Receipts)  
**QA & Docs Owner (Role R4)**: Aaroh Wankhede (`aarohwankh-dotcom`) / Kaushal (`kaushalrajmandai`)  
**Issue**: `[ERP4-R4]` (#172)

---

## 1. Test Cases per Build Issue (Minimum 3 per Issue, Total $\ge 36$)

> **Status Legend**:
> - **PASS**: Verified and executed against merged codebase / live runtime tests (`node --test`, `npm run build`, `npm run smoke`).

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **TC-ERP4-A1-001** | `[ERP4-A1]` | Submit `POST /api/sales-orders` without `customer_id` | Rejects with HTTP `400 Bad Request` ("customer_id is required") | HTTP 400 returned, validation enforced | **PASS** |
| **TC-ERP4-A1-002** | `[ERP4-A1]` | Submit `POST /api/sales-orders` with empty items array `[]` | Rejects with HTTP `400 Bad Request` ("items must be a non-empty array") | HTTP 400 returned, bad input rejected | **PASS** |
| **TC-ERP4-A1-003** | `[ERP4-A1]` | Submit valid `POST /api/sales-orders` with line items (`SKU-0001` qty 2 @ ₹42,990) | HTTP `201 Created` with generated `SO-xxxx` ID, status `created`, and total amount ₹85,980.00 | HTTP 201 returned with `SO-xxxx` | **PASS** |
| **TC-ERP4-A1-004** | `[ERP4-A1]` | Submit `POST /api/sales-orders` with existing `quote_id: "QUO-0001"` | Rejects with HTTP `409 Conflict` duplicate quote error | HTTP 409 Conflict returned | **PASS** |
| **TC-ERP4-A2-001** | `[ERP4-A2]` | Navigate to `/erp4/orders` in browser | Renders orders table with ID, Customer, Sales Rep, Status badge, Total (₹), and "New Order" button | UI table rendered with ₹ currency formatting | **PASS** |
| **TC-ERP4-A2-002** | `[ERP4-A2]` | Open "New Order" form and add items dynamically | Form dynamically computes line item totals and overall total in INR | Totals recalculate live | **PASS** |
| **TC-ERP4-A2-003** | `[ERP4-A2]` | Filter orders table by status `created` | Table filters dynamically showing only orders in `created` status with gray/blue badges | Filter applied instantly | **PASS** |
| **TC-ERP4-A3-001** | `[ERP4-A3]` | Submit `POST /api/sales-orders` for `CUST-0002` without providing customer name or GSTIN | CRM-3 auto-lookup resolves name "Sunrise Electronics Pvt Ltd" and 15-char GSTIN `27AABCS1234F1Z5` | Customer details enriched automatically | **PASS** |
| **TC-ERP4-A3-002** | `[ERP4-A3]` | Submit `PATCH /api/sales-orders/:id/confirm` on order with status `created` | Order transitions from `created` to `confirmed` with HTTP `200 OK` | Status updated to `confirmed` | **PASS** |
| **TC-ERP4-A3-003** | `[ERP4-A3]` | Submit `PATCH /api/sales-orders/:id/confirm` on order with status `shipped` or `confirmed` | Rejects with HTTP `400 Bad Request` (illegal state transition) | HTTP 400 returned, illegal move blocked | **PASS** |
| **TC-ERP4-A3-004** | `[ERP4-A3]` | Submit `PATCH /api/sales-orders/:id/cancel` on order with status `dispatched` or `delivered` | Rejects with HTTP `400 Bad Request` ("Orders can only be cancelled before dispatch") | HTTP 400 returned, cancellation blocked | **PASS** |
| **TC-ERP4-B1-001** | `[ERP4-B1]` | Submit `POST /api/reservations` without `so_id` or `sku` | Rejects with HTTP `400 Bad Request` | HTTP 400 returned, required fields enforced | **PASS** |
| **TC-ERP4-B1-002** | `[ERP4-B1]` | Submit `POST /api/reservations` for `SKU-0001` with available stock in ERP-1 | Creates reservation with status `reserved` and returns HTTP `201 Created` | Reservation created with `RES-xxxx` | **PASS** |
| **TC-ERP4-B1-003** | `[ERP4-B1]` | Request `GET /api/sales-orders/:id/reservations` | Returns list of reservations for the order and summary (`total`, `reserved`, `shortage`) | HTTP 200 with reservation items and summary | **PASS** |
| **TC-ERP4-B2-001** | `[ERP4-B2]` | View Order Detail page `/erp4/orders/SO-0001` | Renders Stock Reservation panel displaying SKU rows, required qty, and reservation status | Panel rendered with reservation badges | **PASS** |
| **TC-ERP4-B2-002** | `[ERP4-B2]` | Click "Reserve Stock" button on Order Detail page | Calls `POST /api/reservations` for each line item and updates UI badge to `reserved` | Stock reserved and status badges updated | **PASS** |
| **TC-ERP4-B2-003** | `[ERP4-B2]` | Check summary counts in Reservation panel | Shows Total Items, Reserved Qty, Shortage Qty, and Released Qty | Summary metrics match table rows | **PASS** |
| **TC-ERP4-B3-001** | `[ERP4-B3]` | Submit `POST /api/reservations` when ERP-1 reports insufficient stock | Marks reservation as `shortage` and triggers shortage notification | Reservation saved with status `shortage` | **PASS** |
| **TC-ERP4-B3-002** | `[ERP4-B3]` | Call `POST /api/sales-orders/:id/reservations/release` | Releases all active reservations for order and sets status to `released` | Status updated to `released` | **PASS** |
| **TC-ERP4-B3-003** | `[ERP4-B3]` | Cancel an order having active reservations | Automatic hook releases reservations to prevent phantom stock locks | Active reservations released on cancel | **PASS** |
| **TC-ERP4-C1-001** | `[ERP4-C1]` | Submit `POST /api/dispatches` for an unreserved order | Rejects with HTTP `400 Bad Request` ("Cannot dispatch order without reserved stock") | HTTP 400 returned, unreserved order refused | **PASS** |
| **TC-ERP4-C1-002** | `[ERP4-C1]` | Submit `POST /api/dispatches` for order with shortage reservation | Rejects with HTTP `400 Bad Request` ("Cannot dispatch order with stock shortage") | HTTP 400 returned, shortage blocked | **PASS** |
| **TC-ERP4-C1-003** | `[ERP4-C1]` | Submit `POST /api/dispatches` for fully reserved order (`SO-0006`) with courier BlueDart | HTTP `201 Created` with generated `DSP-xxxx` ID, allocates serials via ERP-1, stores serials per dispatch | HTTP 201 returned with `DSP-xxxx` and serials | **PASS** |
| **TC-ERP4-C1-004** | `[ERP4-C1]` | Request `GET /api/dispatches` with fields used by CRM-2 | Returns dispatches with `serial_number`, `sku`, `customer_id`, `ship_date` | HTTP 200 returned with CRM-2 fields | **PASS** |
| **TC-ERP4-C2-001** | `[ERP4-C2]` | Navigate to `/erp4/dispatch` in browser | Displays "Ready for Dispatch" queue table and "Active Dispatches" overview | Both sections render order cards and tables | **PASS** |
| **TC-ERP4-C2-002** | `[ERP4-C2]` | Select courier (Delhivery) and click "Dispatch Order" for ready order | Dispatches consignment, generates tracking number, and transitions status to `picked` | Consignment created in `picked` status | **PASS** |
| **TC-ERP4-C2-003** | `[ERP4-C2]` | Navigate to `/erp4/dispatch/:id/note` | Printable delivery dispatch note renders with company header, barcode, customer address, and serialized items table | Printable view styled cleanly with print stylesheet | **PASS** |
| **TC-ERP4-C3-001** | `[ERP4-C3]` | Submit `PATCH /api/dispatches/:id/status` moving status to `shipped` | Updates `dispatches.status` to `shipped` and syncs `sales_orders.status` to `dispatched` | Order status synced to `dispatched` | **PASS** |
| **TC-ERP4-C3-002** | `[ERP4-C3]` | When moving dispatch to `shipped`, trigger external integrations | Calls ERP-1 stock deduction, sets serial status to `sold`, calls ERP-5 invoice creation, and CRM-3 event | Integrations invoked; logs `[mock]` fallback safely | **PASS** |
| **TC-ERP4-C3-003** | `[ERP4-C3]` | Submit `PATCH /api/dispatches/:id/status` moving status to `delivered` | Sets `delivered_date`, syncs `sales_orders.status` to `delivered`, and fires CRM-3 delivery event | Order status synced to `delivered` | **PASS** |
| **TC-ERP4-D1-001** | `[ERP4-D1]` | Submit `POST /api/returns` with serial not in dispatch (`TV55-2611-9999`) | Rejects with HTTP `400 Bad Request` ("Serial number was not dispatched for order") | HTTP 400 returned, bogus serial refused | **PASS** |
| **TC-ERP4-D1-002** | `[ERP4-D1]` | Submit `POST /api/returns/from-rma` with serial never dispatched | Rejects with HTTP `400 Bad Request` ("Serial number was never dispatched") | HTTP 400 returned, undispatched serial refused | **PASS** |
| **TC-ERP4-D1-003** | `[ERP4-D1]` | Submit `POST /api/returns/from-rma` twice with same `rma_id` | First call returns HTTP `201 Created`; second call returns HTTP `200 OK` with existing return (idempotent) | Idempotent behavior confirmed | **PASS** |
| **TC-ERP4-D1-004** | `[ERP4-D1]` | Verify seed returns `RET-0001` through `RET-0004` via `GET /api/returns` | Returns 4 seed returns matching serials `TV55-2611-0001` to `0004` with statuses `requested`, `received`, `restocked`, `scrapped` | 4 seed returns verified | **PASS** |
| **TC-ERP4-D2-001** | `[ERP4-D2]` | Navigate to `/erp4/returns` in browser | Renders returns table, status filters, search input, KPI cards, and "Raise New Return" drawer button | UI renders components and metrics | **PASS** |
| **TC-ERP4-D2-002** | `[ERP4-D2]` | Raise return from form on `/erp4/returns` | Submits `POST /api/returns`, validates inputs, adds to list, and displays success banner | Return created and table refreshed | **PASS** |
| **TC-ERP4-D2-003** | `[ERP4-D2]` | Navigate to `/erp4/returns/:id` and advance status from `requested` to `received` | "Mark Received at Warehouse" button updates status to `received` with amber badge | Status transitioned to `received` | **PASS** |
| **TC-ERP4-D3-001** | `[ERP4-D3]` | On `/erp4/returns/:id`, transition status from `received` to `restocked` | Triggers ERP-1 serial status update (`returned` $\rightarrow$ `in_stock`) and stock adjustment (+1) | ERP-1 stock & serial updated | **PASS** |
| **TC-ERP4-D3-002** | `[ERP4-D3]` | Restock return having outcome `credit_note` (or "Issue Credit Note" checked) | Calls ERP-5 `POST /api/creditnotes` with `{ so_id, serial_number, amount: unit_price }` | Credit note created in ERP-5 | **PASS** |
| **TC-ERP4-D3-003** | `[ERP4-D3]` | Request `GET /api/returns/summary` | Returns object with `total`, `requested`, `received`, `restocked`, `scrapped`, and `by_reason` breakdown matching database | KPI counts and reason counts accurate | **PASS** |

---

## 2. Section 7 Cross-Team Contract Verification Matrix

The following rows in the cross-team contract table involve Team ERP-4 as either **Caller** or **Provider**. All checks evaluated with `USE_MOCKS=false` where dependencies are online, with graceful `[mock]` fallback:

| Row | Caller Issue | Caller Team | Target Endpoint | Provider Team | Provider Issue | Verification Result |
| :---: | :---: | :---: | :--- | :---: | :---: | :--- |
| **3** | `CRM1-C3` | CRM-1 | `POST /api/sales-orders` | **ERP-4** | `ERP4-A1` | **PASS**: CRM-1 quote acceptance creates sales order with line items and duplicate `quote_id` prevention. |
| **4** | `ERP4-C3` | **ERP-4** | `POST /api/interactions/from-event` | CRM-3 | `CRM3-B3` | **PASS**: Dispatch shipping and delivery logs timeline interaction on customer record in CRM-3. |
| **6** | `CRM2-B3` | CRM-2 | `GET /api/dispatches` | **ERP-4** | `ERP4-C1` | **PASS**: CRM-2 queries dispatches by serial number for warranty lookup and ticket registration. |
| **7** | `CRM2-C3` | CRM-2 | `POST /api/returns/from-rma` | **ERP-4** | `ERP4-D1` | **PASS**: RMA approval in CRM-2 triggers return creation in ERP-4; idempotent on duplicate `rma_id`. |
| **10** | `CRM5-A1, A3` | CRM-5 | `GET /api/sales-orders` | **ERP-4** | `ERP4-A1` | **PASS**: Customer portal queries sales orders and tracks order status progression. |
| **19** | `ERP4-A3` | **ERP-4** | `GET /api/customers/:id` | CRM-3 | `CRM3-A1` | **PASS**: Auto-lookup retrieves customer name and 15-char GSTIN for invoice generation. |
| **20** | `ERP4-B1` | **ERP-4** | `GET /api/stock/check` | ERP-1 | `ERP1-B3` | **PASS**: Stock availability check before reserving inventory for order line items. |
| **21** | `ERP4-B3` | **ERP-4** | `POST /api/work-orders` | ERP-3 | `ERP3-B3` | **PASS**: Automatic work order creation triggered upon stock shortage detection. |
| **22** | `ERP4-C1` | **ERP-4** | `POST /api/serials/allocate` | ERP-1 | `ERP1-C3` | **PASS**: Allocates specific serial numbers from warehouse inventory to dispatch consignment. |
| **23** | `ERP4-C3` | **ERP-4** | `POST /api/stock/adjust`, `PATCH /api/serials/:serial/status` | ERP-1 | `ERP1-B1, C3` | **PASS**: Deducts stock qty and marks serials as `sold` when dispatch leaves warehouse. |
| **24** | `ERP4-C3` | **ERP-4** | `POST /api/invoices` | ERP-5 | `ERP5-A1` | **PASS**: Generates tax invoice in finance service upon order dispatch with 18% GST. |
| **25** | `ERP4-D3` | **ERP-4** | `PATCH /api/serials/:serial/status`, `POST /api/stock/adjust` | ERP-1 | `ERP1-C3, B1` | **PASS**: Restocking returned item marks serial `in_stock` and increments inventory (+1). |
| **26** | `ERP4-D3` | **ERP-4** | `POST /api/creditnotes` | ERP-5 | `ERP5-A4` | **PASS**: Creates credit note in ERP-5 for customer refund/credit matching item unit price. |

---

## 3. Bug Issues Logged & Resolved

During implementation and test suite verification, the following edge cases were logged and resolved:

| Bug ID | Title & Description | Component | Root Cause | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-ERP4-001** | In-memory store desynchronization between routes | Backend (`store.js`) | Multiple route files kept local file-based arrays instead of shared in-memory collections. | Centralized shared storage in `services/erp4/store.js` exporting orders, reservations, dispatches, and returns. | **CLOSED** |
| **BUG-ERP4-002** | Customer auto-lookup fallback on network timeouts | Integration (`CRM-3`) | When CRM-3 was offline and `USE_MOCKS=false`, order creation hung on unhandled timeout. | Added fallback check to local mock catalog with error tolerance logging `[integration-error]`. | **CLOSED** |
| **BUG-ERP4-003** | Repeated RMA return creation throwing HTTP 500 | Inbound API (`from-rma`) | Duplicate `rma_id` triggered SQL unique constraint violation instead of idempotent 200 response. | Added idempotency check returning existing return with HTTP `200 OK` on repeated `rma_id`. | **CLOSED** |
