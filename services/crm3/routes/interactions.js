const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

const VALID_TYPES = ['call', 'email', 'meeting', 'ticket', 'order', 'note'];

// Load initial in-memory mock interactions for fallback / offline dev
let inMemoryInteractions = [];
try {
  const mockPath = path.resolve(__dirname, '../mocks/interactions.json');
  if (fs.existsSync(mockPath)) {
    inMemoryInteractions = JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[crm3] Could not pre-load mock interactions:', err.message);
}

let mockIdCounter = inMemoryInteractions.length + 1;

/**
 * Safely executes a query on PostgreSQL, returning null if the database is unreachable.
 */
async function safeQuery(sql, values = []) {
  try {
    return await pool.query(sql, values);
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.code === '28P01' ||
      err.code === '3D000' ||
      err.code === 'EPERM' ||
      err.message?.includes('connect') ||
      err.message?.includes('timeout')
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Helper to validate and parse date range filters
 */
function parseDateFilter(from, to) {
  let fromDate = null;
  let toDate = null;

  if (from) {
    const trimmedFrom = String(from).trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmedFrom);
    const parsed = new Date(isDateOnly ? `${trimmedFrom}T00:00:00.000Z` : trimmedFrom);
    if (isNaN(parsed.getTime())) {
      return { error: "Invalid 'from' date format. Expected YYYY-MM-DD or ISO timestamp." };
    }
    fromDate = parsed;
  }

  if (to) {
    const trimmedTo = String(to).trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmedTo);
    const parsed = new Date(isDateOnly ? `${trimmedTo}T23:59:59.999Z` : trimmedTo);
    if (isNaN(parsed.getTime())) {
      return { error: "Invalid 'to' date format. Expected YYYY-MM-DD or ISO timestamp." };
    }
    toDate = parsed;
  }

  return { fromDate, toDate };
}

/**
 * POST /api/interactions/from-event
 * Core cross-team endpoint for external teams:
 *   - CRM1-C3 (order events on accepted quotes)
 *   - CRM2-A1 (ticket events on ticket creation)
 *   - CRM2-C3 (ticket events on warranty / RMA returns)
 *   - CRM4-A3 (email events on campaign sends)
 *   - ERP4-C3 (order events on dispatches)
 *
 * Expected Request Body:
 *   {
 *     customer_id: string,
 *     type: 'order' | 'ticket' | 'email' | 'call' | 'meeting' | 'note',
 *     summary: string,
 *     source_team: string
 *   }
 *
 * Returns 201 Created and ignores exact duplicates sent within the same minute.
 */
router.post('/interactions/from-event', async (req, res, next) => {
  try {
    const { customer_id, type, summary, source_team } = req.body || {};

    // 1. Validate required fields
    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    if (!type || typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({ error: 'type is required' });
    }

    const normalizedType = String(type).trim().toLowerCase();
    if (!VALID_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        error: `Invalid type '${type}'. Allowed types: ${VALID_TYPES.join(', ')}`
      });
    }

    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      return res.status(400).json({ error: 'summary is required' });
    }

    if (!source_team || typeof source_team !== 'string' || !source_team.trim()) {
      return res.status(400).json({ error: 'source_team is required' });
    }

    const cleanCustomerId = customer_id.trim();
    const cleanSummary = summary.trim();
    const cleanSourceTeam = source_team.trim();
    const author = (req.user && (req.user.employee_id || req.user.email || req.user.name)) || cleanSourceTeam;

    // 2. Exact Duplicate Check:
    // Check if an exact duplicate (same customer_id, type, summary, source_team)
    // was created within the same minute (past 60s or same calendar minute).

    // Check database for duplicates
    const duplicateQuery = `
      SELECT id, customer_id, type, summary, source_team, created_by, created_at
      FROM interactions
      WHERE LOWER(customer_id) = LOWER($1)
        AND LOWER(type) = LOWER($2)
        AND summary = $3
        AND LOWER(source_team) = LOWER($4)
        AND (
          created_at >= NOW() - INTERVAL '1 minute'
          OR date_trunc('minute', created_at) = date_trunc('minute', NOW())
        )
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const dupRes = await safeQuery(duplicateQuery, [
      cleanCustomerId,
      normalizedType,
      cleanSummary,
      cleanSourceTeam
    ]);

    if (dupRes && dupRes.rows.length > 0) {
      // Duplicate found within the same minute: return 201 without creating duplicate row
      return res.status(201).json({
        data: dupRes.rows[0],
        duplicate: true,
        message: 'Duplicate event ignored (exact duplicate sent within the same minute)'
      });
    }

    // In-memory duplicate check (used if DB offline or for in-memory sync)
    const oneMinuteAgo = Date.now() - 60 * 1000;
    const currentMinuteStr = new Date().toISOString().slice(0, 16);

    const memDup = inMemoryInteractions.find(item => {
      const itemTime = new Date(item.created_at).getTime();
      const itemMinuteStr = new Date(item.created_at).toISOString().slice(0, 16);
      const isWithinSameMinute = (itemTime >= oneMinuteAgo) || (itemMinuteStr === currentMinuteStr);

      return (
        item.customer_id.toLowerCase() === cleanCustomerId.toLowerCase() &&
        item.type.toLowerCase() === normalizedType &&
        item.summary === cleanSummary &&
        item.source_team.toLowerCase() === cleanSourceTeam.toLowerCase() &&
        isWithinSameMinute
      );
    });

    if (memDup) {
      return res.status(201).json({
        data: memDup,
        duplicate: true,
        message: 'Duplicate event ignored (exact duplicate sent within the same minute)'
      });
    }

    // 3. Insert new interaction record
    const seqResult = await safeQuery("SELECT nextval('interactions_seq') AS n");
    const nextNum = seqResult?.rows?.[0]?.n || mockIdCounter++;
    const interactionId = `INT-${String(nextNum).padStart(4, '0')}`;
    const now = new Date();

    const insertSql = `
      INSERT INTO interactions (id, customer_id, type, summary, source_team, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, customer_id, type, summary, source_team, created_by, created_at
    `;

    let insertRes = null;
    try {
      insertRes = await safeQuery(insertSql, [
        interactionId,
        cleanCustomerId,
        normalizedType,
        cleanSummary,
        cleanSourceTeam,
        author,
        now
      ]);
    } catch (insertErr) {
      // If foreign key constraint failed because customer stub doesn't exist, handle gracefully
      if (insertErr.code === '23503') {
        await safeQuery(
          `INSERT INTO customers (id, name, type, email, phone, city)
           VALUES ($1, $2, 'retail', $3, '9999999999', 'Mumbai')
           ON CONFLICT (id) DO NOTHING`,
          [cleanCustomerId, `Customer ${cleanCustomerId}`, `${cleanCustomerId.toLowerCase()}@example.com`]
        );
        insertRes = await safeQuery(insertSql, [
          interactionId,
          cleanCustomerId,
          normalizedType,
          cleanSummary,
          cleanSourceTeam,
          author,
          now
        ]);
      } else {
        throw insertErr;
      }
    }

    if (insertRes && insertRes.rows.length > 0) {
      const savedItem = insertRes.rows[0];
      inMemoryInteractions.unshift(savedItem);
      return res.status(201).json({ data: savedItem });
    }

    // In-memory fallback
    const newInteraction = {
      id: interactionId,
      customer_id: cleanCustomerId,
      type: normalizedType,
      summary: cleanSummary,
      source_team: cleanSourceTeam,
      created_by: author,
      created_at: now.toISOString()
    };

    inMemoryInteractions.unshift(newInteraction);
    return res.status(201).json({ data: newInteraction });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id/interactions
 * Returns timeline interactions for a given customer, sorted newest first.
 * Optional query filters:
 *   - type: filter by call | email | meeting | ticket | order | note
 *   - from: ISO date or YYYY-MM-DD
 *   - to: ISO date or YYYY-MM-DD
 */
router.get('/customers/:id/interactions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, from, to } = req.query;

    const { fromDate, toDate, error: dateError } = parseDateFilter(from, to);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    let sql = `
      SELECT id, customer_id, type, summary, source_team, created_by, created_at
      FROM interactions
      WHERE LOWER(customer_id) = LOWER($1)
    `;
    const values = [id];

    if (type) {
      values.push(String(type).trim().toLowerCase());
      sql += ` AND LOWER(type) = $${values.length}`;
    }

    if (fromDate) {
      values.push(fromDate.toISOString());
      sql += ` AND created_at >= $${values.length}`;
    }

    if (toDate) {
      values.push(toDate.toISOString());
      sql += ` AND created_at <= $${values.length}`;
    }

    sql += ' ORDER BY created_at DESC, id DESC';

    const dbRes = await safeQuery(sql, values);
    if (dbRes) {
      return res.json({ data: dbRes.rows });
    }

    // In-memory fallback
    let results = inMemoryInteractions.filter(
      item => item.customer_id.toLowerCase() === String(id).toLowerCase()
    );

    if (type) {
      const normalizedType = String(type).trim().toLowerCase();
      results = results.filter(item => item.type.toLowerCase() === normalizedType);
    }

    if (fromDate) {
      results = results.filter(item => new Date(item.created_at) >= fromDate);
    }

    if (toDate) {
      results = results.filter(item => new Date(item.created_at) <= toDate);
    }

    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/interactions
 * Standard endpoint to add a new note or interaction manually from the UI.
 * Request body:
 *   - customer_id: (required) e.g. 'CUST-0001'
 *   - type: (optional) default 'note'
 *   - summary: (required) text
 *   - source_team: (optional) default 'CRM-3'
 *   - created_by: (optional)
 *   - created_at: (optional)
 */
router.post('/interactions', async (req, res, next) => {
  try {
    const {
      customer_id,
      type = 'note',
      summary,
      source_team = 'CRM-3',
      created_by,
      created_at
    } = req.body || {};

    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      return res.status(400).json({ error: 'summary is required' });
    }

    const normalizedType = String(type).trim().toLowerCase();
    if (!VALID_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        error: `Invalid type '${type}'. Allowed types: ${VALID_TYPES.join(', ')}`
      });
    }

    const cleanCustomerId = customer_id.trim();
    const cleanSummary = summary.trim();
    const cleanSourceTeam = String(source_team).trim() || 'CRM-3';
    const author = created_by || (req.user && (req.user.employee_id || req.user.email || req.user.name)) || 'EMP-0001';

    let resolvedCreatedAt = new Date();
    if (created_at) {
      const parsedDate = new Date(created_at);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid created_at timestamp' });
      }
      resolvedCreatedAt = parsedDate;
    }

    const seqResult = await safeQuery("SELECT nextval('interactions_seq') AS n");
    const nextNum = seqResult?.rows?.[0]?.n || mockIdCounter++;
    const interactionId = `INT-${String(nextNum).padStart(4, '0')}`;

    const insertSql = `
      INSERT INTO interactions (id, customer_id, type, summary, source_team, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, customer_id, type, summary, source_team, created_by, created_at
    `;

    const insertRes = await safeQuery(insertSql, [
      interactionId,
      cleanCustomerId,
      normalizedType,
      cleanSummary,
      cleanSourceTeam,
      author,
      resolvedCreatedAt
    ]);

    if (insertRes && insertRes.rows.length > 0) {
      const savedItem = insertRes.rows[0];
      inMemoryInteractions.unshift(savedItem);
      return res.status(201).json({ data: savedItem });
    }

    // In-memory fallback
    const newInteraction = {
      id: interactionId,
      customer_id: cleanCustomerId,
      type: normalizedType,
      summary: cleanSummary,
      source_team: cleanSourceTeam,
      created_by: author,
      created_at: resolvedCreatedAt.toISOString()
    };

    inMemoryInteractions.unshift(newInteraction);
    return res.status(201).json({ data: newInteraction });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/interactions
 * Returns all interactions across customers, sorted newest first.
 * Optional filters: customer_id, type, from, to
 */
router.get('/interactions', async (req, res, next) => {
  try {
    const { customer_id, type, from, to } = req.query;

    const { fromDate, toDate, error: dateError } = parseDateFilter(from, to);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    let sql = `
      SELECT id, customer_id, type, summary, source_team, created_by, created_at
      FROM interactions
    `;
    const conditions = [];
    const values = [];

    if (customer_id) {
      values.push(String(customer_id).trim());
      conditions.push(`LOWER(customer_id) = LOWER($${values.length})`);
    }

    if (type) {
      values.push(String(type).trim().toLowerCase());
      conditions.push(`LOWER(type) = $${values.length}`);
    }

    if (fromDate) {
      values.push(fromDate.toISOString());
      conditions.push(`created_at >= $${values.length}`);
    }

    if (toDate) {
      values.push(toDate.toISOString());
      conditions.push(`created_at <= $${values.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY created_at DESC, id DESC';

    const dbRes = await safeQuery(sql, values);
    if (dbRes) {
      return res.json({ data: dbRes.rows });
    }

    // In-memory fallback
    let results = [...inMemoryInteractions];

    if (customer_id) {
      const normalizedCustId = String(customer_id).trim().toLowerCase();
      results = results.filter(item => item.customer_id.toLowerCase() === normalizedCustId);
    }

    if (type) {
      const normalizedType = String(type).trim().toLowerCase();
      results = results.filter(item => item.type.toLowerCase() === normalizedType);
    }

    if (fromDate) {
      results = results.filter(item => new Date(item.created_at) >= fromDate);
    }

    if (toDate) {
      results = results.filter(item => new Date(item.created_at) <= toDate);
    }

    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/interactions/:id
 * Fetches single interaction by ID
 */
router.get('/interactions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbRes = await safeQuery(
      `SELECT id, customer_id, type, summary, source_team, created_by, created_at
       FROM interactions
       WHERE LOWER(id) = LOWER($1)`,
      [id]
    );

    if (dbRes) {
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: `Interaction '${id}' not found` });
      }
      return res.json({ data: dbRes.rows[0] });
    }

    // In-memory fallback
    const found = inMemoryInteractions.find(
      item => item.id.toLowerCase() === String(id).toLowerCase()
    );

    if (!found) {
      return res.status(404).json({ error: `Interaction '${id}' not found` });
    }

    return res.json({ data: found });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
