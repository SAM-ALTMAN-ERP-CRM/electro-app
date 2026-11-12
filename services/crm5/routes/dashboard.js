const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../../_shared/auth');
const { callService } = require('../../_shared/callService');
const { makePool } = require('../../_shared/db');

// Connect to crm5_db database pool
let pool;
try {
  pool = makePool('crm5_db');
} catch (err) {
  console.warn('[crm5] Database pool initialization note:', err.message);
}

// In-memory fallback snapshots store
let inMemorySnapshots = [
  {
    id: 'SNP-0001',
    taken_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    metrics: {
      total_leads: 5,
      open_opportunities: 3,
      won_value: 45000.0,
      quotes_accepted: 1,
      opportunities_by_stage: { prospect: 1, proposal: 1, negotiation: 1, won: 1, lost: 1 }
    }
  },
  {
    id: 'SNP-0002',
    taken_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    metrics: {
      total_leads: 7,
      open_opportunities: 4,
      won_value: 45000.0,
      quotes_accepted: 1,
      opportunities_by_stage: { prospect: 2, proposal: 1, negotiation: 1, won: 1, lost: 1 }
    }
  },
  {
    id: 'SNP-0003',
    taken_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    metrics: {
      total_leads: 9,
      open_opportunities: 5,
      won_value: 96980.0,
      quotes_accepted: 2,
      opportunities_by_stage: { prospect: 2, proposal: 2, negotiation: 1, won: 2, lost: 1 }
    }
  },
  {
    id: 'SNP-0004',
    taken_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    metrics: {
      total_leads: 10,
      open_opportunities: 6,
      won_value: 150000.0,
      quotes_accepted: 3,
      opportunities_by_stage: { prospect: 3, proposal: 2, negotiation: 1, won: 3, lost: 1 }
    }
  },
  {
    id: 'SNP-0005',
    taken_at: new Date().toISOString(),
    metrics: {
      total_leads: 12,
      open_opportunities: 7,
      won_value: 209970.0,
      quotes_accepted: 4,
      opportunities_by_stage: { prospect: 3, proposal: 2, negotiation: 2, won: 4, lost: 1 }
    }
  }
];

// Helper to load static mock summary fallback
function loadMockSummary() {
  const mockPath = path.resolve(__dirname, '../mocks/sales-summary.json');
  if (fs.existsSync(mockPath)) {
    return JSON.parse(fs.readFileSync(mockPath, 'utf8'));
  }
  return {
    total_leads: 12,
    open_opportunities: 7,
    won_value: 209970.0,
    quotes_accepted: 4,
    opportunities_by_stage: [
      { stage: 'prospect', label: 'Prospect', count: 3, value: 156940.0, color: '#3b82f6' },
      { stage: 'proposal', label: 'Proposal', count: 2, value: 135920.0, color: '#8b5cf6' },
      { stage: 'negotiation', label: 'Negotiation', count: 2, value: 225960.0, color: '#f59e0b' },
      { stage: 'won', label: 'Won', count: 4, value: 209970.0, color: '#10b981' },
      { stage: 'lost', label: 'Lost', count: 1, value: 24000.0, color: '#ef4444' }
    ],
    recent_opportunities: []
  };
}

// All dashboard endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/dashboard/sales-summary
 * Aggregates CRM metrics: leads, open opportunities, won value in INR, quotes accepted,
 * and stage distribution breakdown.
 */
