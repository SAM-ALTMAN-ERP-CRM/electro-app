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

// Load default mock audiences from mocks/audiences.json
function loadInitialAudiences() {
  const mockPath = path.resolve(__dirname, '../mocks/audiences.json');
  if (fs.existsSync(mockPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('[crm4] Error reading audiences mock:', e.message);
    }
  }
  return [
    {
      id: 'AUD-0001',
      name: 'Festive Shoppers 2026',
      description: 'High-intent retail buyers for seasonal festive electronics promotions',
      created_at: '2026-10-15T10:00:00.000Z'
    },
    {
      id: 'AUD-0002',
      name: 'Corporate Fleet Accounts',
      description: 'B2B commercial accounts evaluated for commercial monitors and hardware',
      created_at: '2026-10-20T11:00:00.000Z'
    },
    {
      id: 'AUD-0003',
      name: 'Warranty Care Leads',
      description: 'Home appliance buyers nearing warranty expiration eligible for AMC plans',
      created_at: '2026-11-01T09:00:00.000Z'
    }
  ];
}

// Load default mock audience members from mocks/audience-members.json
function loadInitialMembers() {
  const mockPath = path.resolve(__dirname, '../mocks/audience-members.json');
  if (fs.existsSync(mockPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('[crm4] Error reading audience members mock:', e.message);
    }
  }
  return [
    {
      id: 'MEM-0001',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0001',
      name: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      phone: '9820112345',
      opted_out: false,
      created_at: '2026-10-15T10:05:00.000Z'
    },
    {
      id: 'MEM-0002',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0002',
      name: 'Sunrise Electronics Pvt Ltd',
      email: 'purchase@sunrise.com',
      phone: '9820223456',
      opted_out: false,
      created_at: '2026-10-15T10:05:00.000Z'
    },
    {
      id: 'MEM-0003',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0003',
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      phone: '9847134567',
      opted_out: true,
      created_at: '2026-10-15T10:05:00.000Z'
    },
    {
      id: 'MEM-0004',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0004',
      name: 'BrightHome Retail LLP',
      email: 'contact@brighthome.com',
      phone: '9850145678',
      opted_out: false,
      created_at: '2026-10-15T10:05:00.000Z'
    },
    {
      id: 'MEM-0005',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0005',
      name: 'Kiran Patel',
      email: 'kiran.patel@example.com',
      phone: '9879156789',
      opted_out: false,
      created_at: '2026-10-15T10:05:00.000Z'
    },
    {
      id: 'MEM-0006',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0006',
      name: 'Metro Offices Ltd',
      email: 'admin@metrooffices.com',
      phone: '9811167890',
      opted_out: false,
      created_at: '2026-10-15T10:05:00.000Z'
    },
    {
      id: 'MEM-0007',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0007',
      name: 'Sneha Iyer',
      email: 'sneha.iyer@example.com',
      phone: '9840178901',
      opted_out: false,
      created_at: '2026-10-15T10:05:00.000Z'
    },
    {
      id: 'MEM-0008',
      audience_id: 'AUD-0001',
      customer_id: 'CUST-0008',
      name: 'Gadget Hub',
      email: 'sales@gadgethub.com',
      phone: '9845189012',
      opted_out: false,
      created_at: '2026-10-15T10:05:00.000Z'
    }
  ];
}

// In-memory stores used when database is offline or not provisioned
let inMemoryAudiences = loadInitialAudiences();
let inMemoryMembers = loadInitialMembers();
let nextAudienceSeq = 4;
let nextMemberSeq = 9;

// Protect all routes with authentication
router.use(requireAuth);

/**
 * Helper: Compute member count and reachable count for an audience
 */
function getAudienceCounts(audienceId) {
  const members = inMemoryMembers.filter(m => m.audience_id === audienceId);
  const member_count = members.length;
  const reachable_count = members.filter(m => !m.opted_out).length;
  return { member_count, reachable_count };
}

