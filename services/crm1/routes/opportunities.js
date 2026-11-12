const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');
const { callService } = require('../../_shared/callService');

const pool = makePool('crm1_db');

// Protect all opportunities routes with authentication
router.use(requireAuth);

const VALID_STAGES = ['prospect', 'proposal', 'negotiation', 'won', 'lost'];

const ALLOWED_NEXT_STAGES = {
  prospect: ['proposal', 'lost'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won: ['lost']
};

const NEXT_STAGE_LABELS = {
  prospect: 'proposal or lost',
  proposal: 'negotiation or lost',
  negotiation: 'won or lost',
  won: 'lost'
};

// In-memory fallback for testing and standalone/offline development
const SEED_OPPORTUNITIES = [
  { id: 'OPP-0001', lead_id: 'LEAD-0001', customer_id: 'CUST-0001', title: '55" Smart TV bulk purchase', expected_value: 128970.00, stage: 'won', expected_close_date: '2026-11-20', sales_rep_id: 'EMP-0001', created_at: '2026-11-06T10:00:00.000Z' },
  { id: 'OPP-0002', lead_id: 'LEAD-0002', customer_id: 'CUST-0002', title: 'Corporate sound system setup', expected_value: 89950.00, stage: 'proposal', expected_close_date: '2026-11-25', sales_rep_id: 'EMP-0002', created_at: '2026-11-07T11:00:00.000Z' },
  { id: 'OPP-0003', lead_id: 'LEAD-0003', customer_id: 'CUST-0003', title: 'Kitchen appliances bundle', expected_value: 25490.00, stage: 'negotiation', expected_close_date: '2026-11-28', sales_rep_id: 'EMP-0003', created_at: '2026-11-08T12:00:00.000Z' },
  { id: 'OPP-0004', lead_id: 'LEAD-0004', customer_id: 'CUST-0004', title: 'Dealer annual TV quota', expected_value: 474950.00, stage: 'proposal', expected_close_date: '2026-11-15', sales_rep_id: 'EMP-0001', created_at: '2026-11-09T09:00:00.000Z' },
  { id: 'OPP-0005', lead_id: 'LEAD-0005', customer_id: 'CUST-0005', title: 'Home audio upgrades', expected_value: 35980.00, stage: 'prospect', expected_close_date: '2026-11-30', sales_rep_id: 'EMP-0004', created_at: '2026-11-10T14:00:00.000Z' },
  { id: 'OPP-0006', lead_id: 'LEAD-0002', customer_id: 'CUST-0006', title: 'Office TV installation', expected_value: 94990.00, stage: 'lost', expected_close_date: '2026-11-10', sales_rep_id: 'EMP-0002', created_at: '2026-11-11T16:00:00.000Z' }
];

let inMemoryOpportunities = SEED_OPPORTUNITIES.map(o => ({ ...o }));
let oppCounter = 7;

// Helper to reset in-memory store for integration test isolation
router._resetInMemory = () => {
  inMemoryOpportunities = SEED_OPPORTUNITIES.map(o => ({ ...o }));
  oppCounter = 7;
};

// In-memory known seed leads for fallback lead_id validation
const KNOWN_SEED_LEAD_IDS = new Set(['LEAD-0001', 'LEAD-0002', 'LEAD-0003', 'LEAD-0004', 'LEAD-0005']);

/**
 * Safely execute a database query with offline fallback detection.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (
      err.code === 'EPERM' ||
      err.code === 'ECONNREFUSED' ||
      err.code === '3D000' ||
      err.code === '28P01' ||
      err.code === '42P01' || // relation does not exist yet
      err.name === 'AggregateError' ||
      (err.message && (
        err.message.includes('EPERM') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('does not exist') ||
        err.message.includes('Connection terminated')
      ))
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Helper to validate whether a given lead_id exists in the database or in-memory fallback.
 */
async function validateLeadExists(leadId) {
  if (!leadId) return true;
  try {
    const res = await safeQuery('SELECT id FROM leads WHERE id = $1', [leadId]);
    if (res !== null) {
      return res.rows.length > 0;
    }
  } catch (err) {
    console.warn('[crm1] Lead lookup query failed:', err.message);
  }
  return KNOWN_SEED_LEAD_IDS.has(leadId);
}

/**
 * Format database row into standard API format.
 */
function formatOpportunity(row) {
  if (!row) return null;
  return {
    id: row.id,
    lead_id: row.lead_id || null,
    customer_id: row.customer_id || null,
    title: row.title,
    expected_value: Number(parseFloat(row.expected_value || 0).toFixed(2)),
    stage: row.stage,
    expected_close_date: row.expected_close_date ? (row.expected_close_date.toISOString ? row.expected_close_date.toISOString().split('T')[0] : String(row.expected_close_date).split('T')[0]) : null,
    sales_rep_id: row.sales_rep_id || null,
    created_at: row.created_at ? (row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at)) : new Date().toISOString()
  };
}

