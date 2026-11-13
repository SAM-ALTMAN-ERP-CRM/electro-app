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
  pool = null;
}

// Load default mock surveys
function loadInitialSurveys() {
  const mockPath = path.resolve(__dirname, '../mocks/surveys.json');
  if (fs.existsSync(mockPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn('[crm4] Error reading surveys mock:', e.message);
    }
  }
  return [
    {
      id: 'SRV-0001',
      title: 'Annual Product Experience NPS',
      type: 'nps',
      created_at: '2026-10-10T09:00:00.000Z'
    },
    {
      id: 'SRV-0002',
      title: 'Post-Delivery Installation CSAT',
      type: 'csat',
      created_at: '2026-10-18T10:30:00.000Z'
    }
  ];
}

// Load default mock responses
function loadInitialResponses() {
  const mockPath = path.resolve(__dirname, '../mocks/survey-responses.json');
  if (fs.existsSync(mockPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn('[crm4] Error reading survey responses mock:', e.message);
    }
  }
  return [
    { id: 'RES-0001', survey_id: 'SRV-0001', customer_id: 'CUST-0001', score: 10, comment: 'Exceptional TV clarity and the technician calibrated the wall mount perfectly!', created_at: '2026-10-12T11:00:00.000Z' },
    { id: 'RES-0002', survey_id: 'SRV-0001', customer_id: 'CUST-0002', score: 9, comment: 'Commercial displays for our conference rooms have been reliable for 6 months.', created_at: '2026-10-14T14:30:00.000Z' },
    { id: 'RES-0003', survey_id: 'SRV-0001', customer_id: 'CUST-0003', score: 10, comment: 'Excellent customer support when scheduling product installation.', created_at: '2026-10-16T10:15:00.000Z' },
    { id: 'RES-0004', survey_id: 'SRV-0001', customer_id: 'CUST-0004', score: 8, comment: 'Product is good but dealer delivery took 2 days longer than scheduled.', created_at: '2026-10-20T16:45:00.000Z' },
    { id: 'RES-0005', survey_id: 'SRV-0001', customer_id: 'CUST-0005', score: 8, comment: 'Satisfactory performance on the refrigerator; energy efficiency is good.', created_at: '2026-10-21T12:20:00.000Z' },
    { id: 'RES-0006', survey_id: 'SRV-0001', customer_id: 'CUST-0006', score: 5, comment: 'Remote controller stopped pairing after 3 weeks. Awaiting warranty replacement.', created_at: '2026-10-22T09:40:00.000Z' },
    { id: 'RES-0007', survey_id: 'SRV-0001', customer_id: 'CUST-0007', score: 4, comment: 'Delivery was delayed and the instruction manual was missing from the box.', created_at: '2026-10-24T15:10:00.000Z' },
    { id: 'RES-0008', survey_id: 'SRV-0001', customer_id: 'CUST-0008', score: 10, comment: 'Flawless soundbar integration with our home theatre setup. Highly recommended!', created_at: '2026-10-25T11:50:00.000Z' },
    { id: 'RES-0009', survey_id: 'SRV-0001', customer_id: 'CUST-0001', score: 9, comment: 'Very satisfied with seasonal festive discounts and courteous service engineer.', created_at: '2026-10-28T13:25:00.000Z' },
    { id: 'RES-0010', survey_id: 'SRV-0001', customer_id: 'CUST-0002', score: 9, comment: 'Outstanding procurement support and prompt GST invoice generation.', created_at: '2026-10-29T17:05:00.000Z' }
  ];
}

let inMemorySurveys = loadInitialSurveys();
let inMemoryResponses = loadInitialResponses();
let nextSurveySeq = 3;
let nextResponseSeq = 21;

const VALID_TYPES = ['nps', 'csat'];

router.use(requireAuth);

function formatSurvey(row, responseCount) {
  if (!row) return null;
  const count = responseCount !== undefined
    ? responseCount
    : inMemoryResponses.filter(r => r.survey_id === row.id).length;
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    response_count: count,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

function formatResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    survey_id: row.survey_id,
    customer_id: row.customer_id,
    score: parseInt(row.score, 10),
    comment: row.comment || '',
    created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
  };
}

