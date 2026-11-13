const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SCHEMA_PATH = path.resolve(__dirname, '../db/schema.sql');
const SEED_PATH = path.resolve(__dirname, '../db/seed.sql');
const ER_DOC_PATH = path.resolve(ROOT_DIR, 'docs/crm3/er-diagram.md');

test('CRM3-R2 Data Owner: 3NF Schema, Data Dictionary & Seed Verification', async (t) => {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
  const erDoc = fs.readFileSync(ER_DOC_PATH, 'utf-8');

  await t.test('1. schema.sql defines 3NF CRM-3 tables, constraints, sequences, and indexes', () => {
    for (const seq of ['customers_seq', 'contacts_seq', 'interactions_seq', 'segment_id_seq']) {
      assert.match(schemaSql, new RegExp(`CREATE SEQUENCE IF NOT EXISTS ${seq}`, 'i'));
    }

    for (const table of ['customers', 'contacts', 'interactions', 'segments']) {
      assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
    }

    // 3NF Foreign keys with cascade delete
    assert.match(schemaSql, /contacts[\s\S]*customer_id VARCHAR\(20\) NOT NULL REFERENCES customers\(id\) ON DELETE CASCADE/);
    assert.match(schemaSql, /interactions[\s\S]*customer_id VARCHAR\(20\) NOT NULL REFERENCES customers\(id\) ON DELETE CASCADE/);

    // Check constraints & indexes
    assert.match(schemaSql, /type IN \('retail', 'corporate', 'dealer'\)/);
    assert.match(schemaSql, /type IN \('call', 'email', 'meeting', 'ticket', 'order', 'note'\)/);
    assert.match(schemaSql, /idx_customers_phone/);
    assert.match(schemaSql, /idx_interactions_customer_id/);
  });

  await t.test('2. seed.sql complies with Section 5 shared IDs, idempotency, and sequence sync', () => {
    // Shared CUST-0001..CUST-0010
    for (let i = 1; i <= 10; i += 1) {
      const custId = `CUST-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${custId}'`), `Missing ${custId} in seed.sql`);
    }

    // Shared CON-0001..CON-0011
    for (let i = 1; i <= 11; i += 1) {
      const conId = `CON-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${conId}'`), `Missing ${conId} in seed.sql`);
    }

    // Shared SEG-0001..SEG-0004
    for (let i = 1; i <= 4; i += 1) {
      const segId = `SEG-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${segId}'`), `Missing ${segId} in seed.sql`);
    }

    // 10 seeded interactions INT-0001..INT-0010
    for (let i = 1; i <= 10; i += 1) {
      const intId = `INT-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${intId}'`), `Missing ${intId} in seed.sql`);
    }

    // Shared Section 5 references inside interactions seed
    for (const ref of ['SKU-0001', 'SKU-0002', 'SKU-0003', 'SO-0001', 'SO-0002', 'EMP-0001', 'EMP-0006', 'EMP-0012']) {
      assert.ok(seedSql.includes(ref), `Missing Section 5 reference ${ref} in seed.sql`);
    }

    // Idempotent upserts & sequence alignment
    assert.ok((seedSql.match(/ON CONFLICT \(id\) DO UPDATE SET/gi) || []).length >= 4);
    assert.match(seedSql, /setval\('customers_seq',.*FROM 6/s);
    assert.match(seedSql, /setval\('contacts_seq',.*FROM 5/s);
    assert.match(seedSql, /setval\('segment_id_seq',.*FROM 5/s);
    assert.match(seedSql, /setval\('interactions_seq',.*FROM 5/s);
  });

  await t.test('3. docs/crm3/er-diagram.md includes 3NF Mermaid ER diagram and Data Dictionary', () => {
    assert.match(erDoc, /```mermaid[\s\S]*erDiagram/);
    for (const entity of ['CUSTOMERS', 'CONTACTS', 'INTERACTIONS', 'SEGMENTS']) {
      assert.ok(erDoc.includes(entity), `ER diagram missing entity ${entity}`);
    }

    assert.match(erDoc, /Third Normal Form \(3NF\)/i);
    assert.match(erDoc, /\|\s*Table\s*\|\s*Column\s*\|\s*Type\s*\|\s*Meaning\s*\|/);
    for (const col of ['gstin', 'billing_address', 'designation', 'source_team', 'customer_type']) {
      assert.ok(erDoc.includes(`\`${col}\``), `Data dictionary missing column ${col}`);
    }
  });

  if (process.env.DATABASE_URL_CRM3) {
    await t.test('4. Live PostgreSQL crm3_db schema + idempotent seed check', async () => {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL_CRM3,
        connectionTimeoutMillis: 2000
      });
      try {
      await pool.query('DROP TABLE IF EXISTS interactions, contacts, segments, customers CASCADE');
      await pool.query('DROP SEQUENCE IF EXISTS customers_seq, contacts_seq, interactions_seq, segment_id_seq CASCADE');

      await pool.query(schemaSql);
      await pool.query(seedSql);
      await pool.query(seedSql);

      const custCount = await pool.query('SELECT COUNT(*)::int AS count FROM customers');
      const conCount = await pool.query('SELECT COUNT(*)::int AS count FROM contacts');
      const segCount = await pool.query('SELECT COUNT(*)::int AS count FROM segments');
      const intCount = await pool.query('SELECT COUNT(*)::int AS count FROM interactions');

      assert.strictEqual(custCount.rows[0].count, 10);
      assert.strictEqual(conCount.rows[0].count, 11);
      assert.strictEqual(segCount.rows[0].count, 4);
      assert.strictEqual(intCount.rows[0].count, 10);

      // Verify Corporate in Mumbai segment rule matches CUST-0002 only
      const segMatch = await pool.query(
        "SELECT id FROM customers WHERE type = 'corporate' AND city = 'Mumbai' ORDER BY id"
      );
      assert.deepStrictEqual(segMatch.rows.map((r) => r.id), ['CUST-0002']);

      // Verify duplicate phone & email seed pairs
      const phoneDups = await pool.query("SELECT id FROM customers WHERE phone = '9820112345' ORDER BY id");
      assert.deepStrictEqual(phoneDups.rows.map((r) => r.id), ['CUST-0001', 'CUST-0009']);

      const emailDups = await pool.query("SELECT id FROM customers WHERE email = 'purchase@sunrise.com' ORDER BY id");
      assert.deepStrictEqual(emailDups.rows.map((r) => r.id), ['CUST-0002', 'CUST-0010']);
      } finally {
        await pool.end();
      }
    });
  }
});
