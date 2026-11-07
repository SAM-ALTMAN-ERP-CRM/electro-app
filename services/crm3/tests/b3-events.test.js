const assert = require('assert');
const http = require('http');
const express = require('express');
const interactionsRouter = require('../routes/interactions');

const app = express();
app.use(express.json());
app.use('/api', interactionsRouter);

let server;
let baseUrl;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   CRM3-B3 TEST SUITE: EVENTS FROM OTHER TEAMS & TIMELINE     ');
  console.log('===============================================================\n');

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[SETUP] Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: POST /api/interactions/from-event (First Event from CRM-1)
    // -------------------------------------------------------------------------
    console.log('[TEST 1] POST /api/interactions/from-event: Incoming event from CRM-1...');
    const testRunId = Date.now().toString().slice(-6);
    const eventPayload1 = {
      customer_id: 'CUST-0001',
      type: 'order',
      summary: `Quote QUO-${testRunId} accepted by client`,
      source_team: 'CRM-1'
    };

    const res1 = await request('POST', '/api/interactions/from-event', eventPayload1);
    assert.strictEqual(res1.status, 201, `Expected 201, got ${res1.status}`);
    assert.ok(res1.body.data, 'Expected response to contain data');
    assert.ok(res1.body.data.id, 'Expected event to have an ID');
    assert.strictEqual(res1.body.data.customer_id, 'CUST-0001');
    assert.strictEqual(res1.body.data.type, 'order');
    assert.strictEqual(res1.body.data.summary, eventPayload1.summary);
    assert.strictEqual(res1.body.data.source_team, 'CRM-1');
    const firstEventId = res1.body.data.id;
    console.log(`  ✓ Event created with ID: ${firstEventId}`);

    // -------------------------------------------------------------------------
    // TEST 2: Exact duplicate sent within the same minute MUST BE IGNORED
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Duplicate suppression: Exact duplicate sent within same minute...');
    const duplicateRes = await request('POST', '/api/interactions/from-event', eventPayload1);
    assert.strictEqual(duplicateRes.status, 201, `Expected 201 on duplicate, got ${duplicateRes.status}`);
    assert.ok(duplicateRes.body.data, 'Expected response to contain data');
    assert.strictEqual(
      duplicateRes.body.data.id,
      firstEventId,
      `Expected duplicate response to return existing ID ${firstEventId}, got ${duplicateRes.body.data.id}`
    );
    assert.strictEqual(duplicateRes.body.duplicate, true, 'Expected duplicate flag to be true');
    console.log(`  ✓ Duplicate safely ignored! Returned existing ID ${firstEventId} with HTTP 201`);

    // Verify interaction count for this customer didn't duplicate
    const verifyList = await request('GET', '/api/customers/CUST-0001/interactions');
    assert.strictEqual(verifyList.status, 200);
    const matchingEvents = verifyList.body.data.filter(
      item => item.summary === eventPayload1.summary && item.source_team === 'CRM-1'
    );
    assert.strictEqual(matchingEvents.length, 1, `Expected exactly 1 event, found ${matchingEvents.length}`);
    console.log('  ✓ Verified exactly 1 entry exists in database (no duplicate row created)');

    // -------------------------------------------------------------------------
    // TEST 3: Events from other teams (CRM-2, CRM-4, ERP-4)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Events from CRM-2, CRM-4, and ERP-4...');
    // CRM-2 ticket event
    const ticketPayload = {
      customer_id: 'CUST-0001',
      type: 'ticket',
      summary: 'Ticket TKT-0042: Screen display issue reported',
      source_team: 'CRM-2'
    };
    const ticketRes = await request('POST', '/api/interactions/from-event', ticketPayload);
    assert.strictEqual(ticketRes.status, 201);
    assert.strictEqual(ticketRes.body.data.type, 'ticket');
    assert.strictEqual(ticketRes.body.data.source_team, 'CRM-2');
    console.log(`  ✓ CRM-2 Ticket event created: ${ticketRes.body.data.id}`);

    // CRM-4 email campaign event
    const emailPayload = {
      customer_id: 'CUST-0001',
      type: 'email',
      summary: 'Campaign CMP-0001 sent: Festival Discount Offer',
      source_team: 'CRM-4'
    };
    const emailRes = await request('POST', '/api/interactions/from-event', emailPayload);
    assert.strictEqual(emailRes.status, 201);
    assert.strictEqual(emailRes.body.data.type, 'email');
    assert.strictEqual(emailRes.body.data.source_team, 'CRM-4');
    console.log(`  ✓ CRM-4 Email event created: ${emailRes.body.data.id}`);

    // ERP-4 dispatch order event
    const dispatchPayload = {
      customer_id: 'CUST-0001',
      type: 'order',
      summary: 'Order SO-0001 dispatched with Bluedart',
      source_team: 'ERP-4'
    };
    const dispatchRes = await request('POST', '/api/interactions/from-event', dispatchPayload);
    assert.strictEqual(dispatchRes.status, 201);
    assert.strictEqual(dispatchRes.body.data.type, 'order');
    assert.strictEqual(dispatchRes.body.data.source_team, 'ERP-4');
    console.log(`  ✓ ERP-4 Dispatch event created: ${dispatchRes.body.data.id}`);

    // -------------------------------------------------------------------------
    // TEST 4: Timeline displays events ordered newest first
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Timeline ordering: Newest events appear first...');
    const timelineRes = await request('GET', '/api/customers/CUST-0001/interactions');
    assert.strictEqual(timelineRes.status, 200);
    const list = timelineRes.body.data;
    assert.ok(list.length >= 4, `Expected at least 4 events, got ${list.length}`);

    // Verify ordering
    for (let i = 0; i < list.length - 1; i++) {
      const t1 = new Date(list[i].created_at).getTime();
      const t2 = new Date(list[i + 1].created_at).getTime();
      assert.ok(t1 >= t2, `Expected newest first: ${list[i].created_at} >= ${list[i + 1].created_at}`);
    }
    console.log('  ✓ All customer timeline interactions confirmed sorted newest first');

    // -------------------------------------------------------------------------
    // TEST 5: Type Filter (?type=ticket)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Timeline Type Filter: ?type=ticket...');
    const typeFiltered = await request('GET', '/api/customers/CUST-0001/interactions?type=ticket');
    assert.strictEqual(typeFiltered.status, 200);
    assert.ok(typeFiltered.body.data.length > 0, 'Expected at least 1 ticket');
    typeFiltered.body.data.forEach(item => {
      assert.strictEqual(item.type.toLowerCase(), 'ticket');
    });
    console.log(`  ✓ Type filter works: retrieved ${typeFiltered.body.data.length} ticket events`);

    // -------------------------------------------------------------------------
    // TEST 6: Date Range Filter (?from= & ?to=)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Timeline Date Range Filter: ?from= & ?to=...');
    const today = new Date().toISOString().slice(0, 10);
    const dateFiltered = await request('GET', `/api/customers/CUST-0001/interactions?from=${today}&to=${today}`);
    assert.strictEqual(dateFiltered.status, 200);
    assert.ok(dateFiltered.body.data.length >= 3, 'Expected today events in range');
    console.log(`  ✓ Date range filter works: retrieved ${dateFiltered.body.data.length} events for ${today}`);

    // -------------------------------------------------------------------------
    // TEST 7: Input Validation on POST /api/interactions/from-event
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Input validation on POST /api/interactions/from-event...');
    // Missing customer_id
    const errCust = await request('POST', '/api/interactions/from-event', { type: 'order', summary: 'test', source_team: 'CRM-1' });
    assert.strictEqual(errCust.status, 400);
    assert.ok(errCust.body.error.includes('customer_id'));

    // Missing type
    const errType = await request('POST', '/api/interactions/from-event', { customer_id: 'CUST-0001', summary: 'test', source_team: 'CRM-1' });
    assert.strictEqual(errType.status, 400);
    assert.ok(errType.body.error.includes('type'));

    // Invalid type
    const errInvalidType = await request('POST', '/api/interactions/from-event', { customer_id: 'CUST-0001', type: 'unknown_type', summary: 'test', source_team: 'CRM-1' });
    assert.strictEqual(errInvalidType.status, 400);

    // Missing summary
    const errSummary = await request('POST', '/api/interactions/from-event', { customer_id: 'CUST-0001', type: 'order', source_team: 'CRM-1' });
    assert.strictEqual(errSummary.status, 400);
    assert.ok(errSummary.body.error.includes('summary'));

    // Missing source_team
    const errTeam = await request('POST', '/api/interactions/from-event', { customer_id: 'CUST-0001', type: 'order', summary: 'test' });
    assert.strictEqual(errTeam.status, 400);
    assert.ok(errTeam.body.error.includes('source_team'));

    console.log('  ✓ All validation rules (missing customer_id, type, summary, source_team, invalid type) verified');

    // -------------------------------------------------------------------------
    // TEST 8: Manual Note Creation (POST /api/interactions)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Manual interaction creation: POST /api/interactions...');
    const manualNoteRes = await request('POST', '/api/interactions', {
      customer_id: 'CUST-0001',
      type: 'note',
      summary: 'Manual internal account review note by Sales Rep',
      source_team: 'CRM-3',
      created_by: 'EMP-0001'
    });
    assert.strictEqual(manualNoteRes.status, 201);
    assert.strictEqual(manualNoteRes.body.data.type, 'note');
    console.log(`  ✓ Manual note created: ${manualNoteRes.body.data.id}`);

    console.log('\n===============================================================');
    console.log('       ALL CRM3-B3 ACCEPTANCE CRITERIA PASSED GREEN!          ');
    console.log('===============================================================\n');
    process.exit(0);
  } finally {
    if (server) server.close();
  }
}

runTests().catch(err => {
  console.error('\nTEST SUITE FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
