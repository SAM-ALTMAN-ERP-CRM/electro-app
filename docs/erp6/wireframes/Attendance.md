# Wireframe: Daily Attendance Screen
**Route**: `/erp6/attendance`  
**Issues**: ERP6-B1, ERP6-B2, ERP6-B3  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [attendance.svg](attendance.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-6 HR & Workforce          │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp6/attendance — Daily Attendance Marker [Dev·Admin]  │  │
│    > Employees                   │  └─────────────────────────────────────────────────────────┘  │
│    > Departments                 │                                                               │
│    > Attendance      ← active    │  Daily Attendance Marker  [ERP-6 HR]                          │
│    > Leaves                      │  Mark daily status; logs calculate absenteeism in payroll     │
│    > Payroll                     │                                                               │
│    > Commissions                 │  [📅 Date: 2026-11-13] [Today] [10 Pres] [1 Half] [1 Abs]     │
│    > Leaderboard                 │                                         [💾 Save Attendance]  │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ EMP ID   EMPLOYEE NAME   DEPT       STATUS OPTIONS  TIME │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ EMP-0001 Aarav Sharma    Sales      (•)P ( )A ( )H  09:15│ │
│                                  │  │ EMP-0002 Priya Nair      Sales      (•)P ( )A ( )H  09:22│ │
│                                  │  │ EMP-0003 Vikram Patel    Field Svc  ( )P (•)A ( )H  —    │ │
│                                  │  │ EMP-0004 Ananya Roy      Field Svc  ( )P ( )A (•)H  13:30│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Header & Date Controls**:
   - Title: `Daily Attendance Marker`
   - Subtitle: `Mark daily present, absent, half-day, or leave logs. Synchronized with monthly payroll.`
   - Date picker defaulting to current system date (`YYYY-MM-DD`).
   - Quick date buttons: `Today`, `Yesterday`.
   - Summary status counters: Pills showing count of `Present` (green), `Half Day` (amber), and `Absent` (red).
   - Action: `💾 Save Attendance` button submitting attendance payload (`POST /api/attendance/mark`).

2. **Data & Radio Options**:
   - `EMP ID`: Unique employee identifier (`EMP-0001`..`EMP-0012`).
   - `Employee Name` & `Department`.
   - Status Radio Group:
     - `Present`: full working day.
     - `Absent`: unpaid day deducting `Base / 30` in monthly payroll.
     - `Half Day`: 0.5 day deduction.
     - `Leave`: maps to approved leave request.
   - `Check-in Time`: Timestamp recording entry time.

3. **Payroll Linkage (ERP6-C1/C2)**:
   - When monthly payroll generates, the system counts total `absent` days for the target month from the `attendance` table and deducts `absent_days * (base_salary / 30)`.
