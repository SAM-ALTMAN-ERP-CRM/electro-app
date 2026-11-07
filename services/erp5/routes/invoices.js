const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');
const { postLedgerPair } = require('../utils/ledgerHelper');
const { amountInWords } = require('../utils/amountInWords');

const pool = makePool('erp5_db');

router.use(requireAuth);

/**
 * Helper to calculate due date 15 days after invoice_date
 */
function calculateDueDate(invoiceDateStr) {
  const d = invoiceDateStr ? new Date(invoiceDateStr) : new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().split('T')[0];
}

/**
 * GET /api/invoices/summary
 * Returns total billed and total outstanding across all invoices.
 * Mounted BEFORE /:id to prevent route shadowing.
 */
router.get('/invoices/summary', async (req, res, next) => {
  try {
    const summaryRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total), 0) as total_billed,
        COALESCE(SUM(CASE WHEN status IN ('unpaid', 'partially_paid') THEN total ELSE 0 END), 0) as total_outstanding,
        COUNT(*) as total_invoices,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END), 0) as unpaid_count,
        COALESCE(SUM(CASE WHEN status = 'partially_paid' THEN 1 ELSE 0 END), 0) as partially_paid_count,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END), 0) as paid_count
      FROM invoices
    `);

    const row = summaryRes.rows[0];
    return res.json({
      data: {
        total_billed: parseFloat(row.total_billed),
        total_outstanding: parseFloat(row.total_outstanding),
        total_invoices: parseInt(row.total_invoices, 10),
        unpaid_count: parseInt(row.unpaid_count, 10),
        partially_paid_count: parseInt(row.partially_paid_count, 10),
        paid_count: parseInt(row.paid_count, 10)
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/invoices
 * Query filters:
 *   - ?customer_id=
 *   - ?status=
 *   - ?from_date= & ?to_date= (date range)
 */
router.get('/invoices', async (req, res, next) => {
  try {
    const { customer_id, status, from_date, to_date, start_date, end_date } = req.query;
    let query = `
      SELECT id, so_id, customer_id, customer_name, customer_gstin, sales_rep_id,
             invoice_date::text as invoice_date, due_date::text as due_date, subtotal, cgst, sgst, total, status, created_at
      FROM invoices
    `;
    const conditions = [];
    const values = [];

    if (customer_id && customer_id.trim()) {
      values.push(customer_id.trim());
      conditions.push(`customer_id = $${values.length}`);
    }

    if (status && status.trim()) {
      values.push(status.trim().toLowerCase());
      conditions.push(`LOWER(status) = $${values.length}`);
    }

    const effectiveFrom = from_date || start_date;
    if (effectiveFrom && effectiveFrom.trim()) {
      values.push(effectiveFrom.trim());
      conditions.push(`invoice_date >= $${values.length}`);
    }

    const effectiveTo = to_date || end_date;
    if (effectiveTo && effectiveTo.trim()) {
      values.push(effectiveTo.trim());
      conditions.push(`invoice_date <= $${values.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY invoice_date DESC, id DESC`;

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/invoices/:id
 * Fetches single invoice along with line items and amount in words
 */
router.get('/invoices/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const invRes = await pool.query(
      `SELECT id, so_id, customer_id, customer_name, customer_gstin, sales_rep_id,
              invoice_date::text as invoice_date, due_date::text as due_date, subtotal, cgst, sgst, total, status, created_at
       FROM invoices
       WHERE id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: `Invoice '${id}' not found` });
    }

    const itemsRes = await pool.query(
      `SELECT id, invoice_id, sku, description, quantity, unit_price, tax_rate, created_at
       FROM invoice_items
       WHERE invoice_id = $1
       ORDER BY id ASC`,
      [id]
    );

    const invoice = invRes.rows[0];
    invoice.items = itemsRes.rows;
    invoice.amount_in_words = amountInWords(invoice.total);

    return res.json({ data: invoice });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/invoices
 * ERP-4 calls this when orders are fulfilled/dispatched, or created manually for non-order items (so_id empty).
 * Idempotent on so_id: a repeated non-empty so_id returns existing invoice (200).
 * Calculates 9% CGST and 9% SGST on subtotal.
 * Fetches customer GSTIN if missing for corporate/dealer from CRM-3.
 */
