import React, { useEffect, useState } from 'react';
import api from '../../../api';

const money = (n) =>
  `Rs ${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export default function Payments() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    invoice_id: '',
    amount: '',
    method: 'upi',
    reference: '',
    paid_on: new Date().toISOString().slice(0, 10)
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [inv, pay] = await Promise.all([
        api('erp5', '/api/invoices'),
        api('erp5', '/api/payments')
      ]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setPayments(Array.isArray(pay) ? pay : []);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const balanceFor = (inv) => {
    const total = Number(inv.total || 0);
    const paid = payments
      .filter((p) => p.invoice_id === inv.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return total - paid;
  };

  const unpaidInvoices = invoices.filter(
    (i) => i.status === 'unpaid' || i.status === 'partially_paid'
  );

  const onSelectInvoice = (id) => {
    const inv = invoices.find((i) => i.id === id);
    const bal = inv ? balanceFor(inv) : 0;
    setForm((f) => ({
      ...f,
      invoice_id: id,
      amount: bal > 0 ? bal.toFixed(2) : ''
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.invoice_id) return;
    setSubmitting(true);
    setError('');
    try {
      await api('erp5', '/api/payments', {
        method: 'POST',
        body: {
          invoice_id: form.invoice_id,
          amount: Number(form.amount),
          method: form.method,
          reference: form.reference || null,
          paid_on: form.paid_on || null
        }
      });
      setForm({
        invoice_id: '',
        amount: '',
        method: 'upi',
        reference: '',
        paid_on: form.paid_on
      });
      await load();
    } catch (e) {
      setError(e.message || 'Could not record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading payments...</p>;

  const selectedInv = invoices.find((i) => i.id === form.invoice_id);

  return (
    <div>
      <h2>Payments</h2>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <form
        onSubmit={submit}
        style={{
          border: '1px solid #ddd',
          padding: '1rem',
          borderRadius: 8,
          marginBottom: '1.5rem'
        }}
      >
        <h3>Record payment</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem'
          }}
        >
          <label>
            Invoice *
            <select
              required
              value={form.invoice_id}
              onChange={(e) => onSelectInvoice(e.target.value)}
            >
              <option value="">-- choose unpaid invoice --</option>
              {unpaidInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} — {inv.customer_name} — balance {money(balanceFor(inv))}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount *
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label>
            Method *
            <select
              required
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <label>
            Reference
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </label>
          <label>
            Paid on *
            <input
              type="date"
              required
              value={form.paid_on}
              onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
            />
          </label>
        </div>
        {selectedInv && (
          <p style={{ marginTop: '0.5rem' }}>
            Balance due: {money(balanceFor(selectedInv))}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{ marginTop: '0.75rem' }}
        >
          {submitting ? 'Saving...' : 'Record Payment'}
        </button>
      </form>

      <h3>All Payments</h3>
      {payments.length === 0 ? (
        <p>No payments recorded yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>ID</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Paid on</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{p.id}</td>
                <td>{p.invoice_id}</td>
                <td>{money(p.amount)}</td>
                <td><span className="badge">{p.method}</span></td>
                <td>{p.paid_on}</td>
                <td>{p.reference || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
