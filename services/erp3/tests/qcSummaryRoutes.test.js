// services/erp3/tests/qcSummaryRoutes.test.js
// Tests for [ERP3-D3] QC Summary and Quality Gate
// Uses Node's built-in test runner (node:test) — no external libraries required.

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// ── 1. Stub AUTH so requireAuth allows the test requests through ─────────────
process.env.AUTH_REQUIRED = 'false';

// ── 2. Mock PG Pool BEFORE router is loaded ──────────────────────────────────
let qcStore = [];
let workOrdersStore = [];
let qcSeq = 5;

function nextQcId() {
  return `QC-${String(++qcSeq).padStart(4, '0')}`;
}

const fakePool = {
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  }),
  query: async (sql, params = []) => {
    // 1. Check work_orders table existence
    if (/FROM work_orders\s+WHERE id = \$1/i.test(sql)) {
      const found = workOrdersStore.find(w => w.id === params[0]);
      return { rows: found ? [found] : [] };
    }

    // 1b. Single QC check by ID
    if (/FROM qc_checks\s+WHERE id = \$1/i.test(sql)) {
      const found = qcStore.find(q => q.id === params[0]);
      return { rows: found ? [found] : [] };
    }

    // 2. Latest QC check for a work order (Gate check)
    if (/FROM qc_checks/i.test(sql) && /wo_id = \$1/i.test(sql) && /ORDER BY/i.test(sql)) {
      const matching = qcStore.filter(q => q.wo_id === params[0]);
      if (matching.length === 0) return { rows: [] };
      const sorted = [...matching].sort((a, b) => {
        const timeA = new Date(a.checked_at || 0).getTime();
        const timeB = new Date(b.checked_at || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });
      return { rows: [sorted[0]] };
    }

    // 3. Overall summary query
    if (/FROM qc_checks/i.test(sql) && /ROUND\(/i.test(sql) && !/JOIN work_orders/i.test(sql)) {
      const totalChecked = qcStore.reduce((s, q) => s + Number(q.checked_qty || 0), 0);
      const totalPassed = qcStore.reduce((s, q) => s + Number(q.passed_qty || 0), 0);
      const totalFailed = qcStore.reduce((s, q) => s + Number(q.failed_qty || 0), 0);
      const passRate = totalChecked > 0 ? Number(((totalPassed * 100) / totalChecked).toFixed(2)) : 100.00;
      return {
        rows: [{
          total_checked: totalChecked,
          total_passed: totalPassed,
          total_failed: totalFailed,
          pass_rate_pct: passRate
        }]
      };
    }

    // 4. Per-product breakdown query (JOIN qc_checks with work_orders)
    if (/JOIN work_orders/i.test(sql)) {
      const productMap = {};
      for (const q of qcStore) {
        const wo = workOrdersStore.find(w => w.id === q.wo_id);
        const sku = (wo && wo.product_sku) || 'SKU-0001';
        if (!productMap[sku]) {
          productMap[sku] = { product_sku: sku, total_checked: 0, passed_qty: 0, failed_qty: 0 };
        }
        productMap[sku].total_checked += Number(q.checked_qty || 0);
        productMap[sku].passed_qty += Number(q.passed_qty || 0);
        productMap[sku].failed_qty += Number(q.failed_qty || 0);
      }
      const rows = Object.values(productMap).map(p => ({
        ...p,
        pass_rate_pct: p.total_checked > 0 ? Number(((p.passed_qty * 100) / p.total_checked).toFixed(2)) : 100.00
      })).sort((a, b) => a.product_sku.localeCompare(b.product_sku));
      return { rows };
    }

    // 5. Defect reason query
    if (/WHERE defect_reason IS NOT NULL/i.test(sql)) {
      const defectMap = {};
      for (const q of qcStore) {
        if (q.defect_reason && String(q.defect_reason).trim()) {
          const reason = String(q.defect_reason).trim();
          if (!defectMap[reason]) {
            defectMap[reason] = { defect_reason: reason, count: 0, total_failed: 0, occurrences: 0 };
          }
          const failed = Number(q.failed_qty || 0);
          defectMap[reason].count += failed;
          defectMap[reason].total_failed += failed;
          defectMap[reason].occurrences += 1;
        }
      }
      const rows = Object.values(defectMap).sort((a, b) => b.total_failed - a.total_failed);
      return { rows };
    }

    // 6. INSERT INTO qc_checks
    if (/INSERT INTO qc_checks/i.test(sql)) {
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

    return { rows: [] };
  }
};

// Intercept `require('pg')` with fakePool
const Module = require('module');
const _origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'pg') {
    return { Pool: class { constructor() { return fakePool; } } };
  }
  return _origLoad.apply(this, arguments);
};

