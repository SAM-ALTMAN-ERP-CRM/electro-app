# PMO Engineering & Operations Runbook

This runbook outlines the operational procedures, governance controls, review checklists, and release cadences for the 4-person PMO team overseeing the 11 delivery teams in the `electro-app` monorepo.

---

## 1. PMO Team Responsibilities & Coverage Matrix

The 4-person PMO team shares responsibility for code reviews, contract sign-offs, CI/CD health, and milestone gating.

### Team Coverage Matrix
| PMO Member | Assigned Teams | Backup Reviewer | Primary Focus |
| :--- | :--- | :--- | :--- |
| **PMO 1** | `erp5`, `erp6`, `crm3` | PMO 2 | Architecture, auth & shell, master data (employees/finance) |
| **PMO 2** | `crm1`, `crm2`, `crm5` | PMO 1 | Sales pipeline, support/warranty, portal & analytics |
| **PMO 3** | `erp1`, `erp4` | PMO 4 | Inventory & warehouse, orders & dispatch (golden path) |
| **PMO 4** | `erp2`, `erp3`, `crm4` | PMO 3 | Procurement, production/quality, marketing & engagement |

---

## 2. PR Review Rules and Checklist

### Cardinal Governance Rules
1. **Never Review Your Own PR**: A PMO reviewer must **never** approve or merge a pull request they authored. Every PR requires an independent review from another PMO member.
2. **Review SLA (8 Hours)**: PRs submitted by students must be reviewed and either approved or provided with actionable feedback within 8 hours.
3. **Zero Tolerance for Shared File Mutations**: Immediately **REJECT** any team branch PR that touches files under `.github/`, `services/_shared/`, `frontend/src/api.js`, `frontend/src/App.jsx`, or root configuration files.
4. **Sole Code Ownership**: PMO is configured as the sole code owner (`.github/CODEOWNERS`). Only PMO team members have write/admin privileges to merge PRs into `main`.

### PMO PR Review Checklist
When reviewing an incoming student PR, verify each item:
- [ ] **Strict Folder Boundaries**: All modified/created files are located solely in:
  - `services/<team>/`
  - `frontend/src/modules/<team>/`
  - `docs/<team>/`
- [ ] **Issue "Done When" Conditions**: Check the issue body in `scripts/pmo/issues.json` or GitHub. Verify that every acceptance criterion listed in "Done when" is satisfied.
- [ ] **Shared Seed IDs Used**: If any entity links to another team's records, confirm it strictly uses the shared contract IDs from Section 5:
  - Customers: `CUST-0001` to `CUST-0008` (retail/corporate/dealer)
  - Products: `SKU-0001` to `SKU-0015` and components `SKU-0101` to `SKU-0105`
  - Employees: `EMP-0001` to `EMP-0012` (sales reps `EMP-0001`..`EMP-0004`, service engineers `EMP-0005`..`EMP-0007`)
  - Warehouses: `WH-01` to `WH-03`
  - Serials: `TV55-2611-0001` to `TV55-2611-0030`
  - Orders: `SO-0001` to `SO-0005`, Dispatches: `DSP-0001` to `DSP-0005`, Invoices: `INV-0001` to `INV-0005`
- [ ] **No Localhost in Frontend**: Ensure code uses `api('<team>', '/api/...')` instead of raw `fetch()` or `http://localhost:<port>`.
- [ ] **Mocks Handled Correctly**:
  - Mock files stored under `services/<team>/mocks/<mock>.json` with 3 realistic rows.
  - Side-effect calls (`interactions/from-event`, `ledger/auto`, etc.) wrapped in `try/catch` with `[integration-error]` logging so downstream downtime does not break the main transaction.
- [ ] **Automated CI Status**: All 5 CI jobs (`branch-name`, `folder-check`, `build`, `no-secrets`, `pr-format`) must be passing green before merge.
- [ ] **Squash and Merge**: Merge using squash-merge only; ensure the commit title retains the `[KEY] Title` format and closes the associated issue (`Closes #n`).

---

## 3. Weekly Operating Rhythm

