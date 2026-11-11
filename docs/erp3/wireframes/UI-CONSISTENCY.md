# ERP-3 UI Consistency Guide
**Issue**: ERP3-R3 (#167)  
**Owner**: Member C (Alina Patel - UI Owner)  
**Module**: Production & Quality (`frontend/src/modules/erp3`)  
**Roles**: `admin`, `warehouse`

> This document is the single source of truth for all ERP-3 (Production & Quality) frontend pages.  
> Every page built by Team ERP-3 must adhere strictly to these design rules, tokens, and layouts to ensure seamless visual harmony across the shared CRM + ERP application.

---

## 1. Shared Shell Integration (Do Not Recreate)

The global shell (`frontend/src/App.jsx`) already provides:
- **Collapsible / Fixed Sidebar**: Contains all 11 team modules (`CRM-1` through `ERP-6`), highlighting active routes.
- **Top Bar**: Displays the active workspace context, role badge (`admin`, `warehouse`), and user identity.
- **Global Router**: React Router DOM discovering `frontend/src/modules/*/index.jsx` automatically.
- **Global Styles & Notifications**: Provided in `frontend/src/index.css`.

### Team ERP-3 Rules:
- **Never create** a `<BrowserRouter>`, `<Router>`, or duplicate `<Routes>`.
- **Never create** a custom sidebar, navbar, or top header.
- **Never edit** shared shell files (`App.jsx`, `main.jsx`, `api.js`, `.github/`).
- **Never hardcode** URLs with `localhost` or port `5203`. Always use the standard `api('erp3', '/api/...')` client helper.
- **Print media rule**: The sidebar and control buttons are hidden on print (`@media print` in `index.css`), presenting clean printable reports for work orders and BOMs.

---

## 2. Standard Page Layout Template

Every ERP-3 page follows this unified layout inside `<main className="page-container">`:

```jsx
<div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
  {/* 1. Header Bar: Title, module badge, action buttons */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
          Page Title
        </h2>
        <span className="badge badge-blue">ERP-3 Production</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
        Concise explanation of screen capabilities and active status.
      </p>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button className="btn btn-primary" onClick={...}>+ Action</button>
    </div>
  </div>

  {/* 2. Alert & Feedback Banners */}
  {error && <div style={errorBannerStyle}>{error}</div>}
  {successMsg && <div style={successBannerStyle}>{successMsg}</div>}

  {/* 3. Filter / Search Toolbar */}
  <div style={filterToolbarStyle}>...</div>

  {/* 4. Loading State */}
  {loading && <p style={{ color: '#64748b', padding: '1.5rem 0' }}>Loading records...</p>}

  {/* 5. Empty State */}
  {!loading && items.length === 0 && (
    <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <p style={{ color: '#64748b', fontStyle: 'italic', margin: 0 }}>No records found.</p>
    </div>
  )}

  {/* 6. Data Content (Table, Cards, Forms) */}
  {!loading && items.length > 0 && <table style={tableStyle}>...</table>}
</div>
```

---

## 3. Colour Tokens & Design System

| Token | Hex Value | Semantic Usage |
|-------|-----------|----------------|
| **Navy Heading** | `#0f172a` | Primary page headings, emphasis text, table header text |
| **Dark Slate Body**| `#1e293b` | General body copy, table cell content |
| **Slate Grey** | `#64748b` | Subheadings, input hints, placeholders, secondary timestamps |
| **Border Grey** | `#e2e8f0` / `#cbd5e1` | Table borders, input borders, card outlines |
| **Card / Canvas BG**| `#ffffff` / `#f8fafc` | Card backgrounds, table header background, container panels |
| **Primary Blue** | `#2563eb` | Primary buttons, active tabs, link actions |
| **Primary Hover**| `#1d4ed8` | Button hover state |
| **Success Green**| `#16a34a` / `#15803d` | Completed work orders, QC Pass, active BOMs |
| **Warning Amber**| `#d97706` / `#b45309` | In-progress jobs, QC Rework, shortage alerts |
| **Danger Red** | `#dc2626` / `#b91c1c` | Cancelled jobs, QC Fail, missing materials |

---

## 4. Status Badges Reference

All badges use shared classes defined in `frontend/src/index.css`:

```html
<span class="badge badge-green">completed</span>
<span class="badge badge-blue">planned</span>
<span class="badge badge-amber">in_progress</span>
<span class="badge badge-red">cancelled</span>
```

### Module State Mapping:

| Domain | Value | Badge Class | Visual Style |
|--------|-------|-------------|--------------|
| **Work Orders** | `planned` | `badge-blue` | Blue background (`#dbeafe`), navy text (`#1d4ed8`) |
| **Work Orders** | `in_progress` | `badge-amber` | Amber background (`#fef3c7`), amber text (`#b45309`) |
| **Work Orders** | `completed` | `badge-green` | Green background (`#dcfce7`), dark green text (`#15803d`) |
| **Work Orders** | `cancelled` | `badge-red` | Red background (`#fee2e2`), dark red text (`#b91c1c`) |
| **BOM Status** | `active` | `badge-green` | Active production recipe |
| **BOM Status** | `draft` / `inactive` | `badge-amber` | Historical or unreleased version |
| **QC Checks** | `pass` | `badge-green` | 100% of checked items passed |
| **QC Checks** | `rework` | `badge-amber` | Minor defects ($\le 20\%$ failure) |
| **QC Checks** | `fail` | `badge-red` | Critical failure ($> 20\%$ defective) |

---

## 5. Table Design Guidelines

Tables in ERP-3 follow this unified styling:
```jsx
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  border: '1px solid #e2e8f0'
};
```

- **Header row (`th`)**: Background `#f8fafc`, text uppercase `#64748b`, font size `0.75rem`, font weight `600`, letter-spacing `0.05em`.
- **Data row (`td`)**: Padding `0.75rem 1rem`, border-bottom `1px solid #e2e8f0`, vertical align `middle`.
- **Hover state**: `tr:hover` subtle `#f8fafc` tint for scannability.
- **Numbers & Dates**: Monospace or right-aligned for quantities, ISO dates `YYYY-MM-DD`.

---

## 6. Form & Modal Layout Standards

- **Cards**: Background `#ffffff`, border `1px solid #e2e8f0`, border-radius `8px`, padding `1.5rem`.
- **Form Controls**:
  - Labels: Font size `0.85rem`, font weight `600`, color `#334155`, margin bottom `0.35rem`.
  - Inputs & Selects: Padding `0.5rem 0.75rem`, border `1px solid #cbd5e1`, border-radius `6px`, font size `0.875rem`, focus outline `2px solid #2563eb`.
  - Dynamic Table Rows: For BOM creation, component SKU dropdown, name, qty input, and red delete icon.
  - Buttons: Standard primary `.btn` (`#2563eb`), secondary outline button with `#e2e8f0` border, danger button `#dc2626`.

---

## 7. Formatting & Cross-Team Seed IDs

1. **Currency**: Indian Rupees format `₹12,345.00` using `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`.
2. **Finished Goods Products** (from Section 5 shared catalog):
   - `SKU-0001`: 55" 4K Smart LED TV
   - `SKU-0003`: 65" OLED TV
3. **Shared Raw Component SKUs**:
   - `SKU-0101`: 55" Display Panel
   - `SKU-0102`: Smart TV Mainboard
   - `SKU-0103`: 150W Power Supply Module
   - `SKU-0104`: Bluetooth Remote Control
   - `SKU-0105`: Cardboard Packaging Box
4. **Shared Identifiers**:
   - BOM IDs: `BOM-0001`, `BOM-0002`
   - Work Orders: `WO-0001` to `WO-0005`
   - Quality Inspections: `QC-0001` to `QC-0003`
   - Warehouses: `WH-01` (Main Plant Warehouse)
   - Quality Inspectors: `EMP-0005` to `EMP-0007`

---

## 8. Role Permissions Matrix

| Route Path | Component | Allowed Roles | Sidebar Visibility | Description |
|------------|-----------|---------------|--------------------|-------------|
| `/erp3` | `OverviewPage` | `admin`, `warehouse` | Yes ("Overview") | Production KPI Dashboard |
| `/erp3/boms` | `BOMsPage` | `admin`, `warehouse` | Yes ("Bill of Materials") | Active BOMs listing |
| `/erp3/boms/new` | `BOMNewPage` | `admin`, `warehouse` | Yes ("New BOM") | BOM creation builder |
| `/erp3/boms/:id` | `BOMDetailPage` | `admin`, `warehouse` | No (Drill-down link) | Components & material check |
| `/erp3/work-orders` | `WorkOrdersPage` | `admin`, `warehouse` | Yes ("Work Orders") | Work orders tracker |
| `/erp3/work-orders/:id`| `WorkOrderDetailPage` | `admin`, `warehouse` | No (Drill-down link) | Issuance & finish goods |
| `/erp3/qc` | `QCPage` | `admin`, `warehouse` | Yes ("Quality Control") | QC inspections & pass rates |

---

## 9. Print Media Consistency

To support production floor shop travelers and inspection tags:
```css
@media print {
  aside, .sidebar, .top-bar, .btn, button, input, select {
    display: none !important;
  }
  .main-content, .page-container {
    padding: 0 !important;
    margin: 0 !important;
  }
  body {
    background: #ffffff !important;
  }
}
```
All pages render clean, header-aligned printable tables and detail sheets when using standard browser print (`Ctrl+P` / `Cmd+P`).
