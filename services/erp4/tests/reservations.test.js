const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const reservationsRouter = require('../routes/reservations');
const salesOrdersRouter = require('../routes/salesOrders');

// Setup test express application
const app = express();
app.use(express.json());
// Mock authenticated user context
app.use((req, res, next) => {
  req.user = { id: 'USR-0001', role: 'admin' };
  next();
});
app.use('/api', salesOrdersRouter);
app.use('/api', reservationsRouter);

test('ERP4-B1 Reservation API Test Suite', async (t) => {
  await t.test('1. POST /api/sales-orders/SO-0001/reserve reserves stock for existing order', async () => {
    const res = await fetchMock(app, 'POST', '/api/sales-orders/SO-0001/reserve');
    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.so_id, 'SO-0001');
    assert.ok(Array.isArray(res.body.data.reservations));
    assert.equal(res.body.data.reservations.length, 1);
    assert.equal(res.body.data.reservations[0].sku, 'SKU-0001');
    assert.equal(res.body.data.reservations[0].status, 'reserved');
    assert.equal(res.body.data.summary.reserved, 1);
    assert.equal(res.body.data.summary.shortage, 0);
  });

  await t.test('2. Acceptance Criteria: mixed order produces both reserved and shortage rows (SKU-0003 yields shortage)', async () => {
    // First create a mixed order with SKU-0001 (available) and SKU-0003 (out of stock)
    const createRes = await fetchMock(app, 'POST', '/api/sales-orders', {
      customer_id: 'CUST-0003',
      sales_rep_id: 'EMP-0001',
      items: [
        { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990.00 },
        { sku: 'SKU-0003', product_name: '65-inch OLED TV', quantity: 5, unit_price: 94990.00 }
      ]
    });
    assert.equal(createRes.status, 201);
    const mixedOrderId = createRes.body.data.id;
    assert.ok(mixedOrderId);

    // Call reserve on the mixed order
    const reserveRes = await fetchMock(app, 'POST', `/api/sales-orders/${mixedOrderId}/reserve`);
    assert.equal(reserveRes.status, 200);
    const reservations = reserveRes.body.data.reservations;
    assert.equal(reservations.length, 2);

    const sku1Row = reservations.find(r => r.sku === 'SKU-0001');
    const sku3Row = reservations.find(r => r.sku === 'SKU-0003');

    assert.ok(sku1Row, 'SKU-0001 must have a reservation record');
    assert.equal(sku1Row.status, 'reserved', 'SKU-0001 must be reserved');

    assert.ok(sku3Row, 'SKU-0003 must have a reservation record');
    assert.equal(sku3Row.status, 'shortage', 'SKU-0003 must be marked as shortage');

    assert.equal(reserveRes.body.data.summary.total, 2);
    assert.equal(reserveRes.body.data.summary.reserved, 1);
    assert.equal(reserveRes.body.data.summary.shortage, 1);
  });

  await t.test('3. Acceptance Criteria: running reserve twice does not duplicate rows', async () => {
    // Reserve SO-0002 first time
    const res1 = await fetchMock(app, 'POST', '/api/sales-orders/SO-0002/reserve');
    assert.equal(res1.status, 200);
    const count1 = res1.body.data.reservations.length;

    // Reserve SO-0002 second time
    const res2 = await fetchMock(app, 'POST', '/api/sales-orders/SO-0002/reserve');
    assert.equal(res2.status, 200);
    const count2 = res2.body.data.reservations.length;

    assert.equal(count1, count2, 'Running reserve again must not duplicate reservation rows');

    // Verify GET also returns the exact same count
    const getRes = await fetchMock(app, 'GET', '/api/sales-orders/SO-0002/reservations');
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.reservations.length, count1);
  });

  await t.test('4. GET /api/sales-orders/:id/reservations returns reservation records and summary', async () => {
    const res = await fetchMock(app, 'GET', '/api/sales-orders/SO-0001/reservations');
    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.so_id, 'SO-0001');
    assert.ok(Array.isArray(res.body.data.reservations));
    assert.ok(res.body.data.summary);
  });

  await t.test('5. POST /api/sales-orders/:id/reserve returns 404 for non-existent order', async () => {
    const res = await fetchMock(app, 'POST', '/api/sales-orders/SO-9999/reserve');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});

/**
 * Lightweight in-memory HTTP dispatcher for Express testing
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
