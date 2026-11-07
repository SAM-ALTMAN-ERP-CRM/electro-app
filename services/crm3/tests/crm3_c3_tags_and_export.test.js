const http = require('http');
const assert = require('assert');

// Spin up a test instance of the CRM-3 Express server
const app = require('../server');

async function runTestSuite() {
  console.log('=================================================================');
  console.log('🧪 CRM3-C3 Test Suite: Customer Tags & Segment CSV Export');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  function test(description, fn) {
    return async () => {
      try {
        await fn();
        console.log(`  ✓ PASS: ${description}`);
        passed++;
      } catch (err) {
        console.error(`  ✗ FAIL: ${description}`);
        console.error(`    Error: ${err.message}`);
        failed++;
      }
    };
  }

  // --- 1. Customer Tags Tests ---
  console.log('▶ [1/3] Testing Customer Tags (Add / List / Remove)...');

  await test('GET /api/customers/CUST-0001/tags returns initial tags array', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const json = await res.json();
    assert(Array.isArray(json.data), 'Expected json.data to be an array');
    assert(json.data.includes('VIP'), 'Expected CUST-0001 to have "VIP" tag');
  })();

  await test('POST /api/customers/CUST-0001/tags adds a new tag', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'High-Spender' })
    });
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.data.tag, 'High-Spender');
    assert.strictEqual(json.data.customer_id, 'CUST-0001');

    // Verify tag appears in list
    const listRes = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`);
    const listJson = await listRes.json();
    assert(listJson.data.includes('High-Spender'), 'Expected "High-Spender" in tags list');
  })();

  await test('POST /api/customers/CUST-0001/tags handles duplicate tag gracefully', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'High-Spender' })
    });
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  })();

  await test('POST /api/customers/CUST-0001/tags rejects empty tag with 400', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: '   ' })
    });
    assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
  })();

  await test('POST /api/customers/NON-EXISTENT/tags returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST-9999/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'TestTag' })
    });
    assert.strictEqual(res.status, 404, `Expected 404 Not Found, got ${res.status}`);
  })();

  await test('DELETE /api/customers/CUST-0001/tags/:tag removes tag', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST-0001/tags/High-Spender`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.data.tag, 'High-Spender');

    // Verify tag is no longer in list
    const listRes = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`);
    const listJson = await listRes.json();
    assert(!listJson.data.includes('High-Spender'), 'Expected "High-Spender" to be removed');
  })();

  await test('DELETE /api/customers/CUST-0001/tags with JSON body removes tag', async () => {
    // Add another tag first
    await fetch(`${baseUrl}/api/customers/CUST-0001/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'TemporaryTag' })
    });

    const res = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: 'TemporaryTag' })
    });
    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);

    const listRes = await fetch(`${baseUrl}/api/customers/CUST-0001/tags`);
    const listJson = await listRes.json();
    assert(!listJson.data.includes('TemporaryTag'), 'Expected "TemporaryTag" to be removed');
  })();

  // --- 2. Customer Detail Includes Tags ---
  console.log('\n▶ [2/3] Testing Customer Detail Includes Tags...');

  await test('GET /api/customers/CUST-0001 returns customer object with tags array', async () => {
    const res = await fetch(`${baseUrl}/api/customers/CUST-0001`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(json.data, 'Expected customer data');
    assert.strictEqual(json.data.id, 'CUST-0001');
    assert(Array.isArray(json.data.tags), 'Expected customer.tags to be an array');
    assert(json.data.tags.includes('VIP'), 'Expected "VIP" in customer.tags');
  })();

  // --- 3. Segments and CSV Export Tests ---
  console.log('\n▶ [3/3] Testing Segments and CSV Export (Excel Compatible)...');

  await test('GET /api/segments returns seed segments list', async () => {
    const res = await fetch(`${baseUrl}/api/segments`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(Array.isArray(json.data), 'Expected segments array');
    assert(json.data.length >= 4, 'Expected at least 4 seed segments');
    const corpSeg = json.data.find(s => s.id === 'SEG-0001');
    assert(corpSeg, 'Expected SEG-0001 to exist');
    assert.strictEqual(corpSeg.name, 'Corporate in Mumbai');
  })();

  await test('GET /api/segments/SEG-0001/customers returns matching customers', async () => {
    const res = await fetch(`${baseUrl}/api/segments/SEG-0001/customers`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert(Array.isArray(json.data), 'Expected customers array');
    assert(json.data.length >= 1, 'Expected at least 1 matching customer');
    // All matching customers must be corporate and in Mumbai
    for (const cust of json.data) {
      assert.strictEqual(cust.type.toLowerCase(), 'corporate');
      assert.strictEqual(cust.city.toLowerCase(), 'mumbai');
    }
  })();

  await test('GET /api/segments/SEG-0001/export.csv returns Excel-compatible CSV', async () => {
    const res = await fetch(`${baseUrl}/api/segments/SEG-0001/export.csv`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);

    // Check Headers
    const contentType = res.headers.get('content-type');
    assert(contentType && contentType.includes('text/csv'), `Expected text/csv, got ${contentType}`);
    assert(contentType.includes('utf-8'), `Expected utf-8 charset, got ${contentType}`);

    const contentDisp = res.headers.get('content-disposition');
    assert(contentDisp && contentDisp.includes('attachment'), `Expected attachment disposition, got ${contentDisp}`);
    assert(contentDisp.includes('segment-SEG-0001-export.csv'), `Expected filename in disposition, got ${contentDisp}`);

    // Check Content
    const arrayBuffer = await res.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    // Check UTF-8 BOM for Microsoft Excel compatibility (0xEF, 0xBB, 0xBF)
    assert.strictEqual(rawBuffer[0], 0xef, 'Expected 1st BOM byte to be 0xEF');
    assert.strictEqual(rawBuffer[1], 0xbb, 'Expected 2nd BOM byte to be 0xBB');
    assert.strictEqual(rawBuffer[2], 0xbf, 'Expected 3rd BOM byte to be 0xBF');

    const body = new TextDecoder('utf-8', { ignoreBOM: true }).decode(rawBuffer);
    assert(body.startsWith('\uFEFF'), 'Expected UTF-8 Byte Order Mark (\\uFEFF) at start of CSV for Excel');

    const lines = body.replace(/^\uFEFF/, '').trim().split('\r\n');
    assert(lines.length >= 2, 'Expected header and at least 1 data row');

    // Check exact columns required: name, email, phone, city
    assert.strictEqual(lines[0], 'name,email,phone,city', 'Header columns must be name,email,phone,city');

    // Check customer row data
    const row = lines[1];
    assert(row.includes('Sunrise Electronics'), 'Expected customer name in CSV row');
    assert(row.includes('Mumbai'), 'Expected customer city in CSV row');
  })();

  await test('GET /api/segments/SEG-0002/export.csv exports retail customers', async () => {
    const res = await fetch(`${baseUrl}/api/segments/SEG-0002/export.csv`);
    assert.strictEqual(res.status, 200);
    const arrayBuffer = await res.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);
    assert.strictEqual(rawBuffer[0], 0xef);
    assert.strictEqual(rawBuffer[1], 0xbb);
    assert.strictEqual(rawBuffer[2], 0xbf);

    const body = new TextDecoder('utf-8', { ignoreBOM: true }).decode(rawBuffer);
    const lines = body.replace(/^\uFEFF/, '').trim().split('\r\n');
    assert.strictEqual(lines[0], 'name,email,phone,city');
    assert(lines.length > 2, 'Retail segment should match multiple retail customers');
  })();

  await test('GET /api/segments/NON-EXISTENT/export.csv returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/segments/SEG-9999/export.csv`);
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
  })();

  server.close();

  console.log('\n=================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
