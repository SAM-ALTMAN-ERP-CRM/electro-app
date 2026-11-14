# QA Test Cases & Cross-Team Verification Matrix — Team ERP-2 (Procurement & Suppliers)

**Team**: ERP-2 Procurement & Suppliers  
**Service Port**: `5202` (`services/erp2`) | **Database**: `erp2_db`  
**Frontend Module**: `frontend/src/modules/erp2` (`roles: ["admin", "warehouse", "finance"]`)  
**Order-to-Cash Workflow**: Step 4 of 9 (Supplier Management, Purchase Requests & Goods Receipts)  
**QA & Docs Owner (Role R4)**: Ninad N. Deodhare (`ninad2008`)  
**Issue**: `[ERP2-R4]` (#164)

---

## 1. Test Cases per Build Issue (Minimum 3 per Issue, Total: 38 Test Cases)

> **Status Legend**:
> - **PASS**: Verified and executed against the merged codebase and runtime test suite (`node --test`, `npm run build`).

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-ERP2-A1-01** | `[ERP2-A1]` | Submit `POST /api/suppliers` with missing `name` | Rejects with HTTP `400 Bad Request` ("Supplier name is required") | HTTP 400 returned, validation enforced | **PASS** |
| **TC-ERP2-A1-02** | `[ERP2-A1]` | Submit `POST /api/suppliers` with duplicate supplier name | Rejects with HTTP `409 Conflict` duplicate supplier error | HTTP 409 Conflict returned | **PASS** |
| **TC-ERP2-A1-03** | `[ERP2-A1]` | Submit valid `POST /api/suppliers` with contact & payment terms | Returns HTTP `201 Created` with generated `SUP-xxxx` ID | HTTP 201 created with sequential SUP ID | **PASS** |
| **TC-ERP2-A1-04** | `[ERP2-A1]` | Request `GET /api/suppliers?category=Semiconductors` | Returns filtered suppliers list matching category | Filtered array returned accurately | **PASS** |
| **TC-ERP2-A2-01** | `[ERP2-A2]` | Navigate to `/erp2/suppliers` in browser | Table renders supplier ID, name, contact, category, rating, and status | Table rendered cleanly with all columns | **PASS** |
| **TC-ERP2-A2-02** | `[ERP2-A2]` | Type "Bharat" in search box on suppliers list | Table filters dynamically showing `SUP-0002` (Bharat Electronics Ltd) | Instant search filtering verified | **PASS** |
| **TC-ERP2-A2-03** | `[ERP2-A2]` | Click "Add Supplier" button, submit modal form | Submits `POST /api/suppliers` and reloads table with new supplier | New supplier rendered in table | **PASS** |
| **TC-ERP2-A3-01** | `[ERP2-A3]` | Submit `POST /api/suppliers/:id/ratings` with score `6` (out of 1-5 range) | Rejects with HTTP `400 Bad Request` ("Rating must be between 1 and 5") | HTTP 400 bad input blocked | **PASS** |
| **TC-ERP2-A3-02** | `[ERP2-A3]` | Submit valid `POST /api/suppliers/SUP-0001/ratings` with score `5` | Updates supplier average rating and records review in `supplier_ratings` | Average rating recalculated | **PASS** |
| **TC-ERP2-A3-03** | `[ERP2-A3]` | Request `GET /api/suppliers/top` | Returns top suppliers ordered by average rating descending | Top rated supplier leaderboard returned | **PASS** |
| **TC-ERP2-B1-01** | `[ERP2-B1]` | Submit `POST /api/purchase-requests` without `sku` or `quantity` | Rejects with HTTP `400 Bad Request` | HTTP 400 returned, required fields enforced | **PASS** |
| **TC-ERP2-B1-02** | `[ERP2-B1]` | Submit `POST /api/purchase-requests` with quantity `<= 0` | Rejects with HTTP `400 Bad Request` ("quantity must be positive") | HTTP 400 returned, negative qty rejected | **PASS** |
| **TC-ERP2-B1-03** | `[ERP2-B1]` | Request `GET /api/purchase-requests?status=pending` | Returns list of pending purchase requests awaiting decision | Only requests in `pending` status returned | **PASS** |
| **TC-ERP2-B2-01** | `[ERP2-B2]` | Navigate to `/erp2/requests` in browser | Renders purchase requests table with status badges (`pending`, `approved`, `rejected`) | UI table rendered with colored status badges | **PASS** |
| **TC-ERP2-B2-02** | `[ERP2-B2]` | Click "Approve" button on pending request `PR-0001` | Calls `PATCH /api/purchase-requests/PR-0001/decision` with `{ status: 'approved' }` | Status badge updates to green `approved` | **PASS** |
| **TC-ERP2-B2-03** | `[ERP2-B2]` | Click "Reject" button with rejection reason on `PR-0002` | Calls `PATCH /api/purchase-requests/PR-0002/decision` with `{ status: 'rejected', reason }` | Status badge updates to red `rejected` | **PASS** |
| **TC-ERP2-B3-01** | `[ERP2-B3]` | Submit `POST /api/purchase-requests/:id/convert` on non-approved request | Rejects with HTTP `400 Bad Request` ("Only approved requests can be converted") | HTTP 400 returned, conversion blocked | **PASS** |
| **TC-ERP2-B3-02** | `[ERP2-B3]` | Submit `POST /api/purchase-requests/:id/convert` for approved request with `supplier_id` and `unit_cost` | Generates new Purchase Order `PO-xxxx` with status `draft` and updates request | PO created and linked successfully | **PASS** |
| **TC-ERP2-B3-03** | `[ERP2-B3]` | Submit `POST /api/purchase-requests/:id/convert` a second time on converted request | Rejects with HTTP `400 Bad Request` ("Request already converted") | Idempotency guard prevents duplicate PO | **PASS** |
| **TC-ERP2-C1-01** | `[ERP2-C1]` | Submit `POST /api/purchase-orders` without `supplier_id` | Rejects with HTTP `400 Bad Request` ("supplier_id is required") | HTTP 400 returned, required field enforced | **PASS** |
| **TC-ERP2-C1-02** | `[ERP2-C1]` | Submit `POST /api/purchase-orders` with empty items array `[]` | Rejects with HTTP `400 Bad Request` ("at least one item is required") | HTTP 400 returned on empty line items | **PASS** |
| **TC-ERP2-C1-03** | `[ERP2-C1]` | Submit valid `POST /api/purchase-orders` with items and expected delivery date | Returns HTTP `201 Created` with sequential `PO-xxxx` ID and computed total | PO-xxxx created with 18% GST calculation | **PASS** |
| **TC-ERP2-C2-01** | `[ERP2-C2]` | Navigate to `/erp2/orders` in browser | Displays Purchase Orders list showing PO ID, Supplier, Status, Expected Date, Total (₹) | List rendered with INR currency formatting | **PASS** |
| **TC-ERP2-C2-02** | `[ERP2-C2]` | Navigate to `/erp2/orders/new` and add multiple line items | Form computes subtotal, 18% GST tax, and net payable amount live | Calculation updates in real time | **PASS** |
| **TC-ERP2-C2-03** | `[ERP2-C2]` | Open `/erp2/orders/:id` Order Details view | Displays PO header, supplier contact details, line items table, and status timeline | Detail page loads with item breakdown | **PASS** |
| **TC-ERP2-C3-01** | `[ERP2-C3]` | Transition PO from `draft` to `sent` via `PATCH /api/purchase-orders/:id/status` | PO status transitions to `sent` and sets timestamp `sent_at = CURRENT_TIMESTAMP` | Status updated to `sent` with timestamp | **PASS** |
| **TC-ERP2-C3-02** | `[ERP2-C3]` | Attempt illegal transition from `draft` directly to `received` | Rejects with HTTP `400 Bad Request` ("Invalid status transition") | Transition blocked by state machine rules | **PASS** |
| **TC-ERP2-C3-03** | `[ERP2-C3]` | Click "Print PO" button on PO Details view | Launches printable purchase order voucher with header, GST summary, and `@media print` clean layout | Single-page print layout renders cleanly | **PASS** |
| **TC-ERP2-D1-01** | `[ERP2-D1]` | Submit `POST /api/goods-receipts` without `po_id` | Rejects with HTTP `400 Bad Request` ("Purchase Order ID is required") | HTTP 400 returned, required field checked | **PASS** |
| **TC-ERP2-D1-02** | `[ERP2-D1]` | Submit `POST /api/goods-receipts` on PO in `draft` status | Rejects with HTTP `400 Bad Request` ("Must be sent or partially_received") | HTTP 400 returned, draft receipt blocked | **PASS** |
| **TC-ERP2-D1-03** | `[ERP2-D1]` | Submit valid partial `POST /api/goods-receipts` for `PO-0002` | Generates `GRN-xxxx`, updates `received_qty`, transitions PO to `partially_received` | GRN created and PO status updated | **PASS** |
| **TC-ERP2-D2-01** | `[ERP2-D2]` | Navigate to `/erp2/receipts` in browser | Renders Goods Receipt form, pending POs table, and historical receipts list | Comprehensive receipt UI displayed | **PASS** |
| **TC-ERP2-D2-02** | `[ERP2-D2]` | Select sent PO `PO-0002` in dropdown | Line items populate dynamically showing Ordered, Prev Received, Remaining, and Receive Now input | Items and remaining balances loaded | **PASS** |
| **TC-ERP2-D2-03** | `[ERP2-D2]` | Submit inward receipt on UI and observe table below | Receipt is submitted, PO status updates, and new GRN row appears in past receipts table | Form resets and historical table refreshes | **PASS** |
| **TC-ERP2-D3-01** | `[ERP2-D3]` | Submit `POST /api/goods-receipts` with `received_qty` > remaining allowed quantity | Rejects with HTTP `400 Bad Request` ("Received quantity exceeds remaining ordered quantity") | HTTP 400 over-receiving blocked | **PASS** |
| **TC-ERP2-D3-02** | `[ERP2-D3]` | Request `GET /api/receipts/pending` when expected date is in the past | Returns pending PO with `is_late: true` and `days_late: X` | Overdue order detected and flagged | **PASS** |
| **TC-ERP2-D3-03** | `[ERP2-D3]` | View Pending Orders table on `/erp2/receipts` for late PO | Overdue row highlighted in bold red with `⚠️ LATE (X days overdue)` badge | Late delivery badge visible in red | **PASS** |
| **TC-ERP2-D3-04** | `[ERP2-D3]` | Click "View GRN" on past receipt | Opens single-page printable Goods Receipt Note with items and signature blocks | Modal opens with clean printable voucher | **PASS** |

---

## 2. Section 7 Cross-Team Contract Verification Matrix

The following rows in the cross-team contract table involve Team ERP-2 as either **Caller** or **Provider**. All checks evaluated with `USE_MOCKS=false` against live service endpoints or graceful fallback mocks:

| Row # | Caller Issue | Caller Team | Target Endpoint | Provider Team | Provider Issue | Verified Contract Payload & Behavior | Status |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **13** | `ERP1-D3` | ERP-1 (Inventory) | `POST /api/purchase-requests` | **ERP-2** | `ERP2-B1` | Dispatches `{ sku, product_name, quantity, requested_by: 'ERP-1 low stock', reason }`. ERP-2 generates `PR-xxxx` in `pending` status. | **VERIFIED (PASS)** |
| **14** | `ERP2-D1` | **ERP-2** (Procurement) | `POST /api/stock/adjust` | ERP-1 | `ERP1-B1` | Upon Goods Receipt (`GRN-xxxx`), ERP-2 notifies ERP-1 to increase physical inventory balance (`+qty`) with reference to the GRN. | **VERIFIED (PASS)** |
| **15** | `ERP2-D1` | **ERP-2** (Procurement) | `POST /api/ledger/purchase` | ERP-5 | `ERP5-D1` | Upon Goods Receipt, ERP-2 dispatches total receipt valuation to ERP-5 for double-entry ledger bookkeeping (Debit Purchases, Credit Accounts Payable). | **VERIFIED (PASS)** |
| **17** | `ERP3-A3` | ERP-3 (Production) | `POST /api/purchase-requests` | **ERP-2** | `ERP2-B1` | Production BOM shortage triggers purchase request `{ sku, product_name, quantity, requested_by: 'ERP-3 production' }` to procure assembly components. | **VERIFIED (PASS)** |

---

## 3. Bug Issues Logged & Resolved

During test execution, integration auditing, and validation checks, the following issues were logged and resolved:

| Bug ID | Title & Description | Component | Root Cause | Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **BUG-ERP2-001** | Over-receiving allowed when submitting duplicate receipt items | Backend (`goods-receipts.js`) | Validation only checked initial item quantity without verifying total against database balance inside transaction. | Added `FOR UPDATE` row lock on `po_items` and strict `received_qty + incoming <= quantity` check returning `400 Bad Request`. | **CLOSED** |
| **BUG-ERP2-002** | Late delivery status calculated with timezone offset discrepancy | Backend (`goods-receipts.js`) | Comparing raw date strings caused off-by-one errors across UTC and IST timestamps. | Standardized date calculation using PostgreSQL `(po.expected_date < CURRENT_DATE)` and `(CURRENT_DATE - po.expected_date)::integer`. | **CLOSED** |
| **BUG-ERP2-003** | PO conversion allowed multiple POs for a single purchase request | Backend (`request-conversion.js`) | Missing state guard permitted re-converting an already converted purchase request. | Enforced status validation requiring request status `approved` and immediately transitioning to `converted`. | **CLOSED** |
