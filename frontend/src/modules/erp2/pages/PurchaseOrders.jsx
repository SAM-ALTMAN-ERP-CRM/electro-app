import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const emptyItem = () => ({ sku: '', product_name: '', quantity: '', unit_cost: '' });
const badgeColors = { draft: '#475569', sent: '#1d4ed8', partially_received: '#a16207', received: '#15803d', cancelled: '#b91c1c' };

function Status({ value }) {
  return <span style={{ color: 'white', background: badgeColors[value] || '#475569', padding: '0.25rem 0.5rem', borderRadius: '0.4rem' }}>{value.replaceAll('_', ' ')}</span>;
}

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api('erp2', '/api/purchase-orders').then(setOrders).catch(() => setError('Could not load purchase orders. Please try again.')).finally(() => setLoading(false));
  }, []);
  return <section><h1>Purchase orders</h1><p><Link to="/erp2/orders/new">Create purchase order</Link></p>
    {loading ? <p>Loading purchase orders…</p> : error ? <p role="alert">{error}</p> : orders.length === 0 ? <p>No purchase orders yet.</p> :
      <table><thead><tr><th>Order</th><th>Supplier</th><th>Expected date</th><th>Status</th><th>Total</th></tr></thead><tbody>
        {orders.map(order => <tr key={order.id}><td><Link to={`/erp2/orders/${encodeURIComponent(order.id)}`}>{order.id}</Link></td><td>{order.supplier_id}</td><td>{order.expected_date || '—'}</td><td><Status value={order.status} /></td><td>{money(order.total_amount)}</td></tr>)}
      </tbody></table>}
  </section>;
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
    api('erp2', '/api/suppliers').then(setSuppliers).catch(() => setError('Could not load suppliers. Please try again when the supplier service is available.')).finally(() => setLoading(false));
  }, []);
  const updateItem = (index, field, value) => setItems(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const order = await api('erp2', '/api/purchase-orders', { method: 'POST', body: { supplier_id: supplier, expected_date: date || null, items: items.map(item => ({ ...item, quantity: Number(item.quantity), unit_cost: Number(item.unit_cost) })) } });
      navigate(`/erp2/orders/${encodeURIComponent(order.id)}`);
    } catch (err) { setError(err.message || 'Could not save the purchase order.'); }
    finally { setSaving(false); }
  }
  return <section><h1>New purchase order</h1><p><Link to="/erp2/orders">Back to orders</Link></p>
    {loading ? <p>Loading suppliers…</p> : <form onSubmit={submit}>
      {error && <p role="alert">{error}</p>}
      {!error && suppliers.length === 0 && <p>No suppliers available. Add a supplier first.</p>}
      <p><label>Supplier <select required value={supplier} onChange={e => setSupplier(e.target.value)}><option value="">Select a supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label></p>
      <p><label>Expected date <input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></p>
      <h2>Items</h2>{items.map((item, index) => <fieldset key={index}><legend>Item {index + 1}</legend>
        <label>SKU <input required value={item.sku} onChange={e => updateItem(index, 'sku', e.target.value)} /></label>{' '}
        <label>Product name <input required value={item.product_name} onChange={e => updateItem(index, 'product_name', e.target.value)} /></label>{' '}
        <label>Quantity <input required type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} /></label>{' '}
        <label>Unit cost (₹) <input required type="number" min="0.01" step="0.01" value={item.unit_cost} onChange={e => updateItem(index, 'unit_cost', e.target.value)} /></label>
      </fieldset>)}
      <p><button type="button" onClick={() => setItems(current => [...current, emptyItem()])}>Add item</button></p>
      <p><strong>Total: {money(total)}</strong></p><button disabled={saving || suppliers.length === 0} type="submit">{saving ? 'Saving…' : 'Save purchase order'}</button>
    </form>}
  </section>;
}

export function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setLoading(true);
    api('erp2', `/api/purchase-orders/${encodeURIComponent(id)}`).then(setOrder).catch(() => setError('Could not load this purchase order.')).finally(() => setLoading(false));
  }, [id]);
  async function changeStatus(status) {
    setSaving(true); setError('');
    try { const updated = await api('erp2', `/api/purchase-orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }); setOrder(current => ({ ...current, ...updated })); }
    catch (err) { setError(err.message || 'Could not update the order.'); }
    finally { setSaving(false); }
  }
  return <section><p><Link to="/erp2/orders">Back to orders</Link></p>{loading ? <p>Loading purchase order…</p> : !order ? <p role="alert">{error || 'Purchase order not found.'}</p> : <>
    <h1>Purchase order {order.id}</h1>{error && <p role="alert">{error}</p>}
    <p>Supplier: {order.supplier_id}</p><p>Expected date: {order.expected_date || '—'}</p><p>Status: <Status value={order.status} /></p>
    {order.status === 'draft' && <p><button disabled={saving} onClick={() => changeStatus('sent')}>Send</button>{' '}<button disabled={saving} onClick={() => changeStatus('cancelled')}>Cancel order</button></p>}
    <h2>Items</h2>{!order.items?.length ? <p>No items in this order.</p> : <table><thead><tr><th>SKU</th><th>Product</th><th>Quantity</th><th>Unit cost</th></tr></thead><tbody>{order.items.map(item => <tr key={item.id}><td>{item.sku}</td><td>{item.product_name}</td><td>{item.quantity}</td><td>{money(item.unit_cost)}</td></tr>)}</tbody></table>}
    <p><strong>Total: {money(order.total_amount)}</strong></p>
  </>}</section>;
}
