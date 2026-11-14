# Wireframe: Printable Salary Slip Screen
**Route**: `/erp6/payroll/:id`  
**Issues**: ERP6-C1, ERP6-C2  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [salary-slip.svg](salary-slip.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [← Back to Payroll]                                                    [🖨️ Print Slip (1 Page)]  │
│                                                                                                  │
│  ┌── SALARY SLIP CONTAINER (fits exactly 1 page A4 portrait) ─────────────────────────────────┐  │
│  │                                                                                            │  │
│  │  ELECTRO CRM & ERP LTD.                                               SALARY SLIP          │  │
│  │  Plot 42, Electronic City Phase 1, Bangalore                          Month: 2026-11       │  │
│  │────────────────────────────────────────────────────────────────────────────────────────────│  │
│  │  Emp ID: EMP-0001        Name: Aarav Sharma           Slip No: SLIP-0001                   │  │
│  │  Dept:   Sales (DEP-01)  Role: Senior Sales Exec      Status:  [PAID]                      │  │
│  │────────────────────────────────────────────────────────────────────────────────────────────│  │
│  │  ┌── EARNINGS ──────────────┬─────────────┐ ┌── DEDUCTIONS ──────────────┬─────────────┐   │  │
│  │  │ Basic Salary             │  ₹45,000.00 │ │ Provident Fund (PF 12%)    │   ₹5,400.00 │   │  │
│  │  │ House Rent Allow (HRA)   │  ₹18,000.00 │ │ Leave Absenteeism (1 Day)  │   ₹1,500.00 │   │  │
│  │  │ Special Allowance        │   ₹2,000.00 │ │ Professional Tax (PT)      │       ₹0.00 │   │  │
│  │  │ Sales Commission         │  ₹10,500.00 │ │ Income Tax (TDS)           │       ₹0.00 │   │  │
│  │  ├──────────────────────────┼─────────────┤ ├────────────────────────────┼─────────────┤   │  │
│  │  │ Gross Earnings (A)       │  ₹75,500.00 │ │ Total Deductions (B)       │   ₹6,900.00 │   │  │
│  │  └──────────────────────────┴─────────────┘ └────────────────────────────┴─────────────┘   │  │
│  │                                                                                            │  │
│  │  ┌── NET PAYABLE AMOUNT (A - B) ────────────────────────────────────────────────────────┐  │  │
│  │  │ Amount in words: Sixty Eight Thousand Six Hundred Rupees Only           ₹68,600.00   │  │  │
│  │  └──────────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                            │  │
│  │            _____________________                         _____________________             │  │
│  │             Employee Signature                            Authorised Signatory             │  │
│  └────────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Screen-Only Actions (`.no-print`)**:
   - `← Back to Payroll`: React Router `<Link>` returning to `/erp6/payroll`.
   - `🖨️ Print Slip (1 Page)` button calling `window.print()`.

2. **Letterhead & Metadata**:
   - Company Name: `ELECTRO CRM & ERP LTD.`
   - Subtitle: `Industrial Electronics & Semiconductor Systems` + address.
   - Metadata Block: Employee ID, Employee Name, Department, Designation, Slip ID, and Payment Status (`GENERATED` or `PAID`).

3. **Side-by-Side Breakdown**:
   - **Earnings Table**:
     - Basic Salary (e.g. ₹45,000.00)
     - House Rent Allowance (HRA: 40% of Basic = ₹18,000.00)
     - Special / Medical Allowances (Standard ₹2,000.00)
     - Sales Commission (from ERP6-D1 commissions table = ₹10,500.00)
     - Gross Earnings (Sum = ₹75,500.00)
   - **Deductions Table**:
     - Provident Fund (12% of Basic = ₹5,400.00)
     - Absenteeism Deductions (Base / 30 per day = ₹1,500.00)
     - Professional Tax / TDS (₹0.00)
     - Total Deductions (Sum = ₹6,900.00)

4. **Net Payable Highlight**:
   - Prominently styled green banner (`#f0fdf4`, border `#bbf7d0`).
   - Amount formatted in INR (`₹68,600.00`).
   - Words translation: `Sixty Eight Thousand Six Hundred Rupees Only` via `numberToWordsINR()`.

5. **Single-Page Print Compliance**:
   - `@media print` strictly hides `.sidebar`, `.top-bar`, `.no-print`, and buttons.
   - Enforces `@page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }`.
   - Sets `page-break-inside: avoid;` on the outer card container to ensure zero page overflow.
