const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');

// Connect to ERP-6 database (erp6_db on Port 5206)
const pool = makePool('erp6_db');

// Protect all payroll routes with JWT authentication middleware
router.use(requireAuth);

/**
 * Standard projection for salary slips with joined employee & department metadata.
 */
const SALARY_SLIP_SELECT = `
  s.id,
  s.employee_id,
  e.name AS employee_name,
  e.email,
  e.department_id,
  d.name AS department_name,
  e.role_title,
  e.join_date,
  s.month,
  s.base_salary,
  s.hra,
  s.allowances,
  s.pf_deduction,
  s.absent_days,
  s.absent_deduction,
  s.commission,
  (s.base_salary + s.hra + s.allowances + s.commission) AS gross_pay,
  (s.pf_deduction + s.absent_deduction) AS total_deductions,
  s.net_pay,
  s.status,
  s.generated_at
`;

const SALARY_SLIP_FROM = `
  salary_slips s
  JOIN employees e ON e.id = s.employee_id
  LEFT JOIN departments d ON d.id = e.department_id
`;

/**
 * Formats database numeric fields into rounded JavaScript numbers.
 */
function formatSlipRow(row) {
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: row.employee_name || null,
    email: row.email || null,
    department_id: row.department_id || null,
    department_name: row.department_name || null,
    role_title: row.role_title || null,
    join_date: row.join_date ? String(row.join_date).slice(0, 10) : null,
    month: row.month,
    base_salary: Number(parseFloat(row.base_salary || 0).toFixed(2)),
    hra: Number(parseFloat(row.hra || 0).toFixed(2)),
    allowances: Number(parseFloat(row.allowances || 0).toFixed(2)),
    commission: Number(parseFloat(row.commission || 0).toFixed(2)),
    gross_pay: Number(parseFloat(row.gross_pay || 0).toFixed(2)),
    pf_deduction: Number(parseFloat(row.pf_deduction || 0).toFixed(2)),
    absent_days: parseInt(row.absent_days || 0, 10),
    absent_deduction: Number(parseFloat(row.absent_deduction || 0).toFixed(2)),
    total_deductions: Number(parseFloat(row.total_deductions || 0).toFixed(2)),
    net_pay: Number(parseFloat(row.net_pay || 0).toFixed(2)),
    status: row.status,
    generated_at: row.generated_at
  };
}

/**
 * POST /api/payroll/generate
 * Generates monthly salary slips for all active employees.
 * [ERP6-C3] Safeguards:
 * - Duplicate generation blocked with 409 Conflict unless ?force=true.
 * - Side effect: Posts total salary cost to ERP-5 General Ledger (/api/ledger/auto).
 * Body: { month: "YYYY-MM" }
 * Query: ?force=true
 */