router.post('/invoices', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      so_id,
      customer_id,
      customer_name: passedName,
      customer_gstin: passedGstin,
      sales_rep_id,
      invoice_date: passedDate,
      due_date: passedDueDate,
      items
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invoice must contain at least one line item in items array' });
    }

    const cleanSoId = (so_id && String(so_id).trim()) ? String(so_id).trim() : null;

    // 1. Idempotency Check on so_id (safe retry for ERP-4)
    if (cleanSoId) {
      const existing = await client.query(
        `SELECT id, so_id, customer_id, customer_name, customer_gstin, sales_rep_id,
                invoice_date, due_date, subtotal, cgst, sgst, total, status, created_at
         FROM invoices
         WHERE so_id = $1`,
        [cleanSoId]
      );

      if (existing.rows.length > 0) {
        const existingInvoice = existing.rows[0];
        const existingItems = await client.query(
          `SELECT id, invoice_id, sku, description, quantity, unit_price, tax_rate, created_at
           FROM invoice_items
           WHERE invoice_id = $1
           ORDER BY id ASC`,
          [existingInvoice.id]
        );
        existingInvoice.items = existingItems.rows;
        existingInvoice.amount_in_words = amountInWords(existingInvoice.total);
        return res.status(200).json({
          data: existingInvoice,
          message: 'Existing invoice returned (idempotent so_id)'
        });
      }
    }

    // 2. Resolve Customer Name and GSTIN
    let customerName = passedName;
    let customerGstin = passedGstin;

    if (!customerGstin || !customerName) {
      try {
        const customer = await callService('crm3', `/api/customers/${customer_id}`, { mock: 'customer' });
        if (customer) {
          if (!customerName && customer.name) customerName = customer.name;
          if (!customerGstin && customer.gstin && (customer.type === 'corporate' || customer.type === 'dealer' || !customer.type)) {
            customerGstin = customer.gstin;
          }
        }
      } catch (err) {
        const localMockPath = path.resolve(__dirname, '../mocks/customer.json');
        if (fs.existsSync(localMockPath)) {
          try {
            const list = JSON.parse(fs.readFileSync(localMockPath, 'utf8'));
            const c = Array.isArray(list) ? list.find(x => x.id === customer_id) : (list.id === customer_id ? list : null);
            if (c) {
              if (!customerName && c.name) customerName = c.name;
              if (!customerGstin && c.gstin) customerGstin = c.gstin;
            }
          } catch (e) {}
        }
      }
    }

    if (!customerName) {
      customerName = `Customer ${customer_id}`;
    }

    // 3. Calculate Line Items, Subtotal, CGST, SGST, and Grand Total
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (let i = 0; i < items.length; i++) {
      const itm = items[i];
      const qty = parseInt(itm.quantity, 10);
      const price = parseFloat(itm.unit_price);
      const taxRate = itm.tax_rate !== undefined ? parseFloat(itm.tax_rate) : 18.0;

      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Item at index ${i} has invalid quantity: ${itm.quantity}` });
      }
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: `Item at index ${i} has invalid unit_price: ${itm.unit_price}` });
      }

      calculatedSubtotal += qty * price;
      validatedItems.push({
        sku: itm.sku || `SKU-${i + 1}`,
        description: itm.description || '',
        quantity: qty,
        unit_price: price,
        tax_rate: taxRate
      });
    }

    // Rounding to 2 decimal places per Indian GST standards
    const subtotal = Math.round(calculatedSubtotal * 100) / 100;
    const cgst = Math.round(subtotal * 0.09 * 100) / 100;
    const sgst = Math.round(subtotal * 0.09 * 100) / 100;
    const total = Math.round((subtotal + cgst + sgst) * 100) / 100;

    const invoiceDate = passedDate ? String(passedDate).split('T')[0] : new Date().toISOString().split('T')[0];
    const dueDate = passedDueDate ? String(passedDueDate).split('T')[0] : calculateDueDate(invoiceDate);

    // 4. Begin Database Transaction
    await client.query('BEGIN');

    // Generate Invoice ID
    const invSeqRes = await client.query(`SELECT nextval('invoices_seq') as seq`);
    const invoiceId = `INV-${String(invSeqRes.rows[0].seq).padStart(4, '0')}`;

    // Insert Invoice
    const insertInvQuery = `
      INSERT INTO invoices (
        id, so_id, customer_id, customer_name, customer_gstin, sales_rep_id,
        invoice_date, due_date, subtotal, cgst, sgst, total, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'unpaid')
      RETURNING *
    `;
    const invValues = [
      invoiceId,
      cleanSoId,
      customer_id,
      customerName,
      customerGstin || null,
      sales_rep_id || null,
      invoiceDate,
      dueDate,
      subtotal,
      cgst,
      sgst,
      total
    ];
    const invResult = await client.query(insertInvQuery, invValues);
    const createdInvoice = invResult.rows[0];

    // Insert Items
    const insertedItems = [];
    for (const item of validatedItems) {
      const itmSeqRes = await client.query(`SELECT nextval('invoice_items_seq') as seq`);
      const itemId = `ITM-${String(itmSeqRes.rows[0].seq).padStart(4, '0')}`;

      const insertItmQuery = `
        INSERT INTO invoice_items (id, invoice_id, sku, description, quantity, unit_price, tax_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const itmRes = await client.query(insertItmQuery, [
        itemId,
        invoiceId,
        item.sku,
        item.description,
        item.quantity,
        item.unit_price,
        item.tax_rate
      ]);
      insertedItems.push(itmRes.rows[0]);
    }

    // 5. Post Balanced Ledger Pair (ERP5-D1) in the Same Transaction
    await postLedgerPair(client, {
      type: 'invoice',
      reference: invoiceId,
      amount: total,
      description: `Sales Invoice ${invoiceId} for ${customerName}`
    });

    await client.query('COMMIT');

    createdInvoice.items = insertedItems;
    createdInvoice.amount_in_words = amountInWords(createdInvoice.total);
    return res.status(201).json({ data: createdInvoice });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
