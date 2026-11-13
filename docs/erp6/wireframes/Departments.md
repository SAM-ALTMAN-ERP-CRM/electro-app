# Wireframe: Departments Management Screen
**Route**: `/erp6/departments`  
**Issues**: ERP6-A1, ERP6-A2  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [departments.svg](departments.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-6 HR & Workforce          │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp6/departments — Departments Master   [Dev · Admin]  │  │
│    > Employees                   │  └─────────────────────────────────────────────────────────┘  │
│    > Departments     ← active    │                                                               │
│    > Attendance                  │  Departments Master  [ERP-6 HR]             [+ Add Department]│
│    > Leaves                      │  Configure business units, leadership & departmental staff    │
│    > Payroll                     │                                                               │
│    > Commissions                 │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐ │
│    > Leaderboard                 │  │ 5 Units Total│ │ 12 Employees │ │ CRM-1, CRM-2, ERP-5    │ │
│                                  │  └──────────────┘ └──────────────┘ └────────────────────────┘ │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ DEPT ID   DEPARTMENT NAME        HEAD OF DEPT     HEAD   │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ DEP-01    Sales & Business Dev   Aarav S. (EMP-1)   4    │ │
│                                  │  │ DEP-02    Field Service & Supp   Rohan M. (EMP-5)   3    │ │
│                                  │  │ DEP-03    Hardware & R&D Eng     Vikram P. (EMP-8)  2    │ │
│                                  │  │ DEP-04    Operations & Logistics Suresh B. (EMP-11) 2    │ │
│                                  │  │ DEP-05    Executive & HR Mgmt    Ananya R. (EMP-12) 1    │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Header & Actions**:
   - Title: `Departments Master`
   - Subtitle: `Configure operational business units, managers, and employee headcounts.`
   - Primary Action: `+ Add Department` button opening an inline card or modal for Department Name.

2. **Summary KPI Cards**:
   - Total Units: Count of registered departments (5 seeded departments).
   - Total Headcount: Total count of active employees allocated across departments.
   - Connected Teams: Indicators for CRM-1 (Sales), CRM-2 (Field Service), ERP-5 (Finance).

3. **Data Table**:
   - `DEPT ID`: Unique key from `DEP-01` to `DEP-05`.
   - `Department Name`: Full business unit title.
   - `Head of Department`: Designation or primary lead employee name.
   - `Headcount`: Number of active employees linked via `employee.department_id`.
   - `Status`: Green badge (`ACTIVE`).
   - `Actions`: `Edit` (inline rename modal), `Delete` (safeguarded: prevented if headcount > 0).

4. **Integrity Rules**:
   - Deleting a department with active assigned employees returns HTTP `400 Bad Request`.
   - Department names must be non-empty and unique.
