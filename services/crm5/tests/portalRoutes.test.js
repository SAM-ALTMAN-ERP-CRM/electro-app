const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const portalRouter = require('../routes/portal');

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

describe('CRM-5 Portal Routes', () => {
  it('GET /portal/customers returns list of registered customers', async () => {
    const res = await dispatch(portalRouter, {
      method: 'GET',
      url: '/portal/customers'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'Expected array of customers');
    assert.ok(res.body.data.length >= 3, 'Expected at least 3 realistic customers');
    const firstCustomer = res.body.data[0];
    assert.ok(firstCustomer.id.startsWith('CUST-'), 'Customer ID should follow CUST- prefix');
    assert.ok(firstCustomer.name, 'Customer name should exist');
    assert.ok(firstCustomer.company_name, 'Company name should exist');
  });

  it('GET /portal/:customerId/overview returns customer details, orders, tickets, and invoices', async () => {
    const res = await dispatch(portalRouter, {
      method: 'GET',
      url: '/portal/CUST-0001/overview'
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data, 'Expected overview data payload');
    const { customer, orders, tickets, invoices, stats } = res.body.data;

    // Customer validation
    assert.equal(customer.id, 'CUST-0001');
    assert.equal(customer.name, 'Rajesh Kumar');
    assert.ok(customer.gstin, 'Customer should have GSTIN');

    // Orders validation
    assert.ok(Array.isArray(orders), 'Orders should be an array');
    assert.ok(orders.length >= 1, 'CUST-0001 should have at least 1 order');
    assert.equal(orders[0].customer_id, 'CUST-0001');
    assert.ok(orders[0].id.startsWith('SO-'), 'Order ID should start with SO-');

    // Tickets validation
    assert.ok(Array.isArray(tickets), 'Tickets should be an array');
    assert.ok(tickets.length >= 1, 'CUST-0001 should have at least 1 ticket');
    assert.equal(tickets[0].customer_id, 'CUST-0001');
    assert.ok(tickets[0].id.startsWith('TKT-'), 'Ticket ID should start with TKT-');

    // Invoices validation
    assert.ok(Array.isArray(invoices), 'Invoices should be an array');
    assert.ok(invoices.length >= 1, 'CUST-0001 should have at least 1 invoice');
    assert.equal(invoices[0].customer_id, 'CUST-0001');
    assert.ok(invoices[0].id.startsWith('INV-'), 'Invoice ID should start with INV-');

    // Stats validation
    assert.ok(stats, 'Stats should exist');
    assert.ok(typeof stats.total_spent === 'number', 'Total spent should be numeric');
    assert.ok(stats.total_orders >= 1, 'Total orders should match');
  });

  it('GET /portal/:customerId returns 404 for unknown customer ID with friendly message', async () => {
    const res = await dispatch(portalRouter, {
      method: 'GET',
      url: '/portal/CUST-9999/overview'
    });

    assert.equal(res.status, 404);
    assert.ok(res.body.error, 'Expected error message');
    assert.match(res.body.error, /Customer ID 'CUST-9999' was not found/);
  });

  it('GET /portal/visits returns logged visits', async () => {
    const res = await dispatch(portalRouter, {
      method: 'GET',
      url: '/portal/visits'
    });

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data), 'Expected visits array');
    assert.ok(res.body.data.length >= 1, 'Expected at least 1 visit');
    assert.ok(res.body.data[0].id.startsWith('PV-'), 'Visit ID should start with PV-');
  });
});
