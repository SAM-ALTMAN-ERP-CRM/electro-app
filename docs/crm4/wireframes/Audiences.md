# Wireframe Specification: Target Audiences Directory

**Route**: `/crm4/audiences`  
**Issues**: `[CRM4-B2]`, `[CRM4-B3]`  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/audiences.svg`](./audiences.svg)

---

## 1. Purpose & Overview

The **Target Audiences Directory** provides marketing users with centralized management of targeted customer subscriber groups. Key functionality:
1. View list of audiences (`AUD-0001`..`AUD-0003`) with total member and reachable counts.
2. Search and filter audience lists.
3. Create new audience groups.
4. Drill down to manage members, toggle opt-out preferences, and trigger CRM-3 segment imports via `/crm4/audiences/:id`.

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (hidden in print)        │  MAIN CONTENT CONTAINER                             │
│  ⚡ Electro App                  │                                                     │
│    MARKETING (CRM-4)             │  Target Audiences                       [CRM-4]     │
│    > Campaigns                   │  Manage curated customer lists & reachable metrics  │
│    > Audiences         ←active   │  ────────────────────────────────────────────────── │
│    > Web Enquiry                 │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────┐ │
│    > Templates                   │  │ AUDIENCES │ │ TOTAL MEM │ │ REACHABLE │ │OPTOUT│ │
│    > Surveys                     │  │     3     │ │    24     │ │ 21 (88%)  │ │  3   │ │
│                                  │  └───────────┘ └───────────┘ └───────────┘ └──────┘ │
│                                  │                                                     │
│                                  │  [ 🔍 Search audiences... ]          [+ New Audience]│
│                                  │                                                     │
│                                  │  ┌────────────────────────────────────────────────┐ │
│                                  │  │ ID       NAME            MEMBERS  REACHABLE ACT│ │
│                                  │  │────────────────────────────────────────────────│ │
│                                  │  │ AUD-0001 Festive Buyers     8     7 active  Mng│ │
│                                  │  │ AUD-0002 Corporate Fleet   10    10 active  Mng│ │
│                                  │  │ AUD-0003 Warranty Care      6     4 active  Mng│ │
│                                  │  └────────────────────────────────────────────────┘ │
│                                  │                                                     │
│                                  │  ┌── Create New Target Audience ──────────────────┐ │
│                                  │  │ Audience Name: [_____________________________] │ │
│                                  │  │ Description:   [_____________________________] │ │
│                                  │  │ [+ Create Audience]                            │ │
│                                  │  └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Specifications

### 3.1 Header & Metrics
- Title: `Target Audiences` with `<span className="badge badge-blue">CRM-4</span>`.
- KPI metric cards:
  - `TOTAL AUDIENCES`: Numeric count of lists (e.g. `3`).
  - `TOTAL SUBSCRIBERS`: Aggregated member count across all audiences.
  - `REACHABLE AUDIENCE`: Members where `opted_out = false` (`.badge-green`).
  - `OPTED OUT`: Members where `opted_out = true` (`.badge-red`).

### 3.2 Audiences Table
- Columns:
  1. `ID`: `AUD-xxxx` in monospace font.
  2. `AUDIENCE NAME`: List title.
  3. `DESCRIPTION`: Objective or notes.
  4. `MEMBERS`: Total member count.
  5. `REACHABLE`: Count of reachable members with `.badge-green` / `.badge-amber`.
  6. `CREATED`: ISO Date `YYYY-MM-DD`.
  7. `ACTION`: "Manage >" link navigating to `/crm4/audiences/:id`.

### 3.3 Create Form Card
- Input: `Audience Name` (required).
- Input: `Description & Objective` (required).
- Button: `+ Create Audience` (`#2563eb`).

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Loading** | Centered spinner with `"Loading target audiences..."` |
| **Empty** | Card with icon: `"No audience lists configured yet. Create one below to begin."` |
| **Error** | Red error banner with backend message and retry button. |
| **Success** | Green banner confirming audience creation with direct link to member manager. |
