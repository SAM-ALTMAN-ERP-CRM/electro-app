const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const README_PATH = path.join(REPO_ROOT, 'docs', 'crm4', 'README.md');
const DEMO_PATH = path.join(REPO_ROOT, 'docs', 'crm4', 'demo.md');
const INDEX_JSX_PATH = path.join(REPO_ROOT, 'frontend', 'src', 'modules', 'crm4', 'index.jsx');

describe('CRM4-R1 Team Lead: README and Demo Script Documentation Tests', () => {

  it('1. docs/crm4/README.md exists and documents service, port, routes, endpoints, and cross-team dependencies', () => {
    assert.ok(fs.existsSync(README_PATH), 'docs/crm4/README.md must exist');
    const content = fs.readFileSync(README_PATH, 'utf8');

    assert.ok(content.includes('5104'), 'README must mention Port 5104');
    assert.ok(content.includes('crm4_db'), 'README must mention database crm4_db');
    assert.ok(content.includes('/crm4'), 'README must document frontend module /crm4');

    // Endpoints
    assert.ok(content.includes('/api/campaigns'), 'README must document /api/campaigns endpoint');
    assert.ok(content.includes('/api/enquiries'), 'README must document /api/enquiries endpoint');
    assert.ok(content.includes('/api/health'), 'README must document /api/health endpoint');

    // Cross-team contracts
    assert.ok(content.includes('CRM-1'), 'README must document CRM-1 dependency');
    assert.ok(content.includes('CRM-3'), 'README must document CRM-3 dependency');
    assert.ok(content.includes('ERP-1'), 'README must document ERP-1 dependency');

    // Section 5 contracts
    assert.ok(content.includes('CUST-0001'), 'README must document Section 5 customers');
    assert.ok(content.includes('SKU-0001'), 'README must document Section 5 SKUs');
    assert.ok(content.includes('EMP-0001'), 'README must document Section 5 sales reps');
  });

  it('2. docs/crm4/demo.md exists and provides a complete 5-step walkthrough with Section 5 IDs', () => {
    assert.ok(fs.existsSync(DEMO_PATH), 'docs/crm4/demo.md must exist');
    const content = fs.readFileSync(DEMO_PATH, 'utf8');

    // 5 Steps
    assert.ok(content.includes('Step 1:'), 'demo.md must document Step 1');
    assert.ok(content.includes('Step 2:'), 'demo.md must document Step 2');
    assert.ok(content.includes('Step 3:'), 'demo.md must document Step 3');
    assert.ok(content.includes('Step 4:'), 'demo.md must document Step 4');
    assert.ok(content.includes('Step 5:'), 'demo.md must document Step 5');

    // Specific Section 5 contract references
    assert.ok(content.includes('CUST-0001'), 'demo.md must reference CUST-0001');
    assert.ok(content.includes('CUST-0002'), 'demo.md must reference CUST-0002');
    assert.ok(content.includes('CUST-0003'), 'demo.md must reference CUST-0003');
    assert.ok(content.includes('SKU-0001'), 'demo.md must reference SKU-0001');
    assert.ok(content.includes('SKU-0002'), 'demo.md must reference SKU-0002');
    assert.ok(content.includes('EMP-0001'), 'demo.md must reference EMP-0001');
    assert.ok(content.includes('SEG-0001'), 'demo.md must reference SEG-0001');
    assert.ok(content.includes('TPL-0001'), 'demo.md must reference TPL-0001');

    // NPS hand calculation proof
    assert.ok(content.includes('+40'), 'demo.md must demonstrate NPS calculation (+40)');
  });

  it('3. Every page registered in frontend/src/modules/crm4/index.jsx is documented in README.md', () => {
    assert.ok(fs.existsSync(INDEX_JSX_PATH), 'index.jsx must exist');
    const indexSrc = fs.readFileSync(INDEX_JSX_PATH, 'utf8');
    const readmeSrc = fs.readFileSync(README_PATH, 'utf8');

    const expectedPaths = [
      'campaigns',
      'audiences',
      'audiences/:id',
      'enquiry',
      'templates',
      'surveys',
      'surveys/:id/respond',
      'surveys/:id/results'
    ];

    for (const p of expectedPaths) {
      assert.ok(indexSrc.includes(`path: '${p}'`), `index.jsx must register path: '${p}'`);
      assert.ok(readmeSrc.includes(p), `README.md must document path: '${p}'`);
    }
  });
});
