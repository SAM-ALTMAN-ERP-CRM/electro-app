// [CRM2-C1] RMA table and API
// Handles CRUD operations and decision workflow for Return Merchandise Authorizations (RMAs).
const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { callService } = require('../../_shared/callService'); // [CRM2-C3] ERP-4 handoff + CRM-3 timeline
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

// [CRM2-C3] Warranty rule: look up the serial in our warranties table (CRM2-B1).
// Same expiry rule as GET /api/warranty/:serial: purchase_date + warranty_months >= today is 'active'.
// Returns 'active', 'expired', or null when the serial is not registered.
async function warrantyStatus(serialNumber) {
  const result = await pool.query(
    `SELECT CASE
              WHEN (purchase_date + (warranty_months || ' months')::interval)::date >= CURRENT_DATE THEN 'active'
              ELSE 'expired'
            END AS status
       FROM warranties
      WHERE serial_number = $1`,
    [serialNumber]
  );
  return result.rows.length ? result.rows[0].status : null;
}

// [CRM2-C3] Side effects after an RMA is approved. Each one is try/catch: a failure is logged
// as [integration-error] and the approval still succeeds. Returns 'sent' or 'failed' for ERP-4.
async function afterApproval(rma) {
  let erp4Handoff = 'sent';

  // 1. Hand the return to ERP-4 (ERP-4 owns returns; it then calls ERP-1 and ERP-5)
  const handoff = {
    rma_id: rma.id,
    serial_number: rma.serial_number,
    reason: rma.reason,
    outcome: rma.outcome
  };
  try {
    await callService('erp4', '/api/returns/from-rma', { method: 'POST', body: handoff });
  } catch (err) {
    erp4Handoff = 'failed';
    console.error(`[integration-error] ERP-4 return handoff failed (${err.message}). Payload:`, JSON.stringify(handoff));
  }

  // 2. Put "RMA approved" on the customer's CRM-3 timeline (customer comes from the ticket)
  try {
    const ticket = await pool.query('SELECT customer_id FROM tickets WHERE id = $1', [rma.ticket_id]);
    if (ticket.rows.length === 0) {
      console.error(`[integration-error] CRM-3 timeline skipped: ticket ${rma.ticket_id} not found for ${rma.id}`);
    } else {
      const event = {
        customer_id: ticket.rows[0].customer_id,
        type: 'ticket',
        summary: `RMA ${rma.id} approved (${rma.outcome})`,
        source_team: 'CRM-2'
      };
      try {
        await callService('crm3', '/api/interactions/from-event', { method: 'POST', body: event });
      } catch (err) {
        console.error(`[integration-error] CRM-3 timeline event failed (${err.message}). Payload:`, JSON.stringify(event));
      }
    }
  } catch (err) {
    console.error(`[integration-error] CRM-3 timeline lookup failed (${err.message})`);
  }

  return erp4Handoff;
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
// [CRM2-C3] Only allowed when the serial is in warranty
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

    // [CRM2-C3] Warranty rule: unknown serial or expired warranty -> 400
    const warranty = await warrantyStatus(serialNumber);
    if (warranty === null) {
      return res.status(400).json({ error: 'Serial not registered for warranty' });
    }
    if (warranty === 'expired') {
      return res.status(400).json({ error: 'Out of warranty' });
    }

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
// [CRM2-C3] Approving hands the return to ERP-4 and posts a CRM-3 timeline event
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

    // [CRM2-C3] Decide only once: a second approval would send a duplicate return to ERP-4
    const existing = await pool.query('SELECT status FROM rmas WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: `RMA '${id}' not found` });
    }
    if (existing.rows[0].status !== 'requested') {
      return res.status(409).json({ error: `RMA '${id}' is already ${existing.rows[0].status}` });
    }

    const result = await pool.query(
      `UPDATE rmas
       SET status = $1, outcome = $2, decided_at = now()
       WHERE id = $3 AND status = 'requested'
       RETURNING id, ticket_id, serial_number, reason, status, outcome, requested_at, decided_at`,
      [status, decisionOutcome, id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: `RMA '${id}' was already decided` });
    }

    const rma = result.rows[0];

    // [CRM2-C3] Approval side effects; erp4_handoff tells the screen whether ERP-4 got the return
    if (rma.status === 'approved') {
      const erp4Handoff = await afterApproval(rma);
      return res.json({ data: { ...rma, erp4_handoff: erp4Handoff } });
    }

    res.json({ data: rma });
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
