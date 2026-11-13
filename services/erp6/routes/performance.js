const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

/**
 * GET /performance/sales
 * Query parameters:
 * - month (optional): filters performance to a specific month (e.g. YYYY-MM)
 *
 * Returns leaderboard ranked by total_sales DESC:
 * - rank: 1-based ranking
 * - sales_rep_id: Employee ID (e.g. EMP-0001)
 * - name: Sales representative name
 * - number_of_deals / deals: Count of commissionable deals/invoices
 * - total_sales: Sum of invoice amounts in INR
 * - commission: Sum of commission earned in INR
 */
router.get('/performance/sales', async (req, res, next) => {
  try {
    const { month } = req.query;

    let sql = `
      SELECT
        e.id AS sales_rep_id,
        e.name,
        e.email,
        COUNT(c.id)::int AS deals,
        COALESCE(SUM(c.invoice_amount), 0.00)::numeric(12,2) AS total_sales,
        COALESCE(SUM(c.commission_amount), 0.00)::numeric(12,2) AS commission
      FROM employees e
      LEFT JOIN commissions c ON c.sales_rep_id = e.id
    `;

    const params = [];

    if (month && String(month).trim() !== '') {
      params.push(String(month).trim());
      sql += ` AND c.month = $1`;
    }

    sql += `
      WHERE (e.role_title = 'Sales Rep' OR c.id IS NOT NULL)
        AND e.active = true
      GROUP BY e.id, e.name, e.email
      ORDER BY total_sales DESC, commission DESC, e.name ASC
    `;

    const result = await pool.query(sql, params);

    const rows = result.rows.map((r, idx) => ({
      rank: idx + 1,
      sales_rep_id: r.sales_rep_id,
      name: r.name,
      sales_rep_name: r.name,
      email: r.email,
      deals: Number(r.deals),
      number_of_deals: Number(r.deals),
      total_sales: Number(parseFloat(r.total_sales).toFixed(2)),
      commission: Number(parseFloat(r.commission).toFixed(2)),
      commission_amount: Number(parseFloat(r.commission).toFixed(2)),
      month: (month && String(month).trim()) || null
    }));

    return res.json({ data: rows });
  } catch (err) {
    console.error('[erp6] GET /performance/sales failed:', err.message);
    next(err);
  }
});

router.pool = pool;
module.exports = router;
