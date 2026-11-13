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
      // Leads by Source from CRM-1
      try {
        const crm1Data = await callService('crm1', '/api/leads', {
          method: 'GET',
          mock: 'leads-by-source'
        });
        rows = Array.isArray(crm1Data) ? crm1Data : (crm1Data?.data || crm1Data?.rows || []);
      } catch (err) {
        try {
          const mockData = await callService('crm5', '/api/reports/leads-by-source', {
            method: 'GET',
            mock: 'leads-by-source'
          });
          rows = Array.isArray(mockData) ? mockData : (mockData?.data || mockData?.rows || []);
        } catch (mockErr) {
          rows = loadLocalMock('leads-by-source');
        }
      }
    } else if (sourceTeam === 'CRM-2' || report.id === 'RPT-0002') {
      // Tickets by Status from CRM-2
      try {
        const crm2Data = await callService('crm2', '/api/tickets', {
          method: 'GET',
          mock: 'tickets-by-status'
        });
        rows = Array.isArray(crm2Data) ? crm2Data : (crm2Data?.data || crm2Data?.rows || []);
      } catch (err) {
        try {
          const mockData = await callService('crm5', '/api/reports/tickets-by-status', {
            method: 'GET',
            mock: 'tickets-by-status'
          });
          rows = Array.isArray(mockData) ? mockData : (mockData?.data || mockData?.rows || []);
        } catch (mockErr) {
          rows = loadLocalMock('tickets-by-status');
        }
      }
    } else if (sourceTeam === 'CRM-3' || report.id === 'RPT-0003') {
      // Customers by Type from CRM-3
      try {
        const crm3Data = await callService('crm3', '/api/customers', {
          method: 'GET',
          mock: 'customers-by-type'
        });
        rows = Array.isArray(crm3Data) ? crm3Data : (crm3Data?.data || crm3Data?.rows || []);
      } catch (err) {
        try {
          const mockData = await callService('crm5', '/api/reports/customers-by-type', {
            method: 'GET',
            mock: 'customers-by-type'
          });
          rows = Array.isArray(mockData) ? mockData : (mockData?.data || mockData?.rows || []);
        } catch (mockErr) {
          rows = loadLocalMock('customers-by-type');
        }
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
    return res.status(500).json({ error: 'Failed to run report' });
  }
});

module.exports = router;
