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

// Load default mock enquiries from mocks/enquiries.json
function loadInitialEnquiries() {
  const mockPath = path.resolve(__dirname, '../mocks/enquiries.json');
  if (fs.existsSync(mockPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('[crm4] Error reading enquiries mock:', e.message);
    }
  }
  return [
    {
      id: 'ENQ-0001',
      name: 'Rajiv Verma',
      phone: '9820066666',
      email: 'rajiv.verma@example.com',
      source: 'web',
      product_interest: 'SKU-0001',
      lead_id: 'LEAD-0001',
      sales_rep_id: 'EMP-0001',
      notes: 'Inquired about 55-inch smart TV festive bundle discount',
      created_at: '2026-11-10T10:30:00.000Z'
    },
    {
      id: 'ENQ-0002',
      name: 'Apex Electronics Dealer',
      phone: '9820077777',
      email: 'purchasing@apexelectronics.com',
      source: 'dealer',
      product_interest: 'SKU-0002',
      lead_id: 'LEAD-0002',
      sales_rep_id: 'EMP-0001',
      notes: 'Dealer enquiry for 10 units double-door refrigerator',
      created_at: '2026-11-11T14:15:00.000Z'
    },
    {
      id: 'ENQ-0003',
      name: 'Priya Nair',
      phone: '9820088888',
      email: 'priya.nair@example.com',
      source: 'walk-in',
      product_interest: 'SKU-0004',
      lead_id: 'LEAD-0003',
      sales_rep_id: 'EMP-0001',
      notes: 'Showroom walk-in customer interested in microwave oven',
      created_at: '2026-11-12T11:00:00.000Z'
    },
    {
      id: 'ENQ-0004',
      name: 'Kiran Patel',
      phone: '9879156789',
      email: 'kiran.patel@example.com',
      source: 'web',
      product_interest: 'SKU-0005',
      lead_id: 'LEAD-0004',
      sales_rep_id: 'EMP-0001',
      notes: 'Web form request for split AC installation quote',
      created_at: '2026-11-12T16:45:00.000Z'
    },
    {
      id: 'ENQ-0005',
      name: 'Metro Offices Ltd',
      phone: '9811167890',
      email: 'admin@metrooffices.com',
      source: 'dealer',
      product_interest: 'SKU-0003',
      lead_id: 'LEAD-0005',
      sales_rep_id: 'EMP-0001',
      notes: 'Commercial purchase inquiry for washing machine fleet',
      created_at: '2026-11-13T09:20:00.000Z'
    }
  ];
}

// In-memory store used when database is offline or not provisioned
let inMemoryEnquiries = loadInitialEnquiries();
let nextSeq = 6;

// Validation constants
const VALID_SOURCES = ['dealer', 'web', 'walk-in'];

// Protect all routes with authentication
router.use(requireAuth);

/**
 * Helper: Format enquiry record for client response
 */
