/**
 * Shared Frontend API helper (Section 3.2).
 * Every team's pages call api(team, path, options) instead of raw fetch.
 * Handles JWT token injection, {error} parsing, and 401 redirects.
 *
 * Examples:
 *   const leads = await api('crm1', '/api/leads?status=new');
 *   const created = await api('crm1', '/api/leads', { method: 'POST', body: { name: 'Acme' } });
 */
export async function api(team, path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchConfig = {
    method,
    headers
  };

  if (options.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    fetchConfig.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  // Uses Vite proxy prefix /svc/<team>
  const cleanTeam = team.toLowerCase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `/svc/${cleanTeam}${cleanPath}`;

  const response = await fetch(url, fetchConfig);

  let result;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const message = (result && result.error) ? result.error : `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  // Return the data portion if payload is standard { data: ... }
  return (result && result.data !== undefined) ? result.data : result;
}

export default api;
