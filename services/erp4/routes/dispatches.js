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

// Protect all dispatch routes with authentication
router.use(requireAuth);

// In-memory fallback caches
const inMemoryOrders = store.inMemoryOrders;
const inMemoryReservations = store.inMemoryReservations;
const inMemoryDispatches = store.inMemoryDispatches;
const inMemoryDispatchSerials = store.inMemoryDispatchSerials;

let dispatchCounter = inMemoryDispatches.length + 1;
let serialIdCounter = inMemoryDispatchSerials.length + 1;
let serialGeneratorCounter = 100;

const ALLOWED_COURIERS = ['BlueDart', 'Delhivery', 'DTDC'];
const ALLOWED_STATUSES = ['picked', 'shipped', 'delivered'];

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
 * Allocate serials for a given SKU and quantity from ERP-1.
 * Calls ERP-1 POST /api/serials/allocate { sku, qty } (mock: 'serials-allocate').
 * If ERP-1 is unreachable or has no available serials, falls back to local mock or generated fake serials.
 */
async function allocateSerialsForSku(sku, quantity) {
  const qty = parseInt(quantity, 10);
  let serials = [];

  // 1. Primary call: Real ERP-1 serials allocation endpoint
  try {
    const erp1Res = await callService('erp1', '/api/serials/allocate', {
      method: 'POST',
      body: { sku, qty },
      mock: 'serials-allocate'
    });

    if (erp1Res) {
      if (Array.isArray(erp1Res.allocated_serials)) {
        serials = erp1Res.allocated_serials;
      } else if (Array.isArray(erp1Res)) {
        serials = erp1Res;
      } else if (Array.isArray(erp1Res.serials)) {
        serials = erp1Res.serials;
      }
    }
  } catch (erp1Err) {
    // ERP-1 unreachable or failed; fall back to local ERP-4 mock or fake serials
    try {
      const localMockRes = await callService('erp4', '/api/serials/allocate', {
        method: 'POST',
        body: { sku, qty },
        mock: 'serials-allocate'
      });
      if (localMockRes && Array.isArray(localMockRes.allocated_serials)) {
        serials = localMockRes.allocated_serials;
      }
    } catch (e2) {
      const mockFilePath = path.resolve(__dirname, '../mocks/serials-allocate.json');
      if (fs.existsSync(mockFilePath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
          if (Array.isArray(parsed.allocated_serials)) {
            serials = parsed.allocated_serials;
          }
        } catch (parseErr) {
          // Continue to fake generator
        }
      }
    }
  }

  // 2. Ensure enough serials exist to satisfy requested quantity
  while (serials.length < qty) {
    const counterStr = String(serialGeneratorCounter++).padStart(4, '0');
    const prefix = sku === 'SKU-0001' ? 'TV55-2611' : `SN-${sku.replace(/^SKU-0*/, '')}`;
    serials.push(`${prefix}-${counterStr}`);
  }

  return serials.slice(0, qty);
}

/**
 * POST /api/dispatches
 * Creates a new courier dispatch for a sales order.
 * Strictly verifies that every item in the order is reserved (status = 'reserved').
 * If unreserved or shortage, returns HTTP 400 Bad Request.
 * Allocates serial numbers from ERP-1 (or generates fake serials offline) and stores them per dispatch.
 */
