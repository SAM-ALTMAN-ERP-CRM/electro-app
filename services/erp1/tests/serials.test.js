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

describe('ERP1-C1 Serials & Batches API Test Suite', () => {
  const app = createTestApp();

  it('1. Acceptance Criteria: Seeded serials TV55-2611-0001..0030 exist with 0001..0005 sold', async () => {
    const allRes = await request(app, 'GET', '/api/serials?sku=SKU-0001');
    assert.equal(allRes.status, 200);
    assert.equal(allRes.body.data.length, 30);

    const soldRes = await request(app, 'GET', '/api/serials?sku=SKU-0001&status=sold');
    assert.equal(soldRes.status, 200);
    assert.equal(soldRes.body.data.length, 5);
    assert.deepEqual(
      soldRes.body.data.map(s => s.serial_number),
      ['TV55-2611-0001', 'TV55-2611-0002', 'TV55-2611-0003', 'TV55-2611-0004', 'TV55-2611-0005']
    );

    const detailRes = await request(app, 'GET', '/api/serials/TV55-2611-0006');
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.data.status, 'in_stock');
    assert.equal(detailRes.body.data.warehouse_id, 'WH-01');
  });

  it('2. Acceptance Criteria: POST /api/serials/bulk generates 10 unique serials and continues cleanly', async () => {
    const res1 = await request(app, 'POST', '/api/serials/bulk', {
      sku: 'SKU-0001',
      batch_no: 'BATCH-2611-02',
      count: 10,
      prefix: 'TV55-2611-'
    });
    assert.equal(res1.status, 201);
    assert.equal(res1.body.data.count, 10);
    assert.equal(res1.body.data.created_serials.length, 10);
    assert.equal(new Set(res1.body.data.created_serials).size, 10);
    assert.equal(res1.body.data.created_serials[0], 'TV55-2611-0031');
    assert.equal(res1.body.data.created_serials[9], 'TV55-2611-0040');

    // Second generation with prefix without trailing hyphen (like ERP-3 PROD) also generates unique rows
    const res2 = await request(app, 'POST', '/api/serials/bulk', {
      sku: 'SKU-0002',
      batch_no: 'WO-0001',
      count: 3,
      prefix: 'PROD'
    });
    assert.equal(res2.status, 201);
    assert.deepEqual(res2.body.data.created_serials, ['PROD-0001', 'PROD-0002', 'PROD-0003']);
  });

  it('3. Acceptance Criteria: Filters (?sku=, ?status=, ?q=) and GET /api/batches work', async () => {
    const bySkuAndStatus = await request(app, 'GET', '/api/serials?sku=SKU-0002&status=in_stock');
    assert.equal(bySkuAndStatus.status, 200);
    assert.equal(bySkuAndStatus.body.data.length, 3);

    const bySearch = await request(app, 'GET', '/api/serials?q=TV55-2611-0035');
    assert.equal(bySearch.status, 200);
    assert.equal(bySearch.body.data.length, 1);
    assert.equal(bySearch.body.data[0].batch_no, 'BATCH-2611-02');

    const batchesRes = await request(app, 'GET', '/api/batches');
    assert.equal(batchesRes.status, 200);
    assert.ok(batchesRes.body.data.some(b => b.batch_no === 'BATCH-2611-01'));
    assert.ok(batchesRes.body.data.some(b => b.batch_no === 'BATCH-2611-02'));
  });

  it('4. Validation & 404 checks return proper HTTP statuses', async () => {
    const badCount = await request(app, 'POST', '/api/serials/bulk', {
      sku: 'SKU-0001',
      batch_no: 'B1',
      count: 0,
      prefix: 'TV55-'
    });
    assert.equal(badCount.status, 400);

    const missingSku = await request(app, 'POST', '/api/serials/bulk', {
      sku: 'SKU-9999',
      batch_no: 'B1',
      count: 2,
      prefix: 'TV55-'
    });
    assert.equal(missingSku.status, 404);

    const badStatusFilter = await request(app, 'GET', '/api/serials?status=invalid_status');
    assert.equal(badStatusFilter.status, 400);

    const unknownSerial = await request(app, 'GET', '/api/serials/NO-SUCH-SERIAL');
    assert.equal(unknownSerial.status, 404);
  });

  it('5. ERP1-C3: Rejects illegal status transition (in_stock -> sold) with 400', async () => {
    const res = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', {
      status: 'sold'
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('Illegal status transition'));
  });

  it('6. ERP1-C3: Rejects unknown status value with 400 and unknown serial with 404', async () => {
    const badStatus = await request(app, 'PATCH', '/api/serials/TV55-2611-0006/status', {
      status: 'scrapped'
    });
    assert.equal(badStatus.status, 400);

    const notFound = await request(app, 'PATCH', '/api/serials/NON-EXISTENT-9999/status', {
      status: 'reserved'
    });
    assert.equal(notFound.status, 404);
  });

  it('7. ERP1-C3: Allows full valid lifecycle: in_stock -> reserved -> sold -> returned -> in_stock', async () => {
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

  it('8. ERP1-C3: POST /api/serials/allocate reserves exact qty of in_stock serials', async () => {
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

  it('9. ERP1-C3: POST /api/serials/allocate returns 400 if not enough in_stock serials or invalid input', async () => {
    const badQty = await request(app, 'POST', '/api/serials/allocate', { sku: 'SKU-0001', qty: 0 });
    assert.equal(badQty.status, 400);

    const tooMany = await request(app, 'POST', '/api/serials/allocate', { sku: 'SKU-0001', qty: 999 });
    assert.equal(tooMany.status, 400);
    assert.ok(tooMany.body.error.includes('Not enough in_stock serials'));
  });
});
