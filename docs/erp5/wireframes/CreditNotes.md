# Wireframe: Credit Notes Page
**Route**: `/erp5/credit-notes`  **Issue**: ERP5-A4  **Roles**: `admin`, `finance`

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    > Invoices                    │  Credit Notes                                 │
│    > Payments                    │                                               │
│    > Credit Notes      ←active   │  ┌──────────────────────────────────────────┐ │
│    > Ledger                      │  │ ID       Order    Invoice  Amount   Date  │ │
│    > Reports                     │  │──────────────────────────────────────────│ │
│                                  │  │CN-0001   SO-0003  INV-0003 ₹5,000  …     │ │
│                                  │  │CN-0002   SO-0005  INV-0005 ₹12,000 …     │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  (Credit notes are created automatically     │
│                                  │   when ERP-4 posts a return with outcome     │
│                                  │   = credit_note. No manual form needed.)     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Notes

- Table is read-only — credit notes are created by ERP-4 via `POST /api/creditnotes`
- Each row links back to its invoice (`INV-xxxx`) on the Invoice Detail page
- Empty state: "No credit notes yet. They appear here when ERP-4 processes a return."
- Amounts in ₹ with `toLocaleString('en-IN')`