const OPP_COLUMNS = 'id, lead_id, customer_id, title, expected_value, stage, expected_close_date, sales_rep_id, created_at';

/**
 * GET /api/opportunities
 * Returns all opportunities.
 */
router.get('/opportunities', async (req, res, next) => {
  try {
    const dbResult = await safeQuery(`SELECT ${OPP_COLUMNS} FROM opportunities ORDER BY id ASC`);
    if (dbResult !== null) {
      return res.json({ data: dbResult.rows.map(formatOpportunity) });
    }

    return res.json({ data: inMemoryOpportunities.map(formatOpportunity) });
  } catch (err) {
    console.error('[crm1] GET /opportunities error:', err.message);
    next(err);
  }
});

/**
 * GET /api/opportunities/summary ([CRM1-B3])
 * Returns counts and total monetary expected values for all five pipeline stages.
 * Defined BEFORE /:id route so Express does not interpret 'summary' as an ID.
 */
router.get('/opportunities/summary', async (req, res, next) => {
  try {
    const summary = {
      prospect: { count: 0, total_value: 0 },
      proposal: { count: 0, total_value: 0 },
      negotiation: { count: 0, total_value: 0 },
      won: { count: 0, total_value: 0 },
      lost: { count: 0, total_value: 0 }
    };

    const dbResult = await safeQuery(
      `SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(expected_value), 0)::numeric(12,2) AS total_value
       FROM opportunities
       GROUP BY stage`
    );

    if (dbResult !== null) {
      for (const row of dbResult.rows) {
        if (summary[row.stage]) {
          summary[row.stage] = {
            count: Number(row.count),
            total_value: Number(parseFloat(row.total_value).toFixed(2))
          };
        }
      }
      return res.json({ data: summary });
    }

    // In-memory fallback aggregation
    for (const stage of VALID_STAGES) {
      const items = inMemoryOpportunities.filter(o => o.stage === stage);
      const count = items.length;
      const total_value = Number(
        items.reduce((sum, o) => sum + (Number(o.expected_value) || 0), 0).toFixed(2)
      );
      summary[stage] = { count, total_value };
    }

    return res.json({ data: summary });
  } catch (err) {
    console.error('[crm1] GET /opportunities/summary error:', err.message);
    next(err);
  }
});

/**
 * GET /api/opportunities/:id
 * Returns a single opportunity by ID.
 */
router.get('/opportunities/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const dbResult = await safeQuery(`SELECT ${OPP_COLUMNS} FROM opportunities WHERE id = $1`, [id]);
    if (dbResult !== null) {
      if (dbResult.rows.length === 0) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      return res.json({ data: formatOpportunity(dbResult.rows[0]) });
    }

    const found = inMemoryOpportunities.find(o => o.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    return res.json({ data: formatOpportunity(found) });
  } catch (err) {
    console.error(`[crm1] GET /opportunities/${req.params.id} error:`, err.message);
    next(err);
  }
});

/**
 * POST /api/opportunities
 * Creates a new opportunity.
 */
