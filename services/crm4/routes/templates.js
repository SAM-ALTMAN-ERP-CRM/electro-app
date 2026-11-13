const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../../_shared/auth');

// Connect to crm4_db PostgreSQL database pool if driver and DB are available
let pool = null;
try {
  const { makePool } = require('../../_shared/db');
  pool = makePool('crm4_db');
} catch (err) {
  // Driver (pg) or DB unavailable; router falls back smoothly to in-memory store
  pool = null;
}

// Load default mock templates from mocks/templates.json
function loadInitialTemplates() {
  const mockPath = path.resolve(__dirname, '../mocks/templates.json');
  if (fs.existsSync(mockPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('[crm4] Error reading templates mock:', e.message);
    }
  }
  return [
    {
      id: 'TPL-0001',
      name: 'Product Launch Announcement',
      channel: 'whatsapp',
      subject: null,
      body: 'Hi {{name}}! We are thrilled to introduce our newest {{product}} with an exclusive launch offer: {{offer}}. Order today at Electro App!',
      created_at: '2026-10-10T10:00:00.000Z'
    },
    {
      id: 'TPL-0002',
      name: 'Festive Special Offer',
      channel: 'email',
      subject: 'Exclusive {{offer}} on {{product}} for {{name}}',
      body: 'Dear {{name}},\n\nCelebrate this festive season with Electro App! We are pleased to offer you {{offer}} on our best-selling {{product}}.\n\nWarm regards,\nElectro Sales Team',
      created_at: '2026-10-15T11:30:00.000Z'
    },
    {
      id: 'TPL-0003',
      name: 'Warranty Care Reminder',
      channel: 'sms',
      subject: null,
      body: 'Dear {{name}}, protect your {{product}} today! Avail our exclusive {{offer}}. Reply YES or call 1800-ELECTRO.',
      created_at: '2026-11-01T09:15:00.000Z'
    },
    {
      id: 'TPL-0004',
      name: 'Customer Feedback Request',
      channel: 'whatsapp',
      subject: null,
      body: 'Hello {{name}}! Thank you for choosing {{product}}. Please share 1 minute of feedback to claim {{offer}} on your next order.',
      created_at: '2026-11-05T14:00:00.000Z'
    }
  ];
}

// In-memory store used when database is offline or not provisioned
let inMemoryTemplates = loadInitialTemplates();
let nextSeq = 5;

// Validation constants
const VALID_CHANNELS = ['email', 'whatsapp', 'sms'];

// Protect all routes with authentication
router.use(requireAuth);

/**
 * Helper: Format template record for client response
 */
function formatTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    channel: row.channel,
    subject: row.subject || null,
    body: row.body,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

/**
 * GET /templates
 * List all templates with optional channel filtering
 */
