> **Notice**: Dates in this document are superseded: Day 1 = 3 Nov 2026, final demo Mon 16 Nov 2026. See docs/PMO-RUNBOOK.md.

Electronics Company End-to-End App –
Project Management Workflow
 Oct 31, 2026  ·  @Ronnie
Project overview
The PM team's job is to get 11 teams (5 CRM, 6 ERP) to deliver one joined-up app for an
electronics company by a single final demo, planned here as 8 weeks starting Monday 2
November 2026.
The company (assumed): it buys components, assembles and stores products, sells
through dealers and direct customers, and services warranties after the sale. Swap in the
real company details once they are confirmed.
The PM team does not write feature code. It owns four things: the problem statements,
the shared contracts between teams, the calendar with its gates, and the visible status of
every team.
Recommended common stack (decide once in week 0 so teams can integrate): React
front end, Node.js/Express back end, PostgreSQL, REST APIs documented in OpenAPI,
one Git repository per team under a shared organisation, JWT login. Change it if your
instructor or client mandates something else.
Team structure and governance
Five PM roles sit above eleven delivery teams, and every team talks to the PM team
through exactly one team lead. Adjust the split if your PM team has fewer than five
people; one person can hold two roles.
Side Teams What it covers
CRM CRM-1 to CRM-5 Everything customer-facing: leads, accounts,
support, marketing, analytics
ERP ERP-1 to ERP-6 Everything operational: stock, purchasing,
production, orders, finance, HR
PM team You Scope, schedule, integration, quality gates,
communication
Electronics Company End-to-End App – Project Management Workﬂow
Inside each delivery team (4 members, split in the next section): every member owns one
module end to end and also holds one team role, so the work is equal.
Ground rules: each team owns its own tables and exposes them only through its API;
blockers are escalated to the PM team within 24 hours; any change to a shared contract
goes through change control (see Tracking and control).
PM role Owns Main contacts
Program Lead Scope, priorities, escalations,
gate decisions, final demo
All 11 team leads
Delivery and Schedule
Manager
Sprint calendar, task board,
weekly status report,
dependency tracker
All 11 team leads
Integration Manager API contracts, shared master
data, CRM-ERP integration
tests
Leads of linked CRM
and ERP teams
Quality and Release Manager Test plans, bug triage, definition
of done, release candidates
QA person in each
team
Documentation and
Communication Manager
Wiki, meeting minutes, decision
and risk logs, demo deck
Everyone
Meeting When Who Output
Team stand-up Daily, 15 min or
async post
Each team Done, next, blocked
Leads sync Mon and Thu,
30 min
11 team leads + PM team Blockers, scope calls,
dependency check
CRM-ERP
integration review
Wed, 45 min Leads of linked teams +
Integration Manager
Contract changes, test
results
Sprint demo and
retro
Every second
Fri, 60 min
All teams Working demo, retro
actions
Gate review End of weeks
2, 4, 6 and 7
Program Lead + all leads Go or no-go on the gate
Electronics Company End-to-End App – Project Management Workﬂow
Problem statements
Eleven problem statements, one per team, split so that each team owns its own data and
exposes it through an API.
CRM teams (customer-facing)
ERP teams (operations)
Team Problem statement Key modules Deliverables
CRM-1 Sales
pipeline
Sales reps lose leads
and quotes because
dealer, web and walk-
in enquiries sit in
spreadsheets.
Lead capture and
scoring, opportunity
pipeline, quotation
builder with
discounts, dealer
accounts
Lead-to-quote
screens, quote
approval flow,
pipeline API
CRM-2 Support
and warranty
Customers cannot
track repairs or
warranty claims, and
support cannot verify
warranty by serial
number.
Ticketing with SLA
timers, warranty
lookup by serial
number, RMA
(return) requests,
service centre
assignment
Ticket and RMA
screens, SLA alerts,
warranty-check API
CRM-3 Customer
360
Customer data is
scattered across
sales, support and
billing, so nobody sees
the full history.
Customer and
contact master,
interaction timeline,
segments (retail,
corporate, dealer),
duplicate merge
Customer master
API, 360 profile page,
data import tool
CRM-4
Marketing and
engagement
Launches and offers
go out untargeted and
nobody measures the
response.
Campaign builder,
audience lists from
segments, email and
WhatsApp
templates, feedback
and NPS surveys
Campaign screens,
audience API,
response report
CRM-5 Portal and
analytics
Management has no
single view of sales,
service and customer
health, and customers
have no self-service.
Customer portal
(orders, tickets),
sales dashboards,
forecast, role-based
reports
Portal, dashboards,
forecast report
Electronics Company End-to-End App – Project Management Workﬂow
Every team also delivers: an ER diagram in 3NF, a REST API spec, working UI screens, test
cases, and a 5-minute demo script.
Team Problem statement Key modules Deliverables
ERP-1 Inventory
and warehouse
Stock counts are
wrong, so orders are
promised that cannot
be shipped.
Product (SKU)
master, multi-
warehouse stock,
serial and batch
tracking, reorder
levels, stock
transfers
Product master API,
stock ledger, low-
stock alerts
ERP-2
Procurement and
suppliers
Component
purchases are ad hoc
and late, which stops
assembly.
Supplier master,
purchase requests
and orders, goods
receipt, supplier
rating
PO workflow, goods
receipt screen,
supplier API
ERP-3 Production
and quality
Production is planned
by hand, with no link
between bill of
materials, materials
and finished stock.
Bill of materials, work
orders, material
issue, QC checks,
finished-goods
posting
BOM and work order
screens, QC log,
production API
ERP-4 Orders and
dispatch
Confirmed sales
orders are processed
manually, and
dispatch and returns
are not tracked.
Sales orders, stock
reservation, picking
and dispatch, courier
tracking, returns
handling
Order lifecycle
screens, dispatch
note, order API
ERP-5 Finance,
access and
reporting
Invoices, payments
and user access are
handled outside the
system, so books and
reports lag.
GST invoicing,
payments and
receivables, basic
general ledger, users
and roles, finance
reports
Invoice and payment
screens, login and
role service, finance
reports
ERP-6 HR and
workforce
Employee records,
attendance, leave and
salaries sit in
spreadsheets, so
payroll is late and
sales incentives are
calculated by hand.
Employee master and
departments,
attendance and
leave, payroll with
salary slips, sales
commission and
performance reports
Employee and leave
screens, salary slip
generator,
commission report,
employee API
Electronics Company End-to-End App – Project Management Workﬂow
Team work split (4 members per team)
Every team has 4 members, and each member gets the same load: one module built end to
end (database tables, API, screen, test cases) plus one team-wide role.
Module owned by each member (same size for all four; A to D is the order members are
listed in the team)
Team Member A Member B Member C Member D
CRM-1 Sales
pipeline
Lead capture
and scoring
Opportunity
pipeline
Quotation
builder and
discounts
Dealer accounts
and quote
approval
CRM-2 Support
and warranty
Ticketing and
SLA timers
Warranty
lookup by serial
number
RMA (return)
requests
Service centre
assignment and
ticket reports
CRM-3
Customer 360
Customer and
contact master
Interaction
timeline
Segments Duplicate merge
and data import
CRM-4
Marketing and
engagement
Campaign
builder
Audience lists Email and
WhatsApp
templates
Feedback and
NPS surveys
CRM-5 Portal
and analytics
Customer
portal
Sales
dashboards
Sales forecast Role-based
reports
ERP-1 Inventory
and warehouse
Product (SKU)
master
Multi-
warehouse
stock and
transfers
Serial and
batch tracking
Reorder levels
and low-stock
alerts
ERP-2
Procurement
and suppliers
Supplier master
and rating
Purchase
requests
Purchase
orders
Goods receipt
ERP-3
Production and
quality
Bill of materials Work orders Material issue
and finished-
goods posting
QC checks
ERP-4 Orders
and dispatch
Sales orders Stock
reservation
Picking,
dispatch and
courier
tracking
Returns handling
Electronics Company End-to-End App – Project Management Workﬂow
Team role held by each member (one each; roles shift one step at the start of week 5 so
everyone does every kind of work)
Fairness rules the PM team enforces
Each member gets the same number of task cards per sprint, of similar size; the
Delivery Manager checks this on the board every Monday.
Individual work is visible: every member commits to the team's Git repository under
their own name.
At gate reviews and the final demo, each member presents their own module for about
a minute.
A member who is blocked or falling behind tells the Team Lead, who raises it at the
leads sync; the PM team helps rebalance the cards.
Team Member A Member B Member C Member D
ERP-5 Finance,
access and
reporting
GST invoicing Payments and
receivables
Users, roles
and login
General ledger
and finance
reports
ERP-6 HR and
workforce
Employee
master and
departments
Attendance
and leave
Payroll and
salary slips
Sales
commission and
performance
reports
Role What it covers Weeks 1 to
4
Weeks 5 to
8
Team Lead Daily stand-up, weekly status report,
contact with the PM team, dependency
tracker
Member A Member D
Data owner ER diagram in 3NF, database schema, API
spec, shared contracts
Member B Member A
UI owner Wireframes, consistent look across the
team's screens
Member C Member B
QA and docs
owner
Test cases, bug log, README, demo script Member D Member C
Electronics Company End-to-End App – Project Management Workﬂow
Integration points
Accepted quotes and the customer master flow into ERP; dispatch and invoice data flow
back into CRM. A stock shortage raises an ERP-3 work order, which raises an ERP-2
purchase order if parts are short.
The Integration Manager signs off every contract below at gate 1 (end of week 2). Teams
then publish mock APIs in week 3 and the real ones by the week shown.
CRM-ERP order flow · 4 hand-offs, 1 decision
Contract Producer Consumer Minimum payload Working
API by
User login and
role
ERP-5 All teams User ID, role, token Week 3
Product and
price list
ERP-1 CRM-1, CRM-
5
SKU, name, price, tax
rate, stock level
Week 3
Customer
master
CRM-3 ERP-4, ERP-5 Customer ID, name,
GSTIN, billing and
shipping address
Week 3
Stock check and
reservation
ERP-1 ERP-4 SKU, quantity,
warehouse
Week 4
Electronics Company End-to-End App – Project Management Workﬂow
Shared rules: JSON over REST; ISO dates (YYYY-MM-DD); amounts in INR to 2 decimals;
one ID format per entity (CUST-, SKU-, SO-, INV-, TKT-) agreed in week 0; no team reads
another team's tables directly.
Phase-by-phase workflow
The project runs in six phases with a go or no-go gate (G1 to G4) at the end of each build
step; no team starts the next phase until the Program Lead has passed the gate.
Contract Producer Consumer Minimum payload Working
API by
Quote accepted CRM-1 ERP-4 Quote ID, customer ID,
sales rep ID, items,
quantities, agreed
prices
Week 5
Shortage
requests
ERP-1, ERP-3 ERP-3, ERP-2 SKU, short quantity,
needed-by date
Week 5
Dispatch and
serial numbers
ERP-4 (serials
from ERP-1)
CRM-2, CRM-
5
Order ID, SKU, serial
numbers, ship date
Week 5
Invoice and
payment status
ERP-5 CRM-5, CRM-
3
Invoice ID, amount, due
date, paid or due
Week 6
Return (RMA)
approved
CRM-2 ERP-1, ERP-5 RMA ID, serial number,
outcome: restock, repair
or credit note
Week 6
Employee
master
ERP-6 CRM-1, CRM-
2, ERP-5
Employee ID, name, role,
department, manager
Week 3
Paid invoices for
commission
ERP-5 ERP-6 Invoice ID, sales rep ID
(from the quote),
amount, paid date
Week 6
Electronics Company End-to-End App – Project Management Workﬂow
8-week plan · 6 phases, 4 gates, final demo
Phase Dates Every team delivers PM team delivers Gate to pass
Week 0: PM
setup
Sat 31
Oct to
Sun 1
Nov
Nothing yet; leads
receive the briefing
Final stack, repos,
ID formats, task
board, problem
statements,
kickoff deck
Kickoff ready
Weeks 1 to 2:
Design
Mon 2
to Fri 13
Nov
User stories, ER
diagram in 3NF, API
spec, wireframes
Contract review,
dependency
tracker and risk
register v1
G1 (13 Nov):
design freeze;
master data and
all contracts
signed off
Weeks 3 to 4:
Build 1
Mon 16
to Fri 27
Nov
Database created,
core screens and
APIs, mock APIs for
other teams, login
wired in
Weekly integration
review, sprint 1
demo
G2 (27 Nov):
every team
demos its core
flow on its own
database
Weeks 5 to 6:
Build 2
Mon 30
Nov to
Fri 11
Dec
Remaining features,
real calls to other
teams' APIs replace
the mocks, unit
tests
Sprint 2 demo, bug
triage starts
G3 (11 Dec): all
contracts live; an
order runs from
quote to invoice in
the test
environment
Electronics Company End-to-End App – Project Management Workﬂow
Tracking and control
The PM team runs the project from one task board with eleven team lanes, one
dependency tracker, one risk register and a weekly status report; if it is not on those four,
it is not being managed.
RACI (R = does it, A = answers for it, C = consulted, I = informed)
Dependency tracker (one row per cross-team need; review every Monday)
Risk register (starter; review at every leads sync)
Phase Dates Every team delivers PM team delivers Gate to pass
Week 7:
Integration
test
Mon 14
to Fri 18
Dec
Feature freeze on
Mon 14 Dec, bug
fixes, end-to-end
test cases run
Test scenarios,
daily bug triage,
release candidate
G4 (18 Dec): no
open critical bugs;
release candidate
tagged
Week 8:
Demo and
handover
Mon 21
to Thu
24 Dec
Final
documentation,
demo rehearsal
Demo deck,
evaluation,
retrospective
Final demo (Wed
23 Dec)
Activity Team lead Program Lead Delivery Mgr Integration Mgr Quality Mgr
Scope and problem statements C A C C I
Sprint plan R I A C C
API contracts and master data R I I A C
Test plans and bug triage R I I C A
Weekly status report R I A C C
Release candidate and demo R A C C R
ID From team To team What is needed Needed by Status
D1 ERP-1 CRM-1 Product (SKU) list and prices API End of week 3 Not started
D2 CRM-3 ERP-4 Customer master API End of week 3 Not started
D3 ERP-1 CRM-2 Serial number and warranty start date End of week 5 Not started
D4 ERP-6 CRM-1 Employee master API (sales rep IDs) End of week 3 Not started
Electronics Company End-to-End App – Project Management Workﬂow
Change control (any change to scope, a shared table or an API):
1. The requesting team lead posts a one-paragraph change request: what, why, who is
affected.
2. The Integration Manager lists affected teams within 24 hours.
3. The Program Lead approves, defers or rejects at the next leads sync.
4. The Documentation Manager updates the contract and logs the decision.
Weekly status report (each team lead sends by Friday noon; the Delivery Manager
merges into one page)
Team: CRM-1 Sales pipeline    Status: Green / Amber / Red
Done this week:
Planned next week:
Blockers (and who can unblock):
Dependencies on other teams:
New risks:
Risk Likelihood Impact Mitigation Owner
Teams use different
fields for customer
and product data
High High Freeze shared master data
spec at gate 1
Integration
Mgr
One team falls behind
and blocks a linked
team
Medium High Mock APIs from week 3 so
nobody waits
Delivery
Mgr
Scope creep from
extra features
High Medium Change control and
must/should/could
priorities
Program
Lead
Integration left to the
last week
Medium High Weekly integration review,
integrations live by gate 3
Integration
Mgr
Uneven contribution
or capacity in a team
Medium Medium Roles per pod, visible task
board, daily stand-up
Delivery
Mgr
Broken merges and
environments
Medium Medium Branch rules, shared dev
environment, basic CI
check
Quality Mgr
Electronics Company End-to-End App – Project Management Workﬂow
Final integration, demo and evaluation
The final demo is one scripted story that crosses all eleven teams, and it is run end to end
in the test environment, not team by team.
Demo script: from dealer enquiry to warranty return
1. CRM-4 sends a launch campaign; a dealer enquiry arrives as a lead in CRM-1.
2. CRM-1 qualifies the lead, builds a quote from the ERP-1 price list, and the customer
accepts.
3. CRM-3 shows the customer record; ERP-4 creates the sales order from the accepted
quote.
4. ERP-1 finds stock short; ERP-3 raises a work order and ERP-2 a purchase order for the
missing parts.
5. Goods are received and produced, stock is updated, and ERP-4 dispatches the order
with serial numbers.
6. ERP-5 issues the GST invoice and records the payment; ERP-6 then calculates the
sales rep's commission from the paid invoice.
7. CRM-5 shows the order and payment status in the portal and on the sales dashboard.
8. The customer raises a warranty ticket in CRM-2 using the serial number; an RMA is
approved.
9. ERP-1 and ERP-5 process the return as restock, repair or credit note.
Evaluation rubric (suggested weights; replace with your instructor's or client's criteria)
PM team checklist for week 0 and week 1
Criterion Weight
Working features against the problem statement 30%
CRM-ERP integration works end to end 25%
Database and API design quality 15%
Testing and bug count at demo 10%
UI and usability 10%
Documentation and presentation 10%
Confirm the real deadline, team sizes and evaluation criteria, then shift the dates
above
Name one lead for each of the 11 teams and share the contact list
Electronics Company End-to-End App – Project Management Workﬂow
Open questions for you: What is the real deadline? Is the company given by your
instructor or invented by you? How many people are in each team and in the PM team? Is
the tech stack mandated? Answer these and I can adjust the dates, roles and problem
statements.
Decide the stack, repo structure and ID formats; publish them on the wiki
Give each team its problem statement, deliverables and the contract table
Set up the task board with 11 lanes, the dependency tracker and the risk register
Book the recurring meetings from the cadence table
Send the weekly status template and the change request rules
Agree the demo script and rubric with all leads at the end of week 1
Electronics Company End-to-End App – Project Management Workﬂow
