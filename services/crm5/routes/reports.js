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
  console.warn('[crm5] Database pool initialization note (reports):', err.message);
}

// 3 Core role-based reports specified in [CRM5-D1]
const SEEDED_REPORTS = [
  {
    id: 'RPT-0001',
    name: 'Leads by Source',
    source: 'CRM-1',
    allowed_roles: 'sales,admin'
  },
  {
    id: 'RPT-0002',
    name: 'Tickets by Status',
    source: 'CRM-2',
    allowed_roles: 'support,admin'
  },
  {
    id: 'RPT-0003',
    name: 'Customers by Type',
    source: 'CRM-3',
    allowed_roles: 'sales,support,admin'
  }
];

// Column metadata for the 3 seeded reports
const REPORT_COLUMNS = {
  'RPT-0001': [
    { key: 'source', label: 'Lead Source' },
    { key: 'lead_count', label: 'Total Inquiries' },
    { key: 'converted_count', label: 'Converted Deals' },
    { key: 'assigned_rep', label: 'Sales Representative' },
    { key: 'total_pipeline_inr', label: 'Total Pipeline', format: 'currency' }
  ],
  'RPT-0002': [
    { key: 'status', label: 'Ticket Status', format: 'badge' },
    { key: 'ticket_count', label: 'Total Tickets' },
    { key: 'high_priority_count', label: 'High Priority Tickets' },
    { key: 'assigned_engineer', label: 'Assigned Engineer' },
    { key: 'avg_resolution_hrs', label: 'Avg Resolution (Hrs)' }
  ],
  'RPT-0003': [
    { key: 'customer_type', label: 'Customer Segment' },
    { key: 'customer_count', label: 'Total Customers' },
    { key: 'sample_customer_id', label: 'Customer Reference' },
    { key: 'active_orders', label: 'Active Orders' },
    { key: 'total_spend_inr', label: 'Total Spend', format: 'currency' }
  ]
};

// Helper: load local JSON mock from services/crm5/mocks/
function loadLocalMock(mockName) {
  const mockPath = path.resolve(__dirname, `../mocks/${mockName}.json`);
  if (fs.existsSync(mockPath)) {
    try {
      return JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    } catch (e) {
      console.error(`[crm5] Failed to parse ${mockName}.json mock:`, e.message);
    }
  }
  return [];
}

// Helper: load legacy static reports catalog mock (from CRM5-D2) for backwards compatibility
function loadLegacyReports() {
  const mockPath = path.resolve(__dirname, '../mocks/reports.json');
  if (fs.existsSync(mockPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
      return data.reports || [];
    } catch (e) {
      console.warn('[crm5] Failed to read legacy reports.json:', e.message);
    }
  }
  return [];
}

// Helper: check if a role is permitted by allowed_roles text (comma-separated)
function isRolePermitted(allowedRoles, role) {
  if (!allowedRoles || !role) return false;
  let rolesList = [];
  if (Array.isArray(allowedRoles)) {
    rolesList = allowedRoles.map(r => String(r).trim().toLowerCase());
  } else if (typeof allowedRoles === 'string') {
    rolesList = allowedRoles.split(',').map(r => r.trim().toLowerCase());
  }
  return rolesList.includes(role.toLowerCase());
}

// Helper: derive table columns dynamically if not predefined
function deriveColumns(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) return [];
  const first = rows[0];
  if (!first || typeof first !== 'object') return [];
  return Object.keys(first).map(key => ({
    key,
    label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    format: (key.includes('inr') || key.includes('amount') || key.includes('revenue') || key.includes('spend'))
      ? 'currency'
      : (key.includes('pct') || key.includes('rate'))
      ? 'percent'
      : (key === 'status' || key === 'priority')
      ? 'badge'
      : 'text'
  }));
}

// Helper: query reports table from database with in-memory fallback
async function fetchReportsCatalog() {
  if (pool) {
    try {
      const result = await pool.query('SELECT id, name, source, allowed_roles FROM reports ORDER BY id ASC');
      if (result && result.rows && result.rows.length > 0) {
        return result.rows;
      }
    } catch (err) {
      console.warn('[crm5] Database query error on reports, falling back to seed catalog:', err.message);
    }
  }
  return SEEDED_REPORTS;
}

/**
 * Helper: check if provider or mock rows are already summarised.
 * When mock JSON is returned, the first row already has lead_count, ticket_count, or customer_count.
 */
function isAlreadySummarised(rows, countKey) {
  return Array.isArray(rows) && rows.length > 0 && rows[0] && rows[0][countKey] !== undefined;
}

