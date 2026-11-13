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

// Load default mock campaigns from mocks/campaigns.json
function loadInitialCampaigns() {
  const mockPath = path.resolve(__dirname, '../mocks/campaigns.json');
  if (fs.existsSync(mockPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('[crm4] Error reading campaigns mock:', e.message);
    }
  }
  return [
    {
      id: 'CMP-0001',
      name: 'Diwali Festive Sale',
      objective: 'Drive festive season revenue with exclusive retail discounts',
      channel: 'email',
      status: 'sent',
      segment_id: 'SEG-0001',
      template_id: 'TPL-0002',
      scheduled_at: '2026-10-25T10:00:00.000Z',
      created_at: '2026-10-15T10:00:00.000Z'
    },
    {
      id: 'CMP-0002',
      name: 'Smart LED TV Launch',
      objective: 'Introduce new 4K UHD smart televisions to corporate accounts',
      channel: 'whatsapp',
      status: 'scheduled',
      segment_id: 'SEG-0002',
      template_id: 'TPL-0001',
      scheduled_at: '2026-11-20T11:00:00.000Z',
      created_at: '2026-11-01T09:00:00.000Z'
    },
    {
      id: 'CMP-0003',
      name: 'Warranty Care Reminder',
      objective: 'Post-purchase warranty extension offer with AMC plans',
      channel: 'sms',
      status: 'draft',
      segment_id: 'SEG-0003',
      template_id: 'TPL-0003',
      scheduled_at: '2026-12-01T10:00:00.000Z',
      created_at: '2026-11-05T14:30:00.000Z'
    },
    {
      id: 'CMP-0004',
      name: 'Corporate Fleet Upgrade',
      objective: 'B2B commercial display promotions for Delhi NCR clients',
      channel: 'email',
      status: 'sent',
      segment_id: 'SEG-0004',
      template_id: 'TPL-0002',
      scheduled_at: '2026-10-30T09:30:00.000Z',
      created_at: '2026-10-20T11:00:00.000Z'
    },
    {
      id: 'CMP-0005',
      name: 'Post-Purchase CSAT Survey',
      objective: 'Solicit product feedback and NPS ratings from recent buyers',
      channel: 'whatsapp',
      status: 'draft',
      segment_id: 'SEG-0001',
      template_id: 'TPL-0004',
      scheduled_at: '2026-12-10T12:00:00.000Z',
      created_at: '2026-11-10T16:00:00.000Z'
    }
  ];
}

// In-memory store used when database is offline or not provisioned
let inMemoryCampaigns = loadInitialCampaigns();
let nextSeq = 6;

// Validation constants
const VALID_CHANNELS = ['email', 'whatsapp', 'sms'];
const VALID_STATUSES = ['draft', 'scheduled', 'sent'];

// Protect all routes with authentication
router.use(requireAuth);

/**
 * Helper: Format campaign record for client response
 */
