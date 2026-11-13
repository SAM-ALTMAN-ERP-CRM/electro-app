# CRM-3 UI Consistency Guide
**Issue**: CRM3-R3  
**Owner**: Member C / Member 3 (UI Owner - `@pratikswain070-blip`)

> This document is the single source of truth for all CRM-3 (Customer 360) frontend screens.  
> Every page built by the team must follow these rules so the entire module integrates seamlessly with the monorepo shell and looks like one cohesive product.

---

## 1. Shared Shell Integration (Do Not Recreate)

The global `frontend/src/App.jsx` already provides:
- **Collapsible / Fixed Sidebar** with 11 team navigation groups (`CRM-1` through `ERP-6`)
- **Top Bar** showing the active workspace label, dev mode / user indicator, and logout button
- **Global Router** via `react-router-dom` discovering `frontend/src/modules/*/index.jsx` automatically
- **Global Notification & Base Styles** in `frontend/src/index.css`

CRM-3 pages must **never**:
- Create their own `<BrowserRouter>`, `<Routes>`, or `<Router>`
- Render their own sidebar, top-bar, or global navigation
- Import or modify `frontend/src/main.jsx`, `frontend/src/App.jsx`, or `frontend/src/api.js`
- Hardcode port numbers (`5103`, `3000`) or URLs containing `localhost` (always use `api('crm3', '/api/...')`)

---

## 2. Page Structure Template

Every CRM-3 page follows this unified layout inside the shell's `<main className="page-container">`:

```jsx
<div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
  {/* 1. Header Bar: Title, module badge, quick actions */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
        Page Title
      </h2>
      <span className="badge badge-blue">CRM-3</span>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {/* Primary / Secondary action buttons */}
      <button style={btnStyle}>Primary Action</button>
    </div>
  </div>

  {/* 2. Alert / Feedback Banners (conditional) */}
  {error && <div style={errorBannerStyle}>{error}</div>}
  {successMsg && <div style={successBannerStyle}>{successMsg}</div>}

  {/* 3. Filter / Search Toolbar (if page has filters) */}
  <div style={filterCardStyle}>
    <input style={searchInputStyle} placeholder="Search customers..." />
    <select style={selectStyle}>
      <option value="">All Types</option>
      <option value="retail">Retail</option>
      <option value="corporate">Corporate</option>
      <option value="dealer">Dealer</option>
    </select>
  </div>

  {/* 4. Loading State */}
  {loading && (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
      Loading data...
    </div>
  )}

  {/* 5. Empty State */}
  {!loading && items.length === 0 && (
    <div style={emptyStateStyle}>
      <p style={{ margin: 0, fontWeight: 500 }}>No records found.</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
        Adjust your search filters or create a new entry below.
      </p>
    </div>
  )}

  {/* 6. Data Table */}
  {!loading && items.length > 0 && (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Type</th>
          <th>City</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.id}</span></td>
            <td>{item.name}</td>
            <td><span className={getTypeBadge(item.type)}>{item.type}</span></td>
            <td>{item.city}</td>
            <td><Link to={`/crm3/customers/${item.id}`}>View Details</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

  {/* 7. Action / Creation Form Card (if applicable) */}
  <div style={formCardStyle}>
    <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#0f172a' }}>Add New Entry</h3>
    {/* Form inputs */}
  </div>
</div>
```

---

## 3. Design Tokens & Color Palette

All UI owners across CRM and ERP agreed on the following standard design tokens:

| Token Name | Hex Code | Visual Sample | Usage in CRM-3 |
|---|---|---|---|
| **Text Primary** | `#0f172a` | `rgb(15, 23, 42)` | Headings, table cells, primary labels |
| **Text Muted** | `#64748b` | `rgb(100, 116, 139)` | Subtitles, helper text, empty state description |
| **Border Default** | `#e2e8f0` | `rgb(226, 232, 240)` | Card borders, table borders, dividers |
| **Card / Header BG** | `#f8fafc` | `rgb(248, 250, 252)` | Table header backgrounds, form card backgrounds |
| **Primary Blue** | `#2563eb` | `rgb(37, 99, 235)` | Primary action buttons (`btn`, `button`), active tabs |
| **Primary Hover** | `#1d4ed8` | `rgb(29, 78, 216)` | Button hover states |
| **Success Green** | `#16a34a` | `rgb(22, 163, 74)` | Success banners, corporate badge, CSV download |
| **Danger Red** | `#dc2626` | `rgb(220, 38, 38)` | Error banners, delete buttons, duplicate indicators |
| **Warning Amber** | `#d97706` | `rgb(217, 119, 6)` | Dealer badges, duplicate alerts |
| **Info Blue** | `#3b82f6` | `rgb(59, 130, 246)` | Retail badge, timeline call/email markers |

---

## 4. Badge Classes & Semantics (Global CSS)

Badge classes are declared in `frontend/src/index.css` and rendered as `<span className="badge badge-<color>">`.

```jsx
<span className="badge badge-blue">retail</span>
<span className="badge badge-green">corporate</span>
<span className="badge badge-amber">dealer</span>
<span className="badge badge-red">duplicate</span>
```

