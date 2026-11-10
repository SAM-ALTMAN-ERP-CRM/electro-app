const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const quotesRouter = require('../routes/quotes');

/**
 * Pure in-memory dispatcher for Express router (no network sockets required).
 */
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
      json(payload) {
        resolve({ status: statusCode, body: payload });
        return this;
      }
    };

    router.handle(req, res, (err) => {
      if (err) {
        resolve({ status: 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  });
}

describe('CRM1 Quotes Routes Integration Tests ([CRM1-C1])', () => {

  it('rejects POST /quotes without customer_id with HTTP 400', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'POST',
      url: '/quotes',
      body: {
        sales_rep_id: 'EMP-0001',
        items: [{ sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990 }]
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /customer_id is required/i);
  });

  it('rejects POST /quotes without sales_rep_id with HTTP 400', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'POST',
      url: '/quotes',
      body: {
        customer_id: 'CUST-0001',
        items: [{ sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990 }]
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /sales_rep_id is required/i);
  });

  it('rejects POST /quotes without items array or empty items with HTTP 400', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'POST',
      url: '/quotes',
      body: {
        customer_id: 'CUST-0001',
        sales_rep_id: 'EMP-0001',
        items: []
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /non-empty array/i);
  });

  it('rejects POST /quotes with invalid item quantity or price with HTTP 400', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'POST',
      url: '/quotes',
      body: {
        customer_id: 'CUST-0001',
        sales_rep_id: 'EMP-0001',
        items: [
          { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 0, unit_price: 42990 }
        ]
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /quantity must be a positive integer/i);
  });

  it('rejects POST /quotes with invalid discount_percent with HTTP 400', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'POST',
      url: '/quotes',
      body: {
        customer_id: 'CUST-0001',
        sales_rep_id: 'EMP-0001',
        discount_percent: 150,
        items: [
          { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990 }
        ]
      }
    });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /discount_percent must be a number between 0 and 100/i);
  });

  it('creates quote with 3 items and verifies totals, discount, and 18% GST calculation', async () => {
    // 3 items:
    // SKU-0001: 1 * 42,990 = 42,990
    // SKU-0004: 2 * 8,990 = 17,980
    // SKU-0006: 1 * 3,499 = 3,499
    // Subtotal = 64,469
    // Discount 10% = 6,446.90
    // Taxable = 58,022.10
    // GST 18% = 10,443.98
    // Total = 68,466.08
    const payload = {
      opportunity_id: 'OPP-0001',
      customer_id: 'CUST-0001',
      sales_rep_id: 'EMP-0001',
      discount_percent: 10,
      items: [
        { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990 },
        { sku: 'SKU-0004', product_name: 'Soundbar 2.1', quantity: 2, unit_price: 8990 },
        { sku: 'SKU-0006', product_name: 'Wireless Headphones', quantity: 1, unit_price: 3499 }
      ]
    };

    const res = await dispatch(quotesRouter, {
      method: 'POST',
      url: '/quotes',
      body: payload
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    const data = res.body.data;
    assert.ok(data.id.startsWith('QUO-'));
    assert.equal(data.customer_id, 'CUST-0001');
    assert.equal(data.sales_rep_id, 'EMP-0001');
    assert.equal(data.items.length, 3);
    assert.equal(data.subtotal, 64469.00);
    assert.equal(data.discount_amount, 6446.90);
    assert.equal(data.taxable_value, 58022.10);
    assert.equal(data.gst, 10443.98);
    assert.equal(data.total, 68466.08);
    assert.equal(data.needs_approval, true); // discount > 5% triggers needs_approval
  });

  it('fetches quote by ID via GET /quotes/:id and returns complete breakdown', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'GET',
      url: '/quotes/QUO-0001',
      params: { id: 'QUO-0001' }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.id, 'QUO-0001');
    assert.ok(Array.isArray(res.body.data.items));
    assert.ok(typeof res.body.data.subtotal === 'number');
    assert.ok(typeof res.body.data.gst === 'number');
    assert.ok(typeof res.body.data.total === 'number');
  });

  it('returns 404 for non-existent quote ID', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'GET',
      url: '/quotes/QUO-9999',
      params: { id: 'QUO-9999' }
    });

    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/i);
  });

  it('supports filtering quotes by status via GET /quotes?status=', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'GET',
      url: '/quotes',
      query: { status: 'accepted' }
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    res.body.data.forEach(q => {
      assert.equal(q.status, 'accepted');
    });
  });

  it('supports filtering quotes by opportunity_id via GET /quotes?opportunity_id=', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'GET',
      url: '/quotes',
      query: { opportunity_id: 'OPP-0001' }
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    res.body.data.forEach(q => {
      assert.equal(q.opportunity_id, 'OPP-0001');
    });
  });

  it('supports filtering quotes by dealer_id via GET /quotes?dealer_id=', async () => {
    const res = await dispatch(quotesRouter, {
      method: 'GET',
      url: '/quotes',
      query: { dealer_id: 'DLR-0001' }
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    res.body.data.forEach(q => {
      assert.equal(q.dealer_id, 'DLR-0001');
    });
  });

});