/**
 * Helper: find the most frequent string ID in an array (e.g. employee ID).
 * If there is a tie, it picks the lowest alphabetical ID (e.g. EMP-0001 over EMP-0002).
 * Returns '-' if no valid IDs exist.
 */
function getMostFrequentId(ids) {
  const counts = {};
  for (const id of ids) {
    if (id && String(id).trim() !== '' && id !== '-') {
      const cleanId = String(id).trim();
      counts[cleanId] = (counts[cleanId] || 0) + 1;
    }
  }

  const uniqueIds = Object.keys(counts);
  if (uniqueIds.length === 0) return '-';

  uniqueIds.sort((a, b) => {
    if (counts[b] !== counts[a]) {
      return counts[b] - counts[a];
    }
    return a.localeCompare(b);
  });

  return uniqueIds[0];
}

/**
 * Helper: summarise CRM-1 leads into RPT-0001 (Leads by Source) rows.
 * Always returns all three rows: Dealer, Web, Walk-in.
 */
function summariseLeadsBySource(rawLeads, rawOpportunities) {
  if (isAlreadySummarised(rawLeads, 'lead_count')) {
    return rawLeads;
  }

  const leads = Array.isArray(rawLeads) ? rawLeads : [];
  const opportunities = Array.isArray(rawOpportunities) ? rawOpportunities : [];

  // Set of lead IDs that have at least one opportunity in stage 'won'
  const wonLeadIds = new Set(
    opportunities
      .filter(opp => String(opp.stage || '').trim().toLowerCase() === 'won' && opp.lead_id)
      .map(opp => String(opp.lead_id).trim())
  );

  // Open pipeline stages for active opportunities
  const OPEN_STAGES = new Set(['prospect', 'proposal', 'negotiation']);

  // Always return all three rows: Dealer, Web, Walk-in
  const SOURCE_CONFIG = [
    { key: 'dealer', label: 'Dealer' },
    { key: 'web', label: 'Web' },
    { key: 'walk-in', label: 'Walk-in' }
  ];

  return SOURCE_CONFIG.map(cfg => {
    // Filter leads matching this source channel
    const groupLeads = leads.filter(l => {
      const s = String(l.source || '').trim().toLowerCase();
      if (cfg.key === 'walk-in') {
        return s === 'walk-in' || s === 'walk_in' || s === 'walk in';
      }
      return s === cfg.key;
    });

    const leadIdsInGroup = new Set(groupLeads.map(l => String(l.id).trim()));

    // lead_count: total inquiry count
    const lead_count = groupLeads.length;

    // converted_count: number of leads with at least one 'won' opportunity
    const converted_count = groupLeads.filter(l => wonLeadIds.has(String(l.id).trim())).length;

    // assigned_rep: most frequent sales_rep_id in group (ties: lowest id)
    const assigned_rep = getMostFrequentId(groupLeads.map(l => l.sales_rep_id));

    // total_pipeline_inr: sum of expected_value of open opportunities tied to these leads
    let pipelineTotal = 0;
    for (const opp of opportunities) {
      const stage = String(opp.stage || '').trim().toLowerCase();
      const oppLeadId = opp.lead_id ? String(opp.lead_id).trim() : '';
      if (OPEN_STAGES.has(stage) && oppLeadId && leadIdsInGroup.has(oppLeadId)) {
        pipelineTotal += Number(opp.expected_value) || 0;
      }
    }

    return {
      source: cfg.label,
      lead_count,
      converted_count,
      assigned_rep,
      total_pipeline_inr: Number(pipelineTotal.toFixed(2))
    };
  });
}

/**
 * Helper: summarise CRM-2 tickets into RPT-0002 (Tickets by Status) rows.
 * Always returns all four statuses: open, in_progress, resolved, closed.
 */
