// services/erp3/tests/materialIssues.test.js
// Tests for [ERP3-C1] Material Issue API
// Uses Node's built-in test runner (node:test) — no external test libraries required.

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── 1. Stub AUTH so requireAuth allows the test requests through ─────────────
process.env.AUTH_REQUIRED = 'false';

// ── 2. Mock PG Pool BEFORE router is loaded ──────────────────────────────────
let woStore = [];
let matStore = [];
let issueStore = [];
let issueSeq = 0;

function nextIssueId() {
  return `MI-${String(++issueSeq).padStart(4, '0')}`;
}

const fakePool = {
  connect: async () => ({
    query: async (sql, params = []) => {
      if (/BEGIN|COMMIT|ROLLBACK/i.test(sql)) {
        return { rows: [] };
      }
      if (/UPDATE work_order_materials/i.test(sql)) {
        const [qty, wo_id, sku] = params;
        const mat = matStore.find(m => m.wo_id === wo_id && m.component_sku === sku);
        if (mat) {
          mat.issued_qty = Number(mat.issued_qty) + Number(qty);
        }
        return { rows: mat ? [mat] : [] };
      }
      if (/INSERT INTO material_issues/i.test(sql)) {
        const [wo_id, component_sku, qty] = params;
        const issue = {
          id: nextIssueId(),
          wo_id,
          component_sku,
          qty: Number(qty),
          issued_at: new Date().toISOString()
        };
        issueStore.push(issue);
        return { rows: [issue] };
      }
      return { rows: [] };
    },
    release: () => {}
  }),
  query: async (sql, params = []) => {
    // SELECT FROM work_order_materials WHERE wo_id = $1 AND component_sku = $2
    if (/FROM work_order_materials\s+WHERE wo_id = \$1 AND component_sku = \$2/i.test(sql)) {
      const found = matStore.find(m => m.wo_id === params[0] && m.component_sku === params[1]);
      return { rows: found ? [found] : [] };
    }

    // SELECT FROM material_issues WHERE wo_id = $1
    if (/FROM material_issues\s+WHERE wo_id = \$1/i.test(sql)) {
      const found = issueStore.filter(i => i.wo_id === params[0]);
      return { rows: found };
    }

    return { rows: [] };
  }
};

// Intercept `require('pg')` with our fake Pool
const Module = require('module');
const _origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'pg') {
    return { Pool: class { constructor() { return fakePool; } } };
  }
  return _origLoad.apply(this, arguments);
};

// ── 3. Load router after mocks are registered ────────────────────────────────
const workOrdersRouter = require('../routes/workOrders');

// ── 4. In-memory Express dispatcher ──────────────────────────────────────────
function dispatch(router, options) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const req = {
      method:      options.method  || 'GET',
      url:         options.url     || '/',
      originalUrl: options.url     || '/',
      body:        options.body    || {},
      query:       options.query   || {},
      params:      options.params  || {},
      headers:     {},
      user:        { id: 'USR-0001', name: 'Admin', role: 'admin' }
    };

    const res = {
      statusCode: 200,
      status(code) { statusCode = code; this.statusCode = code; return this; },
      json(payload) { resolve({ status: statusCode, body: payload }); return this; }
    };

    router.handle(req, res, (err) => {
      if (err) resolve({ status: 500, body: { error: err.message } });
      else     resolve({ status: 404, body: { error: 'Not found' } });
    });
  });
}

// ── 5. Test Suite ────────────────────────────────────────────────────────────
describe('ERP3 Material Issue Routes [ERP3-C1]', () => {
  beforeEach(() => {
    woStore = [
      { id: 'WO-0001', product_sku: 'SKU-0001', quantity: 50, status: 'planned' }
    ];
    matStore = [
      { id: 'WOM-0001', wo_id: 'WO-0001', component_sku: 'SKU-0101', required_qty: 50, issued_qty: 0 },
      { id: 'WOM-0002', wo_id: 'WO-0001', component_sku: 'SKU-0102', required_qty: 50, issued_qty: 40 }
    ];
    issueStore = [
      { id: 'MI-0001', wo_id: 'WO-0001', component_sku: 'SKU-0102', qty: 40, issued_at: new Date().toISOString() }
    ];
    issueSeq = 1;
  });

  describe('POST /work-orders/:id/issue', () => {
    it('successfully issues raw material and updates issued_qty', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders/WO-0001/issue',
        params: { id: 'WO-0001' },
        body: {
          component_sku: 'SKU-0101',
          qty: 25
        }
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id.startsWith('MI-'));
      assert.equal(res.body.data.component_sku, 'SKU-0101');
      assert.equal(res.body.data.qty, 25);
      assert.equal(res.body.data.issued_qty, 25);
    });

    it('refuses issuing more than required quantity with HTTP 400', async () => {
      // Required is 50, already issued 40, remaining allowed is 10
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders/WO-0001/issue',
        params: { id: 'WO-0001' },
        body: {
          component_sku: 'SKU-0102',
          qty: 15 // 40 + 15 = 55 > 50
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /would exceed required quantity/);
    });

    it('refuses issuing zero or negative quantity with HTTP 400', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders/WO-0001/issue',
        params: { id: 'WO-0001' },
        body: {
          component_sku: 'SKU-0101',
          qty: 0
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /positive number/);
    });

    it('refuses missing component_sku with HTTP 400', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders/WO-0001/issue',
        params: { id: 'WO-0001' },
        body: {
          qty: 10
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /component_sku is required/);
    });

    it('returns 404 when component is not part of the work order', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders/WO-0001/issue',
        params: { id: 'WO-0001' },
        body: {
          component_sku: 'SKU-9999',
          qty: 10
        }
      });

      assert.equal(res.status, 404);
      assert.match(res.body.error, /not part of work order/);
    });
  });

  describe('GET /work-orders/:id/issues', () => {
    it('returns history of material issues for the work order', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders/WO-0001/issues',
        params: { id: 'WO-0001' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].component_sku, 'SKU-0102');
    });

    it('returns empty array when work order has no issues', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders/WO-9999/issues',
        params: { id: 'WO-9999' }
      });

      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, []);
    });
  });
});
