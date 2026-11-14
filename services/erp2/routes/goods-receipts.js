const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');

const router = express.Router();
const pool = makePool('erp2');

router.use(requireAuth);

/**
 * Validates a YYYY-MM-DD date string.
 */
function isValidDateString(val) {
  if (val == null || val === '') return false;
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const d = new Date(`${val}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === val;
}

/**
 * GET /api/goods-receipts
 * List all Goods Receipt Notes, optionally filtered by po_id.
 */
router.get('/goods-receipts', async (req, res, next) => {
  try {
    const { po_id } = req.query;
    const query = `
      SELECT gr.id, gr.po_id, gr.received_by, to_char(gr.received_on, 'YYYY-MM-DD') AS received_on,
             gr.notes, gr.created_at, po.status AS po_status, po.supplier_id
      FROM goods_receipts gr
      JOIN purchase_orders po ON po.id = gr.po_id
      WHERE ($1::text IS NULL OR gr.po_id = $1)
      ORDER BY gr.created_at DESC, gr.id DESC
    `;
    const result = await pool.query(query, [po_id || null]);

    // Attach items to each receipt
    const receiptsWithItems = await Promise.all(
      result.rows.map(async (grn) => {
        const itemsRes = await pool.query(
          `SELECT gi.id, gi.grn_id, gi.sku, gi.received_qty, pi.product_name, pi.unit_cost
           FROM grn_items gi
           LEFT JOIN po_items pi ON pi.po_id = $1 AND pi.sku = gi.sku
           WHERE gi.grn_id = $2
           ORDER BY gi.id ASC`,
          [grn.po_id, grn.id]
        );
        return {
          ...grn,
          items: itemsRes.rows
        };
      })
    );

    res.json({ data: receiptsWithItems });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/goods-receipts/:id
 * Retrieve a single Goods Receipt Note with item details and purchase order info.
 */
router.get('/goods-receipts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const grnRes = await pool.query(
      `SELECT gr.id, gr.po_id, gr.received_by, to_char(gr.received_on, 'YYYY-MM-DD') AS received_on,
              gr.notes, gr.created_at, po.status AS po_status, po.supplier_id, po.total_amount
       FROM goods_receipts gr
       JOIN purchase_orders po ON po.id = gr.po_id
       WHERE gr.id = $1`,
      [id]
    );

    if (!grnRes.rowCount) {
      return res.status(404).json({ error: 'Goods receipt note not found' });
    }

    const grn = grnRes.rows[0];
    const itemsRes = await pool.query(
      `SELECT gi.id, gi.grn_id, gi.sku, gi.received_qty, pi.product_name, pi.unit_cost, pi.quantity AS ordered_qty
       FROM grn_items gi
       LEFT JOIN po_items pi ON pi.po_id = $1 AND pi.sku = gi.sku
       WHERE gi.grn_id = $2
       ORDER BY gi.id ASC`,
      [grn.po_id, grn.id]
    );

    res.json({
      data: {
        ...grn,
        items: itemsRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goods-receipts
 * Creates a Goods Receipt Note (GRN), updates PO item quantities and PO status,
 * triggers ERP-1 stock adjustment and ERP-5 purchase ledger entry.
 */
router.post('/goods-receipts', async (req, res, next) => {
  const { po_id, received_by, received_on, notes, items } = req.body || {};

  // 1. Validate primary fields
  if (typeof po_id !== 'string' || !po_id.trim()) {
    return res.status(400).json({ error: 'Purchase Order ID (po_id) is required' });
  }
  if (typeof received_by !== 'string' || !received_by.trim()) {
    return res.status(400).json({ error: 'Received By (received_by) is required' });
  }

  const cleanPoId = po_id.trim();
  const cleanReceivedBy = received_by.trim();
  const cleanNotes = typeof notes === 'string' ? notes.trim() : null;

  let finalReceivedOn;
  if (received_on) {
    if (!isValidDateString(received_on)) {
      return res.status(400).json({ error: 'Invalid received_on date format. Expected YYYY-MM-DD' });
    }
    finalReceivedOn = received_on;
  } else {
    finalReceivedOn = new Date().toISOString().split('T')[0];
  }

  // 2. Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required in the items array' });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item.sku !== 'string' || !item.sku.trim()) {
      return res.status(400).json({ error: `Item at index ${i} must have a valid SKU` });
    }
    const qty = Number(item.received_qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ error: `Received quantity for SKU ${item.sku} must be a positive integer` });
    }
  }

  // Aggregate incoming received quantities by SKU in case duplicate entries exist
  const consolidated = new Map();
  for (const item of items) {
    const sku = item.sku.trim();
    const qty = Number(item.received_qty);
    consolidated.set(sku, (consolidated.get(sku) || 0) + qty);
  }

  let client;
  try {
    client = await pool.connect();

    // 3. Verify Purchase Order existence and state
    const poRes = await client.query(
      `SELECT id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date,
              total_amount, sent_at, created_at
       FROM purchase_orders WHERE id = $1`,
      [cleanPoId]
    );

    if (poRes.rowCount === 0) {
      return res.status(404).json({ error: `Purchase order ${cleanPoId} not found` });
    }

    const currentPo = poRes.rows[0];

    // Only sent or partially_received POs can receive goods
    if (currentPo.status === 'draft') {
      return res.status(400).json({ error: `Cannot receive goods for draft purchase order ${cleanPoId}. Send the order first.` });
    }
    if (currentPo.status === 'cancelled') {
      return res.status(400).json({ error: `Cannot receive goods for cancelled purchase order ${cleanPoId}` });
    }
    if (currentPo.status === 'received') {
      return res.status(400).json({ error: `Purchase order ${cleanPoId} is already fully received` });
    }

    // 4. Fetch all existing po_items and validate quantities
    const poItemsRes = await client.query(
      `SELECT id, po_id, sku, product_name, quantity, unit_cost, received_qty
       FROM po_items WHERE po_id = $1`,
      [cleanPoId]
    );

    const poItemsBySku = new Map();
    poItemsRes.rows.forEach(item => poItemsBySku.set(item.sku, item));

    for (const [sku, recvQty] of consolidated.entries()) {
      const poItem = poItemsBySku.get(sku);
      if (!poItem) {
        return res.status(400).json({ error: `SKU '${sku}' does not belong to purchase order ${cleanPoId}` });
      }
      const remainingQty = poItem.quantity - poItem.received_qty;
      if (recvQty > remainingQty) {
        return res.status(400).json({
          error: `Received quantity (${recvQty}) exceeds remaining ordered quantity (${remainingQty}) for SKU ${sku}`
        });
      }
    }

    // 5. Begin Database Transaction
    await client.query('BEGIN');

    // Insert Goods Receipt Header
    const grnInsertRes = await client.query(
      `INSERT INTO goods_receipts (po_id, received_by, received_on, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, po_id, received_by, to_char(received_on, 'YYYY-MM-DD') AS received_on, notes, created_at`,
      [cleanPoId, cleanReceivedBy, finalReceivedOn, cleanNotes]
    );
    const grn = grnInsertRes.rows[0];

    // Insert GRN Items and update PO Items received_qty
    const savedGrnItems = [];
    let totalReceiptAmount = 0;

    for (const [sku, recvQty] of consolidated.entries()) {
      const poItem = poItemsBySku.get(sku);

      // Insert GRN Item
      const grnItemRes = await client.query(
        `INSERT INTO grn_items (grn_id, sku, received_qty)
         VALUES ($1, $2, $3)
         RETURNING id, grn_id, sku, received_qty`,
        [grn.id, sku, recvQty]
      );
      savedGrnItems.push({
        ...grnItemRes.rows[0],
        product_name: poItem.product_name,
        unit_cost: poItem.unit_cost
      });

      // Update PO Item received_qty
      await client.query(
        `UPDATE po_items
         SET received_qty = received_qty + $1
         WHERE po_id = $2 AND sku = $3`,
        [recvQty, cleanPoId, sku]
      );

      // Calculate receipt cost for ledger integration
      totalReceiptAmount += recvQty * parseFloat(poItem.unit_cost);
    }

    // 6. Determine Updated Purchase Order Status
    const allPoItemsRes = await client.query(
      `SELECT quantity, received_qty FROM po_items WHERE po_id = $1`,
      [cleanPoId]
    );

    const isFullyReceived = allPoItemsRes.rows.every(row => row.received_qty >= row.quantity);
    const hasAnyReceived = allPoItemsRes.rows.some(row => row.received_qty > 0);

    let nextPoStatus = 'sent';
    if (isFullyReceived) {
      nextPoStatus = 'received';
    } else if (hasAnyReceived) {
      nextPoStatus = 'partially_received';
    }

    const updatedPoRes = await client.query(
      `UPDATE purchase_orders
       SET status = $1
       WHERE id = $2
       RETURNING id, supplier_id, status, to_char(expected_date, 'YYYY-MM-DD') AS expected_date,
                 total_amount, sent_at, created_at`,
      [nextPoStatus, cleanPoId]
    );
    const updatedPo = updatedPoRes.rows[0];

    // Commit Transaction
    await client.query('COMMIT');

    // 7. External Integrations (Side Effects in try/catch)
    // 7a. ERP-1 Stock Adjustment: POST /api/stock/adjust for each received item
    for (const item of savedGrnItems) {
      try {
        await callService('erp1', '/api/stock/adjust', {
          method: 'POST',
          body: {
            sku: item.sku,
            warehouse_id: 'WH-01',
            delta: item.received_qty,
            reason: grn.id
          },
          mock: 'stock-adjust'
        });
        console.log(`[stock-adjust] Successfully notified ERP-1 for SKU ${item.sku} (+${item.received_qty}) in WH-01`);
      } catch (stockErr) {
        console.warn(`[integration-error] Failed to adjust ERP-1 stock for SKU ${item.sku} on GRN ${grn.id}:`, stockErr.message);
      }
    }

    // 7b. ERP-5 Ledger Integration: POST /api/ledger/auto with type purchase
    try {
      await callService('erp5', '/api/ledger/auto', {
        method: 'POST',
        body: {
          type: 'purchase',
          reference: grn.id,
          amount: parseFloat(totalReceiptAmount.toFixed(2)),
          description: `Goods receipt ${grn.id} against ${cleanPoId}`
        },
        mock: 'ledger'
      });
      console.log(`[ledger-auto] Successfully posted purchase entry to ERP-5 for GRN ${grn.id} (amount: ₹${totalReceiptAmount.toFixed(2)})`);
    } catch (ledgerErr) {
      console.warn(`[integration-error] Failed to post ERP-5 ledger entry for GRN ${grn.id}:`, ledgerErr.message);
    }

    // 8. Return response
    return res.status(201).json({
      data: {
        id: grn.id,
        po_id: grn.po_id,
        received_by: grn.received_by,
        received_on: grn.received_on,
        notes: grn.notes,
        created_at: grn.created_at,
        items: savedGrnItems,
        po_status: updatedPo.status,
        purchase_order: updatedPo
      }
    });

  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[erp2] Rollback failed:', rollbackErr.message);
      }
    }
    next(err);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