function formatEnquiry(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    product_interest: row.product_interest,
    lead_id: row.lead_id || null,
    sales_rep_id: row.sales_rep_id || 'EMP-0001',
    notes: row.notes || null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

/**
 * GET /enquiries
 * List all enquiries with optional source and product_interest filtering
 */
router.get('/enquiries', async (req, res) => {
  const { source, product_interest, lead_id } = req.query;

  if (pool) {
    try {
      const conditions = [];
      const values = [];

      if (source) {
        values.push(source.toLowerCase());
        conditions.push(`source = $${values.length}`);
      }
      if (product_interest) {
        values.push(product_interest);
        conditions.push(`product_interest = $${values.length}`);
      }
      if (lead_id) {
        values.push(lead_id);
        conditions.push(`lead_id = $${values.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `SELECT * FROM enquiries ${whereClause} ORDER BY created_at DESC, id ASC`;
      const result = await pool.query(query, values);
      return res.json({ data: result.rows.map(formatEnquiry) });
    } catch (err) {
      console.warn('[crm4] DB error fetching enquiries, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  let filtered = [...inMemoryEnquiries];
  if (source) {
    filtered = filtered.filter(e => e.source.toLowerCase() === source.toLowerCase());
  }
  if (product_interest) {
    filtered = filtered.filter(e => e.product_interest === product_interest);
  }
  if (lead_id) {
    filtered = filtered.filter(e => e.lead_id === lead_id);
  }

  return res.json({ data: filtered.map(formatEnquiry) });
});

/**
 * GET /enquiries/:id
 * Retrieve single enquiry by ID
 */
router.get('/enquiries/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM enquiries WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Enquiry with id '${id}' not found` });
      }
      return res.json({ data: formatEnquiry(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error fetching enquiry by id, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const found = inMemoryEnquiries.find(e => e.id === id);
  if (!found) {
    return res.status(404).json({ error: `Enquiry with id '${id}' not found` });
  }
  return res.json({ data: formatEnquiry(found) });
});

/**
 * POST /enquiries
 * Captures an enquiry form submission and automatically creates a lead in CRM-1 [CRM4-B4]
 */
router.post('/enquiries', async (req, res) => {
  const { name, phone, email, source, product_interest, notes } = req.body || {};

  // Input Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'phone is required and must be a non-empty string' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'email is required and must be a valid email address' });
  }
  if (!source || !VALID_SOURCES.includes(source.toLowerCase())) {
    return res.status(400).json({
      error: `source is required and must be one of: ${VALID_SOURCES.join(', ')}`
    });
  }
  if (!product_interest || typeof product_interest !== 'string' || !product_interest.trim()) {
    return res.status(400).json({ error: 'product_interest is required' });
  }

  const cleanName = name.trim();
  const cleanPhone = phone.trim();
  const cleanEmail = email.trim();
  const cleanSource = source.toLowerCase();
  const cleanProductInterest = product_interest.trim();
  const cleanNotes = notes ? String(notes).trim() : null;

  // Inter-service integration with CRM-1 to create a Lead
  let leadId = null;
  const useMocks = process.env.USE_MOCKS !== 'false';

  try {
    const leadCallOpts = {
      method: 'POST',
      body: {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        source: cleanSource,
        product_interest: cleanProductInterest,
        sales_rep_id: 'EMP-0001'
      }
    };

    // When USE_MOCKS is enabled, allow callService to use mock fallback
    if (useMocks) {
      leadCallOpts.mock = 'leads';
    }

    const leadResult = await callService('crm1', '/api/leads', leadCallOpts);
    if (leadResult && leadResult.id) {
      leadId = leadResult.id;
    } else if (Array.isArray(leadResult) && leadResult.length > 0 && leadResult[0].id) {
      leadId = leadResult[0].id;
    } else {
      leadId = 'LEAD-MOCK';
    }
  } catch (err) {
    // "Do not use a mock for this call when USE_MOCKS=false; if CRM-1 is down return 502 so the user sees the failure."
    if (!useMocks) {
      return res.status(502).json({
        error: `502 Bad Gateway: CRM-1 service is unreachable to create lead (${err.message})`
      });
    }
    // When USE_MOCKS=true, fallback safely
    leadId = 'LEAD-MOCK';
  }

  // Store in database
  if (pool) {
    try {
      const seqResult = await pool.query("SELECT 'ENQ-' || LPAD(nextval('enquiry_seq')::text, 4, '0') AS next_id");
      const nextId = seqResult.rows[0].next_id;

      const insertQuery = `
        INSERT INTO enquiries (id, name, phone, email, source, product_interest, lead_id, sales_rep_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        nextId,
        cleanName,
        cleanPhone,
        cleanEmail,
        cleanSource,
        cleanProductInterest,
        leadId,
        'EMP-0001',
        cleanNotes
      ];

      const result = await pool.query(insertQuery, values);
      return res.status(201).json({
        data: formatEnquiry(result.rows[0]),
        lead_id: leadId // Included for convenience and direct compatibility
      });
    } catch (err) {
      console.warn('[crm4] DB error storing enquiry, falling back to in-memory store:', err.message);
    }
  }

  // Fallback: In-memory store
  const generatedId = `ENQ-${String(nextSeq++).padStart(4, '0')}`;
  const newEnquiry = {
    id: generatedId,
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    source: cleanSource,
    product_interest: cleanProductInterest,
    lead_id: leadId,
    sales_rep_id: 'EMP-0001',
    notes: cleanNotes,
    created_at: new Date().toISOString()
  };

  inMemoryEnquiries.unshift(newEnquiry);
  return res.status(201).json({
    data: formatEnquiry(newEnquiry),
    lead_id: leadId
  });
});

module.exports = router;
