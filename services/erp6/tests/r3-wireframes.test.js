const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WIREFRAMES_DIR = path.join(REPO_ROOT, 'docs', 'erp6', 'wireframes');
const MODULE_DIR = path.join(REPO_ROOT, 'frontend', 'src', 'modules', 'erp6');
const GLOBAL_CSS_PATH = path.join(REPO_ROOT, 'frontend', 'src', 'index.css');

const EXPECTED_SVGS = [
  'employees.svg',
  'departments.svg',
  'attendance.svg',
  'leaves.svg',
  'payroll.svg',
  'salary-slip.svg',
  'commissions.svg',
  'leaderboard.svg'
];

const EXPECTED_DOCS = [
  'Employees.md',
  'Departments.md',
  'Attendance.md',
  'Leaves.md',
  'Payroll.md',
  'SalarySlip.md',
  'Commissions.md',
  'Leaderboard.md'
];

const EXPECTED_ROLES = ['admin', 'hr'];

const EXPECTED_ROUTES = [
  '',
  'employees',
  'departments',
  'payroll',
  'payroll/:id',
  'commissions',
  'leaderboard'
];

describe('[ERP6-R3] UI owner: Wireframes, UI consistency & shell compliance', () => {
  it('Every ERP-6 page has a valid SVG wireframe in docs/erp6/wireframes/', () => {
    for (const filename of EXPECTED_SVGS) {
      const filePath = path.join(WIREFRAMES_DIR, filename);
      assert.ok(fs.existsSync(filePath), `Missing wireframe SVG: ${filename}`);
      const svg = fs.readFileSync(filePath, 'utf8');
      assert.match(svg, /<svg\b[^>]*>/, `${filename} must open with <svg> tag`);
      assert.match(svg, /<\/svg>/, `${filename} must close with </svg> tag`);
      assert.match(svg, /viewBox=/, `${filename} must define viewBox for scaling`);
    }
  });

  it('Every page specification Markdown file exists in docs/erp6/wireframes/', () => {
    for (const docFile of EXPECTED_DOCS) {
      const filePath = path.join(WIREFRAMES_DIR, docFile);
      assert.ok(fs.existsSync(filePath), `Missing wireframe specification markdown: ${docFile}`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.length > 200, `${docFile} should contain detailed screen layout & specifications`);
      assert.match(content, /Route/, `${docFile} should document Route`);
      assert.match(content, /Roles/, `${docFile} should document Roles`);
    }
  });

  it('UI-CONSISTENCY.md documents pages, badges, INR format, tables, forms, and print styles', () => {
    const docPath = path.join(WIREFRAMES_DIR, 'UI-CONSISTENCY.md');
    assert.ok(fs.existsSync(docPath), 'Missing docs/erp6/wireframes/UI-CONSISTENCY.md');
    const doc = fs.readFileSync(docPath, 'utf8');

    for (const svg of EXPECTED_SVGS) {
      assert.ok(doc.includes(svg), `UI-CONSISTENCY.md should reference ${svg}`);
    }
    assert.ok(doc.includes('badge-green'), 'Should document .badge-green');
    assert.ok(doc.includes('badge-blue'), 'Should document .badge-blue');
    assert.ok(doc.includes('badge-amber'), 'Should document .badge-amber');
    assert.ok(doc.includes('badge-red'), 'Should document .badge-red');
    assert.ok(doc.includes("toLocaleString('en-IN')"), 'Should document INR currency formatting');
    assert.ok(doc.includes('@media print'), 'Should document @media print rules');
  });

  it('frontend/src/modules/erp6/index.jsx registers all active pages and roles cleanly', () => {
    const indexPath = path.join(MODULE_DIR, 'index.jsx');
    const indexSrc = fs.readFileSync(indexPath, 'utf8');

    assert.match(indexSrc, /id:\s*'erp6'/);
    for (const role of EXPECTED_ROLES) {
      assert.ok(indexSrc.includes(`'${role}'`), `Missing role '${role}' in erp6/index.jsx`);
    }
    for (const route of EXPECTED_ROUTES) {
      assert.ok(
        indexSrc.includes(`path: '${route}'`),
        `Missing route '${route}' in erp6/index.jsx`
      );
    }
  });

  it('ERP-6 frontend obeys shell rules (no BrowserRouter, localhost, or raw fetch)', () => {
    const pageFiles = [
      path.join(MODULE_DIR, 'index.jsx'),
      ...fs
        .readdirSync(path.join(MODULE_DIR, 'pages'))
        .filter((f) => f.endsWith('.jsx'))
        .map((f) => path.join(MODULE_DIR, 'pages', f))
    ];

    assert.ok(pageFiles.length >= 7, 'Expected index.jsx + at least 6 page components');

    for (const file of pageFiles) {
      const src = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /<BrowserRouter\b/, `${path.basename(file)} must not use <BrowserRouter>`);
      assert.doesNotMatch(src, /localhost/, `${path.basename(file)} must not hardcode localhost`);
      assert.doesNotMatch(src, /\bfetch\s*\(/, `${path.basename(file)} must use shared api() helper`);
    }
  });

  it('Print stylesheets properly hide sidebar, top-bar, and navigation buttons', () => {
    const globalCss = fs.readFileSync(GLOBAL_CSS_PATH, 'utf8');
    assert.match(globalCss, /@media\s+print[\s\S]*\.sidebar/, 'Global CSS print stylesheet must hide .sidebar');

    const salarySlipSrc = fs.readFileSync(path.join(MODULE_DIR, 'pages', 'SalarySlipPage.jsx'), 'utf8');
    assert.match(salarySlipSrc, /@media\s+print/, 'SalarySlipPage.jsx must include dedicated @media print rules');
    assert.match(salarySlipSrc, /\.sidebar/, 'SalarySlipPage.jsx print styles must hide .sidebar');
    assert.match(salarySlipSrc, /\.no-print/, 'SalarySlipPage.jsx print styles must hide .no-print elements');
  });
});
