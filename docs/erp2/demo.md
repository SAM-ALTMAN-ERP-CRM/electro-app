# ERP-2 Procurement & Suppliers — 5-Step Demo Script

This script provides an interactive, reproducible 5-step walkthrough of Team ERP-2's **Purchasing & Procurement** module. Designed to be followed by external evaluators, QA, and peer teams, it utilizes strictly the pinned master data IDs defined in **Section 5 (Shared Seed Contract)**.

---

## 📌 Shared Contract Test Data Referenced

| Entity Category | Contract ID | Name / Description | Attribute / Shared Value |
|---|---|---|---|
| **Primary Supplier** | `SUP-0001` | Precision Display Panels Ltd | Pune · GSTIN: `27AAACP1234A1Z5` · Terms: `net30` · Rating: `4.8` |
| **Silicon Supplier** | `SUP-0002` | Silicon Chipsets Pvt Ltd | Bengaluru · GSTIN: `29AABCS5678B1Z2` · Terms: `net15` · Rating: `4.5` |
| **Audio Supplier** | `SUP-0004` | Sonic Sound Components | Bengaluru · GSTIN: `29AAACS3456D1Z1` · Terms: `net30` · Rating: `4.6` |
| **Target Component** | `SKU-0101` | 55-inch Display Panel | Category: `Component` · Unit Cost: `₹12,500.00` |
| **Target Component** | `SKU-0102` | Mainboard Circuitry | Category: `Component` · Unit Cost: `₹4,200.00` |
| **Low-Stock TV** | `SKU-0003` | 65-inch OLED TV | Total Stock: `3` (Reorder Level: `10`) |
| **Target Warehouse** | `WH-01` | Mumbai Central Warehouse | Primary destination for intake deliveries |
| **Warehouse Manager** | `EMP-0009` | Arjun Das | Goods receipt receiver · `DEP-04` |
| **Finance Manager** | `EMP-0010` | Kavita Shah | Commercial accounts approval · `DEP-05` |
| **Demo User** | `admin@demo.com` | Administrator Login | Full ERP-2 roles: `admin`, `warehouse`, `finance` |

---

## Pre-requisites: Start Services

Ensure the backend services and frontend shell are running:

```bash
# Terminal 1: ERP-2 Backend Service (Port 5202)
npm --workspace=services/erp2 run dev

# Terminal 2: Electro App Frontend Shell (Port 3000)
npm --workspace=frontend run dev
```

Log in to the web shell at `http://localhost:3000` using `admin@demo.com` (or `sales@demo.com` / `demo123`).

---

## Step 1: Supplier Directory, Search & Vendor Rating (ERP2-A1, A2, A3)

**Objective**: Verify vendor discovery, multi-criteria filtering, GSTIN compliance, top 3 ranking, and dynamic rating recalculation.

1. **Navigate to Suppliers Directory**:
   In your browser, open:
   ```text
   http://localhost:3000/erp2/suppliers
   ```
2. **Review Top 3 Best-Rated Suppliers Banner**:
   - At the top of the page, confirm the **Top 3 Best-Rated Suppliers** cards render:
     - `#1`: **Precision Display Panels Ltd** (`SUP-0001`) with rating `★ 4.8`
     - `#2`: **Sonic Sound Components** (`SUP-0004`) with rating `★ 4.6`
     - `#3`: **Silicon Chipsets Pvt Ltd** (`SUP-0002`) with rating `★ 4.5`
3. **Filter and Search Directory**:
   - In the search bar, type `Silicon`. The list filters down to `SUP-0002`.
   - Clear search, enter `Pune` in the city filter. The list filters down to `SUP-0001`.
   - Click **Clear Filters** to restore the full catalog of 6 suppliers.
4. **Submit Vendor Rating (ERP2-A3)**:
   - Click on `SUP-0001` or open `http://localhost:3000/erp2/suppliers/SUP-0001`.
   - Inspect supplier profile: GSTIN `27AAACP1234A1Z5`, payment terms `net30`, contact `Vikram Malhotra`.
   - Click the **★ Rate Supplier** button to open the evaluation modal:
     - **Delivery Reliability**: `5 - Excellent (Always on time)`
     - **Component Quality**: `5 - Excellent (Zero defects)`
     - **Evaluation Notes**: `Delivered 100 panels for WO-0001 with zero transit damage.`
     - Click **Submit Rating**.
   - **Verification**: Notice the supplier rating dynamically updates, a green confirmation badge appears, and the new evaluation log appears under Vendor Performance History.

---

