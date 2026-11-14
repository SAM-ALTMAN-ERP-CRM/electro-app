# Electro App · CRM + ERP Monorepo

Welcome to **Electro App**, the unified enterprise resource planning and customer relationship management application for an electronics manufacturer.

Built by 11 collaborative teams:
- **CRM Teams**: CRM-1 (Sales), CRM-2 (Support), CRM-3 (Customer 360), CRM-4 (Marketing), CRM-5 (Portal & Analytics)
- **ERP Teams**: ERP-1 (Inventory), ERP-2 (Purchasing), ERP-3 (Production), ERP-4 (Orders & Dispatch), ERP-5 (Finance & Shell), ERP-6 (HR & Workforce)

---

## Setup on Windows and Mac

### 1. Install PostgreSQL
- **macOS (Homebrew)**:
  ```bash
  brew install postgresql@16
  brew services start postgresql@16
  ```
  *(Or download and install [Postgres.app](https://postgresapp.com/)).*
- **Windows**:
  - Download and run the official installer from [postgresql.org](https://www.postgresql.org/download/windows/).
  - Ensure the PostgreSQL service is running in Windows Services (`services.msc`).

### 2. Create the `postgres` Role & Password
The app connects to local PostgreSQL with user `postgres` and password `postgres`:
- **macOS**:
  ```bash
  psql postgres -c "CREATE ROLE postgres WITH SUPERUSER LOGIN PASSWORD 'postgres';"
  ```
  *(If the role already exists, update its password: `psql postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"`).*
- **Windows**:
  - Open `SQL Shell (psql)` from the Start menu and log in as superuser.
  - Set password: `ALTER USER postgres WITH PASSWORD 'postgres';`

### 3. Clone & Install Dependencies
```bash
git clone https://github.com/SAM-ALTMAN-ERP-CRM/electro-app.git
cd electro-app
npm install
```

### 4. Configure Environment
Copy the development environment template:
```bash
cp .env.example .env
```
*(On Windows Command Prompt: `copy .env.example .env`)*

### 5. Initialize Databases
Automatically provision all 11 databases and execute schemas and seeds in dependency order:
```bash
npm run db:setup
```
*(To completely reset and recreate all databases from scratch, run `npm run reset`).*

### 6. Start the Application
Starts all 11 microservices and the Vite React frontend shell:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

### Troubleshooting Common Setup Issues

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
