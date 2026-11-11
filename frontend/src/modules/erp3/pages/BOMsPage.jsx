import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';

const INITIAL_BOMS = [
  {
    id: 'BOM-0001',
    product_sku: 'SKU-0001',
    product_name: '55-Inch LED Smart TV',
    version: 1,
    active: true,
    components_count: 5
  },
  {
    id: 'BOM-0002',
    product_sku: 'SKU-0003',
    product_name: '65-Inch OLED Smart TV',
    version: 1,
    active: true,
    components_count: 5
  }
];

export default function BOMsPage() {
  const [boms, setBoms] = useState(INITIAL_BOMS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    async function fetchBoms() {
      try {
        const data = await api('erp3', '/api/boms');
        if (Array.isArray(data) && data.length > 0) {
          setBoms(data);
        }
      } catch (err) {
        console.info('Using seed BOMs:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBoms();
  }, []);

  const filteredBoms = boms.filter(bom => {
    const matchesSearch =
      bom.product_sku.toLowerCase().includes(search.toLowerCase()) ||
      bom.product_name.toLowerCase().includes(search.toLowerCase()) ||
      bom.id.toLowerCase().includes(search.toLowerCase());

    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && bom.active) ||
      (filterActive === 'inactive' && !bom.active);

    return matchesSearch && matchesActive;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
              Bills of Materials (BOM)
            </h2>
            <span className="badge badge-blue">ERP-3 Production</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Engineering recipes, component lists and material yield requirements
          </p>
        </div>
        <div>
          <Link to="/erp3/boms/new" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary">+ Create New BOM</button>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Search by SKU, Name, or BOM ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            minWidth: '280px',
            fontSize: '0.875rem'
          }}
        />

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            background: '#ffffff'
          }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Loading & Empty States */}
      {loading && <p style={{ color: '#64748b' }}>Loading Bills of Materials...</p>}

      {!loading && filteredBoms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b', margin: 0 }}>No matching bills of materials found.</p>
        </div>
      )}

      {/* BOMs Table */}
      {!loading && filteredBoms.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>BOM ID</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>PRODUCT SKU</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>PRODUCT NAME</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>VERSION</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>COMPONENTS</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>STATUS</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredBoms.map((bom) => (
                <tr key={bom.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                    {bom.id}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#2563eb', fontWeight: 600 }}>
                    {bom.product_sku}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 500 }}>
                    {bom.product_name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                    v{bom.version || 1}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                    {bom.components_count || 5} components
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {bom.active ? (
                      <span className="badge badge-green">active</span>
                    ) : (
                      <span className="badge badge-amber">inactive</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link
                      to={`/erp3/boms/${bom.id}`}
                      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      View Details &gt;
                    </Link>
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
