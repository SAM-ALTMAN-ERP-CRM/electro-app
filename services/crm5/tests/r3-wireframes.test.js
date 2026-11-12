const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WIREFRAMES_DIR = path.join(REPO_ROOT, 'docs', 'crm5', 'wireframes');
const MODULE_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'modules', 'crm5');
const GLOBAL_CSS_PATH = path.join(REPO_ROOT, 'frontend', 'src', 'index.css');

const EXPECTED_SVGS = [
  'dashboard.svg',
  'portal.svg',
  'order-tracking.svg',
  'forecast.svg',
  'reports.svg',
];

const EXPECTED_ROLES = ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr'];

const EXPECTED_ROUTES = [
  '',
  'dashboard',
  'portal',
  'portal/home',
  'portal/orders/:id',
  'orders/:id',
  'reports',
  'forecast',
];

test('[CRM5-R3] Every CRM-5 page has a valid SVG wireframe', () => {
  for (const filename of EXPECTED_SVGS) {
    const filePath = path.join(WIREFRAMES_DIR, filename);
    assert.ok(fs.existsSync(filePath), `Missing wireframe: ${filename}`);
    const svg = fs.readFileSync(filePath, 'utf8');
    assert.match(svg, /<svg\b[^>]*>/, `${filename} must open with <svg>`);
    assert.match(svg, /<\/svg>/, `${filename} must close </svg>`);
    assert.match(svg, /viewBox=/, `${filename} should define viewBox for scaling`);
  }
});

test('[CRM5-R3] UI-CONSISTENCY.md documents pages, badges, INR, tables, forms, and print styles', () => {
  const docPath = path.join(WIREFRAMES_DIR, 'UI-CONSISTENCY.md');
  assert.ok(fs.existsSync(docPath), 'Missing docs/crm5/wireframes/UI-CONSISTENCY.md');
  const doc = fs.readFileSync(docPath, 'utf8');

  for (const svg of EXPECTED_SVGS) {
    assert.ok(doc.includes(svg), `UI-CONSISTENCY.md should reference ${svg}`);
  }
  assert.ok(doc.includes('badge-green'), 'Should document .badge-green');
  assert.ok(doc.includes('badge-blue'), 'Should document .badge-blue');
  assert.ok(doc.includes('badge-amber'), 'Should document .badge-amber');
  assert.ok(doc.includes('badge-red'), 'Should document .badge-red');
  assert.ok(doc.includes('toLocaleString(\'en-IN\')'), 'Should document INR formatting');
  assert.ok(doc.includes('@media print'), 'Should document @media print rules');
});

test('[CRM5-R3] frontend/src/modules/crm5/index.jsx registers all 5 pages and 6 roles cleanly', () => {
  const indexPath = path.join(MODULE_DIR, 'index.jsx');
  const indexSrc = fs.readFileSync(indexPath, 'utf8');

  assert.match(indexSrc, /id:\s*'crm5'/);
  for (const role of EXPECTED_ROLES) {
    assert.ok(indexSrc.includes(`'${role}'`), `Missing role '${role}' in crm5/index.jsx`);
  }
  for (const route of EXPECTED_ROUTES) {
    assert.ok(
      indexSrc.includes(`path: '${route}'`),
      `Missing route '${route}' in crm5/index.jsx`
    );
  }
});

test('[CRM5-R3] CRM-5 frontend obeys shell rules (no BrowserRouter, localhost, or raw fetch) and print support', () => {
  const pageFiles = [
    path.join(MODULE_DIR, 'index.jsx'),
    ...fs
      .readdirSync(path.join(MODULE_DIR, 'pages'))
      .filter((f) => f.endsWith('.jsx'))
      .map((f) => path.join(MODULE_DIR, 'pages', f)),
  ];

  assert.equal(pageFiles.length, 6, 'Expected index.jsx + 5 page components');

  for (const file of pageFiles) {
    const src = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /BrowserRouter/, `${path.basename(file)} must not use BrowserRouter`);
    assert.doesNotMatch(src, /localhost/, `${path.basename(file)} must not hardcode localhost`);
    assert.doesNotMatch(src, /\bfetch\s*\(/, `${path.basename(file)} must use shared api() helper`);
  }

  const globalCss = fs.readFileSync(GLOBAL_CSS_PATH, 'utf8');
  assert.match(globalCss, /@media\s+print[\s\S]*\.sidebar/, 'Global CSS print stylesheet must hide .sidebar');

  const reportsSrc = fs.readFileSync(path.join(MODULE_DIR, 'pages', 'ReportsPage.jsx'), 'utf8');
  assert.match(reportsSrc, /@media\s+print/, 'ReportsPage.jsx should include @media print support');
});
