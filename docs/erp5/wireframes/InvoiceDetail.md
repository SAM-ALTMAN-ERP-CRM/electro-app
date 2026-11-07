# Wireframe: Invoice Detail Page
**Route**: `/erp5/invoices/:id`  **Issue**: ERP5-A2  **Roles**: `admin`, `finance`

---

## Layout (screen view)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    > Invoices          ←active   │  ← Back to Invoices        [🖨 Print]        │
│    > Payments                    │                                               │
│                                  │  ┌── INVOICE (printable area) ─────────────┐  │
│                                  │  │                                          │  │
│                                  │  │  ELECTRO APP PVT. LTD.                  │  │
│                                  │  │  GSTIN: 27AABCE1234F1Z5                 │  │
│                                  │  │  Mumbai, Maharashtra                     │  │
│                                  │  │                           TAX INVOICE    │  │
│                                  │  │  Invoice No.: INV-0001                  │  │
│                                  │  │  Date: 2024-01-15   Due: 2024-01-30     │  │
│                                  │  │                                          │  │
│                                  │  │  Bill To:                               │  │
│                                  │  │  Acme Electronics Pvt. Ltd.            │  │
│                                  │  │  CUST-0001 | GSTIN: 27AAACE1234D1Z8    │  │
│                                  │  │                                          │  │
│                                  │  │  ┌──────────────────────────────────┐  │  │
│                                  │  │  │ # │ SKU      │ Desc │ Qty │ Rate │  │  │
│                                  │  │  │ 1 │ SKU-0001 │ PCB  │ 50  │ 1000 │  │  │
│                                  │  │  │ 2 │ SKU-0003 │ Disp │ 10  │ 2000 │  │  │
│                                  │  │  └──────────────────────────────────┘  │  │
│                                  │  │                                          │  │
│                                  │  │  Subtotal:          ₹70,000             │  │
│                                  │  │  CGST (9%):         ₹6,300              │  │
│                                  │  │  SGST (9%):         ₹6,300              │  │
│                                  │  │  ─────────────────────────────          │  │
│                                  │  │  Total:             ₹82,600             │  │
│                                  │  │                                          │  │
│                                  │  │  Amount in Words:                       │  │
│                                  │  │  Rupees Eighty Two Thousand Six         │  │
│                                  │  │  Hundred Only                           │  │
│                                  │  │                                          │  │
│                                  │  │  Status: [partially_paid]               │  │
│                                  │  │  Balance Due: ₹32,600                   │  │
│                                  │  └──────────────────────────────────────────┘  │
│                                  │                                               │
│                                  │  Payment History                              │
│                                  │  PAY-0001  ₹50,000  UPI  2024-01-18  [paid]  │
│                                  │                                               │
│                                  │  Credit Notes                                 │
│                                  │  CN-0001   ₹5,000   2024-02-01               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Print Layout (`@media print`)

```
┌────────────────────────────────────────────┐
│  (Sidebar, top-bar, Back button hidden)    │
│  Printable area only — full width          │
│  One page, A4                              │
└────────────────────────────────────────────┘
```

---

## UI Notes

- Print button calls `window.print()` — no server round-trip
- `@media print { .sidebar, .top-bar, .back-btn { display: none !important; } .print-area { width: 100%; } }`
- Amount in words generated client-side (no library — custom JS function)
- Payment history table below invoice; hidden in print
- Credit notes section below payments; hidden in print
