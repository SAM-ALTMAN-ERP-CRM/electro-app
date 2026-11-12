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
    range: 'all_time',
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
    range: 'this_month',
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
    range: 'this_week',
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
    range: 'this_week',
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
    range: 'all_time',
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

/**
 * Calculates start and end boundaries (UTC) for a given date range.
 * - this_week: Monday 00:00:00.000 UTC to next Monday 00:00:00.000 UTC (exclusive)
 * - this_month: 1st of month 00:00:00.000 UTC to 1st of next month 00:00:00.000 UTC (exclusive)
 * - all_time: null boundaries (all records without date restriction)
 */
function getDateRangeBoundaries(range, refDate = new Date()) {
  if (range === 'all_time') {
    return { startDate: null, endDate: null };
  }

  if (range === 'this_month') {
    const start = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return { startDate: start, endDate: end };
  }

  if (range === 'this_week') {
    // ISO calendar week: Monday to Sunday
    const day = (refDate.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
    const start = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate() - day, 0, 0, 0, 0));
    const end = new Date(start.getTime() + 7 * 86400000);
    return { startDate: start, endDate: end };
  }

  return { startDate: null, endDate: null };
}

/**
 * Filters records by created_at between startDate (inclusive) and endDate (exclusive).
 * Avoids timezone-related off-by-one errors by comparing standard UTC timestamps.
 */
function filterByCreatedAt(records = [], startDate = null, endDate = null) {
  if (!Array.isArray(records)) return [];
  if (!startDate || !endDate) return records;

  return records.filter(r => {
    const dStr = r.created_at || r.createdAt || r.taken_at;
    if (!dStr) return false;
    const d = new Date(dStr);
    return !isNaN(d.getTime()) && d >= startDate && d < endDate;
  });
}

// All dashboard endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/dashboard/sales-summary
 * Aggregates CRM metrics filtered by date range: 'this_week', 'this_month', 'all_time'.
 * Filters leads, opportunities, and quotes by created_at.
 */
