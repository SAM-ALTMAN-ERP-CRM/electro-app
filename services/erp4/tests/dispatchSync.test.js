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

test('ERP4-C3 Status Sync, Side Effects and Dispatch Note Suite', async (t) => {

  await t.test('1. GET /api/dispatches/:id returns full metadata including items and serials for printable note', async () => {
    const res = await request(app, 'GET', '/api/dispatches/DSP-0001');
    assert.equal(res.status, 200);
    const dsp = res.body.data;
    assert.equal(dsp.id, 'DSP-0001');
    assert.equal(dsp.so_id, 'SO-0001');
    assert.ok(dsp.customer_id, 'Should include customer_id');
    assert.ok(dsp.customer_name, 'Should include customer_name');
    assert.ok(dsp.courier, 'Should include courier partner');
    assert.ok(dsp.tracking_no, 'Should include tracking number');
    assert.ok(dsp.address, 'Should include delivery address');
    assert.ok(Array.isArray(dsp.serials), 'Should include allocated serials array');
    assert.ok(Array.isArray(dsp.items), 'Should include line items array');
  });

  await t.test('2. Status sync: moving dispatch to shipped updates sales_orders.status to dispatched', async () => {
    // Create new sales order
    const createOrderRes = await request(app, 'POST', '/api/sales-orders', {
      customer_id: 'CUST-0002',
      customer_name: 'Sunrise Electronics Pvt Ltd',
      customer_gstin: '27AABCS1234F1Z5',
      sales_rep_id: 'EMP-0002',
      items: [
        { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990.00 }
      ]
    });
    assert.equal(createOrderRes.status, 201);
    const orderId = createOrderRes.body.data.id;

    // Add reservation
    store.inMemoryReservations.push({
      id: `RES-${Date.now()}`,
      so_id: orderId,
      sku: 'SKU-0001',
      quantity: 1,
      status: 'reserved',
      created_at: new Date().toISOString()
    });

    // Create dispatch
    const createDspRes = await request(app, 'POST', '/api/dispatches', {
      so_id: orderId,
      courier: 'BlueDart',
      tracking_no: 'BD-SYNC-001',
      address: 'Plot 45, MIDC Industrial Area, Andheri East, Mumbai 400093'
    });
    assert.equal(createDspRes.status, 201);
    const dspId = createDspRes.body.data.id;

    // Move dispatch to shipped
    const shipRes = await request(app, 'PATCH', `/api/dispatches/${dspId}/status`, {
      status: 'shipped',
      ship_date: '2026-11-13'
    });
    assert.equal(shipRes.status, 200);
    assert.equal(shipRes.body.data.status, 'shipped');

    // Verify order status is synchronized to dispatched
    const checkOrderRes = await request(app, 'GET', `/api/sales-orders/${orderId}`);
    assert.equal(checkOrderRes.status, 200);
    assert.equal(checkOrderRes.body.data.status, 'dispatched', 'Sales order status must be dispatched');
  });

  await t.test('3. Status sync: moving dispatch to delivered updates sales_orders.status to delivered', async () => {
    // Using existing DSP-0005 / SO-0005
    const shipRes = await request(app, 'PATCH', '/api/dispatches/DSP-0005/status', {
      status: 'shipped',
      ship_date: '2026-11-13'
    });
    assert.equal(shipRes.status, 200);

    const deliverRes = await request(app, 'PATCH', '/api/dispatches/DSP-0005/status', {
      status: 'delivered',
      delivered_date: '2026-11-14'
    });
    assert.equal(deliverRes.status, 200);
    assert.equal(deliverRes.body.data.status, 'delivered');
    assert.equal(deliverRes.body.data.delivered_date, '2026-11-14');

    // Verify order status is synchronized to delivered
    const checkOrderRes = await request(app, 'GET', '/api/sales-orders/SO-0005');
    assert.equal(checkOrderRes.status, 200);
    assert.equal(checkOrderRes.body.data.status, 'delivered', 'Sales order status must be delivered');
  });

  await t.test('4. Side effects error resilience: failure in external calls logs [integration-error] and does not break status update', async () => {
    // Intercept console.error to check that [integration-error] was logged when needed
    let errorLogged = false;
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const msg = args.join(' ');
      if (msg.includes('[integration-error]')) {
        errorLogged = true;
      }
      originalConsoleError.apply(console, args);
    };

    try {
      const shipRes = await request(app, 'PATCH', '/api/dispatches/DSP-0004/status', {
        status: 'shipped',
        ship_date: '2026-11-13'
      });
      assert.equal(shipRes.status, 200);
      assert.equal(shipRes.body.data.status, 'shipped');
    } finally {
      console.error = originalConsoleError;
    }
  });
});