router.post('/dispatches', async (req, res, next) => {
  try {
    const {
      so_id,
      courier,
      tracking_no,
      address,
      ship_date
    } = req.body || {};

    // 1. Validate required fields
    if (!so_id || typeof so_id !== 'string' || !so_id.trim()) {
      return res.status(400).json({ error: 'so_id is required' });
    }
    const cleanSoId = so_id.trim();

    if (!courier || !ALLOWED_COURIERS.includes(courier)) {
      return res.status(400).json({
        error: `Invalid courier '${courier}'. Must be one of: ${ALLOWED_COURIERS.join(', ')}`
      });
    }

    if (!tracking_no || typeof tracking_no !== 'string' || !tracking_no.trim()) {
      return res.status(400).json({ error: 'tracking_no is required' });
    }

    if (!address || typeof address !== 'string' || !address.trim()) {
      return res.status(400).json({ error: 'address is required' });
    }

    const cleanTrackingNo = tracking_no.trim();
    const cleanAddress = address.trim();
    const resolvedShipDate = ship_date
      ? String(ship_date).split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Try PostgreSQL first inside a database transaction
    let client = null;
    try {
      client = await pool.connect();
    } catch (connErr) {
      client = null;
    }

    if (client) {
      try {
        await client.query('BEGIN');

        // Check sales order existence
        const orderRes = await client.query(
          'SELECT id, status, customer_id FROM sales_orders WHERE id = $1 FOR UPDATE',
          [cleanSoId]
        );
        if (orderRes.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(404).json({ error: `Sales order ${cleanSoId} not found` });
        }

        const order = orderRes.rows[0];

        // Retrieve order items
        const itemsRes = await client.query(
          'SELECT sku, product_name, quantity FROM so_items WHERE so_id = $1',
          [cleanSoId]
        );
        const orderItems = itemsRes.rows;

        if (orderItems.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({ error: `Sales order ${cleanSoId} has no items to dispatch` });
        }

        // Retrieve reservations for this sales order
        const resQuery = await client.query(
          'SELECT id, sku, quantity, status FROM reservations WHERE so_id = $1',
          [cleanSoId]
        );
        const reservations = resQuery.rows;

        // Rule: Dispatching an unreserved order returns 400
        if (reservations.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            error: `Cannot dispatch unreserved order ${cleanSoId}: no inventory reservations found`
          });
        }

        // Verify every reservation has status = 'reserved'
        const unreservedItem = reservations.find(r => r.status !== 'reserved');
        if (unreservedItem) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            error: `Cannot dispatch unreserved order ${cleanSoId}: reservation for ${unreservedItem.sku} is '${unreservedItem.status}'`
          });
        }

        // Verify each line item has matching reserved quantity
        for (const item of orderItems) {
          const matchingRes = reservations.filter(r => r.sku === item.sku && r.status === 'reserved');
          const totalReserved = matchingRes.reduce((sum, r) => sum + parseInt(r.quantity, 10), 0);
          if (totalReserved < parseInt(item.quantity, 10)) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(400).json({
              error: `Cannot dispatch order ${cleanSoId}: reserved quantity (${totalReserved}) for SKU ${item.sku} is less than required (${item.quantity})`
            });
          }
        }

        // 3. Allocate serials from ERP-1 for each item
        const allocatedSerialsList = [];
        for (const item of orderItems) {
          const qty = parseInt(item.quantity, 10);
          const allocated = await allocateSerialsForSku(item.sku, qty);
          for (const s of allocated) {
            allocatedSerialsList.push({
              sku: item.sku,
              serial_number: s
            });
          }
        }

        // 4. Insert dispatch record
        const insertDispatchSql = `
          INSERT INTO dispatches (so_id, courier, tracking_no, status, ship_date, address)
          VALUES ($1, $2, $3, 'picked', $4, $5)
          RETURNING id, so_id, courier, tracking_no, status, TO_CHAR(ship_date, 'YYYY-MM-DD') as ship_date, TO_CHAR(delivered_date, 'YYYY-MM-DD') as delivered_date, address, created_at
        `;
        const dispatchRes = await client.query(insertDispatchSql, [
          cleanSoId,
          courier,
          cleanTrackingNo,
          resolvedShipDate,
          cleanAddress
        ]);
        const createdDispatch = dispatchRes.rows[0];

        // 5. Insert allocated serials into dispatch_serials
        const insertedSerials = [];
        for (const s of allocatedSerialsList) {
          const insertSerialSql = `
            INSERT INTO dispatch_serials (dispatch_id, sku, serial_number)
            VALUES ($1, $2, $3)
            RETURNING id, dispatch_id, sku, serial_number
          `;
          const sRes = await client.query(insertSerialSql, [
            createdDispatch.id,
            s.sku,
            s.serial_number
          ]);
          insertedSerials.push(sRes.rows[0]);
        }

        // 6. Update sales order status to 'dispatched'
        await client.query(
          "UPDATE sales_orders SET status = 'dispatched' WHERE id = $1",
          [cleanSoId]
        );

        await client.query('COMMIT');
        client.release();

        return res.status(201).json({
          data: {
            ...createdDispatch,
            customer_id: order.customer_id,
            serials: insertedSerials
          }
        });
      } catch (dbErr) {
        await client.query('ROLLBACK');
        client.release();
        throw dbErr;
      }
    }

    // -------------------------------------------------------------
    // In-memory fallback when PostgreSQL is offline
    // -------------------------------------------------------------
    const order = inMemoryOrders.find(o => o.id === cleanSoId);
    if (!order) {
      return res.status(404).json({ error: `Sales order ${cleanSoId} not found` });
    }

    const orderItems = order.items || [];
    if (orderItems.length === 0) {
      return res.status(400).json({ error: `Sales order ${cleanSoId} has no items to dispatch` });
    }

    const reservations = inMemoryReservations.filter(r => r.so_id === cleanSoId);

    // Rule: dispatching an unreserved order returns 400
    if (reservations.length === 0) {
      return res.status(400).json({
        error: `Cannot dispatch unreserved order ${cleanSoId}: no inventory reservations found`
      });
    }

    // Verify every reservation is 'reserved'
    const unreservedItem = reservations.find(r => r.status !== 'reserved');
    if (unreservedItem) {
      return res.status(400).json({
        error: `Cannot dispatch unreserved order ${cleanSoId}: reservation for ${unreservedItem.sku} is '${unreservedItem.status}'`
      });
    }

    // Verify quantities
    for (const item of orderItems) {
      const matchingRes = reservations.filter(r => r.sku === item.sku && r.status === 'reserved');
      const totalReserved = matchingRes.reduce((sum, r) => sum + parseInt(r.quantity, 10), 0);
      if (totalReserved < parseInt(item.quantity, 10)) {
        return res.status(400).json({
          error: `Cannot dispatch order ${cleanSoId}: reserved quantity (${totalReserved}) for SKU ${item.sku} is less than required (${item.quantity})`
        });
      }
    }

    // Allocate serials
    const allocatedSerialsList = [];
    for (const item of orderItems) {
      const qty = parseInt(item.quantity, 10);
      const allocated = await allocateSerialsForSku(item.sku, qty);
      for (const s of allocated) {
        allocatedSerialsList.push({
          sku: item.sku,
          serial_number: s
        });
      }
    }

    const newDspId = `DSP-${String(dispatchCounter++).padStart(4, '0')}`;
    const newDispatch = {
      id: newDspId,
      so_id: cleanSoId,
      customer_id: order.customer_id,
      courier,
      tracking_no: cleanTrackingNo,
      status: 'picked',
      ship_date: resolvedShipDate,
      delivered_date: null,
      address: cleanAddress,
      created_at: new Date().toISOString()
    };

    inMemoryDispatches.push(newDispatch);

    const insertedSerials = [];
    for (const s of allocatedSerialsList) {
      const serialEntry = {
        id: serialIdCounter++,
        dispatch_id: newDspId,
        sku: s.sku,
        serial_number: s.serial_number
      };
      inMemoryDispatchSerials.push(serialEntry);
      insertedSerials.push(serialEntry);
    }

    // Update order status
    order.status = 'dispatched';

    return res.status(201).json({
      data: {
        ...newDispatch,
        serials: insertedSerials
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dispatches
 * Returns rows containing { serial_number, sku, customer_id, ship_date } (consumed by CRM-2 warranties sync).
 * When ?format=grouped or ?format=dispatches is passed, returns dispatch orders with nested serials for UI screens.
 */
router.get('/dispatches', async (req, res, next) => {
  try {
    const { status, so_id, format } = req.query;
    const isGrouped = format === 'grouped' || format === 'dispatches';

    if (isGrouped) {
      const dbGrouped = await safeQuery(
        `SELECT 
          d.id,
          d.so_id,
          so.customer_id,
          so.customer_name,
          d.courier,
          d.tracking_no,
          d.status,
          TO_CHAR(d.ship_date, 'YYYY-MM-DD') AS ship_date,
          TO_CHAR(d.delivered_date, 'YYYY-MM-DD') AS delivered_date,
          d.address,
          d.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ds.id,
                'sku', ds.sku,
                'serial_number', ds.serial_number
              )
            ) FILTER (WHERE ds.id IS NOT NULL), '[]'
          ) as serials
         FROM dispatches d
         LEFT JOIN sales_orders so ON d.so_id = so.id
         LEFT JOIN dispatch_serials ds ON d.id = ds.dispatch_id
         WHERE ($1::text IS NULL OR d.status = $1)
           AND ($2::text IS NULL OR d.so_id = $2)
         GROUP BY d.id, so.customer_id, so.customer_name
         ORDER BY d.created_at DESC`,
        [status || null, so_id || null]
      );

      if (dbGrouped) {
        return res.json({ data: dbGrouped.rows });
      }

      // In-memory grouped fallback
      let list = inMemoryDispatches.map(d => {
        const order = inMemoryOrders.find(o => o.id === d.so_id);
        const serials = inMemoryDispatchSerials.filter(ds => ds.dispatch_id === d.id);
        return {
          ...d,
          customer_id: d.customer_id || (order ? order.customer_id : 'CUST-0001'),
          customer_name: order ? order.customer_name : `Customer ${d.so_id}`,
          serials
        };
      });

      if (status) {
        list = list.filter(d => d.status.toLowerCase() === status.toLowerCase());
      }
      if (so_id) {
        list = list.filter(d => d.so_id === so_id);
      }

      return res.json({ data: list });
    }

    const dbRes = await safeQuery(
      `SELECT 
        ds.serial_number,
        ds.sku,
        so.customer_id,
        TO_CHAR(d.ship_date, 'YYYY-MM-DD') AS ship_date,
        d.id AS dispatch_id,
        d.so_id,
        d.courier,
        d.tracking_no,
        d.status,
        d.address,
        TO_CHAR(d.delivered_date, 'YYYY-MM-DD') AS delivered_date,
        d.created_at
       FROM dispatch_serials ds
       JOIN dispatches d ON ds.dispatch_id = d.id
       JOIN sales_orders so ON d.so_id = so.id
       WHERE ($1::text IS NULL OR d.status = $1)
         AND ($2::text IS NULL OR d.so_id = $2)
       ORDER BY d.created_at DESC, ds.id ASC`,
      [status || null, so_id || null]
    );

    if (dbRes) {
      return res.json({ data: dbRes.rows });
    }

    // In-memory fallback
    const rows = [];
    for (const ds of inMemoryDispatchSerials) {
      const d = inMemoryDispatches.find(disp => disp.id === ds.dispatch_id);
      if (!d) continue;

      if (status && d.status.toLowerCase() !== status.toLowerCase()) continue;
      if (so_id && d.so_id !== so_id) continue;

      const order = inMemoryOrders.find(o => o.id === d.so_id);
      const customerId = d.customer_id || (order ? order.customer_id : 'CUST-0001');

      rows.push({
        serial_number: ds.serial_number,
        sku: ds.sku,
        customer_id: customerId,
        ship_date: d.ship_date,
        dispatch_id: d.id,
        so_id: d.so_id,
        courier: d.courier,
        tracking_no: d.tracking_no,
        status: d.status,
        address: d.address,
        delivered_date: d.delivered_date,
        created_at: d.created_at
      });
    }

    return res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Execute side effects when an order is shipped:
 * 1. Deduct stock in ERP-1 for each item: POST /api/stock/adjust { sku, warehouse_id:'WH-01', delta: -quantity, reason: dispatch_id }
 * 2. Update serial status in ERP-1 to 'sold': PATCH /api/serials/:serial/status { status: 'sold' }
 * 3. Create invoice in ERP-5: POST /api/invoices { so_id, customer_id, customer_name, customer_gstin, sales_rep_id, items }
 * 4. Add timeline interaction in CRM-3: POST /api/interactions/from-event { customer_id, type: 'order', summary: 'Order SO-xxxx dispatched', source_team: 'ERP-4' }
 * All side effects are wrapped in try/catch and log [integration-error].
 */
async function executeShippingSideEffects({ dispatchId, order, orderItems, serials }) {
  const orderId = order?.id || 'SO-0001';
  const customerId = order?.customer_id || 'CUST-0001';
  const customerName = order?.customer_name || 'Customer';
  const customerGstin = order?.customer_gstin || null;
  const salesRepId = order?.sales_rep_id || 'EMP-0001';

  // 1. Deduct stock for each line item in ERP-1
  for (const item of orderItems) {
    const qty = parseInt(item.quantity, 10) || 1;
    try {
      await callService('erp1', '/api/stock/adjust', {
        method: 'POST',
        body: {
          sku: item.sku,
          warehouse_id: 'WH-01',
          delta: -qty,
          reason: dispatchId
        },
        mock: 'stock-adjust'
      });
    } catch (err) {
      try {
        await callService('erp4', '/api/stock/adjust', {
          method: 'POST',
          body: {
            sku: item.sku,
            warehouse_id: 'WH-01',
            delta: -qty,
            reason: dispatchId
          },
          mock: 'stock-adjust'
        });
      } catch (e2) {
        console.error(`[integration-error] Failed to adjust stock in ERP-1 for SKU ${item.sku}:`, err.message || err);
      }
    }
  }

  // 2. Mark allocated serial numbers as 'sold' in ERP-1
  for (const s of serials) {
    if (!s.serial_number) continue;
    try {
      await callService('erp1', `/api/serials/${encodeURIComponent(s.serial_number)}/status`, {
        method: 'PATCH',
        body: { status: 'sold' },
        mock: 'serial-status'
      });
    } catch (err) {
      try {
        await callService('erp4', `/api/serials/${encodeURIComponent(s.serial_number)}/status`, {
          method: 'PATCH',
          body: { status: 'sold' },
          mock: 'serial-status'
        });
      } catch (e2) {
        console.error(`[integration-error] Failed to update serial ${s.serial_number} to sold:`, err.message || err);
      }
    }
  }

  // 3. Create invoice in ERP-5
  try {
    await callService('erp5', '/api/invoices', {
      method: 'POST',
      body: {
        so_id: orderId,
        customer_id: customerId,
        customer_name: customerName,
        customer_gstin: customerGstin,
        sales_rep_id: salesRepId,
        items: orderItems.map(it => ({
          sku: it.sku,
          description: it.product_name || it.description || it.sku,
          quantity: parseInt(it.quantity, 10) || 1,
          unit_price: parseFloat(it.unit_price) || 0
        }))
      },
      mock: 'invoices'
    });
  } catch (err) {
    try {
      await callService('erp4', '/api/invoices', {
        method: 'POST',
        body: {
          so_id: orderId,
          customer_id: customerId,
          customer_name: customerName,
          customer_gstin: customerGstin,
          sales_rep_id: salesRepId,
          items: orderItems
        },
        mock: 'invoices'
      });
    } catch (e2) {
      console.error(`[integration-error] Failed to create invoice in ERP-5 for order ${orderId}:`, err.message || err);
    }
  }

  // 4. Send timeline event to CRM-3
  try {
    await callService('crm3', '/api/interactions/from-event', {
      method: 'POST',
      body: {
        customer_id: customerId,
        type: 'order',
        summary: `Order ${orderId} dispatched`,
        source_team: 'ERP-4'
      },
      mock: 'interactions'
    });
  } catch (err) {
    try {
      await callService('erp4', '/api/interactions/from-event', {
        method: 'POST',
        body: {
          customer_id: customerId,
          type: 'order',
          summary: `Order ${orderId} dispatched`,
          source_team: 'ERP-4'
        },
        mock: 'interactions'
      });
    } catch (e2) {
      console.error(`[integration-error] Failed to post dispatched timeline interaction to CRM-3 for order ${orderId}:`, err.message || err);
    }
  }
}

/**
 * Execute side effects when an order is delivered:
 * 1. Add timeline interaction in CRM-3: POST /api/interactions/from-event { customer_id, type: 'order', summary: 'Order SO-xxxx delivered', source_team: 'ERP-4' }
 * Wrapped in try/catch and logs [integration-error].
 */
async function executeDeliverySideEffects({ order }) {
  const orderId = order?.id || 'SO-0001';
  const customerId = order?.customer_id || 'CUST-0001';

  try {
    await callService('crm3', '/api/interactions/from-event', {
      method: 'POST',
      body: {
        customer_id: customerId,
        type: 'order',
        summary: `Order ${orderId} delivered`,
        source_team: 'ERP-4'
      },
      mock: 'interactions'
    });
  } catch (err) {
    try {
      await callService('erp4', '/api/interactions/from-event', {
        method: 'POST',
        body: {
          customer_id: customerId,
          type: 'order',
          summary: `Order ${orderId} delivered`,
          source_team: 'ERP-4'
        },
        mock: 'interactions'
      });
    } catch (e2) {
      console.error(`[integration-error] Failed to post delivered timeline interaction to CRM-3 for order ${orderId}:`, err.message || err);
    }
  }
}

/**
 * GET /api/dispatches/:id
 * Retrieve a specific dispatch record by ID along with its associated serial numbers.
 */
router.get('/dispatches/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbRes = await safeQuery(
      `SELECT 
        d.id,
        d.so_id,
        so.customer_id,
        so.customer_name,
        so.customer_gstin,
        so.sales_rep_id,
        so.total_amount,
        d.courier,
        d.tracking_no,
        d.status,
        TO_CHAR(d.ship_date, 'YYYY-MM-DD') AS ship_date,
        TO_CHAR(d.delivered_date, 'YYYY-MM-DD') AS delivered_date,
        d.address,
        d.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ds.id,
              'sku', ds.sku,
              'serial_number', ds.serial_number
            )
          ) FILTER (WHERE ds.id IS NOT NULL), '[]'
        ) as serials
       FROM dispatches d
       LEFT JOIN sales_orders so ON d.so_id = so.id
       LEFT JOIN dispatch_serials ds ON d.id = ds.dispatch_id
       WHERE d.id = $1
       GROUP BY d.id, so.customer_id, so.customer_name, so.customer_gstin, so.sales_rep_id, so.total_amount`,
      [id]
    );

    if (dbRes) {
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: `Dispatch ${id} not found` });
      }

      const dispatchData = dbRes.rows[0];
      const itemsRes = await safeQuery(
        'SELECT id, sku, product_name, quantity, unit_price FROM so_items WHERE so_id = $1 ORDER BY id ASC',
        [dispatchData.so_id]
      );
      dispatchData.items = itemsRes ? itemsRes.rows : [];

      return res.json({ data: dispatchData });
    }

    // In-memory fallback
    const found = inMemoryDispatches.find(d => d.id === id);
    if (!found) {
      return res.status(404).json({ error: `Dispatch ${id} not found` });
    }

    const order = inMemoryOrders.find(o => o.id === found.so_id);
    const serials = inMemoryDispatchSerials.filter(ds => ds.dispatch_id === id);
    return res.json({
      data: {
        ...found,
        customer_id: found.customer_id || (order ? order.customer_id : 'CUST-0001'),
        customer_name: order ? order.customer_name : 'Customer',
        customer_gstin: order ? order.customer_gstin : null,
        sales_rep_id: order ? order.sales_rep_id : 'EMP-0001',
        total_amount: order ? order.total_amount : 0,
        items: order ? (order.items || []) : [],
        serials
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/dispatches/:id/status
 * Updates delivery status of a dispatch ('picked', 'shipped', 'delivered').
 * When shipped:
 * 1. sets sales order status to 'dispatched'
 * 2. deducts stock in ERP-1 and marks serials as sold in ERP-1
 * 3. creates invoice in ERP-5
 * 4. logs timeline interaction in CRM-3
 * When delivered:
 * 1. sets sales order status to 'delivered'
 * 2. logs delivered timeline interaction in CRM-3
 * All cross-service calls are side effects wrapped in try/catch and log [integration-error].
 */
router.patch('/dispatches/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, delivered_date, ship_date } = req.body || {};

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Must be one of: ${ALLOWED_STATUSES.join(', ')}`
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const resolvedShipDate = ship_date || (status === 'shipped' ? today : null);
    const resolvedDeliveredDate = delivered_date || (status === 'delivered' ? today : null);

    let client = null;
    try {
      client = await pool.connect();
    } catch (connErr) {
      client = null;
    }

    if (client) {
      try {
        await client.query('BEGIN');

        const existingRes = await client.query(
          'SELECT id, so_id, status, ship_date, delivered_date FROM dispatches WHERE id = $1 FOR UPDATE',
          [id]
        );
        if (existingRes.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(404).json({ error: `Dispatch ${id} not found` });
        }

        const existing = existingRes.rows[0];

        // Retrieve order details for status sync and side effects
        const orderRes = await client.query(
          'SELECT id, customer_id, customer_name, customer_gstin, sales_rep_id, status FROM sales_orders WHERE id = $1 FOR UPDATE',
          [existing.so_id]
        );
        const orderData = orderRes.rows[0] || {
          id: existing.so_id,
          customer_id: 'CUST-0001',
          customer_name: 'Customer',
          customer_gstin: null,
          sales_rep_id: 'EMP-0001'
        };

        // Retrieve order items
        const itemsRes = await client.query(
          'SELECT sku, product_name, quantity, unit_price FROM so_items WHERE so_id = $1',
          [existing.so_id]
        );
        const orderItems = itemsRes.rows;

        // Retrieve serials allocated to this dispatch
        const serialsRes = await client.query(
          'SELECT id, sku, serial_number FROM dispatch_serials WHERE dispatch_id = $1',
          [id]
        );
        const serials = serialsRes.rows;

        // Update dispatch status and dates
        const updateRes = await client.query(
          `UPDATE dispatches
           SET status = $1,
               ship_date = COALESCE($2, ship_date),
               delivered_date = COALESCE($3, delivered_date)
           WHERE id = $4
           RETURNING id, so_id, courier, tracking_no, status,
                     TO_CHAR(ship_date, 'YYYY-MM-DD') as ship_date,
                     TO_CHAR(delivered_date, 'YYYY-MM-DD') as delivered_date,
                     address, created_at`,
          [status, resolvedShipDate, resolvedDeliveredDate, id]
        );

        // Sync order status
        if (status === 'shipped') {
          await client.query(
            "UPDATE sales_orders SET status = 'dispatched' WHERE id = $1",
            [existing.so_id]
          );
        } else if (status === 'delivered') {
          await client.query(
            "UPDATE sales_orders SET status = 'delivered' WHERE id = $1",
            [existing.so_id]
          );
        }

        await client.query('COMMIT');
        client.release();

        // Execute side effects asynchronously after database transaction commits
        if (status === 'shipped') {
          await executeShippingSideEffects({
            dispatchId: id,
            order: orderData,
            orderItems,
            serials
          });
        } else if (status === 'delivered') {
          await executeDeliverySideEffects({
            order: orderData
          });
        }

        return res.json({
          data: {
            ...updateRes.rows[0],
            serials
          }
        });
      } catch (dbErr) {
        await client.query('ROLLBACK');
        client.release();
        throw dbErr;
      }
    }

    // -------------------------------------------------------------
    // In-memory fallback when PostgreSQL is offline
    // -------------------------------------------------------------
    const found = inMemoryDispatches.find(d => d.id === id);
    if (!found) {
      return res.status(404).json({ error: `Dispatch ${id} not found` });
    }

    found.status = status;
    if (resolvedShipDate) {
      found.ship_date = resolvedShipDate;
    }
    if (resolvedDeliveredDate) {
      found.delivered_date = resolvedDeliveredDate;
    }

    const order = inMemoryOrders.find(o => o.id === found.so_id) || {
      id: found.so_id,
      customer_id: found.customer_id || 'CUST-0001',
      customer_name: 'Customer',
      customer_gstin: null,
      sales_rep_id: 'EMP-0001',
      items: []
    };

    if (status === 'shipped') {
      order.status = 'dispatched';
    } else if (status === 'delivered') {
      order.status = 'delivered';
    }

    const serials = inMemoryDispatchSerials.filter(ds => ds.dispatch_id === id);
    const orderItems = order.items || [];

    // Trigger side effects
    if (status === 'shipped') {
      await executeShippingSideEffects({
        dispatchId: id,
        order,
        orderItems,
        serials
      });
    } else if (status === 'delivered') {
      await executeDeliverySideEffects({
        order
      });
    }

    return res.json({
      data: {
        ...found,
        serials
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