router.get('/templates', async (req, res) => {
  const { channel } = req.query;

  if (pool) {
    try {
      const conditions = [];
      const values = [];

      if (channel) {
        values.push(channel.toLowerCase());
        conditions.push(`channel = $${values.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT * FROM templates ${whereClause} ORDER BY created_at ASC, id ASC`;
      const result = await pool.query(query, values);
      return res.json({ data: result.rows.map(formatTemplate) });
    } catch (err) {
      console.warn('[crm4] DB error fetching templates, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  let filtered = [...inMemoryTemplates];
  if (channel) {
    filtered = filtered.filter(t => t.channel.toLowerCase() === channel.toLowerCase());
  }

  return res.json({ data: filtered.map(formatTemplate) });
});

/**
 * GET /templates/:id
 * Retrieve a single template by ID
 */
router.get('/templates/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Template with id '${id}' not found` });
      }
      return res.json({ data: formatTemplate(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error fetching template by id, falling back to in-memory store:', err.message);
    }
  }

  const found = inMemoryTemplates.find(t => t.id === id);
  if (!found) {
    return res.status(404).json({ error: `Template with id '${id}' not found` });
  }
  return res.json({ data: formatTemplate(found) });
});

/**
 * POST /templates
 * Create a new message template with auto-generated ID (TPL-xxxx)
 */
router.post('/templates', async (req, res) => {
  const { name, channel, subject, body } = req.body || {};

  // Input Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }
  if (!channel || !VALID_CHANNELS.includes(channel.toLowerCase())) {
    return res.status(400).json({
      error: `channel is required and must be one of: ${VALID_CHANNELS.join(', ')}`
    });
  }
  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body is required and must be a non-empty string' });
  }

  const cleanName = name.trim();
  const cleanChannel = channel.toLowerCase();
  const cleanSubject = subject && typeof subject === 'string' ? subject.trim() : null;
  const cleanBody = body.trim();

  if (pool) {
    try {
      const seqResult = await pool.query("SELECT 'TPL-' || LPAD(nextval('template_seq')::text, 4, '0') AS next_id");
      const nextId = seqResult.rows[0].next_id;

      const insertQuery = `
        INSERT INTO templates (id, name, channel, subject, body)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [nextId, cleanName, cleanChannel, cleanSubject, cleanBody];

      const result = await pool.query(insertQuery, values);
      return res.status(201).json({ data: formatTemplate(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error creating template, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const generatedId = `TPL-${String(nextSeq++).padStart(4, '0')}`;
  const newTemplate = {
    id: generatedId,
    name: cleanName,
    channel: cleanChannel,
    subject: cleanSubject,
    body: cleanBody,
    created_at: new Date().toISOString()
  };

  inMemoryTemplates.push(newTemplate);
  return res.status(201).json({ data: formatTemplate(newTemplate) });
});

/**
 * PUT /templates/:id
 * Full update of an existing message template
 */
router.put('/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name, channel, subject, body } = req.body || {};

  // Validate fields if provided
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (channel !== undefined && !VALID_CHANNELS.includes(channel.toLowerCase())) {
    return res.status(400).json({
      error: `channel must be one of: ${VALID_CHANNELS.join(', ')}`
    });
  }
  if (body !== undefined && (typeof body !== 'string' || !body.trim())) {
    return res.status(400).json({ error: 'body must be a non-empty string' });
  }

  if (pool) {
    try {
      const existing = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: `Template with id '${id}' not found` });
      }

      const updateQuery = `
        UPDATE templates
        SET name = COALESCE($2, name),
            channel = COALESCE($3, channel),
            subject = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE subject END,
            body = COALESCE($5, body)
        WHERE id = $1
        RETURNING *
      `;
      const values = [
        id,
        name ? name.trim() : null,
        channel ? channel.toLowerCase() : null,
        subject !== undefined ? (subject ? subject.trim() : null) : null,
        body ? body.trim() : null
      ];

      const result = await pool.query(updateQuery, values);
      return res.json({ data: formatTemplate(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error updating template, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const index = inMemoryTemplates.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Template with id '${id}' not found` });
  }

  const current = inMemoryTemplates[index];
  const updated = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    channel: channel !== undefined ? channel.toLowerCase() : current.channel,
    subject: subject !== undefined ? (subject ? subject.trim() : null) : current.subject,
    body: body !== undefined ? body.trim() : current.body
  };

  inMemoryTemplates[index] = updated;
  return res.json({ data: formatTemplate(updated) });
});

/**
 * DELETE /templates/:id
 * Remove a template
 */
router.delete('/templates/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const existing = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: `Template with id '${id}' not found` });
      }

      await pool.query('DELETE FROM templates WHERE id = $1', [id]);
      return res.json({
        data: {
          id,
          message: `Template '${id}' deleted successfully`
        }
      });
    } catch (err) {
      console.warn('[crm4] DB error deleting template, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const index = inMemoryTemplates.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Template with id '${id}' not found` });
  }

  inMemoryTemplates.splice(index, 1);
  return res.json({
    data: {
      id,
      message: `Template '${id}' deleted successfully`
    }
  });
});

module.exports = router;
