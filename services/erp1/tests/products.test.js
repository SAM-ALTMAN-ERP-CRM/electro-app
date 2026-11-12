const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

// Set AUTH_REQUIRED to false for testing
process.env.AUTH_REQUIRED = 'false';

const productsRouter = require('../routes/products');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', productsRouter);
  return app;
}

// Minimal request helper using node fetch against ephemeral port
async function request(app, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      try {
        const fetchOptions = {
          method,
          headers: { 'Content-Type': 'application/json' }
        };
        if (body) {
          fetchOptions.body = JSON.stringify(body);
        }
        const res = await fetch(`http://127.0.0.1:${port}${url}`, fetchOptions);
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
        server.close(() => {
          resolve({ status: res.status, body: json });
        });
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

describe('ERP1-A1 Products API Test Suite', () => {
  const app = createTestApp();
  let createdProductId = null;

  it('1. GET /api/products returns list of products', async () => {
    const res = await request(app, 'GET', '/api/products');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });

  it('2. GET /api/products?category=TV filters products by category', async () => {
    const res = await request(app, 'GET', '/api/products?category=TV');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    for (const item of res.body.data) {
      assert.equal(item.category.toLowerCase(), 'tv');
    }
  });

  it('3. GET /api/products?q=Soundbar searches products by keyword', async () => {
    const res = await request(app, 'GET', '/api/products?q=Soundbar');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  it('4. GET /api/products/:id returns specific product', async () => {
    const res = await request(app, 'GET', '/api/products/SKU-0001');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'SKU-0001');
  });

  it('5. GET /api/products/:id returns 404 for unknown product', async () => {
    const res = await request(app, 'GET', '/api/products/SKU-9999');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('6. POST /api/products enforces price > 0 (returns 400)', async () => {
    const res = await request(app, 'POST', '/api/products', {
      name: 'Zero Price Test Gadget',
      category: 'Audio',
      price: 0
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /price/i);

    const negativeRes = await request(app, 'POST', '/api/products', {
      name: 'Negative Price Gadget',
      category: 'Audio',
      price: -500
    });
    assert.equal(negativeRes.status, 400);
  });

  it('7. POST /api/products validates valid category (returns 400 on invalid)', async () => {
    const res = await request(app, 'POST', '/api/products', {
      name: 'Invalid Category Gadget',
      category: 'Spaceship',
      price: 1999
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /category/i);
  });

  it('8. POST /api/products creates product successfully', async () => {
    const res = await request(app, 'POST', '/api/products', {
      name: 'Wireless Gaming Mouse',
      category: 'Mobile accessory',
      brand: 'Electro',
      price: 1499.00,
      reorder_level: 15
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.name, 'Wireless Gaming Mouse');
    createdProductId = res.body.data.id;
  });

  it('9. POST /api/products duplicate name returns 409', async () => {
    const res = await request(app, 'POST', '/api/products', {
      name: 'Wireless Gaming Mouse',
      category: 'Mobile accessory',
      price: 1599.00
    });
    assert.equal(res.status, 409);
    assert.match(res.body.error, /already exists/i);
  });

  it('10. PUT /api/products/:id updates product and enforces price > 0', async () => {
    const badRes = await request(app, 'PUT', `/api/products/${createdProductId}`, {
      price: -10
    });
    assert.equal(badRes.status, 400);

    const okRes = await request(app, 'PUT', `/api/products/${createdProductId}`, {
      price: 1399.00,
      reorder_level: 20
    });
    assert.equal(okRes.status, 200);
    assert.equal(Number(okRes.body.data.price), 1399.00);
  });

  it('11. PUT /api/products/:id rejects duplicate name (409)', async () => {
    const res = await request(app, 'PUT', `/api/products/${createdProductId}`, {
      name: '55-inch 4K Smart TV'
    });
    assert.equal(res.status, 409);
  });

  it('12. DELETE /api/products/:id deletes product', async () => {
    const res = await request(app, 'DELETE', `/api/products/${createdProductId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, createdProductId);

    const getRes = await request(app, 'GET', `/api/products/${createdProductId}`);
    assert.equal(getRes.status, 404);
  });

  it('13. GET /api/products/:id/price returns price and tax calculation (ERP1-A3)', async () => {
    const res = await request(app, 'GET', '/api/products/SKU-0001/price');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 'SKU-0001');
    assert.equal(res.body.data.price, '42990.00');
    assert.equal(res.body.data.tax_rate, 18);
    assert.equal(res.body.data.tax_amount, '7738.20');
    assert.equal(res.body.data.price_with_tax, '50728.20');
  });

  it('14. GET /api/products/:id/price returns 404 for unknown product', async () => {
    const res = await request(app, 'GET', '/api/products/SKU-9999/price');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it('15. GET /api/products/export.csv returns CSV data stream', async () => {
    const res = await request(app, 'GET', '/api/products/export.csv');
    assert.equal(res.status, 200);
    assert.ok(typeof res.body === 'string' || Buffer.isBuffer(res.body));
  });
});