/**
 * Helper: Format audience record for response
 */
function formatAudience(row, counts) {
  if (!row) return null;
  const member_count = counts ? counts.member_count : (parseInt(row.member_count, 10) || 0);
  const reachable_count = counts ? counts.reachable_count : (parseInt(row.reachable_count, 10) || 0);
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    member_count,
    reachable_count,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

/**
 * Helper: Format audience member record for response
 */
function formatMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    audience_id: row.audience_id,
    customer_id: row.customer_id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    opted_out: Boolean(row.opted_out),
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

// ==========================================
// 1. AUDIENCES CRUD ENDPOINTS
// ==========================================

/**
 * GET /audiences
 * List all audiences with member and reachable counts
 */
router.get('/audiences', async (req, res) => {
  if (pool) {
    try {
      const query = `
        SELECT a.id, a.name, a.description, a.created_at,
               COUNT(m.id)::int AS member_count,
               COUNT(CASE WHEN m.opted_out = false THEN 1 END)::int AS reachable_count
        FROM audiences a
        LEFT JOIN audience_members m ON a.id = m.audience_id
        GROUP BY a.id, a.name, a.description, a.created_at
        ORDER BY a.created_at ASC, a.id ASC
      `;
      const result = await pool.query(query);
      return res.json({ data: result.rows.map(row => formatAudience(row)) });
    } catch (err) {
      console.warn('[crm4] DB error fetching audiences, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const data = inMemoryAudiences.map(aud => {
    const counts = getAudienceCounts(aud.id);
    return formatAudience(aud, counts);
  });
  return res.json({ data });
});

/**
 * GET /audiences/:id
 * Retrieve single audience details
 */
router.get('/audiences/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const query = `
        SELECT a.id, a.name, a.description, a.created_at,
               COUNT(m.id)::int AS member_count,
               COUNT(CASE WHEN m.opted_out = false THEN 1 END)::int AS reachable_count
        FROM audiences a
        LEFT JOIN audience_members m ON a.id = m.audience_id
        WHERE a.id = $1
        GROUP BY a.id, a.name, a.description, a.created_at
      `;
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Audience with id '${id}' not found` });
      }
      return res.json({ data: formatAudience(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error fetching audience by id, falling back to in-memory store:', err.message);
    }
  }

  const found = inMemoryAudiences.find(a => a.id === id);
  if (!found) {
    return res.status(404).json({ error: `Audience with id '${id}' not found` });
  }

  const counts = getAudienceCounts(found.id);
  return res.json({ data: formatAudience(found, counts) });
});

/**
 * POST /audiences
 * Create a new audience with auto-generated ID (AUD-xxxx)
 */
