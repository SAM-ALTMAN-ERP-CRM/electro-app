const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Node built-in — no extra package needed
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp5_db');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';

/*
 * Password hashing using Node's built-in PBKDF2 (no bcrypt library needed).
 * Stored format: "pbkdf2:<16-byte-hex-salt>:<32-byte-hex-hash>"
 * 310,000 iterations of SHA-256 — NIST recommended minimum.
 */
function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('pbkdf2:'))
    return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const actualHash = crypto
    .pbkdf2Sync(password, salt, 310000, 32, 'sha256')
    .toString('hex');
  // Timing-safe comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(actualHash,    'hex'),
    Buffer.from(expectedHash,  'hex')
  );
}

/* POST /api/auth/login — validates credentials and returns an 8-hour JWT */
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });
  try {
    const r = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND active = true', [email]
    );
    if (r.rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = r.rows[0];
    if (!verifyPassword(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });

    // JWT payload carries the fields that _shared/auth.js reads
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, employee_id: user.employee_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      data: {
        token,
        user: {
          id: user.id, name: user.name, email: user.email,
          role: user.role, employee_id: user.employee_id
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* GET /api/auth/me — returns the current user decoded from the Bearer token */
router.get('/auth/me', requireAuth, async (req, res) => {
  return res.json({ data: req.user });
});

/* GET /api/auth/verify?token= — validates any JWT (used by other teams) */
router.get('/auth/verify', async (req, res) => {
  const token = req.query.token;
  if (!token)
    return res.status(400).json({ error: 'token query param required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ data: payload });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
