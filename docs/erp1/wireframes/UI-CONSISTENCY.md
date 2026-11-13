# ERP-1 UI Consistency & Design System Guide
**Issue**: ERP1-R3  
**Owner**: UI Owner (Samarth)

> This document defines the frontend design system, structural conventions, colour tokens, badge standards, table layouts, and route verification rules for all pages within **Team ERP-1 (Inventory & Warehouses)**.

---

## 1. Monorepo Shell Integration

The shared React shell (`frontend/src/App.jsx`) controls the global navigation bar, login state, and role access:
- **No Private Routers**: Never instantiate `<BrowserRouter>` or `<Routes>`.
- **No Duplicate Navbars**: Do not render custom sidebars or top navigation headers.
- **Shared API Client**: Always use `import { api } from '../../../api';`. Never invoke raw `fetch()` or hardcode `localhost`.
- **Print Styles**: Ensure `@media print` rules hide interactive buttons, sidebar elements, and form cards for clean PDF and paper generation.

---

## 2. Standard Layout Structure

Every ERP-1 page follows this clean, functional structure:

```jsx
<div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
  {/* 1. Header with Title and Status Badges */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Page Heading</h2>
      <span className="badge badge-blue">ERP-1</span>
    </div>
    {/* Action Buttons (e.g. Add Product, Run Scan, Export CSV) */}
  </div>

  {/* 2. Notification / Feedback / Error Banners */}
  {error && <div style={errorBannerStyle}>{error}</div>}
  {feedback && <div style={successBannerStyle}>{feedback}</div>}

  {/* 3. KPI Summary Cards (if applicable) */}
  <div style={kpiGridStyle}>...</div>

  {/* 4. Filter Toolbar / Search Controls */}
  <div style={filterToolbarStyle}>...</div>

  {/* 5. Data Table or Empty/Loading State */}
  {loading ? (
    <p>Loading...</p>
  ) : items.length === 0 ? (
    <div style={emptyStateStyle}>No records found.</div>
  ) : (
    <table style={tableStyle}>...</table>
  )}

  {/* 6. Form Card (if modal/drawer is not used) */}
  <div style={cardStyle}>...</div>
</div>
```

---

## 3. Colour Palette & Design Tokens

| Token | Hex Value | Usage |
|---|---|---|
| Slate Dark | `#0f172a` | Primary headings, titles, high-emphasis text |
| Slate Body | `#1e293b` | General body copy, table cell content |
| Slate Muted | `#64748b` | Subheadings, column headers, placeholders, timestamps |
| Border Slate | `#e2e8f0` | Card borders, table dividers, input borders |
| Off-White Surface | `#f8fafc` | Card backgrounds, table header background |
| Primary Blue | `#2563eb` | Primary action buttons, active navigation indicators |
| Emerald Green | `#16a34a` | In-stock badges, success messages, acknowledge actions |
| Amber Warning | `#d97706` | Low-stock badges, reserved status, cautionary notices |
| Crimson Danger | `#dc2626` | Critical shortfall, out-of-stock badges, error banners |

---

## 4. Badge System (Global Styles)

| Badge Class | Background | Text Color | Usage in ERP-1 |
|---|---|---|---|
| `badge-green` | `#dcfce7` | `#166534` | `in_stock`, active SKU, healthy stock |
| `badge-yellow` | `#fef3c7` | `#92400e` | `reserved`, low stock threshold warning |
| `badge-red` | `#fee2e2` | `#991b1b` | `sold`, out-of-stock (0 units), critical alert |
| `badge-blue` | `#dbeafe` | `#1d4ed8` | `returned`, warehouse tag (`WH-01`), category |

---

## 5. Currency & Numerical Formatting

- **Indian Rupees (INR)**: All product prices must format with `₹` and Indian comma notation:
  ```javascript
  `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ```
  Example: `₹42,990.00`
- **Stock Quantities**: Append unit suffix: `35 units`.
- **Negative Shortfall**: Display with a leading minus sign in red: `-7 units`.

---

## 6. Page Registry Checklist (`frontend/src/modules/erp1/index.jsx`)

All ERP-1 screens must be properly registered with relative path prefixes and permitted roles (`['admin', 'warehouse', 'sales']`):

| Page | Relative Path | Menu Label | Roles |
|---|---|---|---|
| Overview | `''` | `Overview` | `admin`, `warehouse`, `sales` |
| Products | `'products'` | `Products` | `admin`, `warehouse`, `sales` |
| Stock | `'stock'` | `Warehouse Stock` | `admin`, `warehouse`, `sales` |
| Movements | `'movements'` | `Stock Movements` | `admin`, `warehouse` |
| Serials | `'serials'` | `Serial Numbers` | `admin`, `warehouse`, `sales` |
| Alerts | `'alerts'` | `Stock Alerts` | `admin`, `warehouse`, `sales` |
