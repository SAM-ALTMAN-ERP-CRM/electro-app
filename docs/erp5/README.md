# ERP-5 Module — Finance & Auth

> **Team**: ERP-5 Finance & General Ledger  
> **Backend service**: `services/erp5` · Port **5205**  
> **Database**: `erp5_db` (PostgreSQL)  
> **Frontend module**: `frontend/src/modules/erp5`  
> **Roles**: `admin`, `finance`, `sales`, `support`, `warehouse`, `hr`

---

## What This Module Does

ERP-5 owns two things for the whole application:

1. **Authentication** — the single login endpoint (`POST /api/auth/login`) that all 11 teams rely on.  
   It issues JWTs, manages demo users, and verifies tokens.
2. **Finance** — GST invoices, payments, credit notes, a double-entry general ledger, and finance reports.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or later (20 LTS recommended) |
| npm | 9 or later (bundled with Node 20) |
| PostgreSQL | 14 or later **or** Docker (for the containerised route) |

---

## Quick Start — 4 Commands

### Option A — Local PostgreSQL

```bash
# 1. Install all monorepo dependencies (run from repo root)
npm install

# 2. Copy the environment template (only needed once)
cp .env.example .env

# 3. Create all 11 databases and run every team's schema + seed
npm run db:setup

# 4. Start the full application (11 backends + React frontend)
npm run dev
```

The app opens at **http://localhost:3000**.  
ERP-5 backend health check: **http://localhost:5205/api/health**

### Option B — Docker Compose (Postgres in container)

```bash
# Start the Postgres 16 container (creates all 11 databases)
docker compose up -d

# Wait ~5 seconds for Postgres to initialise, then:
npm install
npm run db:setup
npm run dev
```

---

## Demo Login Credentials

> All demo passwords are `demo123`.

| Email | Role | Employee ID |
|-------|------|-------------|
| `admin@demo.com` | admin | EMP-0012 |
| `sales@demo.com` | sales | EMP-0001 |
| `finance@demo.com` | finance | EMP-0010 |
| `support@demo.com` | support | — |
| `warehouse@demo.com` | warehouse | — |
| `hr@demo.com` | hr | EMP-0008 |

---

## Port Reference

| Team | Domain | Port |
|------|--------|------|
| CRM-1 | Sales Pipeline | 5101 |
| CRM-2 | Support & Warranty | 5102 |
| CRM-3 | Customer 360 | 5103 |
| CRM-4 | Marketing & Portal | 5104 |
| CRM-5 | Analytics & Timeline | 5105 |
| ERP-1 | Inventory & Stock | 5201 |
| ERP-2 | Procurement & POs | 5202 |
| ERP-3 | Manufacturing & BOM | 5203 |
| ERP-4 | Orders & Dispatch | 5204 |
| **ERP-5** | **Finance & Auth** | **5205** |
| ERP-6 | HR & Payroll | 5206 |
| Frontend | React SPA | 3000 |

---

## npm Scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Starts all 11 backends + React frontend with colour-prefixed logs |
| `npm run build` | Builds the React frontend for production |
| `npm run smoke` | PMO smoke test — syntax-checks all `.js` backend files and verifies every team's `index.jsx` exists |
| `npm run db:setup` | Drops & recreates every database, then applies each team's `schema.sql` and `seed.sql` in dependency order |
| `npm run reset` | Alias for `db:setup` — re-runs everything from scratch |
| `npm run e2e` | Runs the Node.js end-to-end test script (`scripts/e2e.js`) |

### Database setup order

```
ERP-6 → CRM-3 → ERP-1 → CRM-1 → CRM-2 → CRM-4 → CRM-5
     → ERP-2 → ERP-3 → ERP-4 → ERP-5
```

If a team's `schema.sql` or `seed.sql` is empty, the script prints `skipped` and continues. It is safe to run repeatedly.

---

## Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_REQUIRED` | `false` | Set to `true` to enforce JWT auth on all API routes |
| `USE_MOCKS` | `true` | Set to `false` to require real inter-service calls (disable mock fallback) |
| `JWT_SECRET` | `dev_secret_key_change_in_production` | **Change this in production** |
| `DATABASE_URL_ERP5` | `postgresql://postgres:postgres@localhost:5432/erp5_db` | ERP-5 Postgres connection string |
| `PORT` | `5205` | ERP-5 backend listen port (set in `services/erp5/server.js`) |

