const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Database pool for ERP-1 Inventory & Warehouses
const pool = makePool('erp1_db');

// Protect all serial and batch routes with JWT authentication
router.use(requireAuth);

const VALID_STATUSES = ['in_stock', 'reserved', 'sold', 'returned'];

// In-memory fallback stores loaded from mocks/ for offline testing
let inMemorySerials = [];
let inMemoryBatches = [];
let inMemoryProducts = [];

try {
  const serialsPath = path.resolve(__dirname, '../mocks/serials.json');
  if (fs.existsSync(serialsPath)) {
    inMemorySerials = JSON.parse(fs.readFileSync(serialsPath, 'utf-8'));
  }
  const batchesPath = path.resolve(__dirname, '../mocks/batches.json');
  if (fs.existsSync(batchesPath)) {
    inMemoryBatches = JSON.parse(fs.readFileSync(batchesPath, 'utf-8'));
  }
  const productsPath = path.resolve(__dirname, '../mocks/products.json');
  if (fs.existsSync(productsPath)) {
    inMemoryProducts = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp1] Could not load mock serial/batch data:', err.message);
}

/**
 * Checks whether a pg error means PostgreSQL is unreachable or not set up locally.
 */
function isDbUnavailable(err) {
  if (!err) return false;
  const offlineCodes = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '3D000', '28P01', '28000']);
  if (offlineCodes.has(err.code)) return true;
  if (Array.isArray(err.errors)) {
    return err.errors.some(e => offlineCodes.has(e.code));
  }
  return false;
}

/**
 * Normalizes a prefix so e.g. 'TV55-2611-' stays 'TV55-2611-' and 'PROD' becomes 'PROD-'.
 */
function formatPrefix(rawPrefix) {
  const trimmed = rawPrefix.trim();
  return trimmed.endsWith('-') ? trimmed : `${trimmed}-`;
}

/**
 * Finds the highest numeric suffix already used for a given prefix.
 */
function getMaxSuffix(existingSerialNumbers, prefix) {
  let maxNum = 0;
  for (const sn of existingSerialNumbers) {
    if (sn.startsWith(prefix)) {
      const tail = sn.slice(prefix.length);
      if (/^\d+$/.test(tail)) {
        const parsed = parseInt(tail, 10);
        if (parsed > maxNum) maxNum = parsed;
      }
    }
  }
  return maxNum;
}

/**
 * GET /api/batches
 * Lists all production/inventory batches, newest first.
 */
