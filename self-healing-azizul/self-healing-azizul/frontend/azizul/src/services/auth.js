const env = import.meta.env;
const configured = Boolean(env.VITE_COGNITO_DOMAIN && env.VITE_COGNITO_CLIENT_ID && env.VITE_COGNITO_REDIRECT_URI);
const key = 'self-healing.session';
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
const domain = () => `https://${env.VITE_COGNITO_DOMAIN.replace(/^https:\/\//, '').replace(/\/$/, '')}`;

export const isAuthConfigured = () => configured;
export const getSession = () => JSON.parse(sessionStorage.getItem(key) || 'null');
export const getAccessToken = () => getSession()?.accessToken || '';
export const signOut = () => { sessionStorage.removeItem(key); if (configured) location.assign(`${domain()}/logout?client_id=${encodeURIComponent(env.VITE_COGNITO_CLIENT_ID)}&logout_uri=${encodeURIComponent(env.VITE_COGNITO_LOGOUT_URI || env.VITE_COGNITO_REDIRECT_URI)}`); };

export async function signIn() {
  if (!configured) throw new Error('Cognito is not configured. Add the public VITE_COGNITO values.');
  const verifier = random(); const state = random();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  sessionStorage.setItem('self-healing.pkce', JSON.stringify({ verifier, state }));
  const url = new URL(`${domain()}/login`);
  url.search = new URLSearchParams({ response_type: 'code', client_id: env.VITE_COGNITO_CLIENT_ID, redirect_uri: env.VITE_COGNITO_REDIRECT_URI, scope: 'openid email profile', state, code_challenge_method: 'S256', code_challenge: b64url(new Uint8Array(digest)) });
  location.assign(url);
}

export async function completeSignIn() {
  const params = new URLSearchParams(location.search); const code = params.get('code');
  if (!code) return null;
  const pending = JSON.parse(sessionStorage.getItem('self-healing.pkce') || 'null');
  if (!pending || pending.state !== params.get('state')) throw new Error('Invalid sign-in state. Please sign in again.');
  const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: env.VITE_COGNITO_CLIENT_ID, code, redirect_uri: env.VITE_COGNITO_REDIRECT_URI, code_verifier: pending.verifier });
  const response = await fetch(`${domain()}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const tokens = await response.json(); if (!response.ok) throw new Error(tokens.error_description || 'Cognito sign-in failed.');
  const payload = JSON.parse(atob(tokens.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  const session = { accessToken: tokens.access_token, email: payload.email || payload['cognito:username'] || 'Operator', expiresAt: Date.now() + tokens.expires_in * 1000 };
  sessionStorage.setItem(key, JSON.stringify(session)); sessionStorage.removeItem('self-healing.pkce'); history.replaceState({}, document.title, location.pathname); return session;
}
