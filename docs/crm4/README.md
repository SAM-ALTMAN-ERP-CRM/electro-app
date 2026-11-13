# CRM-4 Marketing & Engagement — Campaigns, Enquiries, Audiences & Feedback Surveys

> **Team**: CRM-4 Marketing & Engagement  
> **Backend Service**: `services/crm4` (Express on Port `5104`, Vite proxy `/svc/crm4`)  
> **Database**: PostgreSQL `crm4_db`  
> **Frontend Module**: `frontend/src/modules/crm4` (`id: 'crm4'`, Title: `Marketing`, Roles: `["admin", "sales"]`)  
> **Workflow Scope**: Step 1 of 9 in Order-to-Cash (Marketing Broadcast Campaigns, Web & Dealer Inquiry Forms, Message Templates, Audience Segmentation & Post-Delivery NPS Feedback Surveys)

---

## 1. What This Module Does

Team **CRM-4 (Marketing & Engagement)** manages the customer acquisition and customer satisfaction boundaries of the electronics company:

1. **Multi-Channel Marketing Campaigns (`/crm4`, `/crm4/campaigns`)**:
   - Organizes promotional outreach across three primary communication channels: **Email**, **WhatsApp**, and **SMS**.
   - Manages campaign lifecycles through strict state transitions: `draft` $\rightarrow$ `scheduled` $\rightarrow$ `sent`.
   - Links target customer segments from CRM-3 (`SEG-0001`..`SEG-0004`) with reusable message templates (`TPL-0001`..`TPL-0004`).
2. **Web & Dealer Enquiry Intake (`/crm4/enquiry`)**:
   - Provides an intake form for prospective buyers and regional electronics dealers (`dealer`, `web`, `walk-in`).
   - Dynamically pulls active products from ERP-1 (`/api/products`, `SKU-0001`..`SKU-0015`).
   - Automatically provisions sales leads in CRM-1 (`POST /api/leads`) assigned to Sales Representative `EMP-0001`, storing the generated `lead_id` (`LEAD-xxxx`) on the enquiry row.
   - Enforces `502 Bad Gateway` error surfacing if CRM-1 is unreachable when `USE_MOCKS=false`.
3. **Target Audiences & Subscriber Directories (`/crm4/audiences`, `/crm4/audiences/:id`)**:
   - Maintains subscriber groups (`AUD-0001`..`AUD-0003`) and individual membership rosters (`MEM-0001`..`MEM-0008`).
   - Enforces regulatory opt-out preferences (`opted_out = TRUE`) to safeguard communication compliance before broadcast dispatch.
4. **Message Template Management (`/crm4/templates`)**:
   - Authors standardized communication templates for emails (with subject lines) and instant messages.
   - Supports real-time previewing with dynamic token substitutions: `{{name}}`, `{{product}}`, `{{offer}}`, `{{company}}`.
   - Enforces statutory constraints, including character counters for 160-character SMS limits.
5. **Customer Feedback & Net Promoter Score (NPS) (`/crm4/surveys`, `/crm4/surveys/:id/respond`, `/crm4/surveys/:id/results`)**:
   - Orchestrates automated satisfaction surveys triggered by order delivery or service ticket closure (`SRV-0001` NPS, `SRV-0002` CSAT).
   - Collects 0–10 numeric ratings and qualitative customer feedback.
   - Computes mathematical Net Promoter Scores ($\% \text{Promoters} - \% \text{Detractors}$) and presents clean, print-friendly distribution dashboards.

---

## 2. How to Run It

### Prerequisites
- Node.js `18+` (tested on Node `20` and `24`) and npm `9+`
- PostgreSQL running locally (optional for development; the service includes automatic in-memory fallback for offline test execution)
- Root `.env` configured (defaults: `PORT=5104`, `DATABASE_URL_CRM4=postgresql://postgres:postgres@localhost:5432/crm4_db`, `USE_MOCKS=true`, `AUTH_REQUIRED=false`)

### Step 1: Install Dependencies
```bash
npm ci
```

### Step 2: Initialize `crm4_db` PostgreSQL Database
```bash
# Create and populate database
createdb crm4_db
psql -d crm4_db -v ON_ERROR_STOP=1 -f services/crm4/db/schema.sql
psql -d crm4_db -v ON_ERROR_STOP=1 -f services/crm4/db/seed.sql
```
*(Or run `npm run reset` to trigger automated database provisioning).*

### Step 3: Start Services
```bash
# Option A: Start CRM-4 backend service (port 5104) and frontend shell (port 3000)
npm --workspace=services/crm4 run dev
npm --workspace=frontend run dev

# Option B: Start all 11 monorepo services and frontend shell simultaneously
npm run dev
```

- **Frontend Module Landing**: `http://localhost:3000/crm4`
- **Backend Health Check**: `http://localhost:5104/api/health`

### Step 4: Run Verification Tests
```bash
# Run CRM-4 automated test suite
npm --workspace=services/crm4 test

# Run monorepo syntax and shell smoke test
npm run smoke

# Verify database setup reset script
npm run reset
```

---

## 3. Registered Frontend Routes

All CRM-4 frontend pages are registered under `frontend/src/modules/crm4/index.jsx` with allowed roles `["admin", "sales"]`:

