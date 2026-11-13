const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const authPath = require.resolve('../../_shared/auth');
const dbPath = require.resolve('../../_shared/db');
const servicePath = require.resolve('../order-creation');
let status = 'approved';
let calls = [];
let orderBody;
let failUpdate = false;
const client = {
  async query(sql, params) {
    calls.push(sql);
    if (failUpdate && sql.startsWith('UPDATE purchase_requests')) throw new Error('update failed');
    if (sql.startsWith('SELECT *')) return { rowCount: 1, rows: [{ id: params[0], status, sku: 'SKU-0001', product_name: 'Smart TV', quantity: 2 }] };
    if (sql.startsWith('SELECT id')) return { rowCount: 1, rows: [{ id: 'SUP-0001' }] };
    return { rowCount: 1, rows: [] };
  },
  release() {}
};
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { requireAuth: (req, res, next) => next() } };
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { makePool: () => ({ connect: async () => client }) } };
require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: { createPurchaseOrder: async (connection, supplier, date, items) => { assert.equal(connection, client); orderBody = { supplier_id: supplier, items }; return { id: 'PO-0001' }; } } };
const router = require('../routes/request-conversion');

test('converts approved requests and rejects pending requests', async () => {
  const app = express();
  app.use(express.json(), router);
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/purchase-requests/PR-0001/convert`;
  try {
    let response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier_id: 'SUP-0001', unit_cost: 125.50 }) });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).data.id, 'PO-0001');
    assert.deepEqual(orderBody.items[0], { sku: 'SKU-0001', product_name: 'Smart TV', quantity: 2, unit_cost: 125.5 });
    assert.ok(calls.some(sql => sql.startsWith('UPDATE purchase_requests')));
    status = 'pending';
    calls = [];
    orderBody = null;
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier_id: 'SUP-0001', unit_cost: 125.50 }) });
    assert.equal(response.status, 400);
    assert.equal(orderBody, null);
    assert.ok(calls.includes('ROLLBACK'));
    status = 'approved';
    failUpdate = true;
    calls = [];
    response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier_id: 'SUP-0001', unit_cost: 125.50 }) });
    assert.equal(response.status, 500);
    assert.ok(calls.includes('ROLLBACK'));
    assert.ok(!calls.includes('COMMIT'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
