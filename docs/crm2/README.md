# CRM-2 Support & Warranty

Team CRM-2 handles **customer support tickets**, **warranty checks by serial number** and **product returns (RMA)** for the electronics company. In the final demo we are step 8: *the customer raises a warranty ticket using the serial number and an RMA is approved*; ERP-4, ERP-1 and ERP-5 then process the return.

| | |
|---|---|
| Backend | `services/crm2`, Express on port **5102** |
| Database | `crm2_db` (PostgreSQL) |
| Frontend | `frontend/src/modules/crm2`, menu group **Support**, pages under `/crm2/` |
| Roles | `admin`, `support` |
| Team | Ashutosh (lead), Zoha, Aditya Kumbhar, Anant |
| Board | https://github.com/orgs/SAM-ALTMAN-ERP-CRM/projects/5 |

Other CRM-2 docs: [demo.md](demo.md) (5-step demo script) · [er-diagram.md](er-diagram.md) (ER diagram and data dictionary) · [seed-check.md](seed-check.md) (seed contract and schema review) · [api.md](api.md) (API spec) · [tests.md](tests.md) (test cases) · [postman_collection.json](postman_collection.json) · [wireframes/](wireframes/) (screens and UI rules).

---

## 1. What the module does

| Part | What it does | Owner | Issues | Status |
|---|---|---|---|---|
| **Tickets** | Support tickets with priority, status, assigned engineer, SLA timer, overdue list and comments | Ashutosh | A1, A2, A3 | ✅ Merged |
| **Warranty** | Look up a serial and say *In warranty* or *Expired*; pull new serials from ERP-4 dispatches | Zoha | B1, B2, B3 | ✅ Merged (via #294) |
| **Returns (RMA)** | Request, approve or reject a return; expired serials are refused; approval hands the return to ERP-4 | Aditya Kumbhar, Ashutosh | C1, C2, C3 | ✅ C1, C2 merged · 🟡 C3 PR #338 |
| **Service centres** | List of repair centres; send a ticket to a centre | Anant | D1, D2 | ✅ Merged |
| **Reports** | Ticket counts, average resolution time, overdue count, tickets per centre | Ashutosh | D3 | 🟡 PR #339 |

**How it fits together:** serial `TV55-2611-0001` → warranty check says *In warranty* → support opens a **ticket** and assigns an engineer → the ticket goes to a **service centre** → an **RMA** is requested → expired serials are blocked, approval **hands the return to ERP-4** → **reports** show it all.

---

## 2. How to run it

```bash
npm install
cp .env.example .env          # AUTH_REQUIRED=false, USE_MOCKS=true for local dev
npm run reset                 # load schema.sql + seed.sql for every team
npm run dev                   # frontend on :3000 plus all 11 services
```

Then open **http://localhost:3000/crm2/tickets**.

> **`npm run reset` is still a placeholder** (ERP5-C4 has not replaced `scripts/db-setup.js` yet). Until it is, load our database by hand:
>
> ```bash
> createdb crm2_db
> psql -v ON_ERROR_STOP=1 -d crm2_db -f services/crm2/db/schema.sql
> psql -v ON_ERROR_STOP=1 -d crm2_db -f services/crm2/db/seed.sql
> ```
>
> Both files can be run again on the same database without errors. If your local Postgres has no `postgres` user, point the service at your own user, e.g. `DATABASE_URL_CRM2=postgresql://<you>@localhost:5432/crm2_db`.

Run only CRM-2 and the frontend:

```bash
npm --workspace=services/crm2 run dev     # http://localhost:5102/api/health
npm --workspace=frontend run dev          # http://localhost:3000/crm2/tickets
```

Before a PR: `npm run build` and `npm run smoke` must pass, and `git status` must show changes only in `services/crm2/`, `frontend/src/modules/crm2/` or `docs/crm2/`.

---

## 3. API endpoints

All paths are on port 5102 (from the frontend: `api('crm2', '/api/...')`). Success is `{ "data": ... }`, failure is `{ "error": "..." }` with 400 / 404 / 409. Full request and response examples are in [api.md](api.md).

| Method | Path | What it does | Issue | Status |
|---|---|---|---|---|
| GET | `/api/tickets?status=&priority=&customer_id=` | List tickets, newest first | A1 | ✅ |
| GET | `/api/tickets/overdue` | Past `due_at` and not resolved/closed | A3 | ✅ |
| GET | `/api/tickets/:id` | One ticket | A1 | ✅ |
| POST | `/api/tickets` | Create (sets SLA `due_at`; posts a CRM-3 timeline event) | A1, A3 | ✅ |
| PUT | `/api/tickets/:id` | Edit details (new priority recalculates `due_at`) | A1, A3 | ✅ |
| PATCH | `/api/tickets/:id/status` | `{status}`; `resolved` fills `resolved_at` | A1 | ✅ |
| GET | `/api/tickets/:id/comments` | Comments on a ticket | A3 | ✅ |
| POST | `/api/tickets/:id/comments` | `{text}`; author = logged-in user | A3 | ✅ |
| GET | `/api/warranties` | All warranty records with `expires_on` and `status` | B1 | ✅ |
| POST | `/api/warranties` | Register a serial | B1 | ✅ |
| GET | `/api/warranty/:serial` | Lookup: record + `expires_on` + `status` (`active`/`expired`) | B1 | ✅ |
| POST | `/api/warranty/sync` | Pull new serials from ERP-4 dispatches | B3 | ✅ |
| GET | `/api/rmas?status=` | List returns | C1 | ✅ |
| POST | `/api/rmas` | Request a return; unknown serial or expired warranty → 400 | C1, C3 | ✅ · rule in 🟡 #338 |
| GET / PUT / DELETE | `/api/rmas/:id` | One return | C1 | ✅ |
| PATCH | `/api/rmas/:id/decision` | `{status, outcome}`; approve hands the return to ERP-4; decide once (409) | C1, C3 | ✅ · handoff in 🟡 #338 |
| GET / POST | `/api/centres` | Service centres | D1 | ✅ |
| GET / PUT / DELETE | `/api/centres/:id` | One centre | D1 | ✅ |
| GET / POST | `/api/assignments?ticket_id=` | Send a ticket to a centre (re-assigning replaces it) | D1 | ✅ |
| GET | `/api/reports/tickets-summary` | Counts by status/priority, avg resolution hours, overdue, tickets per centre | D3 | 🟡 #339 |
| GET | `/api/health` | Service health | — | ✅ |

Field names are fixed by the contract: status `open` / `in_progress` / `resolved` / `closed`, priority `low` / `medium` / `high`, engineer in `assigned_to`.

## 4. Pages (`/crm2/...`)

| Path | Menu label | What it shows | Owner | Status |
|---|---|---|---|---|
| `tickets` | Tickets | Ticket list, filters, "Overdue only", New ticket form | Ashutosh | ✅ |
| `tickets/:id` | — | Ticket detail: status, engineer, SLA, comments | Ashutosh | ✅ |
| `centres` | Service Centres | Service centre list and form | Anant | ✅ |
| `assign` | Assign Tickets | Unassigned tickets with a centre dropdown | Anant | ✅ |
| `warranty` | Warranty | Warranty check by serial, sync from ERP-4 | Zoha | ✅ |
| `rmas` | Returns (RMA) | Return list and "Request RMA" form | Aditya | ✅ |
| `rmas/:id` | — | Return detail, approve/reject, status timeline | Aditya, Ashutosh (C3) | ✅ · timeline in 🟡 #338 |
| `reports` | Reports | Summary cards, status/priority bars, tickets per centre | Ashutosh | 🟡 #339 |

---

## 5. Other teams

### We call them

| Our issue | Call | Team | Why | Status / when it is not there |
|---|---|---|---|---|
| A1, C3 | `POST /api/interactions/from-event` | CRM-3 | "Ticket created" / "RMA approved" on the customer timeline | ✅ Merged (CRM3-B3, #267). If CRM-3 is down: `[integration-error] … Payload: {...}` and the CRM-2 action still succeeds |
| A2 | `GET /api/customers` | CRM-3 | Customer dropdown | ✅ Merged. Falls back to the 8 Section 5 customers |
| A2 | `GET /api/employees?role_title=Service Engineer` | ERP-6 | Engineer dropdown | ⏳ ERP6-A1 not merged. Falls back to EMP-0005 Imran Qureshi, EMP-0006 Deepa Menon, EMP-0007 Suresh Kumar |
| B3 | `GET /api/dispatches` | ERP-4 | New serials shipped to customers | ⏳ ERP4-C1 not merged. Mock `services/crm2/mocks/dispatches.json` while `USE_MOCKS=true` |
| C3 | `POST /api/returns/from-rma` | ERP-4 | Hand an approved return to ERP-4 (it then calls ERP-1 and ERP-5) | ⏳ ERP4-D1 not merged. Logged as `[integration-error]`; the screen says the handoff was logged |

At G4 (`USE_MOCKS=false`) the ERP-4 and ERP-6 endpoints must be live for the full story.

### They call us

| Team | Call | Contract row | Status |
|---|---|---|---|
| CRM-5 customer portal | `POST /api/tickets` (raise a ticket) | 12 | ✅ CRM5-A3 (#328) calls `crm2` |
| CRM-5 customer portal | `GET /api/tickets` (my tickets) | 10 | ⚠️ still reads its own `crm5 /api/tickets` mock |
| CRM-5 dashboard | `GET /api/tickets` | — | — |
| ERP-4 | Receives our RMA handoff (C3) | — | ⏳ waiting for ERP4-D1 |

> **Known issue (to agree with CRM-5):** the portal's ticket list still reads its own mock instead of `crm2`, and that mock uses `in-progress` and `assigned_engineer`; our API uses `in_progress` and `assigned_to`.

### Shared IDs we use (Section 5)

Customers `CUST-0001`–`CUST-0008` (CUST-0001 Aarav Mehta) · service engineers `EMP-0005`–`EMP-0007` · product `SKU-0001` (55-inch 4K Smart TV) · serials `TV55-2611-0001`–`0005` sold to `CUST-0001`–`0005` (0001–0003 in warranty, 0004–0005 expired) · our tickets `TKT-0001`–`TKT-0006` · centres `SC-0001`–`SC-0004` · returns `RMA-0001`–`RMA-0003`.

---

## 6. Daily 10-minute lead check

Run every morning before standup, from the repo root on an up-to-date `main`.

- [ ] **Folder rule:** every merged CRM-2 PR touched only our three folders.
  ```bash
  for n in $(gh pr list --search "CRM2 in:title" --state merged --json number -q '.[].number'); do
    echo "#$n"; gh pr view $n --json files -q '.files[].path' | grep -v -E '^(services/crm2/|frontend/src/modules/crm2/|docs/crm2/)'
  done   # prints only PR numbers = OK
  ```
- [ ] **Every page is registered:** each `pages/*Page.jsx` is imported in `index.jsx`.
  ```bash
  for f in frontend/src/modules/crm2/pages/*Page.jsx; do p=$(basename $f .jsx)
    grep -q "import $p " frontend/src/modules/crm2/index.jsx && echo "$p OK" || echo "$p MISSING"; done
  ```
- [ ] **No shared files changed:** `services/crm2/server.js`, `services/crm2/package.json`, `services/_shared/`, `frontend/src/api.js`, `App.jsx`, `main.jsx`, `.github/`, root `package.json`, `docker-compose.yml` were not touched by a CRM-2 PR.
- [ ] **Shared SQL is clean:** `schema.sql` and `seed.sql` load twice with no errors; each block starts with its `-- [CRM2-xx]` comment (queries in [seed-check.md](seed-check.md)).
- [ ] **Open PRs:** none in conflict with `main` (`gh pr list --search "CRM2 in:title"`); remind the author if one is.
- [ ] **Blockers:** chase the teams in section 5 we are waiting for; post the morning message (merged / today / blocked).
