import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';

// Allowed categories matching backend validation and database constraints
const CATEGORIES = [
  'TV',
  'Audio',
  'Mobile accessory',
  'Appliance',
  'Component'
];

/**
 * Format currency into Indian Rupees (INR) with 2 decimals.
 * Example: 42990 -> ₹42,990.00
 */
function formatCurrency(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'TV',
    brand: 'Electro',
    price: '',
    tax_rate: '18.00',
    reorder_level: '10',
    active: true
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  /**
   * Fetch products from ERP-1 service with optional search and category filters.
   */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      if (categoryFilter.trim()) {
        params.append('category', categoryFilter.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api('erp1', `/api/products${queryString}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      setProducts(list);
    } catch (err) {
      setError(err.message || 'Failed to load products from ERP-1');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  // Debounce search query changes slightly or fetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  /**
   * Open form in Add mode.
   */
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'TV',
      brand: 'Electro',
      price: '',
      tax_rate: '18.00',
      reorder_level: '10',
      active: true
    });
    setFormError('');
    setShowForm(true);
  };

  /**
   * Open form in Edit mode.
   */
  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      category: prod.category || 'TV',
      brand: prod.brand || 'Electro',
      price: prod.price !== undefined ? String(prod.price) : '',
      tax_rate: prod.tax_rate !== undefined ? String(prod.tax_rate) : '18.00',
      reorder_level: prod.reorder_level !== undefined ? String(prod.reorder_level) : '10',
      active: prod.active !== false
    });
    setFormError('');
    setShowForm(true);
  };

  /**
   * Close modal form.
   */
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormError('');
  };

  /**
   * Handle form input change.
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Validate and submit product form (Add or Edit).
   */
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    // Client-side validations
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setFormError('Product name is required.');
      return;
    }

    if (!formData.category || !CATEGORIES.includes(formData.category)) {
      setFormError(`Please select a valid category (${CATEGORIES.join(', ')}).`);
      return;
    }

    const numPrice = parseFloat(formData.price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormError('Price must be a positive number greater than ₹0.');
      return;
    }

    const numTax = parseFloat(formData.tax_rate);
    if (isNaN(numTax) || numTax < 0) {
      setFormError('Tax rate must be a non-negative number.');
      return;
    }

    const numReorder = parseInt(formData.reorder_level, 10);
    if (isNaN(numReorder) || numReorder < 0) {
      setFormError('Reorder level must be a non-negative integer.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: trimmedName,
        category: formData.category,
        brand: formData.brand.trim() || 'Electro',
        price: numPrice,
        tax_rate: numTax,
        reorder_level: numReorder,
        active: formData.active
      };

      if (editingProduct) {
        // Edit product: PUT /api/products/:id
        await api('erp1', `/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: payload
        });
        setFeedback(`Product "${trimmedName}" updated successfully.`);
      } else {
        // Add product: POST /api/products
        const created = await api('erp1', '/api/products', {
          method: 'POST',
          body: payload
        });
        const createdId = created?.id || created?.data?.id || 'New SKU';
        setFeedback(`Product "${trimmedName}" (${createdId}) added successfully.`);
      }

      handleCloseForm();
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving the product.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Toggle product active status (Deactivate / Activate).
   */
  const handleToggleActive = async (prod) => {
    const newStatus = !prod.active;
    const actionLabel = newStatus ? 'activate' : 'deactivate';

    try {
      setActionLoadingId(prod.id);
      setError('');
      setFeedback('');

      await api('erp1', `/api/products/${prod.id}`, {
        method: 'PUT',
        body: { active: newStatus }
      });

      setFeedback(`Product "${prod.name}" (${prod.id}) ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchProducts();
    } catch (err) {
      setError(err.message || `Failed to ${actionLabel} product.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * Export product catalog to CSV file and trigger browser download (ERP1-A3).
   */
  const handleExportCsv = () => {
    if (!products || products.length === 0) {
      setError('No products available to export.');
      return;
    }

    const headers = ['SKU', 'Name', 'Category', 'Brand', 'Price', 'Tax Rate', 'Reorder Level', 'Active'];
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = products.map(p => [
      escapeCsv(p.id),
      escapeCsv(p.name),
      escapeCsv(p.category),
      escapeCsv(p.brand || 'Electro'),
      escapeCsv(Number(p.price).toFixed(2)),
      escapeCsv(p.tax_rate ?? 18),
      escapeCsv(p.reorder_level ?? 10),
      escapeCsv(p.active !== false ? 'true' : 'false')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'products_catalog.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setFeedback(`Exported ${products.length} product(s) to products_catalog.csv`);
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Product Catalog</h2>
            <span className="badge badge-blue">SKU Master</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Manage electronics catalog, pricing in ₹, inventory reorder levels, and product availability.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              padding: '0.55rem 1.15rem',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <span>📥 Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.55rem 1.15rem',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {feedback && (
        <div style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          color: '#065f46',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>✓ {feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#065f46',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: 0
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && (
        <div style={{
          padding: '0.875rem 1.25rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠ {error}</span>
          <button
            type="button"
            onClick={fetchProducts}
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              color: '#991b1b',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
      }}>
        {/* Search input */}
        <div style={{ flex: '1 1 280px', minWidth: '220px' }}>
          <label htmlFor="search-input" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            Search Products
          </label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by SKU, product name, or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Category filter dropdown */}
        <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
          <label htmlFor="category-select" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
            Filter by Category
          </label>
          <select
            id="category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              outline: 'none'
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchQuery || categoryFilter) && (
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
              }}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          color: '#64748b'
        }}>
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>Loading product catalog...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
            No products found
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {searchQuery || categoryFilter
              ? 'No items matched your search query or category filter. Try clearing filters.'
              : 'The product catalog is currently empty. Add your first electronics SKU.'}
          </p>
          {searchQuery || categoryFilter ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
              }}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAdd}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              + Add Product
            </button>
          )}
        </div>
      )}

      {/* Products Table */}
      {!loading && products.length > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>SKU</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Brand</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Price (₹)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>GST</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Reorder Level</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr
                    key={prod.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: prod.active === false ? '#fafafa' : '#ffffff'
                    }}
                  >
                    {/* SKU ID */}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                      {prod.id}
                    </td>

                    {/* Name */}
                    <td style={{ padding: '0.75rem 1rem', color: prod.active === false ? '#94a3b8' : '#0f172a', fontWeight: 500, fontSize: '0.875rem' }}>
                      {prod.name}
                    </td>

                    {/* Category */}
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                      <span className="badge badge-blue">
                        {prod.category}
                      </span>
                    </td>

                    {/* Brand */}
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                      {prod.brand || 'Electro'}
                    </td>

                    {/* Price formatted in INR */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                      {formatCurrency(prod.price)}
                    </td>

                    {/* Tax Rate */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                      {prod.tax_rate !== undefined ? `${prod.tax_rate}%` : '18%'}
                    </td>

                    {/* Reorder Level */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>
                      {prod.reorder_level ?? 10}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {prod.active !== false ? (
                        <span className="badge badge-green">Active</span>
                      ) : (
                        <span className="badge badge-red">Inactive</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(prod)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#1e293b',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>

                        {/* Deactivate / Activate Button */}
                        <button
                          type="button"
                          disabled={actionLoadingId === prod.id}
                          onClick={() => handleToggleActive(prod)}
                          style={{
                            backgroundColor: prod.active !== false ? '#fee2e2' : '#dcfce7',
                            border: `1px solid ${prod.active !== false ? '#fecaca' : '#bbf7d0'}`,
                            color: prod.active !== false ? '#991b1b' : '#166534',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: actionLoadingId === prod.id ? 'not-allowed' : 'pointer',
                            opacity: actionLoadingId === prod.id ? 0.6 : 1
                          }}
                        >
                          {actionLoadingId === prod.id
                            ? '...'
                            : prod.active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Showing {products.length} product(s)</span>
            <span>Total Active: {products.filter(p => p.active !== false).length}</span>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal Form */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {editingProduct ? `Edit Product (${editingProduct.id})` : 'Add New Product'}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                  {editingProduct ? 'Update product specifications and pricing.' : 'Add a new electronics SKU to the catalog.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '1.25rem 1.5rem' }}>
              {formError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  marginBottom: '1rem'
                }}>
                  ⚠ {formError}
                </div>
              )}

              {/* Product Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. 55-inch 4K Smart TV"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Category & Brand row */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    placeholder="Electro"
                    value={formData.brand}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Price (INR) & Tax Rate */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 42990.00"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Must be greater than 0</span>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    GST Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    name="tax_rate"
                    step="0.01"
                    min="0"
                    placeholder="18.00"
                    value={formData.tax_rate}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Reorder Level & Active Checkbox */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Reorder Level (Units)
                  </label>
                  <input
                    type="number"
                    name="reorder_level"
                    step="1"
                    min="0"
                    placeholder="10"
                    value={formData.reorder_level}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ flex: 1, paddingTop: '1.25rem' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Active Product
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
