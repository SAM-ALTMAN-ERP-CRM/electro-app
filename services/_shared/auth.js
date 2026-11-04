const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_production';

/**
 * Authentication middleware.
 * If AUTH_REQUIRED=false, allows everyone in as admin for local development.
 * Otherwise, validates Bearer JWT token in Authorization header.
 */
function requireAuth(req, res, next) {
  const authRequired = process.env.AUTH_REQUIRED === 'true';

  if (!authRequired) {
    // Development mode bypass: provide default admin identity
    req.user = {
      id: 'USR-0001',
      name: 'System Administrator',
      email: 'admin@demo.com',
      role: 'admin',
      employee_id: 'EMP-0012'
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required: missing or invalid Bearer token' });
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based authorization middleware.
 * Admin role automatically passes all role checks.
 * @param {string|string[]} roles - Allowed role or array of allowed roles
 */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Admin passes every check
    if (req.user.role === 'admin' || allowed.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      error: `Forbidden: role '${req.user.role}' lacks required permissions (${allowed.join(', ')})`
    });
  };
}

module.exports = {
  requireAuth,
  requireRole,
  JWT_SECRET
};
