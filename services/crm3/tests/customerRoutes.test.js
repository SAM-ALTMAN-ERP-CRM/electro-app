const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing
process.env.AUTH_REQUIRED = 'false';

const customersRouter = require('../routes/customers');

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

describe('CRM3 Customers HTTP Routes Integration Tests', () => {

  it('rejects POST /customers with phone < 10 digits', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers',
      body: {
        name: 'Test Customer',
        type: 'retail',
        email: 'test@example.com',
        phone: '98765'
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.equal(res.body.errors.phone, 'Phone number must be exactly 10 digits');
  });

  it('rejects POST /customers with bad email format', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers',
      body: {
        name: 'Test Customer',
        type: 'retail',
        email: 'invalid-email-address',
        phone: '9876543210'
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.equal(res.body.errors.email, 'Invalid email format');
  });

  it('rejects POST /customers for corporate customer without GSTIN', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers',
      body: {
        name: 'Acme Corp',
        type: 'corporate',
        email: 'acme@corp.com',
        phone: '9876543210'
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.equal(res.body.errors.gstin, 'GSTIN is required for corporate customer type');
  });

  it('rejects POST /customers for dealer customer with non-15 character GSTIN', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers',
      body: {
        name: 'Dealer Hub',
        type: 'dealer',
        email: 'dealer@hub.com',
        phone: '9876543210',
        gstin: 'SHORT'
      }
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
    assert.equal(res.body.errors.gstin, 'GSTIN must be exactly 15 alphanumeric characters');
  });

  it('creates customer successfully when all validation rules pass', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers',
      body: {
        name: 'Valid Retail Customer',
        type: 'retail',
        email: 'valid.retail@example.com',
        phone: '9876543210',
        billing_address: '123 Market St',
        shipping_address: '123 Market St',
        city: 'Mumbai'
      }
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.ok(res.body.data.id.startsWith('CUST-'));
    assert.equal(res.body.data.name, 'Valid Retail Customer');
    assert.equal(res.body.data.email, 'valid.retail@example.com');
  });

  it('validates customer payload via POST /customers/validate without saving', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/validate',
      body: {
        name: 'Validated Customer',
        type: 'retail',
        email: 'check@example.com',
        phone: '9876543210'
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.valid, true);
    assert.equal(res.body.data.name, 'Validated Customer');
  });

  it('returns invalid on POST /customers/validate when input fails validation', async () => {
    const res = await dispatch(customersRouter, {
      method: 'POST',
      url: '/customers/validate',
      body: {
        name: '',
        type: 'retail',
        email: 'bad',
        phone: '123'
      }
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.valid, false);
    assert.ok(res.body.errors.name);
    assert.ok(res.body.errors.email);
    assert.ok(res.body.errors.phone);
  });
});
