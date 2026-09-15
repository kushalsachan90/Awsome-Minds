
const env = import.meta.env;

const configured = Boolean(
  env.VITE_COGNITO_DOMAIN &&
    env.VITE_COGNITO_CLIENT_ID &&
    env.VITE_COGNITO_REDIRECT_URI
);

const key = 'self-healing.session';
const pkceKey = 'self-healing.pkce';

const b64url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const random = () =>
  b64url(crypto.getRandomValues(new Uint8Array(32)));

const domain = () =>
  `https://${env.VITE_COGNITO_DOMAIN
    .replace(/^https:\/\//, '')
    .replace(/\/$/, '')}`;

export const isAuthConfigured = () => configured;

export const getSession = () =>
  JSON.parse(sessionStorage.getItem(key) || 'null');

export const getAccessToken = () =>
  getSession()?.accessToken || '';

export const signOut = () => {
  sessionStorage.removeItem(key);
  sessionStorage.removeItem(pkceKey);

  if (configured) {
    location.assign(
      `${domain()}/logout?client_id=${encodeURIComponent(
        env.VITE_COGNITO_CLIENT_ID
      )}&logout_uri=${encodeURIComponent(
        env.VITE_COGNITO_LOGOUT_URI || env.VITE_COGNITO_REDIRECT_URI
      )}`
    );
  }
};

export async function signIn() {
  if (!configured) {
    throw new Error(
      'Cognito is not configured. Add the public VITE_COGNITO values.'
    );
  }

  const verifier = random();
  const state = random();

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  );

  const codeChallenge = b64url(new Uint8Array(digest));

  // Save PKCE information BEFORE leaving localhost.
  sessionStorage.setItem(
    pkceKey,
    JSON.stringify({
      verifier,
      state
    })
  );

  const url = new URL(`${domain()}/oauth2/authorize`);

  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: env.VITE_COGNITO_CLIENT_ID,
    redirect_uri: env.VITE_COGNITO_REDIRECT_URI,
    scope: 'openid email profile',
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  }).toString();

  location.assign(url.toString());
}

export async function completeSignIn() {
  const params = new URLSearchParams(location.search);

  const code = params.get('code');
  const callbackState = params.get('state');
  const error = params.get('error');
  const errorDescription = params.get('error_description');

  // Cognito returned an OAuth error.
  if (error) {
    throw new Error(
      errorDescription
        ? `${error}: ${errorDescription}`
        : `Cognito sign-in failed: ${error}`
    );
  }

  // Normal page load — user hasn't returned from Cognito.
  if (!code) {
    return null;
  }

  // Get the PKCE information created before redirecting to Cognito.
  const stored = sessionStorage.getItem(pkceKey);

  if (!stored) {
    throw new Error(
      'Sign-in session was lost. Please click Sign in with Cognito again.'
    );
  }

  let pending;

  try {
    pending = JSON.parse(stored);
  } catch {
    sessionStorage.removeItem(pkceKey);

    throw new Error(
      'Invalid sign-in session. Please click Sign in with Cognito again.'
    );
  }

  // OAuth state must match exactly.
  if (!callbackState) {
    throw new Error(
      'Cognito did not return a sign-in state. Please try again.'
    );
  }

  if (!pending.state) {
    throw new Error(
      'Saved sign-in state is missing. Please try again.'
    );
  }

  if (pending.state !== callbackState) {
    console.error('Cognito state mismatch', {
      savedState: pending.state,
      callbackState
    });

    sessionStorage.removeItem(pkceKey);

    throw new Error(
      'Invalid sign-in state. Please click Sign in with Cognito again.'
    );
  }

  // Exchange authorization code for tokens.
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.VITE_COGNITO_CLIENT_ID,
    code,
    redirect_uri: env.VITE_COGNITO_REDIRECT_URI,
    code_verifier: pending.verifier
  });

  const response = await fetch(`${domain()}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const tokens = await response.json();

  if (!response.ok) {
    sessionStorage.removeItem(pkceKey);

    throw new Error(
      tokens.error_description || 'Cognito sign-in failed.'
    );
  }

  if (!tokens.id_token || !tokens.access_token) {
    sessionStorage.removeItem(pkceKey);

    throw new Error('Cognito did not return the required tokens.');
  }

  // Decode ID token payload.
  const payload = JSON.parse(
    atob(
      tokens.id_token
        .split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/')
    )
  );

  const session = {
    accessToken: tokens.access_token,
    email:
      payload.email ||
      payload['cognito:username'] ||
      'Operator',
    expiresAt: Date.now() + tokens.expires_in * 1000
  };

  sessionStorage.setItem(key, JSON.stringify(session));

  // PKCE data is no longer needed after successful token exchange.
  sessionStorage.removeItem(pkceKey);

  // Remove ?code=...&state=... from browser URL.
  history.replaceState({}, document.title, location.pathname);

  return session;
}

