const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Set AUTH_REQUIRED to false for local isolated testing
process.env.AUTH_REQUIRED = 'false';

const serialsRouter = require('../routes/serials');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', serialsRouter);
  return app;
}

async function request(app, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
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
        server.close(() => {
          resolve({ status: res.status, body: json });
        });
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

describe('ERP1-C3 Serial Status Rules & Allocation Test Suite', () => {
  const app = createTestApp();

  it('1. Rejects illegal status transition (in_stock -> sold) with 400', async () => {
    const res = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', {
      status: 'sold'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('Illegal status transition'));
  });

  it('2. Rejects unknown status value with 400 and unknown serial with 404', async () => {
    const badStatus = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', {
      status: 'scrapped'
    });
    assert.equal(badStatus.status, 400);

    const notFound = await request(app, 'PATCH', '/api/serials/NON-EXISTENT-9999/status', {
      status: 'reserved'
    });
    assert.equal(notFound.status, 404);
  });

  it('3. Allows full valid lifecycle: in_stock -> reserved -> sold -> returned -> in_stock', async () => {
    const s1 = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', { status: 'reserved' });
    assert.equal(s1.status, 200);
    assert.equal(s1.body.data.status, 'reserved');

    // Illegal jump from reserved back to in_stock must fail
    const badBack = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', { status: 'in_stock' });
    assert.equal(badBack.status, 400);

    const s2 = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', { status: 'sold' });
    assert.equal(s2.status, 200);
    assert.equal(s2.body.data.status, 'sold');

    const s3 = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', { status: 'returned' });
    assert.equal(s3.status, 200);
    assert.equal(s3.body.data.status, 'returned');

    const s4 = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', { status: 'in_stock' });
    assert.equal(s4.status, 200);
    assert.equal(s4.body.data.status, 'in_stock');
  });

  it('4. POST /api/serials/allocate reserves exact qty of in_stock serials', async () => {
    const res = await request(app, 'POST', '/api/serials/allocate', {
      sku: 'SKU-0001',
      qty: 2
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'reserved');
    assert.equal(res.body.data.allocated_serials.length, 2);

    // Verify they now appear under status=reserved
    const listRes = await request(app, 'GET', '/api/serials?sku=SKU-0001&status=reserved');
    assert.equal(listRes.status, 200);
    const reservedNumbers = listRes.body.data.map(s => s.serial_number);
    for (const sn of res.body.data.allocated_serials) {
      assert.ok(reservedNumbers.includes(sn));
    }
  });

  it('5. POST /api/serials/allocate returns 400 if not enough in_stock serials or invalid input', async () => {
    const badQty = await request(app, 'POST', '/api/serials/allocate', { sku: 'SKU-0001', qty: 0 });
    assert.equal(badQty.status, 400);

    const tooMany = await request(app, 'POST', '/api/serials/allocate', { sku: 'SKU-0001', qty: 999 });
    assert.equal(tooMany.status, 400);
    assert.ok(tooMany.body.error.includes('Not enough in_stock serials'));
  });
});

