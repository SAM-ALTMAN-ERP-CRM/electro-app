# CRM-2 UI Consistency Guide
**Issue**: CRM2-R3  
**Owner**: Anant (UI Owner · Service Centres Track)

> This document is the single source of truth for all CRM-2 (Support & Warranty) frontend screens.  
> Every page built by our team (`TicketsPage`, `TicketDetailPage`, `WarrantyPage`, `RmasPage`, `RmaDetailPage`, `CentresPage`, `AssignPage`, `ReportsPage`) must adhere to these standards so our entire module functions seamlessly inside the shared monorepo shell.

---

## 1. Shared Shell Integration Rules (Do Not Recreate)

The global application shell (`frontend/src/App.jsx` + `frontend/src/index.css`) already supplies:
- The unified left-hand navigation sidebar (with all 11 CRM and ERP module groups)
- The global top header with identity and logout controls
- Global routing (`react-router-dom`) mounting modules automatically from `frontend/src/modules/*/index.jsx`
- Shared classes: `.badge`, `.badge-blue`, `.badge-green`, `.badge-amber`, `.badge-red`, `.btn`
- Global print styles (`@media print` hiding the sidebar and navigation)

CRM-2 pages must **never**:
- Create their own `<BrowserRouter>`, `<Routes>`, or `<Router>`
- Render custom sidebars, top headers, or navigation wrappers
- Import or edit shared infrastructure (`frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/src/api.js`)
- Hardcode port numbers (`5102`, `3000`) or write `localhost` (always use `api('crm2', '/api/...')` or cross-module `api('erp6', '/api/...')`)

---

## 2. Page Structure & Layout Template

Every CRM-2 page follows this consistent layout inside the shell's content area:

```jsx
<div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
  {/* 1. Header Bar: Title, module badge, action buttons */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
        Page Title
      </h2>
      <span className="badge badge-blue">CRM-2</span>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button className="btn" onClick={...}>Action</button>
    </div>
  </div>

  {/* 2. Notification / Alert Banners */}
  {error && (
    <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
      {error}
    </div>
  )}

  {/* 3. Filter / Search Toolbar (when applicable) */}

  {/* 4. Main Content (Table / Details / Forms) */}
  {loading ? (
    <p>Loading...</p>
  ) : items.length === 0 ? (
    <p style={{ color: '#64748b', fontStyle: 'italic' }}>No records found.</p>
  ) : (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
      ...
    </table>
  )}
</div>
```

---

## 3. Standard Badge & Color Palette

All teammates must strictly use these badge classes and meanings across all 8 pages:

| Category | Value / Status | CSS Class | Visual Color |
|---|---|---|---|
| **Ticket Status** | `open` | `badge badge-blue` | Blue |
| | `in_progress` | `badge badge-amber` | Amber / Yellow |
| | `resolved` | `badge badge-green` | Green |
| | `closed` | `badge` (default) | Slate Gray |
| **Ticket Priority** | `high` | `badge badge-red` | Red |
| | `medium` | `badge badge-amber` | Amber |
| | `low` | `badge badge-blue` | Blue |
| **SLA Indicator** | Overdue | `badge badge-red` | Red |
| | Active (e.g. `18h left`) | `badge badge-green` | Green |
| **Warranty Status** | `In warranty` / `active` | `badge badge-green` | Green |
| | `Expired` | `badge badge-red` | Red |
| **RMA Status** | `requested` | `badge badge-blue` | Blue |
| | `approved` | `badge badge-green` | Green |
| | `rejected` | `badge badge-red` | Red |
| | `received` | `badge badge-amber` | Amber |
| **Service Centre** | `Active` | `badge badge-green` | Green |
| | `Inactive` | `badge` (default) | Gray |

---

## 4. Currency and Date Formatting

- **Currency**: Always Indian Rupee format with 2 decimals:
  `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
- **Dates**: Standard ISO date `YYYY-MM-DD` or short local timestamp `DD MMM YYYY, HH:mm`.

---

## 5. Module Route Registration (`frontend/src/modules/crm2/index.jsx`)

All 8 pages are registered relative to the module root `/crm2/`. Detail pages omit the `label` property so they stay out of the sidebar navigation.

| Route Path | Label in Sidebar | Component | Owner | Status |
|---|---|---|---|---|
| `tickets` | Tickets | `TicketsPage` | Ashutosh | Merged (#290) |
| `tickets/:id` | *(none - detail)* | `TicketDetailPage` | Ashutosh | Merged (#290) |
| `warranty` | Warranty Check | `WarrantyPage` | Zoha | In development |
| `rmas` | Returns (RMA) | `RmasPage` | Aditya Kumbhar | In development |
| `rmas/:id` | *(none - detail)* | `RmaDetailPage` | Aditya Kumbhar | In development |
| `centres` | Service Centres | `CentresPage` | Anant | In development |
| `assign` | Assign Tickets | `AssignPage` | Anant | In development |
| `reports` | Support Reports | `ReportsPage` | Ashutosh | In development |
