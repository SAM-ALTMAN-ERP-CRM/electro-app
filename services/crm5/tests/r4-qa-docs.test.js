const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const crm5Root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(crm5Root, '../..');

const apiDoc = fs.readFileSync(path.join(repoRoot, 'docs/crm5/api.md'), 'utf8');
const testsDoc = fs.readFileSync(path.join(repoRoot, 'docs/crm5/tests.md'), 'utf8');
const postmanRaw = fs.readFileSync(path.join(repoRoot, 'docs/crm5/postman_collection.json'), 'utf8');

describe('[CRM5-R4] QA and docs owner: tests.md, api.md & Postman collection verification', () => {
  it('docs/crm5/api.md documents every mounted endpoint, method, error code, and auth rule', () => {
    const endpoints = [
      'GET /api/health',
      'GET /api/portal/customers',
      'GET /api/portal/visits',
      'GET /api/portal/:customerId/overview',
      'GET /api/portal/:customerId',
      'GET /api/dashboard/sales-summary',
      'POST /api/dashboard/snapshot',
      'GET /api/dashboard/snapshots',
      'GET /api/forecast/weighted',
      'GET /api/forecasts/weighted',
      'GET /api/forecasts',
      'POST /api/forecasts',
      'PUT /api/forecasts/:id',
      'DELETE /api/forecasts/:id',
      'GET /api/reports',
      'GET /api/reports/:id/run'
    ];
    for (const ep of endpoints) {
      assert.ok(apiDoc.includes(ep), `api.md missing endpoint ${ep}`);
    }

    for (const code of ['200 OK', '201 Created', '400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error']) {
      assert.ok(apiDoc.includes(code), `api.md missing status code documentation ${code}`);
    }
  });

  it('docs/crm5/tests.md has at least 3 test cases per build issue (A1..D3) and covers Section 7 rows 10, 11, 12', () => {
    const buildKeys = [
      'CRM5-A1', 'CRM5-A2', 'CRM5-A3',
      'CRM5-B1', 'CRM5-B2', 'CRM5-B3',
      'CRM5-C1', 'CRM5-C2', 'CRM5-C3',
      'CRM5-D1', 'CRM5-D2', 'CRM5-D3'
    ];

    for (const key of buildKeys) {
      const matches = testsDoc.match(new RegExp(`\\[${key}\\]`, 'g')) || [];
      assert.ok(matches.length >= 3, `Expected at least 3 test cases for [${key}], found ${matches.length}`);
    }

    assert.match(testsDoc, /\|\s*ID\s*\|\s*Issue Key\s*\|\s*Steps\s*\|\s*Expected Result\s*\|\s*Actual Result\s*\|\s*Pass\/Fail\s*\|/);
    assert.ok(testsDoc.includes('USE_MOCKS=false'), 'tests.md must document USE_MOCKS=false verification');
    assert.match(testsDoc, /\|\s*\*\*10\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*11\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*12\*\*\s*\|/);
    assert.ok(testsDoc.includes('BUG-CRM5-'), 'tests.md must include Bug Register entries');
  });

  it('docs/crm5/postman_collection.json is valid Postman v2.1.0 JSON covering all endpoints', () => {
    const collection = JSON.parse(postmanRaw);
    assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    assert.ok(Array.isArray(collection.item) && collection.item.length >= 6);

    const flattenRequests = (items) => items.flatMap((entry) => (
      entry.item ? flattenRequests(entry.item) : [entry]
    ));
    const requests = flattenRequests(collection.item);
    assert.ok(requests.length >= 25, `Expected comprehensive request coverage, found ${requests.length}`);

    const rawUrls = requests.map((r) => (
      typeof r.request.url === 'string' ? r.request.url : r.request.url.raw
    )).join('\n');

    for (const epPath of [
      '/api/health',
      '/api/portal/customers',
      '/api/portal/CUST-0001/overview',
      '/api/portal/visits',
      '/api/dashboard/sales-summary',
      '/api/dashboard/snapshot',
      '/api/dashboard/snapshots',
      '/api/forecast/weighted',
      '/api/forecasts',
      '/api/reports',
      '/api/reports/sales-by-rep/run'
    ]) {
      assert.ok(rawUrls.includes(epPath), `Postman collection missing request for ${epPath}`);
    }
  });
});
