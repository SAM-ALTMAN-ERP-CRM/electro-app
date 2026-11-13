const fs = require('fs');
const path = require('path');
const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const router = express.Router();
const pool = makePool('crm3_db');

// Protect all CRM-3 interaction endpoints with authentication middleware
router.use(requireAuth);

const ALLOWED_TYPES = ['call', 'email', 'meeting', 'ticket', 'order', 'note'];

function loadMockInteractions() {
  try {
    const mockPath = path.resolve(__dirname, '../mocks/interactions.json');
    if (fs.existsSync(mockPath)) {
      return JSON.parse(fs.readFileSync(mockPath, 'utf-8'));
    }
  } catch (err) {
    console.warn('[crm3] Could not load mock interactions:', err.message);
  }
  return [];
}

const memoryInteractions = loadMockInteractions();
let nextInteractionSeq = memoryInteractions.length + 1;

/**
 * Executes a parameterized PostgreSQL query and returns null if the database
 * is unavailable so tests and offline dev cleanly fall back to in-memory state.
 */
async function safeQuery(sql, values = []) {
  try {
    return await pool.query(sql, values);
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.code === '28000' ||
      err.code === '28P01' ||
      err.code === '3D000' ||
      err.code === '42P01' ||
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
 * Parses and validates optional `from` / `to` query date filters.
 * Expands date-only (`YYYY-MM-DD`) `to` filters to end-of-day UTC so events
 * timestamped during the end date remain inclusive.
 */
function parseDateFilter(from, to) {
  let fromDate = null;
  let toDate = null;

  if (from && String(from).trim()) {
    const rawFrom = String(from).trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawFrom);
    const parsed = new Date(isDateOnly ? `${rawFrom}T00:00:00.000Z` : rawFrom);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Invalid 'from' date format. Expected YYYY-MM-DD or ISO timestamp." };
    }
    fromDate = parsed;
  }

  if (to && String(to).trim()) {
    const rawTo = String(to).trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawTo);
    const parsed = new Date(isDateOnly ? `${rawTo}T23:59:59.999Z` : rawTo);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Invalid 'to' date format. Expected YYYY-MM-DD or ISO timestamp." };
    }
    toDate = parsed;
  }

  return { fromDate, toDate };
}

/**
 * Builds parameterized SQL query + values for listing interactions.
 */