router.get('/batches', async (req, res, next) => {
  try {
    try {
      const result = await pool.query(
        `SELECT batch_no, sku, quantity, manufactured_on
         FROM batches
         ORDER BY manufactured_on DESC, batch_no ASC`
      );
      return res.json({ data: result.rows });
    } catch (dbErr) {
      if (!isDbUnavailable(dbErr)) throw dbErr;
    }

    return res.json({ data: inMemoryBatches });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/serials/bulk
 * Generates `count` unique sequential serial numbers for a SKU and records the batch.
 * Body: { sku, batch_no, count, prefix, warehouse_id? }
 */
router.post('/serials/bulk', async (req, res, next) => {
  try {
    const { sku, batch_no, count, prefix, warehouse_id } = req.body || {};

    if (typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({ error: 'sku is required' });
    }
    if (typeof batch_no !== 'string' || !batch_no.trim()) {
      return res.status(400).json({ error: 'batch_no is required' });
    }
    if (typeof prefix !== 'string' || !prefix.trim()) {
      return res.status(400).json({ error: 'prefix is required' });
    }
    if (count === undefined || count === null || count === '' || typeof count === 'boolean') {
      return res.status(400).json({ error: 'count is required and must be a positive integer' });
    }
    const parsedCount = Number(count);
    if (!Number.isInteger(parsedCount) || parsedCount <= 0 || parsedCount > 1000) {
      return res.status(400).json({ error: 'count must be a positive integer between 1 and 1000' });
    }

    const cleanSku = sku.trim();
    const cleanBatchNo = batch_no.trim();
    const effectivePrefix = formatPrefix(prefix);
    const cleanWarehouseId = (typeof warehouse_id === 'string' && warehouse_id.trim()) ? warehouse_id.trim() : 'WH-01';
    const manufacturedOn = new Date().toISOString().slice(0, 10);

    // Try PostgreSQL transaction first
    let client;
    try {
      client = await pool.connect();
    } catch (connErr) {
      if (!isDbUnavailable(connErr)) throw connErr;
      client = null;
    }

    if (client) {
      try {
        await client.query('BEGIN');

        // Verify SKU exists in products table
        const skuCheck = await client.query('SELECT id FROM products WHERE id = $1', [cleanSku]);
        if (skuCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Product '${cleanSku}' not found` });
        }

        // Upsert batch record
        await client.query(
          `INSERT INTO batches (batch_no, sku, quantity, manufactured_on)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (batch_no) DO UPDATE SET
             quantity = batches.quantity + EXCLUDED.quantity`,
          [cleanBatchNo, cleanSku, parsedCount, manufacturedOn]
        );

        // Find existing serials with this prefix so new serials never collide
        const existingRes = await client.query(
          'SELECT serial_number FROM serials WHERE serial_number LIKE $1',
          [`${effectivePrefix}%`]
        );
        const startNum = getMaxSuffix(existingRes.rows.map(r => r.serial_number), effectivePrefix);

        const createdSerials = [];
        for (let i = 1; i <= parsedCount; i++) {
          const serialNumber = `${effectivePrefix}${String(startNum + i).padStart(4, '0')}`;
          await client.query(
            `INSERT INTO serials (serial_number, sku, batch_no, warehouse_id, status)
             VALUES ($1, $2, $3, $4, 'in_stock')`,
            [serialNumber, cleanSku, cleanBatchNo, cleanWarehouseId]
          );
          createdSerials.push(serialNumber);
        }

        await client.query('COMMIT');

        return res.status(201).json({
          data: {
            batch_no: cleanBatchNo,
            sku: cleanSku,
            created_serials: createdSerials,
            count: createdSerials.length
          }
        });
      } catch (txErr) {
        await client.query('ROLLBACK').catch(() => {});
        throw txErr;
      } finally {
        client.release();
      }
    }

    // In-memory fallback when database is offline
    if (inMemoryProducts.length > 0 && !inMemoryProducts.some(p => p.id === cleanSku)) {
      return res.status(404).json({ error: `Product '${cleanSku}' not found` });
    }

    const existingBatch = inMemoryBatches.find(b => b.batch_no === cleanBatchNo);
    if (existingBatch) {
      existingBatch.quantity += parsedCount;
    } else {
      inMemoryBatches.unshift({
        batch_no: cleanBatchNo,
        sku: cleanSku,
        quantity: parsedCount,
        manufactured_on: manufacturedOn
      });
    }

    const startNum = getMaxSuffix(inMemorySerials.map(s => s.serial_number), effectivePrefix);
    const createdSerials = [];
    const nowIso = new Date().toISOString();

    for (let i = 1; i <= parsedCount; i++) {
      const serialNumber = `${effectivePrefix}${String(startNum + i).padStart(4, '0')}`;
      inMemorySerials.push({
        serial_number: serialNumber,
        sku: cleanSku,
        batch_no: cleanBatchNo,
        warehouse_id: cleanWarehouseId,
        status: 'in_stock',
        created_at: nowIso
      });
      createdSerials.push(serialNumber);
    }

    return res.status(201).json({
      data: {
        batch_no: cleanBatchNo,
        sku: cleanSku,
        created_serials: createdSerials,
        count: createdSerials.length
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/serials
 * Lists serial numbers with optional ?sku=, ?status=, ?batch_no=, and ?q= filters.
 */
router.get('/serials', async (req, res, next) => {
  try {
    const { sku, status, batch_no, q } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status '${status}'. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    try {
      const conditions = [];
      const params = [];

      if (sku) {
        params.push(String(sku).trim());
        conditions.push(`sku = $${params.length}`);
      }
      if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
      }
      if (batch_no) {
        params.push(String(batch_no).trim());
        conditions.push(`batch_no = $${params.length}`);
      }
      if (q) {
        params.push(`%${String(q).trim()}%`);
        conditions.push(`serial_number ILIKE $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT serial_number, sku, batch_no, warehouse_id, status, created_at
         FROM serials
         ${whereClause}
         ORDER BY serial_number ASC`,
        params
      );
      return res.json({ data: result.rows });
    } catch (dbErr) {
      if (!isDbUnavailable(dbErr)) throw dbErr;
    }

    // In-memory fallback
    let filtered = inMemorySerials;
    if (sku) {
      filtered = filtered.filter(s => s.sku === String(sku).trim());
    }
    if (status) {
      filtered = filtered.filter(s => s.status === status);
    }
    if (batch_no) {
      filtered = filtered.filter(s => s.batch_no === String(batch_no).trim());
    }
    if (q) {
      const needle = String(q).trim().toLowerCase();
      filtered = filtered.filter(s => s.serial_number.toLowerCase().includes(needle));
    }
    return res.json({ data: filtered });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/serials/:serial
 * Retrieves details for a single serial number.
 */
router.get('/serials/:serial', async (req, res, next) => {
  try {
    const serialNumber = req.params.serial;

    try {
      const result = await pool.query(
        `SELECT serial_number, sku, batch_no, warehouse_id, status, created_at
         FROM serials
         WHERE serial_number = $1`,
        [serialNumber]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Serial '${serialNumber}' not found` });
      }
      return res.json({ data: result.rows[0] });
    } catch (dbErr) {
      if (!isDbUnavailable(dbErr)) throw dbErr;
    }

    const found = inMemorySerials.find(s => s.serial_number === serialNumber);
    if (!found) {
      return res.status(404).json({ error: `Serial '${serialNumber}' not found` });
    }
    return res.json({ data: found });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
