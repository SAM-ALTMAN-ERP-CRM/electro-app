const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const crm4Root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(crm4Root, '../..');

const apiDocPath = path.join(repoRoot, 'docs/crm4/api.md');
const testsDocPath = path.join(repoRoot, 'docs/crm4/tests.md');
const postmanPath = path.join(repoRoot, 'docs/crm4/postman_collection.json');

const apiDoc = fs.readFileSync(apiDocPath, 'utf8');
const testsDoc = fs.readFileSync(testsDocPath, 'utf8');
const postmanRaw = fs.readFileSync(postmanPath, 'utf8');

describe('[CRM4-R4] QA and docs owner: tests.md, api.md & Postman collection verification', () => {

  it('docs/crm4/api.md documents every CRM-4 endpoint, method, status code, error envelope, and auth rule', () => {
    const endpoints = [
      'GET /api/health',
      'GET /api/campaigns',
      'GET /api/campaigns/:id',
      'POST /api/campaigns',
      'PUT /api/campaigns/:id',
      'PATCH /api/campaigns/:id/status',
      'POST /api/campaigns/:id/send',
      'GET /api/campaigns/:id/messages',
      'DELETE /api/campaigns/:id',
      'GET /api/audiences',
      'GET /api/audiences/:id',
      'POST /api/audiences',
      'PUT /api/audiences/:id',
      'DELETE /api/audiences/:id',
      'GET /api/audiences/:id/members',
      'POST /api/audiences/:id/members',
      'PATCH /api/audiences/:id/members/:member_id',
      'DELETE /api/audiences/:id/members/:member_id',
      'POST /api/audiences/:id/import-segment',
      'GET /api/templates',
      'GET /api/templates/:id',
      'POST /api/templates',
      'PUT /api/templates/:id',
      'POST /api/templates/:id/render',
      'DELETE /api/templates/:id',
      'GET /api/enquiries',
      'GET /api/enquiries/:id',
      'POST /api/enquiries',
      'GET /api/surveys',
      'GET /api/surveys/:id',
      'POST /api/surveys',
      'PUT /api/surveys/:id',
      'DELETE /api/surveys/:id',
      'GET /api/surveys/:id/responses',
      'POST /api/surveys/:id/responses',
      'GET /api/surveys/:id/results'
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
      '409 Conflict',
      '500 Internal Server Error',
      '502 Bad Gateway'
    ];

    for (const code of statusCodes) {
      assert.ok(apiDoc.includes(code), `api.md missing status code documentation ${code}`);
    }

    // Verify envelope conventions
    assert.ok(apiDoc.includes('{ "data": ... }') || apiDoc.includes('"data":'), 'api.md must specify { data } success envelope');
    assert.ok(apiDoc.includes('{ "error":') || apiDoc.includes('"error":'), 'api.md must specify { error } failure envelope');
  });

  it('docs/crm4/tests.md has at least 3 test cases per build issue (total >= 36) and covers Section 7 rows 2, 4, 8, 9', () => {
    const buildKeys = [
      'CRM4-A1', 'CRM4-A2', 'CRM4-A3',
      'CRM4-B1', 'CRM4-B2', 'CRM4-B3', 'CRM4-B4',
      'CRM4-C1', 'CRM4-C2', 'CRM4-C3',
      'CRM4-D1', 'CRM4-D2', 'CRM4-D3'
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

    // Verify Section 7 cross-team rows for CRM-4: 2, 4, 8, 9
    assert.ok(testsDoc.includes('USE_MOCKS=false'), 'tests.md must document USE_MOCKS=false verification');
    assert.match(testsDoc, /\|\s*\*\*2\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*4\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*8\*\*\s*\|/);
    assert.match(testsDoc, /\|\s*\*\*9\*\*\s*\|/);

    // Verify Bug Register exists
    assert.ok(testsDoc.includes('BUG-CRM4-'), 'tests.md must include Bug Register entries');
  });

  it('docs/crm4/postman_collection.json is valid Postman v2.1.0 JSON covering all endpoint groups', () => {
    const collection = JSON.parse(postmanRaw);
    assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    assert.ok(Array.isArray(collection.item) && collection.item.length >= 7);

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
      '/api/campaigns',
      '/api/campaigns/CMP-0001',
      '/api/campaigns/CMP-0002/send',
      '/api/audiences',
      '/api/audiences/AUD-0001',
      '/api/audiences/AUD-0001/members',
      '/api/templates',
      '/api/templates/TPL-0001',
      '/api/templates/TPL-0001/render',
      '/api/enquiries',
      '/api/surveys',
      '/api/surveys/SRV-0001/results'
    ]) {
      assert.ok(rawUrls.includes(epPath), `Postman collection missing request for ${epPath}`);
    }
  });

});
