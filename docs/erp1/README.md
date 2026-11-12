# Team ERP-1: Inventory & Warehouses

Welcome to the documentation for **Team ERP-1 (Inventory & Warehouses)**. ERP-1 is the central inventory authority for the Electro App monorepo, maintaining the SKU master catalog, multi-warehouse stock allocations, stock movement audit trails, serial number lifecycle tracking, and automated low-stock reorder triggers.

---

## 1. Module Overview & Architecture

- **Domain**: Inventory Master, Multi-Warehouse Stock, Serial/Batch Tracking, Low-Stock Alerts, Reorder Automation
- **Backend Service**: `services/erp1/` (Node.js 18+ Express)
- **Port**: `5201` (`/svc/erp1` Vite proxy prefix)
- **Database**: `erp1_db` (PostgreSQL)
- **Frontend Module**: `frontend/src/modules/erp1/` (`id: 'erp1'`, Title: `Inventory`)
- **Allowed Roles**: `admin`, `warehouse`, `sales`
- **Order-to-Cash Workflow**: Steps 4 & 5 of 9 (Product Catalog Master, Multi-Warehouse Stock & Serial Allocation)

---

## 2. Core Responsibilities

1. **Product (SKU) Master**: Maintains active products and component catalog (`SKU-0001` through `SKU-0015` and `SKU-0101` through `SKU-0105`) with categories (TV, Audio, Mobile accessory, Appliance, Component), pricing in INR, tax rates, and reorder levels.
2. **Multi-Warehouse Stock**: Tracks stock quantities partitioned across regional distribution centers (`WH-01` Mumbai Central, `WH-02` Delhi Regional, `WH-03` Bengaluru Hub).
3. **Inventory Transfers & Movements**: Executes atomic multi-warehouse stock transfers inside PostgreSQL transactions and maintains immutable stock movement logs (`stock_movements`).
4. **Serial & Batch Lifecycle Management**: Tracks individual unit serials (`TV55-2611-0001`..`0030`) through lifecycle states: `in_stock` → `reserved` → `sold` → `returned` → `in_stock`.
5. **Low-Stock Detection & Reorder Calculation**: Automatically monitors inventory against defined `reorder_level` thresholds, flags shortfalls, prevents duplicate alerts, and computes optimal suggested reorder quantities:
   $$\text{Suggested Order Qty} = \max(1, (\text{reorder\_level} \times 2) - \text{current\_stock})$$
6. **Cross-Team Procurement Integration**: Dispatches automated purchase requests to **Team ERP-2 (Procurement)** when inventory falls below critical levels.

---

## 3. REST API Endpoint Reference

All endpoints are mounted at `/api` and require authentication (JWT Bearer token) via `requireAuth`.

