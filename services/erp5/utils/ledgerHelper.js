/**
 * Ledger Helper for ERP-5 (ERP5-D1 integration).
 * Safely posts balanced ledger pairs within an active database transaction/client.
 * If the ledger_entries table has not yet been merged (ERP5-D1), skips gracefully per PMO rules.
 */

async function postLedgerPair(client, { type, reference, amount, description }) {
  try {
    // Check if table ledger_entries exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ledger_entries'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log(`[erp5 ledger] ledger_entries table not yet present; skipping ledger line for ${type} ${reference} (ERP5-D1 pending).`);
      return false;
    }

    // Check for duplicate type and reference (safe to retry)
    const existing = await client.query(
      `SELECT id FROM ledger_entries WHERE reference = $1 AND description LIKE $2 LIMIT 1`,
      [reference, `%${type}%`]
    );
    if (existing.rows.length > 0) {
      return true;
    }

    const today = new Date().toISOString().split('T')[0];
    const numAmount = parseFloat(amount);

    if (type === 'invoice') {
      // Debit: receivables, Credit: sales
      await client.query(`
        INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
        VALUES 
          ($1, 'receivables', $2, 0, $3, $4),
          ($1, 'sales', 0, $2, $3, $4)
      `, [today, numAmount, reference, description || `Invoice ${reference}`]);
    } else if (type === 'payment') {
      // Debit: cash, Credit: receivables
      await client.query(`
        INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
        VALUES 
          ($1, 'cash', $2, 0, $3, $4),
          ($1, 'receivables', 0, $2, $3, $4)
      `, [today, numAmount, reference, description || `Payment ${reference}`]);
    } else if (type === 'credit_note') {
      // Debit: sales, Credit: receivables
      await client.query(`
        INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
        VALUES 
          ($1, 'sales', $2, 0, $3, $4),
          ($1, 'receivables', 0, $2, $3, $4)
      `, [today, numAmount, reference, description || `Credit Note ${reference}`]);
    }

    return true;
  } catch (err) {
    console.warn(`[erp5 ledger] Note: Could not post ledger pair: ${err.message}`);
    return false;
  }
}

module.exports = {
  postLedgerPair
};
