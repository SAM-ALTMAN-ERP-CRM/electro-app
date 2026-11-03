const { Pool } = require('pg');

/**
 * Creates a PostgreSQL connection pool for a specific team database.
 * Reads connection string from environment or falls back to standard local postgres URI.
 * @param {string} dbName - e.g. 'crm1_db' or team slug
 */
function makePool(dbName) {
  const cleanName = dbName.toLowerCase().replace(/_db$/, '') + '_db';
  const envKey = `DATABASE_URL_${cleanName.replace('_db', '').toUpperCase()}`;
  
  const connectionString =
    process.env[envKey] ||
    process.env.DATABASE_URL ||
    `postgresql://postgres:postgres@localhost:5432/${cleanName}`;

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

  pool.on('error', (err) => {
    console.error(`[db pool error] Database connection error on ${cleanName}:`, err.message);
  });

  return pool;
}

module.exports = {
  makePool
};
