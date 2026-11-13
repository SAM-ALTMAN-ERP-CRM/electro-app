# CRM-1 Sales Pipeline

CRM-1 captures sales leads, scores their fit, tracks opportunities through a
pipeline, manages dealer records and prepares customer quotations. It is one
module in Electro-App's shared CRM + ERP platform: the shared frontend shell
hosts the module while CRM-1's API and PostgreSQL database are a separate
service.

## Locations and access

- Backend: [`services/crm1`](../../services/crm1), default port `5101`.
- Database: PostgreSQL database `crm1_db`.
- Frontend: [`frontend/src/modules/crm1`](../../frontend/src/modules/crm1).
- Module roles: `admin` and `sales`. The approvals page is restricted to
  `admin`; the other registered CRM-1 pages allow both roles.
- The backend protects its resource routes with `requireAuth`. Approval-list,
  approve and reject routes also use `requireRole('admin')`. The health route
  is public.

## What CRM-1 does in Electro-App

CRM-1 is the sales entry point between customer/dealer interest and the order
workflow. Leads can be associated with opportunities; opportunities can have
quotes; accepting a quote calls ERP-4 to create a sales order. CRM-1 also tries
to add an interaction to the CRM-3 customer timeline when a quote is accepted.
The CRM-3 integration currently has a route mismatch, described under
[integrations and limitations](#integrations-and-known-limitations).

## Database tables and relationships

The schema is in [`services/crm1/db/schema.sql`](../../services/crm1/db/schema.sql);
initial records are in [`services/crm1/db/seed.sql`](../../services/crm1/db/seed.sql).

| Table | Purpose and relationship |
| --- | --- |
| `leads` | Lead contact, source, status, score and sales-rep ID. |
| `opportunities` | Sales deals with stage and expected value. `lead_id` references `leads(id)` with `ON DELETE SET NULL`. |
| `quotes` | Quote header, status, discount and approval flags. `opportunity_id`, `customer_id`, `dealer_id` and `sales_rep_id` are stored as IDs but are not declared foreign keys. |
| `quote_items` | Product lines for a quote. `quote_id` references `quotes(id)` with `ON DELETE CASCADE`. |
| `dealers` | Dealer contact, city, tier, credit limit and status. `quotes.dealer_id` is not declared as a foreign key. |

CRM-3 customers, ERP-6 sales reps, ERP-1 products and ERP-4 sales orders are
owned by their respective services; CRM-1 does not create cross-database
foreign keys for them.

## Backend API

The CRM-1 server mounts every JavaScript router under `/api`. The methods below
are implemented in `services/crm1/routes/`. Unless otherwise noted, routes
require authentication and return JSON.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Public CRM-1 service health check. |
| `GET` | `/api/leads` | List leads; optional `?status=` filter. |
| `GET` | `/api/leads/hot` | List leads with score at or above 60. |
| `GET` | `/api/leads/:id` | Read one lead. |
| `POST` | `/api/leads` | Create a lead and calculate its score. |
| `PUT` | `/api/leads/:id` | Update a lead and recalculate its score. |
| `DELETE` | `/api/leads/:id` | Delete a lead. |
| `GET` | `/api/opportunities` | List opportunities. |
| `GET` | `/api/opportunities/summary` | Count and total expected value by stage. |
| `GET` | `/api/opportunities/:id` | Read one opportunity. |
| `POST` | `/api/opportunities` | Create an opportunity, optionally linked to a lead. |
| `PUT` | `/api/opportunities/:id` | Update opportunity fields. |
| `PATCH` | `/api/opportunities/:id/stage` | Advance or lose an opportunity using stage rules and the accepted-quote gate. |
| `GET` | `/api/quotes` | List quotes; optional `?opportunity_id=`, `?status=` and `?dealer_id=` filters. |
| `GET` | `/api/quotes/:id` | Read a quote, its items and calculated totals. |
| `POST` | `/api/quotes` | Create a draft quote and its line items. |
| `PATCH` | `/api/quotes/:id/status` | Move a quote from draft to sent, then to accepted or rejected; authentication required, but no additional role check. |
| `GET` | `/api/approvals` | List pending discount approvals; admin only. |
| `PATCH` | `/api/quotes/:id/approve` | Approve a quote; admin only. |
| `PATCH` | `/api/quotes/:id/reject` | Reject a quote with a reason; admin only. |
| `GET` | `/api/dealers` | List dealers; optional `?q=` and `?city=` filters. |
| `GET` | `/api/dealers/:id` | Read one dealer. |
| `POST` | `/api/dealers` | Create a dealer. |
| `PUT` | `/api/dealers/:id` | Update a dealer. |

There is **no lead-to-opportunity conversion endpoint**. Associate a lead by
setting `lead_id` when creating or updating an opportunity.

## Lead scoring and Hot leads

`POST /api/leads` and `PUT /api/leads/:id` calculate the score from the
submitted lead fields:

| Signal | Points |
| --- | ---: |
| Dealer source | 30 |
| Web source | 20 |
| Walk-in source | 10 |
| Email present | 10 |
| Phone present | 10 |
| Product interest present | 10 |

The score is capped at 100. `/api/leads/hot` and the Leads page mark a lead Hot
when `score >= 60`. The current seed assigns `LEAD-0001` score `70`; applying
the current calculation to its populated fields would produce `60`. This seed
value difference is intentional to call out for the demo, not evidence that
the score was calculated from the seed row.

## Opportunities, quotes and approvals

The Kanban page uses `PATCH /api/opportunities/:id/stage`. The allowed moves
are `prospect -> proposal`, `proposal -> negotiation`, and
`negotiation -> won`, or moving an active stage to `lost`. `lost` cannot be
reopened; `won` can only move to `lost`. Moving to `won` requires an accepted
quote for that opportunity. A direct `PUT /api/opportunities/:id` can set
fields including `stage`; it does not apply the transition rules, so use the
stage PATCH route for normal pipeline movement.

Quotes have `draft`, `sent`, `accepted` and `rejected` statuses. The regular
workflow is draft -> sent -> accepted/rejected. A discount greater than 5% (or
an explicitly requested approval) sets `needs_approval`; an unapproved quote
requiring approval cannot be sent. Approval is performed by an admin. Quote
financials are calculated from line items: subtotal, discount, taxable value,
18% GST on the discounted value and total.

The Approvals page displays Gold 15%, Silver 10% and Bronze 5% dealer guidance.
The backend's approval trigger is currently a flat discount greater than 5%;
it does not enforce those tier-specific limits.

## Frontend pages and routes

The shared shell prefixes each module route with `/crm1`. Route registrations
are in [`frontend/src/modules/crm1/index.jsx`](../../frontend/src/modules/crm1/index.jsx).

| Browser route | Page | Roles |
| --- | --- | --- |
| `/crm1` | Quotes list (`QuotesListPage`) | admin, sales |
| `/crm1/leads` | Leads (`LeadsPage`) | admin, sales |
| `/crm1/pipeline` | Opportunity Kanban (`PipelinePage`) | admin, sales |
| `/crm1/quotes` | Quotes list (`QuotesListPage`) | admin, sales |
| `/crm1/quotes/new` | Quote builder (`QuoteBuilderPage`) | admin, sales |
| `/crm1/dealers` | Dealer list (`DealersPage`) | admin, sales |
| `/crm1/dealers/:id` | Dealer details and related quotes (`DealerDetailPage`) | admin, sales |
| `/crm1/approvals` | Discount approvals (`ApprovalsPage`) | admin |

The quote list and builder create/display quotes. Sending and accepting a quote
is currently available through the status API, not an action on the quote-list
page.

## Shared helpers and integrations

- Backend routes use `requireAuth` and `requireRole` from
  `services/_shared/auth.js`, and `makePool` from `services/_shared/db.js`.
- Backend cross-service calls use `callService` from
  `services/_shared/callService.js`.
- Frontend API calls use the shared `api()` client from
  `frontend/src/api.js`; pages do not call services directly with `fetch`.
- Leads asks ERP-6 for sales reps; if unavailable, the page displays the
  approved local list (`EMP-0001` through `EMP-0004`).
- Quote Builder asks ERP-1 for products; if unavailable, it displays a local
  seed catalog.
- Pipeline makes a non-blocking CRM-3 customer lookup; if unavailable, it can
  still display customer IDs.
- Before moving an opportunity to `won`, CRM-1 asks its own quotes API for an
  accepted quote.
- When a quote becomes accepted, CRM-1 posts its quote ID, customer, rep and
  item lines to ERP-4 `POST /api/sales-orders`. ERP-4 has a real route. A
  repeated quote ID returns `409`; CRM-1 treats that as an already-existing
  order. If ERP-4 is unreachable and `USE_MOCKS` is enabled,
  `callService` can return `services/erp4/mocks/sales-orders.json`; this is
  sample data, not a persisted new order.
- On the same status change, CRM-1 attempts
  `POST /api/interactions/from-event` in CRM-3. The current CRM-3 routes expose
  `POST /api/interactions`, not `/api/interactions/from-event`; therefore the
  caller's request currently fails against CRM-3. The quote remains accepted
  and CRM-1 logs the timeline failure as `[integration-error]`.
- CRM-1 has `services/crm1/mocks/timeline-event.json`, but the shared
  `callService('crm3', ..., { mock: 'timeline-event' })` helper looks for the
  mock under `services/crm3/mocks/`. That target mock file is not present, so
  the CRM-1-local file does not provide a fallback for this call.

Integration errors for ERP-4 and CRM-3 are caught and logged; quote acceptance
does not prove either downstream side effect succeeded. ERP-4 calculates its
order total from raw item prices, while the CRM-1 handoff does not include the
quote discount or GST fields.

## Local setup

Prerequisites: Node.js 18+, npm 9+, PostgreSQL, and a working local Postgres
user. From the repository root:

```bash
npm install
cp .env.example .env
```

CRM-1 defaults to port `5101` unless `PORT` is overridden. The example config
sets `DATABASE_URL_CRM1` to `crm1_db`, `AUTH_REQUIRED=false` and
`USE_MOCKS=true`. Edit `.env` to match your local Postgres credentials. With PostgreSQL running,
create and initialize CRM-1's database (skip `createdb` if it already exists):

```bash
createdb -h localhost -U postgres crm1_db
psql -h localhost -U postgres -d crm1_db -f services/crm1/db/schema.sql
psql -h localhost -U postgres -d crm1_db -f services/crm1/db/seed.sql
```

Then start the whole application:

```bash
npm run dev
```

The frontend is at `http://localhost:3000`; CRM-1 health is at
`http://localhost:5101/api/health`. `npm run db:setup` is currently a
placeholder and does not create databases or run schema/seed files.

`AUTH_REQUIRED=false` is for local development and supplies an admin identity.
For protected deployments, set `AUTH_REQUIRED=true` and use the platform's
Bearer token. `USE_MOCKS=true` is the default for `callService` network
failures; a real downstream HTTP error such as `404` is returned as an error
and does not trigger a mock.

## Testing and verification

Run CRM-1 tests and the frontend production build from the repository root:

```bash
node --test services/crm1/tests/*.test.js
npm run build
curl -sS http://localhost:5101/api/health
```

The CRM-1 test suite currently reports 58 passing tests and one known failure:
`quotesRoutes.test.js` expects a newly created quote to transition from `sent`
to `rejected`, but receives HTTP `400` instead of `200`. The remaining tests
passed in the verification run for this documentation. See
[`services/crm1/tests`](../../services/crm1/tests) for the route tests.
The same run logged a PostgreSQL error (`inconsistent types deduced for
parameter $1`) from the quote status update. The route can return an
in-memory status while the database row remains unchanged; verify with
`GET /api/quotes/:id` before describing a status change as persisted.

## Team responsibilities

- **Tanmay — Team Lead / Member A:** Leads, lead screens, lead scoring,
  coordination, integration and project documentation.
- **Hezal — Member B:** Opportunities and Pipeline.
- **Member C:** Quotations and ERP-4 order handoff.
- **Member D:** Dealer management and quote approvals.

This allocation corrects the issue body's owner line, which incorrectly
identified Hezal as Member A / Team Lead.

## Integrations and known limitations

- Seed records do not represent every requested demo state:
  `LEAD-0001` has score 70; `OPP-0001` is already `won` and references
  `LEAD-0001`; `QUO-0001` is a `draft` at 0% discount; `QUO-0003` is already
  accepted at 10%.
- `QUO-0001` has no update-quote endpoint. To demo its 10% approval workflow,
  use the SQL preparation in [`demo.md`](./demo.md); creating a new quote after
  seed data will get a later quote ID, not `QUO-0001`.
- ERP-4 seed data already contains `SO-0001` for `QUO-0001`, but it has one
  item and a total of ₹42,990.00. The CRM-1 seed quote has two items and a
  pre-tax subtotal of ₹51,980.00. Accepting that quote against the seeded
  ERP-4 database will hit the duplicate-quote check; it will not create a new
  order.
- CRM-3 seed timeline data contains an `ERP-4` event for `SO-0001`. It is not
  evidence of a new CRM-1 quote-acceptance event. The CRM-1 integration path
  mismatch described above remains unresolved.
- Lead CRUD uses PostgreSQL directly and has no in-memory fallback. Other
  pages/routes have selected local or in-memory fallback data; fallback data
  should not be presented as a persisted database result.
- CRM-1 uses mock/fallback catalogs for ERP-1 products, ERP-6 sales reps,
  quotes, dealers and selected opportunity/order integrations when services
  or databases are unavailable. Check logs and service responses before
  calling any result a live integration.
- There is no automated lead-to-opportunity conversion, no quote update
  endpoint, and no quote status action in the current quote-list UI.
- The quote status route's database `UPDATE` currently logs
  `inconsistent types deduced for parameter $1` in verification. It can return
  an in-memory update even when the persisted row did not change; confirm the
  result with `GET /api/quotes/:id`. The acceptance handler still attempts its
  downstream calls, so its response is not proof of a persisted status or
  successful integrations.
- The issue asks for these files under `docs/crm1/`, while its PR guidance
  says to touch only `services/crm1/` or `frontend/src/modules/crm1/`. This
  documentation follows the explicit deliverable path and should be confirmed
  by PMO before merge.
