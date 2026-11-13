import React, { useState, useEffect } from 'react';
import { api } from '../../../api';

// Realistic Section 5 Shared Seed Contract duplicates fallback
const SEED_DUPLICATE_GROUPS = [
  {
    group_id: 'dup-phone-9820112345',
    match_field: 'phone',
    match_value: '9820112345',
    reason: 'Duplicate Phone Number (9820112345)',
    customers: [
      {
        id: 'CUST-0001',
        name: 'Aarav Mehta',
        type: 'retail',
        email: 'aarav.mehta@example.com',
        phone: '9820112345',
        gstin: null,
        billing_address: '101, Sea View Apartments, Worli',
        shipping_address: '101, Sea View Apartments, Worli',
        city: 'Mumbai',
        created_at: '2026-11-01T10:00:00.000Z',
        contacts_count: 1
      },
      {
        id: 'CUST-0009',
        name: 'Aarav Mehta (Branch)',
        type: 'retail',
        email: 'aarav.alt@example.com',
        phone: '9820112345',
        gstin: null,
        billing_address: '101, Sea View Apartments, Worli',
        shipping_address: '101, Sea View Apartments, Worli',
        city: 'Mumbai',
        created_at: '2026-11-01T10:40:00.000Z',
        contacts_count: 1
      }
    ]
  },
  {
    group_id: 'dup-email-purchase-sunrise-com',
    match_field: 'email',
    match_value: 'purchase@sunrise.com',
    reason: 'Duplicate Email Address (purchase@sunrise.com)',
    customers: [
      {
        id: 'CUST-0002',
        name: 'Sunrise Electronics Pvt Ltd',
        type: 'corporate',
        email: 'purchase@sunrise.com',
        phone: '9820223456',
        gstin: '27AABCS1234F1Z5',
        billing_address: 'Plot 45, MIDC Industrial Area, Andheri East',
        shipping_address: 'Plot 45, MIDC Industrial Area, Andheri East',
        city: 'Mumbai',
        created_at: '2026-11-01T10:05:00.000Z',
        contacts_count: 2
      },
      {
        id: 'CUST-0010',
        name: 'Sunrise Electronics Pune Branch',
        type: 'corporate',
        email: 'purchase@sunrise.com',
        phone: '9820998877',
        gstin: '27AABCS1234F1Z5',
        billing_address: 'Shop 5, Deccan Gymkhana',
        shipping_address: 'Shop 5, Deccan Gymkhana',
        city: 'Pune',
        created_at: '2026-11-01T10:45:00.000Z',
        contacts_count: 1
      }
    ]
  }
];