| Route Path | Sidebar Label | Component | Purpose |
|---|---|---|---|
| `/crm4` | *(Default landing)* | `CampaignsPage.jsx` | Marketing Campaigns Master Overview |
| `/crm4/campaigns` | `Campaigns` | `CampaignsPage.jsx` | Broadcast planning, channel selection & status transitions |
| `/crm4/audiences` | `Audiences` | `AudiencesPage.jsx` | Subscriber lists & customer reach counts |
| `/crm4/audiences/:id` | *(Deep-link)* | `AudienceDetailPage.jsx` | Member roster, opt-out toggling & segment import |
| `/crm4/enquiry` | `New Enquiry` | `EnquiryPage.jsx` | Public-style web & dealer lead capture intake |
| `/crm4/templates` | `Templates` | `TemplatesPage.jsx` | Template editor, dynamic tokens & live render preview |
| `/crm4/surveys` | `Surveys` | `SurveysPage.jsx` | NPS & CSAT surveys registry |
| `/crm4/surveys/:id/respond` | *(Action form)* | `SurveyRespondPage.jsx` | Interactive 0–10 customer survey response capture |
| `/crm4/surveys/:id/results` | *(Deep-link)* | `SurveyResultsPage.jsx` | NPS score gauge, breakdown bars & qualitative feedback |

---

## 4. Backend API Endpoint List (Port `5104`)

All routes except `/api/health` require Bearer authentication via `requireAuth` (`services/_shared/auth.js`) and return `{ "data": ... }` on success or `{ "error": "..." }` on error.

### System Health
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Returns service status, team slug (`crm4`), and active port (`5104`). |

### Marketing Campaigns (`services/crm4/routes/campaigns.js`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/campaigns` | Lists all campaigns with optional `?status=`, `?channel=`, `?segment_id=` filters. |
| `GET` | `/api/campaigns/:id` | Retrieves full details of a single campaign by ID. |
| `POST` | `/api/campaigns` | Creates a new campaign with auto-generated sequence ID (`CMP-xxxx`, status `draft`). |
| `PUT` | `/api/campaigns/:id` | Updates campaign metadata, target segment, or schedule. |
| `PATCH` | `/api/campaigns/:id/status` | Transitions campaign status (`draft` $\rightarrow$ `scheduled` $\rightarrow$ `sent`). |
| `DELETE` | `/api/campaigns/:id` | Removes a campaign record. |

### Web & Dealer Enquiries (`services/crm4/routes/enquiries.js`)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/enquiries` | Lists enquiries with optional `?source=`, `?product_interest=`, `?lead_id=` filters. |
| `GET` | `/api/enquiries/:id` | Retrieves single enquiry record by ID. |
| `POST` | `/api/enquiries` | Stores enquiry (`ENQ-xxxx`) and calls CRM-1 (`POST /api/leads`), storing returned `lead_id`. Returns `502` if CRM-1 is unreachable when `USE_MOCKS=false`. |

---

## 5. Cross-Team Contracts & Integration Boundaries

### A. Services Called by CRM-4
| Target Team | Endpoint | Purpose | Failure / Fallback Policy |
|---|---|---|---|
| **CRM-1 (Sales)** | `POST /api/leads` | Auto-provisions lead from enquiry intake with `sales_rep_id: 'EMP-0001'` | If `USE_MOCKS=false` and CRM-1 is down, returns `502 Bad Gateway`. If `USE_MOCKS=true`, falls back to `services/crm1/mocks/leads.json`. |
| **ERP-1 (Inventory)** | `GET /api/products` | Populates product interest dropdown in enquiry form | Frontend falls back to local 5-product catalog (`SKU-0001`..`SKU-0005`). |
| **CRM-3 (Customer 360)** | `GET /api/segments` | Populates audience segment selector | Frontend falls back to local segment definitions (`SEG-0001`..`SEG-0004`). |

### B. Teams That Consume CRM-4
| Calling Team | Endpoint / Resource | Purpose in Workflow |
|---|---|---|
| **CRM-1 (Sales)** | `enquiries.lead_id` | Follows up on leads generated by web inquiry forms (`LEAD-0001`..`LEAD-0005`). |
| **CRM-5 (Analytics)** | `campaigns`, `surveys` | Aggregates marketing conversion and customer satisfaction benchmarks for executive reporting. |
| **CRM-3 (Customer 360)** | `campaign_messages` | Ingests promotional message deliveries into customer engagement timeline. |
| **ERP-5 (Integrator)** | `POST /api/enquiries` | Step 1 of the monorepo end-to-end integration test (`[ERP5-C5]`). |

---

## 6. Shared Seed Compliance (Section 5)

CRM-4 strictly follows the monorepo-wide Section 5 seed contract:
- **Customers**: `CUST-0001` to `CUST-0008` (mapped into audience rosters and survey responses)
- **Products**: `SKU-0001` to `SKU-0005` (referenced in enquiry product interest)
- **Sales Reps**: `EMP-0001` (Rohan Kulkarni, default sales rep for new leads)
- **Segments**: `SEG-0001` to `SEG-0004` (mapped into campaign targeting)
- **Templates**: `TPL-0001` to `TPL-0004` (standardized email, WhatsApp, and SMS templates)
- **Idempotency**: All SQL seed queries use `ON CONFLICT (id) DO UPDATE SET ...` and advance sequences with `SELECT setval('...', max_id, true)`.