router.post('/audiences', async (req, res) => {
  const { name, description, id: customId } = req.body || {};

  // Input Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Audience name is required' });
  }

  if (pool) {
    try {
      let assignedId = customId;
      if (!assignedId) {
        const seqResult = await pool.query("SELECT nextval('audience_seq') AS seq");
        const seqNum = seqResult.rows[0].seq;
        assignedId = `AUD-${String(seqNum).padStart(4, '0')}`;
      }

      const insertQuery = `
        INSERT INTO audiences (id, name, description, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        assignedId,
        name.trim(),
        description ? description.trim() : null
      ]);

      const created = formatAudience(result.rows[0], { member_count: 0, reachable_count: 0 });
      return res.status(201).json({ data: created });
    } catch (err) {
      console.warn('[crm4] DB error creating audience, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  let assignedId = customId;
  if (!assignedId) {
    assignedId = `AUD-${String(nextAudienceSeq++).padStart(4, '0')}`;
  }

  const newAudience = {
    id: assignedId,
    name: name.trim(),
    description: description ? description.trim() : '',
    created_at: new Date().toISOString()
  };

  inMemoryAudiences.push(newAudience);
  return res.status(201).json({
    data: formatAudience(newAudience, { member_count: 0, reachable_count: 0 })
  });
});

/**
 * PUT /audiences/:id
 * Update an existing audience's name or description
 */
router.put('/audiences/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body || {};

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ error: 'Audience name cannot be empty' });
  }

  if (pool) {
    try {
      const updateQuery = `
        UPDATE audiences
        SET name = COALESCE($1, name),
            description = COALESCE($2, description)
        WHERE id = $3
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        name !== undefined ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Audience with id '${id}' not found` });
      }

      // Fetch member counts
      const countRes = await pool.query(`
        SELECT COUNT(id)::int AS member_count,
               COUNT(CASE WHEN opted_out = false THEN 1 END)::int AS reachable_count
        FROM audience_members WHERE audience_id = $1
      `, [id]);

      const counts = countRes.rows[0] || { member_count: 0, reachable_count: 0 };
      return res.json({ data: formatAudience(result.rows[0], counts) });
    } catch (err) {
      console.warn('[crm4] DB error updating audience, falling back to in-memory store:', err.message);
    }
  }

  const existing = inMemoryAudiences.find(a => a.id === id);
  if (!existing) {
    return res.status(404).json({ error: `Audience with id '${id}' not found` });
  }

  if (name !== undefined) existing.name = name.trim();
  if (description !== undefined) existing.description = description.trim();

  const counts = getAudienceCounts(id);
  return res.json({ data: formatAudience(existing, counts) });
});

/**
 * DELETE /audiences/:id
 * Delete an audience and cascade delete its members
 */
router.delete('/audiences/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const result = await pool.query('DELETE FROM audiences WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Audience with id '${id}' not found` });
      }
      return res.json({
        data: { message: `Audience '${id}' and its members deleted successfully`, id }
      });
    } catch (err) {
      console.warn('[crm4] DB error deleting audience, falling back to in-memory store:', err.message);
    }
  }

  const index = inMemoryAudiences.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: `Audience with id '${id}' not found` });
  }

  inMemoryAudiences.splice(index, 1);
  inMemoryMembers = inMemoryMembers.filter(m => m.audience_id !== id);

  return res.json({
    data: { message: `Audience '${id}' and its members deleted successfully`, id }
  });
});

// ==========================================
// 2. AUDIENCE MEMBERS ENDPOINTS
// ==========================================

/**
 * GET /audiences/:id/members
 * List all members belonging to a target audience
 */
router.get('/audiences/:id/members', async (req, res) => {
  const { id } = req.params;
  const { opted_out } = req.query;

  if (pool) {
    try {
      // Verify audience exists
      const audCheck = await pool.query('SELECT id FROM audiences WHERE id = $1', [id]);
      if (audCheck.rows.length === 0) {
        return res.status(404).json({ error: `Audience with id '${id}' not found` });
      }

      const conditions = ['audience_id = $1'];
      const values = [id];

      if (opted_out !== undefined) {
        values.push(opted_out === 'true');
        conditions.push(`opted_out = $${values.length}`);
      }

      const query = `
        SELECT * FROM audience_members
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at ASC, id ASC
      `;
      const result = await pool.query(query, values);
      return res.json({ data: result.rows.map(formatMember) });
    } catch (err) {
      console.warn('[crm4] DB error fetching audience members, falling back to in-memory store:', err.message);
    }
  }

  const audExists = inMemoryAudiences.some(a => a.id === id);
  if (!audExists) {
    return res.status(404).json({ error: `Audience with id '${id}' not found` });
  }

  let members = inMemoryMembers.filter(m => m.audience_id === id);
  if (opted_out !== undefined) {
    const isOptedOut = opted_out === 'true';
    members = members.filter(m => Boolean(m.opted_out) === isOptedOut);
  }

  return res.json({ data: members.map(formatMember) });
});

/**
 * POST /audiences/:id/members
 * Add a member to a target audience
 */
