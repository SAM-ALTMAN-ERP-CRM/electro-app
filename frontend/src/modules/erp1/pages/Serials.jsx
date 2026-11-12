import React, { useState, useEffect } from 'react';
import { api } from '../../../api';
import SerialStatusBadge from '../components/SerialStatusBadge';

// Allowed next move for each serial status (matches backend state machine)
const NEXT_STATUS_ACTION = {
  in_stock: { next: 'reserved', label: 'Reserve' },
  reserved: { next: 'sold', label: 'Mark Sold' },
  sold: { next: 'returned', label: 'Mark Returned' },
  returned: { next: 'in_stock', label: 'Restock' }
};

export default function Serials() {
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filter controls
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Allocation form state
  const [allocSku, setAllocSku] = useState('SKU-0001');
  const [allocQty, setAllocQty] = useState('2');
  const [allocating, setAllocating] = useState(false);

  // Track which serial row is currently updating
  const [updatingSerial, setUpdatingSerial] = useState(null);

  const fetchSerials = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const queryString = params.toString();
      const path = queryString ? `/api/serials?${queryString}` : '/api/serials';
      const data = await api('erp1', path);
      setSerials(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load serial numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSerials();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSerials();
  };

  const handleStatusMove = async (serialNumber, nextStatus) => {
    try {
      setUpdatingSerial(serialNumber);
      setError(null);
      setFeedback(null);

      const updated = await api('erp1', `/api/serials/${encodeURIComponent(serialNumber)}/status`, {
        method: 'PATCH',
        body: { status: nextStatus }
      });

      setFeedback(`Serial ${updated.serial_number} moved to '${updated.status}'.`);
      await fetchSerials();
    } catch (err) {
      setError(err.message || `Failed to update status for ${serialNumber}`);
    } finally {
      setUpdatingSerial(null);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      setAllocating(true);
      setError(null);
      setFeedback(null);

      const res = await api('erp1', '/api/serials/allocate', {
        method: 'POST',
        body: {
          sku: allocSku.trim(),
          qty: Number(allocQty)
        }
      });

      const list = res.allocated_serials || [];
      setFeedback(`Allocated ${list.length} serial(s) as reserved: ${list.join(', ')}`);
      await fetchSerials();
    } catch (err) {
      setError(err.message || 'Failed to allocate serials');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Serial Status & Allocation</h2>
          <span className="badge badge-blue">ERP-1</span>
        </div>
      </div>

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

      {/* Allocate Serials Form Card */}
      <form
        onSubmit={handleAllocate}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            SKU
          </label>
          <input
            type="text"
            value={allocSku}
            onChange={(e) => setAllocSku(e.target.value)}
            placeholder="e.g. SKU-0001"
            required
            style={{ padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={allocQty}
            onChange={(e) => setAllocQty(e.target.value)}
            required
            style={{ width: '100px', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
          />
        </div>

        <button type="submit" disabled={allocating}>
          {allocating ? 'Allocating...' : 'Allocate Serials'}
        </button>
      </form>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search serial number (e.g. TV55-2611-0006)..."
          style={{ flex: '1', minWidth: '220px', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem' }}
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

        <button type="submit">Search</button>
      </form>

      {/* Serials Table / Loading / Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
          Loading serial numbers...
        </div>
      ) : serials.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}
        >
          No serial numbers found matching your filters.
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>SKU</th>
                <th>Batch No</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Allowed Transition</th>
              </tr>
            </thead>
            <tbody>
              {serials.map((item) => {
                const action = NEXT_STATUS_ACTION[item.status];
                const isUpdating = updatingSerial === item.serial_number;

                return (
                  <tr key={item.serial_number}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.serial_number}</td>
                    <td>{item.sku}</td>
                    <td>{item.batch_no || '—'}</td>
                    <td>{item.warehouse_id || '—'}</td>
                    <td>
                      <SerialStatusBadge status={item.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {action ? (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleStatusMove(item.serial_number, action.next)}
                          style={{
                            padding: '0.35rem 0.75rem',
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
    </div>
  );
}

