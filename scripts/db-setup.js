#!/usr/bin/env node

/**
 * scripts/db-setup.js
 * Database initialization & reset automation (ERP5-C4)
 * 
 * Sets up the 11 databases (crm1_db .. erp6_db) and runs schema.sql + seed.sql
 * in project dependency order: erp6 -> crm3 -> erp1 -> then the remaining teams.
 * 
 * Usage:
 *   npm run db:setup       (Safe to run multiple times; creates missing DBs, applies schema + seed)
 *   npm run reset          (db-setup.js --reset: drops and recreates each DB; blocked in production)
 */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Dynamic resolver for 'pg' across npm workspaces
let pg;
try {
  pg = require('pg');
} catch (e) {
  try {
    pg = require('../services/erp5/node_modules/pg');
  } catch (e2) {
    try {
      pg = require('../services/_shared/node_modules/pg');
    } catch (e3) {
      console.error('ERROR: Could not find "pg" module. Please run `npm install` first.');
      process.exit(1);
    }
  }
}
const { Client } = pg;

// Dependency-ordered teams: erp6 (HR/emp) -> crm3 (customers) -> erp1 (products/SKU) -> rest
const TEAMS = [
  'erp6',
  'crm3',
  'erp1',
  'crm1',
  'crm2',
  'crm4',
  'crm5',
  'erp2',
  'erp3',
  'erp4',
  'erp5'
];

// Simple .env parser to avoid extra package dependencies
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const isReset = process.argv.includes('--reset');

