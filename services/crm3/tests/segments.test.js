const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Ensure token auth passes in test mode
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const segmentsRouter = require('../routes/segments');

// Setup mock express app with segments router
const app = express();
app.use(express.json());
// Inject test user authentication token headers
app.use((req, res, next) => {
  req.user = { id: 'USR-0001', role: 'admin' };
  next();
});
app.use('/api', segmentsRouter);

test('CRM3-C1 Segments API Test Suite', async (t) => {
  await t.test('1. GET /api/segments returns seed segments list', async () => {
    const res = await fetchMock(app, 'GET', '/api/segments');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 4);

    const corporateMumbai = res.body.data.find(s => s.id === 'SEG-0001');
    assert.ok(corporateMumbai);
    assert.equal(corporateMumbai.name, 'Corporate in Mumbai');
    assert.equal(corporateMumbai.customer_type, 'corporate');
    assert.equal(corporateMumbai.city, 'Mumbai');
  });

  await t.test('2. Acceptance Criteria: GET /api/segments/SEG-0001/customers matches CUST-0002 only', async () => {
    const res = await fetchMock(app, 'GET', '/api/segments/SEG-0001/customers');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.count, 1);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, 'CUST-0002');
    assert.equal(res.body.data[0].type.toLowerCase(), 'corporate');
    assert.equal(res.body.data[0].city.toLowerCase(), 'mumbai');
  });

  await t.test('3. POST /api/segments creates a new segment and returns 201', async () => {
    const newSeg = {
      name: 'Dealers in Pune Test',
      customer_type: 'dealer',
      city: 'Pune'
    };
    const res = await fetchMock(app, 'POST', '/api/segments', newSeg);
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.ok(res.body.data.id.startsWith('SEG-'));
    assert.equal(res.body.data.name, 'Dealers in Pune Test');
    assert.equal(res.body.data.customer_type, 'dealer');
    assert.equal(res.body.data.city, 'Pune');
  });

  await t.test('4. POST /api/segments rejects missing name with 400', async () => {
    const res = await fetchMock(app, 'POST', '/api/segments', { customer_type: 'retail' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('5. POST /api/segments rejects invalid customer_type with 400', async () => {
    const res = await fetchMock(app, 'POST', '/api/segments', { name: 'Invalid Type', customer_type: 'vip' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('6. GET /api/segments/:id returns 404 for unknown segment', async () => {
    const res = await fetchMock(app, 'GET', '/api/segments/SEG-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});

/**
 * Lightweight in-memory HTTP dispatcher for Express tests without network binding
 */
function fetchMock(appInstance, method, url, body) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json' };
    req.body = body || {};

    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
      json(data) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data) {
        resolve({ status: this.statusCode, body: data });
      }
    };

    appInstance(req, res, (err) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  });
}
