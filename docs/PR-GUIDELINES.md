# 📋 Electro App: Pull Request (PR) Format & Review Guidelines

> **Mandatory Reading for All Developers & Team Leads**  
> Every contribution to `electro-app` enters `main` via a Pull Request.  
> PMO reviews PRs within **8 hours**. Follow this guide to guarantee immediate first-pass approval.

---

## 📌 The Golden PR Rules

1. **Only PMO Merges**: Students and Team Leads never merge PRs into `main`. Merging is strictly controlled by PMO via branch protection.
2. **Never Touch Shared Files**: Only touch `services/<team>/`, `frontend/src/modules/<team>/`, and `docs/<team>/`.
3. **No Hardcoded Localhost**: Always use `api('<team>', '/api/...')` in React components.
4. **Link the Issue**: The PR description **must** include `Closes #<issue_number>` so GitHub closes the issue automatically upon merge.
5. **Attach Proof**: Every PR must include proof of working functionality (UI screenshot or Postman / curl output).

---

## 🏷️ PR Title Convention

The title of your PR **MUST** match this exact pattern:
```text
[<KEY>] <Short Description of the Feature>
```

### ✅ Valid PR Titles:
- `[CRM1-A1] Leads table and API`
- `[CRM1-A2] Lead screens and sales rep dropdown`
- `[ERP1-B1] Stock tables and movements API`
- `[ERP4-C3] Dispatch shipping and inventory deduction`
- `[CRM1-R1] Team Lead: README and demo script`

### ❌ Rejected PR Titles:
- `fixed leads api` *(Missing `[KEY]`)*
- `CRM1-A1: update` *(Must use square brackets `[CRM1-A1]`)*
- `completed my task` *(Vague, unsearchable)*

---

## 📝 PR Description Template (Copy & Paste)

When opening a Pull Request, GitHub will automatically load this template. Fill out all sections completely:

```markdown
## Summary
Implemented the PostgreSQL leads table with sequential ID generation (LEAD-xxxx), 
seed data conforming to the Section 5 contract, and Express CRUD endpoints.

Closes #1

**Issue Key**: [CRM1-A1]

## Author Pre-Merge Checklist
Please verify all items before requesting PMO review:
- [x] **Folder boundaries respected**: Only touched files inside `services/crm1/`, `frontend/src/modules/crm1/`, or `docs/crm1/`. No shared files touched.
- [x] **Module registration**: `frontend/src/modules/crm1/index.jsx` registers all new pages with correct route prefix and roles.
- [x] **No localhost hardcoding**: Frontend uses `api('crm1', '/api/leads')`, no direct fetch or localhost URLs.
- [x] **Standard service communication**: Inter-service calls use `callService()` with mock fallback.
- [x] **Mocks properly handled**: Mocks created under `services/crm1/mocks/` with 3 realistic rows.
- [x] **Shared seed contract followed**: Foreign keys strictly use shared contract IDs (CUST-, SKU-, EMP-, DLR-, etc.).
- [x] **CI passing**: All automated checks (branch name, folder check, build, no-secrets) are green.

## Verification & Proof

### Screenshots (UI)
*(Attach screenshot of working UI table / form here, or write "N/A - Backend API only")*

### Sample API Requests / Responses (curl or Postman)
```bash
# 1. Fetch leads list
$ curl -s http://localhost:5101/api/leads | jq .
{
  "data": [
    {
      "id": "LEAD-0001",
      "name": "Aarav Mehta",
      "source": "dealer",
      "status": "qualified",
      "score": 70
    }
  ]
}

# 2. Validation error test
$ curl -s -X POST http://localhost:5101/api/leads -H "Content-Type: application/json" -d '{}' | jq .
{
  "error": "Name is required"
}
```
```

---

## 🔍 Why Might PMO Reject or Block a PR?

| Common Mistake | How to Fix It |
| :--- | :--- |
| **Touched `services/_shared/` or `package.json`** | Revert the change. Never modify shared helpers or root configs. |
| **CI failed on `folder-check`** | Ensure your branch contains zero files outside your assigned team directory. |
| **Hardcoded `http://localhost:5101` in React** | Replace `fetch('http://localhost:5101/api/...')` with `api('crm1', '/api/...')`. |
| **Missing `Closes #<id>` in PR body** | Add `Closes #12` to the PR description so GitHub links the issue. |
| **Invented IDs (e.g. `CUST-9999`)** | Use exact shared seed contract IDs (`CUST-0001..0008`, `SKU-0001..0015`, `EMP-0001..0004`). |
| **Route parameter collision** | Specific routes (e.g. `/api/leads/hot`) must be defined **before** `/:id` in Express. |
| **Missing Verification Proof** | Paste your test terminal output or attach a UI screenshot in the PR description. |

---

## ⏱️ Review SLA & Escalations
- **PMO SLA**: Every PR will receive review feedback or approval within **8 hours**.
- **Blockers**: If you are blocked by another team's API, follow the **WAIT / MOCK** rule: build against mock data in `services/<team>/mocks/` so your development never stops.
