# ERP-6 UI Consistency Guide & Design System
**Issue**: ERP6-R3  
**Owner**: UI Owner (ERP-6 HR & Workforce)  
**Roles**: `admin`, `hr`  
**Base Route**: `/erp6`

> This document is the single source of truth for all ERP-6 HR & Workforce screens.  
> Every page built by Team ERP-6 adheres to these shared design tokens, layouts, badge conventions, and shell rules to ensure seamless visual consistency across the unified Electro CRM + ERP monorepo.

---

## 1. Shared Shell Architecture (Do Not Recreate)

The global shell (`frontend/src/App.jsx` and `frontend/src/index.css`) provides:
- **Left Sidebar** with team navigation groups (ERP-6 displays title **HR** for roles `admin` and `hr`).
- **Top Bar** with active workspace label, role badge (`Dev Mode · Admin`), and user email.
- **Client-Side Routing** via React Router DOM `<Routes>` and `<Route>`.
- **Global Base CSS** providing typography, reset, table defaults, button styles, and print resets.

### Shell Compliance Rules
ERP-6 pages must **never**:
1. Render their own `<BrowserRouter>`, `<HashRouter>`, or `<Router>`.
2. Render duplicate sidebars, app menus, or top navigation bars.
3. Directly import or edit `main.jsx`, `App.jsx`, `App.css`, or `api.js`.
4. Hardcode `http://localhost:5206` or use raw `fetch()` (always import and use `api('erp6', path, options)` from `../../../api`).

---

## 2. Standard Page Layout Template

Every ERP-6 page follows this unified layout structure within the shell's `<main className="page-container">`:

```jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

export default function StandardPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. Header with Title, Module Badge & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Page Title
            </h1>
            <span className="badge badge-blue">ERP-6 HR</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', margin: 0 }}>
            Descriptive subtitle explaining screen workflow and actions.
          </p>
        </div>
        <button className="btn" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
          + Primary Action
        </button>
      </div>

      {/* 2. Feedback Banners (Conditional) */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '12px 16px', borderRadius: '4px', marginBottom: '1rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* 3. Controls & Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="Search..." style={inputStyle} />
        <select style={selectStyle}>
          <option value="all">All Departments</option>
        </select>
      </div>

      {/* 4. Loading State */}
      {loading && <p style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Loading records...</p>}

      {/* 5. Empty State */}
      {!loading && items.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b', fontStyle: 'italic', margin: 0 }}>No records found.</p>
        </div>
      )}

      {/* 6. Data Presentation Table */}
      {!loading && items.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            ...
          </table>
        </div>
      )}
    </div>
  );
}
```

---

## 3. Colour Tokens & Design System

The colour palette aligns with all ERP/CRM teams and global CSS variables in `frontend/src/index.css`:

| Token Name | Hex Code | Purpose & Usage in ERP-6 |
|:---|:---|:---|
| **Navy Heading** | `#0f172a` | Primary titles, summary KPI figures, table headers |
| **Dark Slate Body**| `#1e293b` | Regular text, employee names, table content |
| **Slate Grey** | `#64748b` | Subheadings, email captions, empty state messages |
| **Border Grey** | `#e2e8f0` | Table borders, card borders, dividers |
| **Input Border** | `#cbd5e1` / `#d1d5db` | Text input, select, and date-picker borders |
| **Canvas Background**| `#f8fafc` | Table header background, card light background |
| **Card White** | `#ffffff` | Primary card panels, modal backgrounds, table bodies |
| **Primary Blue** | `#2563eb` | Primary buttons ("Generate Payroll", "Save"), active tabs |
| **Success Green** | `#15803d` / `#16a34a` | "Paid" status, "Active" employee status, approved commissions |
| **Warning Amber** | `#b45309` / `#f59e0b` | "Generated" payroll, 409 safeguard banners, pending leave |
| **Danger Red** | `#b91c1c` / `#dc2626` | "Inactive" staff, rejected leave, absent deductions, error banners |

---

## 4. Status Badge Conventions

Status badges must use the shared global CSS classes defined in `frontend/src/index.css`:

```jsx
<span className="badge badge-green">ACTIVE</span>
<span className="badge badge-amber">GENERATED</span>
<span className="badge badge-blue">SALES REP</span>
<span className="badge badge-red">INACTIVE</span>
```

| Badge Class | Background | Text Colour | Semantic Usage in ERP-6 |
|:---|:---|:---|:---|
| `.badge-green` | `#dcfce7` | `#15803d` | `active` employee, `paid` salary slip, `approved` leave / commission |
| `.badge-amber` | `#fef3c7` | `#b45309` | `generated` salary slip, `pending` leave request, `half_day` attendance |
| `.badge-blue` | `#dbeafe` | `#1d4ed8` | `hr` role tag, `Sales Rep` designation, info badges |
| `.badge-red` | `#fee2e2` | `#b91c1c` | `inactive` employee, `rejected` leave request, `absent` attendance |

---

## 5. Typography, Numbers & Currency Formatting

1. **Indian Rupee (INR) Monetary Formatting**:
   - Every monetary value (Base Salary, Gross Pay, Net Pay, Commission, Allowances, PF) must be prefixed with `₹` and formatted using `toLocaleString('en-IN')` with exactly 2 decimal places:
     ```javascript
     export function formatINR(amount) {
       const val = parseFloat(amount || 0);
       return '₹' + val.toLocaleString('en-IN', {
         minimumFractionDigits: 2,
         maximumFractionDigits: 2
       });
     }
     ```
   - In data tables, currency columns must be **right-aligned** (`textAlign: 'right'`) to enable easy visual scanning of sums.

