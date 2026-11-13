const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Disable auth enforcement for test environment
process.env.AUTH_REQUIRED = 'false';

const performanceRouter = require('../routes/performance');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', performanceRouter);
  return app;
}

async function request(app, method, url) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
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

describe('ERP6 Sales Performance Leaderboard API Test Suite ([ERP6-D3])', () => {
  const app = createTestApp();

  after(async () => {
    if (performanceRouter.pool) {
      await performanceRouter.pool.end();
    }
  });

  it('GET /api/performance/sales returns sales reps ranked by total_sales descending', async () => {
    const res = await request(app, 'GET', '/api/performance/sales');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 4);

    const rows = res.body.data;

    // Verify ordering by total_sales descending
    for (let i = 0; i < rows.length - 1; i++) {
      assert.ok(
        rows[i].total_sales >= rows[i + 1].total_sales,
        `Row ${i} (${rows[i].total_sales}) should be >= Row ${i + 1} (${rows[i + 1].total_sales})`
      );
      assert.equal(rows[i].rank, i + 1);
    }

    // Verify expected top performer overall (Anjali Rao with ₹2,00,000 from INV-0094)
    const topPerformer = rows[0];
    assert.equal(topPerformer.rank, 1);
    assert.equal(topPerformer.sales_rep_id, 'EMP-0004');
    assert.equal(topPerformer.name, 'Anjali Rao');
    assert.equal(topPerformer.total_sales, 200000);
    assert.equal(topPerformer.commission, 6000);
    assert.equal(topPerformer.deals, 1);
  });

  it('GET /api/performance/sales returns required fields (name, deals, total_sales, commission)', async () => {
    const res = await request(app, 'GET', '/api/performance/sales');
    assert.equal(res.status, 200);
    const item = res.body.data[0];

    assert.ok(typeof item.name === 'string' && item.name.length > 0, 'name should be non-empty string');
    assert.ok(typeof item.deals === 'number', 'deals should be a number');
    assert.ok(typeof item.total_sales === 'number', 'total_sales should be a number');
    assert.ok(typeof item.commission === 'number', 'commission should be a number');
    assert.ok(typeof item.rank === 'number', 'rank should be a number');
    assert.equal(item.number_of_deals, item.deals);
  });

  it('GET /api/performance/sales?month=2026-10 correctly filters and ranks October deals', async () => {
    const res = await request(app, 'GET', '/api/performance/sales?month=2026-10');
    assert.equal(res.status, 200);
    const rows = res.body.data;

    // In October: Neha Sharma (150,000) > Vikram Singh (75,000) > Rohan Kulkarni (45,000) > Anjali Rao (0)
    assert.equal(rows[0].sales_rep_id, 'EMP-0002');
    assert.equal(rows[0].name, 'Neha Sharma');
    assert.equal(rows[0].total_sales, 150000);
    assert.equal(rows[0].commission, 4500);
    assert.equal(rows[0].deals, 1);

    assert.equal(rows[1].sales_rep_id, 'EMP-0003');
    assert.equal(rows[1].total_sales, 75000);

    assert.equal(rows[2].sales_rep_id, 'EMP-0001');
    assert.equal(rows[2].total_sales, 45000);

    assert.equal(rows[3].sales_rep_id, 'EMP-0004');
    assert.equal(rows[3].total_sales, 0);
    assert.equal(rows[3].deals, 0);
  });

  it('GET /api/performance/sales?month=2026-11 correctly filters and ranks November deals', async () => {
    const res = await request(app, 'GET', '/api/performance/sales?month=2026-11');
    assert.equal(res.status, 200);
    const rows = res.body.data;

    // In November: Anjali Rao (200,000) > Rohan Kulkarni (80,000)
    assert.equal(rows[0].sales_rep_id, 'EMP-0004');
    assert.equal(rows[0].name, 'Anjali Rao');
    assert.equal(rows[0].total_sales, 200000);
    assert.equal(rows[0].commission, 6000);

    assert.equal(rows[1].sales_rep_id, 'EMP-0001');
    assert.equal(rows[1].total_sales, 80000);
  });
});
