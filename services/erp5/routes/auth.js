const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp5_db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  try {
    const r = await pool.query('SELECT * FROM users WHERE email = $1 AND active = true', [email]);
    if (r.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, employee_id: user.employee_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({ data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, employee_id: user.employee_id } } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/auth/me', requireAuth, async (req, res) => {
  return res.json({ data: req.user });
});

router.get('/auth/verify', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).json({ error: 'token query param required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ data: payload });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
