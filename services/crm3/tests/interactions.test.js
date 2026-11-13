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

test('CRM3-B1 Interactions API Test Suite', async (t) => {
  const app = buildTestApp();

  await t.test('1. Lists 10 seed interactions across CUST-0001 to CUST-0003 newest first', async () => {
    const allRes = await dispatchRequest(app, 'GET', '/api/interactions');
    assert.strictEqual(allRes.status, 200);
    assert.ok(Array.isArray(allRes.body.data));
    assert.strictEqual(allRes.body.data.length, 10);

    const custIds = new Set(allRes.body.data.map((row) => row.customer_id));
    assert.deepStrictEqual([...custIds].sort(), ['CUST-0001', 'CUST-0002', 'CUST-0003']);

    const c1Res = await dispatchRequest(app, 'GET', '/api/customers/CUST-0001/interactions');
    assert.strictEqual(c1Res.status, 200);
    assert.strictEqual(c1Res.body.data.length, 4);
    for (let i = 0; i < c1Res.body.data.length - 1; i += 1) {
      assert.ok(
        new Date(c1Res.body.data[i].created_at) >= new Date(c1Res.body.data[i + 1].created_at),
        'Timeline must be sorted newest first'
      );
    }
  });

  await t.test('2. Filters customer interactions by ?type= and ?from=&to=', async () => {
    const typeRes = await dispatchRequest(app, 'GET', '/api/customers/CUST-0001/interactions?type=ticket');
    assert.strictEqual(typeRes.status, 200);
    assert.strictEqual(typeRes.body.data.length, 1);
    assert.strictEqual(typeRes.body.data[0].id, 'INT-0003');

    const dateRes = await dispatchRequest(
      app,
      'GET',
      '/api/customers/CUST-0001/interactions?from=2026-11-04&to=2026-11-05'
    );
    assert.strictEqual(dateRes.status, 200);
    assert.deepStrictEqual(
      dateRes.body.data.map((row) => row.id),
      ['INT-0002', 'INT-0003']
    );

    const badDateRes = await dispatchRequest(
      app,
      'GET',
      '/api/customers/CUST-0001/interactions?from=not-a-date'
    );
    assert.strictEqual(badDateRes.status, 400);
  });

  await t.test('3. POST /api/interactions validates payload and creates new record', async () => {
    const missingCust = await dispatchRequest(app, 'POST', '/api/interactions', {
      type: 'call',
      summary: 'Follow up'
    });
    assert.strictEqual(missingCust.status, 400);

    const badType = await dispatchRequest(app, 'POST', '/api/interactions', {
      customer_id: 'CUST-0001',
      type: 'fax',
      summary: 'Invalid type test'
    });
    assert.strictEqual(badType.status, 400);

    const missingSummary = await dispatchRequest(app, 'POST', '/api/interactions', {
      customer_id: 'CUST-0001',
      type: 'call',
      summary: '   '
    });
    assert.strictEqual(missingSummary.status, 400);

    const createRes = await dispatchRequest(app, 'POST', '/api/interactions', {
      customer_id: 'CUST-0002',
      type: 'call',
      summary: 'Followed up with procurement lead on Q4 order schedule',
      source_team: 'CRM-3',
      created_by: 'EMP-0002'
    });
    assert.strictEqual(createRes.status, 201);
    assert.match(createRes.body.data.id, /^INT-\d{4,}$/);
    assert.strictEqual(createRes.body.data.customer_id, 'CUST-0002');
    assert.strictEqual(createRes.body.data.type, 'call');

    const updatedRes = await dispatchRequest(app, 'GET', '/api/customers/CUST-0002/interactions');
    assert.strictEqual(updatedRes.status, 200);
    assert.strictEqual(updatedRes.body.data[0].id, createRes.body.data.id);

    const byIdRes = await dispatchRequest(app, 'GET', `/api/interactions/${createRes.body.data.id}`);
    assert.strictEqual(byIdRes.status, 200);
    assert.strictEqual(byIdRes.body.data.summary, 'Followed up with procurement lead on Q4 order schedule');
  });
});
