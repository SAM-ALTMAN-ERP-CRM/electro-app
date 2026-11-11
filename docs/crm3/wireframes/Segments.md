# Wireframe: Segments Directory Page
**Route**: `/crm3/segments`  
**Issues**: CRM3-C2  
**Roles**: `admin`, `sales`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT                                 │
│  ⚡ Electro App                  │                                               │
│    CUSTOMERS (CRM-3)             │  Customer Segments           [CRM-3]          │
│    > Customers                   │  Manage targeted customer marketing cohorts   │
│    > Segments          ←active   │                                               │
│    > Duplicates                  │  ┌── Segments Directory ────────────────────┐ │
│    > Import                      │  │ ID       Name             Criteria Action│ │
│                                  │  │──────────────────────────────────────────│ │
│                                  │  │SEG-0001  Corporate Mumbai [corp]   View  │ │
│                                  │  │                           Mumbai   [CSV] │ │
│                                  │  │SEG-0002  Retail Clients   [retail] View  │ │
│                                  │  │                           Any City [CSV] │ │
│                                  │  │SEG-0003  Dealers in Pune  [dealer] View  │ │
│                                  │  │                           Pune     [CSV] │ │
│                                  │  └──────────────────────────────────────────┘ │
│                                  │                                               │
│                                  │  ┌── Create New Segment ────────────────────┐ │
│                                  │  │ Segment Name: [________________________] │ │
│                                  │  │ Customer Type: [ All Types ▼ ]           │ │
│                                  │  │ Target City:   [ All Cities ▼ ]          │ │
│                                  │  │                                          │ │
│                                  │  │ [ + Create Segment ]                     │ │
│                                  │  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen Elements & Behaviors

1. **Header & Context**:
   - Title: `Customer Segments` with `<span className="badge badge-blue">CRM-3</span>`.
   - Subtitle: "Manage targeted customer marketing cohorts and audience groups."
2. **Segments Table**:
   - Columns: `Segment ID`, `Name`, `Filter Criteria` (Type badge + City badge), `Created Date`, `Actions`.
   - Actions:
     - `View Cohort` &rarr; links to `/crm3/segments/:id`.
     - `📥 CSV` quick export &rarr; downloads `segment-:id-export.csv`.
3. **Create Segment Form Card**:
   - Inputs: Segment Name (mandatory), Customer Type dropdown (`All Types`, `Retail`, `Corporate`, `Dealer`), City dropdown (`All Cities`, `Mumbai`, `Pune`, `Delhi`, `Bengaluru`, `Kochi`, etc.).
   - "Create Segment" button triggers `POST /api/segments` and navigates directly to the created segment cohort screen.
