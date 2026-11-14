const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';
process.env.AUTH_REQUIRED = 'false';

const returnsRouter = require('../routes/returns');

// Setup test express application for returns
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'USR-0001', role: 'admin' };
  next();
});
app.use('/api', returnsRouter);

async function request(serverApp, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const server = serverApp.listen(0, async () => {
      const port = server.address().port;
      try {
        const fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (body !== null) {
          fetchOptions.body = JSON.stringify(body);
        }
        const res = await fetch(`http://127.0.0.1:${port}${url}`, fetchOptions);
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
        server.close(() => resolve({ status: res.status, body: json }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

test('ERP4-R3 UI Consistency & Wireframes Verification Suite', async (t) => {
  const wireframesDir = path.resolve(__dirname, '../../../docs/erp4/wireframes');
  const pagesDir = path.resolve(__dirname, '../../../frontend/src/modules/erp4/pages');
  const indexModulePath = path.resolve(__dirname, '../../../frontend/src/modules/erp4/index.jsx');

  await t.test('1. All 6 SVG vector wireframes exist with valid SVG XML markup', () => {
    const expectedSvgs = [
      'orders.svg',
      'order-detail.svg',
      'dispatch.svg',
      'dispatch-note.svg',
      'returns.svg',
      'return-detail.svg'
    ];

    for (const file of expectedSvgs) {
      const filePath = path.join(wireframesDir, file);
      assert.ok(fs.existsSync(filePath), `Missing SVG wireframe: ${file}`);
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.ok(content.includes('<svg'), `${file} should contain <svg tag`);
      assert.ok(content.includes('viewBox='), `${file} should contain viewBox attribute`);
      assert.ok(content.includes('</svg>'), `${file} should close with </svg>`);
    }
  });

  await t.test('2. All 6 Wireframe Markdown documentation specifications exist', () => {
    const expectedDocs = [
      'OrdersList.md',
      'OrderDetail.md',
      'Dispatch.md',
      'DispatchNote.md',
      'ReturnsList.md',
      'ReturnDetail.md'
    ];

    for (const doc of expectedDocs) {
      const docPath = path.join(wireframesDir, doc);
      assert.ok(fs.existsSync(docPath), `Missing Markdown doc: ${doc}`);
      const content = fs.readFileSync(docPath, 'utf-8');
      assert.ok(content.includes('Route'), `${doc} must document the route`);
      assert.ok(content.includes('Roles'), `${doc} must document the roles`);
    }
  });

  await t.test('3. UI Consistency Guide defines system-wide styling & contracts', () => {
    const guidePath = path.join(wireframesDir, 'UI-CONSISTENCY.md');
    assert.ok(fs.existsSync(guidePath), 'Missing UI-CONSISTENCY.md guide');
    const content = fs.readFileSync(guidePath, 'utf-8');

    assert.ok(content.includes('badge-green'), 'Guide must specify green badge');
    assert.ok(content.includes('badge-blue'), 'Guide must specify blue badge');
    assert.ok(content.includes('badge-amber'), 'Guide must specify amber badge');
    assert.ok(content.includes('badge-red'), 'Guide must specify red badge');
    assert.ok(content.includes('badge-gray'), 'Guide must specify gray badge');
    assert.ok(content.includes('toLocaleString'), 'Guide must specify Indian currency formatting');
    assert.ok(content.includes('@media print'), 'Guide must specify print styling rules');
  });

  await t.test('4. Module registration file index.jsx exports all required ERP-4 routes and roles', () => {
    assert.ok(fs.existsSync(indexModulePath), 'Missing modules/erp4/index.jsx');
    const content = fs.readFileSync(indexModulePath, 'utf-8');

    assert.ok(content.includes("id: 'erp4'"), "Module id must be 'erp4'");
    assert.ok(content.includes("'admin'"), 'Module must include admin role');
    assert.ok(content.includes("'sales'"), 'Module must include sales role');
    assert.ok(content.includes("'warehouse'"), 'Module must include warehouse role');

    // Check all routes registered
    assert.ok(content.includes("path: ''") || content.includes("path: 'orders'"), 'Orders list route registered');
    assert.ok(content.includes("path: 'orders/:id'"), 'Order detail route registered');
    assert.ok(content.includes("path: 'dispatch'"), 'Dispatch page route registered');
    assert.ok(content.includes("path: 'dispatch/:id/note'"), 'Dispatch note route registered');
    assert.ok(content.includes("path: 'returns'"), 'Returns list route registered');
    assert.ok(content.includes("path: 'returns/:id'"), 'Return detail route registered');
  });

  await t.test('5. Frontend pages avoid anti-patterns (no BrowserRouter, no localhost, no raw fetch)', () => {
    const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));
    assert.ok(pageFiles.length >= 6, `Expected at least 6 page components, found ${pageFiles.length}`);

    for (const file of pageFiles) {
      const code = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
      assert.ok(!code.includes('BrowserRouter'), `${file} must not contain BrowserRouter`);
      assert.ok(!code.includes('localhost'), `${file} must not hardcode localhost`);
      assert.ok(!code.includes('127.0.0.1'), `${file} must not hardcode 127.0.0.1`);
      assert.ok(!code.includes('fetch('), `${file} must use shared api helper instead of fetch()`);
    }
  });

  await t.test('6. Print styles in DispatchNotePage hide sidebar and topbar', () => {
    const notePageCode = fs.readFileSync(path.join(pagesDir, 'DispatchNotePage.jsx'), 'utf-8');
    assert.ok(notePageCode.includes('@media print'), 'DispatchNotePage must include @media print style block');
    assert.ok(notePageCode.includes('.sidebar'), 'Print styles must hide .sidebar');
    assert.ok(notePageCode.includes('.top-bar') || notePageCode.includes('display: none'), 'Print styles must hide chrome elements');
  });

  await t.test('7. Returns API endpoints function correctly with mock fallback', async () => {
    // Test GET /api/returns
    const listRes = await request(app, 'GET', '/api/returns');
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data), 'Returns list must return an array');
    assert.ok(listRes.body.data.length >= 3, 'Must have at least 3 return rows');

    // Test GET /api/returns/summary
    const summaryRes = await request(app, 'GET', '/api/returns/summary');
    assert.equal(summaryRes.status, 200);
    assert.ok(summaryRes.body.data.total !== undefined, 'Summary must include total');
    assert.ok(summaryRes.body.data.requested !== undefined, 'Summary must include requested');

    // Test GET /api/returns/:id
    const itemRes = await request(app, 'GET', '/api/returns/RET-0001');
    assert.equal(itemRes.status, 200);
    assert.equal(itemRes.body.data.id, 'RET-0001');

    // Test PATCH /api/returns/:id/status
    const patchRes = await request(app, 'PATCH', '/api/returns/RET-0001/status', { status: 'received' });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.status, 'received');
  });
});
