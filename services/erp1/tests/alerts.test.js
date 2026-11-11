const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Set AUTH_REQUIRED to false for testing
process.env.AUTH_REQUIRED = 'false';

const alertsRouter = require('../routes/alerts');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', alertsRouter);
  return app;
}

// Minimal supertest-like helper using node fetch or express request handling
async function request(app, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
          fetchOptions.body = JSON.stringify(body);
        }
        const res = await fetch(`http://127.0.0.1:${port}${url}`, fetchOptions);
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
        server.close(() => {
          resolve({ status: res.status, body: json });
        });
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

describe('ERP1-D1 Low-Stock Alerts API Test Suite', () => {
  const app = createTestApp();
  let firstAlertId = null;

  it('1. GET /api/alerts/low-stock flags SKU-0003 and SKU-0102 from seed data', async () => {
    const res = await request(app, 'GET', '/api/alerts/low-stock');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    const sku3 = res.body.data.find(item => item.sku === 'SKU-0003');
    assert.ok(sku3, 'SKU-0003 must be in low-stock list');
    assert.equal(sku3.current_stock, 3);
    assert.equal(sku3.reorder_level, 10);
    assert.equal(sku3.shortfall, 7);

    const sku102 = res.body.data.find(item => item.sku === 'SKU-0102');
    assert.ok(sku102, 'SKU-0102 must be in low-stock list');
    assert.equal(sku102.current_stock, 4);
    assert.equal(sku102.reorder_level, 10);
    assert.equal(sku102.shortfall, 6);
  });

  it('2. POST /api/alerts/scan inserts alerts for low items without unacknowledged alerts', async () => {
    const res = await request(app, 'POST', '/api/alerts/scan');
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.ok(res.body.data.created.length >= 2, 'Should create alerts for low items');

    const createdSku3 = res.body.data.created.find(a => a.sku === 'SKU-0003');
    assert.ok(createdSku3, 'Alert for SKU-0003 must be created');
    assert.equal(createdSku3.acknowledged, false);
    firstAlertId = createdSku3.id;
  });

  it('3. Acceptance Criteria: POST /api/alerts/scan twice creates NO duplicates', async () => {
    const res = await request(app, 'POST', '/api/alerts/scan');
    assert.equal(res.status, 201);
    assert.equal(res.body.data.created.length, 0, 'Second scan must not create duplicate alerts');
  });

  it('4. GET /api/alerts returns open alerts list', async () => {
    const res = await request(app, 'GET', '/api/alerts');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);
    const alert = res.body.data.find(a => a.id === firstAlertId);
    assert.ok(alert, 'First alert must be in open alerts list');
    assert.equal(alert.acknowledged, false);
  });

  it('5. Acceptance Criteria: PATCH /api/alerts/:id/ack acknowledges and hides alert from open list', async () => {
    assert.ok(firstAlertId, 'firstAlertId must be set');
    const ackRes = await request(app, 'PATCH', `/api/alerts/${firstAlertId}/ack`);
    assert.equal(ackRes.status, 200);
    assert.equal(ackRes.body.data.acknowledged, true);

    // Verify it is hidden from open alerts list
    const openRes = await request(app, 'GET', '/api/alerts');
    assert.equal(openRes.status, 200);
    const stillPresent = openRes.body.data.find(a => a.id === firstAlertId);
    assert.equal(stillPresent, undefined, 'Acknowledged alert must not appear in open alerts');

    // Verify it appears when filtering ?acknowledged=true
    const ackListRes = await request(app, 'GET', '/api/alerts?acknowledged=true');
    assert.equal(ackListRes.status, 200);
    const inAckList = ackListRes.body.data.find(a => a.id === firstAlertId);
    assert.ok(inAckList, 'Acknowledged alert should appear when acknowledged=true');
  });

  it('6. PUT /api/products/:id/reorder-level updates reorder_level with validation', async () => {
    // Valid update
    const res = await request(app, 'PUT', '/api/products/SKU-0001/reorder-level', {
      reorder_level: 25
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.reorder_level, 25);

    // Negative value rejected
    const badRes = await request(app, 'PUT', '/api/products/SKU-0001/reorder-level', {
      reorder_level: -5
    });
    assert.equal(badRes.status, 400);

    // Missing field rejected
    const missingRes = await request(app, 'PUT', '/api/products/SKU-0001/reorder-level', {});
    assert.equal(missingRes.status, 400);

    // Unknown product returns 404
    const notFoundRes = await request(app, 'PUT', '/api/products/SKU-9999/reorder-level', {
      reorder_level: 15
    });
    assert.equal(notFoundRes.status, 404);
  });

  it('7. PATCH /api/alerts/:id/ack returns 404 for unknown alert', async () => {
    const res = await request(app, 'PATCH', '/api/alerts/ALT-9999/ack');
    assert.equal(res.status, 404);
  });
});
