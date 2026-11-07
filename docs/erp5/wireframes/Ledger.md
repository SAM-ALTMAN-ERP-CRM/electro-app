# Wireframe: Ledger Page
**Route**: `/erp5/ledger`  **Issue**: ERP5-D2  **Roles**: `admin`, `finance`

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    > Invoices                    │  General Ledger                               │
│    > Payments                    │                                               │
│    > Credit Notes                │  Filters:                                     │
│    > Ledger            ←active   │  Account [all▼]  From [__-__-____]            │
│    > Reports                     │  To      [__-__-____]       [Apply Filter]    │
│                                  │                                               │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │ Date   Account      Ref      Dr       Cr │ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │2024-01 receivables  INV-0001 1,18,000  — │ │
│                                  │  │2024-01 sales        INV-0001 —    1,18,000│ │
│                                  │  │2024-01 cash         PAY-0001 1,18,000  — │ │
│                                  │  │2024-01 receivables  PAY-0001 —    1,18,000│ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  Totals: Debit ₹X,XX,XXX  Credit ₹X,XX,XXX  │
│                                  │  (These must always match — double-entry)     │
│                                  │                                               │
│                                  │  Add Manual Entry                             │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │  Account [________]   Debit  [_______]   │ │
│                                  │  │  Reference [______]   Credit [_______]   │ │
│                                  │  │  Description [_________________________] │ │
│                                  │  │  [Add Entry]                             │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Notes

- Account filter options: `all`, `receivables`, `sales`, `cash`, `purchases`, `salary_expense`
- Debit/Credit totals at bottom must always match (double-entry invariant)
- Totals row is highlighted if they don't match (data integrity warning)
- Manual entries: only one of Debit or Credit may be non-zero per row
- Empty state: "No ledger entries for the selected filters."
- **Print style**: hides sidebar, filters, and add-entry form; shows table + totals only
