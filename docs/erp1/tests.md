# QA Test Cases & Cross-Team Verification Matrix — Team ERP-1 (Inventory & Warehouses)

**Team**: ERP-1 Inventory and Warehouses  
**Service Port**: `5201` (`services/erp1`) | **Database**: `erp1_db`  
**Frontend Module**: `frontend/src/modules/erp1`  
**QA & Docs Owner (Role R4)**: `@Samarth-ITM`

---

## 1. Test Cases per Build Issue (Minimum 3 per Issue)

| ID | Issue Key | Steps | Expected Result | Actual Result | Pass/Fail |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-ERP1-A1-01** | `[ERP1-A1]` | `POST /api/products` with price `<= 0` | Returns `400 Bad Request` with "price must be above 0" | Returned 400 error cleanly | **PASS** |
| **TC-ERP1-A1-02** | `[ERP1-A1]` | `POST /api/products` with duplicate product name | Returns `409 Conflict` duplicate name rejection | Returned 409 conflict | **PASS** |
| **TC-ERP1-A1-03** | `[ERP1-A1]` | `GET /api/products?category=TV&q=OLED` | Returns filtered product matching `SKU-0003` 65-inch OLED TV | Filtered array with SKU-0003 | **PASS** |
| **TC-ERP1-A2-01** | `[ERP1-A2]` | Navigate to `/erp1/products` in browser | Table displays 20 catalog products with prices formatted in INR (`₹`) | Product table renders with ₹ formatting | **PASS** |
| **TC-ERP1-A2-02** | `[ERP1-A2]` | Type "Soundbar" in search filter box | Real-time filter displays `SKU-0004` and `SKU-0005` | Table updates with filtered results | **PASS** |
| **TC-ERP1-A2-03** | `[ERP1-A2]` | Click "Deactivate" button on product | Sets `active: false`; status badge updates to red `inactive` | Product deactivated cleanly | **PASS** |
| **TC-ERP1-A3-01** | `[ERP1-A3]` | Run `npm run db:setup` or verify seed data | Loads exactly 15 products `SKU-0001..0015` and 5 components `SKU-0101..0105` | 20 seed products verified | **PASS** |
| **TC-ERP1-A3-02** | `[ERP1-A3]` | `GET /api/products/SKU-0001/price` | Returns `{ price: "42990.00", tax_rate: 18, price_with_tax: "50728.20" }` | Returns correct base price and tax | **PASS** |
| **TC-ERP1-A3-03** | `[ERP1-A3]` | Click "Export CSV" on `/erp1/products` page | Downloads `products_catalog_YYYY-MM-DD.csv` with catalog details | CSV file downloaded with proper headers | **PASS** |
| **TC-ERP1-B1-01** | `[ERP1-B1]` | `POST /api/stock/adjust` with `{ sku: 'SKU-0001', warehouse_id: 'WH-01', delta: +10, reason: 'Cycle count' }` | Updates stock and appends audit row in `stock_movements` | Stock updated and movement logged | **PASS** |
| **TC-ERP1-B1-02** | `[ERP1-B1]` | `POST /api/stock/adjust` with negative delta driving quantity below 0 | Rejects with `400 Bad Request` ("Stock cannot be negative") | Returned 400 error cleanly | **PASS** |
| **TC-ERP1-B1-03** | `[ERP1-B1]` | `GET /api/stock?sku=SKU-0003` | Returns stock per warehouse (`WH-01: 2, WH-02: 1, WH-03: 0`) and total `3` | Total stock equals 3 (Section 5 rule) | **PASS** |
| **TC-ERP1-B2-01** | `[ERP1-B2]` | Navigate to `/erp1/stock` in browser | Matrix table renders SKU, Name, columns for WH-01, WH-02, WH-03, and Total | Stock matrix loaded correctly | **PASS** |
| **TC-ERP1-B2-02** | `[ERP1-B2]` | Fill and submit "Adjust stock" form on UI | Live table updates quantity; toast notification displays success | Table refreshed with updated total | **PASS** |
| **TC-ERP1-B2-03** | `[ERP1-B2]` | Navigate to `/erp1/movements` in browser | History table shows newest movements first with delta badges (`+10`, `-5`) | History listed in descending order | **PASS** |
| **TC-ERP1-B3-01** | `[ERP1-B3]` | `POST /api/transfers` `{ sku: 'SKU-0001', from_wh: 'WH-01', to_wh: 'WH-02', qty: 5 }` | Deducts 5 from WH-01, adds 5 to WH-02, logs 2 movement rows | Both updates executed in single tx | **PASS** |
| **TC-ERP1-B3-02** | `[ERP1-B3]` | `POST /api/transfers` with `qty` exceeding source warehouse stock | Rejects with `400 Bad Request` and rolls back transaction completely | Zero stock altered, returned 400 | **PASS** |
| **TC-ERP1-B3-03** | `[ERP1-B3]` | `GET /api/stock/check?sku=SKU-0001&qty=50` | Returns `{ available: true, total: 75 }` | Correct availability flag returned | **PASS** |
| **TC-ERP1-C1-01** | `[ERP1-C1]` | `POST /api/serials/bulk` `{ sku: 'SKU-0001', batch_no: 'B1', count: 5, prefix: 'TV55-TEST-' }` | Generates 5 sequential unique serial numbers | 5 unique serial rows created | **PASS** |
| **TC-ERP1-C1-02** | `[ERP1-C1]` | `GET /api/serials?sku=SKU-0001&status=sold` | Returns serials `TV55-2611-0001` through `TV55-2611-0005` | 5 sold serials returned | **PASS** |
| **TC-ERP1-C1-03** | `[ERP1-C1]` | `GET /api/serials/TV55-2611-0006` | Returns detail record with status `in_stock` and warehouse `WH-01` | Serial detail record returned | **PASS** |
| **TC-ERP1-C2-01** | `[ERP1-C2]` | Navigate to `/erp1/serials` in browser | Table displays serials with status filter dropdown and serial search box | Serials list and filters rendered | **PASS** |
| **TC-ERP1-C2-02** | `[ERP1-C2]` | Search for `TV55-2611-0003` in search box | Filters table directly to matching record showing `sold` status badge | Filtered to exact serial match | **PASS** |
| **TC-ERP1-C2-03** | `[ERP1-C2]` | Generate serials via UI form on `/serials` | Submits bulk request and refreshes serials table with newly generated rows | New serials rendered in table | **PASS** |
| **TC-ERP1-C3-01** | `[ERP1-C3]` | `PATCH /api/serials/TV55-2611-0006/status` to `reserved` | Status changes to `reserved` (allowed move) | Status updated with 200 OK | **PASS** |
| **TC-ERP1-C3-02** | `[ERP1-C3]` | `PATCH /api/serials/TV55-2611-0007/status` from `in_stock` directly to `sold` | Rejects with `400 Bad Request` ("Illegal status transition") | Transition blocked with 400 | **PASS** |
| **TC-ERP1-C3-03** | `[ERP1-C3]` | `POST /api/serials/allocate` `{ sku: 'SKU-0001', qty: 2 }` | Returns 2 serials and marks them `reserved` | 2 serials reserved and returned | **PASS** |
| **TC-ERP1-D1-01** | `[ERP1-D1]` | `GET /api/alerts/low-stock` | Returns items with stock <= reorder level (`SKU-0003` stock 3, `SKU-0102` stock 4) | Correct low items identified | **PASS** |
| **TC-ERP1-D1-02** | `[ERP1-D1]` | `POST /api/alerts/scan` twice consecutively (Acceptance Criteria) | First scan creates alerts; second scan creates zero duplicate records | Zero duplicates generated on scan 2 | **PASS** |
| **TC-ERP1-D1-03** | `[ERP1-D1]` | `PATCH /api/alerts/:id/ack` (Acceptance Criteria) | Sets `acknowledged: true`; subsequent `GET /api/alerts` hides the alert | Alert archived from open list | **PASS** |
| **TC-ERP1-D2-01** | `[ERP1-D2]` | Navigate to `/erp1/alerts` in browser | Displays red alert banner with open alert count and low-stock table | Banner and open count rendered | **PASS** |
| **TC-ERP1-D2-02** | `[ERP1-D2]` | Click "Run Scan" button on `/erp1/alerts` UI | Triggers scan; displays scan result banner and updates table | Scan executed and alerts displayed | **PASS** |
| **TC-ERP1-D2-03** | `[ERP1-D2]` | Click "Acknowledge" on row in alerts table | Removes row from table and decrements open alerts counter | Row removed and counter updated | **PASS** |
| **TC-ERP1-D3-01** | `[ERP1-D3]` | Check suggested order qty formula `(reorder_level * 2) - stock` | For `SKU-0003` (reorder 10, stock 3): evaluates to `(10*2) - 3 = 17` | Suggested qty is exactly 17 | **PASS** |
| **TC-ERP1-D3-02** | `[ERP1-D3]` | Click "Reorder" button on `/erp1/alerts` UI | Posts purchase request to ERP-2 and shows confirmation with request ID | Purchase request created (PR-0001) | **PASS** |
| **TC-ERP1-D3-03** | `[ERP1-D3]` | `GET /api/inventory/summary` KPI metrics | Returns `{ total_skus: 20, low_stock_count: 2, out_of_stock_count: 0 }` | KPI cards match database totals | **PASS** |

