# Wireframe: Employees Directory Screen
**Route**: `/erp6/employees` (and default `/erp6`)  
**Issues**: ERP6-A1, ERP6-A2, ERP6-A3  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [employees.svg](employees.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-6 HR & Workforce          │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp6/employees — Employee Directory     [Dev · Admin]  │  │
│    > Employees       ← active    │  └─────────────────────────────────────────────────────────┘  │
│    > Departments                 │                                                               │
│    > Attendance                  │  Employee Directory  [ERP-6 HR]              [+ Add Employee] │
│    > Leaves                      │  Manage staff profiles, departments, base pay & active status │
│    > Payroll                     │                                                               │
│    > Commissions                 │  [🔍 Search name, email, ID...] [Dept: All ▼] [Role: All ▼]  │
│    > Leaderboard                 │  [x] Show Inactive                                            │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ EMP ID   NAME & EMAIL     DEPT         ROLE    BASE  STAT │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ EMP-0001 Aarav Sharma     Sales        Sales   ₹45k  [ACT]│ │
│                                  │  │ EMP-0002 Priya Nair       Sales        Sales   ₹40k  [ACT]│ │
│                                  │  │ EMP-0005 Rohan Mehta      Field Svc    Service ₹50k  [ACT]│ │
│                                  │  │ EMP-0010 Sunil Kulkarni   Engineering  Tech    ₹32k  [INA]│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │  Showing 1 to 4 of 12 employees (Active: 11, Inactive: 1)     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Header & Actions**:
   - Title: `Employee Directory`
   - Badge: `.badge.badge-blue` with `ERP-6 HR`.
   - Subtitle: `Manage staff profiles, departmental allocations, compensation & active statuses.`
   - Primary Action: `+ Add Employee` button opening a modal with Name, Email, Department (DEP-01..05), Role Title, Manager dropdown, and Base Salary.

2. **Search & Filters**:
   - Free text search input: filters across `name`, `email`, and `id`.
   - Department Dropdown: lists `DEP-01` to `DEP-05` (Sales, Field Service, Engineering, Operations, Management).
   - Role Title Dropdown: filters by `Sales Rep` (4 seed employees), `Service Engineer` (3 seed employees), or other roles.
   - Show Inactive Checkbox: hidden by default; when checked, reveals deactivated staff with red `.badge-red` (`INACTIVE`).

3. **Data Table**:
   - `EMP ID`: Monospace string, e.g. `EMP-0001`.
   - `Name & Email`: Primary employee name with secondary email caption.
   - `Department`: Associated department name with ID.
   - `Designation`: Job title (`Sales Rep`, `Service Engineer`, etc.).
   - `Base Salary`: Formatted in INR with `₹` and `toLocaleString('en-IN')` (e.g. `₹45,000.00`), right-aligned.
   - `Status`: Badge (`ACTIVE` in green `#15803d`, `INACTIVE` in red `#b91c1c`).
   - `Actions`: `Edit` trigger, `Deactivate` button (soft-delete updating `active = false`), or `Reactivate` button.

4. **Business Safeguards**:
   - Duplicate email returns HTTP `409 Conflict`.
   - An employee cannot be set as their own manager.
   - Soft deactivation prevents breaking foreign keys in CRM-1 quotes and CRM-2 tickets.
