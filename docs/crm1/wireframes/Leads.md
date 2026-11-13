# Wireframe: Leads Management Screen
**Route**: `/crm1/leads`  
**Issues**: CRM1-A1, CRM1-A2, CRM1-A3  
**Roles**: `admin`, `sales`

---

## Screen Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro CRM + ERP             │                                                               │
│    > Leads            ←active    │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│    > Pipeline                    │  │ Active Workspace: Sales (CRM-1)        Role: [sales]    │  │
│    > Quotes                      │  │                                        User: Rajesh K.  │  │
│    > New Quote                   │  └─────────────────────────────────────────────────────────┘  │
│    > Dealers                     │                                                               │
│    > Approvals (admin)           │  Sales Leads                               [+ Add New Lead]   │
│                                  │  Track customer inquiries, scores & reps                      │
│                                  │                                                               │
│                                  │  Filter by Status: [All Statuses ▼]                           │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ ID        Lead Name      Source   Score   Status   Rep   │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ LEAD-0001 Rajesh Kumar   dealer   70 Hot  [qual]   EMP-1 │ │
│                                  │  │ LEAD-0002 Simran Kaur    web      50      [cont]   EMP-2 │ │
│                                  │  │ LEAD-0003 Amit Shah      walk-in  40      [new]    EMP-3 │ │
│                                  │  │ LEAD-0004 Pooja Verma    dealer   80 Hot  [qual]   EMP-4 │ │
│                                  │  │ LEAD-0005 Vikram Joshi   web      30      [lost]   EMP-1 │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  ┌── MODAL / INLINE FORM: Add New Lead ────────────────────┐ │
│                                  │  │ Name: [______________]  Phone: [___________]            │ │
│                                  │  │ Email: [_____________]  Source: [dealer ▼]              │ │
│                                  │  │ Interest: [55" TV ▼]    Rep: [EMP-0001 (Rajesh) ▼]      │ │
│                                  │  │                                 [Cancel] [Save Lead]     │ │
│                                  │  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Specifications

1. **Header**:
   - Title: `Sales Leads`
   - Subtitle: `Track incoming inquiries, contact details, lead scores, and rep assignments.`
   - Action: `+ Add New Lead` button toggling the lead capture form.
2. **Filters**:
   - Status dropdown: `All Statuses`, `New`, `Contacted`, `Qualified`, `Lost`.
3. **Table Columns**:
   - `Lead ID`: text identifier (e.g. `LEAD-0001`)
   - `Lead Details`: Name, email address, and phone number
   - `Source`: `dealer`, `web`, `walk-in`
   - `Product Interest`: SKU category or appliance interest
   - `Lead Score`: Integer (0–100) with `🔥 Hot` badge for scores $\ge 60$
   - `Status`: Coloured status badge (`new` blue, `contacted` amber, `qualified` green, `lost` red)
   - `Sales Rep`: Rep ID (`EMP-0001` to `EMP-0004`)
   - `Actions`: `Edit` and `Delete` controls
4. **Scoring Logic**:
   - Source: dealer (+30), web (+20), walk-in (+10)
   - Email present: +10
   - Phone present: +10
   - Product interest selected: +10
   - High priority threshold: $\ge 60$ displays `Hot Lead` tag.
5. **Print Rules**:
   - The sidebar and action buttons are hidden when printing.