router.post('/opportunities', async (req, res, next) => {
  try {
    const { lead_id, customer_id, title, expected_value, stage, expected_close_date, sales_rep_id } = req.body;

    // Validate title (required)
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 150) {
      return res.status(400).json({ error: 'title must be 150 characters or fewer' });
    }

    // Validate expected_value (non-negative number)
    let cleanExpectedValue = 0.00;
    if (expected_value !== undefined && expected_value !== null) {
      const numVal = Number(expected_value);
      if (isNaN(numVal) || numVal < 0) {
        return res.status(400).json({ error: 'expected_value must be a non-negative number' });
      }
      cleanExpectedValue = Number(numVal.toFixed(2));
    }

    // Validate stage (must be in VALID_STAGES)
    let cleanStage = 'prospect';
    if (stage !== undefined && stage !== null) {
      if (typeof stage !== 'string' || !VALID_STAGES.includes(stage.trim().toLowerCase())) {
        return res.status(400).json({ error: `stage must be one of: ${VALID_STAGES.join(', ')}` });
      }
      cleanStage = stage.trim().toLowerCase();
    }

    // Validate lead_id exists if supplied
    const cleanLeadId = lead_id && typeof lead_id === 'string' ? lead_id.trim() : null;
    if (cleanLeadId) {
      const leadExists = await validateLeadExists(cleanLeadId);
      if (!leadExists) {
        return res.status(400).json({ error: `lead_id does not exist: ${cleanLeadId}` });
      }
    }

    const cleanCustomerId = customer_id && typeof customer_id === 'string' ? customer_id.trim() : null;
    const cleanSalesRepId = sales_rep_id && typeof sales_rep_id === 'string' ? sales_rep_id.trim() : null;
    const cleanCloseDate = expected_close_date ? String(expected_close_date).split('T')[0] : null;

    const dbResult = await safeQuery(
      `INSERT INTO opportunities (lead_id, customer_id, title, expected_value, stage, expected_close_date, sales_rep_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${OPP_COLUMNS}`,
      [cleanLeadId, cleanCustomerId, cleanTitle, cleanExpectedValue, cleanStage, cleanCloseDate, cleanSalesRepId]
    );

    if (dbResult !== null && dbResult.rows.length > 0) {
      return res.status(201).json({ data: formatOpportunity(dbResult.rows[0]) });
    }

    // In-memory fallback creation
    const newId = `OPP-${String(oppCounter++).padStart(4, '0')}`;
    const newOpportunity = {
      id: newId,
      lead_id: cleanLeadId,
      customer_id: cleanCustomerId,
      title: cleanTitle,
      expected_value: cleanExpectedValue,
      stage: cleanStage,
      expected_close_date: cleanCloseDate,
      sales_rep_id: cleanSalesRepId,
      created_at: new Date().toISOString()
    };
    inMemoryOpportunities.push(newOpportunity);
    return res.status(201).json({ data: formatOpportunity(newOpportunity) });
  } catch (err) {
    if (err.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({ error: 'lead_id does not exist in leads' });
    }
    console.error('[crm1] POST /opportunities error:', err.message);
    next(err);
  }
});

/**
 * PUT /api/opportunities/:id
 * Updates opportunity details.
 */
router.put('/opportunities/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lead_id, customer_id, title, expected_value, stage, expected_close_date, sales_rep_id } = req.body;

    // Check if opportunity exists
    const existingDb = await safeQuery(`SELECT ${OPP_COLUMNS} FROM opportunities WHERE id = $1`, [id]);
    let existing = null;
    if (existingDb !== null) {
      if (existingDb.rows.length === 0) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      existing = existingDb.rows[0];
    } else {
      existing = inMemoryOpportunities.find(o => o.id === id);
      if (!existing) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
    }

    // Validate title if supplied
    let updatedTitle = existing.title;
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'title cannot be empty' });
      }
      updatedTitle = title.trim();
      if (updatedTitle.length > 150) {
        return res.status(400).json({ error: 'title must be 150 characters or fewer' });
      }
    }

    // Validate expected_value if supplied
    let updatedExpectedValue = existing.expected_value;
    if (expected_value !== undefined) {
      const numVal = Number(expected_value);
      if (isNaN(numVal) || numVal < 0) {
        return res.status(400).json({ error: 'expected_value must be a non-negative number' });
      }
      updatedExpectedValue = Number(numVal.toFixed(2));
    }

    // Validate stage if supplied
    let updatedStage = existing.stage;
    if (stage !== undefined) {
      if (typeof stage !== 'string' || !VALID_STAGES.includes(stage.trim().toLowerCase())) {
        return res.status(400).json({ error: `stage must be one of: ${VALID_STAGES.join(', ')}` });
      }
      updatedStage = stage.trim().toLowerCase();
    }

    // Validate lead_id if supplied
    let updatedLeadId = existing.lead_id;
    if (lead_id !== undefined) {
      const cleanLeadId = lead_id ? String(lead_id).trim() : null;
      if (cleanLeadId) {
        const leadExists = await validateLeadExists(cleanLeadId);
        if (!leadExists) {
          return res.status(400).json({ error: `lead_id does not exist: ${cleanLeadId}` });
        }
      }
      updatedLeadId = cleanLeadId;
    }

    const updatedCustomerId = customer_id !== undefined ? (customer_id ? String(customer_id).trim() : null) : existing.customer_id;
    const updatedSalesRepId = sales_rep_id !== undefined ? (sales_rep_id ? String(sales_rep_id).trim() : null) : existing.sales_rep_id;
    const updatedCloseDate = expected_close_date !== undefined ? (expected_close_date ? String(expected_close_date).split('T')[0] : null) : existing.expected_close_date;

    if (existingDb !== null) {
      const updateResult = await safeQuery(
        `UPDATE opportunities
         SET lead_id = $1, customer_id = $2, title = $3, expected_value = $4, stage = $5, expected_close_date = $6, sales_rep_id = $7
         WHERE id = $8
         RETURNING ${OPP_COLUMNS}`,
        [updatedLeadId, updatedCustomerId, updatedTitle, updatedExpectedValue, updatedStage, updatedCloseDate, updatedSalesRepId, id]
      );
      if (updateResult !== null && updateResult.rows.length > 0) {
        return res.json({ data: formatOpportunity(updateResult.rows[0]) });
      }
    }

    // In-memory update
    const memIdx = inMemoryOpportunities.findIndex(o => o.id === id);
    inMemoryOpportunities[memIdx] = {
      ...inMemoryOpportunities[memIdx],
      lead_id: updatedLeadId,
      customer_id: updatedCustomerId,
      title: updatedTitle,
      expected_value: updatedExpectedValue,
      stage: updatedStage,
      expected_close_date: updatedCloseDate,
      sales_rep_id: updatedSalesRepId
    };
    return res.json({ data: formatOpportunity(inMemoryOpportunities[memIdx]) });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'lead_id does not exist in leads' });
    }
    console.error(`[crm1] PUT /opportunities/${req.params.id} error:`, err.message);
    next(err);
  }
});

