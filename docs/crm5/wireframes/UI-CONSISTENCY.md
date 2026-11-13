# CRM-5 Portal & Analytics — UI Consistency & Wireframe Specification

**Module**: `frontend/src/modules/crm5/` (`id: 'crm5'`, `title: 'Portal and Dashboards'`)  
**Allowed Roles**: `['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']`  
**Owner**: CRM-5 UI Owner (`[CRM5-R3]`)

---

## 1. Wireframe Inventory

All CRM-5 pages have a corresponding SVG wireframe under `docs/crm5/wireframes/`:

| Page Component | Route(s) | Sidebar Label | Wireframe |
| :--- | :--- | :--- | :--- |
| `DashboardPage.jsx` | `/crm5`, `/crm5/dashboard` | `Dashboard` | `docs/crm5/wireframes/dashboard.svg` |
| `PortalPage.jsx` | `/crm5/portal`, `/crm5/portal/home` | `Customer Portal` | `docs/crm5/wireframes/portal.svg` |
| `OrderTrackingPage.jsx` | `/crm5/portal/orders/:id`, `/crm5/orders/:id` | *(detail route)* | `docs/crm5/wireframes/order-tracking.svg` |
| `ReportsPage.jsx` | `/crm5/reports` | `Reports` | `docs/crm5/wireframes/reports.svg` |
| `ForecastPage.jsx` | `/crm5/forecast` | `Forecast` | `docs/crm5/wireframes/forecast.svg` |

---

## 2. Shared Shell & Router Rules

`frontend/src/App.jsx` owns the global layout shell and dynamically discovers every module via `./modules/*/index.jsx`.

1. **No Standalone Router or Navbar**: No file in `frontend/src/modules/crm5/` may import or render `BrowserRouter`, custom navbars, or duplicate `.sidebar` / `.top-bar` containers.
2. **Module Registration (`frontend/src/modules/crm5/index.jsx`)**:
   - Module `id` is `'crm5'`, mounted automatically under `/crm5/...`.
   - All 8 routes (`''`, `'dashboard'`, `'portal'`, `'portal/home'`, `'portal/orders/:id'`, `'orders/:id'`, `'reports'`, `'forecast'`) are registered with the 6 standard roles `['admin', 'sales', 'support', 'warehouse', 'finance', 'hr']`.
3. **API Helper Only**: All backend requests go through `import { api } from '../../../api'` (e.g., `api('crm5', '/api/...')`). Zero direct `fetch(` calls or hardcoded `localhost` URLs are permitted.

---

## 3. Shared Visual Tokens & Typography

Defined globally in `frontend/src/index.css`:

| Token / Role | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--primary` | `#2563eb` | Primary buttons, active links, progress bars, KPI highlights |
| Primary Hover | `#1d4ed8` | Hover/active button states |
| `--bg-sidebar` | `#0f172a` | App-level dark navigation sidebar (hidden in print) |
| `--bg-main` | `#f8fafc` | Page canvas background |
| `--border` | `#e2e8f0` | Card borders, table gridlines, input outlines |
| Muted Text | `#64748b` | Secondary labels, captions, empty states |
| Success | `#16a34a` | Positive KPIs, completed stages, green badges |
| Warning | `#d97706` | Pending/in-progress states, amber badges |
| Danger | `#dc2626` | Overdue/critical alerts, validation errors, red badges |

---

## 4. Standardized UI Patterns

### 4.1 Status Badges
Global utility classes in `frontend/src/index.css` standardize status pills across modules:

- `.badge-green`: Completed, delivered, paid, resolved, active, on-track targets
- `.badge-blue`: In-progress, open, dispatched, informational tags
- `.badge-amber`: Pending, warning, medium priority, under-review
- `.badge-red`: Overdue, urgent/high priority, cancelled, failed, behind-target

> **Audit Note on `PortalPage.jsx`**: `PortalPage.jsx` currently applies `badge-purple` (for `confirmed` orders and the `CRM-5` module tag) and `badge-gray` (for `closed` tickets, `low` priority, and default invoice statuses). Because `frontend/src/index.css` only defines `.badge-green`, `.badge-blue`, `.badge-red`, and `.badge-amber`, any follow-up styling polish should either map those statuses to `.badge-blue` / `.badge-amber` or rely on neutral fallback styling without modifying shared `frontend/src/index.css`.

### 4.2 Tables
- Full-width responsive containers with clear `<thead>` column headers, right-aligned numeric/currency columns, and status badges in dedicated status columns.
- Required states on every data table:
  1. **Loading state**: Explicit loading indicator text while awaiting `api('crm5', ...)`.
  2. **Empty state**: Friendly message when zero rows match filters or exist in the DB.
  3. **Error state**: Actionable error banner (never silent failure).

### 4.3 Forms & Action Buttons
- Grouped inside bordered white cards (`background: #ffffff; border: 1px solid #e2e8f0`).
- Explicit `<label>` paired with controlled inputs/selects (`CUST-0001`..`CUST-0008`, `YYYY-MM-DD` date inputs, numeric INR inputs).
- Primary submit buttons disable during async submission and surface inline validation/server messages.

### 4.4 Currency, Dates, & Shared IDs
- **Currency (INR)**: All monetary values format with `₹` and `toLocaleString('en-IN')` (2 decimal places where appropriate, e.g., `₹93,374.00`).
- **Dates**: Standardized `YYYY-MM-DD` format for API parameters (`?from=...&to=...`), forms, and table cells.
- **Section 5 Shared IDs**: Sample/seed displays follow `CUST-0001`–`CUST-0008`, `SKU-0001`–`SKU-0015`, `EMP-0001`–`EMP-0007`, and `WH-01`–`WH-03`.

---

## 5. Print Stylesheet Compliance (`@media print`)

- Global `frontend/src/index.css` (lines 189–197) hides `.sidebar`, `.top-bar`, `button`, and `.btn` under `@media print` so every CRM-5 route prints cleanly without shell chrome.
- `frontend/src/modules/crm5/pages/ReportsPage.jsx` includes scoped `@media print` rules alongside its `🖨️ Print` action button so exported reports hide navigation/controls and expand tables cleanly onto print pages.

---

## 6. Consistency Audit Checklist

- [x] Every CRM-5 page has a dedicated SVG wireframe in `docs/crm5/wireframes/`.
- [x] `frontend/src/modules/crm5/index.jsx` registers all 5 pages under `/crm5/...` with all 6 roles.
- [x] Zero `BrowserRouter`, custom navbars, `localhost`, or raw `fetch(` calls in `frontend/src/modules/crm5/`.
- [x] Loading, empty, and error states present across all pages.
- [x] Currency uses `₹` + `toLocaleString('en-IN')`; dates use `YYYY-MM-DD`.
- [x] `@media print` hides sidebar and interactive buttons for clean report printing.
