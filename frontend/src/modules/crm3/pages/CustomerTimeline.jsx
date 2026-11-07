import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../api';

// Shared Section 5 customers for fallback & quick selection
const SEED_CUSTOMERS = [
  { id: 'CUST-0001', name: 'Aarav Mehta', type: 'retail', city: 'Mumbai', email: 'aarav.mehta@example.com', phone: '9820112345' },
  { id: 'CUST-0002', name: 'Sunrise Electronics Pvt Ltd', type: 'corporate', city: 'Mumbai', email: 'purchase@sunrise.com', phone: '9820223456', gstin: '27AABCS1234F1Z5' },
  { id: 'CUST-0003', name: 'Priya Nair', type: 'retail', city: 'Kochi', email: 'priya.nair@example.com', phone: '9847134567' },
  { id: 'CUST-0004', name: 'BrightHome Retail LLP', type: 'dealer', city: 'Pune', email: 'contact@brighthome.com', phone: '9850145678', gstin: '27AAACB5678G1Z2' },
  { id: 'CUST-0005', name: 'Kiran Patel', type: 'retail', city: 'Ahmedabad', email: 'kiran.patel@example.com', phone: '9879156789' },
  { id: 'CUST-0006', name: 'Metro Offices Ltd', type: 'corporate', city: 'Delhi', email: 'admin@metrooffices.com', phone: '9811167890', gstin: '07AABCM9012K1Z8' },
  { id: 'CUST-0007', name: 'Sneha Iyer', type: 'retail', city: 'Chennai', email: 'sneha.iyer@example.com', phone: '9840178901' },
  { id: 'CUST-0008', name: 'Gadget Hub', type: 'dealer', city: 'Bengaluru', email: 'sales@gadgethub.com', phone: '9845189012', gstin: '29AABCG3456L1Z4' },
  { id: 'CUST-0009', name: 'Aarav Mehta (Branch)', type: 'retail', city: 'Mumbai', email: 'aarav.alt@example.com', phone: '9820112345' },
  { id: 'CUST-0010', name: 'Sunrise Electronics Mumbai Branch', type: 'corporate', city: 'Mumbai', email: 'purchase@sunrise.com', phone: '9820998877', gstin: '27AABCS1234F1Z5' }
];

const SEED_CUSTOMER_MAP = SEED_CUSTOMERS.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

