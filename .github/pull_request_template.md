## Summary
<!-- Brief description of changes implemented -->
<!-- PMO review SLA: within 8 hours. Never merge your own pull request. -->

Closes #<issue number>

**Issue Key**: [e.g. CRM1-A1]

## Author Pre-Merge Checklist
Please verify all items before requesting PMO review:
- [ ] **Folder boundaries respected**: Only touched files inside my own assigned directories (`services/<team>/`, `frontend/src/modules/<team>/`, or `docs/<team>/`). No modifications to `.github/` or shared folders.
- [ ] **Module registration**: `frontend/src/modules/<team>/index.jsx` registers every page with the appropriate path prefix and allowed roles.
- [ ] **No localhost hardcoding**: No `localhost` references in frontend code; routes use relative module paths or the shared `api()` client.
- [ ] **Standard service communication**: Used frontend `api()` and backend `callService()`.
- [ ] **Mocks properly handled**: Mocks are created under `services/<team>/mocks/<name>.json` with realistic seed data and fallback behavior.
- [ ] **Tests / Postman completed**: Unit tests, integration tests, or Postman requests verified and documented in `docs/<team>/tests.md` and `docs/<team>/api.md`.
- [ ] **Shared seed contract followed**: All foreign keys and cross-team references strictly adhere to the IDs in Section 5 of the issues pack (CUST-, SKU-, EMP-, DLR-, SO-, INV-, etc.).

## Verification & Proof
<!-- Provide screenshots of UI screens or terminal output of sample API requests / responses -->
### Screenshots (UI)
*(Attach screenshots here)*

### Sample API Requests / Responses (Postman or curl)
```bash
# Paste sample requests and responses demonstrating that "Done when" criteria are met
```
