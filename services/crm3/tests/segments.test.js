const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

// Set environment for testing
process.env.AUTH_REQUIRED = 'false';
process.env.USE_MOCKS = 'true';

const segmentsRouter = require('../routes/segments');

// Setup express app with middleware
const app = express();
app.use(express.json());
app.use('/api', segmentsRouter);

// Helper for in-memory HTTP requests without TCP sockets
function request(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const { EventEmitter } = require('events');
    const req = Object.assign(new EventEmitter(), {
      method: method.toUpperCase(),
      url,
      originalUrl: url,
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body
    });

    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: statusCode, body: data });
      },
      send(data) {
        resolve({ status: statusCode, body: data });
      },
      setHeader() { return this; },
      getHeader() { return null; }
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, body: { error: 'Not Found' } });
    });
  });
}

test('GET /api/segments returns seed segments list', async () => {
  const res = await request('GET', '/api/segments');
  assert.strictEqual(res.status, 200);

  const data = res.body;
  assert(Array.isArray(data), 'Response should be an array of segments');
  assert(data.length >= 4, 'Should contain at least 4 seed segments');

  const seg1 = data.find(s => s.id === 'SEG-0001');
  assert(seg1, 'Should contain SEG-0001');
  assert.strictEqual(seg1.name, 'Corporate in Mumbai');
  assert.strictEqual(seg1.customer_type, 'corporate');
  assert.strictEqual(seg1.city, 'Mumbai');
});

test('GET /api/segments/SEG-0001 returns segment details', async () => {
  const res = await request('GET', '/api/segments/SEG-0001');
  assert.strictEqual(res.status, 200);

  const data = res.body;
  assert.strictEqual(data.id, 'SEG-0001');
  assert.strictEqual(data.name, 'Corporate in Mumbai');
  assert.strictEqual(data.customer_type, 'corporate');
  assert.strictEqual(data.city, 'Mumbai');
});

test('GET /api/segments/SEG-0001/customers matches CUST-0002 only with count 1', async () => {
  const res = await request('GET', '/api/segments/SEG-0001/customers');
  assert.strictEqual(res.status, 200);

  const data = res.body;
  assert(data.segment, 'Response must include segment details');
  assert(Array.isArray(data.customers), 'Response must include matching customers array');
  assert.strictEqual(data.count, 1, 'Matching customer count must be exactly 1');
  assert.strictEqual(data.customers.length, 1);
  assert.strictEqual(data.customers[0].id, 'CUST-0002');
  assert.strictEqual(data.customers[0].name, 'Sunrise Electronics Pvt Ltd');
  assert.strictEqual(data.customers[0].type, 'corporate');
  assert.strictEqual(data.customers[0].city, 'Mumbai');
});

test('GET /api/segments/SEG-0002/customers matches retail customers with correct count', async () => {
  const res = await request('GET', '/api/segments/SEG-0002/customers');
  assert.strictEqual(res.status, 200);

  const data = res.body;
  assert(data.count >= 4, 'Should match all retail customers');
  for (const cust of data.customers) {
    assert.strictEqual(cust.type, 'retail');
  }
});

test('POST /api/segments creates a new segment and returns 201', async () => {
  const newSegmentPayload = {
    name: 'Delhi Corporates',
    customer_type: 'corporate',
    city: 'Delhi'
  };

  const res = await request('POST', '/api/segments', newSegmentPayload);
  assert.strictEqual(res.status, 201);
  const created = res.body;
  assert(created.id, 'Created segment must have an id');
  assert.strictEqual(created.name, 'Delhi Corporates');
  assert.strictEqual(created.customer_type, 'corporate');
  assert.strictEqual(created.city, 'Delhi');

  // Verify created segment can be queried and returns matching customer CUST-0006
  const matchRes = await request('GET', `/api/segments/${created.id}/customers`);
  assert.strictEqual(matchRes.status, 200);
  const matchData = matchRes.body;
  assert.strictEqual(matchData.count, 1);
  assert.strictEqual(matchData.customers[0].id, 'CUST-0006');
  assert.strictEqual(matchData.customers[0].name, 'Metro Offices Ltd');
});

test('POST /api/segments rejects empty name with 400', async () => {
  const res = await request('POST', '/api/segments', { name: '   ', customer_type: 'retail' });
  assert.strictEqual(res.status, 400);
  const data = res.body;
  assert(data.error, 'Error message must be returned');
});

test('GET /api/segments/SEG-9999 returns 404', async () => {
  const res = await request('GET', '/api/segments/SEG-9999');
  assert.strictEqual(res.status, 404);
});
