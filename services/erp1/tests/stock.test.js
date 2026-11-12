const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Set AUTH_REQUIRED to false for testing
process.env.AUTH_REQUIRED = 'false';

const stockRouter = require('../routes/stock');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', stockRouter);
  return app;
}

// Request helper using node fetch against an ephemeral port
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

describe('ERP1-B1 Stock Tables & API Test Suite', () => {
  const app = createTestApp();

  it('1. GET /api/stock returns stock across all products and warehouses', async () => {
    const res = await request(app, 'GET', '/api/stock');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    const first = res.body.data[0];
    assert.ok(first.sku);
    assert.ok(Array.isArray(first.warehouses));
    assert.equal(typeof first.total_stock, 'number');
  });

  it('2. GET /api/stock?sku=SKU-0003 returns multi-warehouse stock and total 3', async () => {
    const res = await request(app, 'GET', '/api/stock?sku=SKU-0003');
    assert.equal(res.status, 200);
    const data = res.body.data;
    assert.equal(data.sku, 'SKU-0003');
    assert.equal(data.total_stock, 3);
    assert.equal(data.warehouses.length, 3);

    const wh1 = data.warehouses.find(w => w.warehouse_id === 'WH-01');
    const wh2 = data.warehouses.find(w => w.warehouse_id === 'WH-02');
    const wh3 = data.warehouses.find(w => w.warehouse_id === 'WH-03');

    assert.equal(wh1.quantity, 2);
    assert.equal(wh2.quantity, 1);
    assert.equal(wh3.quantity, 0);
  });

  it('3. GET /api/stock?sku=SKU-9999 returns 404 for non-existent product', async () => {
    const res = await request(app, 'GET', '/api/stock?sku=SKU-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('4. POST /api/stock/adjust successfully applies positive adjustment and logs movement', async () => {
    const res = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-0001',
      warehouse_id: 'WH-01',
      delta: 10,
      reason: 'Shipment received'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.sku, 'SKU-0001');
    assert.equal(res.body.data.warehouse_id, 'WH-01');
    assert.equal(res.body.data.delta, 10);
    assert.equal(res.body.data.new_quantity, res.body.data.previous_quantity + 10);
    assert.ok(res.body.data.movement_id);

    // Verify movement appears in /api/stock/movements
    const movRes = await request(app, 'GET', '/api/stock/movements?sku=SKU-0001');
    assert.equal(movRes.status, 200);
    assert.ok(Array.isArray(movRes.body.data));
    const logged = movRes.body.data.find(m => m.id === res.body.data.movement_id);
    assert.ok(logged);
    assert.equal(logged.delta, 10);
    assert.equal(logged.reason, 'Shipment received');
  });

  it('5. POST /api/stock/adjust successfully applies negative adjustment', async () => {
    const res = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-0001',
      warehouse_id: 'WH-01',
      delta: -5,
      reason: 'Quality sample extraction'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.delta, -5);
    assert.equal(res.body.data.new_quantity, res.body.data.previous_quantity - 5);
  });

  it('6. POST /api/stock/adjust rejects delta that drives stock negative with 400', async () => {
    // Current stock for SKU-0003 in WH-03 is 0
    const res = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-0003',
      warehouse_id: 'WH-03',
      delta: -10,
      reason: 'Invalid deduction'
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /cannot be negative|insufficient/i);
  });

  it('7. POST /api/stock/adjust validates input fields (missing SKU, warehouse, delta = 0)', async () => {
    // Missing SKU
    const res1 = await request(app, 'POST', '/api/stock/adjust', {
      warehouse_id: 'WH-01',
      delta: 5
    });
    assert.equal(res1.status, 400);

    // Missing warehouse
    const res2 = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-0001',
      delta: 5
    });
    assert.equal(res2.status, 400);

    // Zero delta
    const res3 = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-0001',
      warehouse_id: 'WH-01',
      delta: 0
    });
    assert.equal(res3.status, 400);

    // Non-integer delta
    const res4 = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-0001',
      warehouse_id: 'WH-01',
      delta: 'invalid'
    });
    assert.equal(res4.status, 400);
  });

  it('8. POST /api/stock/adjust returns 404 for unknown warehouse or SKU', async () => {
    const resWh = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-0001',
      warehouse_id: 'WH-99',
      delta: 5
    });
    assert.equal(resWh.status, 404);

    const resSku = await request(app, 'POST', '/api/stock/adjust', {
      sku: 'SKU-9999',
      warehouse_id: 'WH-01',
      delta: 5
    });
    assert.equal(resSku.status, 404);
  });

  it('9. GET /api/stock/movements lists movements in descending order', async () => {
    const res = await request(app, 'GET', '/api/stock/movements');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 2);

    for (let i = 0; i < res.body.data.length - 1; i++) {
      const current = new Date(res.body.data[i].created_at).getTime();
      const next = new Date(res.body.data[i + 1].created_at).getTime();
      assert.ok(current >= next, 'Movements must be ordered newest first');
    }
  });
});
