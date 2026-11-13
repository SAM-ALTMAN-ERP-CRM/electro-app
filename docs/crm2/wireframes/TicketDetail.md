# Wireframe: Ticket Detail Page
**Route**: `/crm2/tickets/:id`  
**Issue**: CRM2-A2, CRM2-A3 (Ashutosh)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ < Back to Tickets                                                                │
│ Ticket TKT-0001: TV screen flickers       [in_progress]  [Overdue]               │
│──────────────────────────────────────────────────────────────────────────────────│
│ ┌─ TICKET DETAILS ─────────────────────────┐ ┌─ ACTIVITY & COMMENTS ───────────┐│
│ │ Customer: Aarav Mehta (CUST-0001)        │ │ System Admin · 5h ago            ││
│ │ Serial: TV55-2611-0001                   │ │ Customer confirmed flicker.      ││
│ │ Description: Screen flickers after warm. │ │                                  ││
│ │                                          │ │ Imran Qureshi · 2h ago           ││
│ │ Status: [ in_progress ▼ ] [ Save ]       │ │ Visited site. Part requested.    ││
│ │                                          │ │                                  ││
│ │ Assigned Engineer: Imran Qureshi         │ │ [ Write a comment...           ] ││
│ │                                          │ │                           [ Post]││
│ └──────────────────────────────────────────┘ └──────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Header**: Back link, subject, status badge, and overdue badge.
2. **Left Panel**: Customer details, serial number, description, inline status editor, engineer details.
3. **Right Panel**: Chronological comment list (author, timestamp, text) and new comment form.
4. **No Sidebar Link**: Route without label in `index.jsx` keeps detail view out of the left menu.
