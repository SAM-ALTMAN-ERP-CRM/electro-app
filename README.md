# Electro App · CRM + ERP Monorepo

Welcome to **Electro App**, the unified enterprise resource planning and customer relationship management application for an electronics manufacturer.

Built by 11 collaborative teams:
- **CRM Teams**: CRM-1 (Sales), CRM-2 (Support), CRM-3 (Customer 360), CRM-4 (Marketing), CRM-5 (Portal & Analytics)
- **ERP Teams**: ERP-1 (Inventory), ERP-2 (Purchasing), ERP-3 (Production), ERP-4 (Orders & Dispatch), ERP-5 (Finance & Shell), ERP-6 (HR & Workforce)

---

## Quick Start

### 1. Prerequisites
- Node.js 18+ (tested on Node 20)
- npm 9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 4. Start Development Server
Starts all 11 backends and the unified React frontend:
```bash
npm run dev
```

The frontend will be running at: `http://localhost:3000`

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
