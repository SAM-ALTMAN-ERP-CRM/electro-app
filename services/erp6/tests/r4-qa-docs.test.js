const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const erp6Root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(erp6Root, '../..');

const apiDoc = fs.readFileSync(path.join(repoRoot, 'docs/erp6/api.md'), 'utf8');
const testsDoc = fs.readFileSync(path.join(repoRoot, 'docs/erp6/tests.md'), 'utf8');
const postmanRaw = fs.readFileSync(path.join(repoRoot, 'docs/erp6/postman_collection.json'), 'utf8');

describe('[ERP6-R4] QA and docs owner: tests.md, api.md & Postman collection verification', () => {
  it('docs/erp6/api.md documents every endpoint, method, error code, and auth rule', () => {
    const endpoints = [
      'GET /api/health',
      'GET /api/departments',
      'GET /api/departments/:id',
      'POST /api/departments',
      'PUT /api/departments/:id',
      'DELETE /api/departments/:id',
      'GET /api/employees',
      'GET /api/employees/:id',
      'POST /api/employees',
      'PUT /api/employees/:id',
      'PATCH /api/employees/:id/deactivate',
      'PATCH /api/employees/:id/activate',
      'POST /api/attendance/mark',
      'GET /api/attendance',
      'GET /api/attendance/summary',
      'POST /api/leave-requests',
      'PATCH /api/leave-requests/:id/decision',
      'POST /api/payroll/generate',
      'GET /api/salary-slips',
      'PATCH /api/salary-slips/:id/paid',
      'POST /api/commissions/sync',
      'GET /api/commissions',
      'GET /api/performance/sales'
    ];
    for (const ep of endpoints) {
      assert.ok(apiDoc.includes(ep), `api.md missing endpoint ${ep}`);
    }

    for (const code of ['200 OK', '201 Created', '400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '409 Conflict', '500 Internal Server Error']) {
      assert.ok(apiDoc.includes(code), `api.md missing status code documentation ${code}`);
    }
  });

  it('docs/erp6/tests.md has at least 3 test cases per build issue (A1..D3) and covers Section 7 rows 1, 5, 27, 28', () => {
    const buildKeys = [
      'ERP6-A1', 'ERP6-A2', 'ERP6-A3',
      'ERP6-B1', 'ERP6-B2', 'ERP6-B3',
      'ERP6-C1', 'ERP6-C2', 'ERP6-C3',
      'ERP6-D1', 'ERP6-D2', 'ERP6-D3'
    ];

    for (const key of buildKeys) {
      const matches = testsDoc.match(new RegExp(`\\[${key}\\]`, 'g')) || [];
      assert.ok(matches.length >= 3, `Expected at least 3 test cases for [${key}], found ${matches.length}`);
    }

    assert.match(testsDoc, /\|\s*ID\s*\|\s*Issue Key\s*\|\s*Steps\s*\|\s*Expected Result\s*\|\s*Actual Result\s*\|\s*Pass\/Fail\s*\|/);
    assert.ok(testsDoc.includes('USE_MOCKS=false'), 'tests.md must document USE_MOCKS=false verification');
    assert.match(testsDoc, /\|\s*\*\*1\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*5\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*27\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*28\*\*\s*\|/);
    assert.ok(testsDoc.includes('BUG-ERP6-'), 'tests.md must include Bug Register entries');
  });

  it('docs/erp6/postman_collection.json is valid Postman v2.1.0 JSON covering all endpoints', () => {
    const collection = JSON.parse(postmanRaw);
    assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    assert.ok(Array.isArray(collection.item) && collection.item.length >= 6);

    const flattenRequests = (items) => items.flatMap((entry) => (
      entry.item ? flattenRequests(entry.item) : [entry]
    ));
    const requests = flattenRequests(collection.item);
    assert.ok(requests.length >= 20, `Expected comprehensive request coverage, found ${requests.length}`);

    const rawUrls = requests.map((r) => (
      typeof r.request.url === 'string' ? r.request.url : r.request.url.raw
    )).join('\n');

    for (const epPath of [
      '/api/health',
      '/api/departments',
      '/api/employees',
      '/api/attendance',
      '/api/leave-requests',
      '/api/payroll/generate',
      '/api/salary-slips',
      '/api/commissions/sync',
      '/api/commissions',
      '/api/performance/sales'
    ]) {
      assert.ok(rawUrls.includes(epPath), `Postman collection missing request for ${epPath}`);
    }
  });
});