The PMO team maintains high coordination through two primary weekly sync points:

### Monday Morning: Dependency & Blocker Review (30 min)
- **Time**: Every Monday 09:30 AM
- **Agenda**:
  1. Review open **[BLOCKER]** issues escalated over the preceding 24–48 hours.
  2. Inspect cross-team dependencies scheduled for the upcoming wave.
  3. Validate mock fallback implementations for teams waiting on upstream providers.
  4. Balance workloads across team lanes.

### Friday Afternoon: Status & Integration Check (60 min)
- **Time**: Every Friday 04:00 PM
- **Agenda**:
  1. Collect weekly status reports from all 11 Team Leads (Status: Green / Amber / Red; Done; Planned; Blockers; Risks).
  2. Merge reports into a single PMO dashboard update.
  3. Verify R1 weekly audits: confirm every team lead performed their 10-minute audit of merged PRs.
  4. Run automated database setup (`npm run reset`) and health checks locally to catch regressions early.

---

## 4. Quality Gates & Milestones

The project progresses through 4 strict quality gates leading to the Final Demo (Day 14 = Mon 16 Nov 2026):

| Milestone / Gate | Due Date | Exit Criteria |
| :--- | :--- | :--- |
| **Wave 0 Foundation** | `2026-11-05` | PMO foundation merged; monorepo skeleton, root scripts, 11 `/api/health` endpoints returning 200, frontend shell displaying 11 menu groups. |
| **G1 Design Freeze** | `2026-11-06` | Wave 1 master data and core tables merged; Role R2 (ER diagrams in 3NF + data dictionary) approved by PMO; all contracts frozen. (Wireframes R3 optional). |
| **G2 Core Flow** | `2026-11-09` | Every team demonstrates its core flow (Build issues #1 and #2) against its isolated database; mock APIs enable independent development. |
| **G3 Integration** | `2026-11-12` | All cross-team caller issues (Wave 3) replace mocks with live inter-service calls; order-to-invoice end-to-end chain working. |
| **G4 Release Candidate**| `2026-11-13` | Feature freeze; `USE_MOCKS=false` enabled across the repository; Role R1 demo scripts and R4 test suites completed; zero critical bugs open. |
| **Final Demo** | `2026-11-16` | 9-step scripted walkthrough from dealer enquiry to warranty return executed cleanly in the test environment. |

---

## 5. Change Control Process

Any modification to project scope, a database schema, or an inter-service API contract must adhere to the change-control process:

1. **Submission**: The requesting Team Lead opens a GitHub issue using the **Change Request** template (`.github/ISSUE_TEMPLATE/change-request.yml`), detailing:
   - *What*: Exact proposed changes to columns, paths, or JSON payloads.
   - *Why*: Technical or business justification.
   - *Who is affected*: Explicit list of downstream consumer teams.
2. **Impact Assessment & Decision**: PMO reviews the request, assesses cross-team impacts, and answers within **8 hours**.
3. **Contract Update**: If approved, PMO updates documentation, notifies all affected teams, and logs the decision.

---

## 6. PMO Automation & Script Execution

The PMO repository scripts allow automated verification and synchronization:

### 1. Re-running the Issue Parser & Validator
To re-parse the issues pack and regenerate `issues.json`:
```bash
python3 scripts/pmo/parse_issues.py
```
This script validates all 180 issues (136 build + 44 role), verifies schema completeness, and refreshes `scripts/pmo/issues.json`.

### 2. GitHub Setup Script (Dry-run & Live)
```bash
# Preview repository settings, permissions, labels, milestones, and ruleset
node scripts/pmo/setup-github.js --dry-run

# Apply configuration to GitHub organization (requires admin token / gh auth)
node scripts/pmo/setup-github.js
```

### 3. GitHub Issue Creation Script (Dry-run & Live)
```bash
# Preview all 180 issues, label assignments, assignees, and milestone mappings
node scripts/pmo/create-issues.js --dry-run

# Create issues idempotently on GitHub
node scripts/pmo/create-issues.js
```
