const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Disable auth enforcement for test environment
process.env.AUTH_REQUIRED = 'false';

const payrollRouter = require('../routes/payroll');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp6_db');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', payrollRouter);
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

describe('ERP6 Payroll API & Safeguards Test Suite ([ERP6-C1] & [ERP6-C3])', () => {
  const app = createTestApp();

  before(async () => {
    // Ensure clean state for test month 2026-12
    await pool.query("DELETE FROM salary_slips WHERE month = '2026-12'");
  });

  after(async () => {
    // Clean up test month records
    await pool.query("DELETE FROM salary_slips WHERE month = '2026-12'");
    await pool.end();
    if (payrollRouter.pool) {
      await payrollRouter.pool.end();
    }
  });

  it('GET /api/salary-slips returns seeded salary slips for 2026-11', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-11');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    const rohanSlip = res.body.data.find(s => s.employee_id === 'EMP-0001');
    assert.ok(rohanSlip, 'EMP-0001 slip must exist in 2026-11');
    assert.equal(rohanSlip.base_salary, 45000.00);
    assert.equal(rohanSlip.hra, 18000.00); // 40%
    assert.equal(rohanSlip.allowances, 2000.00);
    assert.equal(rohanSlip.pf_deduction, 5400.00); // 12%
    assert.equal(rohanSlip.net_pay, 61200.00);
  });

  it('GET /api/salary-slips/:id returns single salary slip with joined department and employee name', async () => {
    const res = await request(app, 'GET', '/api/salary-slips/SLIP-2611-0001');
    assert.equal(res.status, 200);
    const slip = res.body.data;
    assert.equal(slip.id, 'SLIP-2611-0001');
    assert.equal(slip.employee_id, 'EMP-0001');
    assert.equal(slip.employee_name, 'Rohan Kulkarni');
    assert.equal(slip.department_name, 'Sales');
  });

  it('GET /api/salary-slips/:id returns 404 for unknown slip ID', async () => {
    const res = await request(app, 'GET', '/api/salary-slips/SLIP-9999-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
    assert.match(res.body.error, /not found/i);
  });

  it('PATCH /api/salary-slips/:id/paid marks slip as paid ([ERP6-C3])', async () => {
    const res = await request(app, 'PATCH', '/api/salary-slips/SLIP-2611-0003/paid');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'SLIP-2611-0003');
    assert.equal(res.body.data.status, 'paid');

    // Verify DB update
    const dbCheck = await pool.query("SELECT status FROM salary_slips WHERE id = 'SLIP-2611-0003'");
    assert.equal(dbCheck.rows[0].status, 'paid');
  });

  it('PATCH /api/salary-slips/:id/paid returns 404 for non-existent slip', async () => {
    const res = await request(app, 'PATCH', '/api/salary-slips/SLIP-9999-9999/paid');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('POST /api/payroll/generate creates salary slips for active employees and posts ledger', async () => {
    const res = await request(app, 'POST', '/api/payroll/generate', { month: '2026-12' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.month, '2026-12');
    assert.ok(res.body.data.count >= 12, 'Must generate slips for all 12 active employees');
    assert.ok(res.body.data.total_payroll_cost > 0, 'Total payroll cost must be calculated');
    assert.ok(Array.isArray(res.body.data.slips));
  });

  it('POST /api/payroll/generate safeguard: duplicate run returns HTTP 409 Conflict ([ERP6-C3])', async () => {
    // Attempting to generate 2026-12 again without ?force=true
    const res = await request(app, 'POST', '/api/payroll/generate', { month: '2026-12' });
    assert.equal(res.status, 409);
    assert.ok(res.body.error);
    assert.match(res.body.error, /already generated/i);
  });

  it('POST /api/payroll/generate?force=true regenerates slips successfully ([ERP6-C3])', async () => {
    // Regenerating 2026-12 with ?force=true must succeed
    const res = await request(app, 'POST', '/api/payroll/generate?force=true', { month: '2026-12' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.month, '2026-12');
    assert.ok(res.body.data.count >= 12);
    assert.ok(res.body.data.total_payroll_cost > 0);
  });
});