router.post('/audiences/:id/members', async (req, res) => {
  const { id } = req.params;
  const { customer_id, name, email, phone, opted_out, id: customMemberId } = req.body || {};

  // Input Validation
  if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
    return res.status(400).json({ error: 'Customer ID (e.g. CUST-0001) is required' });
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Member name is required' });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Member email is required' });
  }

  const custId = customer_id.trim();
  const memberName = name.trim();
  const memberEmail = email.trim();
  const memberPhone = phone ? String(phone).trim() : null;
  const isOptedOut = Boolean(opted_out);

  if (pool) {
    try {
      // Verify audience exists
      const audCheck = await pool.query('SELECT id FROM audiences WHERE id = $1', [id]);
      if (audCheck.rows.length === 0) {
        return res.status(404).json({ error: `Audience with id '${id}' not found` });
      }

      // Check unique constraint (audience_id, customer_id)
      const dupCheck = await pool.query(
        'SELECT id FROM audience_members WHERE audience_id = $1 AND customer_id = $2',
        [id, custId]
      );
      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          error: `Customer '${custId}' is already a member of audience '${id}'`
        });
      }

      let assignedMemberId = customMemberId;
      if (!assignedMemberId) {
        const seqResult = await pool.query("SELECT nextval('audience_member_seq') AS seq");
        assignedMemberId = `MEM-${String(seqResult.rows[0].seq).padStart(4, '0')}`;
      }

      const insertQuery = `
        INSERT INTO audience_members (id, audience_id, customer_id, name, email, phone, opted_out, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        assignedMemberId,
        id,
        custId,
        memberName,
        memberEmail,
        memberPhone,
        isOptedOut
      ]);

      return res.status(201).json({ data: formatMember(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error creating audience member, falling back to in-memory store:', err.message);
    }
  }

  const audExists = inMemoryAudiences.some(a => a.id === id);
  if (!audExists) {
    return res.status(404).json({ error: `Audience with id '${id}' not found` });
  }

  // Duplicate check
  const duplicate = inMemoryMembers.some(m => m.audience_id === id && m.customer_id === custId);
  if (duplicate) {
    return res.status(409).json({
      error: `Customer '${custId}' is already a member of audience '${id}'`
    });
  }

  let assignedMemberId = customMemberId;
  if (!assignedMemberId) {
    assignedMemberId = `MEM-${String(nextMemberSeq++).padStart(4, '0')}`;
  }

  const newMember = {
    id: assignedMemberId,
    audience_id: id,
    customer_id: custId,
    name: memberName,
    email: memberEmail,
    phone: memberPhone,
    opted_out: isOptedOut,
    created_at: new Date().toISOString()
  };

  inMemoryMembers.push(newMember);
  return res.status(201).json({ data: formatMember(newMember) });
});

/**
 * PATCH /audiences/:id/members/:member_id
 * Update member preferences (e.g. toggle opted_out)
 */
router.patch('/audiences/:id/members/:member_id', async (req, res) => {
  const { id, member_id } = req.params;
  const { opted_out, name, email, phone } = req.body || {};

  if (pool) {
    try {
      const updateQuery = `
        UPDATE audience_members
        SET opted_out = COALESCE($1, opted_out),
            name = COALESCE($2, name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone)
        WHERE audience_id = $5 AND (id = $6 OR customer_id = $6)
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        opted_out !== undefined ? Boolean(opted_out) : null,
        name ? name.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        id,
        member_id
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: `Member '${member_id}' not found in audience '${id}'`
        });
      }

      return res.json({ data: formatMember(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error updating member preference, falling back to in-memory store:', err.message);
    }
  }

  const member = inMemoryMembers.find(
    m => m.audience_id === id && (m.id === member_id || m.customer_id === member_id)
  );

  if (!member) {
    return res.status(404).json({
      error: `Member '${member_id}' not found in audience '${id}'`
    });
  }

  if (opted_out !== undefined) member.opted_out = Boolean(opted_out);
  if (name !== undefined && name.trim()) member.name = name.trim();
  if (email !== undefined && email.trim()) member.email = email.trim();
  if (phone !== undefined) member.phone = phone.trim();

  return res.json({ data: formatMember(member) });
});

