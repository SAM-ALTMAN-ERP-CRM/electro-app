const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

const VALID_LEAVE_TYPES = ['casual', 'sick', 'earned'];
const VALID_LEAVE_STATUSES = ['pending', 'approved', 'rejected'];

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
 * Returns array of YYYY-MM-DD weekday dates (Monday-Friday) within inclusive range.
 * Weekend dates (Saturday and Sunday) are excluded.
 */
function getWeekdaysInRange(fromDateStr, toDateStr) {
  const dates = [];
  const [startY, startM, startD] = fromDateStr.split('-').map(Number);
  const [endY, endM, endD] = toDateStr.split('-').map(Number);

  const current = new Date(Date.UTC(startY, startM - 1, startD));
  const end = new Date(Date.UTC(endY, endM - 1, endD));

  while (current <= end) {
    const day = current.getUTCDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) {
      const yyyy = current.getUTCFullYear();
      const mm = String(current.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(current.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Standard leave request SELECT projection with joined employee profile.
 */
const LEAVE_SELECT = `
  lr.id,
  lr.employee_id,
  e.name AS employee_name,
  e.department_id,
  to_char(lr.from_date, 'YYYY-MM-DD') AS from_date,
  to_char(lr.to_date, 'YYYY-MM-DD') AS to_date,
  lr.type,
  lr.status,
  lr.reason,
  lr.created_at,
  lr.updated_at
`;

const LEAVE_FROM = `
  leave_requests lr
  LEFT JOIN employees e ON e.id = lr.employee_id
`;

/**
 * POST /leave-requests (and alias /leaves)
 * Creates a new leave request in 'pending' status.
 */
const createLeaveRequest = async (req, res) => {
  const { employee_id, from_date, to_date, type, reason, id } = req.body || {};

  if (!employee_id || typeof employee_id !== 'string' || !employee_id.trim()) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }

  if (!from_date || !/^\d{4}-\d{2}-\d{2}$/.test(String(from_date).trim())) {
    return res.status(400).json({ error: 'Valid from_date (YYYY-MM-DD) is required' });
  }

  if (!to_date || !/^\d{4}-\d{2}-\d{2}$/.test(String(to_date).trim())) {
    return res.status(400).json({ error: 'Valid to_date (YYYY-MM-DD) is required' });
  }

  const cleanFrom = String(from_date).trim();
  const cleanTo = String(to_date).trim();

  if (cleanTo < cleanFrom) {
    return res.status(400).json({ error: 'to_date cannot be earlier than from_date' });
  }

  if (!type || !VALID_LEAVE_TYPES.includes(String(type).trim().toLowerCase())) {
    return res.status(400).json({ error: 'Leave type must be casual, sick, or earned' });
  }

  const cleanEmployeeId = String(employee_id).trim();
  const cleanType = String(type).trim().toLowerCase();
  const cleanReason = reason !== undefined && reason !== null ? String(reason).trim() : null;

  try {
    // Verify employee exists
    const empCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [cleanEmployeeId]);
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: `Employee ${cleanEmployeeId} not found` });
    }

    // Annual 12-day leave quota balance check
    const requestedWeekdays = getWeekdaysInRange(cleanFrom, cleanTo);
    if (requestedWeekdays.length > 12) {
      return res.status(400).json({ error: 'Leave request exceeds available annual balance' });
    }

    const year = cleanFrom.substring(0, 4);
    const existing = await pool.query(
      `SELECT to_char(from_date, 'YYYY-MM-DD') AS from_date, to_char(to_date, 'YYYY-MM-DD') AS to_date 
       FROM leave_requests 
       WHERE employee_id = $1 
         AND status IN ('approved', 'pending') 
         AND to_char(from_date, 'YYYY') = $2`,
      [cleanEmployeeId, year]
    );

    let totalExistingDays = 0;
    for (const row of existing.rows) {
      totalExistingDays += getWeekdaysInRange(row.from_date, row.to_date).length;
    }

    if (totalExistingDays + requestedWeekdays.length > 12) {
      return res.status(400).json({ error: 'Leave request exceeds available annual balance' });
    }

    let result;
    if (id && typeof id === 'string' && id.trim()) {
      result = await pool.query(
        `INSERT INTO leave_requests (id, employee_id, from_date, to_date, type, status, reason)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)
         RETURNING id, employee_id, to_char(from_date, 'YYYY-MM-DD') AS from_date, to_char(to_date, 'YYYY-MM-DD') AS to_date, type, status, reason, created_at, updated_at`,
        [id.trim().toUpperCase(), cleanEmployeeId, cleanFrom, cleanTo, cleanType, cleanReason]
      );
    } else {
      result = await pool.query(
        `INSERT INTO leave_requests (employee_id, from_date, to_date, type, status, reason)
         VALUES ($1, $2, $3, $4, 'pending', $5)
         RETURNING id, employee_id, to_char(from_date, 'YYYY-MM-DD') AS from_date, to_char(to_date, 'YYYY-MM-DD') AS to_date, type, status, reason, created_at, updated_at`,
        [cleanEmployeeId, cleanFrom, cleanTo, cleanType, cleanReason]
      );
    }

    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'POST /leave-requests');
  }
};

