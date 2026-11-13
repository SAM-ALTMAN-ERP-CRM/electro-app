// services/erp3/tests/postFinished.test.js
// Tests for [ERP3-C3] Finished Goods Posting (POST /api/work-orders/:id/post-finished)
// Uses Node's built-in test runner (node:test) — no external test libraries required.

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

// Stub AUTH so requireAuth allows test requests through
process.env.AUTH_REQUIRED = 'false';

// In-memory stores for Postgres pool mock
let woStore = [];
let matStore = [];
let qcStore = [];
let erp1Calls = [];

const fakePool = {
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  }),
  query: async (sql, params = []) => {
    if (/FROM work_orders WHERE id = \$1/i.test(sql)) {
      return { rows: woStore.filter(w => w.id === params[0]) };
    }
    if (/FROM work_order_materials WHERE wo_id = \$1/i.test(sql)) {
      return { rows: matStore.filter(m => m.wo_id === params[0]) };
    }
    if (/FROM qc_checks/i.test(sql)) {
      const rows = qcStore
        .filter(q => q.wo_id === params[0])
        .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));
      return { rows: rows.slice(0, 1) };
    }
    if (/UPDATE work_orders/i.test(sql)) {
      const wo = woStore.find(w => w.id === params[0]);
      if (wo) {
        wo.status = 'completed';
        wo.completed_at = new Date().toISOString();
      }
      return { rows: wo ? [wo] : [] };
    }
    return { rows: [] };
  }
};

// Mock pg and callService BEFORE loading the router
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'pg') {
    return { Pool: class { constructor() { return fakePool; } } };
  }
  if (request.endsWith('_shared/callService')) {
    return {
      callService: async (team, reqPath, options = {}) => {
        erp1Calls.push({ team, reqPath, options });
        return { ok: true };
      }
    };
  }
  return origLoad.apply(this, arguments);
};

// Clear cached workOrders router in case another test loaded it without our callService mock
delete require.cache[require.resolve('../routes/workOrders')];
const workOrdersRouter = require('../routes/workOrders');

// Restore Module._load so subsequent test files in the same process are unaffected
Module._load = origLoad;

function dispatch(router, options) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const req = {
      method: options.method || 'GET',
      url: options.url || '/',
      originalUrl: options.url || '/',
      body: options.body || {},
      query: options.query || {},
      params: options.params || {},
      headers: {},
      user: { id: 'USR-0001', name: 'Admin', role: 'admin' }
    };
    const res = {
      statusCode: 200,
      status(code) { statusCode = code; this.statusCode = code; return this; },
      json(payload) { resolve({ status: statusCode, body: payload }); return this; }
    };
    router.handle(req, res, (err) => {
      if (err) resolve({ status: 500, body: { error: err.message } });
      else resolve({ status: 404, body: { error: 'Not found' } });
    });
  });
}

describe('ERP3 Finished Goods Posting [ERP3-C3]', () => {
  beforeEach(() => {
    erp1Calls = [];
    woStore = [
      {
        id: 'WO-0001',
        bom_id: 'BOM-0001',
        product_sku: 'SKU-0001',
        quantity: 20,
        status: 'in_progress',
        source: 'manual',
        planned_start: '2026-11-01',
        planned_end: '2026-11-10',
        created_at: '2026-11-01T09:00:00.000Z',
        completed_at: null
      }
    ];
    matStore = [
      { id: 1, wo_id: 'WO-0001', component_sku: 'SKU-0101', required_qty: 20, issued_qty: 20 },
      { id: 2, wo_id: 'WO-0001', component_sku: 'SKU-0102', required_qty: 20, issued_qty: 20 }
    ];
    qcStore = [
      { id: 'QC-0001', wo_id: 'WO-0001', result: 'pass', checked_at: '2026-11-05T10:00:00.000Z' }
    ];
  });

  it('returns 404 when work order does not exist', async () => {
    const res = await dispatch(workOrdersRouter, {
      method: 'POST',
      url: '/work-orders/WO-9999/post-finished'
    });
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('blocks with 400 when work order is already completed', async () => {
    woStore[0].status = 'completed';
    const res = await dispatch(workOrdersRouter, {
      method: 'POST',
      url: '/work-orders/WO-0001/post-finished'
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /already 'completed'/i);
    assert.equal(erp1Calls.length, 0);
  });

  it('blocks with 400 when materials are not fully issued', async () => {
    matStore[1].issued_qty = 10; // 10 < 20 required
    const res = await dispatch(workOrdersRouter, {
      method: 'POST',
      url: '/work-orders/WO-0001/post-finished'
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /SKU-0102/);
    assert.equal(erp1Calls.length, 0);
  });

  it('blocks with 400 when latest QC check is fail', async () => {
    qcStore[0].result = 'fail';
    const res = await dispatch(workOrdersRouter, {
      method: 'POST',
      url: '/work-orders/WO-0001/post-finished'
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /QC gate blocked/i);
    assert.equal(erp1Calls.length, 0);
  });

  it('posts stock + serials to ERP-1 and marks work order completed when all gates pass', async () => {
    const res = await dispatch(workOrdersRouter, {
      method: 'POST',
      url: '/work-orders/WO-0001/post-finished'
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.work_order.status, 'completed');
    assert.ok(res.body.data.work_order.completed_at);
    assert.equal(res.body.data.stock_adjusted, true);
    assert.equal(res.body.data.serials_generated, true);

    // Verify ERP-1 calls
    assert.equal(erp1Calls.length, 2);
    const stockCall = erp1Calls.find(c => c.reqPath === '/api/stock/adjust');
    assert.ok(stockCall, 'should call ERP-1 /api/stock/adjust');
    assert.equal(stockCall.team, 'erp1');
    assert.equal(stockCall.options.body.sku, 'SKU-0001');
    assert.equal(stockCall.options.body.warehouse_id, 'WH-01');
    assert.equal(stockCall.options.body.delta, 20);
    assert.equal(stockCall.options.body.reason, 'WO-0001');

    const serialsCall = erp1Calls.find(c => c.reqPath === '/api/serials/bulk');
    assert.ok(serialsCall, 'should call ERP-1 /api/serials/bulk');
    assert.equal(serialsCall.team, 'erp1');
    assert.equal(serialsCall.options.body.sku, 'SKU-0001');
    assert.equal(serialsCall.options.body.batch_no, 'WO-0001');
    assert.equal(serialsCall.options.body.count, 20);
  });
});
