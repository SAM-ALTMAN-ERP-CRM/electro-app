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

let inMemoryDispatches = [];
let inMemoryDispatchSerials = [];
try {
  const p = path.resolve(__dirname, 'mocks/dispatches.json');
  if (fs.existsSync(p)) {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    // Map seed mock rows to dispatches and serial items
    const seenDsp = new Set();
    raw.forEach((r, idx) => {
      const dspId = r.dispatch_id || `DSP-000${idx + 1}`;
      if (!seenDsp.has(dspId)) {
        seenDsp.add(dspId);
        inMemoryDispatches.push({
          id: dspId,
          so_id: r.so_id,
          courier: r.courier || 'BlueDart',
          tracking_no: r.tracking_no || `TRK-${dspId}`,
          status: r.status || 'delivered',
          ship_date: r.ship_date || '2026-10-02',
          delivered_date: r.delivered_date || null,
          address: r.address || '1201 Marina Bay, Bandra West, Mumbai 400050',
          created_at: new Date('2026-10-02T11:00:00+05:30').toISOString()
        });
      }
      inMemoryDispatchSerials.push({
        id: idx + 1,
        dispatch_id: dspId,
        sku: r.sku || 'SKU-0001',
        serial_number: r.serial_number || `TV55-2611-000${idx + 1}`
      });
    });
  }
} catch (err) {
  console.warn('[erp4] Could not load mock dispatches:', err.message);
}

let inMemoryReturns = [];
try {
  const p = path.resolve(__dirname, 'mocks/returns.json');
  if (fs.existsSync(p)) {
    inMemoryReturns = JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp4] Could not load mock returns:', err.message);
}

module.exports = {
  inMemoryOrders,
  inMemoryReservations,
  inMemoryDispatches,
  inMemoryDispatchSerials,
  inMemoryReturns
};
