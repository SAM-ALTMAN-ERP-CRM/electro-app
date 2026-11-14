import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Maps each serial status to its badge color class in index.css
const STATUS_BADGE_MAP = {
  in_stock: 'badge badge-green',
  reserved: 'badge badge-amber',
  sold: 'badge badge-red',
  returned: 'badge badge-blue'
};

// Allowed forward move for each status matching ERP-1 lifecycle rules
const NEXT_STATUS_ACTION = {
  in_stock: { next: 'reserved', label: 'Reserve' },
  reserved: { next: 'sold', label: 'Mark Sold' },
  sold: { next: 'returned', label: 'Mark Returned' },
  returned: { next: 'in_stock', label: 'Restock' }
};

// Section 5 shared seed fallback used only when ERP1-C1 endpoints are not merged yet (404)
const MOCK_SEED_SERIALS = [
  { serial_number: 'TV55-2611-0001', sku: 'SKU-0001', batch_no: 'BATCH-2611-01', warehouse_id: 'WH-01', status: 'sold', created_at: '2026-11-01T00:00:00.000Z' },
  { serial_number: 'TV55-2611-0006', sku: 'SKU-0001', batch_no: 'BATCH-2611-01', warehouse_id: 'WH-01', status: 'in_stock', created_at: '2026-11-01T00:00:00.000Z' },
  { serial_number: 'TV55-2611-0007', sku: 'SKU-0001', batch_no: 'BATCH-2611-01', warehouse_id: 'WH-01', status: 'in_stock', created_at: '2026-11-01T00:00:00.000Z' }
];

const FALLBACK_SKUS = [
  { id: 'SKU-0001', name: '55-inch 4K Smart TV' },
  { id: 'SKU-0002', name: '43-inch Full HD TV' },
  { id: 'SKU-0003', name: '65-inch OLED TV' },
  { id: 'SKU-0004', name: 'Soundbar 2.1' },
  { id: 'SKU-0005', name: 'Soundbar 5.1' }
];

function isNotImplementedError(err) {
  const msg = String(err?.message || '');
  return msg.includes('404') || msg.includes('Cannot GET /api/serials') || msg.includes('Cannot POST /api/serials');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(dateStr).slice(0, 10) : d.toISOString().slice(0, 10);
}

/**
 * Group serial records by batch_no when a dedicated /api/batches endpoint is not provided.
 */
function deriveBatchesFromSerials(serialList) {
  const map = {};
  for (const item of serialList) {
    const key = item.batch_no || 'UNASSIGNED';
    if (!map[key]) {
      map[key] = {
        batch_no: key,
        sku: item.sku,
        quantity: 0,
        in_stock: 0,
        sold: 0,
        manufactured_on: formatDate(item.created_at)
      };
    }
    map[key].quantity += 1;
    if (item.status === 'in_stock') map[key].in_stock += 1;
    if (item.status === 'sold') map[key].sold += 1;
  }
  return Object.values(map);
}

