// services/erp3/tests/bomsRoutes.test.js
// Tests for POST /api/boms, GET /api/boms, GET /api/boms/:id
// Uses Node's built-in test runner (node:test) — no extra packages needed.
// The Postgres pool is mocked so no real database is required.

'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// ── 1. Stub AUTH so requireAuth just calls next() ────────────────────────────
// The real auth module reads a JWT from the Authorization header.
// We bypass it in tests so we don't need a valid token.
process.env.AUTH_REQUIRED = 'false';

// ── 2. Mock the pg Pool BEFORE the router is required ────────────────────────
// The router does `const pool = new Pool(...)` at module load time.
// We override require('pg') to return a fake Pool class whose
// connect() / query() methods return pre-defined data.

// In-memory BOM store (simulates the DB rows returned by Postgres)
let bomStore = [];
let itemStore = [];
let bomSeq = 0;
let itemSeq = 0;

function nextBomId()  { return `BOM-${String(++bomSeq).padStart(4, '0')}`; }
function nextItemId() { return `BOMI-${String(++itemSeq).padStart(4, '0')}`; }

// Fake pg client returned by pool.connect()
function makeFakeClient(shouldError) {
  return {
    query: async (sql, params) => {
      if (shouldError) throw Object.assign(new Error('DB error'), { code: 'XXXX' });

      // BEGIN / COMMIT / ROLLBACK — no-ops in our fake
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql.trim())) return { rows: [] };

      // INSERT INTO boms
      if (/INSERT INTO boms/.test(sql)) {
        const [product_sku, product_name, version] = params;
        const row = {
          id: nextBomId(),
          product_sku,
          product_name,
          version: version || 1,
          active: true,
          created_at: new Date().toISOString()
        };
        // Simulate unique constraint: same product_sku + version → error
        const dupe = bomStore.find(b => b.product_sku === product_sku && b.version === row.version);
        if (dupe) throw Object.assign(new Error('duplicate'), { code: '23505' });
        bomStore.push(row);
        return { rows: [row] };
      }

      // INSERT INTO bom_items
      if (/INSERT INTO bom_items/.test(sql)) {
        const [bom_id, component_sku, component_name, qty_per_unit] = params;
        const row = { id: nextItemId(), bom_id, component_sku, component_name, qty_per_unit };
        itemStore.push(row);
        return { rows: [row] };
      }

      return { rows: [] };
    },
    release: () => {}
  };
}

