import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api';
import './purchase-order-print.css';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const emptyItem = () => ({ sku: '', product_name: '', quantity: '', unit_cost: '' });
const badgeColors = { draft: '#475569', sent: '#1d4ed8', partially_received: '#a16207', received: '#15803d', cancelled: '#b91c1c' };

function Status({ value }) {
  return (
    <span style={{ color: 'white', background: badgeColors[value] || '#475569', padding: '0.25rem 0.5rem', borderRadius: '0.4rem', fontWeight: 600 }}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('erp2', '/api/purchase-orders')
      .then(setOrders)
      .catch(() => setError('Could not load purchase orders. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <h1>Purchase orders</h1>
      <p><Link to="/erp2/orders/new" className="badge badge-blue">+ Create purchase order</Link></p>
      {loading ? (
        <p>Loading purchase orders…</p>
      ) : error ? (
        <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>
      ) : orders.length === 0 ? (
        <p>No purchase orders yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Supplier</th>
              <th>Expected date</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td><Link to={`/erp2/orders/${encodeURIComponent(order.id)}`}>{order.id}</Link></td>
                <td>{order.supplier_id}</td>
                <td>{order.expected_date || '—'}</td>
                <td><Status value={order.status} /></td>
                <td>{money(order.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function NewOrder() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState('');
  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    api('erp2', '/api/suppliers')
      .then(setSuppliers)
      .catch(() => setError('Could not load suppliers. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const updateItem = (index, field, value) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const order = await api('erp2', '/api/purchase-orders', {
        method: 'POST',
        body: {
          supplier_id: supplier,
          expected_date: date || null,
          items: items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost)
          }))
        }
      });
      navigate(`/erp2/orders/${encodeURIComponent(order.id)}`);
    } catch (err) {
      setError(err.message || 'Could not save purchase order.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h1>New purchase order</h1>
      <p><Link to="/erp2/orders">← Back to orders</Link></p>
      {loading ? (
        <p>Loading suppliers…</p>
      ) : (
        <form onSubmit={submit} style={{ maxWidth: '640px' }}>
          {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
          <p>
            <label>Supplier: <br />
              <select required value={supplier} onChange={e => setSupplier(e.target.value)} style={{ width: '100%', padding: '0.4rem' }}>
                <option value="">-- Select a supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </label>
          </p>
          <p>
            <label>Expected date: <br />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '0.4rem' }} />
            </label>
          </p>
          <h2>Line Items</h2>
          {items.map((item, index) => (
            <fieldset key={index} style={{ marginBottom: '1rem', padding: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <legend>Item {index + 1}</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <label>SKU: <input required placeholder="e.g. SKU-0101" value={item.sku} onChange={e => updateItem(index, 'sku', e.target.value)} /></label>
                <label>Product Name: <input required placeholder="e.g. Display Panel" value={item.product_name} onChange={e => updateItem(index, 'product_name', e.target.value)} /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label>Quantity: <input required type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} /></label>
                <label>Unit Cost (₹): <input required type="number" min="0.01" step="0.01" value={item.unit_cost} onChange={e => updateItem(index, 'unit_cost', e.target.value)} /></label>
              </div>
            </fieldset>
          ))}
          <p>
            <button type="button" onClick={() => setItems(current => [...current, emptyItem()])}>+ Add Another Item</button>
          </p>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}><strong>Order Total: {money(total)}</strong></p>
          <button disabled={saving || suppliers.length === 0} type="submit">
            {saving ? 'Saving Order…' : 'Save Purchase Order'}
          </button>
        </form>
      )}
    </section>
  );
}

export function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [supplierDetails, setSupplierDetails] = useState(null);

  useEffect(() => {
    setLoading(true);
    api('erp2', `/api/purchase-orders/${encodeURIComponent(id)}`)
      .then(setOrder)
      .catch(() => setError('Could not load this purchase order.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!order?.supplier_id) return;
    api('erp2', `/api/suppliers/${encodeURIComponent(order.supplier_id)}`)
      .then(setSupplierDetails)
      .catch(() => setSupplierDetails(null));
  }, [order?.supplier_id]);

  async function changeStatus(status) {
    setSaving(true);
    setError('');
    try {
      const updated = await api('erp2', `/api/purchase-orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: { status }
      });
      setOrder(current => ({ ...current, ...updated }));
    } catch (err) {
      setError(err.message || 'Could not update order status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="erp2-print-order">
      <p className="erp2-no-print"><Link to="/erp2/orders">← Back to orders</Link></p>
      {loading ? (
        <p>Loading purchase order…</p>
      ) : !order ? (
        <p role="alert">{error || 'Purchase order not found.'}</p>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0' }}>PURCHASE ORDER: {order.id}</h1>
              <p style={{ margin: 0 }}>Status: <Status value={order.status} /></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Electro App ERP Systems</p>
              <p style={{ margin: 0, color: '#64748b' }}>Date: {order.expected_date || 'Standard Delivery'}</p>
              {order.sent_at && <p style={{ margin: 0, color: '#16a34a', fontSize: '0.85rem' }}>Sent At: {new Date(order.sent_at).toLocaleDateString('en-IN')}</p>}
            </div>
          </div>

          {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}

          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Vendor Details:</h3>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>{supplierDetails?.name || order.supplier_id}</p>
            {supplierDetails ? (
              <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                <p style={{ margin: '0 0 0.2rem 0' }}>Contact: {supplierDetails.contact_person || 'N/A'} · Phone: {supplierDetails.phone || 'N/A'} · Email: {supplierDetails.email || 'N/A'}</p>
                <p style={{ margin: 0 }}>City: {supplierDetails.city || 'N/A'} · GSTIN: <strong>{supplierDetails.gstin || 'Unregistered'}</strong></p>
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b' }}>Supplier details lookup loading…</p>
            )}
          </div>

          {order.status === 'draft' && (
            <p className="erp2-no-print" style={{ margin: '1rem 0' }}>
              <button disabled={saving} onClick={() => changeStatus('sent')} style={{ background: '#1d4ed8', color: 'white', marginRight: '0.5rem' }}>
                🚀 Send to Supplier
              </button>
              <button disabled={saving} onClick={() => changeStatus('cancelled')} style={{ background: '#dc2626', color: 'white' }}>
                Cancel Order
              </button>
            </p>
          )}

          <h2>Order Line Items</h2>
          {!order.items?.length ? (
            <p>No items in this order.</p>
          ) : (
            <table style={{ width: '100%', marginBottom: '1rem' }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Description</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ textAlign: 'right' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td><code>{item.sku}</code></td>
                    <td>{item.product_name}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{money(item.unit_cost)}</td>
                    <td style={{ textAlign: 'right' }}>{money(item.quantity * item.unit_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ textAlign: 'right', margin: '1.5rem 0' }}>
            <h2 style={{ margin: 0 }}>Total Amount: {money(order.total_amount)}</h2>
          </div>

          <p className="erp2-no-print" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
            <button onClick={() => window.print()} style={{ background: '#0f172a', color: 'white', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
              🖨️ Print Purchase Order
            </button>
          </p>
        </>
      )}
    </section>
  );
}