function formatCampaign(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    objective: row.objective || null,
    channel: row.channel,
    status: row.status,
    segment_id: row.segment_id,
    template_id: row.template_id,
    scheduled_at: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

/**
 * GET /campaigns
 * List all campaigns with optional channel, status, and segment_id filtering
 */
router.get('/campaigns', async (req, res) => {
  const { status, channel, segment_id } = req.query;

  if (pool) {
    try {
      const conditions = [];
      const values = [];

      if (status) {
        values.push(status.toLowerCase());
        conditions.push(`status = $${values.length}`);
      }
      if (channel) {
        values.push(channel.toLowerCase());
        conditions.push(`channel = $${values.length}`);
      }
      if (segment_id) {
        values.push(segment_id);
        conditions.push(`segment_id = $${values.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT * FROM campaigns ${whereClause} ORDER BY created_at DESC, id ASC`;
      const result = await pool.query(query, values);
      return res.json({ data: result.rows.map(formatCampaign) });
    } catch (err) {
      console.warn('[crm4] DB error fetching campaigns, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  let filtered = [...inMemoryCampaigns];
  if (status) {
    filtered = filtered.filter(c => c.status.toLowerCase() === status.toLowerCase());
  }
  if (channel) {
    filtered = filtered.filter(c => c.channel.toLowerCase() === channel.toLowerCase());
  }
  if (segment_id) {
    filtered = filtered.filter(c => c.segment_id === segment_id);
  }

  return res.json({ data: filtered.map(formatCampaign) });
});

/**
 * GET /campaigns/:id
 * Retrieve a single campaign by ID
 */
router.get('/campaigns/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Campaign with id '${id}' not found` });
      }
      return res.json({ data: formatCampaign(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error fetching campaign by id, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const found = inMemoryCampaigns.find(c => c.id === id);
  if (!found) {
    return res.status(404).json({ error: `Campaign with id '${id}' not found` });
  }
  return res.json({ data: formatCampaign(found) });
});

/**
 * POST /campaigns
 * Create a new campaign with auto-generated ID (CMP-xxxx)
 */
router.post('/campaigns', async (req, res) => {
  const { name, objective, channel, status, segment_id, template_id, scheduled_at } = req.body || {};

  // Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }
  if (!channel || !VALID_CHANNELS.includes(channel.toLowerCase())) {
    return res.status(400).json({
      error: `channel is required and must be one of: ${VALID_CHANNELS.join(', ')}`
    });
  }
  if (!segment_id || typeof segment_id !== 'string' || !segment_id.trim()) {
    return res.status(400).json({ error: 'segment_id is required' });
  }
  if (!template_id || typeof template_id !== 'string' || !template_id.trim()) {
    return res.status(400).json({ error: 'template_id is required' });
  }

  const normalizedStatus = status ? status.toLowerCase() : 'draft';
  if (!VALID_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      error: `status must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  const cleanName = name.trim();
  const cleanObjective = objective ? String(objective).trim() : null;
  const cleanChannel = channel.toLowerCase();
  const cleanSegment = segment_id.trim();
  const cleanTemplate = template_id.trim();
  const cleanScheduledAt = scheduled_at ? new Date(scheduled_at).toISOString() : null;

  if (pool) {
    try {
      const seqResult = await pool.query("SELECT 'CMP-' || LPAD(nextval('campaign_seq')::text, 4, '0') AS next_id");
      const nextId = seqResult.rows[0].next_id;

      const insertQuery = `
        INSERT INTO campaigns (id, name, objective, channel, status, segment_id, template_id, scheduled_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        nextId,
        cleanName,
        cleanObjective,
        cleanChannel,
        normalizedStatus,
        cleanSegment,
        cleanTemplate,
        cleanScheduledAt
      ];

      const result = await pool.query(insertQuery, values);
      return res.status(201).json({ data: formatCampaign(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error creating campaign, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const generatedId = `CMP-${String(nextSeq++).padStart(4, '0')}`;
  const newCampaign = {
    id: generatedId,
    name: cleanName,
    objective: cleanObjective,
    channel: cleanChannel,
    status: normalizedStatus,
    segment_id: cleanSegment,
    template_id: cleanTemplate,
    scheduled_at: cleanScheduledAt,
    created_at: new Date().toISOString()
  };

  inMemoryCampaigns.push(newCampaign);
  return res.status(201).json({ data: formatCampaign(newCampaign) });
});

/**
 * PUT /campaigns/:id
 * Full update of an existing campaign
 */
router.put('/campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const { name, objective, channel, status, segment_id, template_id, scheduled_at } = req.body || {};

  // Validate fields if provided
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  if (channel !== undefined && !VALID_CHANNELS.includes(channel.toLowerCase())) {
    return res.status(400).json({
      error: `channel must be one of: ${VALID_CHANNELS.join(', ')}`
    });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status.toLowerCase())) {
    return res.status(400).json({
      error: `status must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  if (pool) {
    try {
      const existing = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: `Campaign with id '${id}' not found` });
      }

      const updateQuery = `
        UPDATE campaigns
        SET name = COALESCE($2, name),
            objective = COALESCE($3, objective),
            channel = COALESCE($4, channel),
            status = COALESCE($5, status),
            segment_id = COALESCE($6, segment_id),
            template_id = COALESCE($7, template_id),
            scheduled_at = COALESCE($8, scheduled_at)
        WHERE id = $1
        RETURNING *
      `;
      const values = [
        id,
        name ? name.trim() : null,
        objective !== undefined ? objective : null,
        channel ? channel.toLowerCase() : null,
        status ? status.toLowerCase() : null,
        segment_id ? segment_id.trim() : null,
        template_id ? template_id.trim() : null,
        scheduled_at !== undefined ? (scheduled_at ? new Date(scheduled_at).toISOString() : null) : null
      ];

      const result = await pool.query(updateQuery, values);
      return res.json({ data: formatCampaign(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error updating campaign, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const index = inMemoryCampaigns.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Campaign with id '${id}' not found` });
  }

  const current = inMemoryCampaigns[index];
  const updated = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    objective: objective !== undefined ? (objective ? String(objective).trim() : null) : current.objective,
    channel: channel !== undefined ? channel.toLowerCase() : current.channel,
    status: status !== undefined ? status.toLowerCase() : current.status,
    segment_id: segment_id !== undefined ? segment_id.trim() : current.segment_id,
    template_id: template_id !== undefined ? template_id.trim() : current.template_id,
    scheduled_at: scheduled_at !== undefined ? (scheduled_at ? new Date(scheduled_at).toISOString() : null) : current.scheduled_at
  };

  inMemoryCampaigns[index] = updated;
  return res.json({ data: formatCampaign(updated) });
});

/**
 * PATCH /campaigns/:id/status
 * Specific endpoint to transition campaign status (draft -> scheduled -> sent)
 */
router.patch('/campaigns/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status.toLowerCase())) {
    return res.status(400).json({
      error: `status is required and must be one of: ${VALID_STATUSES.join(', ')}`
    });
  }

  const normalizedStatus = status.toLowerCase();

  if (pool) {
    try {
      const existing = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: `Campaign with id '${id}' not found` });
      }

      const updateQuery = `
        UPDATE campaigns
        SET status = $2
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [id, normalizedStatus]);
      return res.json({ data: formatCampaign(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error updating campaign status, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const index = inMemoryCampaigns.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Campaign with id '${id}' not found` });
  }

  inMemoryCampaigns[index] = {
    ...inMemoryCampaigns[index],
    status: normalizedStatus
  };

  return res.json({ data: formatCampaign(inMemoryCampaigns[index]) });
});

/**
 * DELETE /campaigns/:id
 * Remove a campaign
 */
router.delete('/campaigns/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const existing = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: `Campaign with id '${id}' not found` });
      }

      await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
      return res.json({
        data: {
          id,
          message: `Campaign '${id}' deleted successfully`
        }
      });
    } catch (err) {
      console.warn('[crm4] DB error deleting campaign, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const index = inMemoryCampaigns.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Campaign with id '${id}' not found` });
  }

  inMemoryCampaigns.splice(index, 1);
  return res.json({
    data: {
      id,
      message: `Campaign '${id}' deleted successfully`
    }
  });
});

module.exports = router;
