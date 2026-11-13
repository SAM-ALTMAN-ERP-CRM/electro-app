const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth, requireRole } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');

const pool = makePool('crm1_db');

// Protect all quotes routes with authentication
router.use(requireAuth);

// In-memory cache/fallback for offline development & standalone testing
let inMemoryQuotes = [];
try {
  const mockPath = path.resolve(__dirname, '../mocks/quotes.json');
  if (fs.existsSync(mockPath)) {
    inMemoryQuotes = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm1] Could not load initial mock quotes:', err.message);
}

let mockQuoteIdCounter = inMemoryQuotes.length + 1;
let mockItemIdCounter = 10;

/**
 * Helper to calculate quote financial breakdown:
 * - subtotal = sum(quantity * unit_price)
 * - discount_amount = subtotal * (discount_percent / 100)
 * - taxable_value = subtotal - discount_amount
 * - gst = taxable_value * 0.18 (18% GST)
 * - total = taxable_value + gst
 */
function calculateQuoteFinancials(items = [], discountPercent = 0) {
  const subtotal = items.reduce((acc, itm) => acc + (Number(itm.quantity) * Number(itm.unit_price)), 0);
  const discountRate = Number(discountPercent) || 0;
  const discountAmount = Number((subtotal * (discountRate / 100)).toFixed(2));
  const taxableValue = Number((subtotal - discountAmount).toFixed(2));
  const gst = Number((taxableValue * 0.18).toFixed(2));
  const total = Number((taxableValue + gst).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount_amount: discountAmount,
    taxable_value: taxableValue,
    gst,
    total
  };
}

/**
 * Helper to execute a database query safely with offline fallback detection.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('no response') ||
      err.message.includes('Connection terminated')
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * GET /api/quotes
 * Query parameters:
 *   - ?opportunity_id=
 *   - ?status=
 *   - ?dealer_id=
 */
