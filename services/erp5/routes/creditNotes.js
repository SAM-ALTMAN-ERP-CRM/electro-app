const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { postLedgerPair } = require('../utils/ledgerHelper');

const pool = makePool('erp5_db');

router.use(requireAuth);

/**
 * GET /api/creditnotes
 * Returns list of credit notes with invoice details.
 * Supports query filters: ?so_id= & ?invoice_id=
 */
router.get('/creditnotes', async (req, res, next) => {
  try {
    const { so_id, invoice_id } = req.query;
    let query = `
      SELECT cn.id, cn.so_id, cn.invoice_id, cn.serial_number, cn.amount, cn.created_at,
             inv.customer_id, inv.customer_name, inv.total as invoice_total, inv.status as invoice_status
      FROM credit_notes cn
      LEFT JOIN invoices inv ON cn.invoice_id = inv.id
    `;
    const conditions = [];
    const values = [];

    if (so_id && so_id.trim()) {
      values.push(so_id.trim());
      conditions.push(`cn.so_id = $${values.length}`);
    }

    if (invoice_id && invoice_id.trim()) {
      values.push(invoice_id.trim());
      conditions.push(`cn.invoice_id = $${values.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY cn.created_at DESC, cn.id DESC`;

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/creditnotes
 * ERP-4 calls this when an RMA return is credited (Step 9 of 9).
 * Payload: { so_id, serial_number, amount }
 *
 * Rules:
 * 1. Duplicate check: a second POST for the same serial and order returns 409.
 * 2. Finds invoice by so_id.
 * 3. Reduces invoice outstanding balance; a fully credited unpaid invoice becomes 'paid'.
 * 4. Posts ledger pair (type: 'credit_note', debit sales, credit receivables) in same transaction.
 */
router.post('/creditnotes', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { so_id, serial_number, amount } = req.body;

    if (!so_id || !String(so_id).trim()) {
      return res.status(400).json({ error: 'so_id is required' });
    }
    if (!serial_number || !String(serial_number).trim()) {
      return res.status(400).json({ error: 'serial_number is required' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    const cleanSoId = String(so_id).trim();
    const cleanSerial = String(serial_number).trim();

    // 1. Duplicate Prevention: same serial and order returns 409 Conflict
    const dupCheck = await client.query(
      `SELECT id FROM credit_notes WHERE so_id = $1 AND serial_number = $2`,
      [cleanSoId, cleanSerial]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        error: `Credit note already exists for order '${cleanSoId}' and serial '${cleanSerial}' (Duplicate ID: ${dupCheck.rows[0].id})`
      });
    }

    // 2. Find associated invoice by so_id
    const invRes = await client.query(
      `SELECT id, total, status, customer_name FROM invoices WHERE so_id = $1`,
      [cleanSoId]
    );
    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: `No invoice found for order '${cleanSoId}'` });
    }

    const invoice = invRes.rows[0];
    const invoiceTotal = parseFloat(invoice.total);

    // 3. Begin Transaction
    await client.query('BEGIN');

    // Generate CN ID
    const cnSeqRes = await client.query(`SELECT nextval('credit_notes_seq') as seq`);
    const cnId = `CN-${String(cnSeqRes.rows[0].seq).padStart(4, '0')}`;

    // Insert Credit Note
    const insertQuery = `
      INSERT INTO credit_notes (id, so_id, invoice_id, serial_number, amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const insertRes = await client.query(insertQuery, [
      cnId,
      cleanSoId,
      invoice.id,
      cleanSerial,
      numAmount
    ]);
    const createdCreditNote = insertRes.rows[0];

    // 4. Update Invoice Status
    // Sum all credit notes issued for this invoice
    const creditSumRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_credited FROM credit_notes WHERE invoice_id = $1`,
      [invoice.id]
    );
    const totalCredited = parseFloat(creditSumRes.rows[0].total_credited);

    let newStatus = invoice.status;
    if (totalCredited >= invoiceTotal) {
      newStatus = 'paid'; // Fully credited invoice becomes paid
    } else if (totalCredited > 0 && invoice.status === 'unpaid') {
      newStatus = 'partially_paid';
    }

    if (newStatus !== invoice.status) {
      await client.query(`UPDATE invoices SET status = $1 WHERE id = $2`, [newStatus, invoice.id]);
    }

    // 5. Post Ledger Pair (Debit Sales, Credit Receivables)
    await postLedgerPair(client, {
      type: 'credit_note',
      reference: cnId,
      amount: numAmount,
      description: `Credit Note ${cnId} for Order ${cleanSoId} (Serial ${cleanSerial})`
    });

    await client.query('COMMIT');

    createdCreditNote.invoice_status = newStatus;
    return res.status(201).json({ data: createdCreditNote });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