// Production protection guard
if (isReset && (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production')) {
  console.error('❌ ERROR: Running database reset (--reset) is strictly prohibited in production mode (NODE_ENV=production). Aborting.');
  process.exit(1);
}

// Extract admin connection string targeting default 'postgres' database
function getAdminConnectionString() {
  if (process.env.DATABASE_URL_ADMIN) {
    return process.env.DATABASE_URL_ADMIN;
  }
  const sample = process.env.DATABASE_URL_ERP5 || process.env.DATABASE_URL_CRM1 || process.env.DATABASE_URL;
  if (sample) {
    try {
      const u = new URL(sample);
      u.pathname = '/postgres';
      return u.toString();
    } catch (_) {}
  }
  const user = process.env.PGUSER || 'postgres';
  const pass = process.env.PGPASSWORD || 'postgres';
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/postgres`;
}

// Get connection URL for a team database
function getTeamDbUrl(team) {
  const upper = team.toUpperCase();
  const envKey = `DATABASE_URL_${upper}`;
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  if (process.env.DATABASE_URL) {
    try {
      const u = new URL(process.env.DATABASE_URL);
      u.pathname = `/${team.toLowerCase()}_db`;
      return u.toString();
    } catch (_) {}
  }
  const user = process.env.PGUSER || 'postgres';
  const pass = process.env.PGPASSWORD || 'postgres';
  const host = process.env.PGHOST || 'localhost';
  const port = process.env.PGPORT || '5432';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${team.toLowerCase()}_db`;
}

// Extract database name from connection URL
function getDbName(team) {
  const urlStr = getTeamDbUrl(team);
  try {
    const u = new URL(urlStr);
    return u.pathname.replace(/^\//, '');
  } catch (_) {
    return `${team.toLowerCase()}_db`;
  }
}

async function run() {
  console.log('====================================================');
  console.log(`📦 Electro App Database Setup (Mode: ${isReset ? 'RESET & RECREATE' : 'SAFE SETUP'})`);
  console.log('====================================================\n');

  const adminConn = getAdminConnectionString();
  const adminClient = new Client({ connectionString: adminConn });

  try {
    await adminClient.connect();
    console.log('✓ Connected to PostgreSQL server (admin database).');
  } catch (err) {
    console.error('❌ Could not connect to default PostgreSQL server.');
    console.error(`   Connection: ${adminConn.replace(/:[^:@]+@/, ':****@')}`);
    console.error(`   Error: ${err.message}`);
    console.error('   Hint: Ensure PostgreSQL is running and check your .env credentials.\n');
    process.exit(1);
  }

  // 1. Manage database creation / dropping
  const distinctDbNames = [...new Set(TEAMS.map(t => getDbName(t)))];

  for (const dbName of distinctDbNames) {
    try {
      const checkRes = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      const exists = checkRes.rows.length > 0;

      if (isReset && exists) {
        // Terminate existing connections and drop
        await adminClient.query(`
          SELECT pg_terminate_backend(pid) 
          FROM pg_stat_activity 
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `, [dbName]);
        await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        console.log(`  ↻ Dropped and recreated database: ${dbName}`);
      } else if (!exists) {
        await adminClient.query(`CREATE DATABASE "${dbName}"`);
        console.log(`  + Created missing database: ${dbName}`);
      } else {
        console.log(`  ✓ Database already exists: ${dbName}`);
      }
    } catch (err) {
      console.error(`❌ Error managing database "${dbName}": ${err.message}`);
      await adminClient.end();
      process.exit(1);
    }
  }

  await adminClient.end();
  console.log('\n--- Applying Schemas and Seeds (Order: erp6 -> crm3 -> erp1 -> rest) ---\n');

  let hasErrors = false;
  const summary = [];

  for (const team of TEAMS) {
    const dbUrl = getTeamDbUrl(team);
    const dbName = getDbName(team);
    const teamClient = new Client({ connectionString: dbUrl });

    let schemaStatus = 'skipped';
    let seedStatus = 'skipped';
    const rowCounts = [];

    const repoRoot = path.resolve(__dirname, '..');
    const schemaFile = path.join(repoRoot, `services/${team}/db/schema.sql`);
    const seedFile = path.join(repoRoot, `services/${team}/db/seed.sql`);

    try {
      await teamClient.connect();

      // Run Schema SQL
      if (fs.existsSync(schemaFile)) {
        const schemaSql = fs.readFileSync(schemaFile, 'utf8').trim();
        if (schemaSql) {
          try {
            await teamClient.query(schemaSql);
            schemaStatus = 'OK';
          } catch (sqlErr) {
            schemaStatus = `FAIL (${sqlErr.message.split('\n')[0]})`;
            hasErrors = true;
          }
        }
      }

      // Run Seed SQL (if schema did not fail)
      if (!schemaStatus.startsWith('FAIL') && fs.existsSync(seedFile)) {
        const seedSql = fs.readFileSync(seedFile, 'utf8').trim();
        if (seedSql) {
          try {
            await teamClient.query(seedSql);
            seedStatus = 'OK';
          } catch (sqlErr) {
            seedStatus = `FAIL (${sqlErr.message.split('\n')[0]})`;
            hasErrors = true;
          }
        }
      }

      // Fetch row counts for up to 3 main tables
      if (schemaStatus === 'OK') {
        try {
          const tblRes = await teamClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name ASC
            LIMIT 3;
          `);
          for (const r of tblRes.rows) {
            try {
              const cRes = await teamClient.query(`SELECT COUNT(*)::int AS count FROM "${r.table_name}"`);
              rowCounts.push(`${r.table_name}: ${cRes.rows[0].count}`);
            } catch (_) {}
          }
        } catch (_) {}
      }

    } catch (connErr) {
      schemaStatus = `CONN_ERR (${connErr.message})`;
      hasErrors = true;
    } finally {
      await teamClient.end().catch(() => {});
    }

    summary.push({
      team,
      dbName,
      schemaStatus,
      seedStatus,
      counts: rowCounts.join(', ') || 'none'
    });

    console.log(`[${team.toUpperCase()}] Schema: ${schemaStatus} | Seed: ${seedStatus} | Tables: ${rowCounts.join(', ') || 'none'}`);
  }

  console.log('\n====================================================');
  console.log('📊 DATABASE SETUP SUMMARY');
  console.log('====================================================');
  console.table(summary.map(s => ({
    Team: s.team.toUpperCase(),
    Database: s.dbName,
    Schema: s.schemaStatus,
    Seed: s.seedStatus,
    'Main Table Counts': s.counts
  })));

  if (hasErrors) {
    console.error('\n❌ DATABASE SETUP FAILED: One or more steps encountered errors. Check logs above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ DATABASE SETUP COMPLETED: All 11 team databases initialized successfully.\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Unexpected fatal error during database setup:', err);
  process.exit(1);
});