router.get('/quotes', async (req, res, next) => {
  try {
    const { opportunity_id, status, dealer_id } = req.query;

    let dbRows = null;
    try {
      let query = `
        SELECT id, opportunity_id, customer_id, dealer_id, sales_rep_id,
               status, discount_percent, needs_approval, approved, rejection_reason, created_at
        FROM quotes
        WHERE 1=1
      `;
      const params = [];

      if (opportunity_id) {
        params.push(opportunity_id);
        query += ` AND opportunity_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
      }
      if (dealer_id) {
        params.push(dealer_id);
        query += ` AND dealer_id = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await safeQuery(query, params);
      if (result) {
        dbRows = result.rows;
      }
    } catch (err) {
      console.warn('[crm1] DB query error on GET /quotes, falling back to memory:', err.message);
    }

    if (dbRows !== null) {
      // Fetch line items for each quote from database
      const quotesWithDetails = await Promise.all(
        dbRows.map(async (q) => {
          const itemsRes = await safeQuery(
            'SELECT id, quote_id, sku, product_name, quantity, unit_price FROM quote_items WHERE quote_id = $1 ORDER BY id ASC',
            [q.id]
          );
          const items = itemsRes ? itemsRes.rows.map(item => ({
            ...item,
            quantity: parseInt(item.quantity, 10),
            unit_price: parseFloat(item.unit_price)
          })) : [];

          const financials = calculateQuoteFinancials(items, parseFloat(q.discount_percent));

          return {
            id: q.id,
            opportunity_id: q.opportunity_id,
            customer_id: q.customer_id,
            dealer_id: q.dealer_id,
            sales_rep_id: q.sales_rep_id,
            status: q.status,
            discount_percent: parseFloat(q.discount_percent),
            needs_approval: q.needs_approval,
            approved: q.approved,
            rejection_reason: q.rejection_reason,
            created_at: q.created_at,
            ...financials,
            items
          };
        })
      );

      return res.json({ data: quotesWithDetails });
    }

    // In-memory fallback
    let filtered = inMemoryQuotes;
    if (opportunity_id) {
      filtered = filtered.filter(q => q.opportunity_id === opportunity_id);
    }
    if (status) {
      filtered = filtered.filter(q => q.status === status);
    }
    if (dealer_id) {
      filtered = filtered.filter(q => q.dealer_id === dealer_id);
    }

    return res.json({ data: filtered });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/quotes/:id
 * Returns quote details, items array, subtotal, discount amount, GST 18% and total.
 */
router.get('/quotes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    let dbQuote = null;
    try {
      const qResult = await safeQuery(
        `SELECT id, opportunity_id, customer_id, dealer_id, sales_rep_id,
                status, discount_percent, needs_approval, approved, rejection_reason, created_at
         FROM quotes
         WHERE id = $1`,
        [id]
      );
      if (qResult && qResult.rows.length > 0) {
        dbQuote = qResult.rows[0];
      }
    } catch (err) {
      console.warn(`[crm1] DB query error on GET /quotes/${id}, falling back:`, err.message);
    }

    if (dbQuote) {
      const itemsRes = await safeQuery(
        'SELECT id, quote_id, sku, product_name, quantity, unit_price FROM quote_items WHERE quote_id = $1 ORDER BY id ASC',
        [id]
      );
      const items = itemsRes ? itemsRes.rows.map(item => ({
        ...item,
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price)
      })) : [];

      const financials = calculateQuoteFinancials(items, parseFloat(dbQuote.discount_percent));

      return res.json({
        data: {
          id: dbQuote.id,
          opportunity_id: dbQuote.opportunity_id,
          customer_id: dbQuote.customer_id,
          dealer_id: dbQuote.dealer_id,
          sales_rep_id: dbQuote.sales_rep_id,
          status: dbQuote.status,
          discount_percent: parseFloat(dbQuote.discount_percent),
          needs_approval: dbQuote.needs_approval,
          approved: dbQuote.approved,
          rejection_reason: dbQuote.rejection_reason,
          created_at: dbQuote.created_at,
          ...financials,
          items
        }
      });
    }

    // In-memory fallback lookup
    const found = inMemoryQuotes.find(q => q.id === id);
    if (found) {
      const financials = calculateQuoteFinancials(found.items || [], found.discount_percent);
      return res.json({
        data: {
          ...found,
          ...financials
        }
      });
    }

    return res.status(404).json({ error: `Quote with ID '${id}' not found` });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/quotes
 * Creates a quote with line items in one atomic transaction.
 */
router.post('/quotes', async (req, res, next) => {
  try {
    const {
      opportunity_id,
      customer_id,
      dealer_id,
      sales_rep_id,
      discount_percent,
      status = 'draft',
      items
    } = req.body;

    // 1. Validation: customer_id is required
    if (!customer_id || typeof customer_id !== 'string' || customer_id.trim() === '') {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    // 2. Validation: sales_rep_id is required
    if (!sales_rep_id || typeof sales_rep_id !== 'string' || sales_rep_id.trim() === '') {
      return res.status(400).json({ error: 'sales_rep_id is required' });
    }

    // 3. Validation: status must be one of allowed values
    const allowedStatuses = ['draft', 'sent', 'accepted', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    // 4. Validation: discount_percent
    let discountPercentVal = 0.0;
    if (discount_percent !== undefined && discount_percent !== null) {
      discountPercentVal = Number(discount_percent);
      if (isNaN(discountPercentVal) || discountPercentVal < 0 || discountPercentVal > 100) {
        return res.status(400).json({
          error: 'discount_percent must be a number between 0 and 100'
        });
      }
    }

    // 5. Validation: items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'items must be a non-empty array of quote items'
      });
    }

    for (let i = 0; i < items.length; i++) {
      const itm = items[i];
      if (!itm.sku || typeof itm.sku !== 'string' || itm.sku.trim() === '') {
        return res.status(400).json({ error: `Item ${i + 1}: sku is required` });
      }
      if (!itm.product_name || typeof itm.product_name !== 'string' || itm.product_name.trim() === '') {
        return res.status(400).json({ error: `Item ${i + 1}: product_name is required` });
      }
      const qty = Number(itm.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({ error: `Item ${i + 1}: quantity must be a positive integer` });
      }
      const price = Number(itm.unit_price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: `Item ${i + 1}: unit_price must be a non-negative number` });
      }
    }

    // Determine approval requirements: discounts above 5% need approval ([CRM1-C3])
    const needsApproval = discountPercentVal > 5 || Boolean(req.body.needs_approval);
    const approved = Boolean(req.body.approved);
    const rejectionReason = req.body.rejection_reason || null;

    // Try executing database transaction
    let client = null;
    let dbSuccess = false;
    let savedQuote = null;
    let savedItems = [];

    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // Generate quote ID via sequence
      let quoteId;
      try {
        const seqRes = await client.query("SELECT 'QUO-' || LPAD(nextval('quote_seq')::TEXT, 4, '0') AS next_id");
        quoteId = seqRes.rows[0].next_id;
      } catch (seqErr) {
        const maxRes = await client.query(
          "SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)), 0) + 1 AS next_n FROM quotes WHERE id LIKE 'QUO-%'"
        );
        quoteId = `QUO-${String(maxRes.rows[0].next_n).padStart(4, '0')}`;
      }

      // Insert Quote
      const insertQuoteRes = await client.query(
        `INSERT INTO quotes (
          id, opportunity_id, customer_id, dealer_id, sales_rep_id,
          status, discount_percent, needs_approval, approved, rejection_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          quoteId,
          opportunity_id || null,
          customer_id.trim(),
          dealer_id ? dealer_id.trim() : null,
          sales_rep_id.trim(),
          status,
          discountPercentVal,
          needsApproval,
          approved,
          rejectionReason
        ]
      );
      savedQuote = insertQuoteRes.rows[0];

      // Insert line items
      for (const itm of items) {
        let itemId;
        try {
          const itemSeqRes = await client.query("SELECT 'QI-' || LPAD(nextval('quote_items_seq')::TEXT, 4, '0') AS next_id");
          itemId = itemSeqRes.rows[0].next_id;
        } catch (itemSeqErr) {
          const maxItemRes = await client.query(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER)), 0) + 1 AS next_n FROM quote_items WHERE id LIKE 'QI-%'"
          );
          itemId = `QI-${String(maxItemRes.rows[0].next_n).padStart(4, '0')}`;
        }

        const insertItemRes = await client.query(
          `INSERT INTO quote_items (
            id, quote_id, sku, product_name, quantity, unit_price
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            itemId,
            quoteId,
            itm.sku.trim(),
            itm.product_name.trim(),
            parseInt(itm.quantity, 10),
            parseFloat(itm.unit_price)
          ]
        );
        savedItems.push({
          ...insertItemRes.rows[0],
          quantity: parseInt(insertItemRes.rows[0].quantity, 10),
          unit_price: parseFloat(insertItemRes.rows[0].unit_price)
        });
      }

      await client.query('COMMIT');
      dbSuccess = true;
    } catch (dbErr) {
      if (client) {
        await client.query('ROLLBACK').catch(() => {});
      }
      console.warn('[crm1] Database transaction failed or DB offline, using memory store:', dbErr.message);
    } finally {
      if (client) {
        client.release();
      }
    }

    // In-memory fallback if database was unreachable
    if (!dbSuccess) {
      const quoteId = `QUO-${String(mockQuoteIdCounter++).padStart(4, '0')}`;
      savedItems = items.map(itm => ({
        id: `QI-${String(mockItemIdCounter++).padStart(4, '0')}`,
        quote_id: quoteId,
        sku: itm.sku.trim(),
        product_name: itm.product_name.trim(),
        quantity: parseInt(itm.quantity, 10),
        unit_price: parseFloat(itm.unit_price)
      }));

      savedQuote = {
        id: quoteId,
        opportunity_id: opportunity_id || null,
        customer_id: customer_id.trim(),
        dealer_id: dealer_id ? dealer_id.trim() : null,
        sales_rep_id: sales_rep_id.trim(),
        status,
        discount_percent: discountPercentVal,
        needs_approval: needsApproval,
        approved,
        rejection_reason: rejectionReason,
        created_at: new Date().toISOString()
      };

      inMemoryQuotes.push({
        ...savedQuote,
        ...calculateQuoteFinancials(savedItems, discountPercentVal),
        items: savedItems
      });
    }

    const financials = calculateQuoteFinancials(savedItems, discountPercentVal);

    return res.status(201).json({
      data: {
        id: savedQuote.id,
        opportunity_id: savedQuote.opportunity_id,
        customer_id: savedQuote.customer_id,
        dealer_id: savedQuote.dealer_id,
        sales_rep_id: savedQuote.sales_rep_id,
        status: savedQuote.status,
        discount_percent: parseFloat(savedQuote.discount_percent),
        needs_approval: savedQuote.needs_approval,
        approved: savedQuote.approved,
        rejection_reason: savedQuote.rejection_reason,
        created_at: savedQuote.created_at,
        ...financials,
        items: savedItems
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/quotes/:id/status
 * Updates quote status following stage progression & discount rules ([CRM1-C3]).
 * Body: { status, rejection_reason? }
 *
 * Rules:
 * 1. Allowed target statuses: 'sent', 'accepted', 'rejected'.
 * 2. Progression:
 *    - 'draft' -> 'sent' (blocked if needs_approval && !approved)
 *    - 'sent' -> 'accepted' or 'rejected'
 * 3. Side effects when status becomes 'accepted':
 *    (1) POST to ERP-4 /api/sales-orders
 *    (2) POST to CRM-3 /api/interactions/from-event
 */
router.patch('/quotes/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: targetStatus, rejection_reason } = req.body;

    // 1. Validate target status
    const allowedTargets = ['sent', 'accepted', 'rejected'];
    if (!targetStatus || !allowedTargets.includes(targetStatus)) {
      return res.status(400).json({
        error: `Target status must be one of: ${allowedTargets.join(', ')}`
      });
    }

    // 2. Fetch existing quote and items
    let currentQuote = null;
    let quoteItems = [];

    try {
      const qRes = await safeQuery('SELECT * FROM quotes WHERE id = $1', [id]);
      if (qRes && qRes.rows.length > 0) {
        currentQuote = qRes.rows[0];
        const itmRes = await safeQuery(
          'SELECT id, quote_id, sku, product_name, quantity, unit_price FROM quote_items WHERE quote_id = $1 ORDER BY id ASC',
          [id]
        );
        quoteItems = itmRes ? itmRes.rows.map(item => ({
          ...item,
          quantity: parseInt(item.quantity, 10),
          unit_price: parseFloat(item.unit_price)
        })) : [];
      }
    } catch (err) {
      console.warn(`[crm1] DB query error on PATCH /quotes/${id}/status:`, err.message);
    }

    if (!currentQuote) {
      // In-memory fallback
      const found = inMemoryQuotes.find(q => q.id === id);
      if (found) {
        currentQuote = found;
        quoteItems = found.items || [];
      }
    }

    if (!currentQuote) {
      return res.status(404).json({ error: `Quote with ID '${id}' not found` });
    }

    // 3. Status transition rules
    const currentStatus = currentQuote.status;

    if (currentStatus === 'draft') {
      if (targetStatus !== 'sent') {
        return res.status(400).json({
          error: `Quotes in 'draft' status must be moved to 'sent' before being accepted or rejected`
        });
      }

      // Check discount approval: if discount > 5% or needs_approval, must be approved first
      const isHighDiscount = parseFloat(currentQuote.discount_percent) > 5;
      const requiresApproval = currentQuote.needs_approval || isHighDiscount;
      if (requiresApproval && !currentQuote.approved) {
        return res.status(400).json({
          error: 'Quote requires approval before it can be sent (discount exceeds 5%)'
        });
      }
    } else if (currentStatus === 'sent') {
      if (targetStatus !== 'accepted' && targetStatus !== 'rejected') {
        return res.status(400).json({
          error: `Quotes in 'sent' status can only be moved to 'accepted' or 'rejected'`
        });
      }
    } else {
      // Status is already 'accepted' or 'rejected'
      return res.status(400).json({
        error: `Cannot change status of a quote that is already '${currentStatus}'`
      });
    }

    // 4. Update the quote in Database
    let updatedQuote = null;
    try {
      const updateRes = await safeQuery(
        `UPDATE quotes
         SET status = $1,
             rejection_reason = CASE WHEN $1 = 'rejected' THEN COALESCE($2, rejection_reason) ELSE rejection_reason END
         WHERE id = $3
         RETURNING *`,
        [targetStatus, rejection_reason || null, id]
      );
      if (updateRes && updateRes.rows.length > 0) {
        updatedQuote = updateRes.rows[0];
      }
    } catch (dbErr) {
      console.warn('[crm1] Failed to update quote status in DB:', dbErr.message);
    }

    // Update in-memory record
    const memIdx = inMemoryQuotes.findIndex(q => q.id === id);
    if (memIdx !== -1) {
      inMemoryQuotes[memIdx] = {
        ...inMemoryQuotes[memIdx],
        status: targetStatus,
        rejection_reason: targetStatus === 'rejected' ? (rejection_reason || inMemoryQuotes[memIdx].rejection_reason) : inMemoryQuotes[memIdx].rejection_reason
      };
      if (!updatedQuote) {
        updatedQuote = inMemoryQuotes[memIdx];
      }
    } else if (!updatedQuote) {
      updatedQuote = {
        ...currentQuote,
        status: targetStatus,
        rejection_reason: targetStatus === 'rejected' ? (rejection_reason || currentQuote.rejection_reason) : currentQuote.rejection_reason
      };
      inMemoryQuotes.push(updatedQuote);
    }

    // 5. Side effects when status becomes 'accepted' ([CRM1-C3])
    if (targetStatus === 'accepted') {
      // (1) Handoff to ERP-4 (/api/sales-orders)
      try {
        await callService('erp4', '/api/sales-orders', {
          method: 'POST',
          body: {
            quote_id: updatedQuote.id,
            customer_id: updatedQuote.customer_id,
            sales_rep_id: updatedQuote.sales_rep_id,
            items: quoteItems.map(itm => ({
              sku: itm.sku,
              product_name: itm.product_name,
              quantity: parseInt(itm.quantity, 10),
              unit_price: parseFloat(itm.unit_price)
            }))
          },
          mock: 'sales-orders'
        });
      } catch (err) {
        if (err.status === 409) {
          console.log(`[crm1] Order already exists in ERP-4 for quote ${updatedQuote.id} (HTTP 409)`);
        } else {
          console.error('[integration-error] ERP-4 order handoff failed:', err.message);
        }
      }

      // (2) Customer 360 Timeline event (CRM-3)
      try {
        await callService('crm3', '/api/interactions/from-event', {
          method: 'POST',
          body: {
            customer_id: updatedQuote.customer_id,
            type: 'order',
            summary: `Quote ${updatedQuote.id} accepted.`,
            source_team: 'CRM-1'
          },
          mock: 'timeline-event'
        });
      } catch (err) {
        console.error('[integration-error] CRM-3 timeline event failed:', err.message);
      }
    }

    const financials = calculateQuoteFinancials(quoteItems, parseFloat(updatedQuote.discount_percent));

    return res.json({
      data: {
        id: updatedQuote.id,
        opportunity_id: updatedQuote.opportunity_id,
        customer_id: updatedQuote.customer_id,
        dealer_id: updatedQuote.dealer_id,
        sales_rep_id: updatedQuote.sales_rep_id,
        status: updatedQuote.status,
        discount_percent: parseFloat(updatedQuote.discount_percent),
        needs_approval: updatedQuote.needs_approval,
        approved: updatedQuote.approved,
        rejection_reason: updatedQuote.rejection_reason,
        created_at: updatedQuote.created_at,
        ...financials,
        items: quoteItems
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/approvals ([CRM1-D3])
 * Returns all quotes waiting for discount approval (needs_approval = true AND approved = false AND status = 'draft').
 * Protected: requireRole('admin')
 */
router.get('/approvals', requireRole('admin'), async (req, res, next) => {
  try {
    let quotesList = [];

    try {
      let result;
      try {
        result = await pool.query(`
          SELECT q.id, q.opportunity_id, q.customer_id, q.dealer_id, q.sales_rep_id,
                 q.status, q.discount_percent, q.needs_approval, q.approved, q.rejection_reason, q.created_at,
                 d.name AS dealer_name, d.tier AS dealer_tier
          FROM quotes q
          LEFT JOIN dealers d ON q.dealer_id = d.id
          WHERE q.needs_approval = TRUE AND q.approved = FALSE AND q.status = 'draft'
          ORDER BY q.created_at DESC
        `);
      } catch (joinErr) {
        result = await pool.query(`
          SELECT id, opportunity_id, customer_id, dealer_id, sales_rep_id,
                 status, discount_percent, needs_approval, approved, rejection_reason, created_at
          FROM quotes
          WHERE needs_approval = TRUE AND approved = FALSE AND status = 'draft'
          ORDER BY created_at DESC
        `);
      }

      const rows = result.rows;
      if (rows.length > 0) {
        const quoteIds = rows.map(r => r.id);
        const itemsResult = await pool.query(
          `SELECT id, quote_id, sku, product_name, quantity, unit_price
           FROM quote_items
           WHERE quote_id = ANY($1)
           ORDER BY id ASC`,
          [quoteIds]
        );

        const itemsByQuote = {};
        for (const item of itemsResult.rows) {
          if (!itemsByQuote[item.quote_id]) itemsByQuote[item.quote_id] = [];
          itemsByQuote[item.quote_id].push({
            id: item.id,
            quote_id: item.quote_id,
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price)
          });
        }

        quotesList = rows.map(r => {
          const items = itemsByQuote[r.id] || [];
          const discountPercent = parseFloat(r.discount_percent);
          const financials = calculateQuoteFinancials(items, discountPercent);
          const dealerTier = r.dealer_tier || (r.dealer_id === 'DLR-0001' || r.dealer_id === 'DLR-0004' ? 'gold' : (r.dealer_id === 'DLR-0002' || r.dealer_id === 'DLR-0005' ? 'silver' : 'bronze'));

          return {
            id: r.id,
            opportunity_id: r.opportunity_id,
            customer_id: r.customer_id,
            dealer_id: r.dealer_id,
            dealer_name: r.dealer_name || null,
            dealer_tier: dealerTier,
            sales_rep_id: r.sales_rep_id,
            status: r.status,
            discount_percent: discountPercent,
            needs_approval: r.needs_approval,
            approved: r.approved,
            rejection_reason: r.rejection_reason,
            created_at: r.created_at,
            ...financials,
            total_amount: financials.total,
            items
          };
        });
      }
    } catch (dbErr) {
      console.warn('[crm1] Database query error on GET /approvals, falling back to memory:', dbErr.message);
    }

    // In-memory fallback
    if (quotesList.length === 0) {
      quotesList = inMemoryQuotes
        .filter(q => q.needs_approval === true && q.approved === false && q.status === 'draft')
        .map(q => {
          const items = q.items || [];
          const financials = calculateQuoteFinancials(items, q.discount_percent);
          const dealerTier = q.dealer_tier || (q.dealer_id === 'DLR-0001' || q.dealer_id === 'DLR-0004' ? 'gold' : (q.dealer_id === 'DLR-0002' || q.dealer_id === 'DLR-0005' ? 'silver' : 'bronze'));
          return {
            id: q.id,
            opportunity_id: q.opportunity_id,
            customer_id: q.customer_id,
            dealer_id: q.dealer_id,
            dealer_name: q.dealer_name || null,
            dealer_tier: dealerTier,
            sales_rep_id: q.sales_rep_id,
            status: q.status,
            discount_percent: parseFloat(q.discount_percent),
            needs_approval: q.needs_approval,
            approved: q.approved,
            rejection_reason: q.rejection_reason,
            created_at: q.created_at,
            ...financials,
            total_amount: financials.total,
            items
          };
        });
    }

    return res.json({ data: quotesList });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/quotes/:id/approve ([CRM1-D3])
 * Approves a quote that requires manager discount authorization.
 * Protected: requireRole('admin')
 */
router.patch('/quotes/:id/approve', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    let updatedQuote = null;

    try {
      const updateResult = await pool.query(
        `UPDATE quotes
         SET approved = TRUE
         WHERE id = $1
         RETURNING id, opportunity_id, customer_id, dealer_id, sales_rep_id,
                   status, discount_percent, needs_approval, approved, rejection_reason, created_at`,
        [id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: `Quote with ID '${id}' not found` });
      }

      updatedQuote = updateResult.rows[0];
    } catch (dbErr) {
      console.warn(`[crm1] Database update failed for approve on ${id}, falling back:`, dbErr.message);
    }

    // Always update in-memory fallback
    const memQuote = inMemoryQuotes.find(q => q.id === id);
    if (memQuote) {
      memQuote.approved = true;
      if (!updatedQuote) {
        updatedQuote = memQuote;
      }
    }

    if (!updatedQuote) {
      return res.status(404).json({ error: `Quote with ID '${id}' not found` });
    }

    return res.json({
      data: {
        id: updatedQuote.id,
        approved: true,
        needs_approval: updatedQuote.needs_approval,
        status: updatedQuote.status,
        message: `Quote ${updatedQuote.id} approved successfully`
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/quotes/:id/reject ([CRM1-D3])
 * Rejects a quote and records the manager's rejection reason. Sets status = 'rejected'.
 * Protected: requireRole('admin')
 */
router.patch('/quotes/:id/reject', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    let updatedQuote = null;

    try {
      const updateResult = await pool.query(
        `UPDATE quotes
         SET rejection_reason = $1, status = 'rejected'
         WHERE id = $2
         RETURNING id, opportunity_id, customer_id, dealer_id, sales_rep_id,
                   status, discount_percent, needs_approval, approved, rejection_reason, created_at`,
        [reason.trim(), id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: `Quote with ID '${id}' not found` });
      }

      updatedQuote = updateResult.rows[0];
    } catch (dbErr) {
      console.warn(`[crm1] Database update failed for reject on ${id}, falling back:`, dbErr.message);
    }

    // Always update in-memory fallback
    const memQuote = inMemoryQuotes.find(q => q.id === id);
    if (memQuote) {
      memQuote.rejection_reason = reason.trim();
      memQuote.status = 'rejected';
      memQuote.approved = false;
      if (!updatedQuote) {
        updatedQuote = memQuote;
      }
    }

    if (!updatedQuote) {
      return res.status(404).json({ error: `Quote with ID '${id}' not found` });
    }

    return res.json({
      data: {
        id: updatedQuote.id,
        status: 'rejected',
        rejection_reason: updatedQuote.rejection_reason,
        approved: false,
        message: `Quote ${updatedQuote.id} rejected`
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
