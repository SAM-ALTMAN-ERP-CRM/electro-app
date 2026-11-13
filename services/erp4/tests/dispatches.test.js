const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
process.env.AUTH_REQUIRED = 'false';

const dispatchesRouter = require('../routes/dispatches');
const salesOrdersRouter = require('../routes/salesOrders');
const store = require('../store');

// Setup test express application
const app = express();
app.use(express.json());
// Mock authenticated user context
app.use((req, res, next) => {
  req.user = { id: 'USR-0001', role: 'admin' };
  next();
});
app.use('/api', salesOrdersRouter);
app.use('/api', dispatchesRouter);

// Helper to make HTTP requests against express app instance
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

test('ERP4-C1 Dispatch API Test Suite', async (t) => {

  await t.test('1. GET /api/dispatches returns rows with serial_number, sku, customer_id, ship_date (used by CRM-2)', async () => {
    const res = await request(app, 'GET', '/api/dispatches');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5, 'Should return at least 5 seed dispatch rows');

    const first = res.body.data[0];
    assert.ok(first.serial_number, 'Row must include serial_number');
    assert.ok(first.sku, 'Row must include sku');
    assert.ok(first.customer_id, 'Row must include customer_id');
    assert.ok(first.ship_date, 'Row must include ship_date');

    // Verify seed serials TV55-2611-0001..0005 are present
    const serialNumbers = res.body.data.map(r => r.serial_number);
    assert.ok(serialNumbers.includes('TV55-2611-0001'), 'TV55-2611-0001 must be present');
    assert.ok(serialNumbers.includes('TV55-2611-0002'), 'TV55-2611-0002 must be present');
  });

  await t.test('2. GET /api/dispatches/:id returns 200 with dispatch details and serials', async () => {
    const res = await request(app, 'GET', '/api/dispatches/DSP-0001');
    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'DSP-0001');
    assert.equal(res.body.data.courier, 'BlueDart');
    assert.ok(Array.isArray(res.body.data.serials));
    assert.ok(res.body.data.serials.length > 0);
  });

  await t.test('3. GET /api/dispatches/:id returns 404 for unknown dispatch', async () => {
    const res = await request(app, 'GET', '/api/dispatches/DSP-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  await t.test('4. POST /api/dispatches rejects missing or invalid required fields', async () => {
    // Missing so_id
    const resNoSo = await request(app, 'POST', '/api/dispatches', {
      courier: 'BlueDart',
      tracking_no: 'TRK-12345',
      address: 'Test Address'
    });
    assert.equal(resNoSo.status, 400);

    // Invalid courier
    const resBadCourier = await request(app, 'POST', '/api/dispatches', {
      so_id: 'SO-0001',
      courier: 'FastDeliveryExpress',
      tracking_no: 'TRK-12345',
      address: 'Test Address'
    });
    assert.equal(resBadCourier.status, 400);

    // Missing tracking_no
    const resNoTrack = await request(app, 'POST', '/api/dispatches', {
      so_id: 'SO-0001',
      courier: 'BlueDart',
      address: 'Test Address'
    });
    assert.equal(resNoTrack.status, 400);

    // Missing address
    const resNoAddr = await request(app, 'POST', '/api/dispatches', {
      so_id: 'SO-0001',
      courier: 'BlueDart',
      tracking_no: 'TRK-12345'
    });
    assert.equal(resNoAddr.status, 400);
  });

  await t.test('5. Acceptance Criterion: dispatching an unreserved order returns 400', async () => {
    // Create a new sales order that has NO reservations
    const createOrderRes = await request(app, 'POST', '/api/sales-orders', {
      customer_id: 'CUST-0006',
      sales_rep_id: 'EMP-0002',
      items: [
        { sku: 'SKU-0002', product_name: '65-inch 4K OLED TV', quantity: 1, unit_price: 79990.00 }
      ]
    });
    assert.equal(createOrderRes.status, 201);
    const newOrderId = createOrderRes.body.data.id;

    // Attempt to dispatch this unreserved order -> must return 400
    const dispatchRes = await request(app, 'POST', '/api/dispatches', {
      so_id: newOrderId,
      courier: 'Delhivery',
      tracking_no: 'DL-UNRESERVED-1',
      address: '12 Galaxy Park, Andheri, Mumbai'
    });
    assert.equal(dispatchRes.status, 400);
    assert.ok(dispatchRes.body.error);
    assert.match(dispatchRes.body.error, /unreserved|not found|reservations/i);
  });

  await t.test('6. Acceptance Criterion: dispatching an order with a shortage reservation returns 400', async () => {
    // Create an order and add a shortage reservation into store
    const createOrderRes = await request(app, 'POST', '/api/sales-orders', {
      customer_id: 'CUST-0007',
      sales_rep_id: 'EMP-0003',
      items: [
        { sku: 'SKU-0003', product_name: 'Home Audio System', quantity: 2, unit_price: 19990.00 }
      ]
    });
    assert.equal(createOrderRes.status, 201);
    const shortageOrderId = createOrderRes.body.data.id;

    // Manually push a shortage reservation into in-memory store
    store.inMemoryReservations.push({
      id: `RES-${Date.now()}`,
      so_id: shortageOrderId,
      sku: 'SKU-0003',
      quantity: 2,
      status: 'shortage',
      created_at: new Date().toISOString()
    });

    // Attempt to dispatch -> must return 400
    const dispatchRes = await request(app, 'POST', '/api/dispatches', {
      so_id: shortageOrderId,
      courier: 'DTDC',
      tracking_no: 'DT-SHORTAGE-1',
      address: '44 MG Road, Bengaluru'
    });
    assert.equal(dispatchRes.status, 400);
    assert.ok(dispatchRes.body.error);
    assert.match(dispatchRes.body.error, /unreserved|shortage|reserved/i);
  });

  await t.test('7. Acceptance Criterion: dispatching a fully reserved order succeeds and serials are stored per dispatch', async () => {
    // Create an order
    const createOrderRes = await request(app, 'POST', '/api/sales-orders', {
      customer_id: 'CUST-0008',
      sales_rep_id: 'EMP-0004',
      items: [
        { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990.00 }
      ]
    });
    assert.equal(createOrderRes.status, 201);
    const validOrderId = createOrderRes.body.data.id;

    // Add valid 'reserved' status reservation
    store.inMemoryReservations.push({
      id: `RES-${Date.now()}`,
      so_id: validOrderId,
      sku: 'SKU-0001',
      quantity: 1,
      status: 'reserved',
      created_at: new Date().toISOString()
    });

    // Dispatch the order
    const dispatchRes = await request(app, 'POST', '/api/dispatches', {
      so_id: validOrderId,
      courier: 'BlueDart',
      tracking_no: 'BD-TEST-9999',
      address: '77 Marine Drive, Churchgate, Mumbai 400020'
    });

    assert.equal(dispatchRes.status, 201);
    assert.ok(dispatchRes.body.data);
    const createdDispatch = dispatchRes.body.data;
    assert.ok(createdDispatch.id.startsWith('DSP-'));
    assert.equal(createdDispatch.so_id, validOrderId);
    assert.equal(createdDispatch.courier, 'BlueDart');
    assert.equal(createdDispatch.status, 'picked');
    assert.ok(Array.isArray(createdDispatch.serials));
    assert.equal(createdDispatch.serials.length, 1);
    assert.equal(createdDispatch.serials[0].sku, 'SKU-0001');
    assert.ok(createdDispatch.serials[0].serial_number);

    // Verify stored per dispatch via GET /api/dispatches/:id
    const fetchRes = await request(app, 'GET', `/api/dispatches/${createdDispatch.id}`);
    assert.equal(fetchRes.status, 200);
    assert.equal(fetchRes.body.data.id, createdDispatch.id);
    assert.equal(fetchRes.body.data.serials.length, 1);
    assert.equal(fetchRes.body.data.serials[0].serial_number, createdDispatch.serials[0].serial_number);
  });

  await t.test('8. PATCH /api/dispatches/:id/status updates status and delivery date', async () => {
    // 1. Move to shipped
    const patchShippedRes = await request(app, 'PATCH', '/api/dispatches/DSP-0001/status', {
      status: 'shipped',
      ship_date: '2026-10-02'
    });
    assert.equal(patchShippedRes.status, 200);
    assert.equal(patchShippedRes.body.data.status, 'shipped');
    assert.ok(patchShippedRes.body.data.ship_date);

    // 2. Move to delivered
    const patchDeliveredRes = await request(app, 'PATCH', '/api/dispatches/DSP-0001/status', {
      status: 'delivered',
      delivered_date: '2026-10-05'
    });
    assert.equal(patchDeliveredRes.status, 200);
    assert.equal(patchDeliveredRes.body.data.status, 'delivered');
    assert.equal(patchDeliveredRes.body.data.delivered_date, '2026-10-05');

    // 3. Reject invalid status
    const patchBadRes = await request(app, 'PATCH', '/api/dispatches/DSP-0001/status', {
      status: 'lost_in_transit'
    });
    assert.equal(patchBadRes.status, 400);
    assert.ok(patchBadRes.body.error);

    // 4. Reject non-existent dispatch
    const patchNotFound = await request(app, 'PATCH', '/api/dispatches/DSP-9999/status', {
      status: 'delivered'
    });
    assert.equal(patchNotFound.status, 404);
  });
});
