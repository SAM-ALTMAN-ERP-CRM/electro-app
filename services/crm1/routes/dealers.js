const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm1_db');

// Protect all dealer routes with auth
router.use(requireAuth);

// In-memory fallback seed dealers (from Section 5 contract)
let inMemoryDealers = [
  { id: 'DLR-0001', name: 'BrightHome Retail', contact_person: 'Rahul Deshmukh', phone: '020-25671199', email: 'rahul@brighthome.in', city: 'Pune', tier: 'gold', credit_limit: 1500000.00, status: 'active', created_at: '2026-10-12T00:00:00.000Z' },
  { id: 'DLR-0002', name: 'Gadget Hub', contact_person: 'Suresh Rao', phone: '080-22345678', email: 'contact@gadgethub.in', city: 'Bengaluru', tier: 'silver', credit_limit: 800000.00, status: 'active', created_at: '2026-10-17T00:00:00.000Z' },
  { id: 'DLR-0003', name: 'Metro Electronics', contact_person: 'Amit Verma', phone: '011-23456789', email: 'amit@metroelec.com', city: 'Delhi', tier: 'gold', credit_limit: 2000000.00, status: 'active', created_at: '2026-10-22T00:00:00.000Z' },
  { id: 'DLR-0004', name: 'Western Appliance Mart', contact_person: 'Manoj Joshi', phone: '022-26789012', email: 'manoj@westernmart.com', city: 'Mumbai', tier: 'bronze', credit_limit: 300000.00, status: 'active', created_at: '2026-10-27T00:00:00.000Z' },
  { id: 'DLR-0005', name: 'Royal Vision Hub', contact_person: 'Priya S.', phone: '044-24567890', email: 'priya@royalvision.com', city: 'Chennai', tier: 'silver', credit_limit: 600000.00, status: 'active', created_at: '2026-11-01T00:00:00.000Z' }
];

let dealerIdCounter = 6;

const VALID_TIERS = ['gold', 'silver', 'bronze'];

/**
 * GET /api/dealers ([CRM1-D1])
 * Lists dealers with optional search query (?q=) and city filter (?city=).
 */
