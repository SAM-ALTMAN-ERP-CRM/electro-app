const assert = require('assert');
const http = require('http');
const express = require('express');
const duplicatesRouter = require('../routes/duplicates');

const app = express();
app.use(express.json());
app.use('/api', duplicatesRouter);

let server;
let baseUrl;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   CRM3-D1 TEST SUITE: DUPLICATE DETECTION & MERGE API        ');
  console.log('===============================================================\n');

  // Reset in-memory data before running tests
  if (typeof duplicatesRouter.resetInMemoryData === 'function') {
    duplicatesRouter.resetInMemoryData();
  }

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[SETUP] Test server running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: GET /api/customers/duplicates - Initial Detection
    // -------------------------------------------------------------------------
    console.log('[TEST 1] GET /api/customers/duplicates: Detecting initial duplicate pairs...');
    const res1 = await request('GET', '/api/customers/duplicates');
    assert.strictEqual(res1.status, 200, `Expected 200, got ${res1.status}`);
    assert.ok(res1.body.data, 'Expected response to have data array');
    assert.strictEqual(res1.body.data.length, 2, `Expected 2 duplicate groups, got ${res1.body.data.length}`);

    // Verify Phone Duplicate Group (CUST-0001 & CUST-0009)
    const phoneGroup = res1.body.data.find(g => g.match_field === 'phone');
    assert.ok(phoneGroup, 'Expected a phone duplicate group');
    assert.strictEqual(phoneGroup.match_value, '9820112345');
    assert.strictEqual(phoneGroup.customers.length, 2);
    const phoneCustomerIds = phoneGroup.customers.map(c => c.id).sort();
    assert.deepStrictEqual(phoneCustomerIds, ['CUST-0001', 'CUST-0009']);
    console.log('  ✓ Phone duplicate group correctly detected (CUST-0001 & CUST-0009 with phone 9820112345)');

    // Verify Email Duplicate Group (CUST-0002 & CUST-0010)
    const emailGroup = res1.body.data.find(g => g.match_field === 'email');
    assert.ok(emailGroup, 'Expected an email duplicate group');
    assert.strictEqual(emailGroup.match_value.toLowerCase(), 'purchase@sunrise.com');
    assert.strictEqual(emailGroup.customers.length, 2);
    const emailCustomerIds = emailGroup.customers.map(c => c.id).sort();
    assert.deepStrictEqual(emailCustomerIds, ['CUST-0002', 'CUST-0010']);
    console.log('  ✓ Email duplicate group correctly detected (CUST-0002 & CUST-0010 with email purchase@sunrise.com)');

    // -------------------------------------------------------------------------
    // TEST 2: Validation on POST /api/customers/merge
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Validation: POST /api/customers/merge rejection checks...');
    const resBad1 = await request('POST', '/api/customers/merge', { keep_id: 'CUST-0001' });
    assert.strictEqual(resBad1.status, 400, `Expected 400 for missing remove_id, got ${resBad1.status}`);

    const resBad2 = await request('POST', '/api/customers/merge', { remove_id: 'CUST-0009' });
    assert.strictEqual(resBad2.status, 400, `Expected 400 for missing keep_id, got ${resBad2.status}`);

    const resBad3 = await request('POST', '/api/customers/merge', { keep_id: 'CUST-0001', remove_id: 'CUST-0001' });
    assert.strictEqual(resBad3.status, 400, `Expected 400 for identical keep_id and remove_id, got ${resBad3.status}`);

    const res404Keep = await request('POST', '/api/customers/merge', { keep_id: 'CUST-9999', remove_id: 'CUST-0009' });
    assert.strictEqual(res404Keep.status, 404, `Expected 404 for nonexistent keep_id, got ${res404Keep.status}`);

    const res404Remove = await request('POST', '/api/customers/merge', { keep_id: 'CUST-0001', remove_id: 'CUST-9999' });
    assert.strictEqual(res404Remove.status, 404, `Expected 404 for nonexistent remove_id, got ${res404Remove.status}`);
    console.log('  ✓ Malformed requests and nonexistent records correctly rejected (400 and 404)');

    // -------------------------------------------------------------------------
    // TEST 3: Pre-Merge Verification of Contacts, Interactions & Tags
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Pre-Merge state verification for CUST-0001 and CUST-0009...');
    const cust1Contacts = await request('GET', '/api/customers/CUST-0001/contacts');
    assert.strictEqual(cust1Contacts.body.data.length, 1, 'CUST-0001 should start with 1 contact');
    const cust9Contacts = await request('GET', '/api/customers/CUST-0009/contacts');
    assert.strictEqual(cust9Contacts.body.data.length, 1, 'CUST-0009 should start with 1 contact');

    const cust1Tags = await request('GET', '/api/customers/CUST-0001/tags');
    assert.deepStrictEqual(cust1Tags.body.data.sort(), ['Priority Support', 'VIP']);
    const cust9Tags = await request('GET', '/api/customers/CUST-0009/tags');
    assert.deepStrictEqual(cust9Tags.body.data.sort(), ['Branch Customer', 'Priority Support']);
    console.log('  ✓ Pre-merge contacts and tags verified (CUST-0001 has 1 contact, CUST-0009 has 1 contact)');

    // -------------------------------------------------------------------------
    // TEST 4: Acceptance Criterion: Merging Pair Leaves One Customer with All Contacts
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Acceptance Criterion: Merging CUST-0009 into CUST-0001...');
    const mergeRes1 = await request('POST', '/api/customers/merge', {
      keep_id: 'CUST-0001',
      remove_id: 'CUST-0009'
    });
    assert.strictEqual(mergeRes1.status, 200, `Expected 200 on merge, got ${mergeRes1.status}`);
    assert.ok(mergeRes1.body.data, 'Expected response to have data payload');
    assert.strictEqual(mergeRes1.body.data.keep_id, 'CUST-0001');
    assert.strictEqual(mergeRes1.body.data.remove_id, 'CUST-0009');

    // Verify all contacts moved to CUST-0001
    const postMergeContacts = await request('GET', '/api/customers/CUST-0001/contacts');
    assert.strictEqual(postMergeContacts.status, 200);
    assert.strictEqual(postMergeContacts.body.data.length, 2, 'CUST-0001 must now have both contacts (CON-0001 and CON-0010)');
    const contactIds = postMergeContacts.body.data.map(c => c.id).sort();
    assert.deepStrictEqual(contactIds, ['CON-0001', 'CON-0010']);
    console.log('  ✓ Acceptance Criterion Passed: Merging pair leaves CUST-0001 with all contacts (CON-0001 & CON-0010)!');

    // Verify remove_id customer is deleted
    const removedCustRes = await request('GET', '/api/customers/CUST-0009');
    assert.strictEqual(removedCustRes.status, 404, 'CUST-0009 must be deleted after merge');
    console.log('  ✓ Customer CUST-0009 successfully removed (returns 404)');

    // Verify tags consolidated with duplicates skipped
    const postMergeTags = await request('GET', '/api/customers/CUST-0001/tags');
    assert.deepStrictEqual(postMergeTags.body.data.sort(), ['Branch Customer', 'Priority Support', 'VIP']);
    console.log('  ✓ Tags consolidated and duplicate tag "Priority Support" successfully skipped!');

    // -------------------------------------------------------------------------
    // TEST 5: Verify Merged Duplicate Group Disappears from Duplicates List
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Verify Duplicate Detection refresh after first merge...');
    const res2 = await request('GET', '/api/customers/duplicates');
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.data.length, 1, `Expected 1 group remaining, got ${res2.body.data.length}`);
    assert.strictEqual(res2.body.data[0].match_field, 'email', 'Remaining group should be email group');
    console.log('  ✓ Phone duplicate group disappeared; exactly 1 group remaining');

    // -------------------------------------------------------------------------
    // TEST 6: Execute Merge on Second Pair (CUST-0010 into CUST-0002)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Merging second pair: CUST-0010 into CUST-0002...');
    const mergeRes2 = await request('POST', '/api/customers/merge', {
      keep_id: 'CUST-0002',
      remove_id: 'CUST-0010'
    });
    assert.strictEqual(mergeRes2.status, 200);

    const postMergeContacts2 = await request('GET', '/api/customers/CUST-0002/contacts');
    assert.strictEqual(postMergeContacts2.body.data.length, 3, 'CUST-0002 must now have all 3 contacts');
    const contactIds2 = postMergeContacts2.body.data.map(c => c.id).sort();
    assert.deepStrictEqual(contactIds2, ['CON-0002', 'CON-0003', 'CON-0011']);

    const removedCustRes2 = await request('GET', '/api/customers/CUST-0010');
    assert.strictEqual(removedCustRes2.status, 404, 'CUST-0010 must be deleted');

    const postMergeTags2 = await request('GET', '/api/customers/CUST-0002/tags');
    assert.deepStrictEqual(postMergeTags2.body.data.sort(), ['Corporate Account', 'High Value', 'Regional Branch']);
    console.log('  ✓ Second merge succeeded: CUST-0002 has 3 contacts, tags deduplicated, CUST-0010 deleted');

    // -------------------------------------------------------------------------
    // TEST 7: Verify All Duplicate Groups Cleared
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Verify all duplicate groups cleared...');
    const res3 = await request('GET', '/api/customers/duplicates');
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(res3.body.data.length, 0, `Expected 0 duplicate groups, got ${res3.body.data.length}`);
    console.log('  ✓ Database 100% clean and deduplicated (0 duplicate groups remaining)!');

    console.log('\n===============================================================');
    console.log('   ALL 7 TESTS PASSED SUCCESSFULLY (CRM3-D1 VERIFIED)          ');
    console.log('===============================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ TEST FAILED:', err);
    if (server) server.close();
    process.exit(1);
  });