---

## 2. Cross-Team Integration Table Verification (Section 7 Rows)

The following rows in the cross-team contract table involve Team ERP-1 as either the **Caller** or **Provider**. All checks verified with `USE_MOCKS=false`:

| Row # | Caller Issue | Caller Team | Target Endpoint | Provider Team & Issue | Verified Contract Payload / Response | Verification Status |
| :---: | :---: | :---: | :---: | :---: | :--- | :---: |
| **2** | `CRM1-C2`, `CRM4-B4` | CRM-1 / CRM-4 | `GET /api/products` | ERP-1 (`ERP1-A1`) | Returns products catalog with `price`, `tax_rate: 18`, and active status | **VERIFIED (PASS)** |
| **13** | `ERP1-D3` | ERP-1 (Inventory) | `POST /api/purchase-requests` | ERP-2 (`ERP2-B1`) | Dispatches `{ sku, product_name, quantity, requested_by: 'ERP-1 low stock', reason }` | **VERIFIED (PASS)** |
| **14** | `ERP2-D1` | ERP-2 (Procurement) | `POST /api/stock/adjust` | ERP-1 (`ERP1-B1`) | Adjusts stock upon Goods Receipt with positive quantity delta | **VERIFIED (PASS)** |
| **16** | `ERP3-A3` | ERP-3 (Production) | `GET /api/stock/check?sku=&qty=` | ERP-1 (`ERP1-B3`) | Returns `{ available: true/false, total }` for component availability | **VERIFIED (PASS)** |
| **18** | `ERP3-C1`, `ERP3-C3` | ERP-3 (Production) | `POST /api/stock/adjust`, `POST /api/serials/bulk` | ERP-1 (`ERP1-B1`, `ERP1-C1`) | Deducts raw materials, adds finished goods stock, and generates serials | **VERIFIED (PASS)** |
| **20** | `ERP4-B1` | ERP-4 (Sales Orders) | `GET /api/stock/check?sku=&qty=` | ERP-1 (`ERP1-B3`) | Verifies warehouse stock before order confirmation | **VERIFIED (PASS)** |
| **22** | `ERP4-C1` | ERP-4 (Dispatch) | `POST /api/serials/allocate` | ERP-1 (`ERP1-C3`) | Allocates available `in_stock` serials and marks them `reserved` | **VERIFIED (PASS)** |
| **23** | `ERP4-C3` | ERP-4 (Dispatch) | `POST /api/stock/adjust`, `PATCH /api/serials/:serial/status` | ERP-1 (`ERP1-B1`, `ERP1-C3`) | Deducts physical inventory (-units) and transitions serial to `sold` | **VERIFIED (PASS)** |
| **25** | `ERP4-D3` | ERP-4 (Returns) | `PATCH /api/serials/:serial/status`, `POST /api/stock/adjust` | ERP-1 (`ERP1-C3`, `ERP1-B1`) | Restocks returned unit (`returned` -> `in_stock`) and increments stock (+1) | **VERIFIED (PASS)** |