// Fake pool — pool.query() used for SELECT statements
const fakePool = {
  _shouldError: false,
  connect: async function () { return makeFakeClient(this._shouldError); },
  query: async function (sql, params = []) {
    if (this._shouldError) throw new Error('DB error');

    // SELECT * FROM boms WHERE id = $1
    if (/FROM boms WHERE id/.test(sql)) {
      return { rows: bomStore.filter(b => b.id === params[0]) };
    }

    // SELECT * FROM boms (with optional WHERE product_sku = $1)
    if (/FROM boms/.test(sql)) {
      if (params.length > 0) return { rows: bomStore.filter(b => b.product_sku === params[0]) };
      return { rows: [...bomStore] };
    }

    // SELECT * FROM bom_items WHERE bom_id = $1
    if (/FROM bom_items/.test(sql)) {
      return { rows: itemStore.filter(i => i.bom_id === params[0]) };
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

// ── 3. Load the router (after mocks are in place) ────────────────────────────
const bomsRouter = require('../routes/boms');

// ── 4. Minimal Express dispatcher (no real HTTP socket needed) ────────────────
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

// Sample 5-component item list (uses shared SKUs)
const FIVE_ITEMS = [
  { component_sku: 'SKU-0101', component_name: 'Display Panel',    qty_per_unit: 1 },
  { component_sku: 'SKU-0102', component_name: 'Main Board',        qty_per_unit: 1 },
  { component_sku: 'SKU-0103', component_name: 'Power Supply Unit', qty_per_unit: 1 },
  { component_sku: 'SKU-0104', component_name: 'Remote Control',    qty_per_unit: 1 },
  { component_sku: 'SKU-0105', component_name: 'Packaging Box',     qty_per_unit: 1 }
];

// ── 5. Test suite ─────────────────────────────────────────────────────────────
describe('ERP3 BOM Routes [ERP3-A1]', () => {

  before(() => {
    // Reset store before each suite run
    bomStore = []; itemStore = [];
    bomSeq = 0;    itemSeq = 0;
    fakePool._shouldError = false;
  });

  // ── POST /api/boms ──────────────────────────────────────────────────────────
  describe('POST /api/boms', () => {

    it('creates a BOM with 5 components and returns 201', async () => {
      const res = await dispatch(bomsRouter, {
        method: 'POST',
        url: '/boms',
        body: { product_sku: 'SKU-0001', product_name: '55-Inch LED Smart TV', items: FIVE_ITEMS }
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.data, 'response should have a data key');
      assert.equal(res.body.data.product_sku, 'SKU-0001');
      assert.equal(res.body.data.items.length, 5, 'should return 5 items');
      // All 5 shared component SKUs must be present
      const skus = res.body.data.items.map(i => i.component_sku);
      ['SKU-0101','SKU-0102','SKU-0103','SKU-0104','SKU-0105'].forEach(sku => {
        assert.ok(skus.includes(sku), `missing component ${sku}`);
      });
    });

    it('returns 400 when product_sku is missing', async () => {
      const res = await dispatch(bomsRouter, {
        method: 'POST',
        url: '/boms',
        body: { product_name: '65-Inch OLED TV', items: FIVE_ITEMS }
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    });

    it('returns 400 when items array is empty', async () => {
      const res = await dispatch(bomsRouter, {
        method: 'POST',
        url: '/boms',
        body: { product_sku: 'SKU-0002', product_name: 'Test TV', items: [] }
      });
      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    });

    it('returns 400 when an item is missing component_sku', async () => {
      const badItems = [{ component_name: 'Panel', qty_per_unit: 1 }];
      const res = await dispatch(bomsRouter, {
        method: 'POST',
        url: '/boms',
        body: { product_sku: 'SKU-0002', product_name: 'Test TV', items: badItems }
      });
      assert.equal(res.status, 400);
    });

    it('returns 400 when qty_per_unit is zero', async () => {
      const badItems = [{ component_sku: 'SKU-0101', component_name: 'Panel', qty_per_unit: 0 }];
      const res = await dispatch(bomsRouter, {
        method: 'POST',
        url: '/boms',
        body: { product_sku: 'SKU-0002', product_name: 'Test TV', items: badItems }
      });
      assert.equal(res.status, 400);
    });

    it('returns 409 on duplicate product_sku + version', async () => {
      // First insert succeeds, second should return 409
      await dispatch(bomsRouter, {
        method: 'POST',
        url: '/boms',
        body: { product_sku: 'SKU-0003', product_name: '65-Inch OLED TV', version: 1, items: FIVE_ITEMS }
      });
      const res = await dispatch(bomsRouter, {
        method: 'POST',
        url: '/boms',
        body: { product_sku: 'SKU-0003', product_name: '65-Inch OLED TV', version: 1, items: FIVE_ITEMS }
      });
      assert.equal(res.status, 409);
    });

  });

  // ── GET /api/boms ───────────────────────────────────────────────────────────
  describe('GET /api/boms', () => {

    it('returns all BOMs as an array', async () => {
      const res = await dispatch(bomsRouter, { method: 'GET', url: '/boms' });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data), 'data should be an array');
      assert.ok(res.body.data.length >= 1);
    });

    it('filters by product_sku query param', async () => {
      const res = await dispatch(bomsRouter, {
        method: 'GET',
        url: '/boms',
        query: { product_sku: 'SKU-0001' }
      });
      assert.equal(res.status, 200);
      res.body.data.forEach(b => {
        assert.equal(b.product_sku, 'SKU-0001');
      });
    });

  });

  // ── GET /api/boms/:id ───────────────────────────────────────────────────────
  describe('GET /api/boms/:id', () => {

    it('returns BOM with items for a valid id', async () => {
      const id = bomStore[0]?.id;
      assert.ok(id, 'store should have at least one BOM from earlier tests');
      const res = await dispatch(bomsRouter, {
        method: 'GET',
        url: `/boms/${id}`,
        params: { id }
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, id);
      assert.ok(Array.isArray(res.body.data.items));
      assert.equal(res.body.data.items.length, 5);
    });

    it('returns 404 for a non-existent BOM id', async () => {
      const res = await dispatch(bomsRouter, {
        method: 'GET',
        url: '/boms/BOM-9999',
        params: { id: 'BOM-9999' }
      });
      assert.equal(res.status, 404);
      assert.ok(res.body.error);
    });

  });

});
