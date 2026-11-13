const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Disable auth enforcement for test environment
process.env.AUTH_REQUIRED = 'false';

const commissionsRouter = require('../routes/commissions');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp6_db');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', commissionsRouter);
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

describe('ERP6 Commissions API Test Suite ([ERP6-D1])', () => {
  const app = createTestApp();

  // Clean up any test invoices inserted during previous test runs so sync starts clean
  before(async () => {
    await pool.query(
      `DELETE FROM commissions WHERE invoice_id IN ('INV-0001', 'INV-0002', 'INV-0003')`
    );
  });

  after(async () => {
    await pool.query(
      `DELETE FROM commissions WHERE invoice_id IN ('INV-0001', 'INV-0002', 'INV-0003')`
    );
    await pool.end();
    if (commissionsRouter.pool) {
      await commissionsRouter.pool.end();
    }
  });

  it('GET /api/commissions returns seeded commissions', async () => {
    const res = await request(app, 'GET', '/api/commissions');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    // Check seed commission properties
    const sample = res.body.data.find(c => c.id === 'COMM-0001');
    assert.ok(sample, 'COMM-0001 should exist in seeded data');
    assert.equal(sample.sales_rep_id, 'EMP-0001');
    assert.equal(sample.sales_rep_name, 'Rohan Kulkarni');
    assert.equal(sample.invoice_id, 'INV-0091');
    assert.equal(sample.rate_percent, 2);
    assert.equal(sample.commission_amount, 900);
    assert.equal(sample.month, '2026-10');
  });

  it('GET /api/commissions?sales_rep_id=EMP-0002 filters by sales representative', async () => {
    const res = await request(app, 'GET', '/api/commissions?sales_rep_id=EMP-0002');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    for (const comm of res.body.data) {
      assert.equal(comm.sales_rep_id, 'EMP-0002');
      assert.equal(comm.sales_rep_name, 'Neha Sharma');
    }
  });

  it('GET /api/commissions?month=2026-10 filters by month', async () => {
    const res = await request(app, 'GET', '/api/commissions?month=2026-10');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    for (const comm of res.body.data) {
      assert.equal(comm.month, '2026-10');
    }
  });

  it('GET /api/commissions/:id returns single commission with rep name', async () => {
    const res = await request(app, 'GET', '/api/commissions/COMM-0002');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'COMM-0002');
    assert.equal(res.body.data.sales_rep_id, 'EMP-0002');
    assert.equal(res.body.data.sales_rep_name, 'Neha Sharma');
    assert.equal(res.body.data.rate_percent, 3);
    assert.equal(res.body.data.invoice_amount, 150000);
    assert.equal(res.body.data.commission_amount, 4500);
  });

  it('GET /api/commissions/:id returns 404 for unknown commission id', async () => {
    const res = await request(app, 'GET', '/api/commissions/COMM-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error.includes('not found'));
  });

  it('POST /api/commissions/sync fetches paid invoices and applies correct rates (2% vs 3%)', async () => {
    const res = await request(app, 'POST', '/api/commissions/sync');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.added, 3);
    assert.equal(res.body.data.total_invoices_checked, 3);

    // Verify items inserted
    const items = res.body.data.items;
    assert.equal(items.length, 3);

    // INV-0001: 50,000 INR <= 100,000 -> 2% rate = 1,000
    const inv1 = items.find(i => i.invoice_id === 'INV-0001');
    assert.ok(inv1);
    assert.equal(inv1.sales_rep_id, 'EMP-0001');
    assert.equal(inv1.invoice_amount, 50000);
    assert.equal(inv1.rate_percent, 2);
    assert.equal(inv1.commission_amount, 1000);
    assert.equal(inv1.month, '2026-11');

    // INV-0002: 120,000 INR > 100,000 -> 3% rate = 3,600
    const inv2 = items.find(i => i.invoice_id === 'INV-0002');
    assert.ok(inv2);
    assert.equal(inv2.sales_rep_id, 'EMP-0002');
    assert.equal(inv2.invoice_amount, 120000);
    assert.equal(inv2.rate_percent, 3);
    assert.equal(inv2.commission_amount, 3600);
    assert.equal(inv2.month, '2026-11');

    // INV-0003: 85,000 INR <= 100,000 -> 2% rate = 1,700
    const inv3 = items.find(i => i.invoice_id === 'INV-0003');
    assert.ok(inv3);
    assert.equal(inv3.sales_rep_id, 'EMP-0003');
    assert.equal(inv3.invoice_amount, 85000);
    assert.equal(inv3.rate_percent, 2);
    assert.equal(inv3.commission_amount, 1700);
    assert.equal(inv3.month, '2026-11');
  });

  it('POST /api/commissions/sync is idempotent: syncing twice adds nothing the second time', async () => {
    // Second sync invocation immediately following the first
    const res = await request(app, 'POST', '/api/commissions/sync');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.added, 0);
    assert.equal(res.body.data.items.length, 0);
  });
});