function buildInteractionSelectQuery({ customerId, type, fromDate, toDate }) {
  let sql = `
    SELECT id, customer_id, type, summary, source_team, created_by, created_at
    FROM interactions
  `;
  const conditions = [];
  const values = [];

  if (customerId) {
    values.push(String(customerId).trim());
    conditions.push(`LOWER(customer_id) = LOWER($${values.length})`);
  }

  if (type && String(type).trim()) {
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
  return { sql, values };
}

/**
 * Applies matching customer, type, and date-range filters to in-memory rows,
 * sorted newest first.
 */
function filterMemoryInteractions(items, { customerId, type, fromDate, toDate }) {
  let results = [...items];

  if (customerId) {
    const targetCustomer = String(customerId).trim().toLowerCase();
    results = results.filter((item) => item.customer_id.toLowerCase() === targetCustomer);
  }

  if (type && String(type).trim()) {
    const targetType = String(type).trim().toLowerCase();
    results = results.filter((item) => item.type.toLowerCase() === targetType);
  }

  if (fromDate) {
    results = results.filter((item) => new Date(item.created_at) >= fromDate);
  }

  if (toDate) {
    results = results.filter((item) => new Date(item.created_at) <= toDate);
  }

  results.sort((a, b) => {
    const diff = new Date(b.created_at) - new Date(a.created_at);
    return diff !== 0 ? diff : String(b.id).localeCompare(String(a.id));
  });

  return results;
}

/**
 * Shared list handler for per-customer timeline and global interactions index.
 */
async function listInteractions(req, res, next, fixedCustomerId = null) {
  try {
    const customerId = fixedCustomerId || req.query.customer_id || null;
    const { type, from, to } = req.query;

    const { fromDate, toDate, error: dateError } = parseDateFilter(from, to);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const filterOpts = { customerId, type, fromDate, toDate };
    const { sql, values } = buildInteractionSelectQuery(filterOpts);
    const dbRes = await safeQuery(sql, values);

    if (dbRes) {
      return res.json({ data: dbRes.rows });
    }

    return res.json({ data: filterMemoryInteractions(memoryInteractions, filterOpts) });
  } catch (err) {
    next(err);
  }
}

/**
 * Persists a validated interaction record in PostgreSQL or in-memory fallback.
 */
async function createInteractionRecord({
  customerId,
  type,
  summary,
  sourceTeam,
  createdBy,
  createdAt
}) {
  const seqRes = await safeQuery("SELECT nextval('interactions_seq') AS n");
  const nextNum = seqRes?.rows?.[0]?.n || nextInteractionSeq++;
  const interactionId = `INT-${String(nextNum).padStart(4, '0')}`;

  try {
    const insertRes = await safeQuery(
      `INSERT INTO interactions (id, customer_id, type, summary, source_team, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, customer_id, type, summary, source_team, created_by, created_at`,
      [interactionId, customerId, type, summary, sourceTeam, createdBy, createdAt]
    );

    if (insertRes && insertRes.rows.length > 0) {
      return { record: insertRes.rows[0] };
    }
  } catch (dbErr) {
    if (dbErr.code === '23503') {
      return { notFoundError: `Customer '${customerId}' not found` };
    }
    throw dbErr;
  }

  const newInteraction = {
    id: interactionId,
    customer_id: customerId,
    type,
    summary,
    source_team: sourceTeam,
    created_by: createdBy,
    created_at: createdAt
  };
  memoryInteractions.unshift(newInteraction);
  return { record: newInteraction };
}

/**
 * Finds an exact matching cross-team event recorded within the same minute (60s window
 * or current calendar minute) so retries from other teams stay idempotent.
 */
async function findRecentDuplicateEvent({ customerId, type, summary, sourceTeam }) {
  const dupRes = await safeQuery(
    `SELECT id, customer_id, type, summary, source_team, created_by, created_at
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
     LIMIT 1`,
    [customerId, type, summary, sourceTeam]
  );

  if (dupRes) {
    return dupRes.rows[0] || null;
  }

  const nowMs = Date.now();
  const oneMinuteAgoMs = nowMs - 60 * 1000;
  const currentMinutePrefix = new Date(nowMs).toISOString().slice(0, 16);

  return (
    memoryInteractions.find((item) => {
      const itemTime = new Date(item.created_at).getTime();
      const itemMinutePrefix = new Date(item.created_at).toISOString().slice(0, 16);
      const sameMinuteWindow = itemTime >= oneMinuteAgoMs || itemMinutePrefix === currentMinutePrefix;

      return (
        sameMinuteWindow &&
        item.customer_id.toLowerCase() === customerId.toLowerCase() &&
        item.type.toLowerCase() === type &&
        item.summary === summary &&
        item.source_team.toLowerCase() === sourceTeam.toLowerCase()
      );
    }) || null
  );
}

/**
 * POST /api/interactions/from-event
 * Receives cross-team timeline events from CRM-1, CRM-2, CRM-4, ERP-4, etc.
 * Ignores exact duplicates sent within the same minute and returns 201.
 */
router.post('/interactions/from-event', async (req, res, next) => {
  try {
    const { customer_id, type, summary, source_team } = req.body || {};

    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    const normalizedType = type ? String(type).trim().toLowerCase() : '';
    if (!normalizedType || !ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        error: `type is required and must be one of: ${ALLOWED_TYPES.join(', ')}`
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

    const duplicate = await findRecentDuplicateEvent({
      customerId: cleanCustomerId,
      type: normalizedType,
      summary: cleanSummary,
      sourceTeam: cleanSourceTeam
    });

    if (duplicate) {
      return res.status(201).json({
        data: duplicate,
        duplicate: true,
        message: 'Duplicate event ignored (exact duplicate sent within the same minute)'
      });
    }

    const createdBy = req.user?.employee_id || req.user?.email || req.user?.id || cleanSourceTeam;
    const { record, notFoundError } = await createInteractionRecord({
      customerId: cleanCustomerId,
      type: normalizedType,
      summary: cleanSummary,
      sourceTeam: cleanSourceTeam,
      createdBy,
      createdAt: new Date().toISOString()
    });

    if (notFoundError) {
      return res.status(404).json({ error: notFoundError });
    }

    return res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id/interactions
 * Returns customer timeline interactions newest first with ?type= and ?from=&to= filters.
 */
router.get('/customers/:id/interactions', (req, res, next) => {
  return listInteractions(req, res, next, req.params.id);
});

/**
 * GET /api/interactions
 * Returns interactions across customers newest first with optional customer_id/type/from/to filters.
 */
router.get('/interactions', (req, res, next) => {
  return listInteractions(req, res, next, null);
});

/**
 * GET /api/interactions/:id
 * Fetches a single interaction by ID.
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

    const found = memoryInteractions.find(
      (item) => item.id.toLowerCase() === String(id).toLowerCase()
    );
    if (!found) {
      return res.status(404).json({ error: `Interaction '${id}' not found` });
    }
    return res.json({ data: found });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/interactions
 * Creates a new customer interaction record (call, email, meeting, ticket, order, note).
 */
router.post('/interactions', async (req, res, next) => {
  try {
    const {
      customer_id,
      type,
      summary,
      source_team,
      created_by,
      created_at
    } = req.body || {};

    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    const normalizedType = type ? String(type).trim().toLowerCase() : '';
    if (!normalizedType || !ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        error: `type is required and must be one of: ${ALLOWED_TYPES.join(', ')}`
      });
    }

    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      return res.status(400).json({ error: 'summary is required' });
    }

    let resolvedCreatedAt = new Date().toISOString();
    if (created_at) {
      const parsedDate = new Date(created_at);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid created_at timestamp' });
      }
      resolvedCreatedAt = parsedDate.toISOString();
    }

    const cleanCustomerId = customer_id.trim();
    const resolvedSourceTeam =
      source_team && typeof source_team === 'string' && source_team.trim()
        ? source_team.trim()
        : 'CRM-3';
    const resolvedCreatedBy =
      created_by && typeof created_by === 'string' && created_by.trim()
        ? created_by.trim()
        : req.user?.employee_id || req.user?.email || req.user?.id || 'EMP-0001';

    const { record, notFoundError } = await createInteractionRecord({
      customerId: cleanCustomerId,
      type: normalizedType,
      summary: summary.trim(),
      sourceTeam: resolvedSourceTeam,
      createdBy: resolvedCreatedBy,
      createdAt: resolvedCreatedAt
    });

    if (notFoundError) {
      return res.status(404).json({ error: notFoundError });
    }

    return res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
