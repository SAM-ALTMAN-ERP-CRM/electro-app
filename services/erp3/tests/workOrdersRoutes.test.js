// services/erp3/tests/workOrdersRoutes.test.js
// Tests for [ERP3-B1] & [ERP3-B3] Work Orders API
// Uses Node's built-in test runner (node:test) — no external test libraries required.

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── 1. Stub AUTH so requireAuth allows the test requests through ─────────────
process.env.AUTH_REQUIRED = 'false';

// ── 2. Mock PG Pool BEFORE router is loaded ──────────────────────────────────
let woStore = [];
let womStore = [];
let woSeq = 0;
let womSeq = 0;

function nextWoId() {
  return `WO-${String(++woSeq).padStart(4, '0')}`;
}

function nextWomId() {
  return `WOM-${String(++womSeq).padStart(4, '0')}`;
}

const fakePool = {
  connect: async () => ({
    query: async (sql, params = []) => {
      if (/BEGIN|COMMIT|ROLLBACK/.test(sql)) {
        return { rows: [] };
      }
      return fakePool.query(sql, params);
    },
    release: () => {}
  }),
  query: async (sql, params = []) => {
    // Active BOM lookup: SELECT id FROM boms WHERE product_sku = $1 AND active = TRUE
    if (/FROM boms WHERE product_sku = \$1 AND active = TRUE/i.test(sql)) {
      const sku = params[0];
      if (sku === 'SKU-0001') return { rows: [{ id: 'BOM-0001' }] };
      if (sku === 'SKU-0003') return { rows: [{ id: 'BOM-0002' }] };
      return { rows: [] };
    }

    // Single BOM lookup: SELECT id, product_sku FROM boms WHERE id = $1
    if (/FROM boms WHERE id = \$1/i.test(sql)) {
      const id = params[0];
      if (id === 'BOM-0001') return { rows: [{ id: 'BOM-0001', product_sku: 'SKU-0001' }] };
      if (id === 'BOM-0002') return { rows: [{ id: 'BOM-0002', product_sku: 'SKU-0003' }] };
      return { rows: [] };
    }

    // INSERT INTO work_orders
    if (/INSERT INTO work_orders/i.test(sql)) {
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

    // INSERT INTO work_order_materials ... SELECT ... FROM bom_items
    if (/INSERT INTO work_order_materials/i.test(sql)) {
      const [woId, qty] = params;
      const components = [
        { component_sku: 'SKU-0101', component_name: 'Display Panel' },
        { component_sku: 'SKU-0102', component_name: 'Main Board' },
        { component_sku: 'SKU-0103', component_name: 'Power Supply Unit' },
        { component_sku: 'SKU-0104', component_name: 'Remote Control' },
        { component_sku: 'SKU-0105', component_name: 'Packaging Box' }
      ];
      const inserted = components.map(c => {
        const item = {
          id: nextWomId(),
          wo_id: woId,
          component_sku: c.component_sku,
          component_name: c.component_name,
          required_qty: Number(qty),
          issued_qty: 0
        };
        womStore.push(item);
        return item;
      });
      return { rows: inserted };
    }

    // SELECT work_order_materials
    if (/FROM work_order_materials/i.test(sql)) {
      const woId = params[0];
      const found = womStore.filter(m => m.wo_id === woId);
      return { rows: found };
    }

    // SELECT work_orders WHERE id = $1
    if (/FROM work_orders\s+WHERE id = \$1/i.test(sql)) {
      const found = woStore.find(w => w.id === params[0]);
      return { rows: found ? [found] : [] };
    }

    // SELECT work_orders with optional filters
    if (/FROM work_orders/i.test(sql)) {
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
    if (/UPDATE work_orders\s+SET status = \$1/i.test(sql)) {
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
    if (/DELETE FROM work_orders/i.test(sql)) {
      const idx = woStore.findIndex(w => w.id === params[0]);
      if (idx !== -1) woStore.splice(idx, 1);
      womStore = womStore.filter(m => m.wo_id !== params[0]);
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
describe('ERP3 Work Orders Routes [ERP3-B1 & ERP3-B3]', () => {
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
    womStore = [
      { id: 'WOM-0001', wo_id: 'WO-0001', component_sku: 'SKU-0101', component_name: 'Display Panel', required_qty: 50, issued_qty: 0 },
      { id: 'WOM-0002', wo_id: 'WO-0001', component_sku: 'SKU-0102', component_name: 'Main Board', required_qty: 50, issued_qty: 0 },
      { id: 'WOM-0003', wo_id: 'WO-0001', component_sku: 'SKU-0103', component_name: 'Power Supply Unit', required_qty: 50, issued_qty: 0 },
      { id: 'WOM-0004', wo_id: 'WO-0001', component_sku: 'SKU-0104', component_name: 'Remote Control', required_qty: 50, issued_qty: 0 },
      { id: 'WOM-0005', wo_id: 'WO-0001', component_sku: 'SKU-0105', component_name: 'Packaging Box', required_qty: 50, issued_qty: 0 }
    ];
    woSeq = 5;
    womSeq = 5;
  });

  describe('POST /work-orders [ERP3-B1 & ERP3-B3]', () => {
    it('creates a work order and auto-fills its materials [ERP3-B3]', async () => {
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
      assert.ok(Array.isArray(res.body.data.materials));
      assert.equal(res.body.data.materials.length, 5);
      assert.equal(res.body.data.materials[0].required_qty, 20);
      assert.equal(res.body.data.materials[0].issued_qty, 0);
    });

    it('creates a shortage-style request without bom_id by resolving active BOM [ERP3-B3]', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders',
        body: {
          product_sku: 'SKU-0001',
          quantity: 15,
          source: 'shortage'
        }
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.data.id.startsWith('WO-'));
      assert.equal(res.body.data.bom_id, 'BOM-0001');
      assert.equal(res.body.data.source, 'shortage');
      assert.equal(res.body.data.quantity, 15);
      assert.ok(Array.isArray(res.body.data.materials));
      assert.equal(res.body.data.materials.length, 5);
    });

    it('returns 400 when product_sku has no active BOM', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'POST',
        url: '/work-orders',
        body: { product_sku: 'SKU-9999', quantity: 10, source: 'shortage' }
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /No active BOM found for product SKU-9999/);
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

  describe('GET /work-orders/:id [ERP3-B3 materials included]', () => {
    it('returns a single work order with materials for valid id', async () => {
      const res = await dispatch(workOrdersRouter, {
        method: 'GET',
        url: '/work-orders/WO-0001',
        params: { id: 'WO-0001' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'WO-0001');
      assert.ok(Array.isArray(res.body.data.materials));
      assert.equal(res.body.data.materials.length, 5);
      assert.equal(res.body.data.materials[0].component_sku, 'SKU-0101');
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