router.post('/leave-requests', createLeaveRequest);
router.post('/leaves', createLeaveRequest);

/**
 * GET /leave-requests (and alias /leaves)
 * Lists all leave requests with optional filters: employee_id, status, type, month.
 */
const listLeaveRequests = async (req, res) => {
  try {
    const { employee_id, status, type, month } = req.query;

    const conditions = [];
    const values = [];

    if (employee_id && typeof employee_id === 'string' && employee_id.trim()) {
      values.push(employee_id.trim());
      conditions.push(`lr.employee_id = $${values.length}`);
    }

    if (status && typeof status === 'string' && status.trim()) {
      values.push(status.trim().toLowerCase());
      conditions.push(`lr.status = $${values.length}`);
    }

    if (type && typeof type === 'string' && type.trim()) {
      values.push(type.trim().toLowerCase());
      conditions.push(`lr.type = $${values.length}`);
    }

    if (month && typeof month === 'string' && month.trim()) {
      values.push(month.trim());
      conditions.push(`to_char(lr.from_date, 'YYYY-MM') = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT ${LEAVE_SELECT}
      FROM ${LEAVE_FROM}
      ${whereClause}
      ORDER BY lr.created_at DESC, lr.id DESC
    `;

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (error) {
    return handleDbError(res, error, 'GET /leave-requests');
  }
};

router.get('/leave-requests', listLeaveRequests);
router.get('/leaves', listLeaveRequests);

/**
 * GET /leave-requests/:id (and alias /leaves/:id)
 * Retrieves a single leave request by ID.
 */
const getLeaveRequestById = async (req, res) => {
  try {
    const query = `
      SELECT ${LEAVE_SELECT}
      FROM ${LEAVE_FROM}
      WHERE lr.id = $1
    `;

    const result = await pool.query(query, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'GET /leave-requests/:id');
  }
};

router.get('/leave-requests/:id', getLeaveRequestById);
router.get('/leaves/:id', getLeaveRequestById);

/**
 * PUT /leave-requests/:id (and alias /leaves/:id)
 * Updates an existing leave request.
 */
const updateLeaveRequest = async (req, res) => {
  const { from_date, to_date, type, reason, status } = req.body || {};

  try {
    const existing = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const current = existing.rows[0];
    const newFrom = from_date ? String(from_date).trim() : current.from_date.toISOString().split('T')[0];
    const newTo = to_date ? String(to_date).trim() : current.to_date.toISOString().split('T')[0];
    const newType = type ? String(type).trim().toLowerCase() : current.type;
    const newStatus = status ? String(status).trim().toLowerCase() : current.status;
    const newReason = reason !== undefined ? (reason ? String(reason).trim() : null) : current.reason;

    if (newTo < newFrom) {
      return res.status(400).json({ error: 'to_date cannot be earlier than from_date' });
    }

    if (!VALID_LEAVE_TYPES.includes(newType)) {
      return res.status(400).json({ error: 'Leave type must be casual, sick, or earned' });
    }

    if (!VALID_LEAVE_STATUSES.includes(newStatus)) {
      return res.status(400).json({ error: 'Status must be pending, approved, or rejected' });
    }

    const updateQuery = `
      UPDATE leave_requests
      SET from_date = $1, to_date = $2, type = $3, status = $4, reason = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, employee_id, to_char(from_date, 'YYYY-MM-DD') AS from_date, to_char(to_date, 'YYYY-MM-DD') AS to_date, type, status, reason, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, [newFrom, newTo, newType, newStatus, newReason, req.params.id]);

    // If status transitioned to approved, update attendance table
    if (newStatus === 'approved') {
      const weekdays = getWeekdaysInRange(newFrom, newTo);
      for (const d of weekdays) {
        await pool.query(
          `INSERT INTO attendance (employee_id, date, status)
           VALUES ($1, $2, 'leave')
           ON CONFLICT (employee_id, date) DO UPDATE SET
             status = 'leave',
             updated_at = NOW()`,
          [current.employee_id, d]
        );
      }
    }

    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'PUT /leave-requests/:id');
  }
};

router.put('/leave-requests/:id', updateLeaveRequest);
router.put('/leaves/:id', updateLeaveRequest);

/**
 * DELETE /leave-requests/:id (and alias /leaves/:id)
 * Deletes a leave request record.
 */
const deleteLeaveRequest = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM leave_requests WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    return res.json({ message: 'Leave request deleted successfully', data: { id: req.params.id } });
  } catch (error) {
    return handleDbError(res, error, 'DELETE /leave-requests/:id');
  }
};

router.delete('/leave-requests/:id', deleteLeaveRequest);
router.delete('/leaves/:id', deleteLeaveRequest);

/**
 * PATCH /leave-requests/:id/decision (and alias /leaves/:id/decision)
 * Approves or rejects a leave request.
 * When approved, automatically marks weekdays in the date range as 'leave' in attendance table.
 */
const decideLeaveRequest = async (req, res) => {
  const { status, decision } = req.body || {};
  const requestedStatus = (status || decision || '').trim().toLowerCase();

  if (!requestedStatus || !['approved', 'rejected'].includes(requestedStatus)) {
    return res.status(400).json({ error: 'Decision status must be approved or rejected' });
  }

  try {
    // Retrieve existing leave request
    const findQuery = `
      SELECT
        id,
        employee_id,
        to_char(from_date, 'YYYY-MM-DD') AS from_date,
        to_char(to_date, 'YYYY-MM-DD') AS to_date,
        type,
        status,
        reason
      FROM leave_requests
      WHERE id = $1
    `;

    const existingResult = await pool.query(findQuery, [req.params.id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leaveReq = existingResult.rows[0];

    // If decision is approved, mark all weekdays in range as 'leave' in attendance table
    if (requestedStatus === 'approved') {
      const weekdays = getWeekdaysInRange(leaveReq.from_date, leaveReq.to_date);
      for (const d of weekdays) {
        await pool.query(
          `INSERT INTO attendance (employee_id, date, status)
           VALUES ($1, $2, 'leave')
           ON CONFLICT (employee_id, date) DO UPDATE SET
             status = 'leave',
             updated_at = NOW()`,
          [leaveReq.employee_id, d]
        );
      }
    }

    // Update leave request status
    const updateResult = await pool.query(
      `UPDATE leave_requests
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, employee_id, to_char(from_date, 'YYYY-MM-DD') AS from_date, to_char(to_date, 'YYYY-MM-DD') AS to_date, type, status, reason, created_at, updated_at`,
      [requestedStatus, req.params.id]
    );

    return res.status(200).json({ data: updateResult.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'PATCH /leave-requests/:id/decision');
  }
};

router.patch('/leave-requests/:id/decision', decideLeaveRequest);
router.patch('/leaves/:id/decision', decideLeaveRequest);

module.exports = router;
