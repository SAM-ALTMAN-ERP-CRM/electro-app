const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const schemaPath = path.resolve(__dirname, '../db/schema.sql');
const seedPath = path.resolve(__dirname, '../db/seed.sql');
const erDocPath = path.resolve(__dirname, '../../../docs/crm3/er-diagram.md');

test('CRM3-R2 Data Owner: Schema, Seed Contract & ER Diagram Verification Suite', async (t) => {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  const erDoc = fs.readFileSync(erDocPath, 'utf8');

  await t.test('1. Schema Definition & 3NF Structure Verification', () => {
    // Check sequences
    assert.match(schemaSql, /CREATE SEQUENCE IF NOT EXISTS customers_seq/i, 'customers_seq sequence defined');
    assert.match(schemaSql, /CREATE SEQUENCE IF NOT EXISTS contacts_seq/i, 'contacts_seq sequence defined');
    assert.match(schemaSql, /CREATE SEQUENCE IF NOT EXISTS interactions_seq/i, 'interactions_seq sequence defined');
    assert.match(schemaSql, /CREATE SEQUENCE IF NOT EXISTS segment_id_seq/i, 'segment_id_seq sequence defined');

    // Check tables
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS customers/i, 'customers table defined');
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS contacts/i, 'contacts table defined');
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS interactions/i, 'interactions table defined');
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS segments/i, 'segments table defined');
    assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS customer_tags/i, 'customer_tags table defined');

    // Check foreign keys and cascade rules
    assert.match(schemaSql, /REFERENCES customers\(id\) ON DELETE CASCADE/i, 'contacts references customers with cascade');
    assert.match(schemaSql, /PRIMARY KEY \(customer_id, tag\)/i, 'customer_tags has composite primary key');

    // Check constraints
    assert.match(schemaSql, /CHECK \(type IN \('retail', 'corporate', 'dealer'\)\)/i, 'customers.type check constraint present');
    assert.match(schemaSql, /CHECK \(type IN \('call', 'email', 'meeting', 'ticket', 'order', 'note'\)\)/i, 'interactions.type check constraint present');

    // Verify application-layer email uniqueness design (no unique constraint on customers.email)
    assert.doesNotMatch(schemaSql, /email\s+VARCHAR\([0-9]+\)\s+UNIQUE/i, 'email uniqueness should be in API code to allow duplicate merge seed');
  });

  await t.test('2. Section 5 Shared Seed Contract Verification', () => {
    // Check that all 10 Section 5 customers are present
    const expectedCustomers = [
      'CUST-0001', 'CUST-0002', 'CUST-0003', 'CUST-0004', 'CUST-0005',
      'CUST-0006', 'CUST-0007', 'CUST-0008', 'CUST-0009', 'CUST-0010'
    ];
    for (const custId of expectedCustomers) {
      assert.ok(seedSql.includes(custId), `Seed contains Section 5 customer: ${custId}`);
    }

    // Verify intentional phone duplicate (CUST-0001 & CUST-0009 share 9820011111)
    const phoneMatches = (seedSql.match(/9820011111/g) || []).length;
    assert.ok(phoneMatches >= 2, 'Phone 9820011111 shared between CUST-0001 and CUST-0009');

    // Verify intentional email duplicate (CUST-0002 & CUST-0010 share contact@sunrise.com)
    const emailMatches = (seedSql.match(/contact@sunrise\.com/g) || []).length;
    assert.ok(emailMatches >= 2, 'Email contact@sunrise.com shared between CUST-0002 and CUST-0010');

    // Verify corporate and dealer GSTINs
    assert.match(seedSql, /27AABCS1234F1Z5/, 'CUST-0002 corporate GSTIN present');
    assert.match(seedSql, /27AABCB9876E1Z2/, 'CUST-0004 dealer GSTIN present');
    assert.match(seedSql, /07AABCM5432D1Z9/, 'CUST-0006 corporate GSTIN present');
    assert.match(seedSql, /29AABCG1234H1Z1/, 'CUST-0008 dealer GSTIN present');

    // Verify cross-team identifiers in interactions
    assert.match(seedSql, /SKU-0001/, 'Product SKU-0001 referenced in seed interactions');
    assert.match(seedSql, /SKU-0002/, 'Product SKU-0002 referenced in seed interactions');
    assert.match(seedSql, /SKU-0003/, 'Product SKU-0003 referenced in seed interactions');
    assert.match(seedSql, /EMP-0001/, 'Employee EMP-0001 referenced in seed interactions');
    assert.match(seedSql, /EMP-0002/, 'Employee EMP-0002 referenced in seed interactions');
    assert.match(seedSql, /EMP-0003/, 'Employee EMP-0003 referenced in seed interactions');
    assert.match(seedSql, /EMP-0004/, 'Employee EMP-0004 referenced in seed interactions');
    assert.match(seedSql, /EMP-0005/, 'Employee EMP-0005 referenced in seed interactions');
    assert.match(seedSql, /EMP-0006/, 'Employee EMP-0006 referenced in seed interactions');
    assert.match(seedSql, /SO-0001/, 'Sales order SO-0001 referenced in seed interactions');
    assert.match(seedSql, /SO-0002/, 'Sales order SO-0002 referenced in seed interactions');

    // Verify 4 segments including Corporate in Mumbai
    assert.match(seedSql, /SEG-0001.+Corporate in Mumbai/i, 'Segment SEG-0001 Corporate in Mumbai present');
    assert.match(seedSql, /SEG-0002.+All Retail Customers/i, 'Segment SEG-0002 All Retail Customers present');
    assert.match(seedSql, /SEG-0003.+Dealers in Pune/i, 'Segment SEG-0003 Dealers in Pune present');
    assert.match(seedSql, /SEG-0004.+Delhi NCR Clients/i, 'Segment SEG-0004 Delhi NCR Clients present');

    // Verify sequence advance statements
    assert.match(seedSql, /setval\('customers_seq'/i, 'customers_seq advanced');
    assert.match(seedSql, /setval\('contacts_seq'/i, 'contacts_seq advanced');
    assert.match(seedSql, /setval\('interactions_seq'/i, 'interactions_seq advanced');
    assert.match(seedSql, /setval\('segment_id_seq'/i, 'segment_id_seq advanced');
  });

  await t.test('3. ER Diagram & Data Dictionary Documentation Verification', () => {
    assert.match(erDoc, /# Team CRM-3 \(Customer 360\) — Entity-Relationship \(ER\) Diagram & Data Dictionary/, 'Document title is present');
    assert.match(erDoc, /erDiagram/i, 'Mermaid erDiagram block is present');
    assert.match(erDoc, /CUSTOMERS \|\|--o\{ CONTACTS/i, 'CUSTOMERS -> CONTACTS relationship in Mermaid');
    assert.match(erDoc, /CUSTOMERS \|\|--o\{ INTERACTIONS/i, 'CUSTOMERS -> INTERACTIONS relationship in Mermaid');
    assert.match(erDoc, /CUSTOMERS \|\|--o\{ CUSTOMER_TAGS/i, 'CUSTOMERS -> CUSTOMER_TAGS relationship in Mermaid');
    assert.match(erDoc, /SEGMENTS \|\|\.\.o\{ CUSTOMERS/i, 'SEGMENTS -> CUSTOMERS relationship in Mermaid');

    // Verify Data Dictionary sections for all 5 tables
    assert.match(erDoc, /### 4\.1 Table: `customers`/i, 'Data dictionary has customers');
    assert.match(erDoc, /### 4\.2 Table: `contacts`/i, 'Data dictionary has contacts');
    assert.match(erDoc, /### 4\.3 Table: `interactions`/i, 'Data dictionary has interactions');
    assert.match(erDoc, /### 4\.4 Table: `segments`/i, 'Data dictionary has segments');
    assert.match(erDoc, /### 4\.5 Table: `customer_tags`/i, 'Data dictionary has customer_tags');

    // Verify 3NF justification section
    assert.match(erDoc, /3NF NORMALIZATION PROOF/i, '3NF proof section is present');
    assert.match(erDoc, /Section 5 Shared Seed Contract Compliance/i, 'Section 5 compliance section is present');
  });

  await t.test('4. Live PostgreSQL crm3_db Reset & Contract Execution', async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL_CRM3 || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/crm3_db',
      connectionTimeoutMillis: 2000
    });

    let pgAvailable = false;
    try {
      await pool.query('SELECT 1');
      pgAvailable = true;
    } catch (err) {
      console.log('    [NOTE] PostgreSQL not reachable in this environment; skipping live DB execution test.');
      await pool.end();
      return;
    }

    if (pgAvailable) {
      // 1. Clean reset
      await pool.query('DROP TABLE IF EXISTS customer_tags CASCADE');
      await pool.query('DROP TABLE IF EXISTS interactions CASCADE');
      await pool.query('DROP TABLE IF EXISTS contacts CASCADE');
      await pool.query('DROP TABLE IF EXISTS segments CASCADE');
      await pool.query('DROP TABLE IF EXISTS customers CASCADE');
      await pool.query('DROP SEQUENCE IF EXISTS customers_seq CASCADE');
      await pool.query('DROP SEQUENCE IF EXISTS contacts_seq CASCADE');
      await pool.query('DROP SEQUENCE IF EXISTS interactions_seq CASCADE');
      await pool.query('DROP SEQUENCE IF EXISTS segment_id_seq CASCADE');

      // 2. Apply schema
      await pool.query(schemaSql);

      // 3. Apply seed
      await pool.query(seedSql);

      // 4. Verify exact row counts
      const custRes = await pool.query('SELECT count(*) FROM customers');
      const contRes = await pool.query('SELECT count(*) FROM contacts');
      const intRes = await pool.query('SELECT count(*) FROM interactions');
      const segRes = await pool.query('SELECT count(*) FROM segments');
      const tagRes = await pool.query('SELECT count(*) FROM customer_tags');

      assert.strictEqual(parseInt(custRes.rows[0].count, 10), 10, 'Exactly 10 customers seeded');
      assert.strictEqual(parseInt(contRes.rows[0].count, 10), 15, 'Exactly 15 contacts seeded');
      assert.strictEqual(parseInt(intRes.rows[0].count, 10), 12, '12 interactions seeded (10 baseline + 2 duplicates)');
      assert.strictEqual(parseInt(segRes.rows[0].count, 10), 4, 'Exactly 4 segments seeded');
      assert.strictEqual(parseInt(tagRes.rows[0].count, 10), 14, 'Exactly 14 customer tags seeded');

      // 5. Verify dynamic segment matching for "Corporate in Mumbai"
      const matchRes = await pool.query(`
        SELECT c.id, c.name, c.type, c.city 
        FROM customers c 
        WHERE c.type = 'corporate' AND c.city = 'Mumbai'
      `);
      assert.strictEqual(matchRes.rows.length, 1, 'Corporate in Mumbai matches exactly 1 customer');
      assert.strictEqual(matchRes.rows[0].id, 'CUST-0002', 'Corporate in Mumbai matches CUST-0002 only');

      // 6. Verify duplicate detection query matches
      const phoneDupRes = await pool.query(`
        SELECT array_agg(id ORDER BY id) as ids FROM customers WHERE phone = '9820011111'
      `);
      assert.deepStrictEqual(phoneDupRes.rows[0].ids, ['CUST-0001', 'CUST-0009'], 'Phone duplicate matches CUST-0001 and CUST-0009');

      const emailDupRes = await pool.query(`
        SELECT array_agg(id ORDER BY id) as ids FROM customers WHERE email = 'contact@sunrise.com'
      `);
      assert.deepStrictEqual(emailDupRes.rows[0].ids, ['CUST-0002', 'CUST-0010'], 'Email duplicate matches CUST-0002 and CUST-0010');

      // 7. Verify Idempotency of seed.sql
      await pool.query(seedSql);
      const custReCount = await pool.query('SELECT count(*) FROM customers');
      assert.strictEqual(parseInt(custReCount.rows[0].count, 10), 10, 'Idempotent seed re-run maintains 10 customers');

      await pool.end();
    }
  });
});
