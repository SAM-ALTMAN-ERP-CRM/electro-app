const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.NODE_ENV = 'test';

const tagsRouter = require('../routes/tags');
const segmentsRouter = require('../routes/segments');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'USR-0001', role: 'admin' };
  next();
});
app.use('/api', tagsRouter);
app.use('/api', segmentsRouter);

test('CRM3-C3 Customer Tags and CSV Export Suite', async (t) => {
  await t.test('1. GET /api/customers/CUST-0001/tags returns initial tags array', async () => {
    const res = await fetchMock(app, 'GET', '/api/customers/CUST-0001/tags');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.includes('VIP'));
  });

  await t.test('2. POST /api/customers/CUST-0001/tags adds a tag', async () => {
    const res = await fetchMock(app, 'POST', '/api/customers/CUST-0001/tags', { tag: 'Test-Special' });
    assert.equal(res.status, 201);
    assert.ok(res.body.data);
    assert.equal(res.body.data.customer_id, 'CUST-0001');
    assert.equal(res.body.data.tag, 'Test-Special');
    assert.ok(res.body.tags.includes('Test-Special'));
  });

  await t.test('3. POST /api/customers/CUST-0001/tags rejects empty tag with 400', async () => {
    const res = await fetchMock(app, 'POST', '/api/customers/CUST-0001/tags', { tag: '   ' });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  await t.test('4. POST /api/customers/CUST-9999/tags returns 404 for unknown customer', async () => {
    const res = await fetchMock(app, 'POST', '/api/customers/CUST-9999/tags', { tag: 'VIP' });
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  await t.test('5. DELETE /api/customers/CUST-0001/tags/:tag removes tag', async () => {
    const res = await fetchMock(app, 'DELETE', '/api/customers/CUST-0001/tags/Test-Special');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.message.includes('removed successfully'));

    const listRes = await fetchMock(app, 'GET', '/api/customers/CUST-0001/tags');
    assert.ok(!listRes.body.data.includes('Test-Special'));
  });

  await t.test('6. Acceptance Criteria: GET /api/segments/SEG-0001/export.csv returns Excel-compatible CSV', async () => {
    const res = await fetchMock(app, 'GET', '/api/segments/SEG-0001/export.csv');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(res.headers['content-disposition'].includes('filename="segment-SEG-0001-export.csv"'));

    const csvText = res.body;
    assert.ok(csvText.startsWith('\uFEFF'));
    assert.ok(csvText.includes('name,email,phone,city'));
    assert.ok(csvText.includes('Sunrise Electronics Pvt Ltd'));
    assert.ok(csvText.includes('Mumbai'));
  });

  await t.test('7. GET /api/segments/SEG-9999/export.csv returns 404', async () => {
    const res = await fetchMock(app, 'GET', '/api/segments/SEG-9999/export.csv');
    assert.equal(res.status, 404);
  });
});

function fetchMock(appInstance, method, url, body) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { 'content-type': 'application/json' };
    req.body = body || {};

    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        this.headers[k.toLowerCase()] = v;
      },
      json(data) {
        resolve({ status: this.statusCode, headers: this.headers, body: data });
      },
      send(data) {
        resolve({ status: this.statusCode, headers: this.headers, body: data });
      }
    };

    appInstance(req, res, (err) => {
      if (err) {
        resolve({ status: 500, headers: res.headers, body: { error: err.message } });
      } else {
        resolve({ status: 404, headers: res.headers, body: { error: 'Not found' } });
      }
    });
  });
}