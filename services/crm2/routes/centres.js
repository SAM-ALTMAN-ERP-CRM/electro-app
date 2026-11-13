// [CRM2-D1] Service centres and assignment API
// Handles CRUD for repair/service centres and ticket-to-centre assignments.
const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const router = express.Router();
const pool = makePool('crm2_db');

// Protect both centres and assignments routes with authentication
router.use('/centres', requireAuth);
router.use('/assignments', requireAuth);

// Validation helper for service centre input
function validateCentre(body, isCreate) {
  const { name, city, phone, capacity, active } = body;

  if (isCreate) {
    if (!name || String(name).trim() === '') return 'name is required';
    if (!city || String(city).trim() === '') return 'city is required';
  } else {
    if (name !== undefined && String(name).trim() === '') return 'name cannot be empty';
    if (city !== undefined && String(city).trim() === '') return 'city cannot be empty';
  }

  if (capacity !== undefined && capacity !== null) {
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 0) {
      return 'capacity must be a non-negative integer';
    }
  }

  if (active !== undefined && typeof active !== 'boolean') {
    return 'active must be a boolean';
  }

  return null;
}

// ==========================================
// Service Centres Endpoints (/api/centres)
// ==========================================

// GET /api/centres - list all service centres (optional ?active=true/false)
router.get('/centres', async (req, res) => {
  try {
    const { active } = req.query;
    let query = 'SELECT id, name, city, phone, capacity, active FROM service_centres';
    const params = [];

    if (active !== undefined) {
      params.push(active === 'true');
      query += ` WHERE active = $1`;
    }

    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service centres: ' + err.message });
  }
});

// GET /api/centres/:id - get single centre by ID
router.get('/centres/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, city, phone, capacity, active FROM service_centres WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Service centre ${id} not found` });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service centre: ' + err.message });
  }
});

// POST /api/centres - create a new service centre
router.post('/centres', async (req, res) => {
  try {
    const validationError = validateCentre(req.body, true);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { name, city, phone, capacity, active } = req.body;
    const result = await pool.query(
      `INSERT INTO service_centres (name, city, phone, capacity, active)
       VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, true))
       RETURNING id, name, city, phone, capacity, active`,
      [
        String(name).trim(),
        String(city).trim(),
        phone ? String(phone).trim() : null,
        capacity !== undefined && capacity !== null ? Number(capacity) : null,
        active !== undefined ? Boolean(active) : null
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service centre: ' + err.message });
  }
});

// PUT /api/centres/:id - update a service centre
router.put('/centres/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validationError = validateCentre(req.body, false);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // Check if centre exists
    const existing = await pool.query('SELECT * FROM service_centres WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: `Service centre ${id} not found` });
    }

    const current = existing.rows[0];
    const name = req.body.name !== undefined ? String(req.body.name).trim() : current.name;
    const city = req.body.city !== undefined ? String(req.body.city).trim() : current.city;
    const phone = req.body.phone !== undefined ? (req.body.phone ? String(req.body.phone).trim() : null) : current.phone;
    const capacity = req.body.capacity !== undefined ? Number(req.body.capacity) : current.capacity;
    const active = req.body.active !== undefined ? Boolean(req.body.active) : current.active;

    const result = await pool.query(
      `UPDATE service_centres
       SET name = $1, city = $2, phone = $3, capacity = $4, active = $5
       WHERE id = $6
       RETURNING id, name, city, phone, capacity, active`,
      [name, city, phone, capacity, active, id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service centre: ' + err.message });
  }
});

// DELETE /api/centres/:id - soft delete or delete service centre
router.delete('/centres/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE service_centres
       SET active = false
       WHERE id = $1
       RETURNING id, name, city, phone, capacity, active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Service centre ${id} not found` });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate service centre: ' + err.message });
  }
});

// ==========================================
// Ticket Assignments Endpoints (/api/assignments)
// ==========================================

// GET /api/assignments - get assignments (optionally filter by ?ticket_id=)
router.get('/assignments', async (req, res) => {
  try {
    const { ticket_id } = req.query;
    let query = `
      SELECT a.id, a.ticket_id, a.centre_id, a.assigned_at,
             c.name AS centre_name, c.city AS centre_city
      FROM ticket_assignments a
      JOIN service_centres c ON a.centre_id = c.id
    `;
    const params = [];

    if (ticket_id) {
      params.push(String(ticket_id).trim());
      query += ' WHERE a.ticket_id = $1';
    }

    query += ' ORDER BY a.assigned_at DESC';
    const result = await pool.query(query, params);

    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assignments: ' + err.message });
  }
});

// POST /api/assignments - assign a ticket to a service centre
// Assigning a ticket twice replaces the earlier assignment (ON CONFLICT (ticket_id) DO UPDATE)
router.post('/assignments', async (req, res) => {
  try {
    const { ticket_id, centre_id } = req.body;

    if (!ticket_id || String(ticket_id).trim() === '') {
      return res.status(400).json({ error: 'ticket_id is required' });
    }
    if (!centre_id || String(centre_id).trim() === '') {
      return res.status(400).json({ error: 'centre_id is required' });
    }

    const cleanTicketId = String(ticket_id).trim();
    const cleanCentreId = String(centre_id).trim();

    // Verify service centre exists
    const centreCheck = await pool.query(
      'SELECT id, name, active FROM service_centres WHERE id = $1',
      [cleanCentreId]
    );

    if (centreCheck.rows.length === 0) {
      return res.status(404).json({ error: `Service centre ${cleanCentreId} not found` });
    }

    // Insert or update on conflict (replacing previous assignment for the same ticket)
    const result = await pool.query(
      `INSERT INTO ticket_assignments (ticket_id, centre_id, assigned_at)
       VALUES ($1, $2, now())
       ON CONFLICT (ticket_id)
       DO UPDATE SET centre_id = EXCLUDED.centre_id, assigned_at = EXCLUDED.assigned_at
       RETURNING id, ticket_id, centre_id, assigned_at`,
      [cleanTicketId, cleanCentreId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign ticket: ' + err.message });
  }
});

module.exports = router;
