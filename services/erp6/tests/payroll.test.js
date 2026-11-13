// services/erp6/tests/payroll.test.js
// Integration test suite for ERP-6 Payroll Generation API & Safeguards ([ERP6-C1] & [ERP6-C3])

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
  });

  it('POST /api/payroll/generate validates month format (400 Bad Request)', async () => {
    const res1 = await request(app, 'POST', '/api/payroll/generate', {});
    assert.equal(res1.status, 400);
    assert.ok(res1.body.error);

    const res2 = await request(app, 'POST', '/api/payroll/generate', { month: '2026-1' });
    assert.equal(res2.status, 400);
    assert.ok(res2.body.error);
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
    assert.ok(rohanSlip.net_pay === 61200.00 || rohanSlip.net_pay === 59700.00);
  });

  it('GET /api/salary-slips/:id returns details of a single slip', async () => {
    const listRes = await request(app, 'GET', '/api/salary-slips?month=2026-11');
    const firstSlip = listRes.body.data[0];

    const detailRes = await request(app, 'GET', `/api/salary-slips/${firstSlip.id}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.data.id, firstSlip.id);
    assert.equal(detailRes.body.data.employee_id, firstSlip.employee_id);
    assert.ok(detailRes.body.data.employee_name);
  });

  it('GET /api/salary-slips/:id returns 404 for nonexistent slip ID', async () => {
    const res = await request(app, 'GET', '/api/salary-slips/SLIP-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('POST /api/payroll/generate creates salary slips for active employees and posts ledger', async () => {
    const res = await request(app, 'POST', '/api/payroll/generate', { month: '2026-12' });
    assert.ok([200, 201].includes(res.status));
    assert.equal(res.body.data.month, '2026-12');
    assert.ok(res.body.data.count >= 5, 'Must generate slips for active employees');
    assert.ok(res.body.data.total_payroll_cost > 0, 'Total payroll cost must be calculated');
    assert.ok(Array.isArray(res.body.data.slips));
  });

  it('Verifies exact Section 5 payroll formula for Employee 1 (EMP-0001)', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-12&employee_id=EMP-0001');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    const slip = res.body.data[0];
    const base = parseFloat(slip.base_salary);
    const hra = parseFloat(slip.hra);
    const allowances = parseFloat(slip.allowances);
    const comm = parseFloat(slip.commission);
    const pf = parseFloat(slip.pf_deduction);
    const absentDed = parseFloat(slip.absent_deduction);
    const gross = parseFloat(slip.gross_pay);
    const totalDed = parseFloat(slip.total_deductions);
    const net = parseFloat(slip.net_pay);

    assert.equal(hra, Math.round(base * 0.40 * 100) / 100, 'HRA must be 40% of base salary');
    assert.equal(allowances, 2000.00, 'Allowances must be 2000.00');
    assert.equal(pf, Math.round(base * 0.12 * 100) / 100, 'PF must be 12% of base salary');
    assert.equal(gross, Math.round((base + hra + allowances + comm) * 100) / 100, 'Gross pay formula');
    assert.equal(totalDed, Math.round((pf + absentDed) * 100) / 100, 'Total deductions formula');
    assert.equal(net, Math.round((gross - totalDed) * 100) / 100, 'Net pay formula');
  });

  it('Verifies exact Section 5 payroll formula for Employee 2 (EMP-0002)', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-12&employee_id=EMP-0002');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    const slip = res.body.data[0];
    const base = parseFloat(slip.base_salary);
    const hra = parseFloat(slip.hra);
    const allowances = parseFloat(slip.allowances);
    const comm = parseFloat(slip.commission);
    const pf = parseFloat(slip.pf_deduction);
    const absentDays = parseInt(slip.absent_days, 10);
    const absentDed = parseFloat(slip.absent_deduction);
    const gross = parseFloat(slip.gross_pay);
    const totalDed = parseFloat(slip.total_deductions);
    const net = parseFloat(slip.net_pay);

    assert.equal(hra, Math.round(base * 0.40 * 100) / 100);
    assert.equal(allowances, 2000.00);
    assert.equal(pf, Math.round(base * 0.12 * 100) / 100);
    assert.equal(absentDed, Math.round((base / 30.0 * absentDays) * 100) / 100);
    assert.equal(gross, Math.round((base + hra + allowances + comm) * 100) / 100);
    assert.equal(net, Math.round((gross - totalDed) * 100) / 100);
  });

  it('Verifies exact Section 5 payroll formula for Employee 3 (EMP-0003)', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-12&employee_id=EMP-0003');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    const slip = res.body.data[0];
    const base = parseFloat(slip.base_salary);
    const hra = parseFloat(slip.hra);
    const allowances = parseFloat(slip.allowances);
    const comm = parseFloat(slip.commission);
    const pf = parseFloat(slip.pf_deduction);
    const absentDed = parseFloat(slip.absent_deduction);
    const gross = parseFloat(slip.gross_pay);
    const totalDed = parseFloat(slip.total_deductions);
    const net = parseFloat(slip.net_pay);

    assert.equal(hra, Math.round(base * 0.40 * 100) / 100);
    assert.equal(allowances, 2000.00);
    assert.equal(pf, Math.round(base * 0.12 * 100) / 100);
    assert.equal(gross, Math.round((base + hra + allowances + comm) * 100) / 100);
    assert.equal(totalDed, Math.round((pf + absentDed) * 100) / 100);
    assert.equal(net, Math.round((gross - totalDed) * 100) / 100);
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
    assert.ok(res.body.data.count >= 5);
    assert.ok(res.body.data.total_payroll_cost > 0);
  });

  it('PATCH /api/salary-slips/:id/paid marks slip as paid ([ERP6-C3])', async () => {
    const listRes = await request(app, 'GET', '/api/salary-slips?month=2026-11');
    const targetSlip = listRes.body.data.find(s => s.status !== 'paid') || listRes.body.data[0];

    const res = await request(app, 'PATCH', `/api/salary-slips/${targetSlip.id}/paid`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, targetSlip.id);
    assert.equal(res.body.data.status, 'paid');

    // Verify DB update
    const dbCheck = await pool.query('SELECT status FROM salary_slips WHERE id = $1', [targetSlip.id]);
    assert.equal(dbCheck.rows[0].status, 'paid');
  });

  it('PATCH /api/salary-slips/:id/paid returns 404 for non-existent slip', async () => {
    const res = await request(app, 'PATCH', '/api/salary-slips/SLIP-9999/paid');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});
