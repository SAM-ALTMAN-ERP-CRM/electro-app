const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Disable authentication requirement for tests
process.env.AUTH_REQUIRED = 'false';

const customersRouter = require('../routes/customers');
const duplicatesRouter = require('../routes/duplicates');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

/**
 * Setup test application mounting routers on /api matching server.js behavior
 */
const app = express();
app.use(express.json());
app.use('/api', customersRouter);
app.use('/api', duplicatesRouter);

/**
 * Lightweight in-memory HTTP dispatcher for Express tests without network binding
 */
function request(appInstance, method, url, body = null) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = { 'content-type': 'application/json' };
    req.body = body || {};
    req.query = {};
    req.params = {};
    req.user = { id: 'USR-0001', name: 'Test Admin', role: 'admin' };

    let statusCode = 200;
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
      },
      json(payload) {
        resolve({ status: statusCode, body: payload });
        return this;
      },
      end(data) {
        resolve({ status: statusCode, body: data });
        return this;
      }
    };

    appInstance.handle(req, res, (err) => {
      if (err) {
        resolve({ status: err.status || 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not Found' } });
      }
    });
  });
}

async function reseedDatabase() {
  if (typeof duplicatesRouter.resetInMemoryData === 'function') {
    duplicatesRouter.resetInMemoryData();
  }
  try {
    const probe = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500));
    await Promise.race([pool.query('SELECT 1'), probe]);
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
    const seedSql = fs.readFileSync(path.resolve(__dirname, '../db/seed.sql'), 'utf-8');
    await pool.query(schemaSql);
    await pool.query('DELETE FROM customer_tags;');
    await pool.query('DELETE FROM interactions;');
    await pool.query('DELETE FROM contacts;');
    await pool.query('DELETE FROM segments;');
    await pool.query('DELETE FROM customers;');
    await pool.query(seedSql);
    // Ensure test tags for CUST-0009 and CUST-0010 exist for duplicate merge verification
    await pool.query(`
      INSERT INTO customer_tags (customer_id, tag)
      VALUES
        ('CUST-0009', 'Priority Support'),
        ('CUST-0009', 'Branch Customer'),
        ('CUST-0010', 'High Value'),
        ('CUST-0010', 'Regional Branch')
      ON CONFLICT DO NOTHING;
    `);
  } catch (err) {
    // Offline mode
  }
}

