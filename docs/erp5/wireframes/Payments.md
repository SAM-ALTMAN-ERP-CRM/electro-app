# Wireframe: Payments Page
**Route**: `/erp5/payments`  **Issue**: ERP5-B2  **Roles**: `admin`, `finance`

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    > Invoices                    │  Payments                                     │
│    > Payments          ←active   │                                               │
│    > Credit Notes                │  Record Payment                               │
│    > Ledger                      │  ┌──────────────────────────────────────────┐ │
│    > Reports                     │  │  Invoice *           Amount *             │ │
│                                  │  │  [INV-0002 ▼]        [₹ _______]         │ │
│                                  │  │  Balance due: ₹59,000                    │ │
│                                  │  │                                          │ │
│                                  │  │  Method *            Reference           │ │
│                                  │  │  [UPI ▼]             [UTR / TXN ID]      │ │
│                                  │  │                                          │ │
│                                  │  │  Paid On *                               │ │
│                                  │  │  [2024-01-20]                            │ │
│                                  │  │                                          │ │
│                                  │  │  [Record Payment]                        │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  All Payments                                 │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │ ID       Invoice   Amount    Method Date │ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │PAY-0001  INV-0001  ₹1,18,000 Bank  …    │ │
│                                  │  │PAY-0002  INV-0003  ₹10,000   UPI   …    │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Notes

- Invoice dropdown shows only `unpaid` and `partially_paid` invoices
- Amount field pre-fills with the invoice's remaining balance
- Method options: `upi`, `card`, `bank_transfer`, `cash`
- Overpayment: form shows inline error "Amount exceeds balance due (₹X)"
- After recording: invoice status badge on the detail page updates live
- Empty payments table: "No payments recorded yet."
