# Wireframe Specification: NPS Survey Analytics & Results Dashboard

**Route**: `/crm4/surveys/:id/results`  
**Issue**: `[CRM4-D3]`  
**Roles Allowed**: `admin`, `sales`  
**Wireframe Graphic**: [`docs/crm4/wireframes/survey-results.svg`](./survey-results.svg)

---

## 1. Purpose & Overview

The **NPS Survey Analytics & Results Dashboard** provides an executive summary of customer feedback:
1. Computes and displays the aggregate **Net Promoter Score (NPS)** according to the standard business formula:
   $$\text{NPS} = \% \text{Promoters} - \% \text{Detractors}$$
   - **Promoters**: Rating scores `9` and `10` (`.badge-green`).
   - **Passives**: Rating scores `7` and `8` (`.badge-amber`).
   - **Detractors**: Rating scores `0` through `6` (`.badge-red`).
2. Renders proportional distribution progress bars for each tier.
3. Displays total response count and average customer rating.
4. Feeds the latest 5 verified customer feedback comments with customer ID attribution (`CUST-0001`..`CUST-0008`).
5. Supports one-click `@media print` export formatting the entire dashboard into a clean single-page portrait report without sidebar or chrome.

---

## 2. ASCII Wireframe Layout

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ < Back to Surveys                                                                      │
│ NPS Survey Analytics: Annual Product Experience            [SRV-0001] [NPS] [🖨️ Print] │
│ Real-time Net Promoter Score, distribution breakdown & verified feedback               │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ ┌── NET PROMOTER SCORE ──┐ ┌── TOTAL RESPONSES ─────┐ ┌── AVERAGE RATING ────────────┐ │
│ │  +40   [Positive/Good] │ │  10 Verified Customers │ │  8.2 / 10                    │ │
│ └────────────────────────┘ └────────────────────────┘ └──────────────────────────────┘ │
│                                                                                        │
│ ┌── NPS Score Breakdown & Distribution ──────────────────────────────────────────────┐ │
│ │ Promoters (9-10): 6 responses (60%) [██████████████████████████████        ] 60%   │ │
│ │ Passives  (7-8):  2 responses (20%) [██████████                            ] 20%   │ │
│ │ Detractors(0-6):  2 responses (20%) [██████████                            ] 20%   │ │
│ │ Formula: % Promoters (60.0%) - % Detractors (20.0%) = NPS +40                      │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌── Latest 5 Feedback Comments ──────────────────────────────────────────────────────┐ │
│ │ CUST-0001 [10 Prom] "Exceptional TV clarity and technician calibrated mount well!" │ │
│ │ CUST-0002 [ 9 Prom] "Commercial displays for conference rooms are reliable."       │ │
│ │ CUST-0004 [ 8 Pass] "Product is good but dealer delivery took 2 days longer."      │ │
│ │ CUST-0006 [ 5 Detr] "Remote stopped pairing after 3 weeks. Awaiting warranty."     │ │
│ │ CUST-0008 [10 Prom] "Flawless soundbar integration with our home theatre setup!"   │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Elements & Specifications

### 3.1 Header & Print Button
- Back link: `< Back to Surveys` navigating to `/crm4/surveys`.
- Print button: triggers `window.print()`.

### 3.2 Key Performance Indicators (3 Cards)
- **Net Promoter Score**: Large callout with dynamic green/amber/red color styling.
- **Total Responses**: Total count of customer submissions.
- **Average Rating**: Arithmetic mean out of 10.

### 3.3 Distribution Progress Bars
- Promoters Bar: `#16a34a` (green).
- Passives Bar: `#d97706` (amber).
- Detractors Bar: `#dc2626` (red).
- Formula note calculating Net Promoter Score.

### 3.4 Comments Stream
- Displays the latest 5 comments with:
  - Customer ID in monospace (`CUST-xxxx`).
  - Score badge (`10 Prom`, `8 Pass`, `5 Detr`).
  - Comment text in quotes.
  - Submission date (`YYYY-MM-DD`).

### 3.5 Print Stylesheet Rules
- Suppresses `.sidebar`, `.top-bar`, and action buttons (`button`, `.btn`).
- Formats container to 100% width and 0 padding.

---

## 4. UI States

| State | Visual Treatment |
|---|---|
| **Loading** | Centered loader: `"Calculating NPS score and response statistics..."` |
| **No Responses** | Informational card: `"No responses recorded yet for this survey. Share the survey or click Respond to submit feedback."` |
| **Error** | Red notification banner displaying backend error. |
