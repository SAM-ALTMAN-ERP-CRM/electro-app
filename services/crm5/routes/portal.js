const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../../_shared/auth');
const { callService } = require('../../_shared/callService');
const { makePool } = require('../../_shared/db');

// Connect to crm5_db database pool with graceful fallback
let pool;
try {
  pool = makePool('crm5_db');
} catch (err) {
  console.warn('[crm5] Database pool initialization note:', err.message);
}

// In-memory fallback for portal visit tracking when DB is offline
let inMemoryVisits = [
  { id: 'PV-0001', customer_id: 'CUST-0001', visited_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'PV-0002', customer_id: 'CUST-0002', visited_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'PV-0003', customer_id: 'CUST-0003', visited_at: new Date(Date.now() - 2700000).toISOString() },
  { id: 'PV-0004', customer_id: 'CUST-0004', visited_at: new Date(Date.now() - 1200000).toISOString() },
  { id: 'PV-0005', customer_id: 'CUST-0001', visited_at: new Date(Date.now() - 300000).toISOString() }
];

// Helper to load mock JSON data safely
function loadMock(fileName) {
  const filePath = path.resolve(__dirname, `../mocks/${fileName}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`[crm5] Error reading mock ${fileName}.json:`, e.message);
    }
  }
  return [];
}

// All portal API endpoints require authentication
router.use(requireAuth);

/**
 * Log customer portal access for auditing and telemetry
 */
async function recordVisit(customerId) {
  const visitRecord = {
    id: `PV-${String(inMemoryVisits.length + 1).padStart(4, '0')}`,
    customer_id: customerId,
    visited_at: new Date().toISOString()
  };
  inMemoryVisits.unshift(visitRecord);

  if (pool) {
    try {
      await pool.query(
        'INSERT INTO portal_visits (customer_id, visited_at) VALUES ($1, NOW())',
        [customerId]
      );
    } catch (dbErr) {
      // Non-blocking telemetry fallback
      console.warn('[crm5] DB insert into portal_visits skipped:', dbErr.message);
    }
  }
}

/**
 * GET /api/portal/customers
 * Returns summary list of all registered customers for quick selection
 */
router.get('/portal/customers', (req, res) => {
  try {
    const customers = loadMock('portal-customers');
    return res.json({ data: customers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/portal/visits
 * Returns recent customer portal visits log
 */
router.get('/portal/visits', async (req, res) => {
  try {
    if (pool) {
      try {
        const result = await pool.query(
          'SELECT id, customer_id, visited_at FROM portal_visits ORDER BY visited_at DESC LIMIT 20'
        );
        if (result.rows.length > 0) {
          return res.json({ data: result.rows });
        }
      } catch (dbErr) {
        console.warn('[crm5] Falling back to in-memory portal visits:', dbErr.message);
      }
    }
    return res.json({ data: inMemoryVisits.slice(0, 20) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/portal/tickets (also /api/tickets) [CRM5-A3]
 * Accepts support ticket submission from customer portal and forwards to CRM-2 POST /api/tickets.
 * Sourced fields: customer_id, customer_name, subject, description, priority.
 * When CRM-2 is offline or in mock mode, returns mock ticket ID 'TKT-MOCK'.
 */
async function createSupportTicket(req, res) {
  try {
    const body = req.body || {};
    const { subject, description, priority, customer_id, customer_name } = body;

    // 1. Validate customer identity
    if (!customer_id || typeof customer_id !== 'string' || !customer_id.trim()) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    const cleanCustomerId = customer_id.trim().toUpperCase();
    if (!/^CUST-\d{4}$/.test(cleanCustomerId)) {
      return res.status(400).json({ error: 'customer_id must be in format CUST-0001' });
    }

    if (!customer_name || typeof customer_name !== 'string' || !customer_name.trim()) {
      return res.status(400).json({ error: 'customer_name is required' });
    }
    const cleanCustomerName = customer_name.trim();

    // 2. Validate ticket content
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'subject is required' });
    }
    const cleanSubject = subject.trim();

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }
    const cleanDescription = description.trim();

    // 3. Validate priority (CRM-2 allowed values: low, medium, high)
    const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];
    const cleanPriority = (priority ? String(priority).toLowerCase().trim() : 'medium');
    if (!ALLOWED_PRIORITIES.includes(cleanPriority)) {
      return res.status(400).json({
        error: `priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}`
      });
    }

    // 4. Log attempted ticket creation for audit and debugging
    console.log(`[crm5] Attempting ticket creation for ${cleanCustomerId} (${cleanCustomerName}): "${cleanSubject}" [priority: ${cleanPriority}]`);

    const ticketPayload = {
      customer_id: cleanCustomerId,
      customer_name: cleanCustomerName,
      subject: cleanSubject,
      description: cleanDescription,
      priority: cleanPriority
    };

    // 5. Call CRM-2 POST /api/tickets via callService
    try {
      const upstreamRes = await callService('crm2', '/api/tickets', {
        method: 'POST',
        body: ticketPayload,
        mock: 'ticket-created'
      });

      const resultTicket = upstreamRes?.data || upstreamRes;
      if (resultTicket && resultTicket.id) {
        return res.status(201).json({ data: resultTicket });
      }
    } catch (upstreamErr) {
      console.warn(`[crm5] CRM-2 service call failed (${upstreamErr.message}). Using mock integration fallback.`);
    }

    // Mock integration fallback (CRM2-A1 is MOCK):
    // Returns mock ticket ID TKT-MOCK as required by CRM5-A3 issue specification
    const mockTicket = {
      id: 'TKT-MOCK',
      customer_id: cleanCustomerId,
      customer_name: cleanCustomerName,
      subject: cleanSubject,
      description: cleanDescription,
      priority: cleanPriority,
      status: 'open',
      created_at: new Date().toISOString()
    };

    return res.status(201).json({
      data: mockTicket,
      message: 'Support ticket registered via CRM-2 mock integration.'
    });
  } catch (err) {
    console.error('[crm5] createSupportTicket unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error submitting support ticket.' });
  }
}

// Register ticket creation endpoints
router.post('/portal/tickets', createSupportTicket);
router.post('/tickets', createSupportTicket);

/**
 * GET /api/portal/orders/:id (also /api/orders/:id) [CRM5-A3]
 * Retrieves single order details from ERP-4 GET /api/sales-orders/:id for tracking.
 * Returns order status, item breakdown, customer details, and timestamps.
 */
async function getOrderTracking(req, res) {
  try {
    const rawId = req.params.id || req.params.orderId;
    if (!rawId || !rawId.trim()) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }
    const orderId = rawId.trim().toUpperCase();

    // 1. Attempt retrieval from ERP-4 via callService
    let order = null;
    try {
      const erpRes = await callService('erp4', `/api/sales-orders/${orderId}`, {
        method: 'GET',
        mock: 'sales-orders'
      });

      if (Array.isArray(erpRes)) {
        order = erpRes.find(o => o.id === orderId);
      } else if (erpRes && (erpRes.id === orderId || erpRes.data?.id === orderId)) {
        order = erpRes.data || erpRes;
      }
    } catch (err) {
      console.warn(`[crm5] ERP-4 call failed for order ${orderId} (${err.message}). Checking local portal mock.`);
    }

    // 2. Fall back to CRM-5 local mock orders if ERP-4 service/mock did not resolve this order
    if (!order || !order.id) {
      const localOrders = loadMock('portal-orders');
      order = localOrders.find(o => o.id === orderId);
    }

    // 3. Order not found in upstream or mock records
    if (!order) {
      return res.status(404).json({
        error: `Sales order '${orderId}' not found in tracking system. Please check the order reference number.`
      });
    }

    return res.json({ data: order });
  } catch (err) {
    console.error('[crm5] getOrderTracking error:', err.message);
    return res.status(500).json({ error: 'Internal server error retrieving order tracking data.' });
  }
}

// Register order tracking endpoints
router.get('/portal/orders/:id', getOrderTracking);
router.get('/orders/:id', getOrderTracking);

/**
 * Shared handler to fetch a customer's full portal overview:
 * - Customer contact and GST details
 * - Order history (My Orders)
 * - Service desk tickets (My Tickets)
 * - Billing records (My Invoices)
 */
async function getCustomerOverview(req, res) {
  try {
    const rawId = req.params.customerId || req.params.customer_id;
    if (!rawId) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }

    const customerId = rawId.trim().toUpperCase();

    // 1. Fetch customer details
    let customers = [];
    try {
      customers = await callService('crm5', '/api/portal/customers', { mock: 'portal-customers' });
    } catch {
      customers = loadMock('portal-customers');
    }

    const customer = (customers || []).find(c => c.id === customerId);

    // If customer not found, return clean 404 with friendly message
    if (!customer) {
      return res.status(404).json({
        error: `Customer ID '${customerId}' was not found in our records. Please verify the ID (e.g., CUST-0001 to CUST-0008) and try again.`
      });
    }

    // 2. Fetch orders
    let allOrders = [];
    try {
      allOrders = await callService('crm5', '/api/orders', { mock: 'portal-orders' });
    } catch {
      allOrders = loadMock('portal-orders');
    }
    const customerOrders = (allOrders || []).filter(o => o.customer_id === customerId);

    // 3. Fetch tickets
    let allTickets = [];
    try {
      allTickets = await callService('crm5', '/api/tickets', { mock: 'portal-tickets' });
    } catch {
      allTickets = loadMock('portal-tickets');
    }
    const customerTickets = (allTickets || []).filter(t => t.customer_id === customerId);

    // 4. Fetch invoices
    let allInvoices = [];
    try {
      allInvoices = await callService('crm5', '/api/invoices', { mock: 'portal-invoices' });
    } catch {
      allInvoices = loadMock('portal-invoices');
    }
    const customerInvoices = (allInvoices || []).filter(i => i.customer_id === customerId);

    // Compute key statistics
    const totalSpent = customerOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
    const pendingInvoices = customerInvoices.filter(i => i.status !== 'paid');
    const openTickets = customerTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');

    // Telemetry: record visit
    await recordVisit(customerId);

    return res.json({
      data: {
        customer,
        orders: customerOrders,
        tickets: customerTickets,
        invoices: customerInvoices,
        stats: {
          total_orders: customerOrders.length,
          total_spent: Math.round(totalSpent * 100) / 100,
          total_tickets: customerTickets.length,
          open_tickets: openTickets.length,
          total_invoices: customerInvoices.length,
          pending_invoices: pendingInvoices.length
        }
      }
    });
  } catch (err) {
    console.error('[crm5] getCustomerOverview error:', err.message);
    return res.status(500).json({ error: 'Internal server error processing customer portal overview.' });
  }
}

// Support both /api/portal/:customerId/overview and /api/portal/:customerId
router.get('/portal/:customerId/overview', getCustomerOverview);
router.get('/portal/:customerId', getCustomerOverview);

/**
 * Step status calculation helper (pure logic, shared for tests and verification)
 */
function getStepStatus(orderStatus, stepKey) {
  const normalized = (orderStatus || '').toLowerCase().trim();
  const sequence = ['created', 'confirmed', 'dispatched', 'delivered'];
  const currentIndex = sequence.indexOf(normalized);

  if (currentIndex === -1) {
    return 'pending';
  }

  const stepIndex = sequence.indexOf(stepKey);
  if (stepIndex < currentIndex) {
    return 'completed';
  } else if (stepIndex === currentIndex) {
    return 'current';
  } else {
    return 'pending';
  }
}

router.getStepStatus = getStepStatus;

module.exports = router;

