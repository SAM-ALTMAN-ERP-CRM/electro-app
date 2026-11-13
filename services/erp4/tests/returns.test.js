const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create test token for authentication
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const testToken = jwt.sign(
  { id: 'EMP-0001', role: 'admin', email: 'kaushal@electro.test' },
  TEST_JWT_SECRET
);

// Setup test express application
const app = express();
app.use(express.json());

// Mount ERP-4 returns router
const returnsRouter = require('../routes/returns');
app.use('/api', returnsRouter);

// Helper for HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testToken}`,
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
          }
        },
        (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            server.close();
            try {
              const parsed = JSON.parse(data);
              resolve({ status: res.statusCode, data: parsed });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });
}

test('ERP4-D1 Returns API Test Suite', async (t) => {
  await t.test('1. Seed verification: GET /api/returns returns at least 4 seed returns', async () => {
    const res = await makeRequest('GET', '/api/returns');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.data), 'Expected data to be an array');
    assert.ok(res.data.data.length >= 4, `Expected at least 4 seed returns, got ${res.data.data.length}`);

    // Verify serial numbers TV55-2611-0001 to 0004
    const serials = res.data.data.map(r => r.serial_number);
    assert.ok(serials.includes('TV55-2611-0001'), 'Seed must include TV55-2611-0001');
    assert.ok(serials.includes('TV55-2611-0002'), 'Seed must include TV55-2611-0002');
  });

  await t.test('2. Acceptance Criterion: POST /api/returns refuses serial not in the order with HTTP 400', async () => {
    // SO-0001 was dispatched with TV55-2611-0001, not TV55-2611-9999
    const res = await makeRequest('POST', '/api/returns', {
      so_id: 'SO-0001',
      serial_number: 'TV55-2611-9999',
      reason: 'Wrong serial number test',
      outcome: 'credit_note'
    });
    assert.equal(res.status, 400);
    assert.ok(res.data.error, 'Expected error message in response');
    assert.match(res.data.error, /was not dispatched for order/i);
  });

  await t.test('3. Acceptance Criterion: POST /api/returns succeeds for valid dispatched serial', async () => {
    // SO-0005 has serial TV55-2611-0005
    const res = await makeRequest('POST', '/api/returns', {
      so_id: 'SO-0005',
      serial_number: 'TV55-2611-0005',
      reason: 'Customer reported sound distortion',
      outcome: 'replacement'
    });
    assert.equal(res.status, 201);
    assert.ok(res.data.data.id.startsWith('RET-'), 'Expected RET- ID prefix');
    assert.equal(res.data.data.status, 'requested');
    assert.equal(res.data.data.serial_number, 'TV55-2611-0005');
  });

  await t.test('4. Acceptance Criterion: POST /api/returns/from-rma rejects serial that was never dispatched', async () => {
    const res = await makeRequest('POST', '/api/returns/from-rma', {
      rma_id: 'RMA-9999',
      serial_number: 'TV55-UNKNOWN-SERIAL',
      reason: 'Defective screen',
      outcome: 'replacement'
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /was never dispatched/i);
  });

  await t.test('5. Acceptance Criterion: POST /api/returns/from-rma creates return and is safe to call twice (idempotent)', async () => {
    const testRma = `RMA-TEST-${Date.now()}`;
    // First call: creates return
    const res1 = await makeRequest('POST', '/api/returns/from-rma', {
      rma_id: testRma,
      serial_number: 'TV55-2611-0003',
      reason: 'Flickering display',
      outcome: 'replacement'
    });
    assert.equal(res1.status, 201);
    const createdId = res1.data.data.id;
    assert.ok(createdId);

    // Second call: repeated rma_id returns the existing return with 200
    const res2 = await makeRequest('POST', '/api/returns/from-rma', {
      rma_id: testRma,
      serial_number: 'TV55-2611-0003',
      reason: 'Flickering display',
      outcome: 'replacement'
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.data.data.id, createdId);
    assert.equal(res2.data.data.rma_id, testRma);
  });

  await t.test('6. GET /api/returns/:id retrieves return record with details', async () => {
    const res = await makeRequest('GET', '/api/returns/RET-0001');
    assert.equal(res.status, 200);
    assert.equal(res.data.data.id, 'RET-0001');
    assert.equal(res.data.data.serial_number, 'TV55-2611-0001');
  });

  await t.test('7. PATCH /api/returns/:id/status updates status to received, restocked, or scrapped', async () => {
    const res = await makeRequest('PATCH', '/api/returns/RET-0001/status', {
      status: 'received'
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.data.status, 'received');
  });

  await t.test('8. PATCH /api/returns/:id/status rejects invalid status', async () => {
    const res = await makeRequest('PATCH', '/api/returns/RET-0001/status', {
      status: 'invalid_status'
    });
    assert.equal(res.status, 400);
    assert.match(res.data.error, /invalid status/i);
  });
});
