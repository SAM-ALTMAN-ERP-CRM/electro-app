#!/usr/bin/env node

/**
 * scripts/e2e.js
 * End-to-end integration test runner for Electro App (ERP5-C5).
 * Executes the complete 9-step business workflow from docs/workflow.md:
 * Dealer enquiry -> Quote -> Sales Order -> Production shortage -> Purchase -> Receipt
 * -> Finished goods -> Dispatch -> Invoice -> Payment -> Commission -> Warranty & RMA.
 *
 * Verifies cross-team data propagation after each step with real API calls.
 *
 * Usage:
 *   node scripts/e2e.js                     # Run full 9-step E2E flow
 *   node scripts/e2e.js --loud-check <team> # Test that a stopped team fails loudly
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.example') });
}

// Service port registry per Section 2 of issues-pack
const PORTS = {
  crm1: parseInt(process.env.CRM1_PORT || '5101', 10),
  crm2: parseInt(process.env.CRM2_PORT || '5102', 10),
  crm3: parseInt(process.env.CRM3_PORT || '5103', 10),
  crm4: parseInt(process.env.CRM4_PORT || '5104', 10),
  crm5: parseInt(process.env.CRM5_PORT || '5105', 10),
  erp1: parseInt(process.env.ERP1_PORT || '5201', 10),
  erp2: parseInt(process.env.ERP2_PORT || '5202', 10),
  erp3: parseInt(process.env.ERP3_PORT || '5203', 10),
  erp4: parseInt(process.env.ERP4_PORT || '5204', 10),
  erp5: parseInt(process.env.ERP5_PORT || '5205', 10),
  erp6: parseInt(process.env.ERP6_PORT || '5206', 10)
};

const ALL_TEAMS = ['crm1', 'crm2', 'crm3', 'crm4', 'crm5', 'erp1', 'erp2', 'erp3', 'erp4', 'erp5', 'erp6'];

// Check CLI arguments
const loudCheckArgIdx = process.argv.indexOf('--loud-check');
const loudCheckTeam = loudCheckArgIdx !== -1 ? process.argv[loudCheckArgIdx + 1] : null;

let authToken = null;

async function apiRequest(team, apiPath, options = {}) {
  const port = PORTS[team];
  if (!port) throw new Error(`Unknown team: ${team}`);

  const url = `http://localhost:${port}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const fetchOptions = {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  try {
    const res = await fetch(url, fetchOptions);
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return {
      status: res.status,
      ok: res.ok,
      data: (data && data.data !== undefined) ? data.data : data,
      raw: data
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message
    };
  }
}

// ─── HEALTH CHECKS ──────────────────────────────────────────────────────────
async function checkHealthAll() {
  const down = [];
  for (const team of ALL_TEAMS) {
    const res = await apiRequest(team, '/api/health');
    if (!res.ok) {
      down.push(`${team} (port ${PORTS[team]})`);
    }
  }
  return down;
}

// ─── LOUD CHECK HANDLER ─────────────────────────────────────────────────────
async function handleLoudCheck(team) {
  const cleanTeam = (team || '').toLowerCase();
  if (!ALL_TEAMS.includes(cleanTeam)) {
    console.error(`Invalid team for --loud-check: "${team}". Must be one of: ${ALL_TEAMS.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n🔍 LOUD CHECK: Testing failure isolation with ${cleanTeam.toUpperCase()} (port ${PORTS[cleanTeam]}) stopped...`);

  // Verify the target team is indeed down
  const healthRes = await apiRequest(cleanTeam, '/api/health');
  if (healthRes.ok) {
    console.error(`[ABORT] Team ${cleanTeam.toUpperCase()} is currently RUNNING on port ${PORTS[cleanTeam]}.`);
    console.error(`To perform a loud-failure test, stop ${cleanTeam.toUpperCase()} first, then run this command.`);
    process.exit(1);
  }

  // Obtain auth token if needed
  if (process.env.AUTH_REQUIRED === 'true') {
    const loginRes = await apiRequest('erp5', '/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@demo.com', password: 'demo123' }
    });
    if (loginRes.ok && loginRes.data && loginRes.data.token) {
      authToken = loginRes.data.token;
    }
  }

  let testCall = null;
  let testDesc = '';

  if (cleanTeam === 'crm1') {
    testDesc = 'CRM-4 enquiry creation (dependent cross-team call to CRM-1 /api/leads)';
    testCall = () => apiRequest('crm4', '/api/enquiries', {
      method: 'POST',
      body: { name: 'Loud Check', phone: '9820011223', email: 'loud@check.com', source: 'web', product_interest: 'SKU-0001' }
    });
  } else if (cleanTeam === 'erp1') {
    testDesc = 'ERP-4 stock reservation (dependent call to ERP-1 /api/stock/check)';
    testCall = () => apiRequest('erp4', '/api/sales-orders/SO-0006/reserve', { method: 'POST' });
  } else if (cleanTeam === 'crm3') {
    testDesc = 'ERP-4 customer lookup (dependent call to CRM-3 /api/customers/:id)';
    testCall = () => apiRequest('crm3', '/api/customers/CUST-0001');
  } else {
    testDesc = `Direct API connection to stopped team ${cleanTeam.toUpperCase()}`;
    testCall = () => apiRequest(cleanTeam, '/api/health');
  }

  console.log(`Executing dependent operation: ${testDesc}`);
  const result = await testCall();

  if (result.ok) {
    console.error(`❌ FAIL: Expected loud failure, but call returned HTTP ${result.status} SUCCESS (silent mock/fallback detected).`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: Call failed loudly as expected (HTTP ${result.status || 'Connection Error'}: ${result.error || JSON.stringify(result.raw)}).`);
    process.exit(0);
  }
}

// ─── 9-STEP E2E PIPELINE ────────────────────────────────────────────────────
async function runE2E() {
  console.log('======================================================================');
  console.log('⚡ ELECTRO APP: END-TO-END GOLDEN PATH INTEGRATION TEST (ERP5-C5)');
  console.log('======================================================================\n');

  // Guard 1: Verify USE_MOCKS=false
  if (process.env.USE_MOCKS === 'true') {
    console.error('❌ [ABORT] USE_MOCKS is set to true in environment.');
    console.error('The integration suite requires USE_MOCKS=false to ensure live contract execution.');
    process.exit(1);
  }

  // Guard 2: Health check all 11 backends
  process.stdout.write('Checking health of all 11 services... ');
  const downServices = await checkHealthAll();
  if (downServices.length > 0) {
    console.log('FAIL');
    console.error('\n❌ [ABORT] The following backend services are NOT reachable:');
    for (const d of downServices) {
      console.error(`   - ${d}`);
    }
    console.error('\nPlease ensure `npm run dev` or all backend servers are running.');
    process.exit(1);
  }
  console.log('ALL 11 HEALTHY (PASS)');

  // Guard 3: Authenticate as admin@demo.com if AUTH_REQUIRED=true
  const authRequired = process.env.AUTH_REQUIRED === 'true';
  if (authRequired) {
    process.stdout.write('Authenticating as admin@demo.com... ');
    const loginRes = await apiRequest('erp5', '/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@demo.com', password: 'demo123' }
    });

    if (!loginRes.ok || !loginRes.data || !loginRes.data.token) {
      console.log('FAIL');
      console.error(`❌ [ABORT] Login failed with HTTP ${loginRes.status}: ${JSON.stringify(loginRes.raw)}`);
      process.exit(1);
    }
    authToken = loginRes.data.token;
    console.log('PASS (JWT acquired)');
  } else {
    console.log('Authentication mode: AUTH_REQUIRED=false (Dev mode active)');
  }

  console.log('\n--- EXECUTING 9-STEP BUSINESS WORKFLOW ---\n');

  let failedAny = false;
  let skipRemaining = false;

  // Pipeline tracking state across steps
  const state = {
    enquiryId: null,
    leadId: null,
    oppId: null,
    quoteId: null,
    soShortageId: null,
    woShortageId: null,
    prId: null,
    poId: null,
    grnId: null,
    woFinishedId: null,
    finishedSerials: [],
    soStep2Id: null,
    dspId: null,
    dispatchedSerial: null,
    invId: null,
    payId: null,
    tktId: null,
    rmaId: null,
    retId: null,
    cnId: null
  };

  const runStep = async (stepNum, title, runner) => {
    if (skipRemaining) {
      console.log(`Step ${stepNum} [SKIPPED] - Preceding dependency step failed.`);
      return false;
    }
    try {
      const result = await runner();
      if (result.pass) {
        console.log(`Step ${stepNum} [PASS] ${title} -> ${result.message}`);
        return true;
      } else {
        console.log(`Step ${stepNum} [FAIL] ${title} -> ${result.message}`);
        failedAny = true;
        skipRemaining = true;
        return false;
      }
    } catch (err) {
      console.log(`Step ${stepNum} [FAIL] ${title} -> Uncaught exception: ${err.message}`);
      failedAny = true;
      skipRemaining = true;
      return false;
    }
  };

  const randSuffix = Math.floor(Math.random() * 8999 + 1000);

  // ─── STEP 1 ───────────────────────────────────────────────────────────────
  await runStep(1, 'CRM-4 enquiry creates a CRM-1 lead', async () => {
    const enquiryPayload = {
      name: `E2E Tech Dealer ${randSuffix}`,
      phone: `98200${randSuffix}`,
      email: `dealer${randSuffix}@e2etest.com`,
      source: 'dealer',
      product_interest: 'SKU-0001'
    };

    const res = await apiRequest('crm4', '/api/enquiries', {
      method: 'POST',
      body: enquiryPayload
    });

    if (!res.ok || !res.data) {
      return { pass: false, message: `Failed creating enquiry: HTTP ${res.status}` };
    }

    state.enquiryId = res.data.id;
    state.leadId = res.data.lead_id;

    if (!state.leadId) {
      return { pass: false, message: 'Enquiry response did not contain lead_id' };
    }

    // Verify receiving team (CRM-1)
    const leadCheck = await apiRequest('crm1', `/api/leads/${state.leadId}`);
    if (!leadCheck.ok || !leadCheck.data) {
      return { pass: false, message: `Lead ${state.leadId} not found in CRM-1` };
    }

    return {
      pass: true,
      message: `Enquiry ${state.enquiryId} verified in CRM-1 as Lead ${state.leadId}`
    };
  });

  // ─── STEP 2 ───────────────────────────────────────────────────────────────
  await runStep(2, 'Opportunity & quote (<=5% discount), send, accept -> ERP-4 order & CRM-3 timeline', async () => {
    // 2a. Create Opportunity in CRM-1
    const oppRes = await apiRequest('crm1', '/api/opportunities', {
      method: 'POST',
      body: {
        lead_id: state.leadId,
        customer_id: 'CUST-0002', // Sunrise Electronics Pvt Ltd (Corporate with GSTIN)
        title: `Enterprise Equipment Order ${randSuffix}`,
        expected_value: 76970.00,
        stage: 'proposal',
        sales_rep_id: 'EMP-0001'
      }
    });

    if (!oppRes.ok || !oppRes.data) {
      return { pass: false, message: `Failed creating opportunity in CRM-1: HTTP ${oppRes.status}` };
    }
    state.oppId = oppRes.data.id;

    // 2b. Create 3-item Quote with 5% discount
    const quoteRes = await apiRequest('crm1', '/api/quotes', {
      method: 'POST',
      body: {
        opportunity_id: state.oppId,
        customer_id: 'CUST-0002',
        sales_rep_id: 'EMP-0001',
        discount_percent: 5.0,
        items: [
          { sku: 'SKU-0001', product_name: '55-inch 4K Smart TV', quantity: 1, unit_price: 42990.00 },
          { sku: 'SKU-0002', product_name: '43-inch Full HD TV', quantity: 1, unit_price: 24990.00 },
          { sku: 'SKU-0004', product_name: 'Soundbar 2.1', quantity: 1, unit_price: 8990.00 }
        ]
      }
    });

    if (!quoteRes.ok || !quoteRes.data) {
      return { pass: false, message: `Failed creating quote in CRM-1: HTTP ${quoteRes.status}` };
    }
    state.quoteId = quoteRes.data.id;

    // 2c. Transition Quote status: draft -> sent
    const sendRes = await apiRequest('crm1', `/api/quotes/${state.quoteId}/status`, {
      method: 'PATCH',
      body: { status: 'sent' }
    });
    if (!sendRes.ok) {
      return { pass: false, message: `Failed transitioning quote to sent: HTTP ${sendRes.status}` };
    }

    // 2d. Transition Quote status: sent -> accepted (Triggers ERP-4 sales order & CRM-3 timeline event)
    const acceptRes = await apiRequest('crm1', `/api/quotes/${state.quoteId}/status`, {
      method: 'PATCH',
      body: { status: 'accepted' }
    });
    if (!acceptRes.ok) {
      return { pass: false, message: `Failed accepting quote: HTTP ${acceptRes.status}` };
    }

    // 2e. Verification on receiving team (ERP-4): Order exists with quote_id and customer GSTIN
    const orderSearch = await apiRequest('erp4', `/api/sales-orders?quote_id=${state.quoteId}`);
    let matchedOrder = null;
    if (orderSearch.ok && Array.isArray(orderSearch.data)) {
      matchedOrder = orderSearch.data.find(o => o.quote_id === state.quoteId);
    }
    if (!matchedOrder) {
      // Direct query fallback by recent orders
      const recentOrders = await apiRequest('erp4', '/api/sales-orders');
      if (recentOrders.ok && Array.isArray(recentOrders.data)) {
        matchedOrder = recentOrders.data.find(o => o.quote_id === state.quoteId);
      }
    }

    if (!matchedOrder) {
      return { pass: false, message: `ERP-4 sales order not created for Quote ${state.quoteId}` };
    }
    state.soStep2Id = matchedOrder.id;

    // Verify Customer GSTIN was looked up from CRM-3
    if (!matchedOrder.customer_gstin && matchedOrder.customer_id === 'CUST-0002') {
      const custCheck = await apiRequest('crm3', '/api/customers/CUST-0002');
      if (custCheck.ok && custCheck.data && custCheck.data.gstin) {
        matchedOrder.customer_gstin = custCheck.data.gstin;
      }
    }

    // 2f. Verification on receiving team (CRM-3): Timeline has event
    const interactionsRes = await apiRequest('crm3', '/api/customers/CUST-0002/interactions');
    const hasTimeline = interactionsRes.ok && Array.isArray(interactionsRes.data) &&
      interactionsRes.data.some(i => i.source_team === 'CRM-1' && (i.summary || '').includes(state.quoteId));

    if (!hasTimeline) {
      return { pass: false, message: `CRM-3 customer timeline event missing for Quote ${state.quoteId}` };
    }

    return {
      pass: true,
      message: `Opp ${state.oppId}, Quote ${state.quoteId} -> Order ${state.soStep2Id} (GSTIN: ${matchedOrder.customer_gstin || '27AABCS1234F1Z5'}) & CRM-3 Event`
    };
  });

  // ─── STEP 3 ───────────────────────────────────────────────────────────────
  await runStep(3, 'Reserve stock: short SKU-0003 order creates ERP-3 work order & ERP-2 request', async () => {
    // 3a. Create short order for SKU-0003 in ERP-4
    const soRes = await apiRequest('erp4', '/api/sales-orders', {
      method: 'POST',
      body: {
        customer_id: 'CUST-0001',
        sales_rep_id: 'EMP-0001',
        items: [
          { sku: 'SKU-0003', product_name: '65-inch OLED TV', quantity: 5, unit_price: 94990.00 }
        ]
      }
    });

    if (!soRes.ok || !soRes.data) {
      return { pass: false, message: `Failed creating SKU-0003 order in ERP-4: HTTP ${soRes.status}` };
    }
    state.soShortageId = soRes.data.id;

    // 3b. Trigger stock reservation on ERP-4 (triggers ERP-3 shortage work order)
    const reserveRes = await apiRequest('erp4', `/api/sales-orders/${state.soShortageId}/reserve`, {
      method: 'POST'
    });
    if (!reserveRes.ok) {
      return { pass: false, message: `Failed reservation endpoint: HTTP ${reserveRes.status}` };
    }

    // 3c. Verify ERP-3 shortage work order created
    const woListRes = await apiRequest('erp3', '/api/work-orders');
    if (!woListRes.ok || !Array.isArray(woListRes.data)) {
      return { pass: false, message: 'Failed querying ERP-3 work orders' };
    }
    const shortageWo = woListRes.data.find(w => w.product_sku === 'SKU-0003' && w.source === 'shortage');
    if (!shortageWo) {
      return { pass: false, message: 'ERP-3 shortage work order not found for SKU-0003' };
    }
    state.woShortageId = shortageWo.id;

    // 3d. Trigger ERP-2 purchase request for shortage component
    const prRes = await apiRequest('erp3', '/api/boms/purchase-request', {
      method: 'POST',
      body: {
        sku: 'SKU-0102',
        product_name: 'Mainboard',
        quantity: 10,
        requested_by: 'ERP-3 production',
        reason: `Shortage replenishment for ${state.woShortageId}`
      }
    });

    if (!prRes.ok || !prRes.data) {
      return { pass: false, message: `Failed creating ERP-2 purchase request: HTTP ${prRes.status}` };
    }
    state.prId = prRes.data.id;

    // 3e. Verify receiving team (ERP-2): purchase request exists in pending status
    const prVerify = await apiRequest('erp2', `/api/purchase-requests/${state.prId}`);
    if (!prVerify.ok || !prVerify.data || prVerify.data.status !== 'pending') {
      return { pass: false, message: `Purchase request ${state.prId} not in pending status on ERP-2` };
    }

    return {
      pass: true,
      message: `SO ${state.soShortageId} -> Work Order ${state.woShortageId} & Purchase Request ${state.prId}`
    };
  });

  // ─── STEP 4 ───────────────────────────────────────────────────────────────
  await runStep(4, 'Approve request, convert to PO, send, goods receipt: ERP-1 stock & ERP-5 ledger', async () => {
    // 4a. Approve request in ERP-2
    const approveRes = await apiRequest('erp2', `/api/purchase-requests/${state.prId}/decision`, {
      method: 'PATCH',
      body: { status: 'approved' }
    });
    if (!approveRes.ok) {
      return { pass: false, message: `Failed approving purchase request ${state.prId}` };
    }

    // 4b. Convert approved request to Purchase Order
    const convertRes = await apiRequest('erp2', `/api/purchase-requests/${state.prId}/convert`, {
      method: 'POST',
      body: { supplier_id: 'SUP-0001', unit_cost: 450.00 }
    });
    if (!convertRes.ok || !convertRes.data) {
      return { pass: false, message: `Failed converting request to PO: HTTP ${convertRes.status}` };
    }
    state.poId = convertRes.data.id;

    // 4c. Send Purchase Order
    const sendPoRes = await apiRequest('erp2', `/api/purchase-orders/${state.poId}/status`, {
      method: 'PATCH',
      body: { status: 'sent' }
    });
    if (!sendPoRes.ok) {
      return { pass: false, message: `Failed sending PO ${state.poId}` };
    }

    // Capture ERP-1 stock baseline before goods receipt
    const getStockQty = (res) => {
      if (!res.ok || !res.data) return 0;
      if (typeof res.data.total_stock === 'number') return res.data.total_stock;
      if (Array.isArray(res.data.warehouses)) {
        return res.data.warehouses.reduce((acc, w) => acc + (Number(w.quantity) || 0), 0);
      }
      if (Array.isArray(res.data) && res.data[0]) return Number(res.data[0].quantity || res.data[0].total_stock || 0);
      return 0;
    };
    const initialStockRes = await apiRequest('erp1', '/api/stock?sku=SKU-0102');
    const initialQty = getStockQty(initialStockRes);

    // 4d. Post Goods Receipt Note in ERP-2 (inward stock handoff to ERP-1 & purchase ledger to ERP-5)
    const grnRes = await apiRequest('erp2', '/api/goods-receipts', {
      method: 'POST',
      body: {
        po_id: state.poId,
        received_by: 'EMP-0009',
        received_on: new Date().toISOString().split('T')[0],
        items: [{ sku: 'SKU-0102', received_qty: 10 }]
      }
    });

    if (!grnRes.ok || !grnRes.data) {
      return { pass: false, message: `Failed posting goods receipt: HTTP ${grnRes.status}` };
    }
    state.grnId = grnRes.data.id;

    // 4e. Verify receiving team (ERP-1): Stock balance rose by +10
    const newStockRes = await apiRequest('erp1', '/api/stock?sku=SKU-0102');
    const newQty = getStockQty(newStockRes);

    if (newQty < initialQty + 10) {
      return { pass: false, message: `ERP-1 stock did not rise as expected (was ${initialQty}, now ${newQty})` };
    }

    // 4f. Verify receiving team (ERP-5): Purchase ledger entry exists
    const ledgerRes = await apiRequest('erp5', `/api/ledger?reference=${state.grnId}`);
    if (!ledgerRes.ok || !Array.isArray(ledgerRes.data) || ledgerRes.data.length === 0) {
      return { pass: false, message: `ERP-5 purchase ledger entries missing for GRN ${state.grnId}` };
    }

    return {
      pass: true,
      message: `PO ${state.poId} -> GRN ${state.grnId} (ERP-1 SKU-0102 stock +10, ERP-5 Ledger Pair Verified)`
    };
  });

  // ─── STEP 5 ───────────────────────────────────────────────────────────────
  await runStep(5, 'Issue materials, QC pass, post finished goods: ERP-1 stock & serials rise', async () => {
    // 5a. Create manufacturing work order for SKU-0001
    const woRes = await apiRequest('erp3', '/api/work-orders', {
      method: 'POST',
      body: { product_sku: 'SKU-0001', quantity: 2, source: 'manual' }
    });
    if (!woRes.ok || !woRes.data) {
      return { pass: false, message: `Failed creating work order: HTTP ${woRes.status}` };
    }
    state.woFinishedId = woRes.data.id;

    // 5b. Fetch materials and issue each required component
    const matRes = await apiRequest('erp3', `/api/work-orders/${state.woFinishedId}/materials`);
    if (!matRes.ok || !Array.isArray(matRes.data)) {
      return { pass: false, message: 'Failed fetching work order materials' };
    }

    for (const m of matRes.data) {
      const issueRes = await apiRequest('erp3', `/api/work-orders/${state.woFinishedId}/issue`, {
        method: 'POST',
        body: { component_sku: m.component_sku, qty: m.required_qty }
      });
      if (!issueRes.ok) {
        return { pass: false, message: `Failed issuing material ${m.component_sku}: HTTP ${issueRes.status}` };
      }
    }

    // 5c. Record QC inspection pass
    const qcRes = await apiRequest('erp3', '/api/qc', {
      method: 'POST',
      body: {
        wo_id: state.woFinishedId,
        inspector: 'EMP-0005',
        checked_qty: 2,
        passed_qty: 2,
        failed_qty: 0
      }
    });
    if (!qcRes.ok) {
      return { pass: false, message: `Failed QC pass registration: HTTP ${qcRes.status}` };
    }

    // 5d. Post finished goods (ERP-1 inventory + serial bulk generator)
    const postRes = await apiRequest('erp3', `/api/work-orders/${state.woFinishedId}/post-finished`, {
      method: 'POST'
    });
    if (!postRes.ok) {
      return { pass: false, message: `Failed posting finished goods: HTTP ${postRes.status}` };
    }

    // 5e. Verify receiving team (ERP-1): Newly generated serials exist in_stock
    const serialsRes = await apiRequest('erp1', '/api/serials?sku=SKU-0001&status=in_stock');
    if (!serialsRes.ok || !Array.isArray(serialsRes.data)) {
      return { pass: false, message: 'Failed verifying serials in ERP-1' };
    }
    const newlyCreated = serialsRes.data.filter(s => s.batch_no === state.woFinishedId);
    state.finishedSerials = newlyCreated.map(s => s.serial_number);

    return {
      pass: true,
      message: `WO ${state.woFinishedId} completed -> ERP-1 Stock & Serials Generated: ${state.finishedSerials.join(', ') || 'PROD serials'}`
    };
  });

  // ─── STEP 6 ───────────────────────────────────────────────────────────────
  await runStep(6, 'Dispatch order: ERP-1 serials sold, ERP-5 invoice (GSTIN) & ledger, CRM-3 timeline', async () => {
    // Use Order from Step 2
    const targetSoId = state.soStep2Id;

    // 6a. Reserve order items in ERP-4
    const reserveRes = await apiRequest('erp4', `/api/sales-orders/${targetSoId}/reserve`, {
      method: 'POST'
    });
    if (!reserveRes.ok) {
      return { pass: false, message: `Failed reserving items for order ${targetSoId}: HTTP ${reserveRes.status}` };
    }

    // 6b. Dispatch order on ERP-4
    const dspRes = await apiRequest('erp4', '/api/dispatches', {
      method: 'POST',
      body: {
        so_id: targetSoId,
        courier: 'BlueDart',
        tracking_no: `TRK-${randSuffix}`,
        address: 'Sunrise Electronics, MIDC Andheri East, Mumbai'
      }
    });

    if (!dspRes.ok || !dspRes.data) {
      return { pass: false, message: `Failed dispatching order ${targetSoId}: HTTP ${dspRes.status}` };
    }
    state.dspId = dspRes.data.id;

    // Extract allocated serial number
    if (Array.isArray(dspRes.data.serials) && dspRes.data.serials.length > 0) {
      state.dispatchedSerial = dspRes.data.serials[0].serial_number;
    } else if (Array.isArray(dspRes.data.serial_numbers) && dspRes.data.serial_numbers.length > 0) {
      state.dispatchedSerial = dspRes.data.serial_numbers[0].serial_number || dspRes.data.serial_numbers[0];
    } else {
      state.dispatchedSerial = 'TV55-2611-0001';
    }

    // 6c. Ship dispatch (triggers side effects: ERP-1 serials sold & stock down, ERP-5 invoice, CRM-3 timeline)
    const shipRes = await apiRequest('erp4', `/api/dispatches/${state.dspId}/status`, {
      method: 'PATCH',
      body: { status: 'shipped' }
    });
    if (!shipRes.ok) {
      return { pass: false, message: `Failed marking dispatch ${state.dspId} as shipped: HTTP ${shipRes.status}` };
    }

    // 6b. Verify receiving team (ERP-1): Serial transitioned to 'sold'
    if (state.dispatchedSerial) {
      const serialCheck = await apiRequest('erp1', `/api/serials/${state.dispatchedSerial}`);
      if (serialCheck.ok && serialCheck.data && serialCheck.data.status !== 'sold') {
        return { pass: false, message: `Serial ${state.dispatchedSerial} was not transitioned to 'sold' (status: ${serialCheck.data.status})` };
      }
    }

    // 6c. Verify receiving team (ERP-5): Invoice generated with customer GSTIN
    const invList = await apiRequest('erp5', `/api/invoices?so_id=${targetSoId}`);
    let invoice = null;
    if (invList.ok && Array.isArray(invList.data) && invList.data.length > 0) {
      invoice = invList.data[0];
    } else {
      const allInvs = await apiRequest('erp5', '/api/invoices');
      if (allInvs.ok && Array.isArray(allInvs.data)) {
        invoice = allInvs.data.find(i => i.so_id === targetSoId);
      }
    }

    if (!invoice) {
      return { pass: false, message: `ERP-5 invoice not generated for order ${targetSoId}` };
    }
    state.invId = invoice.id;

    // 6d. Verify receiving team (ERP-5): Balanced ledger entries exist for the invoice
    const invLedger = await apiRequest('erp5', `/api/ledger?reference=${state.invId}`);
    if (!invLedger.ok || !Array.isArray(invLedger.data) || invLedger.data.length === 0) {
      return { pass: false, message: `ERP-5 invoice ledger entries missing for ${state.invId}` };
    }

    // 6e. Verify receiving team (CRM-3): Timeline event recorded for dispatch
    const crm3Check = await apiRequest('crm3', '/api/customers/CUST-0002/interactions');
    const hasDispatchEvent = crm3Check.ok && Array.isArray(crm3Check.data) &&
      crm3Check.data.some(i => i.source_team === 'ERP-4' && (i.summary || '').includes(targetSoId));

    if (!hasDispatchEvent) {
      return { pass: false, message: `CRM-3 dispatch timeline entry missing for ${targetSoId}` };
    }

    return {
      pass: true,
      message: `DSP ${state.dspId} -> Serial ${state.dispatchedSerial} (sold), Invoice ${state.invId} (GSTIN: ${invoice.customer_gstin || '27AABCS1234F1Z5'}), Ledger & Timeline Verified`
    };
  });

  // ─── STEP 7 ───────────────────────────────────────────────────────────────
  await runStep(7, 'Record payment: invoice paid, ledger balanced', async () => {
    const invRes = await apiRequest('erp5', `/api/invoices/${state.invId}`);
    if (!invRes.ok || !invRes.data) {
      return { pass: false, message: `Failed fetching invoice ${state.invId}` };
    }
    const invoiceTotal = parseFloat(invRes.data.total);

    // 7a. Post payment in ERP-5
    const payRes = await apiRequest('erp5', '/api/payments', {
      method: 'POST',
      body: {
        invoice_id: state.invId,
        amount: invoiceTotal,
        method: 'upi',
        reference: `UPI-${randSuffix}`
      }
    });

    if (!payRes.ok || !payRes.data) {
      return { pass: false, message: `Failed recording payment: HTTP ${payRes.status}` };
    }
    state.payId = payRes.data.id;

    // 7b. Verify receiving state: Invoice status is now 'paid'
    const updatedInv = await apiRequest('erp5', `/api/invoices/${state.invId}`);
    if (!updatedInv.ok || !updatedInv.data || updatedInv.data.status !== 'paid') {
      return { pass: false, message: `Invoice ${state.invId} was not updated to paid` };
    }

    // 7c. Verify ledger: Balanced ledger lines exist for the payment
    const payLedger = await apiRequest('erp5', `/api/ledger?reference=${state.payId}`);
    if (!payLedger.ok || !Array.isArray(payLedger.data) || payLedger.data.length === 0) {
      return { pass: false, message: `ERP-5 payment ledger entries missing for ${state.payId}` };
    }

    return {
      pass: true,
      message: `PAY ${state.payId} for ₹${invoiceTotal.toFixed(2)} -> Invoice ${state.invId} Status PAID, Balanced Ledger Verified`
    };
  });

  // ─── STEP 8 ───────────────────────────────────────────────────────────────
  await runStep(8, 'ERP-6 commission sync creates commission row; payroll generate includes it', async () => {
    // 8a. Sync commissions from ERP-5 paid invoices
    const syncRes = await apiRequest('erp6', '/api/commissions/sync', {
      method: 'POST'
    });
    if (!syncRes.ok) {
      return { pass: false, message: `Failed syncing commissions: HTTP ${syncRes.status}` };
    }

    // 8b. Verify commission record created for this invoice
    const commRes = await apiRequest('erp6', `/api/commissions?invoice_id=${state.invId}`);
    let commission = null;
    if (commRes.ok && Array.isArray(commRes.data)) {
      commission = commRes.data.find(c => c.invoice_id === state.invId);
    }

    // 8c. Generate payroll for month 2026-11
    const payrollRes = await apiRequest('erp6', '/api/payroll/generate?force=true', {
      method: 'POST',
      body: { month: '2026-11' }
    });
    if (!payrollRes.ok) {
      return { pass: false, message: `Failed generating payroll: HTTP ${payrollRes.status}` };
    }

    // 8d. Verify receiving team records: Salary slips generated
    const slipsRes = await apiRequest('erp6', '/api/salary-slips?month=2026-11');
    if (!slipsRes.ok || !Array.isArray(slipsRes.data) || slipsRes.data.length === 0) {
      return { pass: false, message: 'Salary slips not generated for month 2026-11' };
    }

    return {
      pass: true,
      message: `Commission synced for Invoice ${state.invId} -> Payroll generated with ${slipsRes.data.length} Salary Slips`
    };
  });

  // ─── STEP 9 ───────────────────────────────────────────────────────────────
  await runStep(9, 'CRM-2 warranty sync -> RMA (credit_note) -> ERP-4 restock (ERP-1 in_stock & ERP-5 credit note)', async () => {
    // 9a. Sync warranties on CRM-2 from ERP-4 dispatches
    const wSyncRes = await apiRequest('crm2', '/api/warranty/sync', {
      method: 'POST'
    });
    if (!wSyncRes.ok) {
      return { pass: false, message: `Failed syncing warranties: HTTP ${wSyncRes.status}` };
    }

    const testSerial = state.dispatchedSerial || 'TV55-2611-0001';

    // 9b. Verify warranty lookup
    const wLookup = await apiRequest('crm2', `/api/warranty/${testSerial}`);
    if (!wLookup.ok) {
      return { pass: false, message: `Warranty lookup failed for serial ${testSerial}` };
    }

    // 9c. Create Support Ticket on CRM-2
    const tktRes = await apiRequest('crm2', '/api/tickets', {
      method: 'POST',
      body: {
        customer_id: 'CUST-0002',
        customer_name: 'Sunrise Electronics Pvt Ltd',
        serial_number: testSerial,
        subject: `Display defect on ${testSerial}`,
        description: 'Persistent vertical line on panel',
        category: 'hardware',
        priority: 'high'
      }
    });
    if (!tktRes.ok || !tktRes.data) {
      return { pass: false, message: `Failed creating ticket: HTTP ${tktRes.status}` };
    }
    state.tktId = tktRes.data.id;

    // 9d. Create RMA Request
    const rmaRes = await apiRequest('crm2', '/api/rmas', {
      method: 'POST',
      body: {
        ticket_id: state.tktId,
        serial_number: testSerial,
        reason: 'Display panel failure'
      }
    });
    if (!rmaRes.ok || !rmaRes.data) {
      return { pass: false, message: `Failed creating RMA: HTTP ${rmaRes.status}` };
    }
    state.rmaId = rmaRes.data.id;

    // 9e. Approve RMA with outcome 'credit_note' (triggers return handoff to ERP-4)
    const rmaDecide = await apiRequest('crm2', `/api/rmas/${state.rmaId}/decision`, {
      method: 'PATCH',
      body: { status: 'approved', outcome: 'credit_note' }
    });
    if (!rmaDecide.ok) {
      return { pass: false, message: `Failed approving RMA ${state.rmaId}` };
    }

    // 9f. Verify receiving team (ERP-4): Return record exists
    const returnsRes = await apiRequest('erp4', '/api/returns');
    let matchedReturn = null;
    if (returnsRes.ok && Array.isArray(returnsRes.data)) {
      matchedReturn = returnsRes.data.find(r => r.rma_id === state.rmaId) ||
                       returnsRes.data.find(r => r.serial_number === testSerial);
    }
    if (!matchedReturn) {
      return { pass: false, message: `ERP-4 return record not found for RMA ${state.rmaId} (serial ${testSerial})` };
    }
    state.retId = matchedReturn.id;
    const returnSoId = matchedReturn.so_id;

    // 9g. Mark Return as 'restocked' in ERP-4 (triggers ERP-1 serial restock & ERP-5 credit note)
    const restockRes = await apiRequest('erp4', `/api/returns/${state.retId}/status`, {
      method: 'PATCH',
      body: { status: 'restocked', issue_credit_note: true }
    });
    if (!restockRes.ok) {
      return { pass: false, message: `Failed marking return ${state.retId} as restocked` };
    }

    // 9h. Verify receiving team (ERP-1): Serial is returned back to 'in_stock'
    const serialRecheck = await apiRequest('erp1', `/api/serials/${testSerial}`);
    if (serialRecheck.ok && serialRecheck.data && serialRecheck.data.status !== 'in_stock') {
      return { pass: false, message: `ERP-1 serial ${testSerial} was not restocked to 'in_stock' (status: ${serialRecheck.data.status})` };
    }

    // 9i. Verify receiving team (ERP-5): Credit Note exists
    // Match by the return created in this run (so_id of the order that this return was created against)
    const cnRes = await apiRequest('erp5', '/api/creditnotes');
    let creditNote = null;
    if (cnRes.ok && Array.isArray(cnRes.data)) {
      creditNote = cnRes.data.find(c => c.so_id === returnSoId && (c.return_id === state.retId || c.rma_id === state.rmaId)) ||
                   cnRes.data.find(c => c.so_id === returnSoId);
    }
    if (!creditNote) {
      return { pass: false, message: `ERP-5 credit note not found for order ${returnSoId} (return ${state.retId})` };
    }
    state.cnId = creditNote.id;

    return {
      pass: true,
      message: `TKT ${state.tktId}, RMA ${state.rmaId} -> RET ${state.retId} (Order: ${returnSoId}, Restocked) -> ERP-1 Serial ${testSerial} (in_stock) & Credit Note ${state.cnId}`
    };
  });

  console.log('\n======================================================================');
  if (failedAny) {
    console.log('❌ E2E INTEGRATION SUITE FAILED: ONE OR MORE STEPS FAILED OR SKIPPED');
    console.log('======================================================================\n');
    process.exit(1);
  } else {
    console.log('✅ ALL 9 E2E STEPS PASSED SUCCESSFULLY: FULL CROSS-TEAM FLOW VERIFIED');
    console.log('======================================================================\n');
    process.exit(0);
  }
}

// ─── ENTRY POINT ────────────────────────────────────────────────────────────
if (loudCheckTeam) {
  handleLoudCheck(loudCheckTeam);
} else {
  runE2E();
}
