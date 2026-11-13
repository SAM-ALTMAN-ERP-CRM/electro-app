# Wireframe: RMA Directory Page
**Route**: `/crm2/rmas`  
**Issue**: CRM2-C2 (Aditya Kumbhar)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Product Returns (RMA)            [CRM-2]                     [ + Request RMA ]   │
│ Return merchandise authorisations and warranty validation                        │
│──────────────────────────────────────────────────────────────────────────────────│
│ [ 🔍 Filter by ticket or RMA ID... ]  [ Status: All Statuses ▼ ]                 │
│                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ RMA ID    TICKET    SERIAL NUMBER   REASON             STATUS      ACTION    │ │
│ │──────────────────────────────────────────────────────────────────────────────│ │
│ │ RMA-0001  TKT-0001  TV55-2611-0001  Defective display  [approved]  Review >  │ │
│ │ RMA-0002  TKT-0004  TV55-2611-0004  Dead pixels        [requested] Review >  │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Header & CTA**: Title with "+ Request RMA" button to initiate a new return authorisation.
2. **Filters**: Filter by text/serial and status dropdown (`requested`, `approved`, `rejected`, `received`).
3. **Table Columns**: RMA ID, Associated Ticket ID, Serial Number, Reason, Status badge, Review link.
4. **Status Badges**: `requested` (blue), `approved` (green), `rejected` (red), `received` (amber).
