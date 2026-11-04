# Issues for Team CRM4

**Context Line**:
> Team: CRM-4 Marketing and engagement. Database: crm4_db. Backend services/crm4 on port 5104. Frontend module frontend/src/modules/crm4 (id crm4, title Marketing, roles admin and sales). Our job: run marketing campaigns to customer segments, capture enquiries as leads, and measure customer feedback. Messages are only simulated (nothing is really sent).

## Build Issues

### [CRM4-A1] Campaigns table and API

- **Build**: Table campaigns (id CMP-0001, name, objective, channel = email/whatsapp/sms, status = draft/ scheduled/sent default draft, segment_id, template_id, scheduled_at, created_at). CRUD plus PATCH /api/campaigns/:id/status. 5 seed campaigns in different statuses; segment_id from SEG-0001 to SEG-0004, template_id from TPL-0001 to TPL-0004.
- **Depends on**: nothing (IDs are plain text).
- **Needed by**: CRM4-A2, A3.
- **Done when**: CRUD works; 5 seed campaigns in different statuses.

### [CRM4-A2] Campaign screens

- **Build**: Page /campaigns (table, status badges, create/edit form). Dropdowns: segment from api('crm3', '/api/segments'), template from this team's api('crm4', '/api/templates').
- **Depends on**: CRM4-A1 (WAIT). CRM3-C1 (MOCK: hard-code 4 segments until merged). CRM4-C1 (MOCK: hard- code 4 templates until merged).
- **Done when**: you can create and edit a campaign choosing a segment and a template.

### [CRM4-A3] Send simulation

- **Build**: POST /api/campaigns/:id/send: fetch the segment's customers from CRM-3 GET /api/segments/:id/ customers ( mock: 'segment-customers'), insert one row per customer in campaign_messages (id, campaign_id, customer_id, status = sent, sent_at), mark the campaign sent. Sending twice returns 409. For each customer also post a timeline event to CRM-3 /api/interactions/from-event {customer_id, type:'email', summary:'Campaign CMP-xxxx sent', source_team:'CRM-4'} (side effect, try/catch). "Send now" button showing "Sent to N customers".
- **Depends on**: CRM4-A1 (WAIT). CRM3-C1 (MOCK: 3-row mock). CRM3-B3 (MOCK: log).
- **Done when**: the message count equals the segment size; second send is blocked; timeline entries appear on those customers (or the mock log).

### [CRM4-B1] Audiences API

- **Build**: Tables audiences (id AUD-0001, name, description, created_at) and audience_members (id, audience_id, customer_id, name, email, phone, opted_out boolean default false). CRUD for audiences, POST and DELETE members, GET /api/audiences/:id/members. 3 seed audiences with members from CUST-0001 to CUST-0008.
- **Depends on**: nothing.
- **Done when**: all endpoints work; 3 seed audiences with members.

### [CRM4-B2] Audience screens

- **Build**: Page /audiences (list with member counts, create form). Page /audiences/:id (members table, add- member form, remove button).
- **Depends on**: CRM4-B1 (WAIT).
- **Done when**: members can be added and removed and the counts update.

### [CRM4-B3] Import from segment and opt-out

- **Build**: POST /api/audiences/:id/import-segment {segment_id} copies customers from CRM-3 GET /api/segments/:id/customers ( mock: 'segment-customers'), skipping ones already in the audience. "Opt out" toggle per member; opted-out members are not counted as reachable. Show the "reachable" count on the list.
- **Depends on**: CRM4-B1 (WAIT), CRM4-B2 (WAIT). CRM3-C1 (MOCK).
- **Done when**: importing twice adds no duplicates; toggling opt-out changes the reachable count.

### [CRM4-B4] Enquiry capture form (creates a CRM-1 lead) NEW

- **Build**: Page /enquiry: a simple public-style form (name, phone, email, source dropdown dealer/web/walk-in, product interest dropdown from api('erp1', '/api/products')). Backend POST /api/enquiries stores the enquiry in table enquiries (id ENQ-0001, name, phone, email, source, product_interest, lead_id, created_at) and then creates a lead in CRM-1 with callService('crm1', '/api/leads', {method:'POST', body:{name, phone, email, source, product_interest, sales_rep_id:'EMP-0001'}}), saving the returned lead id in lead_id. This is the "dealer enquiry arrives as a lead" demo step. Do not use a mock for this call when USE_MOCKS=false; if CRM-1 is down return 502 so the user sees the failure.
- **Depends on**: CRM1-A1 (MOCK: log and store lead_id LEAD-MOCK until merged). ERP1-A1 (MOCK: 3-product local list).
- **Needed by**: ERP5-C5 (step 1 of the end-to-end test).
- **Done when**: submitting the form creates an enquiry row and a lead visible on /crm1/leads.

