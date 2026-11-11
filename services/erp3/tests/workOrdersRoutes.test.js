// services/erp3/tests/workOrdersRoutes.test.js
// Tests for [ERP3-B1] Work Orders API
// Uses Node's built-in test runner (node:test) — no external test libraries required.

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── 1. Stub AUTH so requireAuth allows the test requests through ─────────────
process.env.AUTH_REQUIRED = 'false';

// ── 2. Mock PG Pool BEFORE router is loaded ──────────────────────────────────
let woStore = [];
let woSeq = 0;

function nextWoId() {
  return `WO-${String(++woSeq).padStart(4, '0')}`;
}

const fakePool = {
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  }),
  query: async (sql, params = []) => {
    // INSERT INTO work_orders
    if (/INSERT INTO work_orders/.test(sql)) {
      const [bom_id, product_sku, quantity, source, planned_start, planned_end] = params;
      const row = {
        id: nextWoId(),
        bom_id,
        product_sku,
        quantity: Number(quantity),
        status: 'planned',
        source: source || 'manual',
        planned_start: planned_start || null,
        planned_end: planned_end || null,
        created_at: new Date().toISOString(),
        completed_at: null
      };
      woStore.push(row);
      return { rows: [row] };
    }

    // SELECT work_orders WHERE id = $1
    if (/FROM work_orders\s+WHERE id = \$1/.test(sql)) {
      const found = woStore.find(w => w.id === params[0]);
      return { rows: found ? [found] : [] };
    }

    // SELECT work_orders with optional filters
    if (/FROM work_orders/.test(sql)) {
      let rows = [...woStore];
      let pIdx = 0;
      if (/LOWER\(status\)/.test(sql)) {
        const val = params[pIdx++];
        rows = rows.filter(w => w.status.toLowerCase() === val.toLowerCase());
      }
      if (/LOWER\(source\)/.test(sql)) {
        const val = params[pIdx++];
        rows = rows.filter(w => w.source.toLowerCase() === val.toLowerCase());
      }
      return { rows };
    }

    // UPDATE work_orders SET status = $1 ... WHERE id = $2
    if (/UPDATE work_orders\s+SET status = \$1/.test(sql)) {
      const [nextStatus, id] = params;
      const wo = woStore.find(w => w.id === id);
      if (!wo) return { rows: [] };
      wo.status = nextStatus;
      if (nextStatus === 'completed') {
        wo.completed_at = new Date().toISOString();
      }
      return { rows: [wo] };
    }

    // DELETE FROM work_orders WHERE id = $1
    if (/DELETE FROM work_orders/.test(sql)) {
      const idx = woStore.findIndex(w => w.id === params[0]);
      if (idx !== -1) woStore.splice(idx, 1);
      return { rows: [] };
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
describe('ERP3 Work Orders Routes [ERP3-B1]', () => {
  beforeEach(() => {
    woStore = [
      {
        id: 'WO-0001',
        bom_id: 'BOM-0001',
        product_sku: 'SKU-0001',
        quantity: 50,
        status: 'planned',
        source: 'manual',
        planned_start: '2026-11-15',
        planned_end: '2026-11-20',
        created_at: new Date().toISOString(),
        completed_at: null
      },
      {
        id: 'WO-0002',
        bom_id: 'BOM-0001',
        product_sku: 'SKU-0001',
        quantity: 25,
        status: 'in_progress',
        source: 'manual',
        planned_start: '2026-11-05',
        planned_end: '2026-11-12',
        created_at: new Date().toISOString(),
        completed_at: null
      },
      {
        id: 'WO-0003',
        bom_id: 'BOM-0002',
        product_sku: 'SKU-0003',
        quantity: 30,
        status: 'completed',
        source: 'manual',
        planned_start: '2026-10-20',
        planned_end: '2026-10-28',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      },
      {
        id: 'WO-0004',
        bom_id: 'BOM-0001',
        product_sku: 'SKU-0001',
        quantity: 10,
        status: 'cancelled',
        source: 'manual',
        planned_start: '2026-10-25',
        planned_end: '2026-10-30',
        created_at: new Date().toISOString(),
        completed_at: null
      },
      {
        id: 'WO-0005',
        bom_id: 'BOM-0002',
        product_sku: 'SKU-0003',
        quantity: 15,
        status: 'planned',
        source: 'shortage',
        planned_start: '2026-11-18',
        planned_end: '2026-11-25',
        created_at: new Date().toISOString(),
        completed_at: null
      }
    ];
    woSeq = 5;
  });

  describe('POST /work-orders', () => {
    it('creates a work order and returns 201', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders',
        body: {
          bom_id: 'BOM-0001',
          product_sku: 'SKU-0001',
          quantity: 20,
          source: 'manual',
          planned_start: '2026-12-01',
          planned_end: '2026-12-05'
        }
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id.startsWith('WO-'));
      assert.equal(res.body.data.status, 'planned');
      assert.equal(res.body.data.quantity, 20);
    });

    it('returns 400 when bom_id is missing', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders',
        body: { product_sku: 'SKU-0001', quantity: 10 }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /bom_id is required/);
    });

    it('returns 400 when product_sku is missing', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders',
        body: { bom_id: 'BOM-0001', quantity: 10 }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /product_sku is required/);
    });

    it('returns 400 when quantity is zero or negative', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders',
        body: { bom_id: 'BOM-0001', product_sku: 'SKU-0001', quantity: 0 }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /quantity must be a positive number/);
    });

    it('returns 400 when source is invalid', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders',
        body: { bom_id: 'BOM-0001', product_sku: 'SKU-0001', quantity: 10, source: 'invalid_source' }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /source must be either/);
    });
  });

  describe('GET /work-orders', () => {
    it('returns all work orders', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders'
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 5);
    });

    it('filters work orders by status', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders',
        query: { status: 'planned' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 2);
    });

    it('filters work orders by source', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders',
        query: { source: 'shortage' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].id, 'WO-0005');
    });
  });

  describe('GET /work-orders/:id', () => {
    it('returns a single work order for valid id', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders/WO-0001',
        params: { id: 'WO-0001' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'WO-0001');
    });

    it('returns 404 for non-existent id', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders/WO-9999',
        params: { id: 'WO-9999' }
      });
      assert.equal(res.status, 404);
    });
  });

  describe('PATCH /work-orders/:id/status (Lifecycle transitions)', () => {
    it('allows planned -> in_progress transition', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'PATCH',
        url: '/work-orders/WO-0001/status',
        params: { id: 'WO-0001' },
        body: { status: 'in_progress' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'in_progress');
    });

    it('allows in_progress -> completed transition and sets completed_at', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'PATCH',
        url: '/work-orders/WO-0002/status',
        params: { id: 'WO-0002' },
        body: { status: 'completed' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'completed');
      assert.ok(res.body.data.completed_at);
    });

    it('allows planned -> cancelled transition', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'PATCH',
        url: '/work-orders/WO-0001/status',
        params: { id: 'WO-0001' },
        body: { status: 'cancelled' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'cancelled');
    });

    it('rejects illegal transition planned -> completed with HTTP 400', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'PATCH',
        url: '/work-orders/WO-0001/status',
        params: { id: 'WO-0001' },
        body: { status: 'completed' }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /Cannot transition status/);
    });

    it('rejects illegal transition in_progress -> cancelled with HTTP 400', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'PATCH',
        url: '/work-orders/WO-0002/status',
        params: { id: 'WO-0002' },
        body: { status: 'cancelled' }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /Cannot transition status/);
    });

    it('rejects transitions from completed with HTTP 400', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'PATCH',
        url: '/work-orders/WO-0003/status',
        params: { id: 'WO-0003' },
        body: { status: 'in_progress' }
      });
      assert.equal(res.status, 400);
    });

    it('rejects unknown status with HTTP 400', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'PATCH',
        url: '/work-orders/WO-0001/status',
        params: { id: 'WO-0001' },
        body: { status: 'finished' }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /Invalid status/);
    });
  });

  describe('DELETE /work-orders/:id', () => {
    it('deletes planned work order', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'DELETE',
        url: '/work-orders/WO-0001',
        params: { id: 'WO-0001' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'WO-0001');
    });

    it('rejects deleting in_progress work order with HTTP 400', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'DELETE',
        url: '/work-orders/WO-0002',
        params: { id: 'WO-0002' }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /Cannot delete work order in status/);
    });
  });
});

