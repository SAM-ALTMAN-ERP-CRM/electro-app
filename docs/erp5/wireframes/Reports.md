# Wireframe: Finance Reports Page
**Route**: `/erp5/reports`  **Issue**: ERP5-D3  **Roles**: `admin`, `finance`

---

## Layout

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    > Invoices                    │  Finance Reports              [⬇ Download CSV]│
│    > Payments                    │                                               │
│    > Ledger                      │  ┌── KPI Cards ─────────────────────────────┐ │
│    > Reports           ←active   │  │  ┌──────────┐ ┌──────────┐              │ │
│                                  │  │  │Total     │ │Total     │              │ │
│                                  │  │  │Sales     │ │Received  │              │ │
│                                  │  │  │₹5,90,000 │ │₹4,72,000 │              │ │
│                                  │  │  └──────────┘ └──────────┘              │ │
│                                  │  │  ┌──────────┐ ┌──────────┐              │ │
│                                  │  │  │Outstanding│ │Cash      │              │ │
│                                  │  │  │₹1,18,000 │ │Balance   │              │ │
│                                  │  │  │          │ │₹4,72,000 │              │ │
│                                  │  │  └──────────┘ └──────────┘              │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  Monthly Sales (CSS bar chart)               │
│                                  │                                               │
│                                  │  Jan ████████████████████ ₹1,18,000          │
│                                  │  Feb ██████████           ₹59,000            │
│                                  │  Mar ████████████████     ₹94,400            │
│                                  │  Apr ████████████████████ ₹1,18,600          │
│                                  │  May ████████             ₹47,200            │
│                                  │                                               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Notes

- **4 KPI cards** in a 2×2 CSS grid: Total Sales, Total Received, Outstanding, Cash Balance
- **Bar chart**: pure CSS `div` bars (no chart library) — width = `(amount / maxMonth) * 100%`
- **CSV download**: `GET /api/reports/summary` data exported client-side via `Blob` + `URL.createObjectURL`
- Numbers formatted with `toLocaleString('en-IN')` and ₹ prefix
- Empty state: "No data yet. Run `npm run db:setup` to load seed data."
- **Print style**: hides sidebar and download button; KPI cards + chart print cleanly
