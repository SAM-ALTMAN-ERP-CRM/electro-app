const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all commission routes with authentication middleware
router.use(requireAuth);

/**
 * Standard commission SELECT projection with joined sales rep name from employees table.
 */
const COMMISSION_SELECT = `
  c.id,
  c.sales_rep_id,
  e.name AS sales_rep_name,
  c.invoice_id,
  c.invoice_amount,
  c.rate_percent,
  c.commission_amount,
  c.month,
  c.created_at
`;

const COMMISSION_FROM = `
  commissions c
  LEFT JOIN employees e ON e.id = c.sales_rep_id
`;

/**
 * Formats a database commission row to standard response object with numbers.
 */
function formatCommissionRow(row) {
  return {
    id: row.id,
    sales_rep_id: row.sales_rep_id,
    sales_rep_name: row.sales_rep_name || null,
    invoice_id: row.invoice_id,
    invoice_amount: Number(parseFloat(row.invoice_amount).toFixed(2)),
    rate_percent: Number(parseFloat(row.rate_percent).toFixed(2)),
    commission_amount: Number(parseFloat(row.commission_amount).toFixed(2)),
    month: row.month,
    created_at: row.created_at
  };
}

/**
 * Helper to fetch paid invoices from ERP-5 with fallback to mock data.
 */
async function fetchPaidInvoices() {
  try {
    // Attempt live inter-service call to ERP-5
    const data = await callService('erp5', '/api/invoices/paid', { mock: 'invoices-paid' });
    return data;
  } catch (err) {
    // If ERP-5 is unreachable and mock is not in erp5/mocks, load local erp6 mock fallback
    const localMockPath = path.resolve(__dirname, '../mocks/invoices-paid.json');
    if (fs.existsSync(localMockPath)) {
      console.log('[mock] used for erp5/api/invoices/paid (from erp6 fallback)');
      const raw = fs.readFileSync(localMockPath, 'utf-8');
      return JSON.parse(raw);
    }
    throw err;
  }
}

/**
 * POST /commissions/sync
 * Fetches paid invoices from ERP-5 (/api/invoices/paid) and calculates sales commission:
 * - Rate: 2%, or 3% if invoice_amount > 100,000 INR
 * - Month: derived from paid_on (YYYY-MM)
 * - Idempotent: duplicate invoice_ids are safely ignored via ON CONFLICT (invoice_id) DO NOTHING
 * Returns count of newly inserted commission records.
 */
router.post('/commissions/sync', async (req, res, next) => {
  try {
    const paidInvoices = await fetchPaidInvoices();

    if (!Array.isArray(paidInvoices)) {
      return res.status(400).json({ error: 'Expected an array of paid invoices from invoices service' });
    }

    let addedCount = 0;
    const addedItems = [];

    for (const inv of paidInvoices) {
      const invoiceId = inv.invoice_id || inv.id;
      const salesRepId = inv.sales_rep_id;
      const rawTotal = inv.total !== undefined ? inv.total : inv.invoice_amount;
      const totalAmount = Number(rawTotal);
      const paidOn = inv.paid_on;

      // Skip invalid or unassigned records
      if (!invoiceId || !salesRepId || isNaN(totalAmount) || totalAmount <= 0) {
        continue;
      }

      // Extract month YYYY-MM from paid_on (fallback to current month)
      let month = null;
      if (paidOn) {
        const strPaidOn = String(paidOn).trim();
        if (/^\d{4}-\d{2}/.test(strPaidOn)) {
          month = strPaidOn.slice(0, 7);
        } else {
          try {
            month = new Date(paidOn).toISOString().slice(0, 7);
          } catch {
            month = new Date().toISOString().slice(0, 7);
          }
        }
      } else {
        month = new Date().toISOString().slice(0, 7);
      }

      // Commission Tier Calculation:
      // Rate is 2%, or 3% if the invoice amount is strictly above 100,000 INR
      const invoiceAmount = Number(totalAmount.toFixed(2));
      const ratePercent = invoiceAmount > 100000 ? 3.00 : 2.00;
      const commissionAmount = Number(((invoiceAmount * ratePercent) / 100).toFixed(2));

      // Insert commission row, ignoring duplicate invoices
      const insertSql = `
        INSERT INTO commissions (
          sales_rep_id,
          invoice_id,
          invoice_amount,
          rate_percent,
          commission_amount,
          month
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (invoice_id) DO NOTHING
        RETURNING id, sales_rep_id, invoice_id, invoice_amount, rate_percent, commission_amount, month, created_at
      `;

      const insertRes = await pool.query(insertSql, [
        salesRepId,
        invoiceId,
        invoiceAmount,
        ratePercent,
        commissionAmount,
        month
      ]);

      if (insertRes.rowCount > 0) {
        addedCount++;
        addedItems.push(formatCommissionRow(insertRes.rows[0]));
      }
    }

    return res.json({
      data: {
        added: addedCount,
        count: addedCount,
        total_invoices_checked: paidInvoices.length,
        items: addedItems
      }
    });
  } catch (err) {
    console.error('[erp6] POST /commissions/sync failed:', err.message);
    next(err);
  }
});

/**
 * GET /commissions
 * Retrieves all commission records with joined sales rep names.
 * Supports query filters:
 * - month (YYYY-MM)
 * - sales_rep_id (e.g. EMP-0001)
 */
router.get('/commissions', async (req, res, next) => {
  try {
    const { month, sales_rep_id } = req.query;

    let query = `
      SELECT ${COMMISSION_SELECT}
      FROM ${COMMISSION_FROM}
    `;

    const conditions = [];
    const params = [];

    if (month && String(month).trim() !== '') {
      params.push(String(month).trim());
      conditions.push(`c.month = $${params.length}`);
    }

    if (sales_rep_id && String(sales_rep_id).trim() !== '') {
      params.push(String(sales_rep_id).trim().toUpperCase());
      conditions.push(`c.sales_rep_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY c.created_at DESC, c.id DESC`;

    const result = await pool.query(query, params);
    const commissions = result.rows.map(formatCommissionRow);

    return res.json({ data: commissions });
  } catch (err) {
    console.error('[erp6] GET /commissions failed:', err.message);
    next(err);
  }
});

/**
 * GET /commissions/:id
 * Retrieves a single commission record by ID.
 */
router.get('/commissions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT ${COMMISSION_SELECT}
      FROM ${COMMISSION_FROM}
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Commission '${id}' not found` });
    }

    return res.json({ data: formatCommissionRow(result.rows[0]) });
  } catch (err) {
    console.error(`[erp6] GET /commissions/${req.params.id} failed:`, err.message);
    next(err);
  }
});

router.pool = pool;
module.exports = router;
