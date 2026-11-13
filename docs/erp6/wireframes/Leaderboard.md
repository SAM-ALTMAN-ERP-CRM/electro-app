# Wireframe: Sales Performance Leaderboard Screen
**Route**: `/erp6/leaderboard`  
**Issues**: ERP6-D3  
**Roles**: `admin`, `hr`  
**Wireframe Image**: [leaderboard.svg](leaderboard.svg)

---

## 1. Screen Layout (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden on print)        │ MAIN CONTENT AREA                                             │
│  ⚡ Electro App                   │                                                               │
│    ERP-6 HR & Workforce          │  ┌── TOP BAR ──────────────────────────────────────────────┐  │
│                                  │  │ /erp6/leaderboard — Sales Leaderboard       [Dev·Admin] │  │
│    > Employees                   │  └─────────────────────────────────────────────────────────┘  │
│    > Departments                 │                                                               │
│    > Attendance                  │  Sales Performance Leaderboard  [ERP-6 HR]                    │
│    > Leaves                      │  Ranked sales representatives by closed deals & revenue       │
│    > Payroll                     │                                                               │
│    > Commissions                 │  [Month: 2026-11]                         [📥 Download CSV]   │
│    > Leaderboard     ← active    │                                                               │
│                                  │  ┌── 🏆 MONTHLY SALES CHAMPION SPOTLIGHT ───────────────────┐ │
│                                  │  │ Aarav Sharma (EMP-0001) · 8 Deals · ₹7,45,000 · ₹18,625  │ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
│                                  │                                                               │
│                                  │  ┌──────────────────────────────────────────────────────────┐ │
│                                  │  │ RANK  REP NAME & ID        DEALS  TOTAL SALES   COMM   QUOTA │ │
│                                  │  │──────────────────────────────────────────────────────────│ │
│                                  │  │ #1 🥇 Aarav Sharma (EMP-1)   8    ₹7,45,000.00  ₹18.6k [149%]│ │
│                                  │  │ #2 🥈 Priya Nair (EMP-2)     6    ₹5,20,000.00  ₹12.8k [104%]│ │
│                                  │  │ #3 🥉 Ananya Roy (EMP-4)     4    ₹3,40,000.00   ₹7.8k [ 85%]│ │
│                                  │  │ #4    Vikram Patel (EMP-3)   3    ₹2,40,000.00   ₹5.9k [ 60%]│ │
│                                  │  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Specifications

1. **Header & Action Bar**:
   - Title: `Sales Performance Leaderboard`
   - Subtitle: `Ranked sales representatives by closed deal revenue, commission earnings, and quota attainment.`
   - Month Selector: Month picker input (`YYYY-MM`).
   - Action: `📥 Download CSV` button exporting rankings in CSV format compatible with Microsoft Excel and Google Sheets.

2. **Top Performer Spotlight Banner**:
   - Highlighting the #1 sales rep of the month.
   - Metrics: Rep Name (`Aarav Sharma`), Employee ID (`EMP-0001`), Deals Closed (`8`), Total Sales Volume (`₹7,45,000.00`), Total Commission (`₹18,625.00`).

3. **Ranked Leaderboard Table**:
   - `RANK`: Numeric rank badge (`#1` Gold, `#2` Silver, `#3` Bronze, `#4` Standard). Top performer highlighted with `#fefce8` background.
   - `SALES REPRESENTATIVE`: Employee Name and ID (`EMP-0001` to `EMP-0004`).
   - `DEALS CLOSED`: Integer count of successful invoices.
   - `TOTAL SALES (INR)`: Revenue generated, formatted in INR with right-alignment.
   - `COMMISSION (INR)`: Earned incentive, formatted in INR with right-alignment.
   - `QUOTA ATTAINMENT`: Percentage badge (`badge-green` for $\ge 100\%$, `badge-amber` for $80-99\%$, `badge-red` for $<80\%$).

4. **Integration Contracts**:
   - Reads data via `GET /api/performance/sales?month=YYYY-MM`.
   - Sales reps conform to Section 5 shared IDs: `EMP-0001` (Aarav), `EMP-0002` (Priya), `EMP-0003` (Vikram), `EMP-0004` (Ananya).
