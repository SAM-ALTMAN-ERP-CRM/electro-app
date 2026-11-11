// frontend/src/modules/erp3/pages/BomDetailPage.jsx
// Shows one BOM's header info and all its component items.
// Reached by clicking "View →" on the BomsPage list.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

// Fallback seed — shown if the backend isn't reachable yet
const SEED_DETAIL = {
  'BOM-0001': {
    id: 'BOM-0001', product_sku: 'SKU-0001', product_name: '55-Inch LED Smart TV', version: 1, active: true,
    items: [
      { id: 'BOMI-0001', bom_id: 'BOM-0001', component_sku: 'SKU-0101', component_name: 'Display Panel',    qty_per_unit: 1 },
      { id: 'BOMI-0002', bom_id: 'BOM-0001', component_sku: 'SKU-0102', component_name: 'Main Board',        qty_per_unit: 1 },
      { id: 'BOMI-0003', bom_id: 'BOM-0001', component_sku: 'SKU-0103', component_name: 'Power Supply Unit', qty_per_unit: 1 },
      { id: 'BOMI-0004', bom_id: 'BOM-0001', component_sku: 'SKU-0104', component_name: 'Remote Control',    qty_per_unit: 1 },
      { id: 'BOMI-0005', bom_id: 'BOM-0001', component_sku: 'SKU-0105', component_name: 'Packaging Box',     qty_per_unit: 1 }
    ]
  },
  'BOM-0002': {
    id: 'BOM-0002', product_sku: 'SKU-0003', product_name: '65-Inch OLED Smart TV', version: 1, active: true,
    items: [
      { id: 'BOMI-0006', bom_id: 'BOM-0002', component_sku: 'SKU-0101', component_name: 'OLED Display Panel', qty_per_unit: 1 },
      { id: 'BOMI-0007', bom_id: 'BOM-0002', component_sku: 'SKU-0102', component_name: 'Main Board',          qty_per_unit: 1 },
      { id: 'BOMI-0008', bom_id: 'BOM-0002', component_sku: 'SKU-0103', component_name: 'Power Supply Unit',   qty_per_unit: 1 },
      { id: 'BOMI-0009', bom_id: 'BOM-0002', component_sku: 'SKU-0104', component_name: 'Remote Control',      qty_per_unit: 1 },
      { id: 'BOMI-0010', bom_id: 'BOM-0002', component_sku: 'SKU-0105', component_name: 'Packaging Box',       qty_per_unit: 1 }
    ]
  }
};

export default function BomDetailPage() {
  const { id } = useParams();      // BOM-0001 etc., from the route path
  const navigate = useNavigate();

  const [bom, setBom]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');

    api('erp3', `/api/boms/${id}`)
      .then(res => {
        // api helper may unwrap to { data: {...} } or the object directly
        setBom(res?.data ?? res);
      })
      .catch(err => {
        console.warn('[erp3] BOM detail fetch failed, using seed fallback:', err.message);
        // Try the in-memory seed; show a 404-style message if unknown id
        const fallback = SEED_DETAIL[id];
        if (fallback) {
          setBom(fallback);
        } else {
          setError(`BOM "${id}" not found.`);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading BOM…</div>;
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 0' }}>
        <button onClick={() => navigate(-1)} style={backBtnStyle}>← Back to BOMs</button>
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', border: '1px solid #fecaca' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!bom) return null;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>

      {/* Back link */}
      <button onClick={() => navigate(-1)} style={backBtnStyle}>← Back to BOMs</button>

      {/* BOM header card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              {bom.product_name}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              BOM ID: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e40af' }}>{bom.id}</span>
              {' · '}
              Product SKU: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{bom.product_sku}</span>
              {' · '}
              Version: <strong>v{bom.version}</strong>
            </p>
          </div>
          <div>
            {bom.active
              ? <span className="badge badge-green">Active</span>
              : <span className="badge badge-red">Inactive</span>}
          </div>
        </div>
      </div>

      {/* Component items table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Components</h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {bom.items?.length ?? 0} component{bom.items?.length !== 1 ? 's' : ''}
          </span>
        </div>

        {!bom.items || bom.items.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            No components found for this BOM.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['#', 'Item ID', 'Component SKU', 'Component Name', 'Qty / Unit'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bom.items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>{idx + 1}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>{item.id}</td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#1e40af' }}>{item.component_sku}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#0f172a' }}>{item.component_name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 500 }}>{Number(item.qty_per_unit).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

const backBtnStyle = {
  display: 'inline-block',
  marginBottom: '1rem',
  background: 'none',
  border: 'none',
  color: '#2563eb',
  fontWeight: 500,
  fontSize: '0.875rem',
  cursor: 'pointer',
  padding: 0
};