## Step 2: Ingest and Decide Purchase Requests (ERP2-B1, B2)

**Objective**: Verify inbound purchase request ingestion from ERP-1 (low stock alerts) and ERP-3 (component shortages), and test the approval workflow.

1. **Simulate Inbound Purchase Request from ERP-1**:
   In a terminal, send an automated reorder request for low-stock `SKU-0003` (65-inch OLED TV):
   ```bash
   curl -X POST http://localhost:5202/api/purchase-requests \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{
       "sku": "SKU-0003",
       "product_name": "65-inch OLED TV",
       "quantity": 17,
       "requested_by": "ERP-1 low stock",
       "reason": "Stock dropped to 3 units, below reorder threshold of 10"
     }'
   ```
   **Expected Response**: HTTP `201 Created` with generated request ID (e.g. `PR-0007`), status `pending`.

2. **Decide Request in Browser**:
   - Navigate to `http://localhost:3000/erp2/requests`.
   - Select filter **Status: Pending**. Locate the newly created request for `SKU-0003` (or existing `PR-0001`).
   - Click the green **Approve** button on the row.
   - **Verification**: The request status badge transitions from `pending` (amber) to `approved` (green). Notice that Approve/Reject buttons disappear, ensuring decisions are immutable.

---

## Step 3: Convert Approved Request to Purchase Order (ERP2-B3)

**Objective**: Verify converting an approved purchase request into a draft purchase order with vendor selection.

1. Locate the approved request `PR-0002` (or the request approved in Step 2).
2. Click the **Create PO** button on the approved row.
3. In the vendor selection modal:
   - Select Supplier: `SUP-0001 (Precision Display Panels Ltd)`
   - Confirm unit price and required delivery date.
   - Click **Convert to PO**.
4. **Verification**:
   - Request status transitions to `converted` (blue badge).
   - An alert appears with the newly created Purchase Order ID (e.g. `PO-0005`).
   - Clicking the link navigates directly to the new draft purchase order.

---

## Step 4: Purchase Order Review, Dispatch & Printable View (ERP2-C1, C2, C3)

**Objective**: Verify purchase order multi-item line configuration, running ₹ total computation, send dispatch state machine, and print stylesheet.

1. **Inspect Purchase Order**:
   - Navigate to `http://localhost:3000/erp2/orders`.
   - Open draft order `PO-0004` (or newly created PO).
   - Verify line items:
     - `SKU-0101` (Display Panel 55 inch) × 100 @ ₹12,500 = ₹12,50,000
     - Running total displays accurately formatted with Indian numbering: `₹12,50,000`.
2. **Send Purchase Order**:
   - Click the blue **Send PO to Supplier** button.
   - **Verification**:
     - Order status transitions from `draft` to `sent`.
     - Timestamp `sent_at` is stamped.
     - Notice that item editing and delete controls are now locked (editing a sent order is strictly rejected with `400 Bad Request`).
3. **Print-Friendly View**:
   - Click the **Print View** button.
   - A clean, professional PO layout opens with company header, vendor GSTIN, line item table, and authorized signature block.
   - When printing (`Ctrl+P` / `Cmd+P`), confirm the app navigation sidebar is hidden via `@media print`.

---

## Step 5: Goods Receipt (GRN) & Downstream Stock/Ledger Handoff (ERP2-D1, D2, D3)

**Objective**: Verify physical shipment intake at warehouse `WH-01`, over-delivery validation, stock increment in ERP-1, and financial ledger debit in ERP-5.

1. **Receive Shipment**:
   - Navigate to `http://localhost:3000/erp2/receipts`.
   - Select sent purchase order `PO-0001` (`SUP-0001`, expected 100 units of `SKU-0101`).
   - In the **Received Now** input field, enter `100`.
   - Received By: `EMP-0009` (Arjun Das, Warehouse Manager).
   - Destination Warehouse: `WH-01` (Mumbai).
   - Click **Submit Goods Receipt**.
2. **Verify Receipt State**:
   - Goods Receipt Note `GRN-0001` is issued.
   - Purchase order `PO-0001` status updates to `received` (or `partially_received` if quantity was less than ordered).
3. **Verify Downstream Side Effects (Cross-Team Integration Rows 14 & 15)**:
   - **ERP-1 Stock Check**: Warehouse `WH-01` inventory for `SKU-0101` increments by +100 units via `POST /api/stock/adjust`.
   - **ERP-5 Ledger Check**: General ledger records a commercial purchase debit entry of `₹12,50,000` via `POST /api/ledger/auto` with reference `GRN-0001`.
