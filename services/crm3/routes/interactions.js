const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

const ALLOWED_TYPES = ['call', 'email', 'meeting', 'ticket', 'order'];

// 10 seed interactions over CUST-0001 to CUST-0003 adhering strictly to Section 5 shared seed contract
let memoryInteractions = [
  {
    id: 'INT-0001',
    customer_id: 'CUST-0001',
    type: 'order',
    summary: 'Order SO-0001 placed for 55-inch 4K Smart TV (SKU-0001)',
    source_team: 'ERP-4',
    created_by: 'EMP-0001',
    created_at: '2026-11-06T14:30:00.000Z'
  },
  {
    id: 'INT-0002',
    customer_id: 'CUST-0001',
    type: 'call',
    summary: 'Outbound sales call confirming delivery address and installation schedule',
    source_team: 'CRM-1',
    created_by: 'EMP-0001',
    created_at: '2026-11-05T11:15:00.000Z'
  },
  {
    id: 'INT-0003',
    customer_id: 'CUST-0001',
    type: 'ticket',
    summary: 'Customer enquired about extended warranty options for Smart TV',
    source_team: 'CRM-2',
    created_by: 'EMP-0005',
    created_at: '2026-11-04T16:45:00.000Z'
  },
  {
    id: 'INT-0004',
    customer_id: 'CUST-0001',
    type: 'email',
    summary: 'Product catalog and festival discount brochure sent via email',
    source_team: 'CRM-4',
    created_by: 'EMP-0002',
    created_at: '2026-11-02T09:00:00.000Z'
  },
  {
    id: 'INT-0005',
    customer_id: 'CUST-0002',
    type: 'meeting',
    summary: 'Quarterly corporate procurement review and bulk discount agreement',
    source_team: 'CRM-1',
    created_by: 'EMP-0003',
    created_at: '2026-11-06T16:00:00.000Z'
  },
  {
    id: 'INT-0006',
    customer_id: 'CUST-0002',
    type: 'order',
    summary: 'Purchase order SO-0002 received for 20x 43-inch Full HD TV (SKU-0002)',
    source_team: 'ERP-4',
    created_by: 'EMP-0003',
    created_at: '2026-11-05T10:20:00.000Z'
  },
  {
    id: 'INT-0007',
    customer_id: 'CUST-0002',
    type: 'call',
    summary: 'Credit terms and GST invoice 27AABCS1234F1Z5 reconciliation call with finance',
    source_team: 'ERP-5',
    created_by: 'EMP-0004',
    created_at: '2026-11-03T15:10:00.000Z'
  },
  {
    id: 'INT-0008',
    customer_id: 'CUST-0003',
    type: 'ticket',
    summary: 'Installation ticket raised for 65-inch OLED TV (SKU-0003) at Kochi residence',
    source_team: 'CRM-2',
    created_by: 'EMP-0006',
    created_at: '2026-11-06T12:00:00.000Z'
  },
  {
    id: 'INT-0009',
    customer_id: 'CUST-0003',
    type: 'call',
    summary: 'Feedback call post service engineer visit: customer satisfied with setup',
    source_team: 'CRM-2',
    created_by: 'EMP-0006',
    created_at: '2026-11-05T14:30:00.000Z'
  },
  {
    id: 'INT-0010',
    customer_id: 'CUST-0003',
    type: 'email',
    summary: 'Welcome onboarding email and digital invoice copy delivered',
    source_team: 'CRM-3',
    created_by: 'EMP-0012',
    created_at: '2026-11-01T10:00:00.000Z'
  }
];

let nextInteractionSeq = 11;

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
 * GET /api/customers/:id/interactions
 * Returns interactions for a specific customer, sorted newest first.
 * Supports optional query filters:
 *   - type: filter by call | email | meeting | ticket | order
 *   - from: start date / timestamp (inclusive)
 *   - to: end date / timestamp (inclusive)
 */
router.get('/customers/:id/interactions', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, from, to } = req.query;

    const { fromDate, toDate, error: dateError } = parseDateFilter(from, to);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    // Try PostgreSQL
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
    let results = memoryInteractions.filter(
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
 * Creates a new interaction record.
 * Body parameters:
 *   - customer_id: (required) e.g. CUST-0001
 *   - type: (required) call | email | meeting | ticket | order
 *   - summary: (required) description of the interaction
 *   - source_team: (optional) default 'CRM-3'
 *   - created_by: (optional) default authenticated user ID or EMP-0001
 *   - created_at: (optional) ISO timestamp, default NOW()
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

    // 1. Validation
    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    const normalizedType = type ? String(type).trim().toLowerCase() : '';
    if (!normalizedType || !ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        error: `type must be one of: ${ALLOWED_TYPES.join(', ')}`
      });
    }

    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      return res.status(400).json({ error: 'summary is required' });
    }

    const cleanCustomerId = customer_id.trim();
    const cleanSummary = summary.trim();
    const resolvedSourceTeam = source_team && typeof source_team === 'string' && source_team.trim()
      ? source_team.trim()
      : 'CRM-3';
    const resolvedCreatedBy = created_by && typeof created_by === 'string' && created_by.trim()
      ? created_by.trim()
      : (req.user?.employee_id || req.user?.id || 'EMP-0001');

    let resolvedCreatedAt = new Date().toISOString();
    if (created_at) {
      const parsedDate = new Date(created_at);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid created_at timestamp' });
      }
      resolvedCreatedAt = parsedDate.toISOString();
    }

    // 2. Try PostgreSQL
    const seqResult = await safeQuery("SELECT nextval('interactions_seq') AS n");
    const nextNum = seqResult?.rows?.[0]?.n || nextInteractionSeq++;
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
      resolvedSourceTeam,
      resolvedCreatedBy,
      resolvedCreatedAt
    ]);

    if (insertRes && insertRes.rows.length > 0) {
      return res.status(201).json({ data: insertRes.rows[0] });
    }

    // 3. In-memory fallback
    const newInteraction = {
      id: interactionId,
      customer_id: cleanCustomerId,
      type: normalizedType,
      summary: cleanSummary,
      source_team: resolvedSourceTeam,
      created_by: resolvedCreatedBy,
      created_at: resolvedCreatedAt
    };

    memoryInteractions.unshift(newInteraction);
    return res.status(201).json({ data: newInteraction });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/interactions
 * Returns all interactions across customers, sorted newest first.
 * Supports optional query filters:
 *   - customer_id: filter by specific customer
 *   - type: filter by call | email | meeting | ticket | order
 *   - from: start date / timestamp (inclusive)
 *   - to: end date / timestamp (inclusive)
 */
router.get('/interactions', async (req, res, next) => {
  try {
    const { customer_id, type, from, to } = req.query;

    const { fromDate, toDate, error: dateError } = parseDateFilter(from, to);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    // Try PostgreSQL
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
    let results = [...memoryInteractions];

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
 * Fetches a single interaction by ID.
 */
router.get('/interactions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try PostgreSQL
    const dbRes = await safeQuery(
      `SELECT id, customer_id, type, summary, source_team, created_by, created_at
       FROM interactions
       WHERE LOWER(id) = LOWER($1)`,
      [id]
    );

    if (dbRes) {
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: `Interaction with ID '${id}' not found` });
      }
      return res.json({ data: dbRes.rows[0] });
    }

    // In-memory fallback
    const found = memoryInteractions.find(
      item => item.id.toLowerCase() === String(id).toLowerCase()
    );

    if (!found) {
      return res.status(404).json({ error: `Interaction with ID '${id}' not found` });
    }

    return res.json({ data: found });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
