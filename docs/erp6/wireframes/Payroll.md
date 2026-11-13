# Wireframe: Monthly Payroll Screen
**Route**: `/erp6/payroll`  
**Issues**: ERP6-C1, ERP6-C2, ERP6-C3  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [payroll.svg](payroll.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-6 HR & Workforce          │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp6/payroll — Monthly Payroll Management [Dev·Admin]  │  │
│    > Employees                   │  └─────────────────────────────────────────────────────────┘  │
│    > Departments                 │                                                               │
│    > Attendance                  │  Monthly Payroll  [ERP-6 HR]       [Month: 2026-11] [⚡ Generate]│
│    > Leaves                      │  Calculate statutory pay, view slips & disburse salaries      │
│    > Payroll         ← active    │                                                               │
│    > Commissions                 │  ┌── 409 SAFEGUARD BANNER ──────────────────────────────────┐ │
│    > Leaderboard                 │  │ ⚠️ Payroll already generated for 2026-11 [Force Regenerate]│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐ │
│                                  │  │ Gross Cost │ │ Net Disburs│ │ Deductions │ │ Total Slips │ │
│                                  │  │ ₹7,35,000  │ │ ₹6,52,100  │ │ ₹82,900    │ │ 12 Slips    │ │
│                                  │  └────────────┘ └────────────┘ └────────────┘ └─────────────┘ │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ SLIP ID   EMPLOYEE      BASIC    GROSS   DEDUCT  NET PAY │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ SLIP-0001 Aarav Sharma  ₹45,000  ₹75,500 ₹6,900  ₹68,600 │ │
│                                  │  │ SLIP-0002 Priya Nair    ₹40,000  ₹66,200 ₹4,800  ₹61,400 │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Header & Generation Action**:
   - Title: `Monthly Payroll`
   - Subtitle: `Calculate statutory salaries, view slips, disburse pay, and audit ledger entries.`
   - Month Selector: Month picker input defaulting to `YYYY-MM`.
   - Primary Action: `⚡ Generate Payroll` calling `POST /api/payroll/generate { month }`.

2. **Safeguard Banner (ERP6-C3)**:
   - When generating a month twice, the API returns HTTP `409 Conflict`.
   - The UI intercepts 409 and renders a prominent warning banner with an instant `Force Regenerate` button that adds `?force=true` to recalculate.

3. **KPI Summary Cards**:
   - `Total Gross Cost`: Sum of Basic, HRA (40%), Allowances (₹2,000), and Commissions.
   - `Net Disbursed`: Total take-home pay after statutory deductions.
   - `Total Deductions`: 12% PF + Leave absenteeism deductions.
   - `Total Slips`: Count of generated slips vs marked paid slips.

4. **Salary Slips Table**:
   - `SLIP ID`: Sequence ID (`SLIP-0001`..).
   - `Employee`: Name, ID, and Department.
   - `Basic`, `Gross`, `Deductions`, `Net Pay`: Formatted in INR with right-alignment.
   - `Status Badge`: Amber `.badge-amber` (`GENERATED`) or Green `.badge-green` (`PAID`).
   - `Actions`:
     - `Preview`: Opens in-page modal breakdown.
     - `Print Slip`: Direct link to single-page printable `/erp6/payroll/:id`.
     - `Mark Paid`: Action button calling `PATCH /api/salary-slips/:id/paid`.

5. **ERP-5 General Ledger Posting**:
   - On successful slip generation, ERP-6 sends non-blocking side-effect `POST /api/ledger/auto` to ERP-5 `{ type: 'salary', reference: month, amount: total_payroll_cost }`.