> **Switching AUTH_REQUIRED to true** enables the real login flow.  
> Every team's service already reads `AUTH_REQUIRED` via `services/_shared/auth.js` — no code changes needed.

> **Switching USE_MOCKS to false** means inter-service `callService()` calls must reach the real target.  
> Use this during integration week. During development, leave it `true`.

---

## ERP-5 API Endpoints

### Authentication (`services/erp5/routes/auth.js`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | None | Login with email + password → returns JWT |
| `GET` | `/api/auth/me` | Bearer JWT | Returns the current user's decoded token payload |
| `GET` | `/api/auth/verify?token=<jwt>` | None | Verifies any JWT (used by other teams) |

### Users (`services/erp5/routes/users.js`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/users` | admin | List all system users |
| `POST` | `/api/users` | admin | Create a new user (password is bcrypt-hashed) |

---

## Who Calls ERP-5 / Who ERP-5 Calls

### Other teams that call ERP-5

| Team | Endpoint used | Why |
|------|--------------|-----|
| All teams | `GET /api/auth/verify?token=` | Token verification |
| ERP-4 | `POST /api/invoices` | Creates invoice after dispatch |
| ERP-4 | `POST /api/creditnotes` | Creates credit note on return |
| CRM-5 | `GET /api/invoices` | Reads invoice data for analytics |
| ERP-6 | `POST /api/ledger/auto` | Posts salary ledger entries |
| ERP-2 | `POST /api/ledger/auto` | Posts purchase ledger entries |

### ERP-5 calls these teams

| Team | Endpoint | Why |
|------|----------|-----|
| CRM-3 | `GET /api/customers/:id` | Fetch GSTIN for invoices |
| Mock file | `services/erp5/mocks/customer.json` | Used when CRM-3 is unavailable |

---

## Troubleshooting

### `ECONNREFUSED` on startup
- PostgreSQL is not running. Start it with `docker compose up -d` or start the local Postgres service.

### `password authentication failed for user "postgres"`
- Edit `DATABASE_URL_ERP5` in your `.env` to match your local Postgres credentials.

### `relation "users" does not exist`
- The database schema hasn't been applied. Run `npm run db:setup`.

### `Invalid or expired token` on API calls
- The JWT has expired (8-hour lifetime) or `JWT_SECRET` in `.env` doesn't match the one used to sign the token.  
  Run `npm run db:setup` to reset seed data and log in again.

### Frontend shows `404 - Page Not Found` for `/erp5/users`
- Make sure you are logged in as `admin@demo.com`. Non-admin roles are not shown the Users link.

### Port already in use (5205)
- Another process is using port 5205. Run `lsof -i :5205` and kill the conflicting process, or change `PORT=5205` in `.env`.

---

## Module File Map

```
services/erp5/
├── server.js              # Express app, auto-mounts routes/
├── package.json           # Dependencies: bcryptjs, jsonwebtoken, pg, etc.
├── db/
│   ├── schema.sql         # users table + users_seq sequence
│   └── seed.sql           # 6 demo users (password: demo123, bcrypt-hashed)
└── routes/
    ├── auth.js            # POST /api/auth/login, GET /api/auth/me, GET /api/auth/verify
    └── users.js           # GET /api/users, POST /api/users (admin only)

frontend/src/modules/erp5/
├── index.jsx              # Module registration (id, title, roles, routes)
└── pages/
    ├── Login.jsx          # Login form with demo credentials panel
    └── Users.jsx          # User management table + add-user form

docs/erp5/
├── README.md              # This file
├── issues.md              # Full sprint issue descriptions
├── wireframes/            # ASCII/text wireframes for all pages
└── e2e-checklist.md       # Manual end-to-end test checklist
```

---

## Related Documentation

- [Developer Handbook](../../DEVELOPER-HANDBOOK.md)
- [PR Guidelines](../../PR-GUIDELINES.md)
- [ERP-5 Issues](./issues.md)
- [Wireframes](./wireframes/)