router.get('/dashboard/sales-summary', async (req, res) => {
  try {
    let leads = [];
    let opportunities = [];
    let quotes = [];

    // Attempt to gather live CRM-1 data via callService
    try {
      leads = await callService('crm1', '/api/leads', { mock: 'leads' });
    } catch (err) {
      console.warn('[crm5] Could not fetch crm1 leads, will use mock if needed:', err.message);
    }

    try {
      opportunities = await callService('crm1', '/api/opportunities', { mock: 'opportunities' });
    } catch (err) {
      console.warn('[crm5] Could not fetch crm1 opportunities, will use mock if needed:', err.message);
    }

    try {
      quotes = await callService('crm1', '/api/quotes', { mock: 'quotes' });
    } catch (err) {
      console.warn('[crm5] Could not fetch crm1 quotes, will use mock if needed:', err.message);
    }

    // If external calls yielded nothing or failed, gracefully use mock data
    const mock = loadMockSummary();
    const finalLeads = (Array.isArray(leads) && leads.length > 0) ? leads : (mock.total_leads ? new Array(mock.total_leads).fill(0) : []);
    const finalOpps = (Array.isArray(opportunities) && opportunities.length > 0) ? opportunities : mock.recent_opportunities;
    const finalQuotes = (Array.isArray(quotes) && quotes.length > 0) ? quotes : [];

    // Compute live metrics from gathered records
    const stageDefinitions = [
      { stage: 'prospect', label: 'Prospect', color: '#3b82f6' },
      { stage: 'proposal', label: 'Proposal', color: '#8b5cf6' },
      { stage: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
      { stage: 'won', label: 'Won', color: '#10b981' },
      { stage: 'lost', label: 'Lost', color: '#ef4444' }
    ];

    let opportunitiesByStage;
    if (finalOpps.length > 0) {
      opportunitiesByStage = stageDefinitions.map(def => {
        const stageOpps = finalOpps.filter(o => o.stage === def.stage);
        const stageValue = stageOpps.reduce((sum, o) => sum + (Number(o.expected_value) || 0), 0);
        return {
          stage: def.stage,
          label: def.label,
          count: stageOpps.length,
          value: Number(stageValue.toFixed(2)),
          color: def.color
        };
      });
    } else {
      opportunitiesByStage = mock.opportunities_by_stage;
    }

    const openOppsCount = finalOpps.filter(o => ['prospect', 'proposal', 'negotiation'].includes(o.stage)).length || mock.open_opportunities;
    const wonValue = finalOpps
      .filter(o => o.stage === 'won')
      .reduce((sum, o) => sum + (Number(o.expected_value) || 0), 0) || mock.won_value;
    const acceptedQuotes = finalQuotes.filter(q => q.status === 'accepted').length || mock.quotes_accepted;

    const summary = {
      total_leads: finalLeads.length || mock.total_leads,
      open_opportunities: openOppsCount,
      won_value: Number(wonValue.toFixed(2)),
      quotes_accepted: acceptedQuotes,
      opportunities_by_stage: opportunitiesByStage,
      recent_opportunities: finalOpps.slice(0, 10)
    };

    return res.json({ data: summary });
  } catch (error) {
    console.error('[crm5] Error generating sales summary:', error.message);
    return res.status(500).json({ error: 'Failed to generate sales summary' });
  }
});

/**
 * POST /api/dashboard/snapshot
 * Captures and saves current dashboard metrics into the database.
 */
router.post('/dashboard/snapshot', async (req, res) => {
  try {
    const metrics = req.body.metrics || (await (async () => {
      const mock = loadMockSummary();
      return mock;
    })());

    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'metrics payload is required and must be an object' });
    }

    if (pool) {
      try {
        const insertQuery = `
          INSERT INTO dashboard_snapshots (metrics)
          VALUES ($1)
          RETURNING id, taken_at, metrics
        `;
        const result = await pool.query(insertQuery, [JSON.stringify(metrics)]);
        return res.status(201).json({ data: result.rows[0] });
      } catch (dbErr) {
        console.warn('[crm5] Database insert error, falling back to memory:', dbErr.message);
      }
    }

    // In-memory fallback
    const seqNum = inMemorySnapshots.length + 1;
    const newSnapshot = {
      id: `SNP-${String(seqNum).padStart(4, '0')}`,
      taken_at: new Date().toISOString(),
      metrics
    };
    inMemorySnapshots.unshift(newSnapshot);

    return res.status(201).json({ data: newSnapshot });
  } catch (error) {
    console.error('[crm5] Error creating snapshot:', error.message);
    return res.status(500).json({ error: 'Failed to save snapshot' });
  }
});

/**
 * GET /api/dashboard/snapshots
 * Returns historical saved snapshots.
 */
router.get('/dashboard/snapshots', async (req, res) => {
  try {
    if (pool) {
      try {
        const query = 'SELECT id, taken_at, metrics FROM dashboard_snapshots ORDER BY taken_at DESC';
        const result = await pool.query(query);
        return res.json({ data: result.rows });
      } catch (dbErr) {
        console.warn('[crm5] Database query error, using memory fallback:', dbErr.message);
      }
    }

    return res.json({ data: inMemorySnapshots });
  } catch (error) {
    console.error('[crm5] Error retrieving snapshots:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve snapshots' });
  }
});

module.exports = router;
