# Contributing Guide for Students (Electro App)

Welcome to the **Electro App** monorepo! Eleven teams of four are building ONE integrated CRM + ERP platform for an electronics company over 14 days (Tue 3 Nov 2026 to Mon 16 Nov 2026). To ensure smooth merges without breaking each other's work, every student must strictly follow these rules.

---

## 1. One Branch per Issue & Branch Naming
Never push directly to `main`. Every unit of work requires its own branch created from an up-to-date `main`.

### Branch Naming Convention
- **Team branches**: `<team>/<member><number>-<short-description>`
  - Pattern: `^(crm[1-5]|erp[1-6])/([a-d][1-5]|r[1-4])-[a-z0-9-]+$`
  - Examples:
    - `crm1/a1-leads-api`
    - `crm1/r1-readme`
    - `erp4/c1-dispatch-service`
    - `erp5/c4-start-everything`
- **Special integrator / PMO branches**:
  - `integrator/<key>-<description>` (e.g., `integrator/c1-foundation`, `integrator/c3-login-shell`) — *only authorized students in `.github/integrators.txt` may open PRs from these branches*.
  - `pmo/<description>` (e.g., `pmo/setup-repo`)

---

## 2. Commit Under Your Own Name
Always configure git with your official name and university / GitHub email:
```bash
git config user.name "Your Full Name"
git config user.email "your.email@example.com"
```
Every student's individual contribution is evaluated through git commit history and PR ownership.

---

## 3. Strict Folder Boundaries (Only Touch Your Own Folders)
You may **only** create or modify files inside your team's designated paths:
- Backend: `services/<team>/` (routes, schema, seed, mocks)
- Frontend: `frontend/src/modules/<team>/` (`index.jsx` and `pages/*.jsx`)
- Documentation: `docs/<team>/` (`README.md`, `demo.md`, `tests.md`, `api.md`, `er-diagram.md`, wireframes)

> [!CAUTION]
> **Never edit shared files or `.github/`**:
> Do not modify files in `services/_shared/`, `frontend/src/api.js`, `frontend/src/App.jsx`, root configuration, or `.github/`. CI will reject any team PR touching these files.
> If you need a change in shared infrastructure or contract specifications, open an issue using the **Change Request** template and tag PMO. PMO answers change requests within **8 hours**.

---

## 4. No Unauthorized NPM Packages
Do not run `npm install <new-package>` without prior approval from PMO.
The standard stack is:
- **Backend**: Node.js 18+, Express, PostgreSQL (`pg`), `dotenv`, `cors`.
- **Frontend**: React (Vite), `react-router-dom`, plain CSS. No UI libraries (e.g. no Tailwind, no Material UI, no Bootstrap), no chart libraries.

---

## 5. Pull Request Title and Body Format
Every PR must follow this exact format to pass automated CI checks:
1. **PR Title**: Must start with your issue key in square brackets:
   - Format: `[<KEY>] <Short Title>`
   - Examples:
     - `[CRM1-A1] Leads table and API`
     - `[CRM1-R1] Team Lead: README and demo script`
     - `[ERP5-C4] Start-everything script, database setup and README`
2. **PR Body**: Must explicitly close your assigned issue number:
   - Format: `Closes #<issue-number>` (e.g., `Closes #14`)
   - Complete the author pre-merge checklist in the PR template.

---

## 6. How Code Reviews Work
1. **Team Internal Review**: When your PR is ready, your Team Lead (Role R1) conducts an initial peer review to check code quality and module consistency.
2. **PMO Review & Approval**: A PMO member must review and approve your PR.
   - PMO enforces a review SLA of **8 hours**.
   - PMO verifies folder boundaries, issue "Done when" conditions, seed contract adherence, and CI check status.
   - Only PMO can merge PRs into `main`.

---

## 7. What to Do When Blocked
- If another team's API or endpoint is not merged yet, follow the **WAIT / MOCK** rule:
  - If the issue says `(MOCK: ...)`, build against a mock file in `services/<team>/mocks/<name>.json`. Never stall waiting for an endpoint that can be mocked!
  - If the issue says `(WAIT: ...)`, work on your other independent issues first.
- If you are blocked on an unresolved dependency or broken contract:
  - **Raise to Lead & Open Blocker within 4 hours**: Tell your Team Lead and open a **[BLOCKER]** issue using the Blocker template within 4 hours.
  - Tag PMO in the issue. PMO answers blocker issues the same day.