### CRM-3 Badge Mapping:
- **Customer Types**:
  - `retail` &rarr; `badge-blue` (Light Blue background `#dbeafe`, dark blue text `#1d4ed8`)
  - `corporate` &rarr; `badge-green` (Light Green background `#dcfce7`, dark green text `#15803d`)
  - `dealer` &rarr; `badge-amber` (Light Amber background `#fef3c7`, dark amber text `#b45309`)
- **Customer Tags**:
  - Small chips styled with custom inline border and pill radius, displaying tag text and interactive `×` removal button.
- **Timeline Interaction Types**:
  - `order` &rarr; `badge-green` (Order placed in ERP-4)
  - `meeting` &rarr; `badge-blue` (Sales meeting in CRM-1 / CRM-2)
  - `ticket` &rarr; `badge-red` (Support ticket in CRM-5)
  - `call` & `email` &rarr; `badge-amber` / `badge-blue`

---

## 5. Table Style

Data tables must use crisp borders, uppercase neutral column headers, and comfortable padding:

```jsx
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  margin: '1rem 0',
  background: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  fontSize: '0.875rem'
};

const thStyle = {
  backgroundColor: '#f8fafc',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '0.75rem 1rem',
  textAlign: 'left',
  borderBottom: '1px solid #e2e8f0'
};

const tdStyle = {
  padding: '0.75rem 1rem',
  color: '#0f172a',
  borderBottom: '1px solid #f1f5f9'
};
```

---

## 6. Form Card Style

Form cards encapsulate creation inputs (`Add Customer`, `Create Segment`, `Add Contact`, `Add Tag`, `Import CSV`):

```jsx
const formCardStyle = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '1.5rem',
  marginTop: '1.75rem',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
};

const inputStyle = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.15s ease'
};
```

---

## 7. Money, Dates & Shared Contract Formatting

- **Currency (INR)**:
  ```js
  const formatMoney = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  ```
- **Dates**: Standard ISO formatted dates `YYYY-MM-DD` or friendly localized strings:
  ```js
  const formatDate = (isoStr) => new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  ```
- **Shared IDs**: Display entity IDs (`CUST-0001`, `CONT-0001`, `SEG-0001`, `EMP-0001`, `SO-0001`) in monospace font (`fontFamily: 'monospace'`).

---

## 8. Print Styles

All CRM-3 printable views (especially Customer Detail profile and Segment Cohorts) inherit the global print stylesheet from `frontend/src/index.css`:

```css
@media print {
  .sidebar,
  .top-bar,
  button,
  .btn,
  .no-print {
    display: none !important;
  }
  .main-content,
  .page-container {
    padding: 0 !important;
    margin: 0 !important;
  }
}
```

When printing a customer 360 profile, the sidebar and header are automatically suppressed, producing an uncluttered, single-page printout suitable for sales reps and customer service meetings.

---

## 9. Route Registration in `frontend/src/modules/crm3/index.jsx`

All 7 CRM-3 pages are registered under module `id: 'crm3'` with access roles `['admin', 'sales', 'support']`:

| Path | Menu Label | Description | Associated Issue |
|---|---|---|---|
| `''` | **Customers** | Customer directory master table, search bar, type filter, add customer form card | CRM3-A2 |
| `'customers/:id'` | *(hidden)* | Customer 360 profile, tags chips (add/remove), contacts table, add contact modal | CRM3-A2, CRM3-C3 |
| `'customers/:id/timeline'` | *(hidden)* | Unified chronological interaction feed, filter by type, date range, add note form | CRM3-B2, CRM3-B3 |
| `'segments'` | **Segments** | Customer segments directory, target criteria tags, create segment form card | CRM3-C2 |
| `'segments/:id'` | *(hidden)* | Segment criteria badges, matching count KPI, matching customers table, Excel CSV download | CRM3-C2, CRM3-C3 |
| `'duplicates'` | **Duplicates** | Duplicate detection screen, side-by-side customer comparison, "Keep this one" merge flow | CRM3-D2 |
| `'import'` | **Import** | CSV bulk import screen, client-side parsed preview, validation summary, error log | CRM3-D3 |

---

## 10. Screen Consistency Checklist

Before any PR touches the frontend:
- [x] Route registered in `frontend/src/modules/crm3/index.jsx` with relative path.
- [x] No custom `<BrowserRouter>`, `<Routes>`, or standalone navigation components.
- [x] No hardcoded `localhost:5103` or direct `fetch()`; uses `api('crm3', path)`.
- [x] Headings use `#0f172a`, font size `1.5rem`-`1.6rem`, accompanied by `badge-blue` tag.
- [x] Feedback states implemented: Loading state, Empty state, Error banner, Success banner.
- [x] Badges conform to color mappings: `retail` (blue), `corporate` (green), `dealer` (amber).
- [x] Interactive buttons utilize `#2563eb` with hover `#1d4ed8`.
- [x] Print stylesheet suppresses sidebar and action buttons cleanly.