/**
 * DELETE /audiences/:id/members/:member_id
 * Remove a member from an audience by member ID or customer ID
 */
router.delete('/audiences/:id/members/:member_id', async (req, res) => {
  const { id, member_id } = req.params;

  if (pool) {
    try {
      const deleteQuery = `
        DELETE FROM audience_members
        WHERE audience_id = $1 AND (id = $2 OR customer_id = $2)
        RETURNING id
      `;
      const result = await pool.query(deleteQuery, [id, member_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: `Member '${member_id}' not found in audience '${id}'`
        });
      }
      return res.json({
        data: { message: `Member removed from audience '${id}'`, id: result.rows[0].id }
      });
    } catch (err) {
      console.warn('[crm4] DB error deleting member, falling back to in-memory store:', err.message);
    }
  }

  const index = inMemoryMembers.findIndex(
    m => m.audience_id === id && (m.id === member_id || m.customer_id === member_id)
  );

  if (index === -1) {
    return res.status(404).json({
      error: `Member '${member_id}' not found in audience '${id}'`
    });
  }

  const removed = inMemoryMembers.splice(index, 1)[0];
  return res.json({
    data: { message: `Member removed from audience '${id}'`, id: removed.id }
  });
});

/**
 * POST /audiences/:id/import-segment (CRM4-B3)
 * Bulk import customer segment contacts into an audience
 */
router.post('/audiences/:id/import-segment', async (req, res) => {
  const { id } = req.params;
  const { segment_id } = req.body || {};

  const audExists = inMemoryAudiences.some(a => a.id === id);
  if (!audExists) {
    return res.status(404).json({ error: `Audience with id '${id}' not found` });
  }

  // Realistic sample customer segment contacts adhering to Section 5 shared IDs
  const segmentContacts = [
    { customer_id: 'CUST-0001', name: 'Aarav Mehta', email: 'aarav.mehta@example.com', phone: '9820112345' },
    { customer_id: 'CUST-0002', name: 'Sunrise Electronics Pvt Ltd', email: 'purchase@sunrise.com', phone: '9820223456' },
    { customer_id: 'CUST-0003', name: 'Priya Nair', email: 'priya.nair@example.com', phone: '9847134567' },
    { customer_id: 'CUST-0004', name: 'BrightHome Retail LLP', email: 'contact@brighthome.com', phone: '9850145678' },
    { customer_id: 'CUST-0005', name: 'Kiran Patel', email: 'kiran.patel@example.com', phone: '9879156789' },
    { customer_id: 'CUST-0006', name: 'Metro Offices Ltd', email: 'admin@metrooffices.com', phone: '9811167890' },
    { customer_id: 'CUST-0007', name: 'Sneha Iyer', email: 'sneha.iyer@example.com', phone: '9840178901' },
    { customer_id: 'CUST-0008', name: 'Gadget Hub', email: 'sales@gadgethub.com', phone: '9845189012' }
  ];

  let imported = 0;
  let skipped = 0;

  for (const contact of segmentContacts) {
    const exists = inMemoryMembers.some(
      m => m.audience_id === id && m.customer_id === contact.customer_id
    );
    if (exists) {
      skipped++;
    } else {
      inMemoryMembers.push({
        id: `MEM-${String(nextMemberSeq++).padStart(4, '0')}`,
        audience_id: id,
        customer_id: contact.customer_id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        opted_out: false,
        created_at: new Date().toISOString()
      });
      imported++;
    }
  }

  return res.json({
    data: {
      message: `Import completed from ${segment_id || 'segment'}`,
      imported,
      skipped,
      total: imported + skipped
    }
  });
});

module.exports = router;