test('CRM3-D2 Duplicates API & Screen Merge Suite', async (t) => {
  await reseedDatabase();

  await t.test('1. GET /api/customers/duplicates: Accurately detects Section 5 duplicate pairs', async () => {
    const res = await request(app, 'GET', '/api/customers/duplicates');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2, 'Should detect exactly 2 duplicate groups initially');

    // Phone group: CUST-0001 & CUST-0009
    const phoneGroup = res.body.data.find(g => g.match_field === 'phone');
    assert.ok(phoneGroup, 'Phone duplicate group must be present');
    assert.equal(phoneGroup.match_value, '9820112345');
    assert.equal(phoneGroup.customers.length, 2);
    const phoneIds = phoneGroup.customers.map(c => c.id).sort();
    assert.deepEqual(phoneIds, ['CUST-0001', 'CUST-0009']);
    assert.ok(phoneGroup.customers[0].contacts_count !== undefined);

    // Email group: CUST-0002 & CUST-0010
    const emailGroup = res.body.data.find(g => g.match_field === 'email');
    assert.ok(emailGroup, 'Email duplicate group must be present');
    assert.equal(emailGroup.match_value.toLowerCase(), 'purchase@sunrise.com');
    assert.equal(emailGroup.customers.length, 2);
    const emailIds = emailGroup.customers.map(c => c.id).sort();
    assert.deepEqual(emailIds, ['CUST-0002', 'CUST-0010']);
  });

  await t.test('2. POST /api/customers/merge: Rejects invalid request inputs with 400 Bad Request', async () => {
    // Missing body
    const res1 = await request(app, 'POST', '/api/customers/merge', {});
    assert.equal(res1.status, 400);
    assert.ok(res1.body.error);

    // Missing remove_id
    const res2 = await request(app, 'POST', '/api/customers/merge', { keep_id: 'CUST-0001' });
    assert.equal(res2.status, 400);

    // Missing keep_id
    const res3 = await request(app, 'POST', '/api/customers/merge', { remove_id: 'CUST-0009' });
    assert.equal(res3.status, 400);

    // Empty strings
    const res4 = await request(app, 'POST', '/api/customers/merge', { keep_id: '   ', remove_id: 'CUST-0009' });
    assert.equal(res4.status, 400);

    // Self-merge attempt
    const res5 = await request(app, 'POST', '/api/customers/merge', { keep_id: 'CUST-0001', remove_id: 'CUST-0001' });
    assert.equal(res5.status, 400);
    assert.equal(res5.body.error, 'keep_id and remove_id cannot be the same customer');
  });

  await t.test('3. POST /api/customers/merge: Returns 404 if either customer does not exist', async () => {
    const res1 = await request(app, 'POST', '/api/customers/merge', {
      keep_id: 'CUST-9999',
      remove_id: 'CUST-0009'
    });
    assert.equal(res1.status, 404);

    const res2 = await request(app, 'POST', '/api/customers/merge', {
      keep_id: 'CUST-0001',
      remove_id: 'CUST-9999'
    });
    assert.equal(res2.status, 404);
  });

  await t.test('4. Done when: Merging pair leaves surviving customer with all contacts combined', async () => {
    // Check initial contacts count
    const c1ContactsBefore = await request(app, 'GET', '/api/customers/CUST-0001/contacts');
    const c9ContactsBefore = await request(app, 'GET', '/api/customers/CUST-0009/contacts');
    const count1 = c1ContactsBefore.body.data.length;
    const count9 = c9ContactsBefore.body.data.length;
    assert.ok(count1 >= 1, 'CUST-0001 should have at least 1 contact');
    assert.ok(count9 >= 1, 'CUST-0009 should have at least 1 contact');

    // Merge CUST-0009 into CUST-0001
    const mergeRes = await request(app, 'POST', '/api/customers/merge', {
      keep_id: 'CUST-0001',
      remove_id: 'CUST-0009'
    });
    assert.equal(mergeRes.status, 200);
    assert.ok(mergeRes.body.data);
    assert.equal(mergeRes.body.data.keep_id, 'CUST-0001');
    assert.equal(mergeRes.body.data.remove_id, 'CUST-0009');
    assert.equal(mergeRes.body.data.contacts_moved, count9);

    // Verify surviving customer CUST-0001 has all contacts combined
    const c1ContactsAfter = await request(app, 'GET', '/api/customers/CUST-0001/contacts');
    assert.equal(c1ContactsAfter.status, 200);
    assert.equal(c1ContactsAfter.body.data.length, count1 + count9);

    // Verify remove_id customer CUST-0009 is deleted (404)
    const removedRes = await request(app, 'GET', '/api/customers/CUST-0009');
    assert.equal(removedRes.status, 404);
  });

  await t.test('5. Merging skips duplicate tags cleanly and moves non-duplicate tags', async () => {
    // Verify tags on surviving CUST-0001
    const tagsRes = await request(app, 'GET', '/api/customers/CUST-0001/tags');
    assert.equal(tagsRes.status, 200);
    const tags = tagsRes.body.data;
    assert.ok(Array.isArray(tags));

    // Must have VIP, Priority Support, and Branch Customer (moved from CUST-0009)
    assert.ok(tags.includes('VIP'));
    assert.ok(tags.includes('Priority Support'));
    assert.ok(tags.includes('Branch Customer'));

    // Duplicate tag 'Priority Support' must not appear twice
    const priorityCount = tags.filter(t => t === 'Priority Support').length;
    assert.equal(priorityCount, 1, 'Duplicate tag must be skipped and only appear once');
  });

  await t.test('6. Merged duplicate pair automatically disappears from GET /api/customers/duplicates', async () => {
    const res = await request(app, 'GET', '/api/customers/duplicates');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1, 'Only 1 duplicate group should remain');
    assert.equal(res.body.data[0].match_field, 'email', 'Remaining group should be the email duplicate group');
  });

  await t.test('7. Merging second pair (CUST-0010 into CUST-0002) leaves zero duplicate groups', async () => {
    const c2ContactsBefore = await request(app, 'GET', '/api/customers/CUST-0002/contacts');
    const c10ContactsBefore = await request(app, 'GET', '/api/customers/CUST-0010/contacts');
    const count2 = c2ContactsBefore.body.data.length;
    const count10 = c10ContactsBefore.body.data.length;

    const mergeRes = await request(app, 'POST', '/api/customers/merge', {
      keep_id: 'CUST-0002',
      remove_id: 'CUST-0010'
    });
    assert.equal(mergeRes.status, 200);

    // Surviving CUST-0002 has all contacts combined
    const c2ContactsAfter = await request(app, 'GET', '/api/customers/CUST-0002/contacts');
    assert.equal(c2ContactsAfter.body.data.length, count2 + count10);

    // CUST-0010 is removed
    const removedRes = await request(app, 'GET', '/api/customers/CUST-0010');
    assert.equal(removedRes.status, 404);

    // Tags on CUST-0002 consolidated with duplicate High Value skipped
    const tags2Res = await request(app, 'GET', '/api/customers/CUST-0002/tags');
    assert.equal(tags2Res.status, 200);
    assert.deepEqual(tags2Res.body.data.sort(), ['Corporate Tier 1', 'High Value', 'Regional Branch']);

    // Duplicates query now returns 0
    const finalDupRes = await request(app, 'GET', '/api/customers/duplicates');
    assert.equal(finalDupRes.status, 200);
    assert.equal(finalDupRes.body.data.length, 0, 'Customer master directory must be 100% clean and deduplicated');
  });

  // Re-seed DB after tests to leave it in clean seed state
  await reseedDatabase();

});
