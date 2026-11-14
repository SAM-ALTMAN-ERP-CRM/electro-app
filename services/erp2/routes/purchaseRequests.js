const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to PostgreSQL database for ERP-2 (falls back gracefully if offline)
const pool = makePool('erp2_db');

// Protect all ERP-2 purchase request routes with authentication middleware
router.use(requireAuth);

// In-memory fallback store seeded with 5 realistic rows adhering to Section 5 shared IDs
let inMemoryRequests = [
  {
    id: 'PR-0001',
    sku: 'SKU-0001',
    product_name: '55-inch 4K Smart TV',
    quantity: 50,
    requested_by: 'ERP-1',
    reason: 'Low stock alert threshold reached (5 units left)',
    status: 'pending',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'PR-0002',
    sku: 'SKU-0002',
    product_name: '43-inch Full HD TV',
    quantity: 30,
    requested_by: 'ERP-1',
    reason: 'Reorder level breached in WH-01',
    status: 'approved',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'PR-0003',
    sku: 'SKU-0101',
    product_name: 'Display Panel 55 inch',
    quantity: 100,
    requested_by: 'ERP-3',
    reason: 'Short components for manufacturing line 2',
    status: 'pending',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'PR-0004',
    sku: 'SKU-0004',
    product_name: 'Soundbar 2.1',
    quantity: 25,
    requested_by: 'EMP-0001',
    reason: 'Customer pre-orders surge for festive promotion',
    status: 'rejected',
    created_at: new Date(Date.now() - 12 * 3600000).toISOString()
  },
  {
    id: 'PR-0005',
    sku: 'SKU-0102',
    product_name: 'Power Supply Unit 12V',
    quantity: 200,
    requested_by: 'ERP-3',
    reason: 'Short components for TV assembly batch #44',
    status: 'converted',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString()
  }
];

let mockIdCounter = inMemoryRequests.length + 1;

/**
 * Executes a PostgreSQL query safely.
 * Returns null if the database connection fails or tables are uninitialized.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/purchase-requests
 * Query parameter: ?status=pending|approved|rejected|converted
 * Returns all purchase requests matching the status, or all requests if omitted.
 */
router.get('/purchase-requests', async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT id, sku, product_name, quantity, requested_by, reason, status, created_at
      FROM purchase_requests
    `;
    const params = [];

    if (status) {
      params.push(status.trim().toLowerCase());
      query += ` WHERE LOWER(status) = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC, id ASC';

    const result = await safeQuery(query, params);
    if (result) {
      return res.json({ data: result.rows });
    }

    // In-memory fallback
    let list = inMemoryRequests;
    if (status) {
      const targetStatus = status.trim().toLowerCase();
      list = list.filter(r => r.status.toLowerCase() === targetStatus);
    }
    return res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/purchase-requests/:id
 * Retrieves details for a specific purchase request by ID.
 */
router.get('/purchase-requests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await safeQuery(
      'SELECT id, sku, product_name, quantity, requested_by, reason, status, created_at FROM purchase_requests WHERE id = $1',
      [id]
    );

    if (result) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Purchase request '${id}' not found` });
      }
      return res.json({ data: result.rows[0] });
    }

    // In-memory fallback
    const found = inMemoryRequests.find(r => r.id === id);
    if (!found) {
      return res.status(404).json({ error: `Purchase request '${id}' not found` });
    }
    return res.json({ data: found });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/purchase-requests
 * Acceptance requirement: ERP-1 and ERP-3 post requests here with:
 * { sku, product_name, quantity, requested_by, reason }
 * No other fields are required. Status defaults to 'pending'.
 */
router.post('/purchase-requests', async (req, res, next) => {
  try {
    const { sku, product_name, quantity, requested_by, reason } = req.body || {};

    // Validate the 5 required/allowed intake fields
    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({ error: 'Field "sku" is required and must be a non-empty string' });
    }
    if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
      return res.status(400).json({ error: 'Field "product_name" is required and must be a non-empty string' });
    }
    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'Field "quantity" is required and must be a positive integer greater than 0' });
    }
    if (!requested_by || typeof requested_by !== 'string' || !requested_by.trim()) {
      return res.status(400).json({ error: 'Field "requested_by" is required and must be a non-empty string' });
    }
    const cleanReason = (reason !== undefined && reason !== null) ? String(reason).trim() : null;

    // Database insertion
    const insertQuery = `
      INSERT INTO purchase_requests (sku, product_name, quantity, requested_by, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, sku, product_name, quantity, requested_by, reason, status, created_at
    `;
    const result = await safeQuery(insertQuery, [
      sku.trim(),
      product_name.trim(),
      parsedQty,
      requested_by.trim(),
      cleanReason
    ]);

    if (result) {
      return res.status(201).json({ data: result.rows[0] });
    }

    // In-memory fallback
    const newId = `PR-${String(mockIdCounter++).padStart(4, '0')}`;
    const newRequest = {
      id: newId,
      sku: sku.trim(),
      product_name: product_name.trim(),
      quantity: parsedQty,
      requested_by: requested_by.trim(),
      reason: cleanReason,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    inMemoryRequests.unshift(newRequest);

    return res.status(201).json({ data: newRequest });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/purchase-requests/:id/decision
 * Payload: { status: 'approved' | 'rejected' }
 * Rule: Only pending requests can be decided (else 400).
 */
router.patch('/purchase-requests/:id/decision', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Field "status" is required in decision payload' });
    }

    const decisionStatus = status.trim().toLowerCase();
    if (!['approved', 'rejected'].includes(decisionStatus)) {
      return res.status(400).json({ error: 'Decision status must be either "approved" or "rejected"' });
    }

    // Check existing request in Database
    const checkRes = await safeQuery('SELECT id, status FROM purchase_requests WHERE id = $1', [id]);
    if (checkRes) {
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: `Purchase request '${id}' not found` });
      }

      const current = checkRes.rows[0];
      if (current.status !== 'pending') {
        return res.status(400).json({
          error: `Only pending requests can be decided (current status: '${current.status}')`
        });
      }

      const updateRes = await safeQuery(
        `UPDATE purchase_requests
         SET status = $1
         WHERE id = $2
         RETURNING id, sku, product_name, quantity, requested_by, reason, status, created_at`,
        [decisionStatus, id]
      );
      return res.json({ data: updateRes.rows[0] });
    }

    // In-memory fallback
    const index = inMemoryRequests.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Purchase request '${id}' not found` });
    }

    const current = inMemoryRequests[index];
    if (current.status !== 'pending') {
      return res.status(400).json({
        error: `Only pending requests can be decided (current status: '${current.status}')`
      });
    }

    current.status = decisionStatus;
    return res.json({ data: current });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/purchase-requests/:id
 * General update for purchase request fields (e.g. edit quantity, reason, status).
 */
