# Electro App · CRM + ERP Monorepo

Welcome to **Electro App**, the unified enterprise resource planning and customer relationship management application for an electronics manufacturer.

Built by 11 collaborative teams:
- **CRM Teams**: CRM-1 (Sales), CRM-2 (Support), CRM-3 (Customer 360), CRM-4 (Marketing), CRM-5 (Portal & Analytics)
- **ERP Teams**: ERP-1 (Inventory), ERP-2 (Purchasing), ERP-3 (Production), ERP-4 (Orders & Dispatch), ERP-5 (Finance & Shell), ERP-6 (HR & Workforce)

---

## Setup on Windows and Mac

### 1. Prerequisites
- **Node.js**: Version 18+ (tested on Node 20)
- **npm**: Version 9+
- **PostgreSQL**: Version 14+ / 16+

### 2. Install PostgreSQL
- **macOS (Homebrew)**:
  ```bash
  brew install postgresql@16
  brew services start postgresql@16
  ```
  *(Or download and install [Postgres.app](https://postgresapp.com/)).*
- **Windows**:
  - Download and run the official installer from [postgresql.org](https://www.postgresql.org/download/windows/).
  - Ensure the PostgreSQL service is running in Windows Services (`services.msc`).

### 3. Create the `postgres` Role & Password
The app connects to local PostgreSQL with user `postgres` and password `postgres`:
- **macOS**:
  ```bash
  psql postgres -c "CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres';"
  ```
  *(If the role already exists, update its password: `psql postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"`).*
- **Windows**:
  - Open `SQL Shell (psql)` from the Start menu and log in as superuser.
  - Set password: `ALTER USER postgres WITH PASSWORD 'postgres';`

### 4. Clone & Install Dependencies
```bash
git clone https://github.com/SAM-ALTMAN-ERP-CRM/electro-app.git
cd electro-app
npm install
```

### 5. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(On Windows Command Prompt: `copy .env.example .env`)*

#### Live Integration & Authentication Settings
In your `.env` file:
- **`USE_MOCKS=false`**: By default, `.env.example` sets `USE_MOCKS=true` to let services return mock fixtures when a downstream service is unavailable. **For the demo use USE_MOCKS=false** to demonstrate real cross-service communication via `callService()`.
- **`AUTH_REQUIRED=false`**: When set to `false` (default for local development), API routes allow requests without JWT authentication and automatically authenticate as demo admin. When set to `true`, all protected routes enforce valid JWT bearer tokens issued by the auth service.

### 6. Initialize Databases
Automatically provision all 11 databases and execute schemas and seeds in dependency order:
```bash
npm run db:setup
```
- **Safe Mode**: If a team database already has tables, `npm run db:setup` skips it and prints `already set up (run npm run reset to reload)`.
- **Reset Mode**: To completely drop, recreate, and re-seed all 11 databases from scratch:
  ```bash
  npm run reset
  ```
  *(Note: `--reset` is automatically blocked if `NODE_ENV=production`).*

### 7. Start Development Server
Starts all 11 backends and the unified React frontend:
```bash
npm run dev
```

The frontend will be running at: **`http://localhost:3000`**

---

## Demo Accounts

All 6 demo accounts use password **`demo123`** (seeded in `erp5_db`):

| Email | Role | Module Access / Notes |
| :--- | :--- | :--- |
| `admin@demo.com` | `admin` | Full system access across all 11 CRM and ERP modules |
| `sales@demo.com` | `sales` | CRM-1, CRM-3, ERP-1, ERP-4 (linked to employee `EMP-0001`) |
| `support@demo.com` | `support` | CRM-2 ticketing and RMA warranty claims |
| `warehouse@demo.com` | `warehouse` | ERP-1, ERP-2, ERP-3, ERP-4 inventory and fulfillment |
| `finance@demo.com` | `finance` | ERP-2, ERP-5 invoicing, credit notes, ledger |
| `hr@demo.com` | `hr` | ERP-6 workforce, payroll, and department administration |

---

## Troubleshooting Common Setup Issues

1. **`ECONNREFUSED 127.0.0.1:5432`**:
   - **Cause**: PostgreSQL server is not running locally.
   - **Fix**: Start the service via `brew services start postgresql@16` (Mac) or `net start postgresql-x64-16` / Windows Services dialog (Windows).
2. **`password authentication failed for user "postgres"`**:
   - **Cause**: The password in `.env` does not match your local PostgreSQL password.
   - **Fix**: Reset the password in psql using `ALTER USER postgres WITH PASSWORD 'postgres';` or edit the connection strings in your local `.env`.
3. **`database "crm1_db" does not exist`**:
   - **Cause**: Microservice databases have not been initialized yet.
   - **Fix**: Run `npm run db:setup` to automatically create all 11 databases and apply initial schema tables.

---

## Service Architecture & Ports

| Subsystem | Team Slug | Port | Primary Responsibility | Health Endpoint |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Shell** | `frontend` | 3000 | Unified navigation, authentication shell | `http://localhost:3000` |
| **CRM-1** | `crm1` | 5101 | Sales pipeline & lead management | `http://localhost:5101/api/health` |
| **CRM-2** | `crm2` | 5102 | Customer support & warranty claims | `http://localhost:5102/api/health` |
| **CRM-3** | `crm3` | 5103 | Customer 360 & master contacts | `http://localhost:5103/api/health` |
| **CRM-4** | `crm4` | 5104 | Marketing campaigns & enquiries | `http://localhost:5104/api/health` |
| **CRM-5** | `crm5` | 5105 | Customer portal & analytics | `http://localhost:5105/api/health` |
| **ERP-1** | `erp1` | 5201 | Inventory, stock & serials | `http://localhost:5201/api/health` |
| **ERP-2** | `erp2` | 5202 | Procurement, purchase orders & GRN | `http://localhost:5202/api/health` |
| **ERP-3** | `erp3` | 5203 | Bill of materials, work orders & QC | `http://localhost:5203/api/health` |
| **ERP-4** | `erp4` | 5204 | Orders, reservations & dispatch | `http://localhost:5204/api/health` |
| **ERP-5** | `erp5` | 5205 | Finance, GST invoicing & auth service | `http://localhost:5205/api/health` |
| **ERP-6** | `erp6` | 5206 | HR, employees, attendance & payroll | `http://localhost:5206/api/health` |

---

## Documentation
- [Contributing Guidelines](./CONTRIBUTING.md)
- [PMO Runbook](./docs/PMO-RUNBOOK.md)
- [Master Issues Pack](./docs/issues-pack.md)
- [Project Workflow & Gates](./docs/workflow.md)
