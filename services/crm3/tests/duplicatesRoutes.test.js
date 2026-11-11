const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Disable authentication requirement for tests
process.env.AUTH_REQUIRED = 'false';

const customersRouter = require('../routes/customers');
const duplicatesRouter = require('../routes/duplicates');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

const app = express();
app.use(express.json());
app.use('/api', customersRouter);
app.use('/api', duplicatesRouter);

let server;
let baseUrl;

async function request(method, path, body = null) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  return { status: res.status, body: data };
}

describe('CRM3-D1 Duplicate Detection & Atomic Customer Merge Tests', () => {

  before(async () => {
    duplicatesRouter.resetInMemoryData();

    // Re-seed database if PostgreSQL is active
    try {
      const probe = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
      await Promise.race([pool.query('SELECT 1'), probe]);
      const schemaSql = fs.readFileSync(path.resolve(__dirname, '../db/schema.sql'), 'utf-8');
      const seedSql = fs.readFileSync(path.resolve(__dirname, '../db/seed.sql'), 'utf-8');
      await pool.query(schemaSql);
      await pool.query(seedSql);
    } catch (err) {
      // Offline fallback
    }

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
    try {
      await pool.end();
    } catch (err) {}
    try {
      if (duplicatesRouter.pool && typeof duplicatesRouter.pool.end === 'function') {
        await duplicatesRouter.pool.end();
      }
    } catch (err) {}
    try {
      if (customersRouter.pool && typeof customersRouter.pool.end === 'function') {
        await customersRouter.pool.end();
      }
    } catch (err) {}
  });

  it('1. GET /api/customers/duplicates accurately detects the 2 Section 5 duplicate pairs', async () => {
    const res = await request('GET', '/api/customers/duplicates');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 2, 'Should detect exactly 2 duplicate groups initially');

    // Phone group: CUST-0001 & CUST-0009
    const phoneGroup = res.body.data.find(g => g.match_field === 'phone' || g.match_type === 'phone');
    assert.ok(phoneGroup, 'Phone duplicate group must be present');
    assert.equal(phoneGroup.match_value, '9820112345');
    assert.equal(phoneGroup.customers.length, 2);
    const phoneIds = phoneGroup.customers.map(c => c.id).sort();
    assert.deepEqual(phoneIds, ['CUST-0001', 'CUST-0009']);
    assert.ok(phoneGroup.customers[0].contacts_count !== undefined);

    // Email group: CUST-0002 & CUST-0010
    const emailGroup = res.body.data.find(g => g.match_field === 'email' || g.match_type === 'email');
    assert.ok(emailGroup, 'Email duplicate group must be present');
    assert.equal(emailGroup.match_value.toLowerCase(), 'purchase@sunrise.com');
    assert.equal(emailGroup.customers.length, 2);
    const emailIds = emailGroup.customers.map(c => c.id).sort();
    assert.deepEqual(emailIds, ['CUST-0002', 'CUST-0010']);
  });

  it('2. POST /api/customers/merge rejects invalid request inputs with 400 Bad Request', async () => {
    // Missing body
    const res1 = await request('POST', '/api/customers/merge', {});
    assert.equal(res1.status, 400);
    assert.ok(res1.body.error);

    // Missing remove_id
    const res2 = await request('POST', '/api/customers/merge', { keep_id: 'CUST-0001' });
    assert.equal(res2.status, 400);

    // Missing keep_id
    const res3 = await request('POST', '/api/customers/merge', { remove_id: 'CUST-0009' });
    assert.equal(res3.status, 400);

    // Empty strings
    const res4 = await request('POST', '/api/customers/merge', { keep_id: '   ', remove_id: 'CUST-0009' });
    assert.equal(res4.status, 400);

    // Self-merge attempt
    const res5 = await request('POST', '/api/customers/merge', { keep_id: 'CUST-0001', remove_id: 'CUST-0001' });
    assert.equal(res5.status, 400);
    assert.equal(res5.body.error, 'keep_id and remove_id cannot be the same customer');
  });

  it('3. POST /api/customers/merge returns 404 if either customer does not exist', async () => {
    const res1 = await request('POST', '/api/customers/merge', {
      keep_id: 'CUST-9999',
      remove_id: 'CUST-0009'
    });
    assert.equal(res1.status, 404);

    const res2 = await request('POST', '/api/customers/merge', {
      keep_id: 'CUST-0001',
      remove_id: 'CUST-9999'
    });
    assert.equal(res2.status, 404);
  });

  it('4. Done when: merging pair leaves one customer with all contacts combined', async () => {
    // Check initial contacts count
    const c1ContactsBefore = await request('GET', '/api/customers/CUST-0001/contacts');
    const c9ContactsBefore = await request('GET', '/api/customers/CUST-0009/contacts');
    const count1 = c1ContactsBefore.body.data.length;
    const count9 = c9ContactsBefore.body.data.length;
    assert.ok(count1 >= 1, 'CUST-0001 should have at least 1 contact');
    assert.ok(count9 >= 1, 'CUST-0009 should have at least 1 contact');

    // Merge CUST-0009 into CUST-0001
    const mergeRes = await request('POST', '/api/customers/merge', {
      keep_id: 'CUST-0001',
      remove_id: 'CUST-0009'
    });
    assert.equal(mergeRes.status, 200);
    assert.ok(mergeRes.body.data);
    assert.equal(mergeRes.body.data.keep_id, 'CUST-0001');
    assert.equal(mergeRes.body.data.remove_id, 'CUST-0009');
    assert.equal(mergeRes.body.data.contacts_moved, count9);

    // Verify surviving customer CUST-0001 has all contacts combined
    const c1ContactsAfter = await request('GET', '/api/customers/CUST-0001/contacts');
    assert.equal(c1ContactsAfter.status, 200);
    assert.equal(c1ContactsAfter.body.data.length, count1 + count9);

    // Verify remove_id customer CUST-0009 is deleted (404)
    const removedRes = await request('GET', '/api/customers/CUST-0009');
    assert.equal(removedRes.status, 404);
  });

  it('5. Merging skips duplicate tags cleanly and moves non-duplicate tags', async () => {
    // Verify tags on surviving CUST-0001
    const tagsRes = await request('GET', '/api/customers/CUST-0001/tags');
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

  it('6. Merged duplicate pair automatically disappears from GET /api/customers/duplicates', async () => {
    const res = await request('GET', '/api/customers/duplicates');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1, 'Only 1 duplicate group should remain');
    assert.equal(res.body.data[0].match_field, 'email', 'Remaining group should be the email duplicate group');
  });

  it('7. Merging second pair (CUST-0010 into CUST-0002) leaves zero duplicate groups', async () => {
    const c2ContactsBefore = await request('GET', '/api/customers/CUST-0002/contacts');
    const c10ContactsBefore = await request('GET', '/api/customers/CUST-0010/contacts');
    const count2 = c2ContactsBefore.body.data.length;
    const count10 = c10ContactsBefore.body.data.length;

    const mergeRes = await request('POST', '/api/customers/merge', {
      keep_id: 'CUST-0002',
      remove_id: 'CUST-0010'
    });
    assert.equal(mergeRes.status, 200);

    // Surviving CUST-0002 has all contacts combined
    const c2ContactsAfter = await request('GET', '/api/customers/CUST-0002/contacts');
    assert.equal(c2ContactsAfter.body.data.length, count2 + count10);

    // CUST-0010 is removed
    const removedRes = await request('GET', '/api/customers/CUST-0010');
    assert.equal(removedRes.status, 404);

    // Duplicates query now returns 0
    const finalDupRes = await request('GET', '/api/customers/duplicates');
    assert.equal(finalDupRes.status, 200);
    assert.equal(finalDupRes.body.data.length, 0, 'Customer master directory must be 100% clean and deduplicated');
  });

});
