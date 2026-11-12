// [CRM2-C1] RMA table and API
// Handles CRUD operations and decision workflow for Return Merchandise Authorizations (RMAs).
const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const router = express.Router();
const pool = makePool('crm2_db');

// Allowed status and outcome values (must match CHECK constraints in schema.sql)
const STATUSES = ['requested', 'approved', 'rejected', 'received', 'closed'];
const OUTCOMES = ['restock', 'repair', 'credit_note'];

// Protect all RMA endpoints with authentication
router.use('/rmas', requireAuth);

// Validation helper for creating an RMA
function validateRmaCreate(body) {
  const { ticket_id, serial_number, reason } = body || {};
  if (!ticket_id || String(ticket_id).trim() === '') return 'ticket_id is required';
  if (!serial_number || String(serial_number).trim() === '') return 'serial_number is required';
  if (!reason || String(reason).trim() === '') return 'reason is required';
  return null;
}

// ==========================================
// RMA Endpoints (/api/rmas)
// ==========================================

// GET /api/rmas - List all RMAs with optional ?status= filter
router.get('/rmas', async (req, res, next) => {
  try {
    const { status } = req.query;
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }

    const conditions = [];
    const values = [];

    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT id, ticket_id, serial_number, reason, status, outcome, requested_at, decided_at
       FROM rmas ${where}
       ORDER BY requested_at DESC, id DESC`,
      values
    );

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/rmas - Create a new RMA request
// Note: Ashutosh's CRM2-C3 will later add a warranty verification check here
router.post('/rmas', async (req, res, next) => {
  try {
    const body = req.body || {};
    const validationError = validateRmaCreate(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const ticketId = String(body.ticket_id).trim();
    const serialNumber = String(body.serial_number).trim();
    const reason = String(body.reason).trim();

    const result = await pool.query(
      `INSERT INTO rmas (ticket_id, serial_number, reason, status, requested_at)
       VALUES ($1, $2, $3, 'requested', now())
       RETURNING id, ticket_id, serial_number, reason, status, outcome, requested_at, decided_at`,
      [ticketId, serialNumber, reason]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/rmas/:id/decision - Approve or reject an RMA
// Note: Ashutosh's CRM2-C3 will later add an ERP-4 return handoff call here
router.patch('/rmas/:id/decision', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, outcome } = req.body || {};

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "status must be either 'approved' or 'rejected'" });
    }

    // Approving requires an outcome (restock, repair, credit_note)
    if (status === 'approved') {
      if (!outcome || !OUTCOMES.includes(outcome)) {
        return res.status(400).json({
          error: `Outcome is required when approving an RMA and must be one of: ${OUTCOMES.join(', ')}`
        });
      }
    }

    const decisionOutcome = status === 'approved' ? outcome : (outcome || null);

    const result = await pool.query(
      `UPDATE rmas
       SET status = $1, outcome = $2, decided_at = now()
       WHERE id = $3
       RETURNING id, ticket_id, serial_number, reason, status, outcome, requested_at, decided_at`,
      [status, decisionOutcome, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `RMA '${id}' not found` });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/rmas/:id - Get a single RMA by ID
router.get('/rmas/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, ticket_id, serial_number, reason, status, outcome, requested_at, decided_at
       FROM rmas
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `RMA '${id}' not found` });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/rmas/:id - Update an RMA record
router.put('/rmas/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    // Check if RMA exists first
    const existing = await pool.query('SELECT * FROM rmas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: `RMA '${id}' not found` });
    }

    const current = existing.rows[0];

    // Validate status if provided
    const status = body.status !== undefined ? body.status : current.status;
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }

    // Validate outcome if provided
    let outcome = body.outcome !== undefined ? body.outcome : current.outcome;
    if (outcome !== null && outcome !== undefined && !OUTCOMES.includes(outcome)) {
      return res.status(400).json({ error: `outcome must be null or one of: ${OUTCOMES.join(', ')}` });
    }

    const serialNumber = body.serial_number !== undefined ? String(body.serial_number).trim() : current.serial_number;
    const reason = body.reason !== undefined ? String(body.reason).trim() : current.reason;

    const result = await pool.query(
      `UPDATE rmas
       SET serial_number = $1, reason = $2, status = $3, outcome = $4
       WHERE id = $5
       RETURNING id, ticket_id, serial_number, reason, status, outcome, requested_at, decided_at`,
      [serialNumber, reason, status, outcome, id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rmas/:id - Delete an RMA record
router.delete('/rmas/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM rmas WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `RMA '${id}' not found` });
    }

    res.json({ data: { message: 'RMA deleted successfully', id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
