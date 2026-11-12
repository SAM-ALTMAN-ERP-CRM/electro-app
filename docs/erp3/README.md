# Team ERP-3: Production & Quality

Welcome to the documentation for **Team ERP-3 (Production & Quality)**. ERP-3 manages Bill of Materials (BOMs), material availability and shortage procurement triggers, manufacturing work orders, raw material issuance, quality control inspections, and finished goods inventory posting for the Electro App monorepo.

---

## 1. Module Overview & Architecture

- **Domain**: Bill of Materials (BOM), Material Requirements, Manufacturing Work Orders, Material Issuance, Quality Control (QC), Finished Goods Posting
- **Backend Service**: `services/erp3/` (Node.js 18+ Express)
- **Port**: `5203` (`/svc/erp3` Vite proxy prefix)
- **Database**: `erp3_db` (PostgreSQL)
- **Frontend Module**: `frontend/src/modules/erp3/` (`id: 'erp3'`, Title: `Production`)
- **Allowed Roles**: `admin`, `warehouse`
- **Order-to-Cash Workflow**: Step 4 of 9 (Production Planning, Assembly Line Execution & Quality Gate)

---

## 2. Core Responsibilities

1. **Bill of Materials (BOMs)**: Defines multi-component recipes for finished goods (`SKU-0001` 55-Inch LED Smart TV, `SKU-0003` 65-Inch OLED TV) using shared component SKUs (`SKU-0101` to `SKU-0105`).
2. **Material Requirement & Shortage Procurement**: Scales BOM quantities for target batch sizes, checks live stock availability with **ERP-1 (Inventory)**, and raises purchase requests in **ERP-2 (Procurement)** for any component shortfalls.
3. **Work Order Lifecycle**: Manages production orders (`WO-0001`+) through `planned` -> `in_progress` -> `completed` (or `cancelled` from `planned`), automatically copying BOM requirements into `work_order_materials`. Supports shortage-triggered creation from **ERP-4 (Orders & Dispatch)** using only `{ product_sku, quantity, source: "shortage" }`.
4. **Raw Material Issuance**: Tracks component issues from `WH-01` against `work_order_materials`, enforces `issued_qty <= required_qty`, and deducts component stock in **ERP-1**.
5. **Quality Control (QC) & Quality Gate**: Records batch inspections (`pass`, `rework`, `fail` when failed > 20% of checked), computes defect summaries, and gates finished goods posting (`GET /api/work-orders/:id/qc-status`).
6. **Finished Goods Posting**: Blocks completion until all materials are 100% issued and QC allows it, then adds finished stock (`+quantity` in `WH-01`) and generates bulk serial numbers in **ERP-1**.

---

## 3. How to Run & Verify

### Database & Service Setup
Ensure `.env` defines `PORT=5203` and `DATABASE_URL` (pointing to `erp3_db`), then load the schema and seed data:

```bash
# Load schema and seed data (re-runnable)
psql "$DATABASE_URL" -f services/erp3/db/schema.sql
psql "$DATABASE_URL" -f services/erp3/db/seed.sql

# Start ERP-3 service (from repo root or services/erp3)
npm --prefix services/erp3 start
```

### Run Automated Tests & Frontend Build
```bash
# Run ERP-3 backend unit tests (73 tests across 23 suites)
npm --prefix services/erp3 test

# Build the shared React frontend
npm --prefix frontend run build
```

---

## 4. Frontend Routes (`frontend/src/modules/erp3/index.jsx`)

All pages are registered under `/erp3` for roles `['admin', 'warehouse']`:

| Path | Component | Purpose |
|---|---|---|
| `/erp3` | `OverviewPage` | Production & Quality dashboard overview |
| `/erp3/boms` | `BOMsPage` | List all Bills of Materials |
| `/erp3/boms/new` | `BOMNewPage` | Create a new BOM with component rows |
| `/erp3/boms/:id` | `BOMDetailPage` | View BOM components, check stock availability, and request purchases |
| `/erp3/work-orders` | `WorkOrdersPage` | List work orders, create new orders, and transition statuses |
| `/erp3/work-orders/:id` | `WorkOrderDetailPage` | Issue materials, view issue logs, check QC gate, and post finished goods |
| `/erp3/qc` | `QCPage` | Log QC inspections, view defect summary bars, and pass rates |

