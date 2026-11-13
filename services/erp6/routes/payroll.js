// services/erp6/routes/payroll.js
// Payroll generation, duplicate safeguards, and salary slip management API
// ERP-6 HR & Workforce (Port 5206)
// Build Issues: [ERP6-C1] Payroll generation API & [ERP6-C3] Payroll safeguards and ledger posting

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

/**
 * Helper to handle database errors uniformly.
 */
function handleDbError(res, error, operation) {
  console.error(`[erp6] ${operation} failed:`, error.message);
  return res.status(500).json({ error: error.message || 'Internal server error' });
}

/**
 * Standard SQL SELECT projection for salary slips with employee and department details.
 */
const SALARY_SLIP_SELECT = `
  s.id,
  s.employee_id,
  e.name AS employee_name,
  e.email,
  e.department_id,
  d.name AS department_name,
  e.role_title,
  TO_CHAR(e.join_date, 'YYYY-MM-DD') AS join_date,
  s.month,
  s.base_salary,
  s.hra,
  s.allowances,
  s.commission,
  s.commission AS commissions,
  s.gross_pay,
  s.pf_deduction,
  s.absent_days,
  s.absent_deduction,
  s.total_deductions,
  s.net_pay,
  s.status,
  s.generated_at,
  s.created_at,
  s.updated_at
`;

const SALARY_SLIP_FROM = `
  salary_slips s
  JOIN employees e ON s.employee_id = e.id
  LEFT JOIN departments d ON e.department_id = d.id
`;

/**
 * Formats database numeric fields into rounded JavaScript numbers.
 */
function formatSlipRow(row) {
  const baseSalary = parseFloat(row.base_salary || 0);
  const hra = parseFloat(row.hra || 0);
  const allowances = parseFloat(row.allowances || 0);
  const commission = parseFloat(row.commission || 0);
  const grossPay = parseFloat(row.gross_pay || (baseSalary + hra + allowances + commission));
  const pfDeduction = parseFloat(row.pf_deduction || 0);
  const absentDays = parseInt(row.absent_days || 0, 10);
  const absentDeduction = parseFloat(row.absent_deduction || 0);
  const totalDeductions = parseFloat(row.total_deductions || (pfDeduction + absentDeduction));
  const netPay = parseFloat(row.net_pay || (grossPay - totalDeductions));

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
    base_salary: Number(baseSalary.toFixed(2)),
    hra: Number(hra.toFixed(2)),
    allowances: Number(allowances.toFixed(2)),
    commission: Number(commission.toFixed(2)),
    commissions: Number(commission.toFixed(2)),
    gross_pay: Number(grossPay.toFixed(2)),
    pf_deduction: Number(pfDeduction.toFixed(2)),
    absent_days: absentDays,
    absent_deduction: Number(absentDeduction.toFixed(2)),
    total_deductions: Number(totalDeductions.toFixed(2)),
    net_pay: Number(netPay.toFixed(2)),
    status: row.status,
    generated_at: row.generated_at,
    created_at: row.created_at || row.generated_at,
    updated_at: row.updated_at || row.generated_at
  };
}

/**
 * POST /payroll/generate
 * Query params: ?force=true
 * Body: { month: 'YYYY-MM' }
 *
 * [ERP6-C1] Creates salary slips for all active employees for the given month.
 * [ERP6-C3] Safeguards:
 * - Duplicate generation blocked with 409 Conflict unless ?force=true.
 * - Side effect: Posts total salary cost to ERP-5 General Ledger (/api/ledger/auto).
 */