router.put('/purchase-requests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sku, product_name, quantity, requested_by, reason, status } = req.body || {};

    let parsedQty;
    if (quantity !== undefined) {
      parsedQty = parseInt(quantity, 10);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        return res.status(400).json({ error: 'Field "quantity" must be a positive integer greater than 0' });
      }
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected', 'converted'];
      if (!validStatuses.includes(String(status).toLowerCase())) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
    }

    // Database update
    const checkRes = await safeQuery('SELECT * FROM purchase_requests WHERE id = $1', [id]);
    if (checkRes) {
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: `Purchase request '${id}' not found` });
      }

      const current = checkRes.rows[0];
      const updatedSku = sku ? sku.trim() : current.sku;
      const updatedName = product_name ? product_name.trim() : current.product_name;
      const updatedQty = parsedQty !== undefined ? parsedQty : current.quantity;
      const updatedReqBy = requested_by ? requested_by.trim() : current.requested_by;
      const updatedReason = reason !== undefined ? (reason ? String(reason).trim() : null) : current.reason;
      const updatedStatus = status ? String(status).toLowerCase() : current.status;

      const updateRes = await safeQuery(
        `UPDATE purchase_requests
         SET sku = $1, product_name = $2, quantity = $3, requested_by = $4, reason = $5, status = $6
         WHERE id = $7
         RETURNING id, sku, product_name, quantity, requested_by, reason, status, created_at`,
        [updatedSku, updatedName, updatedQty, updatedReqBy, updatedReason, updatedStatus, id]
      );
      return res.json({ data: updateRes.rows[0] });
    }

    // In-memory fallback
    const index = inMemoryRequests.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Purchase request '${id}' not found` });
    }

    const current = inMemoryRequests[index];
    if (sku) current.sku = sku.trim();
    if (product_name) current.product_name = product_name.trim();
    if (parsedQty !== undefined) current.quantity = parsedQty;
    if (requested_by) current.requested_by = requested_by.trim();
    if (reason !== undefined) current.reason = reason ? String(reason).trim() : null;
    if (status) current.status = String(status).toLowerCase();

    return res.json({ data: current });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/purchase-requests/:id
 * Removes a purchase request by ID.
 */
router.delete('/purchase-requests/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const checkRes = await safeQuery('SELECT id FROM purchase_requests WHERE id = $1', [id]);
    if (checkRes) {
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: `Purchase request '${id}' not found` });
      }

      await safeQuery('DELETE FROM purchase_requests WHERE id = $1', [id]);
      return res.json({
        data: {
          message: `Purchase request '${id}' deleted successfully`,
          id
        }
      });
    }

    // In-memory fallback
    const index = inMemoryRequests.findIndex(r => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Purchase request '${id}' not found` });
    }

    inMemoryRequests.splice(index, 1);
    return res.json({
      data: {
        message: `Purchase request '${id}' deleted successfully`,
        id
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
