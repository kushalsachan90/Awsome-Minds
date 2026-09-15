import { getAccessToken } from './auth.js';
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
async function request(path, options = {}) {
  if (!base) throw new Error('API URL is not configured.');
  const response = await fetch(`${base}${path}`, { ...options, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}`, ...options.headers } });
  const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`); return body;
}
export const getIncidents = () => request('/incidents');
export const approveIncident = (id) => request(`/incidents/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' });
export const rejectIncident = (id, reason) => request(`/incidents/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
export const askQuestion = (question) => request('/ask', { method: 'POST', body: JSON.stringify({ question }) });
