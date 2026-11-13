const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
process.env.AUTH_REQUIRED = 'false';

const dispatchesRouter = require('../routes/dispatches');
const salesOrdersRouter = require('../routes/salesOrders');
const reservationsRouter = require('../routes/reservations');
const store = require('../store');

// Setup test express application
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'USR-0001', role: 'admin' };
  next();
});
app.use('/api', salesOrdersRouter);
app.use('/api', reservationsRouter);
app.use('/api', dispatchesRouter);

async function request(serverApp, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const server = serverApp.listen(0, async () => {
      const port = server.address().port;
      try {
        const fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (body !== null) {
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
        server.close(() => resolve({ status: res.status, body: json }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

test('ERP4-C2 Dispatch Screens & API Integration Suite', async (t) => {

  await t.test('1. Verified orders ready to dispatch exist (SO-0006 & SO-0007 are confirmed/reserved)', async () => {
    const res = await request(app, 'GET', '/api/sales-orders');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    const ready = res.body.data.filter(
      o => o.status !== 'dispatched' && o.status !== 'delivered' && o.status !== 'cancelled'
    );
    assert.ok(ready.length >= 2, 'Must have at least 2 ready-to-dispatch orders in seed/mock data');
    const so6 = ready.find(o => o.id === 'SO-0006');
    assert.ok(so6, 'SO-0006 must be ready to dispatch');
    assert.equal(so6.status, 'confirmed');
  });

  await t.test('2. GET /api/dispatches?format=grouped returns full dispatch objects with nested serials', async () => {
    const res = await request(app, 'GET', '/api/dispatches?format=grouped');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5, 'Should return at least 5 dispatches');

    const dsp1 = res.body.data.find(d => d.id === 'DSP-0001');
    assert.ok(dsp1, 'DSP-0001 must exist');
    assert.equal(dsp1.courier, 'BlueDart');
    assert.ok(Array.isArray(dsp1.serials), 'Must contain nested serials array');
    assert.ok(dsp1.serials.length > 0, 'Must have allocated serials');
  });

  await t.test('3. Acceptance Criteria: Dispatch ready order SO-0006 and advance status picked -> shipped -> delivered', async () => {
    // 1. Dispatch order SO-0006
    const dispatchRes = await request(app, 'POST', '/api/dispatches', {
      so_id: 'SO-0006',
      courier: 'Delhivery',
      tracking_no: 'DL-78291044',
      address: '72 Connaught Place, Central Delhi, New Delhi 110001'
    });
    assert.equal(dispatchRes.status, 201);
    const created = dispatchRes.body.data;
    assert.ok(created.id.startsWith('DSP-'));
    assert.equal(created.so_id, 'SO-0006');
    assert.equal(created.courier, 'Delhivery');
    assert.equal(created.status, 'picked');
    assert.ok(created.serials && created.serials.length > 0);

    const dispatchId = created.id;

    // 2. Click "Shipped" button -> Move to shipped
    const shippedRes = await request(app, 'PATCH', `/api/dispatches/${dispatchId}/status`, {
      status: 'shipped'
    });
    assert.equal(shippedRes.status, 200);
    assert.equal(shippedRes.body.data.status, 'shipped');
    assert.ok(shippedRes.body.data.ship_date, 'Ship date must be recorded');

    // 3. Click "Delivered" button -> Move to delivered
    const deliveredRes = await request(app, 'PATCH', `/api/dispatches/${dispatchId}/status`, {
      status: 'delivered'
    });
    assert.equal(deliveredRes.status, 200);
    assert.equal(deliveredRes.body.data.status, 'delivered');
    assert.ok(deliveredRes.body.data.delivered_date, 'Delivered date must be recorded');

    // 4. Verify sales order status is updated to delivered
    const orderCheck = await request(app, 'GET', '/api/sales-orders/SO-0006');
    assert.equal(orderCheck.status, 200);
    assert.equal(orderCheck.body.data.status, 'delivered');
  });
});