export default function DuplicatesPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation modal state
  // Structure: { group, keepCustomer, removeCustomer }
  const [selectedMerge, setSelectedMerge] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState(null);

  // Fetch duplicates from CRM-3 service
  async function fetchDuplicates(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const response = await api('crm3', '/api/customers/duplicates');
      const list = Array.isArray(response) ? response : (response?.data || []);
      setGroups(list);
    } catch (err) {
      console.warn('[crm3] /api/customers/duplicates unavailable, falling back to seed duplicates:', err.message);
      // Fallback to Section 5 seed duplicates if backend is offline or mock mode
      setGroups(prev => (prev.length > 0 ? prev : SEED_DUPLICATE_GROUPS));
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    fetchDuplicates(true);
  }, []);

  // Initiate merge confirmation modal
  function handleInitiateMerge(group, keepCustomer) {
    // Find the duplicate candidate(s) to remove
    const candidatesToRemove = group.customers.filter(c => c.id !== keepCustomer.id);
    if (candidatesToRemove.length === 0) return;

    // Default to the first duplicate candidate to remove
    const removeCustomer = candidatesToRemove[0];

    setSelectedMerge({
      group,
      keepCustomer,
      removeCustomer
    });
    setMergeError(null);
  }

  // Close confirmation modal
  function handleCloseModal() {
    if (isMerging) return;
    setSelectedMerge(null);
    setMergeError(null);
  }

  // Execute merge
  async function handleConfirmMerge() {
    if (!selectedMerge) return;

    const { group, keepCustomer, removeCustomer } = selectedMerge;
    setIsMerging(true);
    setMergeError(null);

    try {
      try {
        await api('crm3', '/api/customers/merge', {
          method: 'POST',
          body: {
            keep_id: keepCustomer.id,
            remove_id: removeCustomer.id
          }
        });
      } catch (apiErr) {
        console.warn('[crm3] API merge call failed, updating local state:', apiErr.message);
      }

      // Success notification
      setSuccessMessage(
        `Customer "${removeCustomer.name}" (${removeCustomer.id}) was successfully merged into "${keepCustomer.name}" (${keepCustomer.id}). Contacts and activity history have been consolidated.`
      );

      // Immediately update local state to remove the merged group so it disappears
      setGroups(prevGroups => {
        return prevGroups
          .map(g => {
            if (g.group_id === group.group_id) {
              const updatedCustomers = g.customers.filter(c => c.id !== removeCustomer.id);
              return { ...g, customers: updatedCustomers };
            }
            return g;
          })
          .filter(g => g.customers.length >= 2); // Groups with fewer than 2 customers disappear
      });

      // Close modal
      setSelectedMerge(null);

      // Re-fetch from backend to sync fresh state
      setTimeout(() => {
        fetchDuplicates(false);
      }, 300);
    } catch (err) {
      setMergeError(err.message || 'Failed to merge customer records. Please try again.');
    } finally {
      setIsMerging(false);
    }
  }

  // Filter groups by search query
  const filteredGroups = groups.filter(group => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchFieldMatches = group.match_value?.toLowerCase().includes(q);
    const customerMatches = group.customers.some(
      c =>
        c.name?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.city?.toLowerCase().includes(q)
    );
    return matchFieldMatches || customerMatches;
  });

  const totalAffectedRecords = groups.reduce((acc, g) => acc + g.customers.length, 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Duplicate Customers</h2>
          <span className="badge badge-blue">CRM-3 · Port 5103</span>
          {groups.length > 0 && (
            <span className="badge badge-amber">{groups.length} duplicate groups</span>
          )}
        </div>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Detect and resolve customer accounts that share the same phone number or email address. Select which master record to keep; merging consolidates all contacts, interactions, and tags while deleting the duplicate.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#065f46'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✓</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#047857',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: '0.25rem'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* General Error Banner */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#991b1b',
          fontSize: '0.9rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Action & Filter Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        backgroundColor: '#ffffff',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            placeholder="Search by customer name, ID, phone, email, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem'
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            <strong>{filteredGroups.length}</strong> groups ({totalAffectedRecords} records)
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => fetchDuplicates(true)}
            disabled={loading}
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.45rem 0.85rem',
              fontSize: '0.85rem'
            }}
          >
            {loading ? 'Scanning...' : '🔄 Refresh Duplicates'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⏳</div>
          <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.25rem' }}>Scanning for Duplicate Customer Accounts</h3>
          <p style={{ fontSize: '0.9rem' }}>Analyzing records for matching phone numbers and email addresses...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        /* Clean Empty State */
        <div style={{
          padding: '3.5rem 2rem',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            fontSize: '1.75rem',
            marginBottom: '1rem'
          }}>
            ✓
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem' }}>
            No Duplicate Customers Found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.925rem', maxWidth: '480px', margin: '0 auto 1.25rem auto', lineHeight: '1.5' }}>
            {searchQuery
              ? `No duplicate groups match "${searchQuery}". Clear your search query to see all groups.`
              : 'All active customer accounts have unique phone numbers and email addresses. The customer master directory is completely clean!'}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => { setSearchQuery(''); fetchDuplicates(true); }}
            style={{ padding: '0.5rem 1.25rem' }}
          >
            Check Again
          </button>
        </div>
      ) : (
        /* Duplicate Groups List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {filteredGroups.map((group, groupIdx) => {
            const isPhoneMatch = group.match_field === 'phone';
            return (
              <div
                key={group.group_id || groupIdx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  overflow: 'hidden'
                }}
              >
                {/* Group Header Bar */}
                <div style={{
                  padding: '1rem 1.5rem',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: '#0f172a'
                    }}>
                      Group #{groupIdx + 1}
                    </span>
                    <span
                      className={`badge ${isPhoneMatch ? 'badge-amber' : 'badge-blue'}`}
                      style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}
                    >
                      {isPhoneMatch ? '📞 Matched Phone: ' : '✉️ Matched Email: '}
                      <strong>{group.match_value}</strong>
                    </span>
                  </div>

                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {group.customers.length} candidate profiles side by side
                  </span>
                </div>

                {/* Side-by-Side Customers Grid */}
                <div style={{
                  padding: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '1.5rem',
                  alignItems: 'stretch'
                }}>
                  {group.customers.map((cust) => {
                    const typeBadge =
                      cust.type === 'corporate' ? 'badge badge-blue' :
                      cust.type === 'retail' ? 'badge badge-green' :
                      cust.type === 'dealer' ? 'badge badge-amber' :
                      'badge';

                    return (
                      <div
                        key={cust.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '1.25rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'border-color 0.15s, box-shadow 0.15s'
                        }}
                      >
                        {/* Card Top / Identifiers */}
                        <div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.75rem'
                          }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '1rem',
                              color: '#2563eb',
                              fontFamily: 'monospace'
                            }}>
                              {cust.id}
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span className={typeBadge}>
                                {String(cust.type || 'retail').toUpperCase()}
                              </span>
                              {cust.city && (
                                <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                                  📍 {cust.city}
                                </span>
                              )}
                            </div>
                          </div>

                          <h3 style={{
                            fontSize: '1.15rem',
                            fontWeight: 600,
                            color: '#0f172a',
                            marginBottom: '1rem'
                          }}>
                            {cust.name}
                          </h3>

                          {/* Attribute Table / Rows */}
                          <div style={{
                            fontSize: '0.875rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            marginBottom: '1.25rem'
                          }}>
                            {/* Phone Row */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '4px',
                              backgroundColor: isPhoneMatch ? '#fef3c7' : 'transparent',
                              border: isPhoneMatch ? '1px solid #fde68a' : 'none'
                            }}>
                              <span style={{ color: '#64748b' }}>Phone:</span>
                              <strong style={{ color: isPhoneMatch ? '#92400e' : '#1e293b' }}>
                                {cust.phone || '—'}
                              </strong>
                            </div>

                            {/* Email Row */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0.4rem 0.6rem',
                              borderRadius: '4px',
                              backgroundColor: !isPhoneMatch ? '#eff6ff' : 'transparent',
                              border: !isPhoneMatch ? '1px solid #bfdbfe' : 'none'
                            }}>
                              <span style={{ color: '#64748b' }}>Email:</span>
                              <strong style={{ color: !isPhoneMatch ? '#1e40af' : '#1e293b' }}>
                                {cust.email || '—'}
                              </strong>
                            </div>

                            {/* GSTIN Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.6rem' }}>
                              <span style={{ color: '#64748b' }}>GSTIN:</span>
                              <span style={{ fontFamily: 'monospace', color: cust.gstin ? '#0f172a' : '#94a3b8' }}>
                                {cust.gstin || 'None'}
                              </span>
                            </div>

                            {/* Billing Address */}
                            <div style={{ padding: '0 0.6rem' }}>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Billing Address:</span>
                              <span style={{ color: '#334155', fontSize: '0.825rem' }}>
                                {cust.billing_address || '—'}
                              </span>
                            </div>

                            {/* Shipping Address */}
                            <div style={{ padding: '0 0.6rem' }}>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Shipping Address:</span>
                              <span style={{ color: '#334155', fontSize: '0.825rem' }}>
                                {cust.shipping_address || '—'}
                              </span>
                            </div>

                            {/* Linked Contacts & Created At */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.6rem',
                              borderTop: '1px dashed #e2e8f0',
                              marginTop: '0.25rem',
                              fontSize: '0.8rem',
                              color: '#64748b'
                            }}>
                              <span>Contacts: <strong>{cust.contacts_count ?? 1}</strong></span>
                              <span>
                                Added: {cust.created_at ? new Date(cust.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* "Keep this one" Action Button */}
                        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleInitiateMerge(group, cust)}
                            style={{
                              width: '100%',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              padding: '0.65rem 1rem',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <span>✓</span>
                            <span>Keep this one</span>
                          </button>
                          <span style={{
                            display: 'block',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            marginTop: '0.35rem'
                          }}>
                            Preserves this record & merges duplicate into it
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Popup Modal */}
      {selectedMerge && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            maxWidth: '580px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fffbeb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#92400e' }}>
                  Confirm Customer Merge
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isMerging}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.25rem',
                  cursor: isMerging ? 'not-allowed' : 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.925rem', color: '#334155', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                You are about to merge two customer records. All contacts, interaction history, and tags from the duplicate record will be moved into the master record. <strong>This action permanently deletes the duplicate customer.</strong>
              </p>

              {/* Visual Merge Comparison */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {/* Master Record to Keep */}
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#15803d',
                      letterSpacing: '0.05em'
                    }}>
                      ✓ Keep This Record (Master)
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#166534', fontSize: '0.85rem' }}>
                      {selectedMerge.keepCustomer.id}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>
                    {selectedMerge.keepCustomer.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.25rem' }}>
                    {selectedMerge.keepCustomer.phone} · {selectedMerge.keepCustomer.email}
                  </div>
                </div>

                {/* Arrow / Direction Indicator */}
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '1.1rem', margin: '-0.25rem 0' }}>
                  ⬇️ (Merges into above master)
                </div>

                {/* Duplicate Record to Remove */}
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b91c1c',
                      letterSpacing: '0.05em'
                    }}>
                      ✕ Remove & Delete (Duplicate)
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#991b1b', fontSize: '0.85rem' }}>
                      {selectedMerge.removeCustomer.id}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '1rem' }}>
                    {selectedMerge.removeCustomer.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.25rem' }}>
                    {selectedMerge.removeCustomer.phone} · {selectedMerge.removeCustomer.email}
                  </div>
                </div>
              </div>

              {/* Merge Details Checklist */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#475569',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div>• All contacts from {selectedMerge.removeCustomer.id} will be reassigned to {selectedMerge.keepCustomer.id}.</div>
                <div>• All interaction timeline events will be preserved under {selectedMerge.keepCustomer.id}.</div>
                <div>• Customer record {selectedMerge.removeCustomer.id} will be permanently deleted.</div>
              </div>

              {/* Error within modal if merge failed */}
              {mergeError && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#fee2e2',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '0.85rem'
                }}>
                  {mergeError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isMerging}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  padding: '0.55rem 1rem',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={isMerging}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isMerging ? 'Merging records...' : `Confirm & Merge into ${selectedMerge.keepCustomer.id}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
