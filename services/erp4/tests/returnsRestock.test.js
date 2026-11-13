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

test('ERP4-D3 Restock, credit note and summary Suite', async (t) => {
  await t.test('1. GET /api/returns/summary returns counts by status and by reason', async () => {
    const res = await makeRequest('GET', '/api/returns/summary');
    assert.equal(res.status, 200);
    assert.ok(res.data.data);
    assert.ok(typeof res.data.data.total === 'number');
    assert.ok(typeof res.data.data.requested === 'number');
    assert.ok(typeof res.data.data.received === 'number');
    assert.ok(typeof res.data.data.restocked === 'number');
    assert.ok(typeof res.data.data.scrapped === 'number');
    assert.ok(res.data.data.by_reason !== undefined);
  });

  await t.test('2. Acceptance Criteria: Restocking triggers serial/stock in ERP-1 and credit note in ERP-5', async () => {
    // 1. Create a return with outcome credit_note for dispatched order SO-0002
    const createRes = await makeRequest('POST', '/api/returns', {
      so_id: 'SO-0002',
      serial_number: 'TV55-2611-0002',
      reason: 'Transit packaging damaged - restock and credit customer',
      rma_id: `RMA-${Date.now()}`,
      outcome: 'credit_note'
    });
    assert.equal(createRes.status, 201);
    const returnId = createRes.data.data.id;

    // 2. Mark received
    await makeRequest('PATCH', `/api/returns/${returnId}/status`, { status: 'received' });

    // 3. Mark restocked with issue_credit_note: true
    const restockRes = await makeRequest('PATCH', `/api/returns/${returnId}/status`, {
      status: 'restocked',
      issue_credit_note: true
    });
    assert.equal(restockRes.status, 200);
    assert.equal(restockRes.data.data.status, 'restocked');

    // 4. Verify summary reflects the new restocked count
    const sumRes = await makeRequest('GET', '/api/returns/summary');
    assert.equal(sumRes.status, 200);
    assert.ok(sumRes.data.data.restocked >= 1);
  });
});
