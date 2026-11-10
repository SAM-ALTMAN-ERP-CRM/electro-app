const fs = require('fs');
const path = require('path');

// In-memory fallback caches for development / offline mode
let inMemoryOrders = [];
try {
  const p = path.resolve(__dirname, 'mocks/sales-orders.json');
  if (fs.existsSync(p)) {
    inMemoryOrders = JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp4] Could not load mock sales orders:', err.message);
}

let inMemoryReservations = [];
try {
  const p = path.resolve(__dirname, 'mocks/reservations.json');
  if (fs.existsSync(p)) {
    inMemoryReservations = JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp4] Could not load mock reservations:', err.message);
}

module.exports = {
  inMemoryOrders,
  inMemoryReservations
};
