// [CRM2-A2] Ticket screens: one ticket's details, with a status dropdown and engineer dropdown that save.
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../api';
import {
  STATUSES,
  StatusBadge,
  PriorityBadge,
  SlaBadge,
  prettyLabel,
  loadEngineers,
  engineerName,
  formatDateTime,
  styles
} from './TicketsPage';

export default function TicketDetailPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [engineers, setEngineers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // [CRM2-A3] comments
  const [comments, setComments] = useState([]);
  const [commentsError, setCommentsError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  // Load the ticket, its comments, and the engineer list for the "Assigned to" dropdown
  useEffect(() => {
    setLoading(true);
    setError('');
    api('crm2', `/api/tickets/${id}`)
      .then(setTicket)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    api('crm2', `/api/tickets/${id}/comments`)
      .then(rows => setComments(Array.isArray(rows) ? rows : []))
      .catch(err => setCommentsError(err.message));
    loadEngineers().then(setEngineers);
  }, [id]);

  // [CRM2-A3] Add a comment; the server fills the author from the logged-in user
  async function addComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return setCommentsError('Please write a comment first.');
    setPosting(true);
    setCommentsError('');
    try {
      const created = await api('crm2', `/api/tickets/${id}/comments`, { method: 'POST', body: { text: newComment } });
      setComments(prev => [...prev, created]);
      setNewComment('');
    } catch (err) {
      setCommentsError(err.message);
    } finally {
      setPosting(false);
    }
  }

  // Status dropdown: saves straight away with PATCH /api/tickets/:id/status
  async function changeStatus(newStatus) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await api('crm2', `/api/tickets/${id}/status`, { method: 'PATCH', body: { status: newStatus } });
      setTicket(updated);
      setMessage(`Status changed to ${prettyLabel(newStatus)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Engineer dropdown: saves straight away with PUT /api/tickets/:id
  async function changeEngineer(engineerId) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const updated = await api('crm2', `/api/tickets/${id}`, { method: 'PUT', body: { assigned_to: engineerId } });
      setTicket(updated);
      setMessage(engineerId ? `Assigned to ${engineerName(engineers, engineerId)}.` : 'Engineer removed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const backLink = <Link to="/crm2/tickets">← Back to tickets</Link>;

  if (loading) return <p style={styles.muted}>Loading ticket…</p>;

  // Unknown ticket (404) or service down
  if (!ticket) {
    return (
      <div style={styles.page}>
        {backLink}
        <div style={{ ...styles.error, marginTop: '1rem' }}>{error || 'Ticket not found.'}</div>
      </div>
    );
  }

  // Label/value rows for the details card
  const details = [
    ['Customer', `${ticket.customer_name} (${ticket.customer_id})`],
    ['Serial number', ticket.serial_number || '—'],
    ['Priority', <PriorityBadge priority={ticket.priority} />],
    ['Created', formatDateTime(ticket.created_at)],
    ['Due', formatDateTime(ticket.due_at)],
    ['Resolved', formatDateTime(ticket.resolved_at)]
  ];

  return (
    <div style={styles.page}>
      {backLink}

      <div style={{ ...styles.header, marginTop: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2>{ticket.id}</h2>
            <StatusBadge status={ticket.status} />
            <SlaBadge ticket={ticket} />
          </div>
          <p style={{ fontSize: '1.05rem', marginTop: '0.25rem' }}>{ticket.subject}</p>
        </div>
      </div>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {/* Status and engineer: both save as soon as they change */}
      <div style={{ ...styles.card, display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '220px' }}>
          <label style={styles.label}>Status</label>
          <select value={ticket.status} disabled={saving} onChange={e => changeStatus(e.target.value)} style={styles.input}>
            {STATUSES.map(s => <option key={s} value={s}>{prettyLabel(s)}</option>)}
          </select>
        </div>
        <div style={{ minWidth: '260px' }}>
          <label style={styles.label}>Assigned to</label>
          <select value={ticket.assigned_to || ''} disabled={saving} onChange={e => changeEngineer(e.target.value)} style={styles.input}>
            <option value="">Unassigned</option>
            {engineers.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
            {/* Keep an engineer that is not in the list visible */}
            {ticket.assigned_to && !engineers.some(e => e.id === ticket.assigned_to) && (
              <option value={ticket.assigned_to}>{ticket.assigned_to}</option>
            )}
          </select>
        </div>
      </div>

      {/* Details */}
      <div style={styles.card}>
        <table style={{ margin: 0, boxShadow: 'none' }}>
          <tbody>
            {details.map(([label, value]) => (
              <tr key={label}>
                <th style={{ width: '180px', textTransform: 'none', fontSize: '0.85rem' }}>{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.card}>
        <h3 style={{ marginBottom: '0.5rem' }}>Description</h3>
        <p style={{ whiteSpace: 'pre-wrap', color: ticket.description ? '#0f172a' : '#64748b' }}>
          {ticket.description || 'No description.'}
        </p>
      </div>

      {/* [CRM2-A3] Comments */}
      <div style={styles.card}>
        <h3 style={{ marginBottom: '0.75rem' }}>Comments ({comments.length})</h3>
        {comments.length === 0 ? (
          <p style={styles.muted}>No comments yet.</p>
        ) : (
          comments.map(c => (
            <div key={c.id} style={{ borderBottom: '1px solid #e2e8f0', padding: '0.6rem 0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                <strong style={{ color: '#0f172a' }}>{c.author}</strong> · {formatDateTime(c.created_at)}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>{c.text}</p>
            </div>
          ))
        )}
        <form onSubmit={addComment} style={{ marginTop: '1rem' }}>
          {commentsError && <div style={styles.error}>{commentsError}</div>}
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Add a note for the team…"
            style={styles.input}
          />
          <button type="submit" className="btn" disabled={posting} style={{ marginTop: '0.5rem' }}>
            {posting ? 'Adding…' : 'Add comment'}
          </button>
        </form>
      </div>
    </div>
  );
}