### [CRM4-C1] Templates API

- **Build**: Table templates (id TPL-0001, name, channel = email/whatsapp/sms, subject nullable, body, created_at). Body may contain placeholders {{name}}, {{product}}, {{offer}}. CRUD. Seed 4 templates TPL-0001 to TPL-0004: product launch, festive offer, warranty reminder, feedback request.
- **Depends on**: nothing.
- **Needed by**: CRM4-A2, C2, C3.
- **Done when**: CRUD works; seed templates exist.

### [CRM4-C2] Template editor screen

- **Build**: Page /templates: list and editor with channel dropdown, subject (hidden for whatsapp), body textarea, buttons that insert each placeholder, and a live preview that replaces placeholders with sample values.
- **Depends on**: CRM4-C1 (WAIT).
- **Done when**: typing updates the preview instantly; saving creates or updates the template.

### [CRM4-C3] Render endpoint and validation

- **Build**: POST /api/templates/:id/render {name, product, offer} returns the final text. Warn (in the response and in the editor) about unknown placeholders like {{abc}}. Limit sms body to 160 characters and show a character counter.
- **Depends on**: CRM4-C1 (WAIT), CRM4-C2 (WAIT, for the editor warning).
- **Done when**: render replaces all three placeholders; unknown ones are reported; sms over 160 characters is rejected.

### [CRM4-D1] Surveys API

- **Build**: Tables surveys (id SRV-0001, title, type = nps/csat, created_at) and survey_responses (id, survey_id, customer_id, score int 0 to 10, comment, created_at). CRUD for surveys, POST /api/surveys/:id/responses (score 0 to 10 else 400), GET /api/surveys/:id/responses. 2 seed surveys with 10 responses from CUST-0001 to CUST-0008.
- **Depends on**: nothing.
- **Done when**: responses are validated and stored; 2 seed surveys with 10 responses.

### [CRM4-D2] Survey screens

- **Build**: Page /surveys (list and create). Page /surveys/:id/respond (buttons 0 to 10, comment box, Submit, thank-you message).
- **Depends on**: CRM4-D1 (WAIT).
- **Done when**: submitting a response stores it and shows the thank-you.

### [CRM4-D3] NPS results

- **Build**: GET /api/surveys/:id/results: total responses, average score, promoters (9 to 10), passives (7 to 8), detractors (0 to 6), NPS = %promoters minus %detractors. Page /surveys/:id/results shows the NPS number, three coloured bars and the latest 5 comments.
- **Depends on**: CRM4-D1 (WAIT), CRM4-D2 (WAIT).
- **Done when**: NPS matches a hand calculation on the seed data.

## Role Issues (Section 8b)

### [CRM4-R1] Team Lead: README and demo script

- **Build**: Keep docs/crm4/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/crm4/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a daily 10-minute check during morning standup: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.
- **Depends on**: Start now. Final demo script waits for all 13 build issues of your team (WAIT).
- **Done when**: README and demo script in main; demo script can be followed by someone outside the team.

### [CRM4-R2] Data owner: ER diagram, data dictionary and seed verification

- **Build**: Draw the ER diagram of your tables in 3NF (docs/crm4/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.
- **Depends on**: Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).
- **Done when**: ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.

### [CRM4-R3] UI owner: Wireframes and screen consistency

- **Build**: Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/crm4/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/crm4/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.
- **Depends on**: None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.
- **Done when**: Wireframes for all pages exist; every page opens from the sidebar at /crm4/... and looks consistent.

### [CRM4-R4] QA and docs owner: Test cases, API spec and cross-team verification

- **Build**: Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/crm4/tests.md. Write the API spec docs/crm4/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: 2, 4, 8, 9.
- **Depends on**: Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.
- **Done when**: Test cases all run with results; API spec matches the code; bug issues are filed and closed.
