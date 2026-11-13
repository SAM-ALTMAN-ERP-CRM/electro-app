// [CRM2-B1] Warranty table and lookup API
// [CRM2-B3] Sync warranties from dispatch
// Handles warranty records, validation, calculations for expires_on and active/expired status.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { callService } = require('../../_shared/callService');
const { makePool } = require('../../_shared/db');

const router = express.Router();
const pool = makePool('crm2_db');

// Regular expressions for validations
const CUSTOMER_ID_REGEX = /^CUST-\d{4}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Protect all warranty routes with authentication
router.use('/warranties', requireAuth);
router.use('/warranty', requireAuth);

/**
 * Helper to compute expires_on and status (active/expired) from purchase_date & warranty_months.
 */
function computeWarranty(item) {
  const rawDate = item.purchase_date;
  const dateStr = rawDate instanceof Date
    ? rawDate.toISOString().split('T')[0]
    : String(rawDate).split('T')[0];

  const months = Number(item.warranty_months) || 12;

  // Add warranty_months to purchase_date
  const [y, m, d] = dateStr.split('-').map(Number);
  const expDate = new Date(Date.UTC(y, m - 1 + months, d));
  const expiresOn = expDate.toISOString().split('T')[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const status = expiresOn >= todayStr ? 'active' : 'expired';

  return {
    serial_number: item.serial_number,
    sku: item.sku,
    product_name: item.product_name,
    customer_id: item.customer_id,
    purchase_date: dateStr,
    warranty_months: months,
    expires_on: expiresOn,
    status,
    created_at: item.created_at || new Date().toISOString()
  };
}

/**
 * Relative date helper for in-memory seed records.
 */
function getRelativeDateStr(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().split('T')[0];
}

// In-memory fallback for local development or testing without active PostgreSQL
let inMemoryWarranties = [
  {
    serial_number: 'TV55-2611-0001',
    sku: 'SKU-0001',
    product_name: '55-inch 4K Smart TV',
    customer_id: 'CUST-0001',
    purchase_date: getRelativeDateStr(3),
    warranty_months: 12,
    created_at: new Date().toISOString()
  },
  {
    serial_number: 'TV55-2611-0002',
    sku: 'SKU-0001',
    product_name: '55-inch 4K Smart TV',
    customer_id: 'CUST-0002',
    purchase_date: getRelativeDateStr(3),
    warranty_months: 12,
    created_at: new Date().toISOString()
  },
  {
    serial_number: 'TV55-2611-0003',
    sku: 'SKU-0001',
    product_name: '55-inch 4K Smart TV',
    customer_id: 'CUST-0003',
    purchase_date: getRelativeDateStr(3),
    warranty_months: 12,
    created_at: new Date().toISOString()
  },
  {
    serial_number: 'TV55-2611-0004',
    sku: 'SKU-0001',
    product_name: '55-inch 4K Smart TV',
    customer_id: 'CUST-0004',
    purchase_date: getRelativeDateStr(24),
    warranty_months: 12,
    created_at: new Date().toISOString()
  },
  {
    serial_number: 'TV55-2611-0005',
    sku: 'SKU-0001',
    product_name: '55-inch 4K Smart TV',
    customer_id: 'CUST-0005',
    purchase_date: getRelativeDateStr(24),
    warranty_months: 12,
    created_at: new Date().toISOString()
  }
];

/**
 * Safely executes a query on PostgreSQL, returning null on connection failures.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('connect ECONNREFUSED') ||
      err.message.includes('no response') ||
      err.message.includes('Connection terminated')
    ) {
      return null;
    }
    // Re-throw genuine database constraint / syntax errors
    throw err;
  }
}

/**
 * GET /api/warranties
 * Lists all registered warranties with calculated expires_on and status.
 */
router.get('/warranties', async (req, res, next) => {
  try {
    const result = await safeQuery(
      `SELECT serial_number, sku, product_name, customer_id,
              to_char(purchase_date, 'YYYY-MM-DD') AS purchase_date,
              warranty_months,
              to_char((purchase_date + (warranty_months || ' months')::interval)::date, 'YYYY-MM-DD') AS expires_on,
              CASE
                WHEN (purchase_date + (warranty_months || ' months')::interval)::date >= CURRENT_DATE THEN 'active'
                ELSE 'expired'
              END AS status,
              created_at
       FROM warranties
       ORDER BY purchase_date DESC, serial_number ASC`
    );

    if (result) {
      return res.json({ data: result.rows });
    }

    // In-memory fallback
    const computed = inMemoryWarranties
      .map(computeWarranty)
      .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));

    res.json({ data: computed });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/warranty/sync
 * [CRM2-B3] Fetches dispatched items from ERP-4 GET /api/dispatches (or local mock fallback)
 * and registers any newly dispatched serials into warranties table.
 * Idempotent: duplicate serials are safely ignored via ON CONFLICT DO NOTHING.
 */
router.post('/warranty/sync', async (req, res, next) => {
  try {
    let dispatches = [];

    // Try calling ERP-4 dispatches endpoint; fallback to mock when offline
    try {
      const response = await callService('erp4', '/api/dispatches');
      if (Array.isArray(response)) {
        dispatches = response;
      } else if (response && Array.isArray(response.data)) {
        dispatches = response.data;
      }
    } catch (serviceErr) {
      if (process.env.USE_MOCKS !== 'false') {
        const mockPath = path.join(__dirname, '../mocks/dispatches.json');
        if (fs.existsSync(mockPath)) {
          console.log('[mock] used for dispatches');
          dispatches = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
        }
      } else {
        throw serviceErr;
      }
    }

    let addedCount = 0;

    for (const item of dispatches) {
      if (!item.serial_number) continue;

      const serial = String(item.serial_number).trim();
      const sku = String(item.sku || 'SKU-0001').trim();
      const customerId = String(item.customer_id || 'CUST-0001').trim();
      const shipDate = String(item.ship_date || item.purchase_date || new Date().toISOString().split('T')[0]).split('T')[0];
      const prodName = sku === 'SKU-0001' ? '55-inch 4K Smart TV' : (item.product_name || sku);

      const queryRes = await safeQuery(
        `INSERT INTO warranties (serial_number, sku, product_name, customer_id, purchase_date, warranty_months)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (serial_number) DO NOTHING
         RETURNING serial_number`,
        [serial, sku, prodName, customerId, shipDate, 12]
      );

      if (queryRes) {
        if (queryRes.rows && queryRes.rows.length > 0) {
          addedCount++;
        }
      } else {
        // In-memory fallback
        const exists = inMemoryWarranties.some(
          (w) => w.serial_number.toUpperCase() === serial.toUpperCase()
        );
        if (!exists) {
          inMemoryWarranties.push({
            serial_number: serial,
            sku,
            product_name: prodName,
            customer_id: customerId,
            purchase_date: shipDate,
            warranty_months: 12,
            created_at: new Date().toISOString()
          });
          addedCount++;
        }
      }
    }

    res.json({ data: { added: addedCount } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/warranty/:serial
 * Returns warranty record by serial number, with expires_on and status (active/expired).
 */
router.get('/warranty/:serial', async (req, res, next) => {
  try {
    const serial = String(req.params.serial || '').trim();
    if (!serial) {
      return res.status(400).json({ error: 'serial number is required' });
    }

    const result = await safeQuery(
      `SELECT serial_number, sku, product_name, customer_id,
              to_char(purchase_date, 'YYYY-MM-DD') AS purchase_date,
              warranty_months,
              to_char((purchase_date + (warranty_months || ' months')::interval)::date, 'YYYY-MM-DD') AS expires_on,
              CASE
                WHEN (purchase_date + (warranty_months || ' months')::interval)::date >= CURRENT_DATE THEN 'active'
                ELSE 'expired'
              END AS status,
              created_at
       FROM warranties
       WHERE serial_number = $1`,
      [serial]
    );

    if (result) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Warranty for serial ${serial} not found` });
      }
      return res.json({ data: result.rows[0] });
    }

    // In-memory fallback lookup
    const found = inMemoryWarranties.find(
      (w) => w.serial_number.toUpperCase() === serial.toUpperCase()
    );

    if (!found) {
      return res.status(404).json({ error: `Warranty for serial ${serial} not found` });
    }

    res.json({ data: computeWarranty(found) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/warranties
 * Registers a new warranty for a product serial number.
 */
router.post('/warranties', async (req, res, next) => {
  try {
    const body = req.body || {};
    const { serial_number, sku, product_name, customer_id, purchase_date, warranty_months } = body;

    // Validate required fields
    if (!serial_number || !String(serial_number).trim()) {
      return res.status(400).json({ error: 'serial_number is required' });
    }
    if (!sku || !String(sku).trim()) {
      return res.status(400).json({ error: 'sku is required' });
    }
    if (!customer_id || !String(customer_id).trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    if (!purchase_date || !String(purchase_date).trim()) {
      return res.status(400).json({ error: 'purchase_date is required' });
    }

    const cleanSerial = String(serial_number).trim();
    const cleanSku = String(sku).trim();
    const cleanCustomerId = String(customer_id).trim();
    const cleanPurchaseDate = String(purchase_date).trim();
    const months = warranty_months !== undefined ? Number(warranty_months) : 12;

    if (!CUSTOMER_ID_REGEX.test(cleanCustomerId)) {
      return res.status(400).json({ error: 'customer_id must look like CUST-0001' });
    }
    if (!DATE_REGEX.test(cleanPurchaseDate) || isNaN(Date.parse(cleanPurchaseDate))) {
      return res.status(400).json({ error: 'purchase_date must be a valid date in YYYY-MM-DD format' });
    }
    if (isNaN(months) || months <= 0) {
      return res.status(400).json({ error: 'warranty_months must be a positive integer' });
    }

    const finalProductName = product_name && String(product_name).trim()
      ? String(product_name).trim()
      : (cleanSku === 'SKU-0001' ? '55-inch 4K Smart TV' : cleanSku);

    try {
      const result = await safeQuery(
        `INSERT INTO warranties (serial_number, sku, product_name, customer_id, purchase_date, warranty_months)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING serial_number, sku, product_name, customer_id,
                   to_char(purchase_date, 'YYYY-MM-DD') AS purchase_date,
                   warranty_months,
                   created_at`,
        [cleanSerial, cleanSku, finalProductName, cleanCustomerId, cleanPurchaseDate, months]
      );

      if (result) {
        const created = computeWarranty(result.rows[0]);
        return res.status(201).json({ data: created });
      }

      // In-memory fallback
      const exists = inMemoryWarranties.some(
        (w) => w.serial_number.toUpperCase() === cleanSerial.toUpperCase()
      );
      if (exists) {
        return res.status(409).json({ error: `Warranty for serial ${cleanSerial} already exists` });
      }

      const newRecord = {
        serial_number: cleanSerial,
        sku: cleanSku,
        product_name: finalProductName,
        customer_id: cleanCustomerId,
        purchase_date: cleanPurchaseDate,
        warranty_months: months,
        created_at: new Date().toISOString()
      };
      inMemoryWarranties.push(newRecord);

      return res.status(201).json({ data: computeWarranty(newRecord) });
    } catch (dbErr) {
      // 23505 is PostgreSQL unique_violation code
      if (dbErr.code === '23505') {
        return res.status(409).json({ error: `Warranty for serial ${cleanSerial} already exists` });
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