/**
 * PATCH /api/opportunities/:id/stage ([CRM1-B3])
 * Updates opportunity stage with strict progression rules and Won Gate.
 */
router.patch('/opportunities/:id/stage', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    if (!stage || typeof stage !== 'string' || !VALID_STAGES.includes(stage.trim().toLowerCase())) {
      return res.status(400).json({ error: `stage must be one of: ${VALID_STAGES.join(', ')}` });
    }
    const cleanStage = stage.trim().toLowerCase();

    // Check if opportunity exists
    const existingDb = await safeQuery(`SELECT ${OPP_COLUMNS} FROM opportunities WHERE id = $1`, [id]);
    let existing = null;
    if (existingDb !== null) {
      if (existingDb.rows.length === 0) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
      existing = existingDb.rows[0];
    } else {
      existing = inMemoryOpportunities.find(o => o.id === id);
      if (!existing) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }
    }

    const currentStage = existing.stage;

    // Terminal stage rule: lost is terminal and cannot be reopened
    if (currentStage === 'lost') {
      return res.status(400).json({ error: 'Cannot transition a lost opportunity' });
    }

    // Strict forward progression rule (or move to lost)
    const allowed = ALLOWED_NEXT_STAGES[currentStage] || [];
    if (!allowed.includes(cleanStage)) {
      return res.status(400).json({
        error: `Cannot skip stages. Next allowed stage: ${NEXT_STAGE_LABELS[currentStage]}`
      });
    }

    // Won Gate: Moving to won requires an accepted quotation
    if (cleanStage === 'won') {
      let quotesData;
      try {
        quotesData = await callService(
          'crm1',
          `/api/quotes?opportunity_id=${id}&status=accepted`,
          { mock: 'quotes-accepted' }
        );
      } catch (serviceErr) {
        console.error(`[crm1] Won Gate callService error for ${id}:`, serviceErr.message);
        return res.status(502).json({ error: `Failed to verify quotation status: ${serviceErr.message}` });
      }

      const quotesList = Array.isArray(quotesData)
        ? quotesData
        : (quotesData && Array.isArray(quotesData.data) ? quotesData.data : []);

      const hasAcceptedQuote = quotesList.some(
        q => q.opportunity_id === id && q.status === 'accepted'
      );

      if (!hasAcceptedQuote) {
        return res.status(400).json({ error: 'Cannot close as won without an accepted quote' });
      }
    }

    if (existingDb !== null) {
      const updateResult = await safeQuery(
        `UPDATE opportunities
         SET stage = $1
         WHERE id = $2
         RETURNING ${OPP_COLUMNS}`,
        [cleanStage, id]
      );
      if (updateResult !== null && updateResult.rows.length > 0) {
        return res.json({ data: formatOpportunity(updateResult.rows[0]) });
      }
    }

    // In-memory update
    const memIdx = inMemoryOpportunities.findIndex(o => o.id === id);
    inMemoryOpportunities[memIdx] = {
      ...inMemoryOpportunities[memIdx],
      stage: cleanStage
    };
    return res.json({ data: formatOpportunity(inMemoryOpportunities[memIdx]) });
  } catch (err) {
    console.error(`[crm1] PATCH /opportunities/${req.params.id}/stage error:`, err.message);
    next(err);
  }
});

module.exports = router;
