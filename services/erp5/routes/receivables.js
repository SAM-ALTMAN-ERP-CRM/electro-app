const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp5_db');
router.use(requireAuth);

// GET /api/receivables/ageing
// Groups the outstanding balance of every unpaid/partially-paid invoice
// by customer into the 4 agreed ageing buckets.
router.get('/receivables/ageing', async (req, res, next) => {
  try {
    const invRes = await pool.query(
      `SELECT id, customer_id, customer_name, total, due_date
       FROM invoices
       WHERE status IN ('unpaid', 'partially_paid')`
    );

    // Sum of payments per invoice.
    const paidRes = await pool.query(
      `SELECT invoice_id, COALESCE(SUM(amount), 0) AS paid_sum
       FROM payments GROUP BY invoice_id`
    );
    const paidMap = {};
    paidRes.rows.forEach((r) => {
      paidMap[r.invoice_id] = Number(r.paid_sum);
    });

    // Sum of credit notes per invoice (A4 will fill this table).
    const creditMap = {};
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credit_notes') AS exists`
    );
    if (tableCheck.rows[0].exists) {
      const creditRes = await pool.query(
        `SELECT invoice_id, COALESCE(SUM(amount), 0) AS credit_sum
         FROM credit_notes GROUP BY invoice_id`
      );
      creditRes.rows.forEach((r) => {
        creditMap[r.invoice_id] = Number(r.credit_sum);
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups = {};
    invRes.rows.forEach((inv) => {
      const total = Number(inv.total);
      const paid = paidMap[inv.id] || 0;
      const credited = creditMap[inv.id] || 0;
      const outstanding = total - paid - credited;

      // Skip invoices that are effectively settled.
      if (outstanding <= 0.005) return;

      const due = new Date(String(inv.due_date).slice(0, 10) + 'T00:00:00');
      const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24));

      let bucket;
      if (daysOverdue <= 0) bucket = 'not_yet_due';
      else if (daysOverdue <= 15) bucket = 'overdue_1_15';
      else if (daysOverdue <= 30) bucket = 'overdue_16_30';
      else bucket = 'overdue_31_plus';

      if (!groups[inv.customer_id]) {
        groups[inv.customer_id] = {
          customer_id: inv.customer_id,
          customer_name: inv.customer_name,
          not_yet_due: 0,
          overdue_1_15: 0,
          overdue_16_30: 0,
          overdue_31_plus: 0,
          total_outstanding: 0
        };
      }
      groups[inv.customer_id][bucket] += outstanding;
      groups[inv.customer_id].total_outstanding += outstanding;
    });

    const data = Object.values(groups).sort((a, b) =>
      String(a.customer_name).localeCompare(String(b.customer_name))
    );

    return res.json({ data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
