const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const crm5Root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(crm5Root, '../..');

const readmeDoc = fs.readFileSync(path.join(repoRoot, 'docs/crm5/README.md'), 'utf8');
const demoDoc = fs.readFileSync(path.join(repoRoot, 'docs/crm5/demo.md'), 'utf8');
const moduleIndex = fs.readFileSync(path.join(repoRoot, 'frontend/src/modules/crm5/index.jsx'), 'utf8');

describe('[CRM5-R1] Team Lead: README, demo script & module consistency', () => {
  it('docs/crm5/README.md documents module purpose, run steps, endpoints, and cross-team contracts', () => {
    assert.ok(readmeDoc.includes('5105'), 'README must document port 5105');
    assert.ok(readmeDoc.includes('crm5_db'), 'README must document crm5_db');
    assert.ok(readmeDoc.includes('http://localhost:3000'), 'README must document frontend shell URL');

    // Every mounted CRM-5 API endpoint documented
    const endpoints = [
      '/api/health',
      '/api/portal/customers',
      '/api/portal/visits',
      '/api/portal/:customerId/overview',
      '/api/dashboard/sales-summary',
      '/api/dashboard/snapshot',
      '/api/dashboard/snapshots',
      '/api/forecast/weighted',
      '/api/forecasts',
      '/api/reports',
      '/api/reports/:id/run'
    ];
    for (const ep of endpoints) {
      assert.ok(readmeDoc.includes(ep), `README missing endpoint ${ep}`);
    }

    // Cross-team outbound & inbound documentation
    for (const team of ['CRM-1', 'CRM-2', 'CRM-3', 'ERP-4', 'ERP-5']) {
      assert.ok(readmeDoc.includes(team), `README missing cross-team dependency ${team}`);
    }
    assert.match(readmeDoc, /Who Calls CRM-5/i);
    assert.match(readmeDoc, /Standup Audit/i);
  });

  it('docs/crm5/demo.md provides a 5-step demo script with Section 5 shared IDs', () => {
    for (let step = 1; step <= 5; step += 1) {
      assert.match(demoDoc, new RegExp(`^## Step ${step}:`, 'm'), `demo.md missing Step ${step}`);
    }

    const section5Ids = [
      'CUST-0001', 'CUST-0002', 'CUST-0003', 'CUST-0004',
      'SKU-0001', 'SKU-0004',
      'EMP-0001', 'EMP-0002', 'EMP-0003', 'EMP-0005',
      'SO-0001', 'TKT-0001', 'INV-0001', 'WH-01'
    ];
    for (const id of section5Ids) {
      assert.ok(demoDoc.includes(id), `demo.md missing Section 5 shared ID ${id}`);
    }
  });

  it('frontend/src/modules/crm5 complies with monorepo shell & folder rules', () => {
    assert.match(moduleIndex, /id:\s*'crm5'/);
    for (const routePath of ["''", "'dashboard'", "'portal'", "'portal/home'", "'reports'", "'forecast'"]) {
      assert.ok(moduleIndex.includes(routePath), `index.jsx missing route ${routePath}`);
    }

    // Ensure no BrowserRouter, raw fetch(), or localhost in frontend/src/modules/crm5/
    const crm5FrontendDir = path.join(repoRoot, 'frontend/src/modules/crm5');
    const jsxFiles = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) jsxFiles.push(full);
      }
    };
    walk(crm5FrontendDir);

    assert.ok(jsxFiles.length >= 5, 'Expected index.jsx and 4 page components');
    for (const file of jsxFiles) {
      const src = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /BrowserRouter/, `Disallowed BrowserRouter in ${file}`);
      assert.doesNotMatch(src, /localhost:\d+/, `Disallowed hardcoded localhost in ${file}`);
      assert.doesNotMatch(src, /\bfetch\s*\(/, `Disallowed raw fetch() in ${file}`);
    }
  });
});