export default function SerialsPage() {
  const [serials, setSerials] = useState([]);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState(FALLBACK_SKUS);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [usingMock, setUsingMock] = useState(false);

  // Filter & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [skuFilter, setSkuFilter] = useState('');

  // Generate serials form state
  const [sku, setSku] = useState('SKU-0001');
  const [batchNo, setBatchNo] = useState('');
  const [count, setCount] = useState('5');
  const [prefix, setPrefix] = useState('TV55-2611-');
  const [generating, setGenerating] = useState(false);

  // Allocate serials form state
  const [allocSku, setAllocSku] = useState('SKU-0001');
  const [allocQty, setAllocQty] = useState('2');
  const [allocating, setAllocating] = useState(false);
  const [updatingSerial, setUpdatingSerial] = useState(null);

  // Load SKU dropdown options from ERP-1 products API
  useEffect(() => {
    let active = true;
    api('erp1', '/api/products')
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (active && list.length > 0) {
          setProducts(list);
        }
      })
      .catch(() => {
        // Keep FALLBACK_SKUS if products API is offline
      });
    return () => { active = false; };
  }, []);

  const fetchSerialsAndBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (skuFilter) params.set('sku', skuFilter);
      if (statusFilter) params.set('status', statusFilter);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api('erp1', `/api/serials${qs}`);
      const list = Array.isArray(res) ? res : (res?.data || []);

      setUsingMock(false);
      setSerials(list);

      // Try optional /api/batches endpoint; fall back to grouping serials by batch_no
      try {
        const batchRes = await api('erp1', '/api/batches');
        const batchList = Array.isArray(batchRes) ? batchRes : (batchRes?.data || []);
        setBatches(batchList.length > 0 ? batchList : deriveBatchesFromSerials(list));
      } catch {
        setBatches(deriveBatchesFromSerials(list));
      }
    } catch (err) {
      if (isNotImplementedError(err)) {
        // ERP1-C1 is not merged yet: keep local mock rows so browser flow remains testable
        setUsingMock(true);
        setSerials((prev) => {
          const base = prev.length > 0 ? prev : MOCK_SEED_SERIALS;
          setBatches(deriveBatchesFromSerials(base));
          return base;
        });
      } else {
        setError(err.message || 'Failed to load serial numbers');
      }
    } finally {
      setLoading(false);
    }
  }, [skuFilter, statusFilter]);

  useEffect(() => {
    fetchSerialsAndBatches();
  }, [fetchSerialsAndBatches]);

  // Submit handler for bulk serial generation
  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback('');

    const cleanBatch = batchNo.trim();
    const cleanPrefix = prefix.trim();
    const parsedCount = parseInt(count, 10);

    if (!sku.trim()) {
      setError('Please select a product SKU.');
      return;
    }
    if (!cleanBatch) {
      setError('Batch number is required.');
      return;
    }
    if (isNaN(parsedCount) || parsedCount <= 0 || parsedCount > 500) {
      setError('Count must be a positive number between 1 and 500.');
      return;
    }
    if (!cleanPrefix) {
      setError('Serial prefix is required.');
      return;
    }

    try {
      setGenerating(true);
      const res = await api('erp1', '/api/serials/bulk', {
        method: 'POST',
        body: {
          sku: sku.trim(),
          batch_no: cleanBatch,
          count: parsedCount,
          prefix: cleanPrefix
        }
      });

      const createdCount = res?.count ?? res?.created_serials?.length ?? parsedCount;
      setFeedback(`Generated ${createdCount} serial(s) in batch ${cleanBatch}.`);
      setBatchNo('');
      await fetchSerialsAndBatches();
    } catch (err) {
      if (isNotImplementedError(err)) {
        // Local mock generation fallback when ERP1-C1 API is not yet merged
        setUsingMock(true);
        const existingCount = serials.filter((s) => s.serial_number.startsWith(cleanPrefix)).length;
        const created = [];
        for (let i = 1; i <= parsedCount; i++) {
          const num = String(existingCount + i).padStart(4, '0');
          created.push({
            serial_number: `${cleanPrefix}${num}`,
            sku: sku.trim(),
            batch_no: cleanBatch,
            warehouse_id: 'WH-01',
            status: 'in_stock',
            created_at: new Date().toISOString()
          });
        }
        const nextSerials = [...created, ...serials];
        setSerials(nextSerials);
        setBatches(deriveBatchesFromSerials(nextSerials));
        setFeedback(`[Mock] Generated ${created.length} serial(s) in batch ${cleanBatch}.`);
        setBatchNo('');
      } else {
        setError(err.message || 'Failed to generate serial numbers');
      }
    } finally {
      setGenerating(false);
    }
  };

  // Submit handler for allocating serials
  const handleAllocate = async (e) => {
    e.preventDefault();
    setError('');
    setFeedback('');

    const parsedQty = parseInt(allocQty, 10);
    if (!allocSku.trim()) {
      setError('Please select an SKU for allocation.');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Allocation quantity must be a positive integer.');
      return;
    }

    try {
      setAllocating(true);
      const res = await api('erp1', '/api/serials/allocate', {
        method: 'POST',
        body: {
          sku: allocSku.trim(),
          qty: parsedQty
        }
      });

      const list = res?.allocated_serials || [];
      setFeedback(`Allocated ${list.length} serial(s) as reserved: ${list.join(', ')}`);
      await fetchSerialsAndBatches();
    } catch (err) {
      setError(err.message || 'Failed to allocate serials');
    } finally {
      setAllocating(false);
    }
  };

  // Handler for lifecycle status moves (in_stock -> reserved -> sold -> returned -> in_stock)
  const handleStatusTransition = async (serialNumber, nextStatus) => {
    try {
      setUpdatingSerial(serialNumber);
      setError('');
      setFeedback('');

      const res = await api('erp1', `/api/serials/${encodeURIComponent(serialNumber)}/status`, {
        method: 'PATCH',
        body: { status: nextStatus }
      });

      setFeedback(`Serial ${serialNumber} status updated to '${res?.status || nextStatus}'.`);
      await fetchSerialsAndBatches();
    } catch (err) {
      setError(err.message || `Failed to update status for ${serialNumber}`);
    } finally {
      setUpdatingSerial(null);
    }
  };

  // Apply search box and filters cleanly in the browser
  const visibleSerials = serials.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (skuFilter && item.sku !== skuFilter) return false;
    if (searchQuery.trim()) {
      const needle = searchQuery.trim().toLowerCase();
      if (!String(item.serial_number || '').toLowerCase().includes(needle)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Serial Numbers & Batches</h2>
          <span className="badge badge-blue">ERP-1</span>
        </div>
      </div>

      {/* Mock fallback notice if ERP1-C1 is not yet merged */}
      {usingMock && (
        <div
          style={{
            backgroundColor: '#fefce8',
            border: '1px solid #fde047',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#854d0e',
            fontSize: '0.875rem'
          }}
        >
          Serials API (ERP1-C1) is not running yet — showing mock seed data so browser generation and search remain testable.
        </div>
      )}

      {/* Feedback & Error Banners */}
      {feedback && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#166534',
            fontSize: '0.875rem'
          }}
        >
          {feedback}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fda4af',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            color: '#be123c',
            fontSize: '0.875rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Generate Serials Form */}
      <form
        onSubmit={handleGenerate}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a' }}>Generate Serials</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '210px', flex: '1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              SKU
            </label>
            <select
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '160px', flex: '1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              Batch No
            </label>
            <input
              type="text"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              placeholder="e.g. BATCH-2611-02"
              required
              style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ width: '100px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              Count
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              required
              style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ minWidth: '150px', flex: '1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              Prefix
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. TV55-2611-"
              required
              style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>

          <button type="submit" disabled={generating}>
            {generating ? 'Generating...' : 'Generate Serials'}
          </button>
        </div>
      </form>

      {/* Allocate Serials Form */}
      <form
        onSubmit={handleAllocate}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '1.5rem'
        }}
      >
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#0f172a' }}>Allocate Serials (Reserve for Order)</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '210px', flex: '1' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              SKU
            </label>
            <select
              value={allocSku}
              onChange={(e) => setAllocSku(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="500"
              value={allocQty}
              onChange={(e) => setAllocQty(e.target.value)}
              required
              style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
            />
          </div>

          <button type="submit" disabled={allocating}>
            {allocating ? 'Allocating...' : 'Allocate Serials'}
          </button>
        </div>
      </form>

      {/* Filter & Search Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by serial number (e.g. TV55-2611-0006)..."
          style={{ flex: '1', minWidth: '240px', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
        >
          <option value="">All Statuses</option>
          <option value="in_stock">in_stock</option>
          <option value="reserved">reserved</option>
          <option value="sold">sold</option>
          <option value="returned">returned</option>
        </select>

        <select
          value={skuFilter}
          onChange={(e) => setSkuFilter(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
        >
          <option value="">All SKUs</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id}
            </option>
          ))}
        </select>
      </div>

      {/* Serials Table / Loading / Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
          Loading serial numbers...
        </div>
      ) : visibleSerials.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
            marginBottom: '1.5rem'
          }}
        >
          No serial numbers found matching your search or filter.
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '2rem' }}>
          <table>
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>SKU</th>
                <th>Batch No</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Allowed Transition</th>
              </tr>
            </thead>
            <tbody>
              {visibleSerials.map((item) => {
                const action = NEXT_STATUS_ACTION[item.status];
                const isUpdating = updatingSerial === item.serial_number;

                return (
                  <tr key={item.serial_number}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.serial_number}</td>
                    <td>{item.sku}</td>
                    <td>{item.batch_no || '—'}</td>
                    <td>{item.warehouse_id || '—'}</td>
                    <td>
                      <span className={STATUS_BADGE_MAP[item.status] || 'badge'}>
                        {item.status || 'unknown'}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                      {formatDate(item.created_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {action ? (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStatusTransition(item.serial_number, action.next)}
                          style={{
                            padding: '0.3rem 0.65rem',
                            backgroundColor: isUpdating ? '#94a3b8' : '#f1f5f9',
                            color: isUpdating ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.8125rem'
                          }}
                        >
                          {isUpdating ? 'Updating...' : action.label}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Batches List Section */}
      <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.15rem', color: '#0f172a' }}>Batches List</h3>
      {batches.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}
        >
          No batches recorded yet.
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Batch No</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Manufactured / Created</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.batch_no}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.batch_no}</td>
                  <td>{b.sku}</td>
                  <td>{b.quantity} units</td>
                  <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>
                    {formatDate(b.manufactured_on || b.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

