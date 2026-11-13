const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Disable auth for testing
process.env.AUTH_REQUIRED = 'false';

const stockRouter = require('../routes/stock');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', stockRouter);
  return app;
}

// Ephemeral port request helper
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

describe('ERP1-B3 Transfers & Stock Check Test Suite', () => {
  const app = createTestApp();

  it('1. GET /api/stock/check returns correct availability and total', async () => {
    // Check SKU-0001 (total stock is at least 50)
    const res1 = await request(app, 'GET', '/api/stock/check?sku=SKU-0001&qty=50');
    assert.equal(res1.status, 200);
    assert.equal(typeof res1.body.total, 'number');
    assert.equal(res1.body.available, true);
    assert.ok(res1.body.total >= 50);

    // Check SKU-0003 (total stock is 3, requested 5 -> false)
    const res2 = await request(app, 'GET', '/api/stock/check?sku=SKU-0003&qty=5');
    assert.equal(res2.status, 200);
    assert.equal(res2.body.total, 3);
    assert.equal(res2.body.available, false);
  });

  it('2. GET /api/stock/check validates parameters (missing sku, invalid qty)', async () => {
    // Missing SKU
    const res1 = await request(app, 'GET', '/api/stock/check?qty=10');
    assert.equal(res1.status, 400);

    // Missing qty
    const res2 = await request(app, 'GET', '/api/stock/check?sku=SKU-0001');
    assert.equal(res2.status, 400);

    // Non-positive qty
    const res3 = await request(app, 'GET', '/api/stock/check?sku=SKU-0001&qty=0');
    assert.equal(res3.status, 400);
    const res4 = await request(app, 'GET', '/api/stock/check?sku=SKU-0001&qty=-5');
    assert.equal(res4.status, 400);
  });

  it('3. POST /api/transfers successfully transfers stock between warehouses and logs 2 movements', async () => {
    // Get initial stock of SKU-0002
    const initStockRes = await request(app, 'GET', '/api/stock?sku=SKU-0002');
    assert.equal(initStockRes.status, 200);
    const wh1Before = initStockRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-01').quantity;
    const wh2Before = initStockRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-02').quantity;

    // Transfer 5 units from WH-01 to WH-02
    const transferRes = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0002',
      from_wh: 'WH-01',
      to_wh: 'WH-02',
      qty: 5
    });

    assert.equal(transferRes.status, 200);
    assert.equal(transferRes.body.data.sku, 'SKU-0002');
    assert.equal(transferRes.body.data.from_wh, 'WH-01');
    assert.equal(transferRes.body.data.to_wh, 'WH-02');
    assert.equal(transferRes.body.data.qty, 5);
    assert.equal(transferRes.body.data.source_new_stock, wh1Before - 5);
    assert.equal(transferRes.body.data.target_new_stock, wh2Before + 5);

    // Verify stock table reflects the change
    const afterStockRes = await request(app, 'GET', '/api/stock?sku=SKU-0002');
    const wh1After = afterStockRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-01').quantity;
    const wh2After = afterStockRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-02').quantity;
    assert.equal(wh1After, wh1Before - 5);
    assert.equal(wh2After, wh2Before + 5);

    // Verify two movement rows exist in /api/stock/movements
    const movRes = await request(app, 'GET', '/api/stock/movements?sku=SKU-0002');
    assert.equal(movRes.status, 200);
    const destMov = movRes.body.data.find(m => m.warehouse_id === 'WH-02' && m.delta === 5 && m.reason.includes('Transfer from WH-01'));
    const srcMov = movRes.body.data.find(m => m.warehouse_id === 'WH-01' && m.delta === -5 && m.reason.includes('Transfer to WH-02'));
    assert.ok(destMov, 'Destination movement (+5) must be logged');
    assert.ok(srcMov, 'Source movement (-5) must be logged');
  });

  it('4. POST /api/transfers rejects transfer when source warehouse has insufficient stock', async () => {
    // Current stock for SKU-0003 in WH-03 is 0
    const res = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0003',
      from_wh: 'WH-03',
      to_wh: 'WH-01',
      qty: 1
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /insufficient/i);
  });

  it('5. POST /api/transfers rejects same source and destination warehouse', async () => {
    const res = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0001',
      from_wh: 'WH-01',
      to_wh: 'WH-01',
      qty: 5
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.match(res.body.error, /same/i);
  });

  it('6. POST /api/transfers validates input fields (missing SKU, warehouse, non-positive qty)', async () => {
    // Missing SKU
    const res1 = await request(app, 'POST', '/api/transfers', {
      from_wh: 'WH-01',
      to_wh: 'WH-02',
      qty: 5
    });
    assert.equal(res1.status, 400);

    // Missing from_wh
    const res2 = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0001',
      to_wh: 'WH-02',
      qty: 5
    });
    assert.equal(res2.status, 400);

    // Missing to_wh
    const res3 = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0001',
      from_wh: 'WH-01',
      qty: 5
    });
    assert.equal(res3.status, 400);

    // Zero qty
    const res4 = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0001',
      from_wh: 'WH-01',
      to_wh: 'WH-02',
      qty: 0
    });
    assert.equal(res4.status, 400);

    // Negative qty
    const res5 = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0001',
      from_wh: 'WH-01',
      to_wh: 'WH-02',
      qty: -5
    });
    assert.equal(res5.status, 400);
  });

  it('7. POST /api/transfers returns 404 for unknown SKU or warehouse', async () => {
    // Unknown SKU
    const resSku = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-9999',
      from_wh: 'WH-01',
      to_wh: 'WH-02',
      qty: 1
    });
    assert.equal(resSku.status, 404);

    // Unknown from_wh
    const resWh1 = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0001',
      from_wh: 'WH-99',
      to_wh: 'WH-02',
      qty: 1
    });
    assert.equal(resWh1.status, 404);

    // Unknown to_wh
    const resWh2 = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0001',
      from_wh: 'WH-01',
      to_wh: 'WH-99',
      qty: 1
    });
    assert.equal(resWh2.status, 404);
  });

  it('8. Failed transfer leaves warehouse quantities unchanged (transaction rollback guarantee)', async () => {
    // Check initial stock for SKU-0003
    const beforeRes = await request(app, 'GET', '/api/stock?sku=SKU-0003');
    const wh1Before = beforeRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-01').quantity;
    const wh3Before = beforeRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-03').quantity;

    // Attempt illegal transfer (WH-03 has 0, requesting 10)
    const failRes = await request(app, 'POST', '/api/transfers', {
      sku: 'SKU-0003',
      from_wh: 'WH-03',
      to_wh: 'WH-01',
      qty: 10
    });
    assert.equal(failRes.status, 400);

    // Verify quantities are completely unchanged
    const afterRes = await request(app, 'GET', '/api/stock?sku=SKU-0003');
    const wh1After = afterRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-01').quantity;
    const wh3After = afterRes.body.data.warehouses.find(w => w.warehouse_id === 'WH-03').quantity;

    assert.equal(wh1After, wh1Before);
    assert.equal(wh3After, wh3Before);
  });
});
