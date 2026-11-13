// [CRM2-D3] Support reports
// One summary endpoint for the Reports page, computed with SQL from
// tickets (CRM2-A1/A3), ticket_assignments and service_centres (CRM2-D1).
const express = require('express');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const router = express.Router();
const pool = makePool('crm2_db');

router.use('/reports', requireAuth);

// Every status and priority is always present in the answer (0 when there are none),
// so the page never has to deal with missing keys.
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['high', 'medium', 'low'];

// Turn rows like [{ key: 'open', count: 3 }] into { open: 3, in_progress: 0, ... }
function countsByKey(rows, keys) {
  const counts = {};
  keys.forEach(k => { counts[k] = 0; });
  rows.forEach(r => { if (r.key in counts) counts[r.key] = Number(r.count); });
  return counts;
}

// GET /api/reports/tickets-summary
// -> { by_status, by_priority, total_tickets, overdue_count, avg_resolution_hours, active_centres, by_centre }
router.get('/reports/tickets-summary', async (req, res, next) => {
  try {
    const [status, priority, overdue, avg, centres] = await Promise.all([
      pool.query('SELECT status AS key, COUNT(*) AS count FROM tickets GROUP BY status'),
      pool.query('SELECT priority AS key, COUNT(*) AS count FROM tickets GROUP BY priority'),
      // Same rule as GET /api/tickets/overdue
      pool.query(
        `SELECT COUNT(*) AS count FROM tickets
          WHERE due_at < now() AND status NOT IN ('resolved', 'closed')`
      ),
      // Average hours from created_at to resolved_at, only for tickets that were resolved
      pool.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) AS hours
           FROM tickets WHERE resolved_at IS NOT NULL`
      ),
      // Every centre (also those with no tickets), with how many tickets are assigned to it
      pool.query(
        `SELECT c.id AS centre_id, c.name AS centre_name, c.city, c.active,
                COUNT(a.ticket_id) AS ticket_count
           FROM service_centres c
           LEFT JOIN ticket_assignments a ON a.centre_id = c.id
          GROUP BY c.id, c.name, c.city, c.active
          ORDER BY ticket_count DESC, c.id`
      )
    ]);

    const byStatus = countsByKey(status.rows, STATUSES);
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    // 0 (not null/NaN) when no ticket has been resolved yet; 1 decimal place
    const avgHours = avg.rows[0].hours === null ? 0 : Math.round(Number(avg.rows[0].hours) * 10) / 10;

    const byCentre = centres.rows.map(c => ({
      centre_id: c.centre_id,
      centre_name: c.centre_name,
      city: c.city,
      ticket_count: Number(c.ticket_count)
    }));

    res.json({
      data: {
        by_status: byStatus,
        by_priority: countsByKey(priority.rows, PRIORITIES),
        total_tickets: total,
        overdue_count: Number(overdue.rows[0].count),
        avg_resolution_hours: avgHours,
        active_centres: centres.rows.filter(c => c.active).length,
        by_centre: byCentre
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
