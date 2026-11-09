const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { postLedgerPair } = require('../utils/ledgerHelper');

const pool = makePool('erp5_db');

// All payment routes need a logged-in user.
router.use(requireAuth);

function money(n) {
  return Number(n || 0);
}

// POST /api/payments
// Creates a payment and moves the invoice unpaid -> partially_paid -> paid.
router.post('/payments', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { invoice_id, amount, method, reference, paid_on } = req.body || {};

    if (!invoice_id) {
      return res.status(400).json({ error: 'invoice_id is required' });
    }

    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const allowedMethods = ['upi', 'card', 'bank_transfer', 'cash'];
    if (!method || !allowedMethods.includes(String(method).toLowerCase())) {
      return res.status(400).json({ error: 'method must be one of: upi, card, bank_transfer, cash' });
    }

    await client.query('BEGIN');

    const invRes = await client.query(
      `SELECT id, total, status FROM invoices WHERE id = $1`,
      [invoice_id]
    );
    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: `Invoice '${invoice_id}' not found` });
    }

    const invoice = invRes.rows[0];
    if (invoice.status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invoice is already paid' });
    }

    // How much has already been paid for this invoice?
    const paidRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid_sum FROM payments WHERE invoice_id = $1`,
      [invoice_id]
    );
    const paidSoFar = money(paidRes.rows[0].paid_sum);

    // Credit notes reduce the balance due (ERP5-A4 may add them later).
    let credited = 0;
    const tableCheck = await client.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'credit_notes') AS exists`
    );
    if (tableCheck.rows[0].exists) {
      const creditRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS credit_sum FROM credit_notes WHERE invoice_id = $1`,
        [invoice_id]
      );
      credited = money(creditRes.rows[0].credit_sum);
    }

    const invoiceTotal = money(invoice.total);
    const balance = invoiceTotal - paidSoFar - credited;

    // Reject overpayment (small tolerance for floating point).
    if (payAmount > balance + 0.005) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Overpayment: amount exceeds balance due (Rs ${balance.toFixed(2)})`
      });
    }

    // New invoice status after this payment.
    const newPaidTotal = paidSoFar + payAmount;
    const newStatus =
      newPaidTotal + credited >= invoiceTotal - 0.005
        ? 'paid'
        : 'partially_paid';

    // Generate the payment id from the sequence.
    const seqRes = await client.query(`SELECT nextval('payments_seq') AS seq`);
    const paymentId = `PAY-${String(seqRes.rows[0].seq).padStart(4, '0')}`;

    const paidOn = paid_on
      ? String(paid_on).slice(0, 10)
      : new Date().toISOString().split('T')[0];

    const insertRes = await client.query(
      `INSERT INTO payments (id, invoice_id, amount, method, reference, paid_on)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [paymentId, invoice_id, payAmount, String(method).toLowerCase(), reference || null, paidOn]
    );

    // Post the balanced ledger pair in the same transaction.
    await postLedgerPair(client, {
      type: 'payment',
      reference: paymentId,
      amount: payAmount,
      description: `Payment ${paymentId} for invoice ${invoice_id}`
    });

    // Update invoice status.
    await client.query(
      `UPDATE invoices SET status = $1 WHERE id = $2`,
      [newStatus, invoice_id]
    );

    await client.query('COMMIT');

    const payment = insertRes.rows[0];
    payment.invoice_status = newStatus;
    return res.status(201).json({ data: payment });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/payments?invoice_id=
router.get('/payments', async (req, res, next) => {
  try {
    const { invoice_id } = req.query;
    let query = `
      SELECT id, invoice_id, amount, method, reference, paid_on, created_at
      FROM payments
    `;
    const values = [];

    if (invoice_id) {
      values.push(invoice_id.trim());
      query += ` WHERE invoice_id = $1`;
    }

    query += ` ORDER BY paid_on DESC, id DESC`;

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
