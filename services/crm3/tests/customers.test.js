const http = require('http');
const app = require('../server');
const { makePool } = require('../../_shared/db');

const pool = makePool('crm3_db');

async function runTests() {
  console.log('=== STARTING CRM3 CUSTOMERS & CONTACTS API TESTS ===\n');

  // Start app on test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    console.log('\n--- 1. Health Check ---');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns 200');
    assert(healthJson.team === 'crm3', 'Health returns team crm3');

    // 2. GET /api/customers (list all 10 seed customers)
    console.log('\n--- 2. GET /api/customers ---');
    const listRes = await fetch(`${baseUrl}/api/customers`);
    const listJson = await listRes.json();
    assert(listRes.status === 200, 'GET /api/customers returns 200');
    assert(Array.isArray(listJson.data), 'Returns data array');
    assert(listJson.data.length >= 10, `Returns at least 10 seed customers (got ${listJson.data.length})`);
    
    // Verify first 10 customers match seed contract
    const cust1 = listJson.data.find(c => c.id === 'CUST-0001');
    assert(cust1 && cust1.name === 'Aarav Mehta' && cust1.type === 'retail' && cust1.city === 'Mumbai', 'CUST-0001 matches seed contract');
    
    const cust2 = listJson.data.find(c => c.id === 'CUST-0002');
    assert(cust2 && cust2.name === 'Sunrise Electronics Pvt Ltd' && cust2.type === 'corporate' && cust2.gstin === '27AABCS1234F1Z5', 'CUST-0002 matches seed contract with GSTIN');
    
    const cust9 = listJson.data.find(c => c.id === 'CUST-0009');
    assert(cust9 && cust9.phone === cust1.phone, 'CUST-0009 duplicates CUST-0001 phone');

    const cust10 = listJson.data.find(c => c.id === 'CUST-0010');
    assert(cust10 && cust10.email === cust2.email, 'CUST-0010 duplicates CUST-0002 email');

    // 3. Filter ?type=corporate
    console.log('\n--- 3. Filter by ?type= ---');
    const corpRes = await fetch(`${baseUrl}/api/customers?type=corporate`);
    const corpJson = await corpRes.json();
    assert(corpRes.status === 200, 'Filter by type returns 200');
    assert(corpJson.data.every(c => c.type === 'corporate'), 'All returned records are corporate');
    assert(corpJson.data.some(c => c.id === 'CUST-0002') && corpJson.data.some(c => c.id === 'CUST-0006'), 'Contains CUST-0002 and CUST-0006');

    // 4. Search ?q=
    console.log('\n--- 4. Search with ?q= ---');
    const searchRes = await fetch(`${baseUrl}/api/customers?q=Kochi`);
    const searchJson = await searchRes.json();
    assert(searchRes.status === 200, 'Search returns 200');
    assert(searchJson.data.some(c => c.id === 'CUST-0003'), 'Search finds CUST-0003 in Kochi');

    // 5. GET /api/customers/:id
    console.log('\n--- 5. GET /api/customers/:id ---');
    const getRes = await fetch(`${baseUrl}/api/customers/CUST-0004`);
    const getJson = await getRes.json();
    assert(getRes.status === 200, 'GET /api/customers/CUST-0004 returns 200');
    assert(getJson.data.name === 'BrightHome Retail LLP', 'Returns correct customer name');
    assert(getJson.data.gstin === '27AAACB5678G1Z2', 'Returns GSTIN');

    // 6. GET /api/customers/:id (not found)
    console.log('\n--- 6. GET /api/customers/:id (404 Not Found) ---');
    const notFoundRes = await fetch(`${baseUrl}/api/customers/CUST-9999`);
    assert(notFoundRes.status === 404, 'Unknown customer ID returns 404');

    // 7. POST /api/customers (Create new customer)
    console.log('\n--- 7. POST /api/customers ---');
    const newCustPayload = {
      name: 'Delta Infotech Solutions',
      type: 'corporate',
      email: 'contact@deltainfotech.io',
      phone: '9898012345',
      gstin: '27AABCD1234E1Z9',
      billing_address: '702, Cyber Tower, Hinjewadi Phase 1',
      shipping_address: '702, Cyber Tower, Hinjewadi Phase 1',
      city: 'Pune'
    };
    const createRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustPayload)
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201, 'POST /api/customers returns 201');
    assert(createJson.data && createJson.data.id.startsWith('CUST-'), 'New ID has CUST- prefix');
    const createdId = createJson.data.id;

    // 8. POST duplicate email validation (409 Conflict)
    console.log('\n--- 8. Duplicate Email Validation (409) ---');
    const dupRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustPayload)
    });
    assert(dupRes.status === 409, 'Duplicate email returns 409 Conflict');

    // 9. Input validation errors (400 Bad Request)
    console.log('\n--- 9. Input Validation (400) ---');
    const badNameRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCustPayload, name: '', email: 'unique1@example.com' })
    });
    assert(badNameRes.status === 400, 'Missing name returns 400');

    const badTypeRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCustPayload, type: 'invalid_type', email: 'unique2@example.com' })
    });
    assert(badTypeRes.status === 400, 'Invalid type returns 400');

    const badPhoneRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCustPayload, phone: '123', email: 'unique3@example.com' })
    });
    assert(badPhoneRes.status === 400, 'Invalid phone returns 400');

    // 10. PUT /api/customers/:id (Update)
    console.log('\n--- 10. PUT /api/customers/:id ---');
    const updateRes = await fetch(`${baseUrl}/api/customers/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: 'Pune Hinjewadi', name: 'Delta Infotech Solutions Pvt Ltd' })
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200, 'PUT returns 200');
    assert(updateJson.data.city === 'Pune Hinjewadi', 'City updated successfully');
    assert(updateJson.data.name === 'Delta Infotech Solutions Pvt Ltd', 'Name updated successfully');

    // 11. GET /api/customers/:id/contacts
    console.log('\n--- 11. GET /api/customers/:id/contacts ---');
    const contactsRes = await fetch(`${baseUrl}/api/customers/CUST-0002/contacts`);
    const contactsJson = await contactsRes.json();
    assert(contactsRes.status === 200, 'GET /api/customers/CUST-0002/contacts returns 200');
    assert(Array.isArray(contactsJson.data), 'Contacts returns an array');
    assert(contactsJson.data.length >= 2, `CUST-0002 has at least 2 contacts (got ${contactsJson.data.length})`);
    assert(contactsJson.data[0].customer_id === 'CUST-0002', 'Contact customer_id matches');

    // 12. POST /api/customers/:id/contacts
    console.log('\n--- 12. POST /api/customers/:id/contacts ---');
    const newContactRes = await fetch(`${baseUrl}/api/customers/${createdId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Amitabh Sen',
        phone: '9898012346',
        email: 'amitabh@deltainfotech.io',
        designation: 'Chief Technology Officer'
      })
    });
    const newContactJson = await newContactRes.json();
    assert(newContactRes.status === 201, 'POST contact returns 201');
    assert(newContactJson.data && newContactJson.data.id.startsWith('CON-'), 'Contact ID has CON- prefix');
    assert(newContactJson.data.customer_id === createdId, 'Contact customer_id links to created customer');

    // 13. DELETE /api/customers/:id
    console.log('\n--- 13. DELETE /api/customers/:id ---');
    const deleteRes = await fetch(`${baseUrl}/api/customers/${createdId}`, {
      method: 'DELETE'
    });
    assert(deleteRes.status === 200, 'DELETE returns 200');

    // Verify deleted
    const verifyDelRes = await fetch(`${baseUrl}/api/customers/${createdId}`);
    assert(verifyDelRes.status === 404, 'Deleted customer returns 404');

    // Verify contacts cascaded
    const verifyContactDelRes = await fetch(`${baseUrl}/api/customers/${createdId}/contacts`);
    assert(verifyContactDelRes.status === 404, 'Contacts query for deleted customer returns 404');

  } catch (err) {
    console.error('Unhandled test exception:', err);
    failed++;
  } finally {
    server.close();
    await pool.end();
  }

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
