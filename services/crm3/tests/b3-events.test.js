const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const interactionsRouter = require('../routes/interactions');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', interactionsRouter);
  return app;
}

/**
 * Dispatches a request directly through Express without opening network sockets.
 */
function dispatchRequest(app, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url,
      headers: { 'content-type': 'application/json' },
      body
    };

    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      getHeader(k) {
        return this.headers[k.toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode, body: payload });
        return this;
      },
      send(payload) {
        resolve({ status: this.statusCode, body: payload });
        return this;
      },
      end(payload) {
        resolve({ status: this.statusCode, body: payload });
        return this;
      }
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, body: { error: 'Not Found' } });
    });
  });
}

test('CRM3-B3 Cross-Team Events API Test Suite', async (t) => {
  const app = buildTestApp();

  await t.test('1. Accepts cross-team events and adds them to the customer timeline newest first', async () => {
    const orderEvent = await dispatchRequest(app, 'POST', '/api/interactions/from-event', {
      customer_id: 'CUST-0001',
      type: 'order',
      summary: 'Quote QUO-0001 accepted and converted to SO-0001',
      source_team: 'CRM-1'
    });
    assert.strictEqual(orderEvent.status, 201);
    assert.match(orderEvent.body.data.id, /^INT-\d{4,}$/);
    assert.strictEqual(orderEvent.body.data.source_team, 'CRM-1');

    const ticketEvent = await dispatchRequest(app, 'POST', '/api/interactions/from-event', {
      customer_id: 'CUST-0001',
      type: 'ticket',
      summary: 'Ticket TKT-0002 opened for Smart TV HDMI port',
      source_team: 'CRM-2'
    });
    assert.strictEqual(ticketEvent.status, 201);

    const timelineRes = await dispatchRequest(app, 'GET', '/api/customers/CUST-0001/interactions');
    assert.strictEqual(timelineRes.status, 200);
    const ids = timelineRes.body.data.map((row) => row.id);
    assert.ok(ids.includes(orderEvent.body.data.id));
    assert.ok(ids.includes(ticketEvent.body.data.id));
    assert.strictEqual(timelineRes.body.data[0].id, ticketEvent.body.data.id);
  });

  await t.test('2. Ignores exact duplicate cross-team events sent within the same minute', async () => {
    const payload = {
      customer_id: 'CUST-0003',
      type: 'email',
      summary: 'Campaign CMP-0002 Festive Sale sent to customer',
      source_team: 'CRM-4'
    };

    const firstRes = await dispatchRequest(app, 'POST', '/api/interactions/from-event', payload);
    assert.strictEqual(firstRes.status, 201);
    assert.ok(!firstRes.body.duplicate);

    const beforeRes = await dispatchRequest(app, 'GET', '/api/customers/CUST-0003/interactions');
    const countBefore = beforeRes.body.data.length;

    const dupRes = await dispatchRequest(app, 'POST', '/api/interactions/from-event', payload);
    assert.strictEqual(dupRes.status, 201);
    assert.strictEqual(dupRes.body.duplicate, true);
    assert.strictEqual(dupRes.body.data.id, firstRes.body.data.id);

    const afterRes = await dispatchRequest(app, 'GET', '/api/customers/CUST-0003/interactions');
    assert.strictEqual(afterRes.body.data.length, countBefore);
  });

  await t.test('3. Allows distinct events for the same customer within the same minute', async () => {
    const diffTeamRes = await dispatchRequest(app, 'POST', '/api/interactions/from-event', {
      customer_id: 'CUST-0003',
      type: 'email',
      summary: 'Campaign CMP-0002 Festive Sale sent to customer',
      source_team: 'CRM-3'
    });
    assert.strictEqual(diffTeamRes.status, 201);
    assert.ok(!diffTeamRes.body.duplicate);
  });

  await t.test('4. Rejects invalid or missing cross-team event fields with 400', async () => {
    const missingSource = await dispatchRequest(app, 'POST', '/api/interactions/from-event', {
      customer_id: 'CUST-0001',
      type: 'order',
      summary: 'Missing source team'
    });
    assert.strictEqual(missingSource.status, 400);

    const invalidType = await dispatchRequest(app, 'POST', '/api/interactions/from-event', {
      customer_id: 'CUST-0001',
      type: 'webhook',
      summary: 'Unsupported type',
      source_team: 'ERP-4'
    });
    assert.strictEqual(invalidType.status, 400);
  });

  await t.test('5. Combines ?type= and ?from=&to= date filters for timeline queries', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const filtered = await dispatchRequest(
      app,
      'GET',
      `/api/customers/CUST-0001/interactions?type=ticket&from=${today}&to=${today}`
    );
    assert.strictEqual(filtered.status, 200);
    assert.ok(filtered.body.data.length >= 1);
    assert.ok(filtered.body.data.every((item) => item.type === 'ticket'));
  });
});
