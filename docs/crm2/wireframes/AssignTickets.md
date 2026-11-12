# Wireframe: Assign Tickets Page
**Route**: `/crm2/assign`  
**Issue**: CRM2-D2 (Anant)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Assign Tickets to Centres        [CRM-2]                                         │
│ Route open customer tickets to regional service and repair centres               │
│──────────────────────────────────────────────────────────────────────────────────│
│ ℹ 2 tickets awaiting service centre assignment                                  │
│                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ TICKET ID  CUSTOMER          SUBJECT        STATUS   CENTRE SELECT   ACTION  │ │
│ │──────────────────────────────────────────────────────────────────────────────│ │
│ │ TKT-0004   BrightHome Ret.   Dead pixels    [open]   [ SC-0002 ▼ ]   [Assign]│ │
│ │ TKT-0005   Metro Offices     Install visit  [open]   [ SC-0001 ▼ ]   [Assign]│ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Dynamic Unassigned Filter**: Loads `api('crm2', '/api/tickets')` and `api('crm2', '/api/assignments')`; excludes already-assigned and closed tickets.
2. **Active Centre Dropdown**: Select element populated only with active centres from `api('crm2', '/api/centres')`.
3. **Assign Action**: Calls `POST /api/assignments`, instantly removing the assigned ticket row from view.
4. **Empty State**: When all tickets are assigned, shows "All open tickets have been assigned to service centres."
