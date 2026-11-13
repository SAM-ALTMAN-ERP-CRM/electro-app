# Wireframe: Leave Management & Approvals Screen
**Route**: `/erp6/leaves`  
**Issues**: ERP6-B1, ERP6-B2, ERP6-B3  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [leaves.svg](leaves.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-6 HR & Workforce          │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp6/leaves — Leave Management & Approvals [Dev·Admin] │  │
│    > Employees                   │  └─────────────────────────────────────────────────────────┘  │
│    > Departments                 │                                                               │
│    > Attendance                  │  Leave Requests & Quotas  [ERP-6 HR]                          │
│    > Leaves          ← active    │  Apply for leave, monitor 12-day annual quota, manage requests│
│    > Payroll                     │                                                               │
│    > Commissions                 │  ┌── APPLY REQUEST ─────────┐ ┌── REQUESTS LIST ────────────┐ │
│    > Leaderboard                 │  │ Employee: [EMP-0001 ▼]   │ │ ID / EMP   DATES      STAT  │ │
│                                  │  │ Type: [Casual (12d) ▼]   │ │─────────────────────────────│ │
│                                  │  │ From: [2026-11-20]       │ │ LV-0001    Nov 18-19  [PEND]│ │
│                                  │  │ To:   [2026-11-21]       │ │ EMP-0003   (Sick 2d)  [App] │ │
│                                  │  │ Reason: [Wedding in Pune]│ │                       [Rej] │ │
│                                  │  │ [ Submit Leave Request ] │ │ LV-0002    Nov 05     [APPR]│ │
│                                  │  │ Quota: 12 days / yr      │ │ EMP-0001   (Casual)         │ │
│                                  │  └──────────────────────────┘ └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Header**:
   - Title: `Leave Requests & Quotas`
   - Subtitle: `Apply leave, audit 12-day annual balances, and authorize manager decisions.`

2. **Apply Leave Form Card**:
   - `Employee`: Select dropdown filtering active employees.
   - `Leave Type`: `casual`, `sick`, `earned`.
   - `From Date` & `To Date`: Date picker inputs calculating total calendar business days.
   - `Reason`: Freeform justification text.
   - `Annual Quota Validation`: Each employee is granted exactly 12 leave days per year. If a request exceeds their balance, the server rejects with HTTP `400 Bad Request`.

3. **Requests Table & Decision Controls**:
   - `Request ID`: Sequence text, e.g. `LV-0001`.
   - `Employee ID` & `Name`.
   - `Date Range & Duration`: E.g. `2026-11-18 to 2026-11-19 (2 Days)`.
   - `Status Badge`: Amber `.badge-amber` (`PENDING`), Green `.badge-green` (`APPROVED`), Red `.badge-red` (`REJECTED`).
   - `Manager Decision Actions`: `Approve` button and `Reject` button calling `PATCH /api/leave-requests/:id/decision`.
   - When approved, weekdays in the range are automatically logged in `attendance` with `status = 'leave'`.
