const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const crm1Root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(crm1Root, '../..');

const apiDoc = fs.readFileSync(path.join(repoRoot, 'docs/crm1/api.md'), 'utf8');
const testsDoc = fs.readFileSync(path.join(repoRoot, 'docs/crm1/tests.md'), 'utf8');
const postmanRaw = fs.readFileSync(path.join(repoRoot, 'docs/crm1/postman_collection.json'), 'utf8');

describe('[CRM1-R4] QA and docs owner: tests.md, api.md & Postman collection verification', () => {

  it('docs/crm1/api.md documents every CRM-1 endpoint, method, status code, error envelope, and auth rule', () => {
    const endpoints = [
      'GET /api/health',
      'GET /api/leads',
      'GET /api/leads/hot',
      'GET /api/leads/:id',
      'POST /api/leads',
      'PUT /api/leads/:id',
      'DELETE /api/leads/:id',
      'GET /api/opportunities',
      'GET /api/opportunities/summary',
      'GET /api/opportunities/:id',
      'POST /api/opportunities',
      'PATCH /api/opportunities/:id/stage',
      'DELETE /api/opportunities/:id',
      'GET /api/quotes',
      'GET /api/quotes/:id',
      'POST /api/quotes',
      'PATCH /api/quotes/:id/status',
      'GET /api/approvals',
      'PATCH /api/quotes/:id/approve',
      'PATCH /api/quotes/:id/reject',
      'GET /api/dealers',
      'GET /api/dealers/:id',
      'POST /api/dealers',
      'PUT /api/dealers/:id',
      'DELETE /api/dealers/:id'
    ];

    for (const ep of endpoints) {
      assert.ok(apiDoc.includes(ep), `api.md missing endpoint ${ep}`);
    }

    const statusCodes = [
      '200 OK',
      '201 Created',
      '400 Bad Request',
      '401 Unauthorized',
      '403 Forbidden',
      '404 Not Found',
      '500 Internal Server Error',
      '502 Bad Gateway'
    ];

    for (const code of statusCodes) {
      assert.ok(apiDoc.includes(code), `api.md missing status code documentation ${code}`);
    }

    // Verify envelope conventions
    assert.ok(apiDoc.includes('{ "data": ... }'), 'api.md must specify { data } success envelope');
    assert.ok(apiDoc.includes('{ "error":'), 'api.md must specify { error } failure envelope');
  });

  it('docs/crm1/tests.md has at least 3 test cases per build issue (total >= 36) and covers Section 7 rows', () => {
    const buildKeys = [
      'CRM1-A1', 'CRM1-A2', 'CRM1-A3',
      'CRM1-B1', 'CRM1-B2', 'CRM1-B3',
      'CRM1-C1', 'CRM1-C2', 'CRM1-C3',
      'CRM1-D1', 'CRM1-D2', 'CRM1-D3'
    ];

    let totalCases = 0;
    for (const key of buildKeys) {
      const matches = testsDoc.match(new RegExp(`\\[${key}\\]`, 'g')) || [];
      assert.ok(matches.length >= 3, `Expected at least 3 test cases for [${key}], found ${matches.length}`);
      totalCases += matches.length;
    }

    assert.ok(totalCases >= 36, `Expected at least 36 test cases, found ${totalCases}`);

    // Verify markdown table headers
    assert.match(testsDoc, /\|\s*ID\s*\|\s*Issue Key\s*\|\s*Steps\s*\|\s*Expected Result\s*\|\s*Actual Result\s*\|\s*Pass\/Fail\s*\|/);

    // Verify Section 7 cross-team rows for CRM-1: 1, 2, 3, 4, 9, 11
    assert.ok(testsDoc.includes('USE_MOCKS=false'), 'tests.md must document USE_MOCKS=false verification');
    assert.match(testsDoc, /\|\s*\*\*1\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*2\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*3\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*4\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*9\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*11\*\*\s*\|/);

    // Verify Bug Register exists
    assert.ok(testsDoc.includes('BUG-CRM1-'), 'tests.md must include Bug Register entries');
  });

  it('docs/crm1/postman_collection.json is valid Postman v2.1.0 JSON covering all endpoint groups', () => {
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
      '/api/leads',
      '/api/leads/hot',
      '/api/opportunities',
      '/api/opportunities/summary',
      '/api/quotes',
      '/api/approvals',
      '/api/dealers'
    ]) {
      assert.ok(rawUrls.includes(epPath), `Postman collection missing request for ${epPath}`);
    }
  });

});
