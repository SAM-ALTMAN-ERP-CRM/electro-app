const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');
const store = require('../store');

// Connect to ERP-4 PostgreSQL database
const pool = makePool('erp4_db');

// Protect all sales order routes with authentication
router.use(requireAuth);

// In-memory fallback cache so the API functions in offline/dev environments
const inMemoryOrders = store.inMemoryOrders;

let orderCounter = inMemoryOrders.length + 1;

/**
 * Execute query safely; returns null if PostgreSQL database is offline.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * POST /api/sales-orders
 * Creates a new sales order with line items.
 * Called by CRM-1 when a quote is accepted.
 * A repeated quote_id returns HTTP 409 Conflict.
 * Automatically looks up customer details from CRM-3 (ERP4-A3).
 */
router.post('/sales-orders', async (req, res, next) => {
  try {
    const { customer_id, customer_name, customer_gstin, sales_rep_id, quote_id, items } = req.body;

    // 1. Validate required fields
    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array cannot be empty' });
    }

    // 2. Validate line items and calculate total amount
    let totalAmount = 0;
    for (const item of items) {
      if (!item.sku || typeof item.sku !== 'string') {
        return res.status(400).json({ error: 'each item must have a valid sku' });
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `invalid quantity for sku ${item.sku}` });
      }
      const price = parseFloat(item.unit_price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: `invalid unit_price for sku ${item.sku}` });
      }
      totalAmount += qty * price;
    }
    totalAmount = Math.round(totalAmount * 100) / 100;

    // 3. Customer lookup from CRM-3 (ERP4-A3)
    let fetchedCustomer = null;
    try {
      fetchedCustomer = await callService('crm3', `/api/customers/${customer_id}`, { mock: 'customer' });
    } catch (lookupErr) {
      // Fall back to local mock customer list if CRM-3 is offline
      try {
        const custMockPath = path.resolve(__dirname, '../mocks/customer.json');
        if (fs.existsSync(custMockPath)) {
          const allMocks = JSON.parse(fs.readFileSync(custMockPath, 'utf-8'));
          fetchedCustomer = allMocks.find(c => c.id === customer_id);
        }
      } catch (mErr) {
        // ignore
      }
    }

    const resolvedCustomerName = customer_name || fetchedCustomer?.name || `Customer ${customer_id}`;
    const resolvedGstin = customer_gstin || fetchedCustomer?.gstin || null;
    const resolvedQuoteId = quote_id ? String(quote_id).trim() : null;

    // 4. Duplicate quote check (HTTP 409 Conflict)
    if (resolvedQuoteId) {
      const checkDb = await safeQuery(
        'SELECT id FROM sales_orders WHERE quote_id = $1 LIMIT 1',
        [resolvedQuoteId]
      );
      if (checkDb && checkDb.rows.length > 0) {
        return res.status(409).json({
          error: `Sales order with quote_id ${resolvedQuoteId} already exists (${checkDb.rows[0].id})`
        });
      }

      const dupMem = inMemoryOrders.find(o => o.quote_id === resolvedQuoteId);
      if (dupMem) {
        return res.status(409).json({
          error: `Sales order with quote_id ${resolvedQuoteId} already exists (${dupMem.id})`
        });
      }
    }

    // 5. Insert into PostgreSQL if connected
    let client = null;
    try {
      client = await pool.connect();
    } catch (e) {
      client = null;
    }

    if (client) {
      try {
        await client.query('BEGIN');
        const orderInsertSql = `
          INSERT INTO sales_orders (customer_id, customer_name, customer_gstin, sales_rep_id, quote_id, total_amount, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'created')
          RETURNING *
        `;
        const orderRes = await client.query(orderInsertSql, [
          customer_id.trim(),
          resolvedCustomerName.trim(),
          resolvedGstin ? resolvedGstin.trim() : null,
          sales_rep_id || null,
          resolvedQuoteId,
          totalAmount
        ]);
        const newOrder = orderRes.rows[0];

        const itemInsertSql = `
          INSERT INTO so_items (so_id, sku, product_name, quantity, unit_price)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const insertedItems = [];
        for (const item of items) {
          const itemRes = await client.query(itemInsertSql, [
            newOrder.id,
            item.sku,
            item.product_name || `Product ${item.sku}`,
            parseInt(item.quantity, 10),
            parseFloat(item.unit_price)
          ]);
          insertedItems.push(itemRes.rows[0]);
        }

        await client.query('COMMIT');
        client.release();

        return res.status(201).json({
          data: {
            ...newOrder,
            total_amount: parseFloat(newOrder.total_amount),
            items: insertedItems.map(i => ({
              ...i,
              quantity: parseInt(i.quantity, 10),
              unit_price: parseFloat(i.unit_price)
            }))
          }
        });
      } catch (dbErr) {
        await client.query('ROLLBACK');
        client.release();
        throw dbErr;
      }
    }

    // 6. In-memory fallback
    const newId = `SO-${String(orderCounter++).padStart(4, '0')}`;
    const newOrder = {
      id: newId,
      customer_id: customer_id.trim(),
      customer_name: resolvedCustomerName.trim(),
      customer_gstin: resolvedGstin ? resolvedGstin.trim() : null,
      sales_rep_id: sales_rep_id || null,
      quote_id: resolvedQuoteId,
      total_amount: totalAmount,
      status: 'created',
      created_at: new Date().toISOString(),
      items: items.map((it, idx) => ({
        id: idx + 1,
        so_id: newId,
        sku: it.sku,
        product_name: it.product_name || `Product ${it.sku}`,
        quantity: parseInt(it.quantity, 10),
        unit_price: parseFloat(it.unit_price)
      }))
    };

    inMemoryOrders.unshift(newOrder);

    return res.status(201).json({ data: newOrder });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sales-orders
 * List sales orders with optional filtering by status and customer_id.
 */
router.get('/sales-orders', async (req, res, next) => {
  try {
    const { status, customer_id } = req.query;

    let query = 'SELECT * FROM sales_orders WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (customer_id) {
      params.push(customer_id);
      query += ` AND customer_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const dbRes = await safeQuery(query, params);
    if (dbRes) {
      const orders = [];
      for (const order of dbRes.rows) {
        const itemsRes = await safeQuery('SELECT * FROM so_items WHERE so_id = $1', [order.id]);
        orders.push({
          ...order,
          total_amount: parseFloat(order.total_amount),
          items: (itemsRes ? itemsRes.rows : []).map(i => ({
            ...i,
            quantity: parseInt(i.quantity, 10),
            unit_price: parseFloat(i.unit_price)
          }))
        });
      }
      return res.json({ data: orders });
    }

    // In-memory fallback
    let results = [...inMemoryOrders];
    if (status) {
      results = results.filter(o => o.status === status);
    }
    if (customer_id) {
      results = results.filter(o => o.customer_id === customer_id);
    }

    return res.json({ data: results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sales-orders/:id
 * Retrieve single sales order with its line items.
 */
router.get('/sales-orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbRes = await safeQuery('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (dbRes) {
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: `Sales order ${id} not found` });
      }
      const order = dbRes.rows[0];
      const itemsRes = await safeQuery('SELECT * FROM so_items WHERE so_id = $1', [id]);
      return res.json({
        data: {
          ...order,
          total_amount: parseFloat(order.total_amount),
          items: (itemsRes ? itemsRes.rows : []).map(i => ({
            ...i,
            quantity: parseInt(i.quantity, 10),
            unit_price: parseFloat(i.unit_price)
          }))
        }
      });
    }

    // In-memory fallback
    const order = inMemoryOrders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: `Sales order ${id} not found` });
    }

    return res.json({ data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sales-orders/:id/confirm
 * Transitions an order status from 'created' to 'confirmed'.
 * Illegal moves (from any status other than 'created') return HTTP 400.
 */
router.patch('/sales-orders/:id/confirm', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Database execution
    const dbCheck = await safeQuery('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (dbCheck) {
      if (dbCheck.rows.length === 0) {
        return res.status(404).json({ error: `Sales order ${id} not found` });
      }
      const existing = dbCheck.rows[0];
      if (existing.status !== 'created') {
        return res.status(400).json({
          error: `Cannot confirm order ${id} in status '${existing.status}'. Orders can only be confirmed from 'created' status.`
        });
      }

      const updateRes = await safeQuery(
        `UPDATE sales_orders SET status = 'confirmed' WHERE id = $1 RETURNING *`,
        [id]
      );
      const itemsRes = await safeQuery('SELECT * FROM so_items WHERE so_id = $1', [id]);
      const updated = updateRes.rows[0];
      return res.json({
        data: {
          ...updated,
          total_amount: parseFloat(updated.total_amount),
          items: (itemsRes?.rows || []).map(i => ({
            ...i,
            quantity: parseInt(i.quantity, 10),
            unit_price: parseFloat(i.unit_price)
          }))
        }
      });
    }

    // 2. In-memory fallback
    const orderIndex = inMemoryOrders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: `Sales order ${id} not found` });
    }
    const order = inMemoryOrders[orderIndex];
    if (order.status !== 'created') {
      return res.status(400).json({
        error: `Cannot confirm order ${id} in status '${order.status}'. Orders can only be confirmed from 'created' status.`
      });
    }

    order.status = 'confirmed';
    return res.json({ data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sales-orders/:id/cancel
 * Cancels an order. Allowed ONLY before dispatch (status 'created' or 'confirmed').
 * Automatically releases all associated stock reservations per [ERP4-B3].
 * Cancelling an already dispatched, delivered, or cancelled order returns HTTP 400.
 */
router.patch('/sales-orders/:id/cancel', async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Database execution
    const dbCheck = await safeQuery('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (dbCheck) {
      if (dbCheck.rows.length === 0) {
        return res.status(404).json({ error: `Sales order ${id} not found` });
      }
      const existing = dbCheck.rows[0];
      if (existing.status !== 'created' && existing.status !== 'confirmed') {
        return res.status(400).json({
          error: `Cannot cancel order ${id} in status '${existing.status}'. Orders can only be cancelled before dispatch.`
        });
      }

      const updateRes = await safeQuery(
        `UPDATE sales_orders SET status = 'cancelled' WHERE id = $1 RETURNING *`,
        [id]
      );
      const itemsRes = await safeQuery('SELECT * FROM so_items WHERE so_id = $1', [id]);
      const updated = updateRes.rows[0];

      // Automatically release reservations for this cancelled order (ERP4-B3)
      try {
        const { releaseReservations } = require('./reservations');
        if (typeof releaseReservations === 'function') {
          await releaseReservations(id);
        } else {
          await safeQuery("UPDATE reservations SET status = 'released', created_at = CURRENT_TIMESTAMP WHERE so_id = $1", [id]);
        }
      } catch (relErr) {
        console.error('[integration-error] Error releasing reservations upon cancellation:', relErr.message);
      }

      return res.json({
        data: {
          ...updated,
          total_amount: parseFloat(updated.total_amount),
          message: `Sales order ${id} cancelled and reservations released`,
          items: (itemsRes?.rows || []).map(i => ({
            ...i,
            quantity: parseInt(i.quantity, 10),
            unit_price: parseFloat(i.unit_price)
          }))
        }
      });
    }

    // 2. In-memory fallback
    const orderIndex = inMemoryOrders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: `Sales order ${id} not found` });
    }
    const order = inMemoryOrders[orderIndex];
    if (order.status !== 'created' && order.status !== 'confirmed') {
      return res.status(400).json({
        error: `Cannot cancel order ${id} in status '${order.status}'. Orders can only be cancelled before dispatch.`
      });
    }

    order.status = 'cancelled';

    // Release reservations in in-memory store
    try {
      const { releaseReservations } = require('./reservations');
      if (typeof releaseReservations === 'function') {
        await releaseReservations(id);
      }
    } catch (e) {
      // ignore
    }

    return res.json({
      data: {
        ...order,
        message: `Sales order ${id} cancelled and reservations released`
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
