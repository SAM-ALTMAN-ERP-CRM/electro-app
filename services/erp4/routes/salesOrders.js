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

// Protect all ERP-4 routes with authentication
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
    const {
      quote_id,
      customer_id,
      customer_name,
      customer_gstin,
      sales_rep_id,
      items
    } = req.body;

    // 1. Validate required fields
    if (!customer_id || typeof customer_id !== 'string') {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    if (!sales_rep_id || typeof sales_rep_id !== 'string') {
      return res.status(400).json({ error: 'sales_rep_id is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    // 2. Validate line items and compute total in INR
    let totalAmount = 0;
    for (const item of items) {
      if (!item.sku || !item.product_name) {
        return res.status(400).json({ error: 'Each item must have a sku and product_name' });
      }
      const qty = parseInt(item.quantity, 10);
      const price = parseFloat(item.unit_price);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Item quantity must be a positive integer' });
      }
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'Item unit_price must be a positive number' });
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
          error: `Sales order with quote_id "${resolvedQuoteId}" already exists (${checkDb.rows[0].id})`
        });
      }

      const duplicateInMemory = inMemoryOrders.find(o => o.quote_id === resolvedQuoteId);
      if (duplicateInMemory) {
        return res.status(409).json({
          error: `Sales order with quote_id "${resolvedQuoteId}" already exists (${duplicateInMemory.id})`
        });
      }
    }

    // 5. Insert into PostgreSQL if connected
    let client = null;
    try {
      client = await pool.connect();
    } catch (err) {
      client = null;
    }

    if (client) {
      try {
        await client.query('BEGIN');

        const insertOrderSql = `
          INSERT INTO sales_orders (
            quote_id, customer_id, customer_name, customer_gstin, sales_rep_id, status, total_amount
          ) VALUES ($1, $2, $3, $4, $5, 'created', $6)
          RETURNING *
        `;
        const orderRes = await client.query(insertOrderSql, [
          resolvedQuoteId,
          customer_id,
          resolvedCustomerName,
          resolvedGstin,
          sales_rep_id,
          totalAmount
        ]);
        const createdOrder = orderRes.rows[0];

        const insertedItems = [];
        for (const item of items) {
          const insertItemSql = `
            INSERT INTO so_items (so_id, sku, product_name, quantity, unit_price)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          const itemRes = await client.query(insertItemSql, [
            createdOrder.id,
            item.sku,
            item.product_name,
            parseInt(item.quantity, 10),
            parseFloat(item.unit_price)
          ]);
          insertedItems.push(itemRes.rows[0]);
        }

        await client.query('COMMIT');
        client.release();

        return res.status(201).json({
          data: {
            ...createdOrder,
            total_amount: parseFloat(createdOrder.total_amount),
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

        if (dbErr.code === '23505') {
          return res.status(409).json({
            error: `Sales order with quote_id "${resolvedQuoteId}" already exists`
          });
        }
        throw dbErr;
      }
    }

    // 6. In-memory fallback
    const newId = `SO-${String(orderCounter++).padStart(4, '0')}`;
    const newOrder = {
      id: newId,
      quote_id: resolvedQuoteId,
      customer_id,
      customer_name: resolvedCustomerName,
      customer_gstin: resolvedGstin,
      sales_rep_id,
      status: 'created',
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
      items: items.map((item, idx) => ({
        id: idx + 1,
        so_id: newId,
        sku: item.sku,
        product_name: item.product_name,
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price)
      }))
    };

    inMemoryOrders.push(newOrder);

    return res.status(201).json({
      data: newOrder
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sales-orders
 * List sales orders with optional filters: ?customer_id= and ?status=
 */
router.get('/sales-orders', async (req, res, next) => {
  try {
    const { customer_id, status } = req.query;

    const dbRes = await safeQuery(
      `SELECT so.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', si.id,
              'sku', si.sku,
              'product_name', si.product_name,
              'quantity', si.quantity,
              'unit_price', si.unit_price
            )
          ) FILTER (WHERE si.id IS NOT NULL), '[]'
        ) as items
       FROM sales_orders so
       LEFT JOIN so_items si ON so.id = si.so_id
       WHERE ($1::text IS NULL OR so.customer_id = $1)
         AND ($2::text IS NULL OR so.status = $2)
       GROUP BY so.id
       ORDER BY so.created_at DESC`,
      [customer_id || null, status || null]
    );

    if (dbRes) {
      const orders = dbRes.rows.map(row => ({
        ...row,
        total_amount: parseFloat(row.total_amount),
        items: (row.items || []).map(i => ({
          ...i,
          quantity: parseInt(i.quantity, 10),
          unit_price: parseFloat(i.unit_price)
        }))
      }));
      return res.json({ data: orders });
    }

    // In-memory fallback
    let filtered = [...inMemoryOrders];
    if (customer_id) {
      filtered = filtered.filter(o => o.customer_id === customer_id);
    }
    if (status) {
      filtered = filtered.filter(o => o.status.toLowerCase() === status.toLowerCase());
    }

    return res.json({ data: filtered });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sales-orders/:id
 * Retrieve a single sales order by ID with line items.
 */
router.get('/sales-orders/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbRes = await safeQuery(
      `SELECT so.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', si.id,
              'sku', si.sku,
              'product_name', si.product_name,
              'quantity', si.quantity,
              'unit_price', si.unit_price
            )
          ) FILTER (WHERE si.id IS NOT NULL), '[]'
        ) as items
       FROM sales_orders so
       LEFT JOIN so_items si ON so.id = si.so_id
       WHERE so.id = $1
       GROUP BY so.id`,
      [id]
    );

    if (dbRes) {
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: `Sales order ${id} not found` });
      }
      const order = dbRes.rows[0];
      return res.json({
        data: {
          ...order,
          total_amount: parseFloat(order.total_amount),
          items: (order.items || []).map(i => ({
            ...i,
            quantity: parseInt(i.quantity, 10),
            unit_price: parseFloat(i.unit_price)
          }))
        }
      });
    }

    // In-memory fallback
    const found = inMemoryOrders.find(o => o.id === id);
    if (!found) {
      return res.status(404).json({ error: `Sales order ${id} not found` });
    }

    return res.json({ data: found });
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
    if (order.status !== 'created' && order.status !== 'confirmed') {
      return res.status(400).json({
        error: `Cannot cancel order ${id} in status '${order.status}'. Orders can only be cancelled before dispatch.`
      });
    }

    order.status = 'cancelled';
    return res.json({ data: order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