router.post('/payroll/generate', async (req, res) => {
  const { month } = req.body;
  const force = req.query.force === 'true' || req.query.force === true;

  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({
      error: 'Valid month in YYYY-MM format is required (e.g., 2026-11)'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Safeguard: Check if payroll was already generated for this month
    const existingRes = await client.query(
      'SELECT COUNT(*)::int AS count FROM salary_slips WHERE month = $1',
      [month]
    );
    const existingCount = existingRes.rows[0].count;

    if (existingCount > 0 && !force) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Payroll already generated for this month. Use ?force=true to regenerate.'
      });
    }

    // 2. If force=true, remove existing slips for the month to safely regenerate
    if (existingCount > 0 && force) {
      await client.query('DELETE FROM salary_slips WHERE month = $1', [month]);
    }

    // 3. Fetch all active employees
    const empRes = await client.query(
      `SELECT id, name, email, department_id, role_title, base_salary, join_date 
       FROM employees 
       WHERE active = TRUE 
       ORDER BY id ASC`
    );

    if (empRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active employees found to generate payroll for' });
    }

    // 4. Fetch commissions aggregated by sales rep for this month
    const commRes = await client.query(
      `SELECT sales_rep_id, SUM(commission_amount)::numeric AS total_commission 
       FROM commissions 
       WHERE month = $1 
       GROUP BY sales_rep_id`,
      [month]
    );

    const commissionsMap = {};
    for (const c of commRes.rows) {
      commissionsMap[c.sales_rep_id] = parseFloat(c.total_commission) || 0;
    }

    // 5. Fetch absent days from attendance table if it exists
    let absentMap = {};
    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance'`
    );
    if (tableCheck.rows.length > 0) {
      const attRes = await client.query(
        `SELECT employee_id, COUNT(*)::int AS absent_days 
         FROM attendance 
         WHERE TO_CHAR(date, 'YYYY-MM') = $1 AND status = 'absent' 
         GROUP BY employee_id`,
        [month]
      );
      for (const a of attRes.rows) {
        absentMap[a.employee_id] = a.absent_days;
      }
    }

    // 6. Generate and insert slips using standard statutory formulas
    const generatedSlips = [];
    let totalPayrollCost = 0;

    for (const emp of empRes.rows) {
      const baseSalary = parseFloat(emp.base_salary) || 0;
      const hra = Number((baseSalary * 0.40).toFixed(2)); // 40% of Base Salary
      const allowances = 2000.00; // Fixed allowances
      const commission = Number((commissionsMap[emp.id] || 0).toFixed(2));
      const grossPay = Number((baseSalary + hra + allowances + commission).toFixed(2));

      const pfDeduction = Number((baseSalary * 0.12).toFixed(2)); // 12% PF
      const absentDays = absentMap[emp.id] || 0;
      const absentDeduction = Number(((baseSalary / 30) * absentDays).toFixed(2));
      const totalDeductions = Number((pfDeduction + absentDeduction).toFixed(2));

      const netPay = Number((grossPay - totalDeductions).toFixed(2));

      const insertRes = await client.query(
        `INSERT INTO salary_slips (
           employee_id, month, base_salary, hra, allowances, pf_deduction,
           absent_days, absent_deduction, commission, net_pay, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'generated')
         RETURNING *`,
        [
          emp.id, month, baseSalary, hra, allowances, pfDeduction,
          absentDays, absentDeduction, commission, netPay
        ]
      );

      const inserted = insertRes.rows[0];
      totalPayrollCost += grossPay;

      generatedSlips.push({
        id: inserted.id,
        employee_id: emp.id,
        employee_name: emp.name,
        role_title: emp.role_title,
        month: month,
        base_salary: baseSalary,
        hra: hra,
        allowances: allowances,
        commission: commission,
        gross_pay: grossPay,
        pf_deduction: pfDeduction,
        absent_days: absentDays,
        absent_deduction: absentDeduction,
        total_deductions: totalDeductions,
        net_pay: netPay,
        status: inserted.status,
        generated_at: inserted.generated_at
      });
    }

    await client.query('COMMIT');

    totalPayrollCost = Number(totalPayrollCost.toFixed(2));

    // 7. Side Effect: Post total payroll cost to ERP-5 General Ledger (/api/ledger/auto)
    try {
      await callService('erp5', '/api/ledger/auto', {
        method: 'POST',
        body: {
          type: 'salary',
          reference: month,
          amount: totalPayrollCost,
          description: `Payroll cost for ${month}`
        },
        mock: 'ledger'
      });
    } catch (ledgerErr) {
      console.warn(`[integration-error] ERP-5 ledger auto posting failed for month ${month}: ${ledgerErr.message}`);
    }

    return res.status(200).json({
      data: {
        month: month,
        count: generatedSlips.length,
        total_payroll_cost: totalPayrollCost,
        slips: generatedSlips
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[erp6] POST /payroll/generate error:`, err);
    return res.status(500).json({ error: err.message || 'Failed to generate payroll' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/salary-slips
 * Lists salary slips with optional month and employee_id filters.
 */
router.get('/salary-slips', async (req, res) => {
  try {
    const { month, employee_id } = req.query;
    const conditions = [];
    const values = [];

    if (month && month.trim()) {
      values.push(month.trim());
      conditions.push(`s.month = $${values.length}`);
    }

    if (employee_id && employee_id.trim()) {
      values.push(employee_id.trim());
      conditions.push(`s.employee_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT ${SALARY_SLIP_SELECT}
      FROM ${SALARY_SLIP_FROM}
      ${whereClause}
      ORDER BY s.id ASC
    `;

    const result = await pool.query(query, values);
    return res.json({
      data: result.rows.map(formatSlipRow)
    });
  } catch (err) {
    console.error('[erp6] GET /salary-slips error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch salary slips' });
  }
});

/**
 * GET /api/salary-slips/:id
 * Retrieves a single salary slip by slip ID (e.g., SLIP-2611-0001).
 */
router.get('/salary-slips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT ${SALARY_SLIP_SELECT}
      FROM ${SALARY_SLIP_FROM}
      WHERE s.id = $1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Salary slip '${id}' not found` });
    }

    return res.json({
      data: formatSlipRow(result.rows[0])
    });
  } catch (err) {
    console.error(`[erp6] GET /salary-slips/${req.params.id} error:`, err);
    return res.status(500).json({ error: err.message || 'Failed to fetch salary slip' });
  }
});

/**
 * PATCH /api/salary-slips/:id/paid
 * [ERP6-C3] Marks an individual salary slip as paid.
 */
router.patch('/salary-slips/:id/paid', async (req, res) => {
  try {
    const { id } = req.params;

    const updateRes = await pool.query(
      `UPDATE salary_slips 
       SET status = 'paid' 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: `Salary slip '${id}' not found` });
    }

    // Fetch joined record to return complete updated data
    const query = `
      SELECT ${SALARY_SLIP_SELECT}
      FROM ${SALARY_SLIP_FROM}
      WHERE s.id = $1
    `;
    const fullRes = await pool.query(query, [id]);

    return res.json({
      data: formatSlipRow(fullRes.rows[0])
    });
  } catch (err) {
    console.error(`[erp6] PATCH /salary-slips/${req.params.id}/paid error:`, err);
    return res.status(500).json({ error: err.message || 'Failed to update salary slip status' });
  }
});

module.exports = router;
module.exports.pool = pool;

