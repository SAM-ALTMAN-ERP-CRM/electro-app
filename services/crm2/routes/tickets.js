// [CRM2-A1] Tickets table and API
// Customer support tickets: list with filters, view one, create, edit, change status.
const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { callService } = require('../../_shared/callService');
const { makePool } = require('../../_shared/db');

const router = express.Router();
const pool = makePool('crm2_db');

// Allowed values (must match the CHECK constraints in db/schema.sql)
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high'];
const CUSTOMER_ID = /^CUST-\d{4}$/;
const EMPLOYEE_ID = /^EMP-\d{4}$/;

// Every ticket route needs a logged-in user
router.use('/tickets', requireAuth);

// Small helper: turn '' or undefined into null so optional columns stay empty
function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

// Check the fields of a create (POST) or edit (PUT) body.
// isCreate = true means the required fields must be present.
// Returns an error message, or null when everything is fine.
function validateTicket(body, isCreate) {
  const required = ['customer_id', 'customer_name', 'subject'];
  for (const field of required) {
    const missing = body[field] === undefined || String(body[field]).trim() === '';
    if (isCreate && missing) return `${field} is required`;
    if (!isCreate && body[field] !== undefined && missing) return `${field} cannot be empty`;
  }
  if (body.customer_id !== undefined && !CUSTOMER_ID.test(String(body.customer_id).trim())) {
    return 'customer_id must look like CUST-0001';
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    return `priority must be one of: ${PRIORITIES.join(', ')}`;
  }
  const assignee = emptyToNull(body.assigned_to);
  if (assignee && !EMPLOYEE_ID.test(assignee)) {
    return 'assigned_to must be an employee ID like EMP-0005';
  }
  return null;
}

// GET /api/tickets?status=&priority=&customer_id=  -> list, newest first
router.get('/tickets', async (req, res, next) => {
  try {
    const { status, priority, customer_id } = req.query;
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });
    }

    // Build the WHERE clause from whichever filters were given
    const conditions = [];
    const values = [];
    if (status) { values.push(status); conditions.push(`status = $${values.length}`); }
    if (priority) { values.push(priority); conditions.push(`priority = $${values.length}`); }
    if (customer_id) { values.push(customer_id); conditions.push(`customer_id = $${values.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT * FROM tickets ${where} ORDER BY created_at DESC, id DESC`,
      values
    );
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// (CRM2-A3 will add GET /api/tickets/overdue here, before the :id route)

// GET /api/tickets/:id  -> one ticket
router.get('/tickets/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Ticket ${req.params.id} not found` });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets  -> create a ticket (status always starts as 'open')
router.post('/tickets', async (req, res, next) => {
  try {
    const body = req.body || {};
    const problem = validateTicket(body, true);
    if (problem) return res.status(400).json({ error: problem });

    // SLA: CRM2-A3 will set due_at here from the priority (high 4h, medium 24h, low 72h)
    const result = await pool.query(
      `INSERT INTO tickets (customer_id, customer_name, serial_number, subject, description, priority, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        String(body.customer_id).trim(),
        String(body.customer_name).trim(),
        emptyToNull(body.serial_number),
        String(body.subject).trim(),
        emptyToNull(body.description),
        body.priority || 'medium',
        emptyToNull(body.assigned_to)
      ]
    );
    const ticket = result.rows[0];

    // Side effect: put "ticket created" on the customer's CRM-3 timeline.
    // If CRM-3 is down or the endpoint is missing, log it and still return 201.
    const event = {
      customer_id: ticket.customer_id,
      type: 'ticket',
      summary: `Ticket ${ticket.id}: ${ticket.subject}`,
      source_team: 'CRM-2'
    };
    try {
      await callService('crm3', '/api/interactions/from-event', { method: 'POST', body: event });
    } catch (err) {
      console.error(`[integration-error] CRM-3 timeline event failed (${err.message}). Payload:`, JSON.stringify(event));
    }

    res.status(201).json({ data: ticket });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:id  -> edit ticket details (status changes go through PATCH /status)
router.put('/tickets/:id', async (req, res, next) => {
  try {
    const body = req.body || {};
    if (body.status !== undefined) {
      return res.status(400).json({ error: 'Use PATCH /api/tickets/:id/status to change status' });
    }
    const problem = validateTicket(body, false);
    if (problem) return res.status(400).json({ error: problem });

    // Only update the fields that were sent
    const editable = ['customer_id', 'customer_name', 'serial_number', 'subject', 'description', 'priority', 'assigned_to'];
    const sets = [];
    const values = [];
    for (const field of editable) {
      if (body[field] !== undefined) {
        const optional = ['serial_number', 'description', 'assigned_to'].includes(field);
        values.push(optional ? emptyToNull(body[field]) : String(body[field]).trim());
        sets.push(`${field} = $${values.length}`);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: `Send at least one of: ${editable.join(', ')}` });
    }

    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Ticket ${req.params.id} not found` });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/status  body { status }
// resolved -> fills resolved_at; back to open/in_progress -> clears it; closed keeps it.
router.patch('/tickets/:id/status', async (req, res, next) => {
  try {
    const status = (req.body || {}).status;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE tickets
          SET status = $1,
              resolved_at = CASE
                WHEN $1 = 'resolved' THEN COALESCE(resolved_at, now())
                WHEN $1 IN ('open', 'in_progress') THEN NULL
                ELSE resolved_at
              END
        WHERE id = $2
        RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Ticket ${req.params.id} not found` });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
