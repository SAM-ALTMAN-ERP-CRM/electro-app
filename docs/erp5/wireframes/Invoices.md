# Wireframe: Invoices List Page
**Route**: `/erp5/invoices`  **Issue**: ERP5-A2  **Roles**: `admin`, `finance`

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    > Invoices          ←active   │  ┌── TOP BAR ─────────────────────────────┐  │
│    > Payments                    │  │  Active: Finance & Auth      [finance]  │  │
│    > Credit Notes                │  │                     Priya Sharma  [Logout] │
│    > Ledger                      │  └────────────────────────────────────────┘  │
│    > Reports                     │                                               │
│    > Users (admin)               │  Invoices                                     │
│                                  │                                               │
│                                  │  Filters:                                     │
│                                  │  Customer [__________▼]  Status [all▼]        │
│                                  │  From [YYYY-MM-DD]  To [YYYY-MM-DD]  [Filter] │
│                                  │                                               │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │ ID       Customer   Date     Total  Status│ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │INV-0001  CUST-0001  2024-01  ₹1,18,000  │ │
│                                  │  │          Acme Elec.          [paid]      │ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │INV-0002  CUST-0003  2024-01  ₹59,000    │ │
│                                  │  │          Bharat Co.          [unpaid]    │ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │INV-0003  CUST-0005  2024-02  ₹23,600    │ │
│                                  │  │          Delta Sys.          [part_paid] │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  Summary: Billed ₹X,XX,XXX  Outstanding ₹X   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Notes

- Status badges: `[paid]` green · `[unpaid]` red · `[partially_paid]` yellow
- Clicking any row navigates to `/erp5/invoices/:id` (InvoiceDetail page)
- Totals formatted with `toLocaleString('en-IN')` and ₹ prefix
- Empty state: "No invoices found for the selected filters."
- **Print style**: `@media print { .sidebar, .top-bar, .filters { display: none; } }`
