# Wireframe Specification: Survey Response & Rating Submission

**Route**: `/crm4/surveys/:id/respond`  
**Issue**: `[CRM4-D2]`  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/survey-respond.svg`](./survey-respond.svg)

---

## 1. Purpose & Overview

The **Survey Response & Rating Submission** screen allows customer service agents or customers to submit structured survey feedback:
1. Selects the responding customer identifier (`CUST-0001`..`CUST-0008` adhering to Section 5 shared IDs).
2. Presents an intuitive 0 to 10 rating scale with color-coded classification:
   - Scores 0 to 6: **Detractor** (`#dc2626` red).
   - Scores 7 to 8: **Passive** (`#d97706` amber).
   - Scores 9 to 10: **Promoter** (`#16a34a` green).
3. Captures customer remarks and feedback comments.
4. Enforces score validation (0 to 10 integers required; non-numeric or out-of-range inputs return HTTP 400).
5. Displays a prominent thank-you confirmation state upon submission.

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ < Back to Surveys                                                                      │
│ Annual Product Experience Survey                           [SRV-0001] [NPS] [CRM-4]    │
│ Please rate your experience with Electro App products & care                           │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ┌── Step 1: Responding Customer ─────────────────────────────────────────────────────┐ │
│ │ Customer: [ CUST-0001 - Aarav Mehta (Retail · Mumbai)                            ▼]│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌── Step 2: Net Promoter Score (0 to 10) ────────────────────────────────────────────┐ │
│ │ How likely are you to recommend Electro App products to a colleague or friend? *   │ │
│ │                                                                                    │ │
│ │ [ 0 ] [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ] [ 7 ] [ 8 ] [ 9 ] [ 10 ★] (Selected)     │ │
│ │ ← 0-6 Detractor (Unhappy)           7-8 Passive       9-10 Promoter (Loyal) →      │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌── Step 3: Feedback Comments ───────────────────────────────────────────────────────┐ │
│ │ What was the primary reason for your score?                                        │ │
│ │ [ Exceptional build quality on the 4K LED TV and on-time installation!            ]│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ [ Submit Response ]  [ ✓ Thank You! Response recorded for CUST-0001 (Score: 10/10) ]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Specifications

### 3.1 Header
- Back navigation: `< Back to Surveys` returning to `/crm4/surveys`.
- Badges: Survey ID pill (`SRV-xxxx`), Metric badge (`.badge-blue NPS` or `.badge-green CSAT`), and Module tag (`.badge-blue CRM-4`).

### 3.2 Customer Dropdown
- Select populated with customer master records from CRM-3 (`CUST-0001` through `CUST-0008`).

### 3.3 Rating Buttons (0 to 10)
- Interactive buttons representing scores 0 through 10.
- Clicking a score sets the active state with heavy contrast border and background fill:
  - 0-6 Detractors: Red highlight.
  - 7-8 Passives: Amber highlight.
  - 9-10 Promoters: Green highlight.

### 3.4 Feedback Remarks Box
- Multiline textarea for customer commentary.

### 3.5 Submission & Thank You
- Calls `POST /api/surveys/:id/responses` with `{ customer_id, score, comment }`.
- On success, hides input controls or displays a persistent green card: `"✓ Thank You! Response recorded successfully."` with direct option to return to surveys or submit another.

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Submitting** | Submit button disabled with `"Submitting feedback..."` |
| **Success** | Green banner (`#dcfce7`) with score summary and thank-you confirmation. |
| **Validation Error** | Red banner if score is unselected or customer ID is empty. |
| **Server Error** | Red alert banner with backend response message. |
