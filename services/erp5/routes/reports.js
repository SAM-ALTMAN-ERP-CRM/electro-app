const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-5 PostgreSQL database
const pool = makePool('erp5_db');

// Protect all report endpoints with authentication middleware
router.use(requireAuth);

/**
 * GET /api/reports/summary
 * Returns key financial metrics calculated directly from the General Ledger:
 * - total_sales: credit minus debit on sales
 * - total_received: debit on cash from payments
 * - outstanding: debit minus credit on receivables
 * - cash_balance: debit minus credit on cash
 */
router.get('/reports/summary', async (req, res) => {
  try {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN account = 'sales' THEN (credit - debit) ELSE 0 END), 0)::numeric(12,2) AS total_sales,
        COALESCE(SUM(CASE WHEN account = 'cash' AND (transaction_type = 'payment' OR reference LIKE 'PAY-%' OR description ILIKE '%payment%') THEN debit ELSE 0 END), 0)::numeric(12,2) AS total_received,
        COALESCE(SUM(CASE WHEN account = 'receivables' THEN (debit - credit) ELSE 0 END), 0)::numeric(12,2) AS outstanding,
        COALESCE(SUM(CASE WHEN account = 'cash' THEN (debit - credit) ELSE 0 END), 0)::numeric(12,2) AS cash_balance
      FROM ledger_entries;
    `;

    const result = await pool.query(query);
    const row = result.rows[0] || {};

    return res.json({
      data: {
        total_sales: parseFloat(row.total_sales || 0).toFixed(2),
        total_received: parseFloat(row.total_received || 0).toFixed(2),
        outstanding: parseFloat(row.outstanding || 0).toFixed(2),
        cash_balance: parseFloat(row.cash_balance || 0).toFixed(2)
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to generate financial summary' });
  }
});

/**
 * GET /api/reports/monthly-sales
 * Returns total sales aggregated by month (YYYY-MM)
 */
router.get('/reports/monthly-sales', async (req, res) => {
  try {
    const query = `
      SELECT 
        TO_CHAR(entry_date, 'YYYY-MM') AS month,
        COALESCE(SUM(credit - debit), 0)::numeric(12,2) AS amount
      FROM ledger_entries
      WHERE account = 'sales'
      GROUP BY TO_CHAR(entry_date, 'YYYY-MM')
      ORDER BY month ASC;
    `;

    const result = await pool.query(query);
    const monthlyData = result.rows.map(r => ({
      month: r.month,
      amount: parseFloat(r.amount || 0).toFixed(2)
    }));

    return res.json({ data: monthlyData });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve monthly sales' });
  }
});

module.exports = router;
