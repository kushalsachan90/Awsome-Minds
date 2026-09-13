const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

async function request(path, options = {}) {
  if (!API_URL) throw new Error('API URL is not configured. Add VITE_API_URL to .env.');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}

export const getIncidents = async () => {
  const result = await request('/incidents');
  return Array.isArray(result.incidents) ? result.incidents : [];
};

export const approveIncident = (incidentId) =>
  request(`/incidents/${encodeURIComponent(incidentId)}/approve`, { method: 'POST' });

export const rejectIncident = (incidentId) =>
  request(`/incidents/${encodeURIComponent(incidentId)}/reject`, { method: 'POST' });
