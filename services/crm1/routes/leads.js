const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm1_db');
const VALID_SOURCES = ['dealer', 'web', 'walk-in'];
const VALID_STATUSES = ['new', 'contacted', 'qualified', 'lost'];
const VALID_SALES_REPS = ['EMP-0001', 'EMP-0002', 'EMP-0003', 'EMP-0004'];

router.use(requireAuth);

function normalizeOptionalText(body, field, maxLength) {
  const value = body[field];
  if (value === undefined || value === null) {
    return { value: null };
  }
  if (typeof value !== 'string') {
    return { error: `${field} must be a string` };
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    return { error: `${field} must be ${maxLength} characters or fewer` };
  }
  return { value: normalized || null };
}

function validateLeadInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' };
  }

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return { error: 'name is required' };
  }
  const name = body.name.trim();
  if (name.length > 100) {
    return { error: 'name must be 100 characters or fewer' };
  }

  if (typeof body.source !== 'string') {
    return { error: `source must be one of: ${VALID_SOURCES.join(', ')}` };
  }
  const source = body.source.trim().toLowerCase();
  if (!VALID_SOURCES.includes(source)) {
    return { error: `source must be one of: ${VALID_SOURCES.join(', ')}` };
  }

  const phone = normalizeOptionalText(body, 'phone', 20);
  if (phone.error) return phone;
  const email = normalizeOptionalText(body, 'email', 100);
  if (email.error) return email;
  const productInterest = normalizeOptionalText(body, 'product_interest', 100);
  if (productInterest.error) return productInterest;
  const salesRepId = normalizeOptionalText(body, 'sales_rep_id', 20);
  if (salesRepId.error) return salesRepId;

  const normalizedSalesRepId = salesRepId.value ? salesRepId.value.toUpperCase() : null;
  if (normalizedSalesRepId && !VALID_SALES_REPS.includes(normalizedSalesRepId)) {
    return { error: `sales_rep_id must be one of: ${VALID_SALES_REPS.join(', ')}` };
  }

  let status = null;
  if (Object.hasOwn(body, 'status')) {
    if (typeof body.status !== 'string') {
      return { error: `status must be one of: ${VALID_STATUSES.join(', ')}` };
    }
    status = body.status.trim().toLowerCase();
    if (!VALID_STATUSES.includes(status)) {
      return { error: `status must be one of: ${VALID_STATUSES.join(', ')}` };
    }
  }

  return {
    value: {
      name,
      phone: phone.value,
      email: email.value,
      source,
      product_interest: productInterest.value,
      status,
      sales_rep_id: normalizedSalesRepId
    }
  };
}

function calculateLeadScore(lead) {
  const sourcePoints = { dealer: 30, web: 20, 'walk-in': 10 };
  const score = (sourcePoints[lead.source] || 0)
    + (lead.email ? 10 : 0)
    + (lead.phone ? 10 : 0)
    + (lead.product_interest ? 10 : 0);

  return Math.min(100, score);
}

function handleDatabaseError(res, error, operation) {
  console.error(`[crm1] ${operation} failed:`, error.message);
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Lead already exists' });
  }
  return res.status(500).json({ error: 'Unable to complete the lead request' });
}

const LEAD_COLUMNS = `
  id, name, phone, email, source, product_interest, status, score, sales_rep_id, created_at
`;

router.get('/leads', async (req, res) => {
  const status = req.query.status;
  if (status !== undefined && (typeof status !== 'string' || !VALID_STATUSES.includes(status.trim().toLowerCase()))) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const result = status === undefined
      ? await pool.query(`SELECT ${LEAD_COLUMNS} FROM leads ORDER BY id ASC`)
      : await pool.query(
        `SELECT ${LEAD_COLUMNS} FROM leads WHERE status = $1 ORDER BY id ASC`,
        [status.trim().toLowerCase()]
      );
    return res.json({ data: result.rows });
  } catch (error) {
    return handleDatabaseError(res, error, 'GET /leads');
  }
});

router.get('/leads/hot', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${LEAD_COLUMNS} FROM leads WHERE score >= $1 ORDER BY id ASC`,
      [60]
    );
    return res.json({ data: result.rows });
  } catch (error) {
    return handleDatabaseError(res, error, 'GET /leads/hot');
  }
});

router.get('/leads/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${LEAD_COLUMNS} FROM leads WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDatabaseError(res, error, 'GET /leads/:id');
  }
});

router.post('/leads', async (req, res) => {
  const input = validateLeadInput(req.body);
  if (input.error) {
    return res.status(400).json({ error: input.error });
  }

  const lead = input.value;
  const score = calculateLeadScore(lead);
  try {
    const result = await pool.query(
      `INSERT INTO leads (name, phone, email, source, product_interest, status, score, sales_rep_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${LEAD_COLUMNS}`,
      [
        lead.name,
        lead.phone,
        lead.email,
        lead.source,
        lead.product_interest,
        lead.status || 'new',
        score,
        lead.sales_rep_id
      ]
    );
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    return handleDatabaseError(res, error, 'POST /leads');
  }
});

router.put('/leads/:id', async (req, res) => {
  const input = validateLeadInput(req.body);
  if (input.error) {
    return res.status(400).json({ error: input.error });
  }

  const lead = input.value;
  const score = calculateLeadScore(lead);
  try {
    const result = await pool.query(
      `UPDATE leads
       SET name = $1, phone = $2, email = $3, source = $4, product_interest = $5,
           score = $6, status = COALESCE($7, status), sales_rep_id = $8
       WHERE id = $9
       RETURNING ${LEAD_COLUMNS}`,
      [
        lead.name,
        lead.phone,
        lead.email,
        lead.source,
        lead.product_interest,
        score,
        lead.status,
        lead.sales_rep_id,
        req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDatabaseError(res, error, 'PUT /leads/:id');
  }
});

router.delete('/leads/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    return res.json({ data: { message: 'Lead deleted successfully' } });
  } catch (error) {
    return handleDatabaseError(res, error, 'DELETE /leads/:id');
  }
});

module.exports = router;