router.get('/dealers', async (req, res, next) => {
  try {
    const { q, city } = req.query;

    let dbRows = null;
    try {
      let queryStr = `SELECT id, name, contact_person, phone, email, city, tier, credit_limit, status, created_at FROM dealers WHERE 1=1`;
      const params = [];

      if (q && q.trim()) {
        params.push(`%${q.trim().toLowerCase()}%`);
        queryStr += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(contact_person, '')) LIKE $${params.length})`;
      }

      if (city && city.trim()) {
        params.push(city.trim().toLowerCase());
        queryStr += ` AND LOWER(city) = $${params.length}`;
      }

      queryStr += ` ORDER BY id ASC`;

      const result = await pool.query(queryStr, params);
      dbRows = result.rows.map(r => ({
        ...r,
        credit_limit: parseFloat(r.credit_limit)
      }));
    } catch (dbErr) {
      console.warn('[crm1] Database query failed for GET /dealers, using in-memory store:', dbErr.message);
    }

    if (dbRows) {
      return res.json({ data: dbRows });
    }

    // In-memory filter fallback
    let list = inMemoryDealers;
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(needle) ||
        (d.contact_person && d.contact_person.toLowerCase().includes(needle))
      );
    }
    if (city && city.trim()) {
      const cityNeedle = city.trim().toLowerCase();
      list = list.filter(d => d.city.toLowerCase() === cityNeedle);
    }

    return res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dealers/:id ([CRM1-D1])
 * Fetches dealer details by ID.
 */
router.get('/dealers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    let dealer = null;
    try {
      const result = await pool.query(
        `SELECT id, name, contact_person, phone, email, city, tier, credit_limit, status, created_at
         FROM dealers
         WHERE id = $1`,
        [id]
      );
      if (result.rows.length > 0) {
        dealer = {
          ...result.rows[0],
          credit_limit: parseFloat(result.rows[0].credit_limit)
        };
      }
    } catch (dbErr) {
      console.warn(`[crm1] Database query failed for GET /dealers/${id}, falling back:`, dbErr.message);
    }

    if (!dealer) {
      dealer = inMemoryDealers.find(d => d.id === id);
    }

    if (!dealer) {
      return res.status(404).json({ error: `Dealer with ID '${id}' not found` });
    }

    return res.json({ data: dealer });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/dealers ([CRM1-D1])
 * Registers a new authorized dealer.
 */
router.post('/dealers', async (req, res, next) => {
  try {
    const { name, contact_person, phone, email, city, tier, credit_limit } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'city is required' });
    }

    const normalizedTier = tier ? tier.toLowerCase().trim() : 'silver';
    if (!VALID_TIERS.includes(normalizedTier)) {
      return res.status(400).json({ error: `tier must be one of: ${VALID_TIERS.join(', ')}` });
    }

    const parsedCreditLimit = parseFloat(credit_limit);
    if (isNaN(parsedCreditLimit) || parsedCreditLimit < 0) {
      return res.status(400).json({ error: 'credit_limit must be a non-negative number' });
    }

    let createdDealer = null;
    try {
      const result = await pool.query(
        `INSERT INTO dealers (name, contact_person, phone, email, city, tier, credit_limit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, contact_person, phone, email, city, tier, credit_limit, status, created_at`,
        [name.trim(), contact_person?.trim() || null, phone?.trim() || null, email?.trim() || null, city.trim(), normalizedTier, parsedCreditLimit]
      );
      createdDealer = {
        ...result.rows[0],
        credit_limit: parseFloat(result.rows[0].credit_limit)
      };
    } catch (dbErr) {
      console.warn('[crm1] Database insert failed for POST /dealers, using in-memory store:', dbErr.message);
    }

    if (!createdDealer) {
      const newId = `DLR-${String(dealerIdCounter++).padStart(4, '0')}`;
      createdDealer = {
        id: newId,
        name: name.trim(),
        contact_person: contact_person?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        city: city.trim(),
        tier: normalizedTier,
        credit_limit: parsedCreditLimit,
        status: 'active',
        created_at: new Date().toISOString()
      };
      inMemoryDealers.unshift(createdDealer);
    }

    return res.status(201).json({ data: createdDealer });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/dealers/:id ([CRM1-D1])
 * Updates dealer profile and credit parameters.
 */
router.put('/dealers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, city, tier, credit_limit, status } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'city is required' });
    }

    const normalizedTier = tier ? tier.toLowerCase().trim() : 'silver';
    if (!VALID_TIERS.includes(normalizedTier)) {
      return res.status(400).json({ error: `tier must be one of: ${VALID_TIERS.join(', ')}` });
    }

    const parsedCreditLimit = parseFloat(credit_limit);
    if (isNaN(parsedCreditLimit) || parsedCreditLimit < 0) {
      return res.status(400).json({ error: 'credit_limit must be a non-negative number' });
    }

    const normalizedStatus = status === 'inactive' ? 'inactive' : 'active';

    let updatedDealer = null;
    try {
      const result = await pool.query(
        `UPDATE dealers
         SET name = $1, contact_person = $2, phone = $3, email = $4, city = $5, tier = $6, credit_limit = $7, status = $8
         WHERE id = $9
         RETURNING id, name, contact_person, phone, email, city, tier, credit_limit, status, created_at`,
        [name.trim(), contact_person?.trim() || null, phone?.trim() || null, email?.trim() || null, city.trim(), normalizedTier, parsedCreditLimit, normalizedStatus, id]
      );
      if (result.rows.length > 0) {
        updatedDealer = {
          ...result.rows[0],
          credit_limit: parseFloat(result.rows[0].credit_limit)
        };
      }
    } catch (dbErr) {
      console.warn(`[crm1] Database update failed for PUT /dealers/${id}, falling back:`, dbErr.message);
    }

    const memIdx = inMemoryDealers.findIndex(d => d.id === id);
    if (memIdx !== -1) {
      inMemoryDealers[memIdx] = {
        ...inMemoryDealers[memIdx],
        name: name.trim(),
        contact_person: contact_person?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        city: city.trim(),
        tier: normalizedTier,
        credit_limit: parsedCreditLimit,
        status: normalizedStatus
      };
      if (!updatedDealer) updatedDealer = inMemoryDealers[memIdx];
    }

    if (!updatedDealer) {
      return res.status(404).json({ error: `Dealer with ID '${id}' not found` });
    }

    return res.json({ data: updatedDealer });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
