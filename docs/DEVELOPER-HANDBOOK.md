# 📘 Electro App: Student Developer Handbook & Onboarding Guide

> **Welcome to the Electro App Monorepo!**  
> 11 teams of 4 students are building ONE unified, end-to-end Enterprise CRM + ERP system for an electronics manufacturing company.  
> When everyone merges, `npm run dev` starts the entire company platform: 1 login screen, 1 shared navigation menu, 11 dedicated module sections, and 11 communicating backends.

---

## ⚡ Quick Start: 3 Steps to Get Running

### 1. Update Your Local Repository
Ensure you are on `main` and have the latest foundation:
```bash
git checkout main
git pull origin main
npm install
```

### 2. Verify Your Environment Configuration
Copy `.env.example` to `.env` if you haven't already:
```bash
cp .env.example .env
```
Ensure PostgreSQL is running locally.

### 3. Start the Full Application
```bash
npm run dev
```
- **Unified Frontend**: Opens at [http://localhost:3000](http://localhost:3000)
- **11 Backends**: Running on ports `5101`..`5105` (CRM-1..5) and `5201`..`5206` (ERP-1..6)
- **Health Check**: Open [http://localhost:5101/api/health](http://localhost:5101/api/health) to confirm your team's backend is responding.

---

## 🎯 Finding Your Tasks & Team Sprint Board

Each team has a live interactive **Kanban Sprint Board** on GitHub Projects.
Find your team's board, pick your issue, and move it from **Todo** to **In Progress**:

| Team | Domain | Live Sprint Board | Team Lead | Backend Port |
| :--- | :--- | :--- | :---: | :---: |
| **CRM-1** | Sales Pipeline | [CRM-1 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/4) | `@hazelnutbytes` | `5101` |
| **CRM-2** | Support & Warranty | [CRM-2 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/5) | `@zoha71` | `5102` |
| **CRM-3** | Customer 360 | [CRM-3 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/6) | `@aditya-yadav-75` | `5103` |
| **CRM-4** | Marketing & Portal | [CRM-4 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/7) | `@juitawde` | `5104` |
| **CRM-5** | Analytics & Timeline | [CRM-5 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/8) | `@ImYuv19` | `5105` |
| **ERP-1** | Inventory & Stock | [ERP-1 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/9) | `@Adityac17` | `5201` |
| **ERP-2** | Procurement & POs | [ERP-2 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/10) | `@Soldier224K` | `5202` |
| **ERP-3** | Manufacturing & BOM | [ERP-3 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/11) | `@alina22052007` | `5203` |
| **ERP-4** | Orders & Dispatch | [ERP-4 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/12) | `@kaushalrajmandai` | `5204` |
| **ERP-5** | Finance & Ledger | [ERP-5 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/13) | `@Antaraaaa14` | `5205` |
| **ERP-6** | HR & Payroll | [ERP-6 Board](https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/14) | `@saiyash07` | `5206` |

---

## 🛑 Strict Developer Boundaries (Zero-Tolerance Rules)

To prevent breaking another team's work, **strict folder boundaries** are enforced by automated CI:

### ✅ Files You MAY Create & Edit:
- **Backend**:
  - `services/<team>/routes/<resource>.js` (Your Express routers)
  - `services/<team>/db/schema.sql` (Your DDL tables & sequences)
  - `services/<team>/db/seed.sql` (Your initial database rows)
  - `services/<team>/mocks/<mock-name>.json` (Your mock fallback data)
- **Frontend**:
  - `frontend/src/modules/<team>/pages/<Page>.jsx` (Your React UI pages)
  - `frontend/src/modules/<team>/index.jsx` (Your module route registration)
- **Documentation**:
  - `docs/<team>/` (`README.md`, `demo.md`, `tests.md`, `api.md`, `er-diagram.md`, wireframes)

### ❌ Files You Must NEVER Touch:
- `services/_shared/*` (Shared authentication, DB pool, callService)
- `services/*/server.js` (The server auto-mounts your routes automatically)
- `frontend/src/api.js`, `frontend/src/App.jsx`, `frontend/src/main.jsx`
- `.github/*`, `package.json` (root), `docker-compose.yml`

> [!CAUTION]
> If a PR modifies **any** file outside your team's folders, automated CI will fail immediately and PMO will reject the PR.

---

## 🧰 How to Use Shared Helpers

### 1. Database Connection (`services/<team>/routes/*.js`)
```javascript
const { makePool } = require('../_shared/db');
const pool = makePool('crm1_db'); // Replace with your team DB: crm1_db..erp6_db
```

### 2. Authentication & Roles
```javascript
const { requireAuth, requireRole } = require('../_shared/auth');

// Protect all routes in your file
router.use(requireAuth);

// Optional: restrict specific route to admin role
router.post('/admin-only-action', requireRole('admin'), async (req, res) => { ... });
```

### 3. Calling Other Teams from Backend (`callService`)
```javascript
const { callService } = require('../_shared/callService');

// Syntax: callService(teamSlug, apiPath, { method, body, mock })
try {
  const result = await callService('erp6', '/api/employees?role_title=Sales Rep', {
    method: 'GET',
    mock: 'employees-sales' // services/<team>/mocks/employees-sales.json
  });
  console.log('Employees:', result);
} catch (err) {
  // Always wrap side-effects in try/catch so downtime in other services doesn't crash your API
  console.error('[integration-error] Failed to fetch employees:', err.message);
}
```

### 4. Frontend API Calls (`frontend/src/modules/<team>/pages/*.jsx`)
```javascript
import { api } from '../../../api';

// NEVER write fetch() or http://localhost:5101! Always use api():
const loadLeads = async () => {
  try {
    const res = await api('crm1', '/api/leads');
    setLeads(res.data);
  } catch (err) {
    setError(err.message);
  }
};
```

---

## 🤖 How to Build Your Issue with AI / Coding Assistant

When coding an issue with an AI assistant (Antigravity, Claude, ChatGPT, GitHub Copilot):

1. **First, paste the Master Prompt** (from `AGENTS.md`):
   ```text
   You are my senior developer and coding mentor. I am a college student in a
   team of 4 building one small part of ONE shared end-to-end app (CRM + ERP) for
   an electronics company. All 11 teams push to one GitHub repo. When everyone has
   merged, `npm run dev` starts the whole app: one login screen, one menu, one
   section per team.
   ... (Copy full prompt from AGENTS.md)
   ```
2. **Next, copy your exact issue specification**:
   - Open your GitHub Issue (or `docs/<team>/issues.md`) and copy the complete text.
   - Paste it to your AI assistant.
3. **Verify the generated code**:
   - Confirm it only edits files inside `services/<team>/` and `frontend/src/modules/<team>/`.
   - Run the endpoints locally with Postman or curl.

---

## 🌿 The Step-by-Step Git & Pull Request (PR) Workflow

### Step 1: Create a Feature Branch from Fresh `main`
```bash
git checkout main
git pull origin main
git checkout -b <team>/<key>-<short-description>
# Example: git checkout -b crm1/a1-leads-api
```

### Step 2: Write Code and Test Locally
- Run your SQL migrations in your local database.
- Test your API endpoints with `curl` or Postman.
- Verify frontend screens at `http://localhost:3000/<team>/<page>`.

### Step 3: Commit under Your Own Name
```bash
git add services/<team>/ frontend/src/modules/<team>/ docs/<team>/
git commit -m "feat(<team>): [<KEY>] <Issue Title>"
# Example: git commit -m "feat(crm1): [CRM1-A1] Leads table and API"
```

### Step 4: Push Branch and Open a Pull Request
```bash
git push origin <team>/<key>-<short-description>
```
1. Go to [https://github.com/SAM-ALTMAN-ERP-CRM/electro-app](https://github.com/SAM-ALTMAN-ERP-CRM/electro-app)
2. Click **Compare & pull request**.
3. **PR Title Format**: Must start with `[<KEY>] <Title>`:
   ```text
   [CRM1-A1] Leads table and API
   ```
4. **PR Body Format**:
   - State `Closes #<issue_number>`
   - Check all items in the Author Pre-Merge Checklist
   - Attach a screenshot (for UI) or curl/Postman response (for API).

### Step 5: PMO Review & Merge
- Your Team Lead (Member A) does an initial sanity review.
- PMO reviews your PR (SLA: **8 hours**).
- When all 5 CI checks pass and PMO approves, PMO performs a **Squash and Merge** into `main`.
- You can now move your card on your GitHub Sprint Board to **Done**!
