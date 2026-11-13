# ERP-4 Orders & Dispatch - 5-Step Demo Script

This script provides an interactive, reproducible 5-step demonstration of the **ERP-4 Orders & Dispatch** module for evaluators and external reviewers. It strictly utilizes the pinned master data IDs defined in Section 5 of the shared seed contract.

---

## 📌 Shared Contract Test Data Referenced

| Entity | Contract ID | Description | Role / Attribute |
|---|---|---|---|
| **Corporate Customer** | `CUST-0002` | Sunrise Electronics Pvt Ltd | Corporate (`27AABCS1234F1Z5`) |
| **Retail Customer** | `CUST-0001` | Aarav Mehta | Retail (Consumer / Unregistered) |
| **Sales Rep** | `EMP-0001` | Rohan Kulkarni | Sales Department |
| **Sales Rep** | `EMP-0002` | Neha Sharma | Sales Department |
| **Product (In Stock)** | `SKU-0001` | 55-inch 4K Smart TV | ₹42,990.00 |
| **Product (Audio)** | `SKU-0004` | Soundbar 2.1 | ₹8,990.00 |
| **Product (Low Stock)** | `SKU-0003` | 65-inch OLED TV | Shortage demo trigger |
| **Main Warehouse** | `WH-01` | Mumbai Central Facility | Primary fulfillment hub |
| **Product Serial** | `TV55-2611-0001` | Serialized 55-inch TV unit | Seeded under `SO-0001` |

---

## Step 1: Browse Sales Orders & Filter by Customer

### Objective
Demonstrate order directory browsing, real-time status badges, and multi-field query filtering.

### Action
1. Open your web browser and navigate to:
   ```text
   http://localhost:3000/erp4
   ```
2. **Observe**:
   - The orders table loads 5 seeded orders (`SO-0001` through `SO-0005`) generated from CRM-1 quotes.
   - Statuses appear as colored badges: `Dispatched` (amber), `Confirmed` (blue), `Delivered` (green).
   - All amounts are formatted in INR (`₹`) with Indian comma numbering.
3. **Filter**:
   - In the **FILTER BY CUSTOMER ID** input, type `CUST-0002` and observe the table immediately filter to show only Sunrise Electronics Pvt Ltd's order (`SO-0002`).
   - In the **FILTER BY STATUS** dropdown, select `dispatched`.
   - Click **Clear** to restore the full directory.

---

## Step 2: Create a Sales Order & Auto-Enrich Customer Details (CRM-3)

### Objective
Demonstrate creating an order with dynamic line items, automatic 18% GST calculation, duplicate quote prevention (HTTP 409), and automatic customer lookup from CRM-3.

### Action
1. Click the **+ New Order** button at the top right of `/erp4`.
2. **Select Customer**:
   - Choose `CUST-0002 - Sunrise Electronics Pvt Ltd`.
   - **Observe**: The Customer Name and 15-character GSTIN (`27AABCS1234F1Z5`) are automatically populated from CRM-3.
3. **Add Line Items**:
   - Row 1: `SKU-0001` (55-inch 4K Smart TV) · Quantity: `1` · Unit Price: `₹42,990.00`.
   - Click **+ Add Item Row**.
   - Row 2: Select `SKU-0004` (Soundbar 2.1) · Quantity: `1` · Unit Price: `₹8,990.00`.
4. **Inspect Real-Time Financial Totals**:
   - Subtotal: `₹51,980.00`
   - GST (18%): `₹9,356.40`
   - Grand Total: `₹61,336.40`
5. Click **Create Sales Order**.
   - A success banner appears confirming the creation of `SO-0006`.
   - Click the link to open `SO-0006` details page (`/erp4/orders/SO-0006`).

---

## Step 3: Lifecycle Confirmation & Stock Reservation (ERP-1 / ERP-3)

### Objective
Verify order status transition (`created` ➔ `confirmed`), lifecycle timeline stepper, and stock reservation with shortage detection.

### Action
1. On the Order Detail page (`/erp4/orders/SO-0006`):
   - Observe the **Order Lifecycle Timeline**: The `Created` stage is active.
