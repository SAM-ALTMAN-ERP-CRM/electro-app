# Wireframe: Sales Commissions Screen
**Route**: `/erp6/commissions`  
**Issues**: ERP6-D1, ERP6-D2  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [commissions.svg](commissions.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-6 HR & Workforce          │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp6/commissions — Sales Commission Sync   [Dev·Admin] │  │
│    > Employees                   │  └─────────────────────────────────────────────────────────┘  │
│    > Departments                 │                                                               │
│    > Attendance                  │  Sales Commissions  [ERP-6 HR]    [Month: 2026-11] [🔄 Sync] │
│    > Leaves                      │  Sync ERP-5 paid invoices, calculate 2%/3% rates & rep totals │
│    > Payroll                     │                                                               │
│    > Commissions     ← active    │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐ │
│    > Leaderboard                 │  │ Total Sales  │ │ Total Comm   │ │ Active Reps            │ │
│                                  │  │ ₹18,45,000   │ │ ₹45,200      │ │ 4 Reps (EMP-1..4)      │ │
│                                  │  └──────────────┘ └──────────────┘ └────────────────────────┘ │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ COMM ID   SALES REP   INVOICE  PAID DATE  AMOUNT RATE COMM│ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ COMM-0001 Aarav (EMP-1) INV-0001 2026-11-04 3.5L  3% ₹10.5│ │
│                                  │  │ COMM-0002 Priya (EMP-2) INV-0003 2026-11-06  85k  2% ₹1.7k│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Header & Sync Controls**:
   - Title: `Sales Commissions`
   - Subtitle: `Sync paid invoices from ERP-5, calculate tier rates (2% vs 3%), and allocate earnings.`
   - Month Filter: Dropdown or month picker (`YYYY-MM`).
   - Primary Action: `🔄 Sync Now` calling `POST /api/commissions/sync`.

2. **Rate Tier Calculation (ERP6-D1)**:
   - For invoices with `total <= 100,000 INR`: Commission Rate = `2%`.
   - For high-value invoices with `total > 100,000 INR`: Commission Rate = `3%`.
   - Idempotent Sync: Running sync repeatedly will not duplicate commission entries.

3. **KPI Summary Cards**:
   - `Total Invoiced Sales`: Gross value of deals processed in the selected month.
   - `Total Commissions`: Total commission liability across all sales reps.
   - `Active Sales Reps`: Count of eligible sales representatives (`EMP-0001` through `EMP-0004`).

4. **Commissions Table**:
   - `COMM ID`: Unique ID sequence (`COMM-0001`..).
   - `Sales Rep`: Rep name joined from `employees` table + ID.
   - `Invoice Reference`: Cross-team ID from ERP-5 (`INV-0001`..).
   - `Paid Date`: ISO date when customer payment was cleared.
   - `Invoice Amount` & `Commission`: Formatted in INR with right-alignment.
   - `Rate`: Badge highlighting rate (2% standard or 3% gold tier).
   - `Status`: Green badge (`APPROVED`).
