const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

/**
 * Standard employee SELECT projection with joined department and manager names.
 */
const EMPLOYEE_SELECT = `
  e.id,
  e.name,
  e.email,
  e.phone,
  e.department_id,
  d.name AS department_name,
  e.role_title,
  e.manager_id,
  m.name AS manager_name,
  to_char(e.join_date, 'YYYY-MM-DD') AS join_date,
  e.base_salary,
  e.active,
  e.created_at
`;

const EMPLOYEE_FROM = `
  employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN employees m ON m.id = e.manager_id
`;

/**
 * Helper to handle database errors uniformly.
 */
function handleDbError(res, error, operation) {
  console.error(`[erp6] ${operation} failed:`, error.message);
  if (error.code === '23505') {
    return res.status(409).json({ error: 'An employee with this email already exists' });
  }
  if (error.code === '23503') {
    return res.status(400).json({ error: 'Referenced department or manager does not exist' });
  }
  return res.status(500).json({ error: 'Internal server error' });
}

/**
 * Validates email format roughly.
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * GET /employees
 * Lists employees with support for query filters:
 * - ?role_title=Sales Rep (used by CRM-1)
 * - ?role_title=Service Engineer (used by CRM-2)
 * - ?department=DEP-01 or ?department=Sales
 * - ?q= search across name, email, phone, role_title
 * - ?active=true|false|all (defaults to true)
 */
