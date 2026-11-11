import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

// Seed work orders adhering to Section 5 shared IDs
const INITIAL_WORK_ORDERS = [
  { id: 'WO-0001', product_sku: 'SKU-0001', product_name: '55" 4K Smart LED TV', quantity: 50, status: 'in_progress', source: 'manual', planned_end: '2026-11-15' },
  { id: 'WO-0002', product_sku: 'SKU-0003', product_name: '65" OLED TV', quantity: 25, status: 'in_progress', source: 'manual', planned_end: '2026-11-16' },
  { id: 'WO-0003', product_sku: 'SKU-0001', product_name: '55" 4K Smart LED TV', quantity: 100, status: 'planned', source: 'shortage', planned_end: '2026-11-18' },
  { id: 'WO-0004', product_sku: 'SKU-0001', product_name: '55" 4K Smart LED TV', quantity: 40, status: 'completed', source: 'manual', planned_end: '2026-11-09' },
  { id: 'WO-0005', product_sku: 'SKU-0003', product_name: '65" OLED TV', quantity: 10, status: 'cancelled', source: 'manual', planned_end: '2026-11-07' }
];

export default function OverviewPage() {
  const [workOrders, setWorkOrders] = useState(INITIAL_WORK_ORDERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api('erp3', '/api/work-orders');
        if (Array.isArray(data) && data.length > 0) {
          setWorkOrders(data);
        }
      } catch (err) {
        // Fallback to initial seed orders if backend is starting up
        console.info('ERP3 Overview using seed work orders:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const inProgressCount = workOrders.filter(w => w.status === 'in_progress').length;
  const completedCount = workOrders.filter(w => w.status === 'completed').length;
  const plannedCount = workOrders.filter(w => w.status === 'planned').length;

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
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
              Production Dashboard
            </h2>
            <span className="badge badge-blue">ERP-3 Production</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Assembly line work orders, BOM recipes & quality inspection metrics
          </p>
        </div>
        <div>
          <Link to="/erp3/work-orders" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary">+ Schedule Work Order</button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active BOMs
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem' }}>
            2 Recipes
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            SKU-0001 & SKU-0003
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            In Progress
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d97706', marginTop: '0.5rem' }}>
            {inProgressCount} Orders
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Floor assembly line
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Planned Orders
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb', marginTop: '0.5rem' }}>
            {plannedCount} Orders
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Ready for execution
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            QC Pass Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a', marginTop: '0.5rem' }}>
            92.5%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Inspection yield
          </div>
        </div>
      </div>

      {/* Active Work Orders Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.75rem' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            Active Assembly Line Work Orders
          </h3>
          <Link to="/erp3/work-orders" style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
            View All Work Orders →
          </Link>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>WO ID</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>PRODUCT</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>QUANTITY</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>DUE DATE</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map((wo) => (
              <tr key={wo.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{wo.id}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                  <span style={{ fontFamily: 'monospace', color: '#2563eb', marginRight: '0.5rem' }}>{wo.product_sku}</span>
                  {wo.product_name}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{wo.quantity} units</td>
                <td style={{ padding: '0.75rem 1rem' }}>{getStatusBadge(wo.status)}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{wo.planned_end}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <Link to={`/erp3/work-orders/${wo.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                    View Details &gt;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Navigation Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Bill of Materials (BOM)</h4>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0' }}>
            Check component requirements and detect stock shortages against ERP-1 warehouse inventory.
          </p>
          <Link to="/erp3/boms" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            Browse Bills of Materials →
          </Link>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Quality Control & Inspections</h4>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem 0' }}>
            Record batch quality checks, evaluate pass/fail criteria, and inspect defect trends.
          </p>
          <Link to="/erp3/qc" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
            Open Quality Control →
          </Link>
        </div>
      </div>
    </div>
  );
}