// ── 3. Load router after mock is set up ──────────────────────────────────────
const qcRouter = require('../routes/qc');

// ── 4. In-memory Express request dispatcher ──────────────────────────────────
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
describe('ERP3 QC Summary & Gate Routes [ERP3-D3]', () => {
  beforeEach(() => {
    qcSeq = 5;

    // Seed work orders
    workOrdersStore = [
      { id: 'WO-0001', product_sku: 'SKU-0001', quantity: 50, status: 'planned' },
      { id: 'WO-0002', product_sku: 'SKU-0001', quantity: 25, status: 'in_progress' },
      { id: 'WO-0003', product_sku: 'SKU-0003', quantity: 30, status: 'completed' },
      { id: 'WO-0004', product_sku: 'SKU-0001', quantity: 10, status: 'cancelled' },
      { id: 'WO-0005', product_sku: 'SKU-0003', quantity: 15, status: 'planned' },
      { id: 'WO-0006', product_sku: 'SKU-0001', quantity: 20, status: 'planned' }
    ];

    // Seed QC checks (matches services/erp3/db/seed.sql)
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
        checked_at: '2026-11-02T10:30:00.000Z'
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
        checked_at: '2026-11-03T14:15:00.000Z'
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
        checked_at: '2026-10-25T11:00:00.000Z'
      },
      {
        id: 'QC-0004',
        wo_id: 'WO-0004',
        inspector: 'EMP-0007',
        checked_qty: 10,
        passed_qty: 10,
        failed_qty: 0,
        defect_reason: null,
        result: 'pass',
        checked_at: '2026-10-24T09:45:00.000Z'
      },
      {
        id: 'QC-0005',
        wo_id: 'WO-0005',
        inspector: 'EMP-0006',
        checked_qty: 15,
        passed_qty: 13,
        failed_qty: 2,
        defect_reason: 'wrong label',
        result: 'rework',
        checked_at: '2026-11-08T16:20:00.000Z'
      }
    ];
  });

  describe('GET /qc/summary [ERP3-D3]', () => {
    it('returns 200 with overall pass rate matching manual calculation (88.46%)', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/summary'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data, 'Expected response to have a data envelope');

      const data = res.body.data;
      // Manual verification:
      // Total checked: 50 + 25 + 30 + 10 + 15 = 130
      // Total passed:  50 + 15 + 27 + 10 + 13 = 115
      // Total failed:  0  + 10 + 3  + 0  + 2  = 15
      // Pass rate: (115 / 130) * 100 = 88.4615... -> 88.46%
      assert.equal(data.total_checked, 130);
      assert.equal(data.total_passed, 115);
      assert.equal(data.total_failed, 15);
      assert.equal(data.pass_rate_pct, 88.46);
      assert.equal(data.overall.pass_rate_pct, 88.46);
    });

    it('returns per-product breakdown with pass rates for SKU-0001 and SKU-0003', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/summary'
      });

      assert.equal(res.status, 200);
      const perProduct = res.body.data.per_product;
      assert.ok(Array.isArray(perProduct), 'per_product must be an array');
      assert.equal(perProduct.length, 2);

      // SKU-0001: WO-0001 (50/50), WO-0002 (15/25), WO-0004 (10/10) => checked: 85, passed: 75, pass_rate: 88.24%
      const sku1 = perProduct.find(p => p.product_sku === 'SKU-0001');
      assert.ok(sku1, 'SKU-0001 breakdown must exist');
      assert.equal(sku1.total_checked, 85);
      assert.equal(sku1.passed_qty, 75);
      assert.equal(sku1.failed_qty, 10);
      assert.equal(sku1.pass_rate_pct, 88.24);

      // SKU-0003: WO-0003 (27/30), WO-0005 (13/15) => checked: 45, passed: 40, pass_rate: 88.89%
      const sku3 = perProduct.find(p => p.product_sku === 'SKU-0003');
      assert.ok(sku3, 'SKU-0003 breakdown must exist');
      assert.equal(sku3.total_checked, 45);
      assert.equal(sku3.passed_qty, 40);
      assert.equal(sku3.failed_qty, 5);
      assert.equal(sku3.pass_rate_pct, 88.89);
    });

    it('returns count per defect reason sorted by failed units descending', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/summary'
      });

      assert.equal(res.status, 200);
      const defects = res.body.data.defect_reasons;
      assert.ok(Array.isArray(defects), 'defect_reasons must be an array');
      assert.equal(defects.length, 3);

      // 'dead pixel': 10 units (QC-0002)
      // 'scratch': 3 units (QC-0003)
      // 'wrong label': 2 units (QC-0005)
      assert.equal(defects[0].defect_reason, 'dead pixel');
      assert.equal(defects[0].total_failed, 10);
      assert.equal(defects[0].count, 10);

      assert.equal(defects[1].defect_reason, 'scratch');
      assert.equal(defects[1].total_failed, 3);

      assert.equal(defects[2].defect_reason, 'wrong label');
      assert.equal(defects[2].total_failed, 2);
    });

    it('handles empty QC records gracefully with 100% default pass rate', async () => {
      qcStore = [];
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/summary'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.total_checked, 0);
      assert.equal(res.body.data.total_passed, 0);
      assert.equal(res.body.data.pass_rate_pct, 100);
      assert.equal(res.body.data.per_product.length, 0);
      assert.equal(res.body.data.defect_reasons.length, 0);
    });

    it('does not collide with GET /qc/:id when fetching summary', async () => {
      // /qc/summary must not be treated as /qc/:id where id='summary'
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/summary'
      });
      assert.equal(res.status, 200);
      assert.ok(res.body.data.overall, 'Should return summary, not individual check');

      // /qc/QC-0001 still retrieves the individual check
      const singleRes = await dispatch(qcRouter, {
        method: 'GET',
        url: '/qc/QC-0001'
      });
      assert.equal(singleRes.status, 200);
      assert.equal(singleRes.body.data.id, 'QC-0001');
    });
  });

  describe('GET /work-orders/:id/qc-status [ERP3-D3 Quality Gate]', () => {
    it('returns 400 when work order ID is missing or empty', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/ /qc-status'
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    });
    it('returns allowed: false when the latest QC result is fail (WO-0002)', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/WO-0002/qc-status'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.equal(res.body.data.wo_id, 'WO-0002');
      assert.equal(res.body.data.allowed, false, 'Failed QC check must make allowed: false');
      assert.equal(res.body.data.latest_result, 'fail');
      assert.equal(res.body.data.latest_check_id, 'QC-0002');
      assert.equal(res.body.data.defect_reason, 'dead pixel');
    });

    it('returns allowed: true when the latest QC result is pass (WO-0001)', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/WO-0001/qc-status'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.equal(res.body.data.wo_id, 'WO-0001');
      assert.equal(res.body.data.allowed, true, 'Passed QC check must make allowed: true');
      assert.equal(res.body.data.latest_result, 'pass');
      assert.equal(res.body.data.latest_check_id, 'QC-0001');
    });

    it('returns allowed: true when the latest QC result is rework (WO-0003)', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/WO-0003/qc-status'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.equal(res.body.data.wo_id, 'WO-0003');
      assert.equal(res.body.data.allowed, true, 'Rework QC check is not fail, so allowed is true');
      assert.equal(res.body.data.latest_result, 'rework');
      assert.equal(res.body.data.latest_check_id, 'QC-0003');
    });

    it('returns allowed: true when no QC check has been conducted for the work order (WO-0006)', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/WO-0006/qc-status'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.equal(res.body.data.wo_id, 'WO-0006');
      assert.equal(res.body.data.allowed, true, 'Work order without QC must be permitted');
      assert.equal(res.body.data.latest_result, null);
    });

    it('returns 404 for a work order ID that does not exist', async () => {
      const res = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/WO-9999/qc-status'
      });

      assert.equal(res.status, 404);
      assert.ok(res.body.error);
      assert.match(res.body.error, /not found/i);
    });

    it('dynamically flips allowed to true when a re-inspection passes', async () => {
      // 1. Initial status is fail
      const initialRes = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/WO-0002/qc-status'
      });
      assert.equal(initialRes.body.data.allowed, false);

      // 2. Perform a re-inspection on WO-0002 that passes
      const postRes = await dispatch(qcRouter, {
        method: 'POST',
        url: '/qc',
        body: {
          wo_id: 'WO-0002',
          inspector: 'EMP-0005',
          checked_qty: 25,
          passed_qty: 25,
          failed_qty: 0
        }
      });
      assert.equal(postRes.status, 201);
      assert.equal(postRes.body.data.result, 'pass');

      // 3. Now WO-0002 QC status should be allowed: true because the latest inspection passed
      const updatedRes = await dispatch(qcRouter, {
        method: 'GET',
        url: '/work-orders/WO-0002/qc-status'
      });
      assert.equal(updatedRes.status, 200);
      assert.equal(updatedRes.body.data.allowed, true, 'New latest check is pass, so allowed is now true');
      assert.equal(updatedRes.body.data.latest_result, 'pass');
      assert.equal(updatedRes.body.data.latest_check_id, postRes.body.data.id);
    });
  });
});
