const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
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

test('ERP4-D2 Return screens & Lifecycle Suite', async (t) => {
  await t.test('1. Verify frontend files and routes exist', () => {
    const listPath = path.resolve(__dirname, '../../../frontend/src/modules/erp4/pages/ReturnsListPage.jsx');
    const detailPath = path.resolve(__dirname, '../../../frontend/src/modules/erp4/pages/ReturnDetailPage.jsx');
    const indexPath = path.resolve(__dirname, '../../../frontend/src/modules/erp4/index.jsx');

    assert.ok(fs.existsSync(listPath), 'ReturnsListPage.jsx must exist');
    assert.ok(fs.existsSync(detailPath), 'ReturnDetailPage.jsx must exist');
    assert.ok(fs.existsSync(indexPath), 'index.jsx must exist');

    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(indexContent.includes('returns'), 'index.jsx must register returns route');
    assert.ok(indexContent.includes('returns/:id'), 'index.jsx must register returns/:id route');
  });

  await t.test('2. Acceptance Criteria: You can raise a return and move it through its statuses', async () => {
    // 1. Raise a return for dispatched order SO-0004 with serial TV55-2611-0004
    const createRes = await makeRequest('POST', '/api/returns', {
      so_id: 'SO-0004',
      serial_number: 'TV55-2611-0004',
      reason: 'Physical housing defect observed at customer site',
      rma_id: `RMA-${Date.now()}`,
      outcome: 'credit_note'
    });
    assert.equal(createRes.status, 201);
    const returnId = createRes.data.data.id;
    assert.ok(returnId.startsWith('RET-'));
    assert.equal(createRes.data.data.status, 'requested');

    // 2. Transition from requested -> received
    const receiveRes = await makeRequest('PATCH', `/api/returns/${returnId}/status`, {
      status: 'received'
    });
    assert.equal(receiveRes.status, 200);
    assert.equal(receiveRes.data.data.status, 'received');

    // 3. Transition from received -> restocked
    const restockRes = await makeRequest('PATCH', `/api/returns/${returnId}/status`, {
      status: 'restocked'
    });
    assert.equal(restockRes.status, 200);
    assert.equal(restockRes.data.data.status, 'restocked');

    // 4. Fetch details via GET /api/returns/:id
    const detailRes = await makeRequest('GET', `/api/returns/${returnId}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.data.data.status, 'restocked');
    assert.equal(detailRes.data.data.serial_number, 'TV55-2611-0004');
  });
});
