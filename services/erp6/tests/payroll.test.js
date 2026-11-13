// services/erp6/tests/payroll.test.js
// Integration test suite for ERP-6 Payroll Generation API ([ERP6-C1])

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

describe('ERP6 Payroll Generation API Test Suite ([ERP6-C1])', () => {
  const app = createTestApp();

  before(async () => {
    // Ensure clean state for test month 2026-11
    await pool.query(`DELETE FROM salary_slips WHERE month = '2026-11'`);
  });

  after(async () => {
    // Clean up test data if needed
  });

  it('POST /api/payroll/generate validates month format (400 Bad Request)', async () => {
    const res1 = await request(app, 'POST', '/api/payroll/generate', {});
    assert.equal(res1.status, 400);
    assert.ok(res1.body.error);

    const res2 = await request(app, 'POST', '/api/payroll/generate', { month: '2026-1' });
    assert.equal(res2.status, 400);
    assert.ok(res2.body.error);
  });

  it('POST /api/payroll/generate successfully creates salary slips for active employees (201 Created)', async () => {
    const res = await request(app, 'POST', '/api/payroll/generate', { month: '2026-11' });
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.equal(res.body.data.month, '2026-11');
    assert.ok(Array.isArray(res.body.data.slips));
    assert.ok(res.body.data.slips.length >= 5);
  });

  it('Verifies exact Section 5 payroll formula for Employee 1 (EMP-0001 with sales commission)', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-11&employee_id=EMP-0001');
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

    // Formula checks
    assert.equal(hra, Math.round(base * 0.40 * 100) / 100, 'HRA must be 40% of base salary');
    assert.equal(allowances, 2000.00, 'Allowances must be 2000.00');
    assert.equal(pf, Math.round(base * 0.12 * 100) / 100, 'PF must be 12% of base salary');
    assert.equal(gross, Math.round((base + hra + allowances + comm) * 100) / 100, 'Gross pay formula');
    assert.equal(totalDed, Math.round((pf + absentDed) * 100) / 100, 'Total deductions formula');
    assert.equal(net, Math.round((gross - totalDed) * 100) / 100, 'Net pay formula');
    assert.equal(net, Math.round((base + hra + allowances + comm - pf - absentDed) * 100) / 100);
  });

  it('Verifies exact Section 5 payroll formula for Employee 2 (EMP-0002 with absent day deduction)', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-11&employee_id=EMP-0002');
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
    assert.equal(net, Math.round((base + hra + allowances + comm - pf - absentDed) * 100) / 100);
  });

  it('Verifies exact Section 5 payroll formula for Employee 3 (EMP-0003 standard active employee)', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-11&employee_id=EMP-0003');
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
    assert.equal(net, Math.round((base + hra + allowances + comm - pf - absentDed) * 100) / 100);
  });

  it('GET /api/salary-slips lists slips and supports filtering', async () => {
    const res = await request(app, 'GET', '/api/salary-slips?month=2026-11');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);
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

  it('PATCH /api/salary-slips/:id/paid updates slip status to paid', async () => {
    const listRes = await request(app, 'GET', '/api/salary-slips?month=2026-11');
    const firstSlip = listRes.body.data[0];

    const paidRes = await request(app, 'PATCH', `/api/salary-slips/${firstSlip.id}/paid`);
    assert.equal(paidRes.status, 200);
    assert.equal(paidRes.body.data.status, 'paid');

    const verifyRes = await request(app, 'GET', `/api/salary-slips/${firstSlip.id}`);
    assert.equal(verifyRes.body.data.status, 'paid');
  });
});
