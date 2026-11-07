const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { requireAuth, requireRole } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp5_db');

router.use(requireAuth);

router.get('/users', requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name, email, role, employee_id, active, created_at FROM users ORDER BY id');
    return res.json({ data: r.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users', requireRole('admin'), async (req, res) => {
  const { name, email, password, role, employee_id } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role are required' });
  }
  const allowedRoles = ['admin','sales','support','warehouse','finance','hr'];
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'invalid role' });
  try {
    const seqRes = await pool.query("SELECT nextval('users_seq') AS n");
    const n = seqRes.rows[0].n;
    const id = 'USR-' + String(n).padStart(4, '0');
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users (id, name, email, password_hash, role, employee_id, active) VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id, name, email, role, employee_id, active, created_at',
      [id, name, email, hash, role, employee_id || null]
    );
    return res.status(201).json({ data: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'email already exists' });
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
