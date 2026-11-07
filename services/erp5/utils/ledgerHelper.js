/**
 * Ledger Helper for ERP-5 (ERP5-D1 integration).
 * Safely posts balanced ledger pairs within an active database transaction/client.
 */
async function postLedgerPair(client, { type, reference, amount, description }) {
  try {
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

    // Safe to retry: same type + reference means already posted.
    const existing = await client.query(
      `SELECT id FROM ledger_entries WHERE reference = $1 LIMIT 1`,
      [reference]
    );
    if (existing.rows.length > 0) {
      return true;
    }

    const today = new Date().toISOString().split('T')[0];
    const numAmount = parseFloat(amount);

    if (type === 'invoice') {
      // Debit: receivables, Credit: sales
      await client.query(
        `INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
         VALUES ($1, 'receivables', $2, 0, $3, $4),
                ($1, 'sales', 0, $2, $3, $4)`,
        [today, numAmount, reference, description || `Invoice ${reference}`]
      );
    } else if (type === 'payment') {
      // Debit: cash, Credit: receivables
      await client.query(
        `INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
         VALUES ($1, 'cash', $2, 0, $3, $4),
                ($1, 'receivables', 0, $2, $3, $4)`,
        [today, numAmount, reference, description || `Payment ${reference}`]
      );
    } else if (type === 'credit_note') {
      // Debit: sales, Credit: receivables
      await client.query(
        `INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
         VALUES ($1, 'sales', $2, 0, $3, $4),
                ($1, 'receivables', 0, $2, $3, $4)`,
        [today, numAmount, reference, description || `Credit Note ${reference}`]
      );
    } else if (type === 'purchase') {
      // Debit: purchases, Credit: cash
      await client.query(
        `INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
         VALUES ($1, 'purchases', $2, 0, $3, $4),
                ($1, 'cash', 0, $2, $3, $4)`,
        [today, numAmount, reference, description || `Purchase ${reference}`]
      );
    } else if (type === 'salary') {
      // Debit: salary_expense, Credit: cash
      await client.query(
        `INSERT INTO ledger_entries (entry_date, account, debit, credit, reference, description)
         VALUES ($1, 'salary_expense', $2, 0, $3, $4),
                ($1, 'cash', 0, $2, $3, $4)`,
        [today, numAmount, reference, description || `Salary ${reference}`]
      );
    } else {
      console.warn(`[erp5 ledger] Unknown type '${type}', skipping ledger line.`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[erp5 ledger] Note: Could not post ledger pair: ${err.message}`);
    return false;
  }
}

module.exports = { postLedgerPair };
