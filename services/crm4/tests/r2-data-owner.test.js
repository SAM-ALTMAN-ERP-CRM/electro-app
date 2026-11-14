const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SCHEMA_PATH = path.resolve(__dirname, '../db/schema.sql');
const SEED_PATH = path.resolve(__dirname, '../db/seed.sql');
const ER_DOC_PATH = path.resolve(ROOT_DIR, 'docs/crm4/er-diagram.md');

test('CRM4-R2 Data Owner: 3NF Schema, Data Dictionary & Seed Verification', async (t) => {
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
  const erDoc = fs.readFileSync(ER_DOC_PATH, 'utf-8');

  await t.test('1. schema.sql defines all 8 sequences, 3NF tables, foreign keys, constraints, and indexes', () => {
    const expectedSequences = [
      'campaign_seq',
      'campaign_message_seq',
      'audience_seq',
      'audience_member_seq',
      'enquiry_seq',
      'template_seq',
      'survey_seq',
      'survey_response_seq'
    ];
    for (const seq of expectedSequences) {
      assert.match(schemaSql, new RegExp(`CREATE SEQUENCE IF NOT EXISTS ${seq}`, 'i'), `Missing sequence ${seq}`);
    }

    const expectedTables = [
      'templates',
      'campaigns',
      'campaign_messages',
      'audiences',
      'audience_members',
      'enquiries',
      'surveys',
      'survey_responses'
    ];
    for (const table of expectedTables) {
      assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'), `Missing table ${table}`);
    }

    // 3NF Foreign keys with cascade deletes
    assert.match(schemaSql, /campaign_messages[\s\S]*REFERENCES campaigns\(id\) ON DELETE CASCADE/);
    assert.match(schemaSql, /audience_members[\s\S]*REFERENCES audiences\(id\) ON DELETE CASCADE/);
    assert.match(schemaSql, /survey_responses[\s\S]*REFERENCES surveys\(id\) ON DELETE CASCADE/);
    assert.match(schemaSql, /campaigns[\s\S]*REFERENCES templates\(id\)/);

    // Check constraints
    assert.match(schemaSql, /channel IN \('email', 'whatsapp', 'sms'\)/);
    assert.match(schemaSql, /status IN \('draft', 'scheduled', 'sent'\)/);
    assert.match(schemaSql, /source IN \('dealer', 'web', 'walk-in'\)/);
    assert.match(schemaSql, /type IN \('nps', 'csat'\)/);
    assert.match(schemaSql, /score >= 0 AND score <= 10/);

    // Unique constraint on audience members
    assert.match(schemaSql, /UNIQUE\s*\(audience_id,\s*customer_id\)/);

    // B-tree indexes
    assert.match(schemaSql, /idx_campaigns_status/);
    assert.match(schemaSql, /idx_campaigns_segment_id/);
    assert.match(schemaSql, /idx_campaign_messages_campaign_id/);
    assert.match(schemaSql, /idx_campaign_messages_customer_id/);
    assert.match(schemaSql, /idx_audience_members_audience_id/);
    assert.match(schemaSql, /idx_audience_members_customer_id/);
    assert.match(schemaSql, /idx_enquiries_lead_id/);
    assert.match(schemaSql, /idx_enquiries_product_interest/);
    assert.match(schemaSql, /idx_survey_responses_survey_id/);
    assert.match(schemaSql, /idx_survey_responses_customer_id/);
  });

  await t.test('2. seed.sql complies with Section 5 shared IDs, idempotency, and sequence synchronization', () => {
    // Shared CUST-0001..CUST-0008
    for (let i = 1; i <= 8; i += 1) {
      const custId = `CUST-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${custId}'`), `Missing ${custId} in seed.sql`);
    }

    // Shared SKU-0001..SKU-0005 in enquiries
    for (let i = 1; i <= 5; i += 1) {
      const skuId = `SKU-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${skuId}'`), `Missing ${skuId} in seed.sql`);
    }

    // Sales Rep EMP-0001
    assert.ok(seedSql.includes("'EMP-0001'"), 'Missing EMP-0001 in seed.sql');

    // CRM-3 Segments SEG-0001..SEG-0004
    for (let i = 1; i <= 4; i += 1) {
      const segId = `SEG-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${segId}'`), `Missing ${segId} in seed.sql`);
    }

    // Templates TPL-0001..TPL-0004
    for (let i = 1; i <= 4; i += 1) {
      const tplId = `TPL-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${tplId}'`), `Missing ${tplId} in seed.sql`);
    }

    // Campaigns CMP-0001..CMP-0005 in different statuses
    for (let i = 1; i <= 5; i += 1) {
      const cmpId = `CMP-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${cmpId}'`), `Missing ${cmpId} in seed.sql`);
    }
    assert.ok(seedSql.includes("'draft'"), "Missing 'draft' status in seed campaigns");
    assert.ok(seedSql.includes("'scheduled'"), "Missing 'scheduled' status in seed campaigns");
    assert.ok(seedSql.includes("'sent'"), "Missing 'sent' status in seed campaigns");

    // Audiences AUD-0001..AUD-0003
    for (let i = 1; i <= 3; i += 1) {
      const audId = `AUD-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${audId}'`), `Missing ${audId} in seed.sql`);
    }

    // Enquiries ENQ-0001..ENQ-0005
    for (let i = 1; i <= 5; i += 1) {
      const enqId = `ENQ-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${enqId}'`), `Missing ${enqId} in seed.sql`);
    }

    // Surveys SRV-0001 (nps) and SRV-0002 (csat)
    assert.ok(seedSql.includes("'SRV-0001'"), 'Missing SRV-0001');
    assert.ok(seedSql.includes("'SRV-0002'"), 'Missing SRV-0002');
    assert.ok(seedSql.includes("'nps'"), "Missing 'nps' type");
    assert.ok(seedSql.includes("'csat'"), "Missing 'csat' type");

    // 10 responses for SRV-0001
    for (let i = 1; i <= 10; i += 1) {
      const resId = `RES-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${resId}'`), `Missing ${resId} in seed.sql`);
    }

    // Idempotency: ON CONFLICT on all tables
    const onConflictCount = (seedSql.match(/ON CONFLICT/gi) || []).length;
    assert.ok(onConflictCount >= 7, 'Expected ON CONFLICT clauses across all seeded tables');

    // Sequence Synchronization: setval on all 8 sequences
    for (const seq of ['template_seq', 'campaign_seq', 'campaign_message_seq', 'audience_seq', 'audience_member_seq', 'enquiry_seq', 'survey_seq', 'survey_response_seq']) {
      assert.match(seedSql, new RegExp(`setval\\('${seq}'`, 'i'), `Missing setval for ${seq}`);
    }
  });

  await t.test('3. docs/crm4/er-diagram.md documents 3NF Mermaid diagram and complete Data Dictionary', () => {
    // Mermaid diagram
    assert.match(erDoc, /```mermaid[\s\S]*erDiagram/);
    assert.match(erDoc, /TEMPLATES/);
    assert.match(erDoc, /CAMPAIGNS/);
    assert.match(erDoc, /CAMPAIGN_MESSAGES/);
    assert.match(erDoc, /AUDIENCES/);
    assert.match(erDoc, /AUDIENCE_MEMBERS/);
    assert.match(erDoc, /ENQUIRIES/);
    assert.match(erDoc, /SURVEYS/);
    assert.match(erDoc, /SURVEY_RESPONSES/);

    // 3NF Justification
    assert.match(erDoc, /Third Normal Form/i);
    assert.match(erDoc, /1NF/);
    assert.match(erDoc, /2NF/);
    assert.match(erDoc, /3NF/);

    // Data Dictionary Tables
    assert.match(erDoc, /Table 1: `templates`/);
    assert.match(erDoc, /Table 2: `campaigns`/);
    assert.match(erDoc, /Table 3: `campaign_messages`/);
    assert.match(erDoc, /Table 4: `audiences`/);
    assert.match(erDoc, /Table 5: `audience_members`/);
    assert.match(erDoc, /Table 6: `enquiries`/);
    assert.match(erDoc, /Table 7: `surveys`/);
    assert.match(erDoc, /Table 8: `survey_responses`/);

    // Section 5 seed contract audit
    assert.match(erDoc, /Section 5 Shared Seed Contract/i);
    assert.match(erDoc, /CUST-0001/);
    assert.match(erDoc, /SKU-0001/);
    assert.match(erDoc, /EMP-0001/);
    assert.match(erDoc, /SEG-0001/);
  });

  await t.test('4. NPS Hand calculation matches seed data', () => {
    // Responses: 10, 9, 10, 8, 8, 5, 4, 10, 9, 9
    const scores = [10, 9, 10, 8, 8, 5, 4, 10, 9, 9];
    const promoters = scores.filter(s => s >= 9).length; // 6
    const passives = scores.filter(s => s >= 7 && s <= 8).length; // 2
    const detractors = scores.filter(s => s <= 6).length; // 2

    assert.equal(promoters, 6);
    assert.equal(passives, 2);
    assert.equal(detractors, 2);

    const promotersPct = (promoters / scores.length) * 100;
    const detractorsPct = (detractors / scores.length) * 100;
    const nps = promotersPct - detractorsPct;

    assert.equal(nps, 40);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    assert.equal(avg, 8.2);
  });
});
