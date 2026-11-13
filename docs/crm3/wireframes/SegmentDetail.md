# Wireframe: Segment Detail & Matching Cohort Page
**Route**: `/crm3/segments/:id`  
**Issues**: CRM3-C2, CRM3-C3  
**Roles**: `admin`, `sales`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    CUSTOMERS (CRM-3)             │  ← Back to Segments                           │
│    > Customers                   │                                               │
│    > Segments          ←active   │  Corporate in Mumbai                          │
│    > Duplicates                  │  ID: SEG-0001 · Created: 01 Nov 2026          │
│    > Import                      │                                               │
│                                  │  Criteria: [ Type: corporate ] [ City: Mumbai ]
│                                  │                                               │
│                                  │  ┌── Cohort KPI ────────────────────────────┐ │
│                                  │  │ Matching Customers: 1                     │ │
│                                  │  │ [ 📥 Download CSV (Excel) ]              │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  Matching Customer Cohort:                    │
│                                  │  ┌──────────────────────────────────────────┐ │
│                                  │  │ ID       Name         Type   City  Action│ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │CUST-0002 Sunrise El.  [corp] Mumbai View │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header & Navigation**:
   - "← Back to Segments" link returns to `/crm3/segments`.
   - Segment title, ID (`SEG-0001`), and formatted creation date.
   - Applied criteria badges: `<span className="badge badge-green">Type: corporate</span>`, `<span className="badge badge-blue">City: Mumbai</span>`.
2. **Cohort KPI & Action Card**:
   - KPI display showing total number of matching customer accounts (`count`).
   - "Download CSV (Excel)" action button triggering dynamic export from `GET /api/segments/:id/export.csv` with UTF-8 BOM encoding for seamless Microsoft Excel compatibility.
3. **Matching Customers Cohort Table**:
   - Columns: `Customer ID`, `Customer Name`, `Type`, `Email`, `Phone`, `City`, `GSTIN`, `Action`.
   - Clicking "View Profile" navigates to `/crm3/customers/:id`.
   - Displays friendly empty state if criteria yield zero matching records.
