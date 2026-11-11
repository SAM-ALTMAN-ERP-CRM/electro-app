const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const crm5Root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(crm5Root, '../..');

const schemaSql = fs.readFileSync(path.join(crm5Root, 'db/schema.sql'), 'utf8');
const seedSql = fs.readFileSync(path.join(crm5Root, 'db/seed.sql'), 'utf8');
const erDoc = fs.readFileSync(path.join(repoRoot, 'docs/crm5/er-diagram.md'), 'utf8');

describe('[CRM5-R2] Data owner: schema, seed contract & ER diagram verification', () => {
  it('schema.sql defines all 4 CRM-5 sequences, tables, constraints, and indexes idempotently', () => {
    const sequences = ['snapshot_seq', 'forecast_seq', 'portal_visit_seq', 'report_seq'];
    for (const seq of sequences) {
      assert.match(schemaSql, new RegExp(`CREATE SEQUENCE IF NOT EXISTS ${seq}`, 'i'));
    }

    const tables = ['dashboard_snapshots', 'forecasts', 'portal_visits', 'reports'];
    for (const tbl of tables) {
      assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${tbl}`, 'i'));
    }

    // Prefix + sequence defaults
    assert.match(schemaSql, /'SNP-' \|\| LPAD\(nextval\('snapshot_seq'\)::TEXT, 4, '0'\)/);
    assert.match(schemaSql, /'FCST-' \|\| LPAD\(nextval\('forecast_seq'\)::TEXT, 4, '0'\)/);
    assert.match(schemaSql, /'PV-' \|\| LPAD\(nextval\('portal_visit_seq'\)::TEXT, 4, '0'\)/);
    assert.match(schemaSql, /'RPT-' \|\| LPAD\(nextval\('report_seq'\)::TEXT, 4, '0'\)/);

    // Constraints & indexes
    assert.match(schemaSql, /CHECK \(target_amount >= 0\)/);
    assert.match(schemaSql, /CHECK \(month ~ '\^\\d\{4\}-\(0\[1-9\]\|1\[0-2\]\)\$'\)/);
    assert.match(schemaSql, /idx_dashboard_snapshots_taken_at/);
    assert.match(schemaSql, /idx_portal_visits_customer_id/);
    assert.match(schemaSql, /idx_portal_visits_visited_at/);
    assert.match(schemaSql, /idx_reports_source/);
  });

  it('seed.sql complies with Section 5 shared IDs, idempotency, and sequence sync', () => {
    for (let i = 1; i <= 5; i += 1) {
      assert.ok(seedSql.includes(`'SNP-000${i}'`), `Missing SNP-000${i}`);
      assert.ok(seedSql.includes(`'FCST-000${i}'`), `Missing FCST-000${i}`);
      assert.ok(seedSql.includes(`'PV-000${i}'`), `Missing PV-000${i}`);
    }

    for (let i = 1; i <= 3; i += 1) {
      assert.ok(seedSql.includes(`'RPT-000${i}'`), `Missing RPT-000${i}`);
    }

    // Section 5 customer IDs used in portal_visits (only CUST-0001..CUST-0008 allowed)
    const custIds = seedSql.match(/CUST-\d{4}/g) || [];
    assert.ok(custIds.length >= 5, 'Expected portal_visits to reference Section 5 CUST-xxxx IDs');
    for (const cid of custIds) {
      const num = Number(cid.slice(5));
      assert.ok(num >= 1 && num <= 8, `Customer ID ${cid} must be within CUST-0001..CUST-0008`);
    }

    // Idempotent inserts and sequence synchronization
    assert.ok((seedSql.match(/ON CONFLICT/gi) || []).length >= 4);
    for (const seq of ['snapshot_seq', 'forecast_seq', 'portal_visit_seq', 'report_seq']) {
      assert.match(seedSql, new RegExp(`setval\\('${seq}'`, 'i'));
    }
  });

  it('docs/crm5/er-diagram.md includes 3NF Mermaid ER diagram and complete Data Dictionary', () => {
    assert.match(erDoc, /```mermaid[\s\S]*erDiagram/);
    for (const entity of ['PORTAL_VISITS', 'DASHBOARD_SNAPSHOTS', 'FORECASTS', 'REPORTS']) {
      assert.ok(erDoc.includes(entity), `ER diagram missing entity ${entity}`);
    }

    assert.match(erDoc, /Third Normal Form \(3NF\)/i);
    assert.match(erDoc, /\|\s*Table\s*\|\s*Column\s*\|\s*Type\s*\|\s*Meaning\s*\|/);

    const requiredColumns = [
      'id', 'customer_id', 'visited_at',
      'taken_at', 'metrics',
      'month', 'target_amount', 'notes', 'created_at',
      'name', 'source', 'allowed_roles'
    ];
    for (const col of requiredColumns) {
      assert.ok(erDoc.includes(`\`${col}\``), `Data dictionary missing column ${col}`);
    }
  });

  if (process.env.DATABASE_URL_CRM5) {
    it('live PostgreSQL crm5_db loads schema, runs idempotent seed, and advances sequences', async () => {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL_CRM5,
        connectionTimeoutMillis: 3000
      });

      try {
        await pool.query('DROP TABLE IF EXISTS portal_visits, dashboard_snapshots, forecasts, reports CASCADE');
        await pool.query('DROP SEQUENCE IF EXISTS portal_visit_seq, snapshot_seq, forecast_seq, report_seq CASCADE');

        await pool.query(schemaSql);
        await pool.query(seedSql);
        // Second run verifies idempotency
        await pool.query(seedSql);

        const snpCount = await pool.query('SELECT COUNT(*)::int AS c FROM dashboard_snapshots');
        const fcstCount = await pool.query('SELECT COUNT(*)::int AS c FROM forecasts');
        const pvCount = await pool.query('SELECT COUNT(*)::int AS c FROM portal_visits');
        const rptCount = await pool.query('SELECT COUNT(*)::int AS c FROM reports');

        assert.equal(snpCount.rows[0].c, 5);
        assert.equal(fcstCount.rows[0].c, 5);
        assert.equal(pvCount.rows[0].c, 5);
        assert.equal(rptCount.rows[0].c, 3);

        // Verify nextval sequences do not collide with seeded rows
        const nextSnp = await pool.query(
          "INSERT INTO dashboard_snapshots (metrics) VALUES ('{\"total_leads\": 12}'::jsonb) RETURNING id"
        );
        const nextFcst = await pool.query(
          "INSERT INTO forecasts (month, target_amount, notes) VALUES ('2027-02', 175000.00, 'Seq check') RETURNING id"
        );
        const nextPv = await pool.query(
          "INSERT INTO portal_visits (customer_id) VALUES ('CUST-0005') RETURNING id"
        );
        const nextRpt = await pool.query(
          "INSERT INTO reports (name, source, allowed_roles) VALUES ('Temp Check Report', 'CRM-1', 'admin') RETURNING id"
        );

        assert.equal(nextSnp.rows[0].id, 'SNP-0006');
        assert.equal(nextFcst.rows[0].id, 'FCST-0006');
        assert.equal(nextPv.rows[0].id, 'PV-0006');
        assert.equal(nextRpt.rows[0].id, 'RPT-0004');

        // Clean up temporary test rows and re-sync
        await pool.query("DELETE FROM dashboard_snapshots WHERE id = 'SNP-0006'");
        await pool.query("DELETE FROM forecasts WHERE id = 'FCST-0006'");
        await pool.query("DELETE FROM portal_visits WHERE id = 'PV-0006'");
        await pool.query("DELETE FROM reports WHERE id = 'RPT-0004'");
        await pool.query(seedSql);
      } finally {
        await pool.end();
      }
    });
  }
});