// Interaction visual configuration per event type
const TYPE_CONFIG = {
  order: { icon: '📦', label: 'Order', badgeClass: 'badge-green', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  ticket: { icon: '🎫', label: 'Ticket', badgeClass: 'badge-red', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  call: { icon: '📞', label: 'Call', badgeClass: 'badge-blue', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  email: { icon: '✉️', label: 'Email', badgeClass: 'badge-amber', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  meeting: { icon: '👥', label: 'Meeting', badgeClass: 'badge-blue', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  note: { icon: '📝', label: 'Note', badgeClass: 'badge-blue', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' }
};

export default function CustomerTimeline() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Active customer ID: from URL parameter or default to CUST-0001
  const [selectedCustomerId, setSelectedCustomerId] = useState(id || 'CUST-0001');

  useEffect(() => {
    if (id && id !== selectedCustomerId) {
      setSelectedCustomerId(id);
    }
  }, [id, selectedCustomerId]);

  const [customer, setCustomer] = useState(SEED_CUSTOMER_MAP[selectedCustomerId] || null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states: Type Filter Dropdown & Date Range Filter (CRM3-B3 requirement)
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Add Note Form State (CRM3-B2 requirement)
  const [noteSummary, setNoteSummary] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Fetch customer details and interactions
  const fetchTimeline = useCallback(async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    setError('');

    // 1. Fetch customer info
    try {
      const custData = await api('crm3', `/api/customers/${selectedCustomerId}`);
      if (custData && custData.id) {
        setCustomer(custData);
      } else {
        setCustomer(SEED_CUSTOMER_MAP[selectedCustomerId] || { id: selectedCustomerId, name: selectedCustomerId });
      }
    } catch (cErr) {
      setCustomer(SEED_CUSTOMER_MAP[selectedCustomerId] || { id: selectedCustomerId, name: selectedCustomerId });
    }

    // 2. Fetch timeline interactions with type & date range filters
    try {
      const queryParams = new URLSearchParams();
      if (typeFilter) queryParams.append('type', typeFilter);
      if (fromDate) queryParams.append('from', fromDate);
      if (toDate) queryParams.append('to', toDate);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const data = await api('crm3', `/api/customers/${selectedCustomerId}/interactions${qs}`);

      const items = Array.isArray(data) ? data : [];
      // Ensure sorted newest first
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setInteractions(items);
    } catch (err) {
      setError(err.message || 'Failed to load timeline events from backend.');
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId, typeFilter, fromDate, toDate]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Handle switching customer
  const handleCustomerChange = (newCustId) => {
    setSelectedCustomerId(newCustId);
    if (id) {
      navigate(`/crm3/customers/${newCustId}/timeline`);
    }
  };

  // Handle adding a new note/event manually
  const handleAddNote = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanSummary = noteSummary.trim();
    if (!cleanSummary) {
      setFormError('Please enter a note or event summary.');
      return;
    }

    setNoteSubmitting(true);

    const tempId = `INT-${Date.now().toString().slice(-4)}`;
    const optimisticNote = {
      id: tempId,
      customer_id: selectedCustomerId,
      type: noteType,
      summary: cleanSummary,
      source_team: 'CRM-3',
      created_by: 'EMP-0001',
      created_at: new Date().toISOString()
    };

    // Show immediately at top of list (newest first)
    setInteractions(prev => [optimisticNote, ...prev]);
    setNoteSummary('');
    setSuccessBanner('New event note recorded and added to timeline.');
    setTimeout(() => setSuccessBanner(''), 4000);

    try {
      const saved = await api('crm3', '/api/interactions', {
        method: 'POST',
        body: {
          customer_id: selectedCustomerId,
          type: noteType,
          summary: cleanSummary,
          source_team: 'CRM-3',
          created_by: 'EMP-0001'
        }
      });

      if (saved && saved.id) {
        setInteractions(prev =>
          prev.map(item => (item.id === tempId ? { ...item, id: saved.id, created_at: saved.created_at || item.created_at } : item))
        );
      }
    } catch (err) {
      console.warn('[CRM3 Timeline] Note creation failed on backend:', err.message);
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setTypeFilter('');
    setFromDate('');
    setToDate('');
  };

  // Helper to format date strings
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  const hasActiveFilters = Boolean(typeFilter || fromDate || toDate);

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
        <Link to="/crm3" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
          ← Customer Directory
        </Link>
        {customer && (
          <>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ color: '#64748b' }}>
              {customer.name} ({customer.id})
            </span>
          </>
        )}
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>Unified Timeline</span>
      </div>

      {/* Customer Header & Customer Selector Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
              {customer?.name || 'Customer Timeline'}
            </h1>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
              {selectedCustomerId}
            </span>
            {customer?.type && (
              <span className={`badge ${customer.type === 'corporate' ? 'badge-amber' : customer.type === 'dealer' ? 'badge-green' : 'badge-blue'}`}>
                {customer.type}
              </span>
            )}
            <span className="badge badge-blue">Step 3: Customer 360</span>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.35rem', color: '#64748b', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            {customer?.city && <span>📍 {customer.city}</span>}
            {customer?.phone && <span>📞 {customer.phone}</span>}
            {customer?.email && <span>✉️ {customer.email}</span>}
            {customer?.gstin && <span style={{ fontFamily: 'monospace' }}>GST: {customer.gstin}</span>}
          </div>
        </div>

        {/* Customer Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Customer:</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              background: '#ffffff',
              color: '#0f172a'
            }}
          >
            {SEED_CUSTOMERS.map(c => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications */}
      {successBanner && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          ✓ {successBanner}
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          ✕ {error}
        </div>
      )}

      {/* Top "Add Note / Interaction" Form (CRM3-B2 requirement) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
            ➕ Add Timeline Note or Interaction
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Posts to <code>/api/interactions</code> · Source: CRM-3
          </span>
        </div>

        <form onSubmit={handleAddNote}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div style={{ minWidth: '150px' }}>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  background: '#ffffff'
                }}
              >
                <option value="note">📝 Note</option>
                <option value="call">📞 Phone Call</option>
                <option value="email">✉️ Email</option>
                <option value="meeting">👥 Meeting</option>
                <option value="ticket">🎫 Support Ticket</option>
                <option value="order">📦 Order Update</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Enter summary (e.g., 'Discussed renewal terms for corporate contract')..."
                value={noteSummary}
                onChange={(e) => {
                  setNoteSummary(e.target.value);
                  if (formError) setFormError('');
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: formError ? '1px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.875rem'
                }}
              />
              {formError && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  {formError}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={noteSubmitting}
              className="btn"
              style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
            >
              {noteSubmitting ? 'Adding...' : '+ Add Note'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Toolbar: Type Filter Dropdown & Date Range Filter (CRM3-B3 requirement) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Filters Form */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Type Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  background: '#ffffff',
                  color: '#0f172a'
                }}
              >
                <option value="">All Types</option>
                <option value="order">📦 Orders (order)</option>
                <option value="ticket">🎫 Tickets (ticket)</option>
                <option value="call">📞 Calls (call)</option>
                <option value="email">✉️ Emails (email)</option>
                <option value="meeting">👥 Meetings (meeting)</option>
                <option value="note">📝 Notes (note)</option>
              </select>
            </div>

            {/* Date Range: From */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a'
                }}
              />
            </div>

            {/* Date Range: To */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a'
                }}
              />
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Refresh & Event Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              <strong>{interactions.length}</strong> event{interactions.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={fetchTimeline}
              disabled={loading}
              style={{
                background: '#f8fafc',
                color: '#2563eb',
                border: '1px solid #cbd5e1',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Refresh timeline to check for events posted by external teams"
            >
              🔄 {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
            <span>Active Filters:</span>
            {typeFilter && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                Type: {typeFilter}
              </span>
            )}
            {fromDate && (
              <span style={{ background: '#f8fafc', color: '#334155', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                From: {fromDate}
              </span>
            )}
            {toDate && (
              <span style={{ background: '#f8fafc', color: '#334155', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                To: {toDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cross-Team Integration Info Card */}
      <div style={{
        background: '#f8fafc',
        border: '1px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.8rem',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div>
          <strong>Unified Timeline Endpoint:</strong> <code>POST /api/interactions/from-event</code>
          <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>
            (Called by CRM1-C3, CRM2-A1, CRM2-C3, CRM4-A3, ERP4-C3)
          </span>
        </div>
        <span className="badge badge-green">Exact duplicates in same minute ignored</span>
      </div>

      {/* Vertical Timeline Event Stream */}
      {loading && interactions.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
          Loading timeline events...
        </div>
      ) : interactions.length === 0 ? (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '3rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
            No timeline events found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto' }}>
            {hasActiveFilters
              ? 'No interactions match the selected type and date range filters. Try resetting the filters.'
              : 'No interactions or events have been recorded for this customer yet. Use the form above or call POST /api/interactions/from-event to record an event.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                marginTop: '1rem',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '2rem', marginTop: '1rem' }}>
          {/* Vertical Timeline Guide Line */}
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '12px',
            bottom: '12px',
            width: '2px',
            backgroundColor: '#e2e8f0'
          }} />

          {/* Timeline Event Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {interactions.map((event, idx) => {
              const normalizedType = (event.type || 'note').toLowerCase();
              const cfg = TYPE_CONFIG[normalizedType] || TYPE_CONFIG.note;
              const sourceTeamUpper = (event.source_team || 'CRM-3').toUpperCase();

              return (
                <div key={event.id || idx} style={{ position: 'relative' }}>
                  {/* Timeline Bullet Node */}
                  <div style={{
                    position: 'absolute',
                    left: '-2rem',
                    top: '12px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: cfg.bg,
                    border: `2px solid ${cfg.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    zIndex: 2
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Event Content Card */}
                  <div style={{
                    marginLeft: '0.75rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s ease'
                  }}>
                    {/* Header Row: Type, Date, ID */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${cfg.badgeClass}`} style={{ textTransform: 'capitalize' }}>
                          {cfg.icon} {event.type}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {event.id}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        ⏱️ {formatDate(event.created_at)}
                      </div>
                    </div>

                    {/* Summary Description */}
                    <p style={{ color: '#0f172a', fontSize: '0.925rem', lineHeight: '1.5', margin: '0.25rem 0 0.75rem 0' }}>
                      {event.summary}
                    </p>

                    {/* Footer Row: Source Team & Author Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #f8fafc', paddingTop: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Origin:</span>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#0f172a',
                          fontWeight: 600,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1'
                        }}>
                          {sourceTeamUpper}
                        </span>
                      </div>

                      {event.created_by && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>Logged by:</span>
                          <span style={{ color: '#334155', fontWeight: 500 }}>
                            {event.created_by}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