| Method | Endpoint | Description | Auth Roles |
|---|---|---|---|
| `GET` | `/api/health` | Service health status check | Public |
| `GET` | `/api/products` | Lists products with optional `?category=` and `?q=` search filters | `admin`, `warehouse`, `sales` |
| `POST` | `/api/products` | Creates a new product SKU with duplicate name check (409) | `admin`, `warehouse` |
| `GET` | `/api/products/:id` | Fetches single product details | `admin`, `warehouse`, `sales` |
| `GET` | `/api/products/:id/price` | Returns base price, tax rate (18%), and gross price with tax | `admin`, `warehouse`, `sales` |
| `PUT` | `/api/products/:id/reorder-level` | Updates product reorder threshold | `admin`, `warehouse` |
| `GET` | `/api/stock?sku=` | Returns stock breakdown per warehouse and total available stock | `admin`, `warehouse`, `sales` |
| `GET` | `/api/stock/check?sku=&qty=` | Verifies if requested quantity is available across warehouses | `admin`, `warehouse`, `sales` |
| `POST` | `/api/stock/adjust` | Adjusts warehouse quantity and records movement log | `admin`, `warehouse` |
| `POST` | `/api/transfers` | Executes atomic transfer between warehouses (`from_wh` to `to_wh`) | `admin`, `warehouse` |
| `POST` | `/api/serials/bulk` | Generates sequential serial numbers for manufactured batches | `admin`, `warehouse` |
| `GET` | `/api/serials?sku=&status=` | Lists serial numbers filtered by SKU and status | `admin`, `warehouse`, `sales` |
| `GET` | `/api/serials/:serial` | Fetches serial detail by serial number | `admin`, `warehouse`, `sales` |
| `POST` | `/api/serials/allocate` | Allocates requested quantity of `in_stock` serials and marks them `reserved` | `admin`, `warehouse`, `sales` |
| `PATCH` | `/api/serials/:serial/status` | Transitions serial status (`in_stock`→`reserved`→`sold`→`returned`) | `admin`, `warehouse` |
| `GET` | `/api/alerts/low-stock` | Returns products at or below reorder level with shortfall and suggested reorder qty | `admin`, `warehouse`, `sales` |
| `POST` | `/api/alerts/scan` | Scans inventory; generates alerts without creating duplicates | `admin`, `warehouse` |
| `GET` | `/api/alerts?acknowledged=` | Lists stock alerts (defaults to unacknowledged/open alerts) | `admin`, `warehouse`, `sales` |
| `PATCH` | `/api/alerts/:id/ack` | Acknowledges an alert (`acknowledged = true`), archiving it from open list | `admin`, `warehouse` |
| `GET` | `/api/inventory/summary` | Summary analytics: Total SKUs, Low-Stock items, Out-of-Stock items | `admin`, `warehouse`, `sales` |
| `POST` | `/api/alerts/purchase-request` | Triggers procurement purchase request in ERP-2 via `callService()` | `admin`, `warehouse` |

---

## 4. Cross-Team Integration Contracts (Section 7)

ERP-1 actively interacts with and provides inventory services to multiple teams across the monorepo:

### Inbound Callers (Other Teams calling ERP-1):
- **Row 2**: CRM-1 (Quotes) & CRM-4 (Catalog) call `GET /api/products` to fetch current catalog prices and tax rates.
- **Row 14**: ERP-2 (Goods Receipt) calls `POST /api/stock/adjust` upon receiving supplier shipments.
- **Row 16**: ERP-3 (Production) calls `GET /api/stock/check` before scheduling manufacturing work orders.
- **Row 18**: ERP-3 (Finished Goods) calls `POST /api/stock/adjust` (+units) and `POST /api/serials/bulk` after manufacturing.
- **Row 20**: ERP-4 (Order Processing) calls `GET /api/stock/check` during sales order validation.
- **Row 22**: ERP-4 (Order Fulfillment) calls `POST /api/serials/allocate` to reserve serials for dispatch.
- **Row 23**: ERP-4 (Order Dispatch) calls `POST /api/stock/adjust` (-units) and `PATCH /api/serials/:serial/status` (`sold`).
- **Row 25**: ERP-4 (RMA Restock) calls `PATCH /api/serials/:serial/status` (`returned` → `in_stock`) and `POST /api/stock/adjust` (+1).

### Outbound Calls (ERP-1 calling Other Teams):
- **Row 13**: ERP-1 calls ERP-2 `POST /api/purchase-requests` via `callService('erp2', '/api/purchase-requests', { mock: 'purchase-request' })` when inventory levels trigger automated replenishment.

---

## 5. Local Setup & Verification

```bash
# 1. Install dependencies
npm install

# 2. Run automated syntax smoke tests
npm run smoke

# 3. Build frontend bundle
npm run build

# 4. Run ERP-1 automated unit test suite
node --test services/erp1/tests/alerts.test.js

# 5. Start all services and frontend shell
npm run dev
```

Frontend UI is accessible at `http://localhost:3000/erp1/alerts`.
Backend service runs on `http://localhost:5201/api`.
