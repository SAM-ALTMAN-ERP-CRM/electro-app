const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

const VALID_STATUSES = ['present', 'absent', 'half_day', 'leave'];

/**
 * Helper to handle database errors uniformly.
 */
function handleDbError(res, error, operation) {
  console.error(`[erp6] ${operation} failed:`, error.message);
  if (error.code === '23503') {
    return res.status(404).json({ error: 'Employee not found' });
  }
  return res.status(500).json({ error: 'Internal server error' });
}

/**
 * Validates an attendance record object.
 * Returns null if valid, or an error string if invalid.
 */
function validateAttendanceInput(body) {
  const { employee_id, date, status } = body || {};

  if (!employee_id || typeof employee_id !== 'string' || !employee_id.trim()) {
    return { error: 'Employee ID is required', status: 400 };
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())) {
    return { error: 'Valid date in YYYY-MM-DD format is required', status: 400 };
  }

  if (!status || !VALID_STATUSES.includes(String(status).trim().toLowerCase())) {
    return { error: 'Status must be present, absent, half_day, or leave', status: 400 };
  }

  return null;
}

/**
 * Upserts a single attendance record into database.
 * If employee_id + date exists, updates the record instead of duplicating.
 */
async function upsertAttendanceRecord(client, item) {
  const employeeId = String(item.employee_id).trim();
  const date = String(item.date).trim();
  const status = String(item.status).trim().toLowerCase();
  const checkIn = item.check_in !== undefined && item.check_in !== null ? String(item.check_in).trim() : null;
  const checkOut = item.check_out !== undefined && item.check_out !== null ? String(item.check_out).trim() : null;

  // Verify employee exists
  const empCheck = await client.query('SELECT id FROM employees WHERE id = $1', [employeeId]);
  if (empCheck.rows.length === 0) {
    const err = new Error(`Employee ${employeeId} not found`);
    err.status = 404;
    throw err;
  }

  const query = `
    INSERT INTO attendance (employee_id, date, status, check_in, check_out)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (employee_id, date) DO UPDATE SET
      status = EXCLUDED.status,
      check_in = CASE WHEN EXCLUDED.check_in IS NOT NULL THEN EXCLUDED.check_in ELSE attendance.check_in END,
      check_out = CASE WHEN EXCLUDED.check_out IS NOT NULL THEN EXCLUDED.check_out ELSE attendance.check_out END,
      updated_at = NOW()
    RETURNING
      id,
      employee_id,
      to_char(date, 'YYYY-MM-DD') AS date,
      status,
      check_in,
      check_out,
      created_at,
      updated_at
  `;

  const result = await client.query(query, [employeeId, date, status, checkIn, checkOut]);
  return result.rows[0];
}

/**
 * POST /attendance/mark
 * Records or updates daily attendance for an employee.
 * Marking the same employee and day twice updates instead of duplicating.
 * Supports both single record { employee_id, date, status, ... } and bulk array of records.
 */
router.post('/attendance/mark', async (req, res) => {
  const body = req.body;

  if (!body) {
    return res.status(400).json({ error: 'Request body is required' });
  }

  // Handle bulk array of attendance records
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return res.status(400).json({ error: 'Empty attendance records array' });
    }

    // Validate all items first
    for (let i = 0; i < body.length; i++) {
      const valError = validateAttendanceInput(body[i]);
      if (valError) {
        return res.status(valError.status).json({ error: `Row ${i + 1}: ${valError.error}` });
      }
    }

    try {
      const results = [];
      for (const item of body) {
        const saved = await upsertAttendanceRecord(pool, item);
        results.push(saved);
      }
      return res.status(200).json({ data: results });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      return handleDbError(res, error, 'POST /attendance/mark (bulk)');
    }
  }

  // Handle single attendance record
  const valError = validateAttendanceInput(body);
  if (valError) {
    return res.status(valError.status).json({ error: valError.error });
  }

  try {
    const saved = await upsertAttendanceRecord(pool, body);
    return res.status(200).json({ data: saved });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return handleDbError(res, error, 'POST /attendance/mark');
  }
});

/**
 * GET /attendance
 * Lists attendance records filtered by month (YYYY-MM), employee_id, or exact date (YYYY-MM-DD).
 */
router.get('/attendance', async (req, res) => {
  try {
    const { month, employee_id, date, status } = req.query;

    const conditions = [];
    const values = [];

    if (month && typeof month === 'string' && month.trim()) {
      values.push(month.trim());
      conditions.push(`to_char(a.date, 'YYYY-MM') = $${values.length}`);
    }

    if (employee_id && typeof employee_id === 'string' && employee_id.trim()) {
      values.push(employee_id.trim());
      conditions.push(`a.employee_id = $${values.length}`);
    }

    if (date && typeof date === 'string' && date.trim()) {
      values.push(date.trim());
      conditions.push(`to_char(a.date, 'YYYY-MM-DD') = $${values.length}`);
    }

    if (status && typeof status === 'string' && status.trim()) {
      values.push(status.trim().toLowerCase());
      conditions.push(`a.status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        a.id,
        a.employee_id,
        e.name AS employee_name,
        e.department_id,
        e.role_title,
        to_char(a.date, 'YYYY-MM-DD') AS date,
        a.status,
        a.check_in,
        a.check_out,
        a.created_at,
        a.updated_at
      FROM attendance a
      LEFT JOIN employees e ON e.id = a.employee_id
      ${whereClause}
      ORDER BY a.date DESC, a.employee_id ASC
    `;

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (error) {
    return handleDbError(res, error, 'GET /attendance');
  }
});

/**
 * GET /attendance/summary
 * Aggregates present, half, absent, and leave days per employee for a given month (YYYY-MM).
 */
router.get('/attendance/summary', async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month && typeof month === 'string' && month.trim()
      ? month.trim()
      : new Date().toISOString().substring(0, 7);

    const query = `
      SELECT
        e.id AS employee_id,
        e.name,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END)::INT AS present_days,
        COUNT(CASE WHEN a.status = 'half_day' THEN 1 END)::INT AS half_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END)::INT AS absent_days,
        COUNT(CASE WHEN a.status = 'leave' THEN 1 END)::INT AS leave_days
      FROM employees e
      LEFT JOIN attendance a ON a.employee_id = e.id AND to_char(a.date, 'YYYY-MM') = $1
      WHERE e.active = true
      GROUP BY e.id, e.name
      ORDER BY e.id ASC
    `;

    const result = await pool.query(query, [targetMonth]);
    return res.json({ data: result.rows });
  } catch (error) {
    return handleDbError(res, error, 'GET /attendance/summary');
  }
});

module.exports = router;
