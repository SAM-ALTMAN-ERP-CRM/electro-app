# Wireframe: Tickets List Page
**Route**: `/crm2/tickets`  
**Issue**: CRM2-A2 (Ashutosh)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Support Tickets                  [CRM-2]                     [ + New Ticket ]    │
│ Manage customer issues, SLA timelines, and technician dispatch                   │
│──────────────────────────────────────────────────────────────────────────────────│
│ [ 🔍 Filter by customer, ID... ]  [ Status: All ▼ ]   [ Priority: All ▼ ]        │
│                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ TICKET ID  CUSTOMER          SUBJECT          PRIORITY  STATUS      SLA/DUE  │ │
│ │──────────────────────────────────────────────────────────────────────────────│ │
│ │ TKT-0001   Aarav Mehta       TV screen flicker [high]    [in_progress][Overdue]│ │
│ │ TKT-0002   Sunrise Electr.   No sound HDMI     [medium]  [open]       [Overdue]│ │
│ │ TKT-0003   Priya Nair        Remote pairing    [low]     [resolved]   Closed   │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Header**: Title with CRM-2 badge and "+ New Ticket" action button opening create modal.
2. **Filters**: Quick search input, status dropdown, priority dropdown.
3. **Table Columns**: Ticket ID, Customer, Subject, Priority badge, Status badge, SLA badge, View link.
4. **Empty State**: Friendly "No tickets match criteria" if empty.
