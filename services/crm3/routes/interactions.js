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

// Load initial in-memory mock interactions for fallback/offline dev
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
 * GET /api/customers/:id/interactions
 * Returns timeline interactions for a given customer sorted newest first.
 * Optional query parameters:
 *   - type: filter by type (call, email, meeting, ticket, order, note)
 *   - from: ISO date string for start of range
 *   - to: ISO date string for end of range
 */
router.get('/customers/:id/interactions', async (req, res, next) => {
  const customerId = req.params.id;
  const { type, from, to } = req.query;

  try {
    let query = `
      SELECT id, customer_id, type, summary, source_team, created_by, created_at
      FROM interactions
      WHERE customer_id = $1
    `;
    const values = [customerId];

    if (type) {
      values.push(type.toLowerCase());
      query += ` AND LOWER(type) = $${values.length}`;
    }

    if (from) {
      values.push(new Date(from));
      query += ` AND created_at >= $${values.length}`;
    }

    if (to) {
      values.push(new Date(to));
      query += ` AND created_at <= $${values.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (dbErr) {
    // Fallback to in-memory store if database is offline or table is uninitialized
    let filtered = inMemoryInteractions.filter(item => item.customer_id === customerId);

    if (type) {
      filtered = filtered.filter(item => item.type.toLowerCase() === type.toLowerCase());
    }

    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter(item => new Date(item.created_at) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      filtered = filtered.filter(item => new Date(item.created_at) <= toDate);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ data: filtered });
  }
});

/**
 * POST /api/interactions
 * Creates a new interaction or note for a customer.
 * Request body:
 *   - customer_id: required, e.g. CUST-0001
 *   - type: optional, defaults to 'note' (valid: call, email, meeting, ticket, order, note)
 *   - summary: required text
 *   - source_team: optional, defaults to 'crm3'
 *   - created_by: optional, defaults to authenticated user's email
 */
router.post('/interactions', async (req, res, next) => {
  try {
    const { customer_id, type = 'note', summary, source_team = 'crm3', created_by } = req.body;

    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }

    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      return res.status(400).json({ error: 'summary cannot be blank' });
    }

    const normalizedType = String(type).trim().toLowerCase();
    if (!VALID_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        error: `Invalid type '${type}'. Allowed types: ${VALID_TYPES.join(', ')}`
      });
    }

    const author = created_by || (req.user && req.user.email) || 'admin@demo.com';
    const team = source_team || 'crm3';
    const now = new Date();

    try {
      // Try database insertion
      const seqRes = await pool.query("SELECT nextval('interactions_seq') as next_id");
      const nextNum = String(seqRes.rows[0].next_id).padStart(4, '0');
      const interactionId = `INT-${nextNum}`;

      const insertQuery = `
        INSERT INTO interactions (id, customer_id, type, summary, source_team, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, customer_id, type, summary, source_team, created_by, created_at
      `;
      const result = await pool.query(insertQuery, [
        interactionId,
        customer_id.trim(),
        normalizedType,
        summary.trim(),
        team,
        author,
        now
      ]);

      const savedItem = result.rows[0];
      inMemoryInteractions.unshift(savedItem);
      return res.status(201).json({ data: savedItem });
    } catch (dbErr) {
      // Fallback: create in-memory interaction
      const interactionId = `INT-${String(mockIdCounter++).padStart(4, '0')}`;
      const newInteraction = {
        id: interactionId,
        customer_id: customer_id.trim(),
        type: normalizedType,
        summary: summary.trim(),
        source_team: team,
        created_by: author,
        created_at: now.toISOString()
      };

      inMemoryInteractions.unshift(newInteraction);
      return res.status(201).json({ data: newInteraction });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
