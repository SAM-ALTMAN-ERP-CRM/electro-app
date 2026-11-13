# Wireframe: RMA Detail & Decision Page
**Route**: `/crm2/rmas/:id`  
**Issue**: CRM2-C2 (Aditya Kumbhar), CRM2-C3 (Ashutosh)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ < Back to RMAs                                                                   │
│ RMA RMA-0001: TV55-2611-0001              [approved]                             │
│──────────────────────────────────────────────────────────────────────────────────│
│ ┌─ RETURN REQUEST DETAILS ─────────────────┐ ┌─ DECISION & HANDOFF ────────────┐ │
│ │ Ticket: TKT-0001 (TV screen flickers)    │ │ ERP-4 Return Handoff Status:    │ │
│ │ Serial: TV55-2611-0001 (CUST-0001)       │ │ ✓ Dispatched to ERP-4 Returns   │ │
│ │ Reason: Defective display panel          │ │                                 │ │
│ │                                          │ │ Decision Notes:                 │ │
│ │ Warranty Check: [In warranty]            │ │ [ Inspection approved...      ] │ │
│ │ (Warranty verified before RMA approval)  │ │                                 │ │
│ │                                          │ │ [ Approve (Green) ] [ Reject ]  │ │
│ └──────────────────────────────────────────┘ └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Warranty Rule Block (CRM2-C3)**: Checks warranty status; expired serials prevent approval.
2. **ERP-4 Handoff Status**: Shows confirmation when approved return is handed off to ERP-4 returns endpoint.
3. **Decisions**: Action buttons for Approve (green) and Reject (red).
4. **No Sidebar Link**: Route without label in `index.jsx` keeps detail view out of the left menu.