router.get('/employees', async (req, res) => {
  try {
    const { department, role_title, q, active } = req.query;
    const conditions = [];
    const values = [];

    // Filter by role_title (case-insensitive match)
    if (role_title && typeof role_title === 'string' && role_title.trim()) {
      values.push(role_title.trim());
      conditions.push(`LOWER(e.role_title) = LOWER($${values.length})`);
    }

    // Filter by department (matches department_id or department name)
    if (department && typeof department === 'string' && department.trim()) {
      values.push(department.trim());
      conditions.push(`(e.department_id = $${values.length} OR LOWER(d.name) = LOWER($${values.length}))`);
    }

    // Free text search across name, email, phone, role_title
    if (q && typeof q === 'string' && q.trim()) {
      values.push(`%${q.trim()}%`);
      const paramIdx = `$${values.length}`;
      conditions.push(`(e.name ILIKE ${paramIdx} OR e.email ILIKE ${paramIdx} OR e.phone ILIKE ${paramIdx} OR e.role_title ILIKE ${paramIdx})`);
    }

    // Active status filter: default to active staff only
    if (active === 'all') {
      // Do not add active condition
    } else if (active === 'false') {
      conditions.push('e.active = false');
    } else {
      // Default: active = true
      conditions.push('e.active = true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT ${EMPLOYEE_SELECT}
      FROM ${EMPLOYEE_FROM}
      ${whereClause}
      ORDER BY e.id ASC
    `;

    const result = await pool.query(query, values);
    return res.json({ data: result.rows });
  } catch (error) {
    return handleDbError(res, error, 'GET /employees');
  }
});

/**
 * GET /employees/:id
 * Retrieves a single employee by their ID.
 */
router.get('/employees/:id', async (req, res) => {
  try {
    const query = `
      SELECT ${EMPLOYEE_SELECT}
      FROM ${EMPLOYEE_FROM}
      WHERE e.id = $1
    `;
    const result = await pool.query(query, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'GET /employees/:id');
  }
});

/**
 * POST /employees
 * Creates a new employee.
 */
router.post('/employees', async (req, res) => {
  const body = req.body || {};
  const { name, email, phone, department_id, role_title, manager_id, join_date, base_salary, active, id } = body;

  // Basic required validations
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Employee name is required' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!role_title || typeof role_title !== 'string' || !role_title.trim()) {
    return res.status(400).json({ error: 'role_title is required' });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedRole = role_title.trim();
  const cleanPhone = phone ? String(phone).trim() : null;
  const cleanDept = department_id ? String(department_id).trim() : null;
  const cleanManager = manager_id ? String(manager_id).trim() : null;
  const cleanJoinDate = join_date ? String(join_date).trim() : new Date().toISOString().split('T')[0];
  const cleanSalary = base_salary !== undefined && base_salary !== null ? Number(base_salary) : 0.00;
  const cleanActive = active !== undefined ? Boolean(active) : true;

  if (isNaN(cleanSalary) || cleanSalary < 0) {
    return res.status(400).json({ error: 'base_salary must be a non-negative number' });
  }

  try {
    // Check department existence if provided
    if (cleanDept) {
      const deptCheck = await pool.query('SELECT id FROM departments WHERE id = $1', [cleanDept]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid department_id: department does not exist' });
      }
    }

    // Check manager existence if provided
    if (cleanManager) {
      const mgrCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [cleanManager]);
      if (mgrCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid manager_id: manager does not exist' });
      }
    }

    let insertQuery;
    let params;

    if (id && typeof id === 'string' && id.trim()) {
      insertQuery = `
        INSERT INTO employees (
          id, name, email, phone, department_id, role_title, manager_id, join_date, base_salary, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      params = [
        id.trim().toUpperCase(),
        trimmedName,
        trimmedEmail,
        cleanPhone,
        cleanDept,
        trimmedRole,
        cleanManager,
        cleanJoinDate,
        cleanSalary,
        cleanActive
      ];
    } else {
      insertQuery = `
        INSERT INTO employees (
          name, email, phone, department_id, role_title, manager_id, join_date, base_salary, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;
      params = [
        trimmedName,
        trimmedEmail,
        cleanPhone,
        cleanDept,
        trimmedRole,
        cleanManager,
        cleanJoinDate,
        cleanSalary,
        cleanActive
      ];
    }

    const inserted = await pool.query(insertQuery, params);
    const newId = inserted.rows[0].id;

    // Fetch full employee record with joins
    const full = await pool.query(
      `SELECT ${EMPLOYEE_SELECT} FROM ${EMPLOYEE_FROM} WHERE e.id = $1`,
      [newId]
    );

    return res.status(201).json({ data: full.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'POST /employees');
  }
});

/**
 * PUT /employees/:id
 * Updates an employee's details.
 */
router.put('/employees/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const { name, email, phone, department_id, role_title, manager_id, join_date, base_salary, active } = body;

  try {
    // Check if employee exists
    const existing = await pool.query('SELECT id, email FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Manager cannot be the employee themself
    if (manager_id && manager_id === id) {
      return res.status(400).json({ error: 'An employee cannot be their own manager' });
    }

    // If email is provided, validate and check uniqueness
    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'A valid email is required' });
      }
      const trimmedEmail = email.trim().toLowerCase();
      const duplicate = await pool.query(
        'SELECT id FROM employees WHERE email = $1 AND id != $2',
        [trimmedEmail, id]
      );
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ error: 'An employee with this email already exists' });
      }
    }

    // Check department existence if provided
    if (department_id) {
      const deptCheck = await pool.query('SELECT id FROM departments WHERE id = $1', [department_id]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid department_id: department does not exist' });
      }
    }

    // Check manager existence if provided
    if (manager_id) {
      const mgrCheck = await pool.query('SELECT id FROM employees WHERE id = $1', [manager_id]);
      if (mgrCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid manager_id: manager does not exist' });
      }
    }

    // Build UPDATE query
    const updateQuery = `
      UPDATE employees
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        department_id = COALESCE($4, department_id),
        role_title = COALESCE($5, role_title),
        manager_id = $6,
        join_date = COALESCE($7, join_date),
        base_salary = COALESCE($8, base_salary),
        active = COALESCE($9, active)
      WHERE id = $10
      RETURNING id
    `;

    const salaryVal = base_salary !== undefined && base_salary !== null ? Number(base_salary) : null;
    const activeVal = active !== undefined ? Boolean(active) : null;

    await pool.query(updateQuery, [
      name ? name.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone !== undefined ? (phone ? String(phone).trim() : null) : null,
      department_id !== undefined ? (department_id ? String(department_id).trim() : null) : null,
      role_title ? role_title.trim() : null,
      manager_id !== undefined ? (manager_id ? String(manager_id).trim() : null) : existing.rows[0].manager_id,
      join_date ? String(join_date).trim() : null,
      salaryVal,
      activeVal,
      id
    ]);

    // Return updated record with joins
    const full = await pool.query(
      `SELECT ${EMPLOYEE_SELECT} FROM ${EMPLOYEE_FROM} WHERE e.id = $1`,
      [id]
    );

    return res.json({ data: full.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'PUT /employees/:id');
  }
});

/**
 * DELETE /employees/:id
 * Deletes an employee.
 */
router.delete('/employees/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query('SELECT id FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Set manager_id = NULL for any employees who reported to this employee
    await pool.query('UPDATE employees SET manager_id = NULL WHERE manager_id = $1', [id]);

    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    return res.json({ data: { message: 'Employee deleted successfully' } });
  } catch (error) {
    return handleDbError(res, error, 'DELETE /employees/:id');
  }
});

router.pool = pool;
module.exports = router;
