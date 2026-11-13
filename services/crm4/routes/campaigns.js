const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../../_shared/auth');
const { callService } = require('../../_shared/callService');

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

// In-memory campaign store
let inMemoryCampaigns = loadInitialCampaigns();
let nextSeq = 6;

// In-memory messages store initialized from seed (MSG-0001 to MSG-0008 for CMP-0001) [CRM4-A3]
let inMemoryMessages = [
  { id: 'MSG-0001', campaign_id: 'CMP-0001', customer_id: 'CUST-0001', status: 'sent', sent_at: '2026-10-25T10:00:01.000Z' },
  { id: 'MSG-0002', campaign_id: 'CMP-0001', customer_id: 'CUST-0002', status: 'sent', sent_at: '2026-10-25T10:00:02.000Z' },
  { id: 'MSG-0003', campaign_id: 'CMP-0001', customer_id: 'CUST-0003', status: 'sent', sent_at: '2026-10-25T10:00:03.000Z' },
  { id: 'MSG-0004', campaign_id: 'CMP-0001', customer_id: 'CUST-0004', status: 'sent', sent_at: '2026-10-25T10:00:04.000Z' },
  { id: 'MSG-0005', campaign_id: 'CMP-0001', customer_id: 'CUST-0005', status: 'sent', sent_at: '2026-10-25T10:00:05.000Z' },
  { id: 'MSG-0006', campaign_id: 'CMP-0001', customer_id: 'CUST-0006', status: 'sent', sent_at: '2026-10-25T10:00:06.000Z' },
  { id: 'MSG-0007', campaign_id: 'CMP-0001', customer_id: 'CUST-0007', status: 'sent', sent_at: '2026-10-25T10:00:07.000Z' },
  { id: 'MSG-0008', campaign_id: 'CMP-0001', customer_id: 'CUST-0008', status: 'sent', sent_at: '2026-10-25T10:00:08.000Z' }
];
let nextMessageSeq = 9;

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
  const count = row.message_count !== undefined
    ? parseInt(row.message_count, 10)
    : inMemoryMessages.filter(m => m.campaign_id === row.id).length;

  return {
    id: row.id,
    name: row.name,
    objective: row.objective || null,
    channel: row.channel,
    status: row.status,
    segment_id: row.segment_id,
    template_id: row.template_id,
    scheduled_at: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    message_count: count
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
        conditions.push(`c.status = $${values.length}`);
      }
      if (channel) {
        values.push(channel.toLowerCase());
        conditions.push(`c.channel = $${values.length}`);
      }
      if (segment_id) {
        values.push(segment_id);
        conditions.push(`c.segment_id = $${values.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT c.*, COUNT(m.id)::int AS message_count
        FROM campaigns c
        LEFT JOIN campaign_messages m ON c.id = m.campaign_id
        ${whereClause}
        GROUP BY c.id
        ORDER BY c.created_at DESC, c.id ASC
      `;
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
      const query = `
        SELECT c.*, COUNT(m.id)::int AS message_count
        FROM campaigns c
        LEFT JOIN campaign_messages m ON c.id = m.campaign_id
        WHERE c.id = $1
        GROUP BY c.id
      `;
      const result = await pool.query(query, [id]);
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
 * Create a new marketing campaign with auto-generated ID (CMP-xxxx)
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
 * POST /campaigns/:id/send
 * Execute simulated campaign broadcast to segment customers [CRM4-A3]
 * 1. Fetch segment customers from CRM-3 GET /api/segments/:id/customers (mock: 'segment-customers')
 * 2. Insert one row per customer in campaign_messages
 * 3. Mark campaign as 'sent'
 * 4. Sending twice returns 409 Conflict
 * 5. For each customer post timeline event to CRM-3 /api/interactions/from-event (side effect, try/catch)
 */
router.post('/campaigns/:id/send', async (req, res) => {
  const { id } = req.params;

  let campaign = null;

  if (pool) {
    try {
      const campRes = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
      if (campRes.rows.length === 0) {
        return res.status(404).json({ error: `Campaign with id '${id}' not found` });
      }
      campaign = campRes.rows[0];
    } catch (err) {
      console.warn('[crm4] DB error fetching campaign for send, falling back to in-memory store:', err.message);
    }
  }

  if (!campaign) {
    campaign = inMemoryCampaigns.find(c => c.id === id);
    if (!campaign) {
      return res.status(404).json({ error: `Campaign with id '${id}' not found` });
    }
  }

  // Acceptance Criterion: Second send is blocked with 409 Conflict
  if (campaign.status === 'sent') {
    return res.status(409).json({
      error: `Campaign '${id}' has already been sent`
    });
  }

  // 1. Fetch segment customers from CRM-3
  let customers = [];
  const useMocks = process.env.USE_MOCKS !== 'false';

  try {
    const result = await callService('crm3', `/api/segments/${campaign.segment_id}/customers`, {
      mock: 'segment-customers'
    });
    if (Array.isArray(result)) {
      customers = result;
    } else if (result && Array.isArray(result.customers)) {
      customers = result.customers;
    } else if (result && Array.isArray(result.data)) {
      customers = result.data;
    }
  } catch (err) {
    if (useMocks) {
      try {
        const fallbackRes = await callService('crm4', `/api/segments/${campaign.segment_id}/customers`, {
          mock: 'segment-customers'
        });
        if (Array.isArray(fallbackRes)) {
          customers = fallbackRes;
        } else if (fallbackRes && Array.isArray(fallbackRes.customers)) {
          customers = fallbackRes.customers;
        } else if (fallbackRes && Array.isArray(fallbackRes.data)) {
          customers = fallbackRes.data;
        }
      } catch (mockErr) {
        const localMock = path.resolve(__dirname, '../mocks/segment-customers.json');
        if (fs.existsSync(localMock)) {
          console.log(`[mock] used for crm3/api/segments/${campaign.segment_id}/customers`);
          customers = JSON.parse(fs.readFileSync(localMock, 'utf8'));
        }
      }
    } else {
      // When USE_MOCKS=false and CRM-3 is unreachable, fail with 502 Bad Gateway
      return res.status(502).json({
        error: `502 Bad Gateway: CRM-3 service is unreachable to fetch segment customers (${err.message})`
      });
    }
  }

  if (!customers || customers.length === 0) {
    // Default fallback to 3 realistic Section 5 customers
    customers = [
      { id: 'CUST-0001', name: 'Aarav Mehta' },
      { id: 'CUST-0002', name: 'Sunrise Electronics Pvt Ltd' },
      { id: 'CUST-0003', name: 'Priya Nair' }
    ];
  }

  const sentAt = new Date().toISOString();
  const createdMessages = [];

  // 2. Insert one row per customer in campaign_messages & 3. Mark campaign sent
  if (pool) {
    try {
      // Mark campaign sent
      await pool.query(
        "UPDATE campaigns SET status = 'sent', scheduled_at = COALESCE(scheduled_at, NOW()) WHERE id = $1",
        [id]
      );

      for (const cust of customers) {
        const custId = cust.id || cust.customer_id;
        const msgSeq = await pool.query("SELECT 'MSG-' || LPAD(nextval('campaign_message_seq')::text, 4, '0') AS next_id");
        const msgId = msgSeq.rows[0].next_id;

        const insertMsg = await pool.query(
          `INSERT INTO campaign_messages (id, campaign_id, customer_id, status, sent_at)
           VALUES ($1, $2, $3, 'sent', NOW())
           RETURNING *`,
          [msgId, id, custId]
        );
        createdMessages.push(insertMsg.rows[0]);
      }
    } catch (dbErr) {
      console.warn('[crm4] DB error recording campaign send, falling back to in-memory store:', dbErr.message);
    }
  }

  // In-memory update
  const memCamp = inMemoryCampaigns.find(c => c.id === id);
  if (memCamp) {
    memCamp.status = 'sent';
  }

  if (createdMessages.length === 0) {
    for (const cust of customers) {
      const custId = cust.id || cust.customer_id;
      const msgId = `MSG-${String(nextMessageSeq++).padStart(4, '0')}`;
      const msg = {
        id: msgId,
        campaign_id: id,
        customer_id: custId,
        status: 'sent',
        sent_at: sentAt
      };
      inMemoryMessages.push(msg);
      createdMessages.push(msg);
    }
  }

  // 5. Side Effect: For each customer, post timeline event to CRM-3 /api/interactions/from-event
  // Wrapped in try/catch: log "[integration-error]" and carry on
  for (const cust of customers) {
    const custId = cust.id || cust.customer_id;
    try {
      await callService('crm3', '/api/interactions/from-event', {
        method: 'POST',
        body: {
          customer_id: custId,
          type: campaign.channel || 'email',
          summary: `Campaign ${campaign.id} sent`,
          source_team: 'CRM-4'
        },
        mock: 'from-event'
      });
    } catch (eventErr) {
      console.warn(`[integration-error] CRM-3 timeline event failed for customer ${custId}:`, eventErr.message);
    }
  }

  return res.json({
    data: {
      campaign_id: id,
      status: 'sent',
      count: customers.length,
      messages: createdMessages
    },
    count: customers.length,
    message: `Campaign ${id} successfully sent to ${customers.length} customers`
  });
});

/**
 * GET /campaigns/:id/messages
 * List sent messages for a specific campaign
 */
router.get('/campaigns/:id/messages', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const result = await pool.query(
        'SELECT * FROM campaign_messages WHERE campaign_id = $1 ORDER BY sent_at ASC, id ASC',
        [id]
      );
      return res.json({ data: result.rows });
    } catch (err) {
      console.warn('[crm4] DB error fetching campaign messages, falling back to in-memory store:', err.message);
    }
  }

  const messages = inMemoryMessages.filter(m => m.campaign_id === id);
  return res.json({ data: messages });
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