// 1. GET /surveys
router.get('/surveys', async (req, res) => {
  const { type } = req.query;

  if (pool) {
    try {
      const conditions = [];
      const values = [];
      if (type) {
        values.push(type.toLowerCase());
        conditions.push(`s.type = $${values.length}`);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT s.*, COUNT(r.id)::int AS response_count
        FROM surveys s
        LEFT JOIN survey_responses r ON s.id = r.survey_id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.created_at ASC, s.id ASC
      `;
      const result = await pool.query(query, values);
      return res.json({ data: result.rows.map(row => formatSurvey(row, row.response_count)) });
    } catch (err) {
      console.warn('[crm4] DB error fetching surveys, falling back to in-memory store:', err.message);
    }
  }

  let filtered = [...inMemorySurveys];
  if (type) {
    filtered = filtered.filter(s => s.type.toLowerCase() === type.toLowerCase());
  }
  return res.json({
    data: filtered.map(s => formatSurvey(s))
  });
});

// 2. GET /surveys/:id
router.get('/surveys/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const query = `
        SELECT s.*, COUNT(r.id)::int AS response_count
        FROM surveys s
        LEFT JOIN survey_responses r ON s.id = r.survey_id
        WHERE s.id = $1
        GROUP BY s.id
      `;
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Survey with id '${id}' not found` });
      }
      return res.json({ data: formatSurvey(result.rows[0], result.rows[0].response_count) });
    } catch (err) {
      console.warn('[crm4] DB error fetching survey by id, falling back to in-memory store:', err.message);
    }
  }

  const found = inMemorySurveys.find(s => s.id === id);
  if (!found) {
    return res.status(404).json({ error: `Survey with id '${id}' not found` });
  }
  return res.json({ data: formatSurvey(found) });
});

// 3. POST /surveys
router.post('/surveys', async (req, res) => {
  const { title, type, id: customId } = req.body || {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Survey title is required' });
  }
  if (!type || !VALID_TYPES.includes(type.toLowerCase())) {
    return res.status(400).json({ error: `Survey type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const cleanTitle = title.trim();
  const cleanType = type.toLowerCase();

  if (pool) {
    try {
      let assignedId = customId;
      if (!assignedId) {
        const seqRes = await pool.query("SELECT nextval('survey_seq') AS seq");
        assignedId = `SRV-${String(seqRes.rows[0].seq).padStart(4, '0')}`;
      }

      const insertQuery = `
        INSERT INTO surveys (id, title, type, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [assignedId, cleanTitle, cleanType]);
      return res.status(201).json({ data: formatSurvey(result.rows[0], 0) });
    } catch (err) {
      console.warn('[crm4] DB error creating survey, falling back to in-memory store:', err.message);
    }
  }

  let assignedId = customId;
  if (!assignedId) {
    assignedId = `SRV-${String(nextSurveySeq++).padStart(4, '0')}`;
  }

  const newSurvey = {
    id: assignedId,
    title: cleanTitle,
    type: cleanType,
    created_at: new Date().toISOString()
  };

  inMemorySurveys.push(newSurvey);
  return res.status(201).json({ data: formatSurvey(newSurvey, 0) });
});

// 4. PUT /surveys/:id
router.put('/surveys/:id', async (req, res) => {
  const { id } = req.params;
  const { title, type } = req.body || {};

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({ error: 'Survey title cannot be empty' });
  }
  if (type !== undefined && !VALID_TYPES.includes(type.toLowerCase())) {
    return res.status(400).json({ error: `Survey type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  if (pool) {
    try {
      const updateQuery = `
        UPDATE surveys
        SET title = COALESCE($1, title),
            type = COALESCE($2, type)
        WHERE id = $3
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [
        title ? title.trim() : null,
        type ? type.toLowerCase() : null,
        id
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Survey with id '${id}' not found` });
      }
      return res.json({ data: formatSurvey(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error updating survey, falling back to in-memory store:', err.message);
    }
  }

  const existing = inMemorySurveys.find(s => s.id === id);
  if (!existing) {
    return res.status(404).json({ error: `Survey with id '${id}' not found` });
  }

  if (title !== undefined) existing.title = title.trim();
  if (type !== undefined) existing.type = type.toLowerCase();

  return res.json({ data: formatSurvey(existing) });
});

// 5. DELETE /surveys/:id
router.delete('/surveys/:id', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const result = await pool.query('DELETE FROM surveys WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Survey with id '${id}' not found` });
      }
      return res.json({ data: { message: `Survey '${id}' and responses deleted`, id } });
    } catch (err) {
      console.warn('[crm4] DB error deleting survey, falling back to in-memory store:', err.message);
    }
  }

  const idx = inMemorySurveys.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: `Survey with id '${id}' not found` });
  }

  inMemorySurveys.splice(idx, 1);
  inMemoryResponses = inMemoryResponses.filter(r => r.survey_id !== id);

  return res.json({ data: { message: `Survey '${id}' and responses deleted`, id } });
});

