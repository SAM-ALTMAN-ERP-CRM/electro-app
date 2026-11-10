# Wireframe: Receivables Ageing Page
**Route**: `/erp5/receivables`  **Issue**: ERP5-B3  **Roles**: `admin`, `finance`

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    > Invoices                    │  Receivables Ageing                           │
│    > Payments                    │                                               │
│    > Receivables       ←active   │  As of: 2024-02-01                           │
│    > Ledger                      │                                               │
│    > Reports                     │  ┌──────────────────────────────────────────┐ │
│                                  │  │ Customer   Current  1-30d  31-60d  60d+  │ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │CUST-0001   ₹0       ₹59,000 ₹0     ₹0   │ │
│                                  │  │CUST-0003   ₹23,600  ₹0      ₹0     ₹0   │ │
│                                  │  │CUST-0005   ₹0       ₹0      ₹18,000 ₹0  │ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │ TOTAL      ₹23,600  ₹59,000 ₹18,000 ₹0  │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  Grand Total Outstanding: ₹1,00,600          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Notes

- Ageing buckets: Current (not yet due), 1–30 days, 31–60 days, 60+ days overdue
- Amounts in ₹ with `toLocaleString('en-IN')`
- Overdue amounts (31+ days) shown in red text for urgency
- Totals row: bold, background `#f8fafc`
- Empty state: "All invoices are paid. No outstanding receivables."
