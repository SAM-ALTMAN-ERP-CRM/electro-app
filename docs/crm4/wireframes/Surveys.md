# Wireframe Specification: Customer Surveys & Feedback Directory

**Route**: `/crm4/surveys`  
**Issue**: `[CRM4-D2]`  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/surveys.svg`](./surveys.svg)

---

## 1. Purpose & Overview

The **Customer Surveys & Feedback Directory** screen enables tracking customer satisfaction and loyalty across the organization:
1. Displays configured surveys (`SRV-0001`..`SRV-0002`) classified by type:
   - `nps`: Net Promoter Score on a 0 to 10 scale (`.badge-blue`).
   - `csat`: Customer Satisfaction on a 1 to 5 scale (`.badge-green`).
2. High-level KPI summary cards for overall response counts and average scores.
3. Fast creation of new surveys.
4. Direct navigation to the response capture screen (`/crm4/surveys/:id/respond`) and the results dashboard (`/crm4/surveys/:id/results`).

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Customer Feedback & Surveys                                [CRM-4]                     │
│ Collect structured customer feedback via NPS and CSAT rating surveys                   │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ┌───────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────────────────────────┐ │
│ │ SURVEYS: 2│ │ RESPONSES: 20 │ │ AVG NPS: +45  │ │ AVG CSAT: 4.4 / 5.0              │ │
│ └───────────┘ └───────────────┘ └───────────────┘ └──────────────────────────────────┘ │
│                                                                                        │
│ [ 🔍 Search surveys by title or type... ]                              [+ New Survey]  │
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ID       SURVEY TITLE                  TYPE     RESPONSES    CREATED    ACTIONS    │ │
│ │────────────────────────────────────────────────────────────────────────────────────│ │
│ │ SRV-0001 Annual Product Experience NPS [nps]    10 responses 2026-10-10 Respond Res│ │
│ │ SRV-0002 Post-Delivery Installation    [csat]   10 responses 2026-10-18 Respond Res│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌── Create New Survey ───────────────────────────────────────────────────────────────┐ │
│ │ Survey Title: *                                 Metric Type: *                     │ │
│ │ [ e.g. Q4 Dealer Experience Survey            ] [ NPS (0-10 Scale)               ▼]│ │
│ │ [ Create Survey ]                                                                  │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Specifications

### 3.1 Header & Metrics
- Title: `Customer Feedback & Surveys` with `<span className="badge badge-blue">CRM-4</span>`.
- Stat counters:
  - `ACTIVE SURVEYS`: Total active surveys (e.g. `2`).
  - `TOTAL RESPONSES`: Aggregate response count across all surveys (e.g. `20`).
  - `AVERAGE NPS SCORE`: Aggregate NPS metric (e.g. `+45 (Good)`).
  - `AVERAGE CSAT`: Overall satisfaction score (e.g. `4.4 / 5.0`).

### 3.2 Surveys Table
- Columns:
  1. `ID`: `SRV-xxxx` in monospace font.
  2. `SURVEY TITLE`: Name of survey.
  3. `TYPE`: Type badge:
     - `nps`: `.badge-blue`
     - `csat`: `.badge-green`
  4. `RESPONSES`: Count of recorded submissions.
  5. `CREATED`: ISO Date `YYYY-MM-DD`.
  6. `ACTIONS`:
     - "Respond": Links to `/crm4/surveys/:id/respond`.
     - "Results >": Links to `/crm4/surveys/:id/results`.

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Loading** | Loading spinner with `"Loading surveys..."` |
| **Empty** | Bordered card: `"No feedback surveys created yet. Use the form below to create your first NPS or CSAT survey."` |
| **Error** | Red notification banner displaying error message. |
| **Success** | Green banner with newly created survey details. |
