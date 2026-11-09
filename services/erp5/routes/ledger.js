const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-5 PostgreSQL database
const pool = makePool('erp5_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

// Allowed accounts for General Ledger double-entry bookkeeping
const VALID_ACCOUNTS = ['sales', 'receivables', 'cash', 'purchases', 'salary_expense'];

// Allowed automated transaction types
const VALID_AUTO_TYPES = ['invoice', 'payment', 'credit_note', 'purchase', 'salary'];

/**
 * Generate formatted ledger ID (e.g., LED-0001) using PostgreSQL sequence
 */
async function generateLedgerId(client) {
  const res = await client.query("SELECT nextval('ledger_seq') AS num");
  const num = res.rows[0].num;
  return `LED-${String(num).padStart(4, '0')}`;
}

/**
 * Shared double-entry posting function.
 * Adds balanced debit/credit pair for invoices, payments, credit notes, purchases, and salary.
 * Idempotent: Repeated calls with the same type and reference return the existing pair.
 * Can be called with an external DB transaction client or standalone.
 *
 * @param {Object} params - { type, reference, amount, description, entry_date }
 * @param {Object} [client] - Optional active pg Client for outer transactions
 * @returns {Promise<Array>} Array of created or existing ledger entries
 */
async function postAutoEntry({ type, reference, amount, description, entry_date }, client = null) {
  if (!VALID_AUTO_TYPES.includes(type)) {
    throw new Error(`Invalid transaction type '${type}'. Allowed: ${VALID_AUTO_TYPES.join(', ')}`);
  }
  if (!reference) {
    throw new Error('Reference identifier is required');
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Amount must be a valid positive number');
  }

  const dbClient = client || (await pool.connect());
  const shouldManageTx = !client;

  try {
    if (shouldManageTx) await dbClient.query('BEGIN');

    // 1. Idempotency Check: Return existing pair if type and reference match
    const existingRes = await dbClient.query(
      `SELECT * FROM ledger_entries 
       WHERE reference = $1 AND transaction_type = $2 
       ORDER BY id ASC`,
      [reference, type]
    );

    if (existingRes.rows.length > 0) {
      if (shouldManageTx) await dbClient.query('COMMIT');
      return existingRes.rows;
    }

    // 2. Determine balanced double-entry accounts
    // Accounting rules:
    // - invoice: Debit receivables, Credit sales
    // - payment: Debit cash, Credit receivables
    // - credit_note: Debit sales, Credit receivables
    // - purchase: Debit purchases, Credit cash
    // - salary: Debit salary_expense, Credit cash
    let debitAccount = '';
    let creditAccount = '';

    switch (type) {
      case 'invoice':
        debitAccount = 'receivables';
        creditAccount = 'sales';
        break;
      case 'payment':
        debitAccount = 'cash';
        creditAccount = 'receivables';
        break;
      case 'credit_note':
        debitAccount = 'sales';
        creditAccount = 'receivables';
        break;
      case 'purchase':
        debitAccount = 'purchases';
        creditAccount = 'cash';
        break;
      case 'salary':
        debitAccount = 'salary_expense';
        creditAccount = 'cash';
        break;
    }

    const today = entry_date || new Date().toISOString().split('T')[0];
    const desc = description || `${type.toUpperCase()} - ${reference}`;

    const id1 = await generateLedgerId(dbClient);
    const id2 = await generateLedgerId(dbClient);

    // Insert Debit entry
    const debitRes = await dbClient.query(
      `INSERT INTO ledger_entries (id, entry_date, account, debit, credit, reference, description, transaction_type)
       VALUES ($1, $2, $3, $4, 0.00, $5, $6, $7)
       RETURNING *`,
      [id1, today, debitAccount, numAmount.toFixed(2), reference, desc, type]
    );

    // Insert Credit entry
    const creditRes = await dbClient.query(
      `INSERT INTO ledger_entries (id, entry_date, account, debit, credit, reference, description, transaction_type)
       VALUES ($1, $2, $3, 0.00, $4, $5, $6, $7)
       RETURNING *`,
      [id2, today, creditAccount, numAmount.toFixed(2), reference, desc, type]
    );

    if (shouldManageTx) await dbClient.query('COMMIT');
    return [debitRes.rows[0], creditRes.rows[0]];
  } catch (err) {
    if (shouldManageTx) await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    if (shouldManageTx) dbClient.release();
  }
}

/**
 * GET /api/ledger
 * Query Filters:
 *   - ?account= (sales | receivables | cash | purchases | salary_expense)
 *   - ?from= / ?start_date= (YYYY-MM-DD)
 *   - ?to= / ?end_date= (YYYY-MM-DD)
 */
router.get('/ledger', async (req, res) => {
  try {
    const { account, from, to, start_date, end_date } = req.query;
    const fromDate = from || start_date;
    const toDate = to || end_date;

    const conditions = [];
    const values = [];

    if (account) {
      if (!VALID_ACCOUNTS.includes(account)) {
        return res.status(400).json({
          error: `Invalid account filter '${account}'. Allowed: ${VALID_ACCOUNTS.join(', ')}`
        });
      }
      values.push(account);
      conditions.push(`account = $${values.length}`);
    }

    if (fromDate) {
      values.push(fromDate);
      conditions.push(`entry_date >= $${values.length}`);
    }

    if (toDate) {
      values.push(toDate);
      conditions.push(`entry_date <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT id, entry_date, account, debit, credit, reference, description, transaction_type, created_at
      FROM ledger_entries
      ${whereClause}
      ORDER BY entry_date DESC, id DESC
    `;

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve ledger entries' });
  }
});

/**
 * POST /api/ledger
 * Manual entry creation for a single ledger record
 * Body: { entry_date, account, debit, credit, reference, description }
 */
router.post('/ledger', async (req, res) => {
  try {
    const { entry_date, account, debit, credit, reference, description } = req.body;

    if (!account || !VALID_ACCOUNTS.includes(account)) {
      return res.status(400).json({
        error: `Account is required and must be one of: ${VALID_ACCOUNTS.join(', ')}`
      });
    }

    const numDebit = parseFloat(debit || 0);
    const numCredit = parseFloat(credit || 0);

    if (isNaN(numDebit) || numDebit < 0 || isNaN(numCredit) || numCredit < 0) {
      return res.status(400).json({ error: 'Debit and Credit must be valid non-negative numbers' });
    }

    if (numDebit === 0 && numCredit === 0) {
      return res.status(400).json({ error: 'At least one of debit or credit must be greater than 0' });
    }

    const dateVal = entry_date || new Date().toISOString().split('T')[0];

    const client = await pool.connect();
    try {
      const id = await generateLedgerId(client);
      const insertQuery = `
        INSERT INTO ledger_entries (id, entry_date, account, debit, credit, reference, description, transaction_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual')
        RETURNING *
      `;
      const result = await client.query(insertQuery, [
        id,
        dateVal,
        account,
        numDebit.toFixed(2),
        numCredit.toFixed(2),
        reference || null,
        description || 'Manual entry'
      ]);

      return res.status(201).json({ data: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to create ledger entry' });
  }
});

/**
 * POST /api/ledger/auto
 * Automated double-entry pair creation
 * Body: { type, reference, amount, description, entry_date }
 */
router.post('/ledger/auto', async (req, res) => {
  try {
    const { type, reference, amount, description, entry_date } = req.body;

    if (!type || !reference || amount === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: type, reference, and amount are mandatory'
      });
    }

    const entries = await postAutoEntry({ type, reference, amount, description, entry_date });
    return res.status(201).json({ data: entries });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Export both the Express router for server.js auto-mounting and the plain function for internal service calls
module.exports = router;
module.exports.postAutoEntry = postAutoEntry;
