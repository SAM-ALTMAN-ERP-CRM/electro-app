const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Node built-in — no extra package needed
const { requireAuth, requireRole } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp5_db');

/*
 * Hash a new password using PBKDF2 (Node built-in).
 * Generates a random 16-byte salt each time.
 * Stored format: "pbkdf2:<hex-salt>:<hex-hash>"
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return `pbkdf2:${salt}:${hash}`;
}

// All routes below require a valid JWT
router.use(requireAuth);

/* GET /api/users — list all users (admin only) */
router.get('/users', requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, name, email, role, employee_id, active, created_at FROM users ORDER BY id'
    );
    return res.json({ data: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* POST /api/users — create a new user with a hashed password (admin only) */
router.post('/users', requireRole('admin'), async (req, res) => {
  const { name, email, password, role, employee_id } = req.body || {};
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'name, email, password, role are required' });

  const allowedRoles = ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr'];
  if (!allowedRoles.includes(role))
    return res.status(400).json({ error: `invalid role — must be one of: ${allowedRoles.join(', ')}` });

  try {
    const seqRes = await pool.query("SELECT nextval('users_seq') AS n");
    const id = 'USR-' + String(seqRes.rows[0].n).padStart(4, '0');
    const passwordHash = hashPassword(password);

    const r = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, employee_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, email, role, employee_id, active, created_at`,
      [id, name, email, passwordHash, role, employee_id || null]
    );
    return res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'email already exists' });
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
