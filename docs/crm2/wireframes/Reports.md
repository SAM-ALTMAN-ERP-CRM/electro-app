# Wireframe: Support Reports Page
**Route**: `/crm2/reports`  
**Issue**: CRM2-D3 (Ashutosh)  
**Roles**: `admin`, `support`

---

## Layout ASCII Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Support & Warranty Reports       [CRM-2]                                         │
│ Performance KPIs, SLA resolution metrics, and centre allocation                  │
│──────────────────────────────────────────────────────────────────────────────────│
│ ┌─ TOTAL TICKETS ─┐ ┌─ OVERDUE TICKETS ─┐ ┌─ AVG RESOLUTION ─┐ ┌─ ACTIVE CENTRES ┐│
│ │ 6               │ │ 3                 │ │ 24.5 h           │ │ 4               ││
│ └─────────────────┘ └───────────────────┘ └──────────────────┘ └─────────────────┘│
│                                                                                  │
│ ┌─ TICKETS BY STATUS (CSS BARS) ───────────┐ ┌─ TICKETS PER SERVICE CENTRE ────┐ │
│ │ Open (3)        [████████████████      ] │ │ Mumbai Central Care:        1   │ │
│ │ In Progress (1) [████                  ] │ │ Pune Deccan Hub:            1   │ │
│ │ Resolved (1)    [████                  ] │ │ Bengaluru Tech Care:        1   │ │
│ │ Closed (1)      [████                  ] │ │ Delhi Connaught Plaza:      0   │ │
│ └──────────────────────────────────────────┘ └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Key Elements & Consistency
1. **Summary Cards**: Metric cards showing Total Tickets, Overdue Tickets (red highlight), Average Resolution Hours, and Active Centres.
2. **Pure HTML/CSS Bar Charts**: No external charting libraries per project rules. Simple flex/div bars with proportionate widths and status badge colors.
3. **Tickets per Centre Breakdown**: Distribution table derived from `service_centres` joined with `ticket_assignments`.
4. **Resilience**: Displays zeroes and clean empty states if database has no ticket or assignment rows.
