const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

// Bypass auth for test environment
process.env.AUTH_REQUIRED = 'false';
process.env.USE_MOCKS = 'true';

const goodsReceiptsRouter = require('../routes/goods-receipts');
const { makePool } = require('../../_shared/db');
const pool = makePool('erp2');

/**
 * In-memory request dispatcher for testing Express routes without binding network ports.
 */
function dispatch(router, options) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const parsedUrl = new URL(options.url || '/', 'http://localhost');
    const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());

    const req = {
      method: options.method || 'GET',
      url: parsedUrl.pathname,
      originalUrl: options.url || '/',
      body: options.body || {},
      query: options.query && Object.keys(options.query).length ? options.query : queryParams,
      params: options.params || {},
      headers: options.headers || {},
      user: { id: 'USR-0001', name: 'Admin User', role: 'admin' }
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
        resolve({ status: err.status || 500, body: { error: err.message } });
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  });
}

describe('ERP-2 Goods Receipt Notes Integration Tests ([ERP2-D1])', () => {

  // Test PO ID dedicated for testing
  const TEST_PO_ID = 'PO-TEST-001';

  beforeEach(async () => {
    // Reset test PO and po_items before each test
    await pool.query('DELETE FROM goods_receipts WHERE po_id = $1', [TEST_PO_ID]);
    await pool.query('DELETE FROM po_items WHERE po_id = $1', [TEST_PO_ID]);
    await pool.query('DELETE FROM purchase_orders WHERE id = $1', [TEST_PO_ID]);

    await pool.query(
      `INSERT INTO purchase_orders (id, supplier_id, status, expected_date, total_amount, sent_at)
       VALUES ($1, 'SUP-0001', 'sent', '2026-11-25', 100000.00, '2026-11-10')`,
      [TEST_PO_ID]
    );

    await pool.query(
      `INSERT INTO po_items (id, po_id, sku, product_name, quantity, unit_cost, received_qty)
       VALUES ('POI-TEST-01', $1, 'SKU-0101', 'TV panel', 100, 1000.00, 0)`,
      [TEST_PO_ID]
    );
  });

  it('Test 1: Partial receipt sets purchase order status to partially_received', async () => {
    const res = await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0005',
        received_on: '2026-11-14',
        notes: 'Partial delivery of 50 units',
        items: [
          { sku: 'SKU-0101', received_qty: 50 }
        ]
      }
    });

    assert.equal(res.status, 201, `Expected status 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.data.id.startsWith('GRN-'));
    assert.equal(res.body.data.po_status, 'partially_received');
    assert.equal(res.body.data.items.length, 1);
    assert.equal(res.body.data.items[0].received_qty, 50);

    // Verify po_items received_qty in DB
    const itemCheck = await pool.query('SELECT received_qty FROM po_items WHERE po_id = $1 AND sku = $2', [TEST_PO_ID, 'SKU-0101']);
    assert.equal(itemCheck.rows[0].received_qty, 50);

    // Verify PO status in DB
    const poCheck = await pool.query('SELECT status FROM purchase_orders WHERE id = $1', [TEST_PO_ID]);
    assert.equal(poCheck.rows[0].status, 'partially_received');
  });

  it('Test 2: Full receipt sets purchase order status to received', async () => {
    // First receipt: 50 units
    await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0005',
        received_on: '2026-11-14',
        notes: 'First 50 units',
        items: [{ sku: 'SKU-0101', received_qty: 50 }]
      }
    });

    // Second receipt: remaining 50 units
    const res = await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0006',
        received_on: '2026-11-15',
        notes: 'Remaining 50 units to complete PO',
        items: [{ sku: 'SKU-0101', received_qty: 50 }]
      }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.po_status, 'received');

    // Verify DB
    const itemCheck = await pool.query('SELECT received_qty FROM po_items WHERE po_id = $1 AND sku = $2', [TEST_PO_ID, 'SKU-0101']);
    assert.equal(itemCheck.rows[0].received_qty, 100);

    const poCheck = await pool.query('SELECT status FROM purchase_orders WHERE id = $1', [TEST_PO_ID]);
    assert.equal(poCheck.rows[0].status, 'received');
  });

  it('Test 5: Validation error when receiving quantity exceeds remaining quantity', async () => {
    // Ordered 100, try to receive 120
    const res = await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0005',
        received_on: '2026-11-14',
        items: [
          { sku: 'SKU-0101', received_qty: 120 }
        ]
      }
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('exceeds remaining'));

    // Verify DB received_qty was untouched
    const itemCheck = await pool.query('SELECT received_qty FROM po_items WHERE po_id = $1 AND sku = $2', [TEST_PO_ID, 'SKU-0101']);
    assert.equal(itemCheck.rows[0].received_qty, 0);
  });

  it('Test 6: Error response when submitting nonexistent purchase order', async () => {
    const res = await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: 'PO-NONEXISTENT',
        received_by: 'EMP-0005',
        items: [
          { sku: 'SKU-0101', received_qty: 10 }
        ]
      }
    });

    assert.equal(res.status, 404);
    assert.ok(res.body.error.includes('not found'));
  });

  it('Test 7: Cannot receive against draft purchase order', async () => {
    await pool.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['draft', TEST_PO_ID]);

    const res = await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0005',
        items: [{ sku: 'SKU-0101', received_qty: 10 }]
      }
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('draft'));
  });

  it('Test 8: Database consistency on transaction failure (invalid SKU item rejected)', async () => {
    const initialGrnCount = (await pool.query('SELECT count(*) FROM goods_receipts WHERE po_id = $1', [TEST_PO_ID])).rows[0].count;

    const res = await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0005',
        items: [
          { sku: 'SKU-INVALID-999', received_qty: 10 }
        ]
      }
    });

    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('does not belong'));

    // Check no goods_receipt was created
    const finalGrnCount = (await pool.query('SELECT count(*) FROM goods_receipts WHERE po_id = $1', [TEST_PO_ID])).rows[0].count;
    assert.equal(finalGrnCount, initialGrnCount);
  });

  it('Test 9: GET /goods-receipts lists receipts with items', async () => {
    // Record a receipt first
    await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0005',
        notes: 'Test listing',
        items: [{ sku: 'SKU-0101', received_qty: 25 }]
      }
    });

    const listRes = await dispatch(goodsReceiptsRouter, {
      method: 'GET',
      url: `/goods-receipts?po_id=${TEST_PO_ID}`
    });

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));
    assert.equal(listRes.body.data.length, 1);
    assert.equal(listRes.body.data[0].po_id, TEST_PO_ID);
    assert.equal(listRes.body.data[0].items.length, 1);
    assert.equal(listRes.body.data[0].items[0].received_qty, 25);
  });

  it('Test 10: GET /goods-receipts/:id returns single receipt note', async () => {
    const createRes = await dispatch(goodsReceiptsRouter, {
      method: 'POST',
      url: '/goods-receipts',
      body: {
        po_id: TEST_PO_ID,
        received_by: 'EMP-0007',
        notes: 'Fetch single receipt test',
        items: [{ sku: 'SKU-0101', received_qty: 15 }]
      }
    });

    const grnId = createRes.body.data.id;
    const fetchRes = await dispatch(goodsReceiptsRouter, {
      method: 'GET',
      url: `/goods-receipts/${grnId}`,
      params: { id: grnId }
    });

    assert.equal(fetchRes.status, 200);
    assert.equal(fetchRes.body.data.id, grnId);
    assert.equal(fetchRes.body.data.received_by, 'EMP-0007');
    assert.equal(fetchRes.body.data.items[0].received_qty, 15);
  });
});