router.post('/payroll/generate', async (req, res) => {
  const body = req.body || {};
  const { month } = body;
  const force = req.query.force === 'true' || req.query.force === true;

  // Validate month parameter (YYYY-MM)
  if (!month || typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month.trim())) {
    return res.status(400).json({ error: 'Valid month in YYYY-MM format is required (e.g., 2026-11)' });
  }

  const cleanMonth = month.trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Safeguard: Check if payroll was already generated for this month
    const existingCheck = await client.query(
      'SELECT COUNT(*)::int AS count FROM salary_slips WHERE month = $1',
      [cleanMonth]
    );
    const existingCount = existingCheck.rows[0].count;

    if (existingCount > 0 && !force) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Payroll already generated for this month. Use ?force=true to regenerate.'
      });
    }

    // 2. If force=true, remove existing slips for the month to safely regenerate
    if (existingCount > 0 && force) {
      await client.query('DELETE FROM salary_slips WHERE month = $1', [cleanMonth]);
    }

    // 3. Fetch all active employees
    const empResult = await client.query(
      `SELECT id, name, email, department_id, role_title, base_salary, join_date, active
       FROM employees
       WHERE active = TRUE
       ORDER BY id ASC`
    );

    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active employees found to generate payroll' });
    }

    // 4. Fetch commissions aggregated by sales rep for this month
    const commissionsMap = {};
    try {
      const commRes = await client.query(
        `SELECT sales_rep_id, SUM(commission_amount)::numeric AS total_commission
         FROM commissions
         WHERE month = $1
         GROUP BY sales_rep_id`,
        [cleanMonth]
      );
      for (const c of commRes.rows) {
        commissionsMap[c.sales_rep_id] = parseFloat(c.total_commission) || 0;
      }
    } catch (commErr) {
      // Commissions table might be empty; default to empty map
    }

    // 5. Fetch absent days from attendance table for this month
    const absentMap = {};
    try {
      const attRes = await client.query(
        `SELECT employee_id, COUNT(*)::int AS absent_days
         FROM attendance
         WHERE TO_CHAR(date, 'YYYY-MM') = $1 AND status = 'absent'
         GROUP BY employee_id`,
        [cleanMonth]
      );
      for (const a of attRes.rows) {
        absentMap[a.employee_id] = a.absent_days;
      }
    } catch (attErr) {
      // Attendance table might be empty; default to empty map
    }

    // 6. Compute slips for each active employee
    const generatedSlips = [];
    let totalPayrollCost = 0;

    for (const emp of empResult.rows) {
      const baseSalary = parseFloat(emp.base_salary) || 0;
      const hra = Math.round(baseSalary * 0.40 * 100) / 100; // 40% HRA
      const allowances = 2000.00; // Flat 2000 allowances
      const pfDeduction = Math.round(baseSalary * 0.12 * 100) / 100; // 12% PF

      const absentDays = absentMap[emp.id] || 0;
      const absentDeduction = Math.round((baseSalary / 30.0 * absentDays) * 100) / 100;
      const commission = commissionsMap[emp.id] || 0.00;

      // Net Pay = Base + HRA + Allowances + Commission - PF - Absent Deduction
      const grossPay = Math.round((baseSalary + hra + allowances + commission) * 100) / 100;
      const totalDeductions = Math.round((pfDeduction + absentDeduction) * 100) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

      // Insert or update salary slip
      const insertRes = await client.query(
        `INSERT INTO salary_slips (
          employee_id, month, base_salary, hra, allowances,
          commission, gross_pay, pf_deduction, absent_days,
          absent_deduction, total_deductions, net_pay, status
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, 'generated'
        )
        ON CONFLICT (employee_id, month) DO UPDATE SET
          base_salary = EXCLUDED.base_salary,
          hra = EXCLUDED.hra,
          allowances = EXCLUDED.allowances,
          commission = EXCLUDED.commission,
          gross_pay = EXCLUDED.gross_pay,
          pf_deduction = EXCLUDED.pf_deduction,
          absent_days = EXCLUDED.absent_days,
          absent_deduction = EXCLUDED.absent_deduction,
          total_deductions = EXCLUDED.total_deductions,
          net_pay = EXCLUDED.net_pay,
          updated_at = NOW()
        RETURNING id`,
        [
          emp.id, cleanMonth, baseSalary, hra, allowances,
          commission, grossPay, pfDeduction, absentDays,
          absentDeduction, totalDeductions, netPay
        ]
      );

      const slipId = insertRes.rows[0].id;

      // Fetch the full enriched slip record with employee & department details
      const slipDetails = await client.query(
        `SELECT ${SALARY_SLIP_SELECT}
         FROM ${SALARY_SLIP_FROM}
         WHERE s.id = $1`,
        [slipId]
      );

      const formattedSlip = formatSlipRow(slipDetails.rows[0]);
      generatedSlips.push(formattedSlip);
      totalPayrollCost += netPay;
    }

    await client.query('COMMIT');

    totalPayrollCost = Math.round(totalPayrollCost * 100) / 100;

    // 7. [ERP6-C3] Cross-team Side Effect: Post to ERP-5 General Ledger
    try {
      await callService('erp5', '/api/ledger/auto', {
        method: 'POST',
        body: {
          type: 'salary',
          reference: cleanMonth,
          amount: totalPayrollCost,
          description: `Payroll cost for ${cleanMonth}`
        },
        mock: 'ledger'
      });
    } catch (ledgerErr) {
      console.warn(`[integration-error] ERP-5 ledger auto posting failed for month ${cleanMonth}: ${ledgerErr.message}`);
    }

    return res.status(200).json({
      data: {
        month: cleanMonth,
        count: generatedSlips.length,
        total_payroll_cost: totalPayrollCost,
        total_cost: totalPayrollCost,
        slips: generatedSlips
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return handleDbError(res, error, 'POST /payroll/generate');
  } finally {
    client.release();
  }
});

/**
 * GET /salary-slips
 * Query params: ?month=YYYY-MM, ?employee_id=EMP-XXXX
 * Lists all salary slips with employee and department info.
 */
router.get('/salary-slips', async (req, res) => {
  try {
    const { month, employee_id } = req.query;
    const conditions = [];
    const values = [];

    if (month && typeof month === 'string' && month.trim()) {
      values.push(month.trim());
      conditions.push(`s.month = $${values.length}`);
    }

    if (employee_id && typeof employee_id === 'string' && employee_id.trim()) {
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
    return res.json({ data: result.rows.map(formatSlipRow) });
  } catch (error) {
    return handleDbError(res, error, 'GET /salary-slips');
  }
});

/**
 * GET /salary-slips/:id
 * Retrieves a single salary slip by slip ID (or fallback employee ID).
 */
router.get('/salary-slips/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT ${SALARY_SLIP_SELECT}
      FROM ${SALARY_SLIP_FROM}
      WHERE s.id = $1 OR s.employee_id = $1
      ORDER BY s.month DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Salary slip ${id} not found` });
    }

    return res.json({ data: formatSlipRow(result.rows[0]) });
  } catch (error) {
    return handleDbError(res, error, 'GET /salary-slips/:id');
  }
});

/**
 * PATCH /salary-slips/:id/paid
 * [ERP6-C3] Marks a salary slip as paid.
 */
router.patch('/salary-slips/:id/paid', async (req, res) => {
  try {
    const { id } = req.params;

    const updateRes = await pool.query(
      `UPDATE salary_slips
       SET status = 'paid', updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: `Salary slip ${id} not found` });
    }

    const fullResult = await pool.query(
      `SELECT ${SALARY_SLIP_SELECT}
       FROM ${SALARY_SLIP_FROM}
       WHERE s.id = $1`,
      [id]
    );

    return res.json({ data: formatSlipRow(fullResult.rows[0]) });
  } catch (error) {
    return handleDbError(res, error, 'PATCH /salary-slips/:id/paid');
  }
});

module.exports = router;
module.exports.pool = pool;
