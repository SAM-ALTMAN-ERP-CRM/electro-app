const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Connect to ERP-6 database
const pool = makePool('erp6_db');

// Protect all routes with authentication middleware
router.use(requireAuth);

/**
 * Helper to handle database errors uniformly.
 */
function handleDbError(res, error, operation) {
  console.error(`[erp6] ${operation} failed:`, error.message);
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Department already exists' });
  }
  return res.status(500).json({ error: 'Internal server error' });
}

/**
 * GET /departments
 * Lists departments, with optional text search by name (?q=).
 */
router.get('/departments', async (req, res) => {
  try {
    const { q } = req.query;
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      const result = await pool.query(
        'SELECT id, name, created_at FROM departments WHERE name ILIKE $1 ORDER BY id ASC',
        [searchTerm]
      );
      return res.json({ data: result.rows });
    }

    const result = await pool.query(
      'SELECT id, name, created_at FROM departments ORDER BY id ASC'
    );
    return res.json({ data: result.rows });
  } catch (error) {
    return handleDbError(res, error, 'GET /departments');
  }
});

/**
 * GET /departments/:id
 * Retrieves a single department by its ID.
 */
router.get('/departments/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, created_at FROM departments WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'GET /departments/:id');
  }
});

/**
 * POST /departments
 * Creates a new department.
 */
router.post('/departments', async (req, res) => {
  const { name, id } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    return res.status(400).json({ error: 'Department name must be 100 characters or fewer' });
  }

  try {
    let result;
    if (id && typeof id === 'string' && id.trim()) {
      result = await pool.query(
        'INSERT INTO departments (id, name) VALUES ($1, $2) RETURNING id, name, created_at',
        [id.trim().toUpperCase(), trimmedName]
      );
    } else {
      result = await pool.query(
        'INSERT INTO departments (name) VALUES ($1) RETURNING id, name, created_at',
        [trimmedName]
      );
    }
    return res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'POST /departments');
  }
});

/**
 * PUT /departments/:id
 * Updates an existing department.
 */
router.put('/departments/:id', async (req, res) => {
  const { name } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    return res.status(400).json({ error: 'Department name must be 100 characters or fewer' });
  }

  try {
    const result = await pool.query(
      'UPDATE departments SET name = $1 WHERE id = $2 RETURNING id, name, created_at',
      [trimmedName, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    return res.json({ data: result.rows[0] });
  } catch (error) {
    return handleDbError(res, error, 'PUT /departments/:id');
  }
});

/**
 * DELETE /departments/:id
 * Deletes a department. Refuses if active employees are assigned.
 */
router.delete('/departments/:id', async (req, res) => {
  try {
    // Check if department exists
    const checkDept = await pool.query('SELECT id FROM departments WHERE id = $1', [req.params.id]);
    if (checkDept.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if any employees belong to this department
    const empCheck = await pool.query(
      'SELECT COUNT(*)::int as count FROM employees WHERE department_id = $1',
      [req.params.id]
    );
    if (empCheck.rows[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete department with assigned employees'
      });
    }

    await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    return res.json({ data: { message: 'Department deleted successfully' } });
  } catch (error) {
    return handleDbError(res, error, 'DELETE /departments/:id');
  }
});

router.pool = pool;
module.exports = router;
