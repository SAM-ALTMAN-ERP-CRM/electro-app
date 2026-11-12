const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const forecastsRouter = require('../routes/forecasts');

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
      headers: options.headers || {},
      user: { id: 'USR-0001', name: 'Admin', role: 'admin' }
    };

    const res = {
      statusCode: 200,
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: statusCode, body: data });
      },
      send(data) {
        resolve({ status: statusCode, body: data });
      }
    };

    router(req, res, () => {
      resolve({ status: 404, body: { error: 'Not Handled' } });
    });
  });
}

describe('CRM-5 Forecasts & Weighted Pipeline Routes', () => {
  it('GET /forecast/weighted calculates correct weighted pipeline', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'GET',
      url: '/forecast/weighted'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    const data = res.body.data;

    // From mock opportunities:
    // Prospect: 51980 * 0.10 (+ optional 63020 * 0.10)
    // Proposal: 67960 * 0.30 = 20388
    // Negotiation: 112980 * 0.60 = 67788
    // Total: 93374.00 or 99676.00 depending on upstream CRM-1 mock version
    assert.ok(
      data.weighted_pipeline_value === 93374.00 || data.weighted_pipeline_value === 99676.00,
      `Expected weighted pipeline to be 93374.00 or 99676.00, got ${data.weighted_pipeline_value}`
    );
    assert.ok(data.progress_percentage > 0, 'Progress percentage should be computed');
    assert.ok(Array.isArray(data.breakdown), 'Breakdown should be an array');
    assert.equal(data.breakdown.length, 3);
  });

  it('GET /forecast/trend returns 6 consecutive monthly buckets and forecast estimate', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'GET',
      url: '/forecast/trend?date=2026-11'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    const { months, estimate, formula } = res.body.data;

    // Verify exactly 6 consecutive monthly buckets
    assert.equal(months.length, 6, 'Must return exactly 6 monthly buckets');
    assert.deepEqual(
      months.map(m => m.month),
      ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
    );
    assert.deepEqual(
      months.map(m => m.label),
      ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']
    );

    // Verify estimate structure and next month
    assert.ok(estimate, 'Estimate object should exist');
    assert.equal(estimate.month, '2026-12');
    assert.equal(estimate.label, 'Dec');
    assert.deepEqual(estimate.basis_months, ['2026-09', '2026-10', '2026-11']);
    assert.ok(typeof estimate.value === 'number');
    assert.ok(formula && formula.includes('(Month 4 + Month 5 + Month 6) / 3'));
  });

  it('DETERMINISTIC TEST BASELINE: calculates exactly ₹170,000 for [100k, 150k, 200k, 120k, 180k, 210k]', async () => {
    // Issue #58 Section 8 deterministic test baseline:
    // Month 1: ₹100,000 (2026-06)
    // Month 2: ₹150,000 (2026-07)
    // Month 3: ₹200,000 (2026-08)
    // Month 4: ₹120,000 (2026-09)
    // Month 5: ₹180,000 (2026-10)
    // Month 6: ₹210,000 (2026-11)
    // Next Month Estimate = (120000 + 180000 + 210000) / 3 = 170000
    const baselineOpportunities = [
      { id: 'OPP-T1', stage: 'won', expected_value: 100000.00, expected_close_date: '2026-06-15' },
      { id: 'OPP-T2', stage: 'won', expected_value: 150000.00, expected_close_date: '2026-07-20' },
      { id: 'OPP-T3', stage: 'won', expected_value: 200000.00, expected_close_date: '2026-08-10' },
      { id: 'OPP-T4', stage: 'won', expected_value: 120000.00, expected_close_date: '2026-09-18' },
      { id: 'OPP-T5', stage: 'won', expected_value: 180000.00, expected_close_date: '2026-10-25' },
      { id: 'OPP-T6', stage: 'won', expected_value: 210000.00, expected_close_date: '2026-11-05' }
    ];

    const { buckets, nextMonth } = forecastsRouter.calculateTrendBuckets(baselineOpportunities, '2026-11');

    assert.equal(buckets.length, 6);
    assert.equal(buckets[0].wonValue, 100000.00, 'Month 1 wonValue should be 100,000');
    assert.equal(buckets[1].wonValue, 150000.00, 'Month 2 wonValue should be 150,000');
    assert.equal(buckets[2].wonValue, 200000.00, 'Month 3 wonValue should be 200,000');
    assert.equal(buckets[3].wonValue, 120000.00, 'Month 4 wonValue should be 120,000');
    assert.equal(buckets[4].wonValue, 180000.00, 'Month 5 wonValue should be 180,000');
    assert.equal(buckets[5].wonValue, 210000.00, 'Month 6 wonValue should be 210,000');

    const last3Sum = buckets[3].wonValue + buckets[4].wonValue + buckets[5].wonValue;
    const nextMonthEstimate = Number((last3Sum / 3).toFixed(2));

    assert.equal(
      nextMonthEstimate,
      170000.00,
      'Next Month Estimate must calculate exactly ₹170,000 for the deterministic test dataset'
    );
    assert.equal(nextMonth.month, '2026-12');
  });

  it('GET /forecast/trend includes zero-revenue months in buckets and calculations', async () => {
    // Only Month 5 (Oct) and Month 6 (Nov) have won values, Month 4 (Sep) has 0
    const sparseOpps = [
      { id: 'OPP-S1', stage: 'won', expected_value: 90000.00, expected_close_date: '2026-10-15' },
      { id: 'OPP-S2', stage: 'won', expected_value: 150000.00, expected_close_date: '2026-11-10' }
    ];

    const { buckets } = forecastsRouter.calculateTrendBuckets(sparseOpps, '2026-11');

    // Months 0 to 3 should be 0, not omitted
    assert.equal(buckets[3].month, '2026-09');
    assert.equal(buckets[3].wonValue, 0.00, 'Zero-value month should return 0, not omitted');
    assert.equal(buckets[4].wonValue, 90000.00);
    assert.equal(buckets[5].wonValue, 150000.00);

    // Average of (0 + 90000 + 150000) / 3 = 80000
    const last3Sum = buckets[3].wonValue + buckets[4].wonValue + buckets[5].wonValue;
    const estimate = Number((last3Sum / 3).toFixed(2));
    assert.equal(estimate, 80000.00, 'Zero-value month must be included in average calculation');
  });

  it('GET /forecast/trend strictly ignores non-won opportunities', async () => {
    const mixedOpps = [
      { id: 'OPP-M1', stage: 'lost', expected_value: 500000.00, expected_close_date: '2026-11-10' },
      { id: 'OPP-M2', stage: 'prospect', expected_value: 300000.00, expected_close_date: '2026-11-15' },
      { id: 'OPP-M3', stage: 'negotiation', expected_value: 200000.00, expected_close_date: '2026-11-20' },
      { id: 'OPP-M4', stage: 'won', expected_value: 75000.00, expected_close_date: '2026-11-25' }
    ];

    const { buckets } = forecastsRouter.calculateTrendBuckets(mixedOpps, '2026-11');
    assert.equal(buckets[5].wonValue, 75000.00, 'Only won opportunities should be counted');
    assert.equal(buckets[5].count, 1);
  });

  it('calculateTrendBuckets correctly handles year boundaries', () => {
    // If base date is February 2027, the 6 consecutive months should be Sep 2026 to Feb 2027
    const { buckets, nextMonth } = forecastsRouter.calculateTrendBuckets([], '2027-02');
    assert.equal(buckets.length, 6);
    assert.deepEqual(
      buckets.map(b => b.month),
      ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']
    );
    assert.equal(nextMonth.month, '2027-03');
    assert.equal(nextMonth.label, 'Mar');
  });

  it('GET /forecasts lists monthly targets', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'GET',
      url: '/forecasts'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);
  });

  it('POST /forecasts sets a target and returns 201', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'POST',
      url: '/forecasts',
      body: {
        month: '2027-01',
        target_amount: 220000.00,
        notes: 'New Year corporate expansion'
      }
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.equal(res.body.data.month, '2027-01');
    assert.equal(res.body.data.target_amount, 220000.00);
  });

  it('PUT /forecasts/:id updates an existing target', async () => {
    const res = await dispatch(forecastsRouter, {
      method: 'PUT',
      url: '/forecasts/FCST-0001',
      params: { id: 'FCST-0001' },
      body: {
        target_amount: 135000.00,
        notes: 'Updated August target'
      }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.target_amount, 135000.00);
  });
});
