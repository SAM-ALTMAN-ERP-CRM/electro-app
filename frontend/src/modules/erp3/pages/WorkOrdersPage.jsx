import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

const INITIAL_WORK_ORDERS = [
  { id: 'WO-0001', bom_id: 'BOM-0001', product_sku: 'SKU-0001', product_name: '55" 4K Smart LED TV', quantity: 50, status: 'in_progress', source: 'manual', planned_start: '2026-11-12', planned_end: '2026-11-15' },
  { id: 'WO-0002', bom_id: 'BOM-0002', product_sku: 'SKU-0003', product_name: '65" OLED TV', quantity: 25, status: 'in_progress', source: 'manual', planned_start: '2026-11-13', planned_end: '2026-11-16' },
  { id: 'WO-0003', bom_id: 'BOM-0001', product_sku: 'SKU-0001', product_name: '55" 4K Smart LED TV', quantity: 100, status: 'planned', source: 'shortage', planned_start: '2026-11-14', planned_end: '2026-11-18' },
  { id: 'WO-0004', bom_id: 'BOM-0001', product_sku: 'SKU-0001', product_name: '55" 4K Smart LED TV', quantity: 40, status: 'completed', source: 'manual', planned_start: '2026-11-05', planned_end: '2026-11-09' },
  { id: 'WO-0005', bom_id: 'BOM-0002', product_sku: 'SKU-0003', product_name: '65" OLED TV', quantity: 10, status: 'cancelled', source: 'manual', planned_start: '2026-11-04', planned_end: '2026-11-07' }
];

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState(INITIAL_WORK_ORDERS);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  // Form State
  const [bomId, setBomId] = useState('BOM-0001');
  const [quantity, setQuantity] = useState(50);
  const [plannedStart, setPlannedStart] = useState('2026-11-15');
  const [plannedEnd, setPlannedEnd] = useState('2026-11-19');
  const [source, setSource] = useState('manual');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await api('erp3', '/api/work-orders');
        if (Array.isArray(data) && data.length > 0) {
          setWorkOrders(data);
        }
      } catch (err) {
        console.info('Using seed work orders:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const handleStatusChange = async (woId, newStatus) => {
    try {
      await api('erp3', `/api/work-orders/${woId}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
    } catch (err) {
      console.info('Status transition client fallback:', err.message);
    }

    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, status: newStatus } : w));
    setMessage(`Work order ${woId} transitioned to ${newStatus}.`);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const product_sku = bomId === 'BOM-0001' ? 'SKU-0001' : 'SKU-0003';
    const product_name = bomId === 'BOM-0001' ? '55" 4K Smart LED TV' : '65" OLED TV';
    const newId = `WO-000${workOrders.length + 1}`;

    const newOrder = {
      id: newId,
      bom_id: bomId,
      product_sku,
      product_name,
      quantity: Number(quantity),
      status: 'planned',
      source,
      planned_start: plannedStart,
      planned_end: plannedEnd
    };

    try {
      await api('erp3', '/api/work-orders', {
        method: 'POST',
        body: newOrder
      });
    } catch (err) {
      console.info('Simulated order creation fallback:', err.message);
    }

    setWorkOrders(prev => [newOrder, ...prev]);
    setMessage(`Work order ${newId} scheduled successfully.`);
    setShowCreate(false);
  };

  const filteredOrders = workOrders.filter(w => {
    const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
    const matchesSource = filterSource === 'all' || w.source === filterSource;
    return matchesStatus && matchesSource;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="badge badge-green">completed</span>;
      case 'in_progress': return <span className="badge badge-amber">in_progress</span>;
      case 'planned': return <span className="badge badge-blue">planned</span>;
      case 'cancelled': return <span className="badge badge-red">cancelled</span>;
      default: return <span className="badge badge-blue">{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
              Work Orders Tracker
            </h2>
            <span className="badge badge-blue">ERP-3 Production</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Schedule and monitor shop-floor assembly jobs and execution lifecycles
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn btn-primary"
          >
            {showCreate ? '✕ Close Form' : '+ New Work Order'}
          </button>
        </div>
      </div>

      {message && (
        <div style={{ background: '#dcfce7', border: '1px solid #22c55e', color: '#15803d', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          {message}
        </div>
      )}

      {/* Quick Create Form Drawer */}
      {showCreate && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
            Schedule New Assembly Work Order
          </h3>
          <form onSubmit={handleCreateOrder}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Bill of Materials (BOM)
                </label>
                <select
                  value={bomId}
                  onChange={(e) => setBomId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="BOM-0001">BOM-0001 (55" 4K Smart TV)</option>
                  <option value="BOM-0002">BOM-0002 (65" OLED TV)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Target Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Planned Start Date
                </label>
                <input
                  type="date"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Planned End Date
                </label>
                <input
                  type="date"
                  value={plannedEnd}
                  onChange={(e) => setPlannedEnd(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Trigger Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                >
                  <option value="manual">Manual Production Order</option>
                  <option value="shortage">ERP-4 Sales Shortage Trigger</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn"
                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Schedule Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff' }}
        >
          <option value="all">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#ffffff' }}
        >
          <option value="all">All Sources</option>
          <option value="manual">Manual</option>
          <option value="shortage">Shortage Trigger</option>
        </select>
      </div>

      {/* Orders Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>ORDER ID</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>PRODUCT</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>QUANTITY</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>SOURCE</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>TIMELINE</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>TRANSITION</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 600 }}>DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((wo) => (
              <tr key={wo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{wo.id}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontFamily: 'monospace', color: '#2563eb', marginRight: '0.4rem' }}>{wo.product_sku}</span>
                  {wo.product_name}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{wo.quantity} units</td>
                <td style={{ padding: '0.75rem 1rem' }}>{getStatusBadge(wo.status)}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{wo.source}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                  {wo.planned_start} → {wo.planned_end}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  {wo.status === 'planned' && (
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(wo.id, 'in_progress')}
                        className="btn"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(wo.id, 'cancelled')}
                        className="btn"
                        style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {wo.status === 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(wo.id, 'completed')}
                      className="btn"
                      style={{ background: '#16a34a', color: '#ffffff', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      Complete
                    </button>
                  )}
                  {wo.status === 'completed' && (
                    <span style={{ color: '#16a34a', fontSize: '0.8rem' }}>✓ Finished</span>
                  )}
                  {wo.status === 'cancelled' && (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Cancelled</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <Link to={`/erp3/work-orders/${wo.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                    View &gt;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
