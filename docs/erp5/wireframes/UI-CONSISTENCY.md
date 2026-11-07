# ERP-5 UI Consistency Guide
**Issue**: ERP5-R3  
**Owner**: Member C (UI Owner)

> This document is the single source of truth for all ERP-5 frontend pages.  
> Every page built by the team must follow these rules so the whole module looks like one app.

---

## 1. Shared Shell (do not recreate)

The global `App.jsx` already provides:
- **Sidebar** with team nav groups
- **Top bar** with active workspace label
- **Page routing** via React Router

ERP-5 pages must **never**:
- Create their own `<BrowserRouter>`
- Render their own sidebar or navbar
- Import or edit `frontend/src/main.jsx`, `App.jsx`, or `api.js`

---

## 2. Page Structure Template

Every ERP-5 page follows this layout inside the shell's `<main>`:

```jsx
<div style={{ padding: '2rem', maxWidth: '900px' }}>
  {/* 1. Page heading + badge */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
      Page Title
    </h2>
    <span className="badge badge-blue">LABEL</span>
  </div>

  {/* 2. Error / success banner (conditional) */}
  {error && <p style={errorStyle}>{error}</p>}
  {msg   && <p style={successStyle}>{msg}</p>}

  {/* 3. Loading state */}
  {loading && <p>Loading…</p>}

  {/* 4. Empty state */}
  {!loading && items.length === 0 && <p style={{ color: '#64748b', fontStyle: 'italic' }}>No items found.</p>}

  {/* 5. Data table */}
  {!loading && items.length > 0 && <table style={tableStyle}>…</table>}

  {/* 6. Form (if the page has one) */}
  <div style={formCardStyle}>…</div>
</div>
```

---

## 3. Colour Tokens

| Token | Hex | Used for |
|-------|-----|---------|
| `#0f172a` | Navy | Headings, table text |
| `#1e293b` | Dark slate | Body text |
| `#64748b` | Slate grey | Hints, placeholders, empty state |
| `#374151` | Label grey | Form labels |
| `#f8fafc` | Off-white | Table header BG, form card BG |
| `#e2e8f0` | Border grey | Table borders, card borders |
| `#2563eb` | Blue | Primary buttons |
| `#dc2626` | Red | Error banners, admin badges |
| `#16a34a` | Green | Success banners, paid badges |
| `#f1f5f9` | Light grey | Login page background |

---

## 4. Badge Classes (global CSS — do not redefine)

```jsx
<span className="badge badge-green">paid</span>
<span className="badge badge-red">unpaid</span>
<span className="badge badge-yellow">partially_paid</span>
<span className="badge badge-blue">sales</span>
```

| Class | Background | Text | Use |
|-------|-----------|------|-----|
| `badge-green` | `#dcfce7` | `#166534` | paid, active, finance, hr |
| `badge-red` | `#fee2e2` | `#991b1b` | unpaid, inactive, admin |
| `badge-yellow` | `#fef9c3` | `#854d0e` | partially_paid, support |
| `badge-blue` | `#dbeafe` | `#1d4ed8` | sales, warehouse, info |

---

## 5. Table Style

```jsx
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.9rem',
};
// thead: background #f8fafc, bottom border 2px #e2e8f0
// tbody rows: border-bottom 1px #f1f5f9
// th padding: 0.65rem 0.9rem, fontWeight 600, color #374151
// td padding: 0.6rem 0.9rem, color #1e293b
```

---

## 6. Form Card Style

```jsx
const formCardStyle = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '1.5rem',
  marginTop: '1.5rem',
};
```

Inputs inside forms:
```jsx
const inputStyle = {
  padding: '0.55rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
};
```

---

## 7. Money Formatting

```js
// Always use — no exceptions
const fmt = (amount) => `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
// e.g. fmt(118000) → "₹1,18,000.00"
```

---

## 8. Error + Success Banners

```jsx
const errorStyle = {
  color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '1rem',
};
const successStyle = {
  color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0',
  borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '1rem',
};
```

---

## 9. Print Styles

Every page that may be printed must include:

```css
@media print {
  .sidebar,
  .top-bar,
  .filters,
  .back-btn,
  .form-card,
  button {
    display: none !important;
  }
  .print-area {
    width: 100%;
    padding: 0;
  }
}
```

The Invoice Detail page is the primary print target — it must fit on one A4 page.

---

## 10. Route Registration Checklist

Before submitting any PR that adds a new page:

- [ ] Page is imported in `frontend/src/modules/erp5/index.jsx`
- [ ] Route `path` is relative (e.g. `'invoices'` not `'/erp5/invoices'`)
- [ ] Route has a `label` only if it should appear in the sidebar
- [ ] Route has a `roles` array if it is restricted (e.g. `roles: ['admin']`)
- [ ] No `<BrowserRouter>`, `<NavLink>`, or sidebar created inside the page
- [ ] `api('erp5', '/api/...')` used — no raw `fetch` or `localhost`
- [ ] Money formatted with `toLocaleString('en-IN')` and ₹ prefix
- [ ] Loading state, empty state, and error state all handled

---

## 11. Pages Registered in `index.jsx`

| Path | Label | Roles | Issue | Status |
|------|-------|-------|-------|--------|
| `login` | (hidden) | all | ERP5-C3 | ✅ Done |
| `users` | Users | admin | ERP5-C3 | ✅ Done |
| `invoices` | Invoices | admin, finance | ERP5-A2 | ⏳ Pending A1 |
| `invoices/:id` | (no label) | admin, finance | ERP5-A2 | ⏳ Pending A1 |
| `payments` | Payments | admin, finance | ERP5-B2 | ⏳ Pending B1 |
| `credit-notes` | Credit Notes | admin, finance | ERP5-A4 | ⏳ Pending A1 |
| `ledger` | Ledger | admin, finance | ERP5-D2 | ⏳ Pending D1 |
| `receivables` | Receivables | admin, finance | ERP5-B3 | ⏳ Pending B1 |
| `reports` | Reports | admin, finance | ERP5-D3 | ⏳ Pending D1,D2 |
