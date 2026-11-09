/**
 * Ledger Helper for ERP-5 (ERP5-D1 integration).
 * Safely posts balanced double-entry ledger pairs for:
 * - invoice (debit receivables, credit sales)
 * - payment (debit cash, credit receivables)
 * - credit_note (debit sales, credit receivables)
 * - purchase (debit purchases, credit cash)
 * - salary (debit salary_expense, credit cash)
 *
 * Fully idempotent: Safe to retry with same reference and type.
 */

const { postAutoEntry } = require('../routes/ledger');

async function postLedgerPair(client, { type, reference, amount, description, entry_date }) {
  try {
    const entries = await postAutoEntry(
      { type, reference, amount, description, entry_date },
      client
    );
    return !!entries;
  } catch (err) {
    console.warn(`[erp5 ledger] Note: Could not post ledger pair: ${err.message}`);
    return false;
  }
}

module.exports = {
  postLedgerPair,
  postAutoEntry
};