2. Click **✓ Confirm Order**:
   - The status updates immediately to `Confirmed` with a blue badge.
   - The timeline stepper moves forward to highlight the `Confirmed` stage.
3. **Reserve Stock**:
   - Scroll to the **Stock Reservation Panel**.
   - Click **Reserve stock**.
   - ERP-4 calls ERP-1 (`GET /api/stock/check?sku=SKU-0001&qty=1` and `SKU-0004`).
   - If stock is available, items receive green `Reserved` chips.
   - If an item (such as `SKU-0003`) is low on stock, ERP-4 automatically flags a red `Shortage` chip and notifies ERP-3 (`POST /api/work-orders`) to schedule manufacturing.

---

## Step 4: Dispatch with Courier Tracking & Serial Allocation (ERP-1 / ERP-5)

### Objective
Demonstrate assigning a courier, allocating product serial numbers, and triggering order-to-cash side effects upon shipping.

### Action
1. Navigate to the Dispatch section:
   ```text
   http://localhost:3000/erp4/dispatch
   ```
2. Locate order `SO-0006` in the "Ready for Dispatch" table.
3. Click **Dispatch Order**:
   - Select Courier: `BlueDart`.
   - Enter Tracking Number: `BD-98213401`.
   - ERP-4 calls ERP-1 (`POST /api/serials/allocate`) to assign available serial number `TV55-2611-0006`.
4. Click **Mark as Shipped**:
   - Order `SO-0006` transitions to `Dispatched`.
   - **Side Effect 1**: Stock deducted in ERP-1 (`POST /api/stock/adjust`, delta: `-1`).
   - **Side Effect 2**: Serial marked `sold` in ERP-1 (`PATCH /api/serials/TV55-2611-0006/status`).
   - **Side Effect 3**: GST Invoice generated in ERP-5 (`POST /api/invoices`).
   - **Side Effect 4**: Timeline event posted to CRM-3 (`POST /api/interactions/from-event`).
5. Click **Print Dispatch Note** (`/dispatch/DSP-0006/note`):
   - Notice the clean, printable layout displaying customer address, courier tracking, and serial number bar.

---

## Step 5: Process Customer Return (RMA) & Issue Credit Note (CRM-2 / ERP-5)

### Objective
Demonstrate RMA return processing, inventory restocking to ERP-1, and credit note issuance in ERP-5.

### Action
1. Navigate to the Returns section:
   ```text
   http://localhost:3000/erp4/returns
   ```
2. **Raise a Return**:
   - Click **+ New Return**.
   - Order ID: `SO-0001`.
   - Serial Number: `TV55-2611-0001` (validated against `dispatch_serials`).
   - Reason: `Screen backlight failure`.
   - Click **Submit Return Request**.
3. **Process Return**:
   - Open the return detail page (`/erp4/returns/RET-0001`).
   - Click **Mark as Received** (status moves to `received`).
   - Click **Restock to Warehouse**:
     - ERP-4 calls ERP-1 (`POST /api/stock/adjust`, delta: `+1` at `WH-01`).
     - ERP-4 updates serial in ERP-1 (`PATCH /api/serials/TV55-2611-0001/status` to `returned` then `in_stock`).
     - ERP-4 calls ERP-5 (`POST /api/creditnotes`) with amount `₹42,990.00`.
4. **Summary Cards**:
   - Return to `/erp4/returns` and observe the summary cards updating counts for `Restocked` and reason distribution.

---

## Verification Summary Table

| Step | Verifies | Expected Result |
|---|---|---|
| **1** | Directory & Filters | Seed orders `SO-0001`..`SO-0005` load; customer filter by `CUST-0002` isolates single row. |
| **2** | Creation & CRM-3 | Multi-item order calculates 18% GST accurately; `CUST-0002` fills 15-char GSTIN. |
| **3** | Confirm & Reserve | Status advances to `confirmed`; timeline highlights step; reservations link to ERP-1/ERP-3. |
| **4** | Dispatch & Shipping | Serials allocated; ERP-1 stock reduced; commercial invoice created in ERP-5; note prints. |
| **5** | Returns & RMA | Dispatched serial verified; item restocked in ERP-1; credit note issued in ERP-5. |
