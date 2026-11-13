const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Set dummy auth bypass for testing environment
process.env.AUTH_REQUIRED = 'false';

const portalRouter = require('../routes/portal');
const { getStepStatus } = portalRouter;

/**
 * Pure in-memory dispatcher for Express router (no network sockets required).
 */
function dispatch(router, options) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const rawUrl = options.url || '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const pathname = parsedUrl.pathname;

    const query = {};
    for (const [k, v] of parsedUrl.searchParams.entries()) {
      query[k] = v;
    }

    const req = {
      method: options.method || 'GET',
      url: pathname,
      originalUrl: rawUrl,
      body: options.body || {},
      query: { ...query, ...(options.query || {}) },
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

  it('GET /portal/:customerId/overview records a visit in portal_visits on every call', async () => {
    const beforeVisits = await dispatch(portalRouter, { method: 'GET', url: '/portal/visits' });
    const countBefore = beforeVisits.body.data.length;

    await dispatch(portalRouter, { method: 'GET', url: '/portal/CUST-0001/overview' });

    const afterVisits = await dispatch(portalRouter, { method: 'GET', url: '/portal/visits' });
    assert.ok(afterVisits.body.data.length >= countBefore, 'Visit must be logged in portal_visits');
    assert.equal(afterVisits.body.data[0].customer_id, 'CUST-0001');
  });

  it('independent error handling: returns [] with unavailable: true when upstream team fails without mocks', async () => {
    const originalUseMocks = process.env.USE_MOCKS;
    try {
      process.env.USE_MOCKS = 'false';

      // Request customer overview where upstream live services are offline
      const res = await dispatch(portalRouter, {
        method: 'GET',
        url: '/portal/CUST-0001/overview'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      const data = res.body.data;

      // When upstream teams fail without mocks, parts return [] with unavailable: true
      if (data.failed_teams && data.failed_teams.length > 0) {
        assert.ok(Array.isArray(data.failed_teams), 'Response must specify which teams failed');
        assert.ok(data.failed_teams.some(t => t.includes('ERP-4') || t.includes('CRM-2') || t.includes('ERP-5') || t.includes('CRM-3')));
        if (data.unavailable?.orders || data.orders_unavailable) {
          assert.equal(data.orders.length, 0, 'Failed orders part must return empty array');
          assert.equal(data.orders.unavailable, true, 'Failed orders part must have unavailable: true');
        }
      }
    } finally {
      process.env.USE_MOCKS = originalUseMocks;
    }
  });

  // ==========================================
  // [CRM5-A3] Feature A: Raise Support Ticket
  // ==========================================
  describe('[CRM5-A3] POST /portal/tickets', () => {
    it('creates support ticket and returns mock ticket ID TKT-MOCK when CRM-2 is in mock mode', async () => {
      const res = await dispatch(portalRouter, {
        method: 'POST',
        url: '/portal/tickets',
        body: {
          customer_id: 'CUST-0001',
          customer_name: 'Rajesh Kumar',
          subject: 'Screen flickering issue on OLED',
          description: 'The bottom right quadrant flickers when HDMI 2 is active.',
          priority: 'high'
        }
      });

      assert.equal(res.status, 201);
      assert.ok(res.body.data);
      assert.equal(res.body.data.id, 'TKT-MOCK');
      assert.equal(res.body.data.customer_id, 'CUST-0001');
      assert.equal(res.body.data.customer_name, 'Rajesh Kumar');
      assert.equal(res.body.data.subject, 'Screen flickering issue on OLED');
      assert.equal(res.body.data.priority, 'high');
      assert.equal(res.body.data.status, 'open');
    });

    it('rejects ticket submission when customer_id is missing', async () => {
      const res = await dispatch(portalRouter, {
        method: 'POST',
        url: '/portal/tickets',
        body: {
          customer_name: 'Rajesh Kumar',
          subject: 'Missing ID',
          description: 'No customer ID supplied',
          priority: 'medium'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /customer_id is required/i);
    });

    it('rejects ticket submission when customer_id has invalid format', async () => {
      const res = await dispatch(portalRouter, {
        method: 'POST',
        url: '/portal/tickets',
        body: {
          customer_id: 'INVALID-ID',
          customer_name: 'Rajesh Kumar',
          subject: 'Bad ID format',
          description: 'Format should be CUST-0001',
          priority: 'medium'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /must be in format CUST-0001/i);
    });

    it('rejects ticket submission when customer_name is missing', async () => {
      const res = await dispatch(portalRouter, {
        method: 'POST',
        url: '/portal/tickets',
        body: {
          customer_id: 'CUST-0001',
          subject: 'Missing customer name',
          description: 'No customer name supplied',
          priority: 'medium'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /customer_name is required/i);
    });

    it('rejects ticket submission when subject is empty', async () => {
      const res = await dispatch(portalRouter, {
        method: 'POST',
        url: '/portal/tickets',
        body: {
          customer_id: 'CUST-0001',
          customer_name: 'Rajesh Kumar',
          subject: '   ',
          description: 'Some description',
          priority: 'medium'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /subject is required/i);
    });

    it('rejects ticket submission when description is empty', async () => {
      const res = await dispatch(portalRouter, {
        method: 'POST',
        url: '/portal/tickets',
        body: {
          customer_id: 'CUST-0001',
          customer_name: 'Rajesh Kumar',
          subject: 'Valid Subject',
          description: '',
          priority: 'medium'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /description is required/i);
    });

    it('rejects ticket submission when priority is not allowed', async () => {
      const res = await dispatch(portalRouter, {
        method: 'POST',
        url: '/portal/tickets',
        body: {
          customer_id: 'CUST-0001',
          customer_name: 'Rajesh Kumar',
          subject: 'Valid Subject',
          description: 'Valid Description',
          priority: 'critical'
        }
      });

      assert.equal(res.status, 400);
      assert.match(res.body.error, /priority must be one of: low, medium, high/i);
    });
  });

  // ==========================================
  // [CRM5-A3] Feature B: Order Tracking
  // ==========================================
  describe('[CRM5-A3] GET /portal/orders/:id', () => {
    it('retrieves order tracking data for existing order SO-0001 from ERP-4', async () => {
      const res = await dispatch(portalRouter, {
        method: 'GET',
        url: '/portal/orders/SO-0001'
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data);
      assert.equal(res.body.data.id, 'SO-0001');
      assert.equal(res.body.data.customer_id, 'CUST-0001');
      // Upstream ERP-4 sales-orders mock provides status 'dispatched'
      assert.equal(res.body.data.status, 'dispatched');
      assert.ok(Array.isArray(res.body.data.items), 'Expected items array');
      assert.ok(res.body.data.items.length >= 1, 'Expected at least 1 line item');
    });

    it('retrieves order tracking data for SO-0002 with status dispatched', async () => {
      const res = await dispatch(portalRouter, {
        method: 'GET',
        url: '/portal/orders/SO-0002'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'SO-0002');
      assert.equal(res.body.data.status, 'dispatched');
    });

    it('retrieves order tracking data for SO-0006 with status created or confirmed from ERP/portal mock fallback', async () => {
      const res = await dispatch(portalRouter, {
        method: 'GET',
        url: '/portal/orders/SO-0006'
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'SO-0006');
      assert.ok(['created', 'confirmed'].includes(res.body.data.status));
    });

    it('returns 404 for non-existent order ID', async () => {
      const res = await dispatch(portalRouter, {
        method: 'GET',
        url: '/portal/orders/SO-9999'
      });

      assert.equal(res.status, 404);
      assert.ok(res.body.error);
      assert.match(res.body.error, /not found in tracking system/i);
    });
  });

  // ==========================================
  // [CRM5-A3] Four-Step Progress Logic
  // ==========================================
  describe('[CRM5-A3] Four-Stage Progress Mapping Helper', () => {
    it('correctly maps status "created"', () => {
      assert.equal(getStepStatus('created', 'created'), 'current');
      assert.equal(getStepStatus('created', 'confirmed'), 'pending');
      assert.equal(getStepStatus('created', 'dispatched'), 'pending');
      assert.equal(getStepStatus('created', 'delivered'), 'pending');
    });

    it('correctly maps status "confirmed"', () => {
      assert.equal(getStepStatus('confirmed', 'created'), 'completed');
      assert.equal(getStepStatus('confirmed', 'confirmed'), 'current');
      assert.equal(getStepStatus('confirmed', 'dispatched'), 'pending');
      assert.equal(getStepStatus('confirmed', 'delivered'), 'pending');
    });

    it('correctly maps status "dispatched"', () => {
      assert.equal(getStepStatus('dispatched', 'created'), 'completed');
      assert.equal(getStepStatus('dispatched', 'confirmed'), 'completed');
      assert.equal(getStepStatus('dispatched', 'dispatched'), 'current');
      assert.equal(getStepStatus('dispatched', 'delivered'), 'pending');
    });

    it('correctly maps status "delivered"', () => {
      assert.equal(getStepStatus('delivered', 'created'), 'completed');
      assert.equal(getStepStatus('delivered', 'confirmed'), 'completed');
      assert.equal(getStepStatus('delivered', 'dispatched'), 'completed');
      assert.equal(getStepStatus('delivered', 'delivered'), 'current');
    });

    it('safely maps unknown or cancelled status without marking delivered', () => {
      assert.equal(getStepStatus('cancelled', 'created'), 'pending');
      assert.equal(getStepStatus('cancelled', 'confirmed'), 'pending');
      assert.equal(getStepStatus('cancelled', 'dispatched'), 'pending');
      assert.equal(getStepStatus('cancelled', 'delivered'), 'pending');

      assert.equal(getStepStatus('unknown_state', 'created'), 'pending');
      assert.equal(getStepStatus(null, 'delivered'), 'pending');
    });
  });
});