// 6. GET /surveys/:id/responses
router.get('/surveys/:id/responses', async (req, res) => {
  const { id } = req.params;

  if (pool) {
    try {
      const check = await pool.query('SELECT id FROM surveys WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: `Survey with id '${id}' not found` });
      }

      const result = await pool.query(
        'SELECT * FROM survey_responses WHERE survey_id = $1 ORDER BY created_at DESC, id ASC',
        [id]
      );
      return res.json({ data: result.rows.map(formatResponse) });
    } catch (err) {
      console.warn('[crm4] DB error fetching survey responses, falling back to in-memory store:', err.message);
    }
  }

  const exists = inMemorySurveys.some(s => s.id === id);
  if (!exists) {
    return res.status(404).json({ error: `Survey with id '${id}' not found` });
  }

  const responses = inMemoryResponses
    .filter(r => r.survey_id === id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({ data: responses.map(formatResponse) });
});

// 7. POST /surveys/:id/responses
router.post('/surveys/:id/responses', async (req, res) => {
  const { id } = req.params;
  const { customer_id, score, comment, id: customRespId } = req.body || {};

  if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
    return res.status(400).json({ error: 'Customer ID (e.g. CUST-0001) is required' });
  }

  const numScore = parseInt(score, 10);
  if (isNaN(numScore) || numScore < 0 || numScore > 10) {
    return res.status(400).json({ error: 'score must be an integer between 0 and 10' });
  }

  const cleanCustId = customer_id.trim();
  const cleanComment = comment ? String(comment).trim() : null;

  if (pool) {
    try {
      const check = await pool.query('SELECT id FROM surveys WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        return res.status(404).json({ error: `Survey with id '${id}' not found` });
      }

      let assignedId = customRespId;
      if (!assignedId) {
        const seqRes = await pool.query("SELECT nextval('survey_response_seq') AS seq");
        assignedId = `RES-${String(seqRes.rows[0].seq).padStart(4, '0')}`;
      }

      const insertQuery = `
        INSERT INTO survey_responses (id, survey_id, customer_id, score, comment, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [
        assignedId,
        id,
        cleanCustId,
        numScore,
        cleanComment
      ]);
      return res.status(201).json({ data: formatResponse(result.rows[0]) });
    } catch (err) {
      console.warn('[crm4] DB error creating response, falling back to in-memory store:', err.message);
    }
  }

  const exists = inMemorySurveys.some(s => s.id === id);
  if (!exists) {
    return res.status(404).json({ error: `Survey with id '${id}' not found` });
  }

  let assignedId = customRespId;
  if (!assignedId) {
    assignedId = `RES-${String(nextResponseSeq++).padStart(4, '0')}`;
  }

  const newResponse = {
    id: assignedId,
    survey_id: id,
    customer_id: cleanCustId,
    score: numScore,
    comment: cleanComment || '',
    created_at: new Date().toISOString()
  };

  inMemoryResponses.unshift(newResponse);
  return res.status(201).json({ data: formatResponse(newResponse) });
});

// 8. GET /surveys/:id/results (CRM4-D3: NPS Hand Calculation & Stats)
router.get('/surveys/:id/results', async (req, res) => {
  const { id } = req.params;

  let responses = [];
  let survey = null;

  if (pool) {
    try {
      const survRes = await pool.query('SELECT * FROM surveys WHERE id = $1', [id]);
      if (survRes.rows.length === 0) {
        return res.status(404).json({ error: `Survey with id '${id}' not found` });
      }
      survey = survRes.rows[0];

      const respRes = await pool.query(
        'SELECT * FROM survey_responses WHERE survey_id = $1 ORDER BY created_at DESC, id ASC',
        [id]
      );
      responses = respRes.rows;
    } catch (err) {
      console.warn('[crm4] DB error fetching survey results, falling back to in-memory store:', err.message);
    }
  }

  if (!survey) {
    survey = inMemorySurveys.find(s => s.id === id);
    if (!survey) {
      return res.status(404).json({ error: `Survey with id '${id}' not found` });
    }
    responses = inMemoryResponses
      .filter(r => r.survey_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const total = responses.length;
  let averageScore = 0;
  let promoters = 0; // 9 to 10
  let passives = 0;   // 7 to 8
  let detractors = 0; // 0 to 6
  let nps = 0;

  if (total > 0) {
    const sum = responses.reduce((acc, r) => acc + parseInt(r.score, 10), 0);
    averageScore = parseFloat((sum / total).toFixed(1));

    for (const r of responses) {
      const sc = parseInt(r.score, 10);
      if (sc >= 9) promoters++;
      else if (sc >= 7) passives++;
      else detractors++;
    }

    const pctPromoters = (promoters / total) * 100;
    const pctDetractors = (detractors / total) * 100;
    nps = Math.round(pctPromoters - pctDetractors);
  }

  const latestComments = responses
    .filter(r => r.comment && r.comment.trim())
    .slice(0, 5)
    .map(r => ({
      customer_id: r.customer_id,
      score: parseInt(r.score, 10),
      comment: r.comment,
      created_at: r.created_at
    }));

  return res.json({
    data: {
      survey_id: id,
      title: survey.title,
      type: survey.type,
      total_responses: total,
      average_score: averageScore,
      promoters,
      passives,
      detractors,
      nps,
      latest_comments: latestComments
    }
  });
});

module.exports = router;
