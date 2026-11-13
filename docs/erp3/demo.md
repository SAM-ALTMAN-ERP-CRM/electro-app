# Team ERP-3: 5-Step Module Demo Script

This 5-step walkthrough demonstrates the complete **Team ERP-3 (Production & Quality)** flow from Bill of Materials shortage detection through work order execution, quality control gating, and finished goods posting using Section 5 shared contract IDs.

---

## Prerequisites & Shared Seed IDs

- **Backend Service URL**: `http://localhost:5203`
- **Frontend UI URL**: `http://localhost:3000/erp3`
- **Test User / Role**: `admin@demo.com` / `demo123` (roles: `admin`, `warehouse`)
- **Shared Section 5 IDs Used**:
  - **Finished Goods**: `SKU-0001` (55-Inch LED Smart TV), `SKU-0003` (65-Inch OLED TV)
  - **Components**: `SKU-0101` (Display Panel), `SKU-0102` (Main Board), `SKU-0103` (Power Supply Unit), `SKU-0104` (Remote Control), `SKU-0105` (Packaging Box)
  - **Warehouse**: `WH-01`
  - **Service Engineers / QC Inspectors**: `EMP-0005`, `EMP-0006`, `EMP-0007`
  - **Downstream Customer Context**: `CUST-0001` (via ERP-4 shortage work orders)

> **Tip**: Export a valid JWT token as `TOKEN` before running `curl` commands (or run with `AUTH_REQUIRED=false` in local development).

---

## Step 1: BOM Material Requirements & Shortage Purchase Request

### Goal
Verify that BOM requirements scale with production quantity, detect a `SKU-0102` shortage for 20 units of `SKU-0001`, and raise a purchase request in **ERP-2**.

### UI Flow
1. Open `http://localhost:3000/erp3/boms/BOM-0001`.
2. Enter **Production Quantity** = `20` and click **Check Materials**.
3. Observe `SKU-0102` (Main Board) highlighted in red with shortfall `8`, while `SKU-0101`, `SKU-0103`, `SKU-0104`, and `SKU-0105` show green `✓ Available`.
4. Click **Request purchase** on the `SKU-0102` row; verify the badge changes to `Purchase requested`.

### API Verification
```bash
# 1. Check scaled requirements for 20 units of BOM-0001 (SKU-0001)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5203/api/boms/BOM-0001/requirements?qty=20"

# 2. Trigger shortage purchase request to ERP-2
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sku":"SKU-0102","product_name":"Main Board","quantity":8,"requested_by":"ERP-3 production","reason":"Work order shortage"}' \
  "http://localhost:5203/api/boms/BOM-0001/purchase-request"
```

---

## Step 2: Create a Work Order & Auto-Fill Materials

### Goal
Create a work order (including ERP-4 shortage-style creation without `bom_id`) and confirm `work_order_materials` is populated automatically.

### UI Flow
1. Open `http://localhost:3000/erp3/work-orders`.
2. In the create form, select `BOM-0001 (SKU-0001)`, enter quantity `5`, set dates, and submit.
3. Click **Start** on the newly created `planned` row to move it to `in_progress`.

### API Verification
```bash
# Shortage-style work order creation (called by ERP-4 when CUST-0001 order is short)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_sku":"SKU-0001","quantity":5,"source":"shortage"}' \
  "http://localhost:5203/api/work-orders"

# Move work order WO-0001 from planned -> in_progress
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' \
  "http://localhost:5203/api/work-orders/WO-0001/status"
```

---

## Step 3: Issue Raw Materials from Warehouse `WH-01`

### Goal
Issue all 5 components (`SKU-0101` to `SKU-0105`) for the work order, verify over-issuance is blocked (`400`), and confirm ERP-1 stock adjustment is called.

### UI Flow
1. Open `http://localhost:3000/erp3/work-orders/WO-0001`.
2. Notice the **Post Finished Goods to Inventory (WH-01)** button is disabled until all materials are 100% issued.
3. Enter the required quantity for each component (`SKU-0101` through `SKU-0105`) and click **Issue**.
4. Verify the **Material Issue History** table updates immediately.

### API Verification
```bash
# Issue 50 units of SKU-0101 to WO-0001 (deducts from WH-01 in ERP-1)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"component_sku":"SKU-0101","qty":50}' \
  "http://localhost:5203/api/work-orders/WO-0001/issue"

# Verify issue history log
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5203/api/work-orders/WO-0001/issues"
```

---

## Step 4: Quality Control Inspection & Quality Gate

### Goal
Record a QC inspection with engineer `EMP-0005`, verify automatic result calculation (`pass` / `rework` / `fail`), and check the QC summary & work order gate.

### UI Flow
1. Open `http://localhost:3000/erp3/qc`.
2. Submit an inspection for `WO-0001` with Inspector `EMP-0005`, Checked `50`, Passed `50`, Failed `0`.
3. Verify the row appears with a green `pass` badge and the **QC Summary** card updates pass rate and defect reason bars.

### API Verification
```bash
# 1. Submit QC inspection (EMP-0005)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wo_id":"WO-0001","inspector":"EMP-0005","checked_qty":50,"passed_qty":50,"failed_qty":0}' \
  "http://localhost:5203/api/qc"

# 2. Check work order QC gate status (allowed: true)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5203/api/work-orders/WO-0001/qc-status"

# 3. View overall QC summary & defect counts
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5203/api/qc/summary"
```

---

## Step 5: Post Finished Goods to Inventory (`WH-01`)

### Goal
Confirm that posting is blocked if materials are missing or QC failed, and succeeds once all materials are issued and QC allows it — adding finished stock + serials in **ERP-1** and completing the work order.

### UI Flow
1. Return to `http://localhost:3000/erp3/work-orders/WO-0001`.
2. Confirm both **1. Quality Inspection Gate** (`✓ QC Passed`) and **2. Material Issuance Gate** (`✓ All Materials 100% Issued`) are green.
3. Click **Post Finished Goods to Inventory (WH-01)**.
4. Verify the work order status updates to `completed`.

### API Verification
```bash
# Post finished goods (adds +quantity for SKU-0001 in WH-01 & generates serials in ERP-1)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5203/api/work-orders/WO-0001/post-finished"
```
