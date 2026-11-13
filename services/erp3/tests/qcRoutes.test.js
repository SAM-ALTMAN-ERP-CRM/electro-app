// services/erp3/tests/qcRoutes.test.js
// Tests for [ERP3-D1] QC API
// Uses Node's built-in test runner (node:test) — no external test libraries required.

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── 1. Stub AUTH so requireAuth allows the test requests through ─────────────
process.env.AUTH_REQUIRED = 'false';

// ── 2. Mock PG Pool BEFORE router is loaded ──────────────────────────────────
let qcStore = [];
let qcSeq = 0;

function nextQcId() {
  return `QC-${String(++qcSeq).padStart(4, '0')}`;
}

const fakePool = {
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  }),
  query: async (sql, params = []) => {
    // INSERT INTO qc_checks
    if (/INSERT INTO qc_checks/.test(sql)) {
      const [wo_id, inspector, checked_qty, passed_qty, failed_qty, defect_reason, result] = params;
      const row = {
        id: nextQcId(),
        wo_id,
        inspector,
        checked_qty: Number(checked_qty),
        passed_qty: Number(passed_qty),
        failed_qty: Number(failed_qty),
        defect_reason: defect_reason || null,
        result,
        checked_at: new Date().toISOString()
      };
      qcStore.push(row);
      return { rows: [row] };
    }

    // SELECT qc_checks WHERE id = $1
    if (/FROM qc_checks\s+WHERE id = \$1/.test(sql)) {
      const found = qcStore.find(q => q.id === params[0]);
      return { rows: found ? [found] : [] };
    }

    // SELECT qc_checks with optional filter by wo_id
    if (/FROM qc_checks/.test(sql)) {
      let rows = [...qcStore];
      if (/wo_id = \$1/.test(sql)) {
        rows = rows.filter(q => q.wo_id === params[0]);
      }
      return { rows };
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
const qcRouter = require('../routes/qc');

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
describe('ERP3 QC Routes [ERP3-D1]', () => {
  beforeEach(() => {
    qcStore = [
      {
        id: 'QC-0001',
        wo_id: 'WO-0001',
        inspector: 'EMP-0005',
        checked_qty: 50,
        passed_qty: 50,
        failed_qty: 0,
        defect_reason: null,
        result: 'pass',
        checked_at: new Date().toISOString()
      },
      {
        id: 'QC-0002',
        wo_id: 'WO-0002',
        inspector: 'EMP-0006',
        checked_qty: 25,
        passed_qty: 15,
        failed_qty: 10,
        defect_reason: 'dead pixel',
        result: 'fail',
        checked_at: new Date().toISOString()
      },
      {
        id: 'QC-0003',
        wo_id: 'WO-0003',
        inspector: 'EMP-0005',
        checked_qty: 30,
        passed_qty: 27,
        failed_qty: 3,
        defect_reason: 'scratch',
        result: 'rework',
        checked_at: new Date().toISOString()
      }
    ];
    qcSeq = 3;
  });

  describe('POST /qc (Result Calculation Rules)', () => {
    it('calculates result = pass when failed_qty is 0', async () => {
      const res = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          wo_id: 'WO-0004',
          inspector: 'EMP-0007',
          checked_qty: 20,
          passed_qty: 20,
          failed_qty: 0
        }
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.result, 'pass');
      assert.ok(res.body.data.id.startsWith('QC-'));
    });

    it('calculates result = fail when failed_qty > 20% of checked_qty', async () => {
      const res = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          wo_id: 'WO-0004',
          inspector: 'EMP-0006',
          checked_qty: 10,
          passed_qty: 7,
          failed_qty: 3, // 30% > 20%
          defect_reason: 'no power'
        }
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.result, 'fail');
      assert.equal(res.body.data.defect_reason, 'no power');
    });

    it('calculates result = rework when failed_qty > 0 and <= 20% of checked_qty', async () => {
      const res = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          wo_id: 'WO-0005',
          inspector: 'EMP-0005',
          checked_qty: 50,
          passed_qty: 45,
          failed_qty: 5, // 10% <= 20%
          defect_reason: 'scratch'
        }
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.result, 'rework');
    });

    it('returns HTTP 400 when passed_qty + failed_qty !== checked_qty', async () => {
      const res = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          wo_id: 'WO-0001',
          inspector: 'EMP-0005',
          checked_qty: 50,
          passed_qty: 40,
          failed_qty: 5 // 40 + 5 = 45 != 50
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /must equal checked_qty/);
    });

    it('returns HTTP 400 when wo_id is missing', async () => {
      const res = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          inspector: 'EMP-0005',
          checked_qty: 10,
          passed_qty: 10,
          failed_qty: 0
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /wo_id is required/);
    });

    it('returns HTTP 400 when inspector is missing', async () => {
      const res = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          wo_id: 'WO-0001',
          checked_qty: 10,
          passed_qty: 10,
          failed_qty: 0
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /inspector is required/);
    });

    it('returns HTTP 400 when quantities are negative or zero', async () => {
      const res = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          wo_id: 'WO-0001',
          inspector: 'EMP-0005',
          checked_qty: 0,
          passed_qty: 0,
          failed_qty: 0
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /positive number/);
    });
  });

  describe('GET /qc', () => {
    it('returns all QC checks', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 3);
    });

    it('filters QC checks by wo_id query parameter', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc',
        query: { wo_id: 'WO-0001' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].wo_id, 'WO-0001');
    });
  });

  describe('GET /qc/:id', () => {
    it('returns a single QC check for valid ID', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/QC-0001',
        params: { id: 'QC-0001' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'QC-0001');
      assert.equal(res.body.data.result, 'pass');
    });

    it('returns HTTP 404 for non-existent QC check ID', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/QC-9999',
        params: { id: 'QC-9999' }
      });

      assert.equal(res.status, 404);
      assert.match(res.body.error, /not found/);
    });
  });
});