---

## 5. REST API Endpoint Reference

All routes are mounted under `/api` and protected with `requireAuth`. Full request/response schemas are documented in [api.md](./api.md).

### Bills of Materials (BOMs)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/boms` | List BOMs (optional `?product_sku=`) |
| `POST` | `/api/boms` | Create a BOM header and component items in one transaction |
| `GET` | `/api/boms/:id` | Get a single BOM with its component items |
| `GET` | `/api/boms/:id/requirements?qty=` | Scale component requirements by `qty` and check ERP-1 stock |
| `POST` | `/api/boms/:id/purchase-request` | Forward component shortage request to ERP-2 Procurement |

### Work Orders & Material Issuance
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/work-orders` | List work orders (optional `?status=&source=`) |
| `POST` | `/api/work-orders` | Create work order (supports `{ product_sku, quantity, source: "shortage" }`) and auto-fill materials |
| `GET` | `/api/work-orders/:id` | Get work order details including `materials` |
| `PATCH` | `/api/work-orders/:id/status` | Transition status (`planned` -> `in_progress` -> `completed`, or `planned` -> `cancelled`) |
| `DELETE` | `/api/work-orders/:id` | Delete a `planned` work order |
| `POST` | `/api/work-orders/:id/issue` | Issue component quantity from `WH-01` and deduct ERP-1 stock |
| `GET` | `/api/work-orders/:id/issues` | List material issue history for a work order |
| `POST` | `/api/work-orders/:id/post-finished` | Verify materials + QC gate, add finished stock & serials in ERP-1, and mark `completed` |

### Quality Control (QC)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/qc` | List QC checks (optional `?wo_id=`) |
| `POST` | `/api/qc` | Record a QC check (`passed + failed = checked`; auto-computes `pass`/`rework`/`fail`) |
| `GET` | `/api/qc/:id` | Get a single QC check |
| `GET` | `/api/qc/summary` | Overall pass rate %, per-product pass rates, and defect reason counts |
| `GET` | `/api/work-orders/:id/qc-status` | Quality gate check (`{ allowed: true/false }`) |

---

## 6. Cross-Team Integration Contracts

### Teams ERP-3 Calls (`callService`)
| Target Team | Endpoint | Trigger | Mock File / Fallback |
|---|---|---|---|
| **ERP-1** (Inventory) | `GET /api/stock/check?sku=&qty=` | BOM material requirement check (`ERP3-A3`) | `stock-check` |
| **ERP-1** (Inventory) | `POST /api/stock/adjust` | Negative delta on material issue (`ERP3-C1`); positive delta in `WH-01` on finished posting (`ERP3-C3`) | `stock-adjust` |
| **ERP-1** (Inventory) | `POST /api/serials/bulk` | Bulk serial generation (`batch_no: wo_id`) on finished goods posting (`ERP3-C3`) | `serials-bulk` |
| **ERP-2** (Procurement) | `POST /api/purchase-requests` | Shortage purchase request button on BOM detail (`ERP3-A3`) | `purchase-request` |

### Teams That Call ERP-3
| Caller Team | Endpoint Called | Purpose |
|---|---|---|
| **ERP-4** (Orders & Dispatch) | `POST /api/work-orders` | Triggers shortage manufacturing order `{ product_sku, quantity, source: "shortage" }` when sales order stock reservation is short (`ERP4-B3` -> `ERP3-B3`) |

---

## 7. Team Standup & Folder Boundary Checklist

- **Folder Boundaries**: All ERP-3 changes remain strictly inside `services/erp3/`, `frontend/src/modules/erp3/`, and `docs/erp3/`.
- **Module Registration**: Every page is registered in `frontend/src/modules/erp3/index.jsx` under `/erp3` with `roles: ['admin', 'warehouse']` (no standalone `BrowserRouter` or navbar).
- **Shared Helpers**: Frontend uses `api('erp3', ...)` (no `localhost` or raw `fetch`); backend uses `requireAuth` and `callService()`.
- **Documentation**: ER diagram (`er-diagram.md`), API spec (`api.md`), Postman collection (`erp3-postman-collection.json`), wireframes (`wireframes/`), and QA test cases (`tests.md`) are maintained in `docs/erp3/`.
