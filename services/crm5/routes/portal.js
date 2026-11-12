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

module.exports = router;
