const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../../_shared/auth');

// Load static reports catalog mock
function loadReportsData() {
  const mockPath = path.resolve(__dirname, '../mocks/reports.json');
  if (fs.existsSync(mockPath)) {
    try {
      return JSON.parse(fs.readFileSync(mockPath, 'utf8'));
    } catch (e) {
      console.error('[crm5] Failed to parse reports.json mock:', e.message);
    }
  }
  return { reports: [] };
}

// All report endpoints require authentication
router.use(requireAuth);

/**
 * GET /api/reports
 * Returns list of accessible reports according to the requester's role.
 * Role can be derived from req.user, or x-user-role header, or ?role= query.
 */
router.get('/reports', (req, res) => {
  try {
    const headerRole = req.headers['x-user-role'];
    const queryRole = req.query.role;
    const authRole = req.user && req.user.role;

    // Determine target role: explicit preview query/header takes precedence
    const effectiveRole = (queryRole || headerRole || authRole || 'admin').toLowerCase();

    const data = loadReportsData();
    const allReports = data.reports || [];

    const accessible = (effectiveRole === 'admin')
      ? allReports
      : allReports.filter(r => Array.isArray(r.allowed_roles) && r.allowed_roles.includes(effectiveRole));

    // Return report descriptors
    const reportSummaries = accessible.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      allowed_roles: r.allowed_roles,
      columnsCount: r.columns ? r.columns.length : 0,
      rowsCount: r.rows ? r.rows.length : 0
    }));

    return res.json({ data: reportSummaries });
  } catch (error) {
    console.error('[crm5] Error fetching reports list:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve reports' });
  }
});

/**
 * GET /api/reports/:id/run
 * Executes and returns tabular data (columns + rows) for a report.
 */
router.get('/reports/:id/run', (req, res) => {
  try {
    const reportId = req.params.id;
    const headerRole = req.headers['x-user-role'];
    const queryRole = req.query.role;
    const authRole = req.user && req.user.role;

    const effectiveRole = (queryRole || headerRole || authRole || 'admin').toLowerCase();

    const data = loadReportsData();
    const report = (data.reports || []).find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({ error: `Report '${reportId}' not found` });
    }

    // Role authorization check
    if (effectiveRole !== 'admin' && !report.allowed_roles.includes(effectiveRole)) {
      return res.status(403).json({
        error: `Forbidden: role '${effectiveRole}' lacks permission to view '${report.title}'`
      });
    }

    return res.json({
      data: {
        id: report.id,
        title: report.title,
        description: report.description,
        category: report.category,
        columns: report.columns || [],
        rows: report.rows || [],
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[crm5] Error running report:', error.message);
    return res.status(500).json({ error: 'Failed to run report' });
  }
});

module.exports = router;
