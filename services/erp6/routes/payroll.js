// services/erp6/routes/payroll.js
// Payroll generation and salary slip management API for ERP-6 HR & Workforce (Port 5206)
// Build Issue: [ERP6-C1] Payroll generation API

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

/**
 * Helper to handle database errors uniformly.
 */
function handleDbError(res, error, operation) {
  console.error(`[erp6] ${operation} failed:`, error.message);
  return res.status(500).json({ error: 'Internal server error' });
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
 * POST /payroll/generate
 * Body: { month: 'YYYY-MM' }
 *
 * Creates salary slips for all active employees for the given month.
 * Calculates:
 * - base_salary: from employee record
 * - hra: 40% of base_salary
 * - allowances: flat INR 2000.00
 * - pf_deduction: 12% of base_salary
 * - absent_days: count of 'absent' status in attendance table for that month (0 if none)
 * - absent_deduction: (base_salary / 30) * absent_days
 * - commission: sum from commissions table for sales reps in that month (default 0)
 * - gross_pay: base + hra + allowances + commission
 * - total_deductions: pf_deduction + absent_deduction
 * - net_pay: gross_pay - total_deductions
 */
router.post('/payroll/generate', async (req, res) => {
  const body = req.body || {};
  const { month } = body;

  // Validate month parameter (YYYY-MM)
  if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month.trim())) {
    return res.status(400).json({ error: 'Valid month in YYYY-MM format is required (e.g. 2026-11)' });
  }

  const cleanMonth = month.trim();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch all active employees
    const empResult = await client.query(
      `SELECT id, name, email, department_id, role_title, base_salary, active
       FROM employees
       WHERE active = TRUE
       ORDER BY id ASC`
    );

    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No active employees found to generate payroll' });
    }

    const generatedSlips = [];
    let totalPayrollCost = 0;

    // 2. Compute slips for each active employee
    for (const emp of empResult.rows) {
      const baseSalary = parseFloat(emp.base_salary) || 0;
      const hra = Math.round(baseSalary * 0.40 * 100) / 100;
      const allowances = 2000.00;
      const pfDeduction = Math.round(baseSalary * 0.12 * 100) / 100;

      // Query absent days from attendance table for this employee and month
      let absentDays = 0;
      try {
        const attRes = await client.query(
          `SELECT COUNT(*)::int AS absent_count
           FROM attendance
           WHERE employee_id = $1
             AND TO_CHAR(date, 'YYYY-MM') = $2
             AND status = 'absent'`,
          [emp.id, cleanMonth]
        );
        if (attRes.rows.length > 0) {
          absentDays = parseInt(attRes.rows[0].absent_count, 10) || 0;
        }
      } catch (attErr) {
        // Attendance table might be empty or unmigrated; default to 0
        absentDays = 0;
      }

      // Calculate absent deduction: base / 30 per absent day
      const absentDeduction = Math.round((baseSalary / 30.0 * absentDays) * 100) / 100;

      // Query sales commissions from commissions table for this month
      let commission = 0.00;
      try {
        const commRes = await client.query(
          `SELECT COALESCE(SUM(commission_amount), 0) AS total_comm
           FROM commissions
           WHERE sales_rep_id = $1
             AND month = $2`,
          [emp.id, cleanMonth]
        );
        if (commRes.rows.length > 0) {
          commission = parseFloat(commRes.rows[0].total_comm) || 0.00;
        }
      } catch (commErr) {
        // Commissions table might be empty; default to 0
        commission = 0.00;
      }

      // Calculations according to Section 5 formula:
      // net_pay = base + HRA + allowances + commission - PF - absent_deduction
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

      generatedSlips.push(slipDetails.rows[0]);
      totalPayrollCost += netPay;
    }

    await client.query('COMMIT');

    return res.status(201).json({
      data: {
        month: cleanMonth,
        count: generatedSlips.length,
        total_payroll_cost: Math.round(totalPayrollCost * 100) / 100,
        total_cost: Math.round(totalPayrollCost * 100) / 100,
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
    return res.json({ data: result.rows });
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

    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'GET /salary-slips/:id');
  }
});

/**
 * PATCH /salary-slips/:id/paid
 * Marks a salary slip as paid.
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

    return res.json({ data: fullResult.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'PATCH /salary-slips/:id/paid');
  }
});

module.exports = router;
