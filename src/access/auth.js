/**
 * Tiny Supabase Auth client using the public REST API directly.
 *
 * The lab deliberately does not add an auth framework to a Three.js app. The
 * browser only ever sees the publishable Supabase URL/key; server secrets and
 * Stripe secrets live in Netlify Functions.
 */

const STORAGE_KEY = 'medical3dlab.auth.v1';
let volatileSession = null;
let refreshInFlight = null;

export const AUTH_CONFIG = Object.freeze({
  url: (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, ''),
  publishableKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    '',
});

export const authConfigured = () => Boolean(AUTH_CONFIG.url && AUTH_CONFIG.publishableKey);

function headers(token) {
  return {
    apikey: AUTH_CONFIG.publishableKey,
    Authorization: token ? `Bearer ${token}` : `Bearer ${AUTH_CONFIG.publishableKey}`,
    'Content-Type': 'application/json',
  };
}

function readStored() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return stored ?? volatileSession;
  } catch {
    // Storage can be denied in private/embedded contexts. Keep the signed-in
    // session usable for this page lifetime rather than turning a valid login
    // response into an application error.
    return volatileSession;
  }
}

function store(session) {
  volatileSession = session ?? null;
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The in-memory fallback above is enough for the current page. A browser
    // that refuses persistent storage may require sign-in again after reload;
    // it must never prevent free models from running.
  }
}

async function json(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error_description || body.msg || body.message || 'Authentication failed');
    error.status = response.status;
    throw error;
  }
  return body;
}

function normaliseSession(data) {
  if (!data?.access_token) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
    user: data.user ?? null,
  };
}

export async function signIn(email, password) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const session = normaliseSession(await json(response));
  store(session);
  return session;
}

export async function signUp(email, password) {
  if (!authConfigured()) throw new Error('Account access is not configured yet.');
  const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/signup`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const data = await json(response);
  const session = normaliseSession(data);
  if (session) store(session);
  return { session, user: data.user ?? null };
}

export function signOut() {
  const session = readStored();
  store(null);
  if (session?.access_token && authConfigured()) {
    fetch(`${AUTH_CONFIG.url}/auth/v1/logout`, {
      method: 'POST',
      headers: headers(session.access_token),
    }).catch(() => {});
  }
}

async function refresh(session) {
  if (!session?.refresh_token || !authConfigured()) return null;

  // Supabase can rotate refresh tokens. If two product calls notice an expired
  // access token together, serialise them through one refresh rather than
  // racing the same refresh token and making one of the two calls log out.
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const response = await fetch(`${AUTH_CONFIG.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!response.ok) {
      store(null);
      return null;
    }
    const next = normaliseSession(await response.json());
    store(next);
    return next;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function getSession() {
  const session = readStored();
  if (!session?.access_token) return null;
  const now = Math.floor(Date.now() / 1000);
  if ((session.expires_at ?? 0) - now > 60) return session;
  return refresh(session);
}

export async function authenticatedFetch(url, options = {}) {
  let session = await getSession();
  if (!session) throw new Error('Please sign in first.');

  const send = (current) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${current.access_token}`,
      },
    });

  let response = await send(session);
  if (response.status !== 401) return response;

  // A token can be invalidated server-side before its local expiry timestamp.
  // Force one refresh and retry once. A genuine authorization failure remains
  // a 401 after the retry; there is deliberately no retry loop.
  session = await refresh(readStored() ?? session);
  if (!session) return response;
  response = await send(session);
  return response;
}
