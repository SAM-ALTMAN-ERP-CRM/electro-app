import React from 'react';

// Maps each serial status to its badge color class from index.css
const STATUS_BADGE_MAP = {
  in_stock: { className: 'badge badge-green', label: 'in_stock' },
  reserved: { className: 'badge badge-amber', label: 'reserved' },
  sold: { className: 'badge badge-red', label: 'sold' },
  returned: { className: 'badge badge-blue', label: 'returned' }
};

export default function SerialStatusBadge({ status }) {
  const config = STATUS_BADGE_MAP[status] || {
    className: 'badge',
    label: status || 'unknown'
  };

  return <span className={config.className}>{config.label}</span>;
}