function summariseTicketsByStatus(rawTickets) {
  if (isAlreadySummarised(rawTickets, 'ticket_count')) {
    return rawTickets;
  }

  const tickets = Array.isArray(rawTickets) ? rawTickets : [];

  // Always return all four statuses: open, in_progress, resolved, closed
  const STATUS_CONFIG = [
    { key: 'open', label: 'open' },
    { key: 'in_progress', label: 'in_progress' },
    { key: 'resolved', label: 'resolved' },
    { key: 'closed', label: 'closed' }
  ];

  return STATUS_CONFIG.map(cfg => {
    // Filter tickets matching this status
    const groupTickets = tickets.filter(t => {
      const s = String(t.status || '').trim().toLowerCase().replace(/-/g, '_');
      return s === cfg.key;
    });

    // ticket_count: total tickets with this status
    const ticket_count = groupTickets.length;

    // high_priority_count: tickets with priority 'high'
    const high_priority_count = groupTickets.filter(
      t => String(t.priority || '').trim().toLowerCase() === 'high'
    ).length;

    // assigned_engineer: most frequent assigned_to (ties: lowest id)
    const assigned_engineer = getMostFrequentId(groupTickets.map(t => t.assigned_to));

    // avg_resolution_hrs: average (resolved_at - created_at) in hours for resolved/closed
    let totalHours = 0;
    let resolvedCount = 0;
    for (const t of groupTickets) {
      if (t.resolved_at && t.created_at) {
        const createdMs = new Date(t.created_at).getTime();
        const resolvedMs = new Date(t.resolved_at).getTime();
        if (!isNaN(createdMs) && !isNaN(resolvedMs) && resolvedMs >= createdMs) {
          totalHours += (resolvedMs - createdMs) / (1000 * 60 * 60);
          resolvedCount++;
        }
      }
    }

    const avg_resolution_hrs = resolvedCount > 0
      ? Number((totalHours / resolvedCount).toFixed(1))
      : 0;

    return {
      status: cfg.label,
      ticket_count,
      high_priority_count,
      assigned_engineer,
      avg_resolution_hrs
    };
  });
}

/**
 * Helper: summarise CRM-3 customers into RPT-0003 (Customers by Type) rows.
 * Always returns all three customer types: retail, corporate, dealer.
 * Cross-references ERP-4 sales orders for active orders and total spend.
 */
