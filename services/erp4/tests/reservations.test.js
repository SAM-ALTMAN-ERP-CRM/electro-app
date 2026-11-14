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

test('ERP4-B1 & ERP4-B3 Reservation, Shortage, and Release Test Suite', async (t) => {
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

  await t.test('2. Acceptance Criteria (B1 & B3): mixed order produces shortage and triggers work order', async () => {
    // Create a mixed order with SKU-0001 (in stock) and SKU-0003 (shortage)
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
    assert.equal(sku3Row.production_requested, true, 'Shortage item must have production_requested true');

    assert.equal(reserveRes.body.data.summary.total, 2);
    assert.equal(reserveRes.body.data.summary.reserved, 1);
    assert.equal(reserveRes.body.data.summary.shortage, 1);
  });

  await t.test('3. Acceptance Criteria: running reserve twice does not duplicate rows', async () => {
    const res1 = await fetchMock(app, 'POST', '/api/sales-orders/SO-0002/reserve');
    assert.equal(res1.status, 200);
    const count1 = res1.body.data.reservations.length;

    const res2 = await fetchMock(app, 'POST', '/api/sales-orders/SO-0002/reserve');
    assert.equal(res2.status, 200);
    const count2 = res2.body.data.reservations.length;

    assert.equal(count1, count2, 'Running reserve again must not duplicate reservation rows');
  });

  await t.test('4. Acceptance Criteria (B3): DELETE /api/sales-orders/:id/reservations sets reservations to released', async () => {
    // Reserve SO-0003
    await fetchMock(app, 'POST', '/api/sales-orders/SO-0003/reserve');

    // Call DELETE to release
    const delRes = await fetchMock(app, 'DELETE', '/api/sales-orders/SO-0003/reservations');
    assert.equal(delRes.status, 200);
    assert.ok(delRes.body.data);
    assert.equal(delRes.body.data.status, 'released');
    assert.ok(delRes.body.data.reservations.length > 0);
    assert.ok(delRes.body.data.reservations.every(r => r.status === 'released'));

    // Verify GET confirms released status
    const getRes = await fetchMock(app, 'GET', '/api/sales-orders/SO-0003/reservations');
    assert.equal(getRes.status, 200);
    assert.ok(getRes.body.data.reservations.every(r => r.status === 'released'));
  });

  await t.test('5. Acceptance Criteria (B3): cancelling an order automatically releases its reservations', async () => {
    // 1. Create a fresh order
    const orderRes = await fetchMock(app, 'POST', '/api/sales-orders', {
      customer_id: 'CUST-0004',
      sales_rep_id: 'EMP-0002',
      items: [
        { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 2, unit_price: 42990.00 }
      ]
    });
    assert.equal(orderRes.status, 201);
    const orderId = orderRes.body.data.id;

    // 2. Reserve stock
    const reserveRes = await fetchMock(app, 'POST', `/api/sales-orders/${orderId}/reserve`);
    assert.equal(reserveRes.status, 200);
    assert.equal(reserveRes.body.data.reservations[0].status, 'reserved');

    // 3. Cancel the order
    const cancelRes = await fetchMock(app, 'PATCH', `/api/sales-orders/${orderId}/cancel`);
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.data.status, 'cancelled');

    // 4. Verify its reservations are now 'released'
    const checkRes = await fetchMock(app, 'GET', `/api/sales-orders/${orderId}/reservations`);
    assert.equal(checkRes.status, 200);
    assert.ok(checkRes.body.data.reservations.length > 0);
    assert.equal(checkRes.body.data.reservations[0].status, 'released');
  });

  await t.test('6. POST /api/sales-orders/:id/reserve returns 404 for non-existent order', async () => {
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