router.get('/dashboard/sales-summary', async (req, res) => {
  try {
    const range = req.query.range || 'all_time';
    const validRanges = ['this_week', 'this_month', 'all_time'];

    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: `Invalid range parameter: '${range}'. Allowed values are: 'this_week', 'this_month', 'all_time'.`
      });
    }

    // Determine reference date (defaults to current system date; allows override for deterministic tests)
    let refDate = new Date();
    const dateOverride = req.query.date || req.query.refDate || req.query.now;
    if (dateOverride) {
      const parsed = new Date(dateOverride);
      if (!isNaN(parsed.getTime())) {
        refDate = parsed;
      }
    }

    const { startDate, endDate } = getDateRangeBoundaries(range, refDate);

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

    const mock = loadMockSummary();

    // Raw record collections
    const rawLeads = (Array.isArray(leads) && leads.length > 0)
      ? leads
      : (mock.leads || (mock.total_leads ? new Array(mock.total_leads).fill(0).map((_, i) => ({ id: `LEAD-M${i}`, created_at: '2026-11-10T10:00:00Z' })) : []));

    const rawOpps = (Array.isArray(opportunities) && opportunities.length > 0)
      ? opportunities
      : (mock.recent_opportunities || []);

    const rawQuotes = (Array.isArray(quotes) && quotes.length > 0)
      ? quotes
      : (mock.quotes || []);

    // Filter records by created_at based on selected date range boundaries
    const finalLeads = filterByCreatedAt(rawLeads, startDate, endDate);
    const finalOpps = filterByCreatedAt(rawOpps, startDate, endDate);
    const finalQuotes = filterByCreatedAt(rawQuotes, startDate, endDate);

    // Compute live metrics from filtered records
    const stageDefinitions = [
      { stage: 'prospect', label: 'Prospect', color: '#3b82f6' },
      { stage: 'proposal', label: 'Proposal', color: '#8b5cf6' },
      { stage: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
      { stage: 'won', label: 'Won', color: '#10b981' },
      { stage: 'lost', label: 'Lost', color: '#ef4444' }
    ];

    const opportunitiesByStage = stageDefinitions.map(def => {
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

    const openOppsCount = finalOpps.filter(o => ['prospect', 'proposal', 'negotiation'].includes(o.stage)).length;
    const wonValue = finalOpps
      .filter(o => o.stage === 'won')
      .reduce((sum, o) => sum + (Number(o.expected_value) || 0), 0);
    const acceptedQuotes = finalQuotes.filter(q => q.status === 'accepted').length;

    const summary = {
      range,
      total_leads: finalLeads.length,
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
 * Captures and saves current dashboard metrics and selected date range into the database.
 */
router.post('/dashboard/snapshot', async (req, res) => {
  try {
    const range = req.body.range || (req.body.metrics && req.body.metrics.range) || 'all_time';
    const validRanges = ['this_week', 'this_month', 'all_time'];

    if (!validRanges.includes(range)) {
      return res.status(400).json({
        error: `Invalid range parameter: '${range}'. Allowed values are: 'this_week', 'this_month', 'all_time'.`
      });
    }

    let metrics = req.body.metrics;
    if (!metrics) {
      if (req.body.total_leads !== undefined || req.body.won_value !== undefined) {
        metrics = { ...req.body };
        delete metrics.range;
      } else {
        metrics = loadMockSummary();
      }
    }

    if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) {
      return res.status(400).json({ error: 'metrics payload is required and must be an object' });
    }

    // Ensure snapshot data is stored as a point-in-time copy with preserved metric values
    const snapshotMetrics = {
      range,
      total_leads: Number(metrics.total_leads) || 0,
      open_opportunities: Number(metrics.open_opportunities) || 0,
      won_value: Number(Number(metrics.won_value || 0).toFixed(2)),
      quotes_accepted: Number(metrics.quotes_accepted) || 0,
      opportunities_by_stage: metrics.opportunities_by_stage || []
    };

    if (pool) {
      try {
        const insertQuery = `
          INSERT INTO dashboard_snapshots (range, metrics)
          VALUES ($1, $2)
          RETURNING id, range, taken_at, metrics
        `;
        const result = await pool.query(insertQuery, [range, JSON.stringify(snapshotMetrics)]);
        return res.status(201).json({ data: result.rows[0] });
      } catch (dbErr) {
        // Fallback for database tables without range column
        if (dbErr.code === '42703') {
          try {
            const fallbackQuery = `
              INSERT INTO dashboard_snapshots (metrics)
              VALUES ($1)
              RETURNING id, taken_at, metrics
            `;
            const result = await pool.query(fallbackQuery, [JSON.stringify(snapshotMetrics)]);
            return res.status(201).json({
              data: {
                id: result.rows[0].id,
                range,
                taken_at: result.rows[0].taken_at,
                metrics: result.rows[0].metrics
              }
            });
          } catch (err2) {
            console.warn('[crm5] Database insert fallback error:', err2.message);
          }
        } else {
          console.warn('[crm5] Database insert error, falling back to memory:', dbErr.message);
        }
      }
    }

    // In-memory fallback
    const seqNum = inMemorySnapshots.length + 1;
    const newSnapshot = {
      id: `SNP-${String(seqNum).padStart(4, '0')}`,
      range,
      taken_at: new Date().toISOString(),
      metrics: snapshotMetrics
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
 * Returns historical saved snapshots in descending creation-time order.
 */
router.get('/dashboard/snapshots', async (req, res) => {
  try {
    if (pool) {
      try {
        const query = `
          SELECT id,
                 COALESCE(range, metrics->>'range', 'all_time') as range,
                 taken_at,
                 metrics
          FROM dashboard_snapshots
          ORDER BY taken_at DESC
        `;
        const result = await pool.query(query);
        return res.json({ data: result.rows });
      } catch (dbErr) {
        console.warn('[crm5] Database query error, using memory fallback:', dbErr.message);
      }
    }

    return res.json({
      data: [...inMemorySnapshots]
        .map(s => ({
          ...s,
          range: s.range || s.metrics?.range || 'all_time'
        }))
        .sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at))
    });
  } catch (error) {
    console.error('[crm5] Error retrieving snapshots:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve snapshots' });
  }
});

router.getDateRangeBoundaries = getDateRangeBoundaries;
router.filterByCreatedAt = filterByCreatedAt;

module.exports = router;