function summariseCustomersByType(rawCustomers, rawSalesOrders) {
  if (isAlreadySummarised(rawCustomers, 'customer_count')) {
    return rawCustomers;
  }

  const customers = Array.isArray(rawCustomers) ? rawCustomers : [];
  const salesOrders = Array.isArray(rawSalesOrders) ? rawSalesOrders : [];

  // Map customer_id -> type for order aggregation
  const customerTypeMap = {};
  for (const c of customers) {
    if (c.id && c.type) {
      customerTypeMap[String(c.id).trim()] = String(c.type).trim().toLowerCase();
    }
  }

  // Always return all three customer types: retail, corporate, dealer
  const TYPE_CONFIG = [
    { key: 'retail', label: 'Retail Commercial' },
    { key: 'corporate', label: 'Enterprise Corporate' },
    { key: 'dealer', label: 'Dealer' }
  ];

  return TYPE_CONFIG.map(cfg => {
    // Filter customers in this segment
    const groupCustomers = customers.filter(
      c => String(c.type || '').trim().toLowerCase() === cfg.key
    );

    // customer_count: total customer count in this segment
    const customer_count = groupCustomers.length;

    // sample_customer_id: alphabetically lowest customer ID in the group
    let sample_customer_id = '-';
    if (groupCustomers.length > 0) {
      const sortedIds = groupCustomers
        .map(c => String(c.id || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      if (sortedIds.length > 0) {
        sample_customer_id = sortedIds[0];
      }
    }

    // active_orders: orders not delivered and not cancelled
    // total_spend_inr: sum of total_amount of non-cancelled orders
    let active_orders = 0;
    let totalSpend = 0;

    for (const order of salesOrders) {
      const custId = order.customer_id ? String(order.customer_id).trim() : '';
      const orderType = customerTypeMap[custId];
      if (orderType === cfg.key) {
        const orderStatus = String(order.status || '').trim().toLowerCase();
        if (orderStatus !== 'cancelled') {
          totalSpend += Number(order.total_amount) || 0;
          if (orderStatus !== 'delivered') {
            active_orders++;
          }
        }
      }
    }

    return {
      customer_type: cfg.label,
      customer_count,
      sample_customer_id,
      active_orders,
      total_spend_inr: Number(totalSpend.toFixed(2))
    };
  });
}

// All report endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/reports
 * Returns list of accessible reports according to the requester's role.
 * - Authenticated role comes from req.user.role (or x-user-role in test environment).
 * - "Manager means admin": manager is treated as admin.
 * - Admin sees all 3 reports.
 * - Admin may pass ?role=sales|support to preview another role.
 * - Non-admin users see only reports permitted for their role:
 *   - sales sees only leads and customers
 *   - support sees tickets and customers
 */
router.get('/reports', async (req, res) => {
  try {
    const authRole = (req.user && req.user.role ? req.user.role : 'admin').toLowerCase();
    const isManagerOrAdmin = authRole === 'admin' || authRole === 'manager';

    // Admin / Manager may pass ?role=sales|support to preview another role
    let effectiveRole = isManagerOrAdmin ? 'admin' : authRole;
    if (isManagerOrAdmin) {
      if (req.query.role) {
        const qRole = String(req.query.role).toLowerCase();
        effectiveRole = (qRole === 'all') ? 'admin' : qRole;
      } else if (req.headers['x-user-role']) {
        const hRole = String(req.headers['x-user-role']).toLowerCase();
        effectiveRole = (hRole === 'all') ? 'admin' : hRole;
      }
    } else if (process.env.AUTH_REQUIRED === 'false' && req.headers['x-user-role']) {
      // Support test runners overriding role via header when auth is bypassed
      effectiveRole = String(req.headers['x-user-role']).toLowerCase();
    }

    if (effectiveRole === 'manager') {
      effectiveRole = 'admin';
    }

    const allReports = await fetchReportsCatalog();

    // Filter reports based on effective role (admin sees all)
    const accessible = (effectiveRole === 'admin')
      ? allReports
      : allReports.filter(r => isRolePermitted(r.allowed_roles, effectiveRole));

    // Return report descriptors formatted for frontend and API consumers
    const reportSummaries = accessible.map(r => ({
      id: r.id,
      name: r.name,
      title: r.name, // compatible with ReportsPage.jsx
      source: r.source,
      category: r.source, // compatible with ReportsPage.jsx
      allowed_roles: typeof r.allowed_roles === 'string'
        ? r.allowed_roles.split(',').map(s => s.trim().toLowerCase())
        : (Array.isArray(r.allowed_roles) ? r.allowed_roles : []),
      allowed_roles_text: typeof r.allowed_roles === 'string'
        ? r.allowed_roles
        : (r.allowed_roles || []).join(',')
    }));

    return res.json({ data: reportSummaries });
  } catch (error) {
    console.error('[crm5] Error fetching reports list:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve reports' });
  }
});

/**
 * GET /api/reports/:id/run
 * Executes and returns tabular data (columns + rows) for a report from the source team.
 * - Depends on: CRM1-A1, CRM2-A1, CRM3-A1 (MOCK each).
 * - If external endpoint is not merged, uses callService('crm5', path, { mock: '<name>' })
 */
router.get('/reports/:id/run', async (req, res) => {
  try {
    const reportId = req.params.id;
    const authRole = (req.user && req.user.role ? req.user.role : 'admin').toLowerCase();
    const isManagerOrAdmin = authRole === 'admin' || authRole === 'manager';

    let effectiveRole = isManagerOrAdmin ? 'admin' : authRole;
    if (isManagerOrAdmin) {
      if (req.query.role) {
        const qRole = String(req.query.role).toLowerCase();
        effectiveRole = (qRole === 'all') ? 'admin' : qRole;
      } else if (req.headers['x-user-role']) {
        const hRole = String(req.headers['x-user-role']).toLowerCase();
        effectiveRole = (hRole === 'all') ? 'admin' : hRole;
      }
    } else if (process.env.AUTH_REQUIRED === 'false' && req.headers['x-user-role']) {
      effectiveRole = String(req.headers['x-user-role']).toLowerCase();
    }

    if (effectiveRole === 'manager') {
      effectiveRole = 'admin';
    }

    const allReports = await fetchReportsCatalog();

    // Match by ID (RPT-0001), normalized slug (leads-by-source), or report name
    let report = allReports.find(r =>
      r.id.toLowerCase() === reportId.toLowerCase() ||
      r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === reportId.toLowerCase() ||
      r.name.toLowerCase() === reportId.toLowerCase()
    );

    // If not found in core reports, check legacy mock reports for backwards compatibility
    if (!report) {
      const legacyReports = loadLegacyReports();
      const legacyReport = legacyReports.find(r => r.id === reportId);
      if (legacyReport) {
        // Enforce role authorization for legacy report
        if (effectiveRole !== 'admin' && !legacyReport.allowed_roles.includes(effectiveRole)) {
          return res.status(403).json({
            error: `Forbidden: role '${effectiveRole}' lacks permission to view '${legacyReport.title}'`
          });
        }
        return res.json({
          data: {
            id: legacyReport.id,
            name: legacyReport.title,
            title: legacyReport.title,
            description: legacyReport.description,
            category: legacyReport.category,
            columns: legacyReport.columns || [],
            rows: legacyReport.rows || [],
            generated_at: new Date().toISOString()
          }
        });
      }
      return res.status(404).json({ error: `Report '${reportId}' not found` });
    }

    // Role authorization check
    if (effectiveRole !== 'admin' && !isRolePermitted(report.allowed_roles, effectiveRole)) {
      return res.status(403).json({
        error: `Forbidden: role '${effectiveRole}' lacks permission to view '${report.name}'`
      });
    }

    // Retrieve rows from upstream source team (or mock via callService per Section 5 contract)
    let rows = [];
    const sourceTeam = (report.source || '').toUpperCase();

    if (sourceTeam === 'CRM-1' || report.id === 'RPT-0001') {
      // 1. Leads by Source from CRM-1
      let rawLeads = [];
      try {
        const crm1Data = await callService('crm1', '/api/leads', {
          method: 'GET',
          mock: 'leads-by-source'
        });
        rawLeads = Array.isArray(crm1Data) ? crm1Data : (crm1Data?.data || crm1Data?.rows || []);
      } catch (err) {
        if (process.env.USE_MOCKS === 'false') {
          throw err;
        }
        rawLeads = loadLocalMock('leads-by-source');
      }

      if (isAlreadySummarised(rawLeads, 'lead_count')) {
        rows = rawLeads;
      } else {
        // Fetch opportunities for conversion and pipeline totals
        let rawOpps = [];
        try {
          const oppsData = await callService('crm1', '/api/opportunities', {
            method: 'GET',
            mock: 'opportunities'
          });
          rawOpps = Array.isArray(oppsData) ? oppsData : (oppsData?.data || oppsData?.rows || []);
        } catch (err) {
          if (process.env.USE_MOCKS === 'false') {
            throw err;
          }
          rawOpps = loadLocalMock('opportunities');
        }

        rows = summariseLeadsBySource(rawLeads, rawOpps);
      }
    } else if (sourceTeam === 'CRM-2' || report.id === 'RPT-0002') {
      // 2. Tickets by Status from CRM-2
      let rawTickets = [];
      try {
        const crm2Data = await callService('crm2', '/api/tickets', {
          method: 'GET',
          mock: 'tickets-by-status'
        });
        rawTickets = Array.isArray(crm2Data) ? crm2Data : (crm2Data?.data || crm2Data?.rows || []);
      } catch (err) {
        if (process.env.USE_MOCKS === 'false') {
          throw err;
        }
        rawTickets = loadLocalMock('tickets-by-status');
      }

      if (isAlreadySummarised(rawTickets, 'ticket_count')) {
        rows = rawTickets;
      } else {
        rows = summariseTicketsByStatus(rawTickets);
      }
    } else if (sourceTeam === 'CRM-3' || report.id === 'RPT-0003') {
      // 3. Customers by Type from CRM-3
      let rawCustomers = [];
      try {
        const crm3Data = await callService('crm3', '/api/customers', {
          method: 'GET',
          mock: 'customers-by-type'
        });
        rawCustomers = Array.isArray(crm3Data) ? crm3Data : (crm3Data?.data || crm3Data?.rows || []);
      } catch (err) {
        if (process.env.USE_MOCKS === 'false') {
          throw err;
        }
        rawCustomers = loadLocalMock('customers-by-type');
      }

      if (isAlreadySummarised(rawCustomers, 'customer_count')) {
        rows = rawCustomers;
      } else {
        // Fetch sales orders from ERP-4 for active orders and spend
        let rawOrders = [];
        try {
          const erp4Data = await callService('erp4', '/api/sales-orders', {
            method: 'GET',
            mock: 'sales-orders'
          });
          rawOrders = Array.isArray(erp4Data) ? erp4Data : (erp4Data?.data || erp4Data?.rows || []);
        } catch (err) {
          if (process.env.USE_MOCKS === 'false') {
            throw err;
          }
          rawOrders = loadLocalMock('sales-orders');
        }

        rows = summariseCustomersByType(rawCustomers, rawOrders);
      }
    }

    // Use predefined columns or derive dynamically from returned row keys
    const columns = REPORT_COLUMNS[report.id] || deriveColumns(rows);

    return res.json({
      data: {
        id: report.id,
        name: report.name,
        title: report.name,
        source: report.source,
        category: report.source,
        description: `Cross-team report aggregated from ${report.source}.`,
        columns: columns,
        rows: rows,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[crm5] Error running report:', error.message);
    const status = (error.status && error.status >= 400 && error.status < 600) ? error.status : 502;
    return res.status(status).json({ error: error.message || 'Failed to run report' });
  }
});

module.exports = router;
