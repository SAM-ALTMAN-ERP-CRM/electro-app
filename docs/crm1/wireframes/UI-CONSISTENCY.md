# CRM-1 UI Consistency Guide
**Issue**: CRM1-R3  
**Owner**: Member C (UI Owner)

> This document is the single source of truth for all CRM-1 frontend pages.  
> Every page built by Team CRM-1 must adhere to these design rules, tokens, and layouts to ensure seamless visual harmony across the shared CRM + ERP application.

---

## 1. Shared Shell (Do Not Recreate)

The global `App.jsx` already provides:
- **Sidebar** with team nav links (`/crm1/leads`, `/crm1/pipeline`, `/crm1/quotes`, `/crm1/quotes/new`, `/crm1/dealers`, `/crm1/approvals`)
- **Top bar** with workspace title, user role, and logout
- **Routing** via React Router DOM

CRM-1 pages must **never**:
- Render their own `<BrowserRouter>` or `<Router>`
- Render duplicate sidebars, top bars, or navbars
- Directly import or edit `main.jsx` or `App.jsx`
- Use hardcoded `localhost:5101` or raw `fetch()` (always use `api('crm1', path, options)`)

---

## 2. Standard Page Layout Template

Every CRM-1 page adheres to this clean layout structure:

```jsx
<div style={{ maxWidth: '1200px', margin: '0 auto' }}>
  {/* 1. Header with Title & Badge */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Page Title
        </h2>
        <span className="badge badge-blue">Sales Pipeline</span>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
        Helpful context or description of screen activities.
      </p>
    </div>
    <button className="btn btn-primary" onClick={...}>+ Action</button>
  </div>

  {/* 2. Feedback Banners */}
  {error && <div style={errorBannerStyle}>{error}</div>}
  {successMsg && <div style={successBannerStyle}>{successMsg}</div>}

  {/* 3. Filters / Controls Bar */}
  <div style={filterBarStyle}>...</div>

  {/* 4. Loading State */}
  {loading && <p style={{ color: '#64748b' }}>Loading records...</p>}

  {/* 5. Empty State */}
  {!loading && items.length === 0 && (
    <p style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
      No records found.
    </p>
  )}

  {/* 6. Data Presentation (Table / Cards / Form) */}
  {!loading && items.length > 0 && <table style={tableStyle}>...</table>}
</div>
```

---

## 3. Colour Tokens & Design System

| Token | Hex / Value | Usage |
|-------|-------------|-------|
| **Navy Heading** | `#0f172a` | Primary titles, bold amounts, table headers |
| **Dark Slate Body** | `#1e293b` | Main content text, customer names, SKUs |
| **Slate Grey** | `#64748b` | Subheadings, hints, empty state, placeholders |
| **Border Grey** | `#e2e8f0` / `#cbd5e1` | Table dividers, input borders, card outlines |
| **Card / Canvas BG**| `#f8fafc` / `#ffffff` | Panel backgrounds, zebra striping, table header BG |
| **Primary Blue** | `#2563eb` | Main action buttons, active navigation indicator |
| **Success Green** | `#16a34a` | Qualified lead badge, accepted quote badge, active status |
| **Warning Amber** | `#f59e0b` / `#b45309`| Contacted lead, negotiation stage, gold dealer tier |
| **Danger Red** | `#dc2626` / `#b91c1c`| Lost lead, rejected quote, admin approval badge |

---

## 4. Status Badges

All badges follow consistent rounded styling:
- **Qualified / Accepted / Active**: `.badge.badge-green` (Green BG/text)
- **New / Draft / Pipeline**: `.badge.badge-blue` (Blue BG/text)
- **Contacted / Review**: `.badge.badge-amber` (Amber/Yellow BG/text)
- **Lost / Rejected / Exceeded**: `.badge.badge-red` (Red BG/text)
- **Dealer Tiers**:
  - Gold: `★ Gold (15% max)`
  - Silver: `✦ Silver (10% max)`
  - Bronze: `● Bronze (5% max)`

---

## 5. Typography & Formatting Rules

1. **Currency (INR)**:
   - Always formatted with the Indian Rupee sign `₹` and Indian digit grouping:
     ```js
     const formatMoney = (val) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
     ```
   - Right-aligned in numerical table columns.
2. **Dates**:
   - Standard ISO format: `YYYY-MM-DD`.
3. **Identifiers**:
   - Structured uppercase prefixes:
     - Leads: `LEAD-0001`
     - Opportunities: `OPP-0001`
     - Quotes: `QUO-0001`
     - Dealers: `DLR-0001`
     - Customers: `CUST-0001` to `CUST-0008`
     - Sales Reps: `EMP-0001` to `EMP-0004`
     - Products: `SKU-0001` to `SKU-0015`

---

## 6. Role Permissions Matrix

| Route | Page Component | Allowed Roles | Sidebar Visibility |
|-------|---------------|---------------|--------------------|
| `/crm1/leads` | `LeadsPage` | `admin`, `sales` | Yes ("Leads") |
| `/crm1/pipeline` | `PipelinePage` | `admin`, `sales` | Yes ("Pipeline") |
| `/crm1/quotes` | `QuotesListPage` | `admin`, `sales` | Yes ("Quotes") |
| `/crm1/quotes/new`| `QuoteBuilderPage` | `admin`, `sales` | Yes ("New Quote") |
| `/crm1/dealers` | `DealersPage` | `admin`, `sales` | Yes ("Dealers") |
| `/crm1/approvals`| `ApprovalsPage` | `admin` | Yes (visible only to `admin`) |

---

## 7. Print Media Rules

All CRM-1 pages include print rules so quotes and lists print cleanly without UI chrome:
```css
@media print {
  aside, .sidebar, .top-bar, .btn, button, input, select {
    display: none !important;
  }
  body, main {
    background: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }
}
```