2. **Amount in Words (Statutory Salary Slips)**:
   - All printable salary slips must convert the net payable amount to words in accordance with the Indian numbering system (Lakhs / Crores), e.g. *₹68,600.00* → `Sixty Eight Thousand Six Hundred Rupees Only`.

3. **Identifier Standards**:
   - Database sequences and identifiers adhere strictly to Section 5 shared ID contracts:
     - Employees: `EMP-0001` through `EMP-0012`
     - Departments: `DEP-01` through `DEP-05`
     - Salary Slips: `SLIP-0001` onwards
     - Commissions: `COMM-0001` onwards
     - Leave Requests: `LV-0001` onwards
   - Displayed in `font-family: monospace` or `font-weight: 600` for clear readability.

---

## 6. Table & Form Design Standards

### Table Standards
- Outer wrapper has `overflow-x: auto`, `border: 1px solid #e2e8f0`, `border-radius: 8px`.
- Table header row (`<th>`): background `#f8fafc`, uppercase, `font-size: 0.75rem`, `font-weight: 600`, color `#64748b`.
- Table body cells (`<td>`): padding `12px 16px`, border bottom `1px solid #f1f5f9`.
- Numeric / Currency columns right-aligned; Status badges centered; Action buttons grouped in flex container.

### Form & Modal Standards
- Form fields must have explicit labels with `font-size: 0.875rem`, `font-weight: 600`, `color: #374151`.
- Inputs have `border: 1px solid #d1d5db`, `border-radius: 6px`, `padding: 8px 12px`, with focus outline `#2563eb`.
- Action buttons: Primary is filled `#2563eb` with white text; Secondary is outlined `#d1d5db` with `#374151` text.
- Modals have fixed full-screen backdrop (`rgba(0,0,0,0.5)`), centered card with `box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1)`.

---

## 7. Print Media Rules (`@media print`)

In accordance with project-wide guidelines, printable views (especially `/erp6/payroll/:id`) must render cleanly on **one single A4 page**:

```css
@media print {
  /* 1. Hide shell chrome, sidebar, top-bar, navigation buttons, and inputs */
  .no-print, nav, .sidebar, .top-bar, button, .btn, input, select {
    display: none !important;
  }

  /* 2. Reset body and page containers */
  html, body {
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 11pt !important;
  }
  .main-content, .page-container {
    padding: 0 !important;
    margin: 0 !important;
  }

  /* 3. Constrain slip container to 1 A4 portrait page */
  @page {
    size: A4 portrait;
    margin: 10mm 12mm 10mm 12mm;
  }

  .salary-slip-container {
    border: 1.5px solid #0f172a !important;
    box-shadow: none !important;
    padding: 18px 24px !important;
    margin: 0 auto !important;
    width: 100% !important;
    max-width: 100% !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
```

---

## 8. Role Permissions Matrix & Route Registry

The module is registered in `frontend/src/modules/erp6/index.jsx` with module-level roles `['admin', 'hr']`:

| Route Path | Subpath | Component | Sidebar Label | Roles | Purpose | Wireframe Artifact |
|:---|:---|:---|:---|:---|:---|:---|
| `/erp6` | `''` | `EmployeesPage` | `Employees` | `admin`, `hr` | Default landing / Directory | [employees.svg](employees.svg) |
| `/erp6/employees` | `'employees'` | `EmployeesPage` | — | `admin`, `hr` | Employee Directory alias | [employees.svg](employees.svg) |
| `/erp6/departments`| `'departments'`| `DepartmentsPage`| `Departments` | `admin`, `hr` | Department management | [departments.svg](departments.svg) |
| `/erp6/attendance` | `'attendance'` | `AttendancePage` | `Attendance` | `admin`, `hr` | Daily attendance marker | [attendance.svg](attendance.svg) |
| `/erp6/leaves` | `'leaves'` | `LeavesPage` | `Leaves` | `admin`, `hr` | Leave requests & balances | [leaves.svg](leaves.svg) |
| `/erp6/payroll` | `'payroll'` | `PayrollPage` | `Payroll` | `admin`, `hr` | Monthly payroll & slips | [payroll.svg](payroll.svg) |
| `/erp6/payroll/:id`| `'payroll/:id'`| `SalarySlipPage`| — (Detail) | `admin`, `hr` | Single-page printable slip | [salary-slip.svg](salary-slip.svg) |
| `/erp6/commissions`| `'commissions'`| `CommissionsPage`| `Commissions` | `admin`, `hr` | Sales commission sync | [commissions.svg](commissions.svg) |
| `/erp6/leaderboard`| `'leaderboard'`| `LeaderboardPage`| `Leaderboard` | `admin`, `hr` | Sales performance ranking | [leaderboard.svg](leaderboard.svg) |

---

## 9. Wireframe Catalog & Artifact Index

All module pages have a dedicated wireframe image (`.svg`) and layout specification document (`.md`) in `docs/erp6/wireframes/`:

1. [Employees Directory](Employees.md) — Image: [employees.svg](employees.svg)
2. [Departments Master](Departments.md) — Image: [departments.svg](departments.svg)
3. [Attendance Marker](Attendance.md) — Image: [attendance.svg](attendance.svg)
4. [Leave Requests](Leaves.md) — Image: [leaves.svg](leaves.svg)
5. [Monthly Payroll](Payroll.md) — Image: [payroll.svg](payroll.svg)
6. [Printable Salary Slip](SalarySlip.md) — Image: [salary-slip.svg](salary-slip.svg)
7. [Sales Commissions](Commissions.md) — Image: [commissions.svg](commissions.svg)
8. [Performance Leaderboard](Leaderboard.md) — Image: [leaderboard.svg](leaderboard.svg)
