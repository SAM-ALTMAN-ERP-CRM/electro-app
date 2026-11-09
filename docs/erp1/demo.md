# Team ERP-1: 5-Step Module Demo Walkthrough

This demo script guides evaluators and cross-team reviewers through the end-to-end functionality of **Team ERP-1 (Inventory & Warehouses)** using exact Section 5 shared contract identifiers.

---

## Prerequisites & Environment Setup

Ensure the monorepo dependencies are installed and test credentials are ready:
- **Service URL**: `http://localhost:5201` (Backend) or `http://localhost:3000/erp1/alerts` (Frontend Shell)
- **Shared Test User**: `admin@demo.com` / `demo123` (or `AUTH_REQUIRED=false` during development)
- **Key Pinned Contract IDs**:
  - Products: `SKU-0001` (55" 4K Smart TV), `SKU-0003` (65" OLED TV), `SKU-0102` (Mainboard)
  - Warehouses: `WH-01` (Mumbai Central), `WH-02` (Delhi Regional), `WH-03` (Bengaluru Distribution Hub)
  - Serials: `TV55-2611-0001` through `TV55-2611-0030`
  - Cross-Team Customer References: `CUST-0001` through `CUST-0005`

---

## Step 1: Product Master & Pricing Lookup

### Purpose:
Verify that the product master catalog returns Section 5 seed products, supports search/category filtering, and correctly calculates tax (18% GST).

### Execution:
```bash
# 1. Fetch product price with GST breakdown for SKU-0001 (55-inch 4K Smart TV)
curl -s http://localhost:5201/api/products/SKU-0001/price
```

### Expected Result:
```json
{
  "data": {
    "id": "SKU-0001",
    "name": "55-inch 4K Smart TV",
    "price": "42990.00",
    "tax_rate": 18,
    "tax_amount": "7738.20",
    "price_with_tax": "50728.20"
  }
}
```

---

## Step 2: Multi-Warehouse Stock Distribution & Inter-Warehouse Transfer

### Purpose:
Verify multi-warehouse inventory breakdown and demonstrate atomic transfer between regional hubs (`WH-01` Mumbai to `WH-02` Delhi).

### Execution:
```bash
# 1. Inspect current stock distribution for SKU-0001 across warehouses
curl -s "http://localhost:5201/api/stock?sku=SKU-0001"

# 2. Execute an atomic transfer of 5 units from WH-01 (Mumbai) to WH-02 (Delhi)
curl -s -X POST http://localhost:5201/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"sku":"SKU-0001","from_wh":"WH-01","to_wh":"WH-02","qty":5}'

# 3. Test transfer validation: Reject over-transfer when source warehouse has insufficient stock
curl -s -X POST http://localhost:5201/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"sku":"SKU-0001","from_wh":"WH-03","to_wh":"WH-01","qty":9999}'
```

### Expected Result:
- `WH-01` decreases by 5, `WH-02` increases by 5, and total inventory remains constant.
- Over-transfer request is rejected with `400 Bad Request: "Insufficient stock in source warehouse WH-03"`, rolling back the transaction.

---

## Step 3: Serial Allocation & Lifecycle State Progression

### Purpose:
Verify serial tracking for `SKU-0001` and demonstrate enforcement of legal status transitions (`in_stock` → `reserved` → `sold` → `returned`).

### Execution:
```bash
# 1. Inspect initial seeded serials (TV55-2611-0001..0005 are sold, 0006..0030 are in_stock)
curl -s "http://localhost:5201/api/serials?sku=SKU-0001&status=in_stock"

# 2. Team ERP-4 calls allocation to reserve 2 units for Sales Order SO-0001
curl -s -X POST http://localhost:5201/api/serials/allocate \
  -H "Content-Type: application/json" \
  -d '{"sku":"SKU-0001","qty":2}'

# 3. Verify status progression: Transition serial TV55-2611-0006 from reserved to sold upon dispatch
curl -s -X PATCH http://localhost:5201/api/serials/TV55-2611-0006/status \
  -H "Content-Type: application/json" \
  -d '{"status":"sold"}'

# 4. Verify illegal transition rejection (e.g. attempting to jump from in_stock directly to sold)
curl -s -X PATCH http://localhost:5201/api/serials/TV55-2611-0010/status \
  -H "Content-Type: application/json" \
  -d '{"status":"sold"}'
```

### Expected Result:
- Allocation reserves 2 serials (`status: 'reserved'`).
- Legal transition to `sold` succeeds (`status: 200`).
- Illegal transition is refused with `400 Bad Request: "Invalid status transition"`.

---

## Step 4: Low-Stock Automated Scanning & Duplicate Prevention

### Purpose:
Demonstrate automated detection of low inventory (`SKU-0003` OLED TV has stock 3 <= reorder level 10; `SKU-0102` Mainboard has stock 4 <= 10). Verify that running multiple scans produces zero duplicate alert records.

### Execution:
```bash
# 1. Query low-stock detection endpoint
curl -s http://localhost:5201/api/alerts/low-stock

# 2. Run first inventory scan (creates alerts for SKU-0003 and SKU-0102)
curl -s -X POST http://localhost:5201/api/alerts/scan

# 3. Acceptance Criteria Check: Run scan a second time immediately
curl -s -X POST http://localhost:5201/api/alerts/scan

# 4. Acknowledge the alert for SKU-0003 to archive it from open view
curl -s -X PATCH http://localhost:5201/api/alerts/ALT-0001/ack

# 5. Query open alerts list
curl -s http://localhost:5201/api/alerts
```

### Expected Result:
- Step 2 creates 2 new alerts (`ALT-0001` for `SKU-0003` with shortfall 7; `ALT-0002` for `SKU-0102` with shortfall 6).
- Step 3 returns `created: [], count: 0` confirming duplicate prevention works.
- Step 4 marks `ALT-0001` acknowledged; subsequent query in Step 5 excludes `ALT-0001`.

---

## Step 5: Suggested Reorder Quantity & Cross-Team ERP-2 Purchase Request

### Purpose:
Verify that ERP-1 accurately evaluates the optimal reorder quantity using the formula:
$$\text{Suggested Order Qty} = (\text{reorder\_level} \times 2) - \text{current\_stock}$$
And trigger an automated procurement purchase request dispatched to Team ERP-2.

### Execution:
```bash
# 1. Fetch inventory summary KPI metrics
curl -s http://localhost:5201/api/inventory/summary

# 2. Verify reorder suggestion calculation for SKU-0003:
# reorder_level = 10, current_stock = 3 -> (10 * 2) - 3 = 17 units
curl -s http://localhost:5201/api/alerts/low-stock

# 3. Create purchase request for SKU-0003 sent to ERP-2 Procurement
curl -s -X POST http://localhost:5201/api/alerts/purchase-request \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "SKU-0003",
    "product_name": "65-inch OLED TV",
    "quantity": 17,
    "reason": "Automated low-stock replenishment for shortfall of 7"
  }'
```

### Expected Result:
- `GET /api/inventory/summary` returns:
  ```json
  {
    "data": {
      "total_skus": 20,
      "low_stock_count": 2,
      "out_of_stock_count": 0
    }
  }
  ```
- Reorder suggestion for `SKU-0003` is exactly `17`.
- `POST /api/alerts/purchase-request` dispatches via `callService('erp2', '/api/purchase-requests', ...)` returning HTTP 201 with created purchase request (`PR-0001`, `quantity: 17`, `status: 'pending'`).
