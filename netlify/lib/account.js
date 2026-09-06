import { env, envAny, STRIPE_API_VERSION } from './billing.js';

const PROVIDER_TIMEOUT_MS = 8_000;

function supabaseAuthBase() {
  return env('SUPABASE_URL').replace(/\/$/, '');
}

function supabaseAdminHeaders() {
  const key = envAny('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Confirms the destructive request with the account password. The short-lived
 * verification session is immediately revoked and neither credential nor
 * token is logged, returned to the browser, or persisted by this application.
 */
export async function verifySupabasePassword(email, password) {
  if (!email || typeof password !== 'string' || !password) return false;
  const key = envAny('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY');
  const response = await fetch(`${supabaseAuthBase()}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) return false;
  const session = await response.json().catch(() => ({}));
  if (!session?.access_token) return false;

  await fetch(`${supabaseAuthBase()}/auth/v1/logout?scope=local`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  }).catch(() => {});
  return true;
}

/** Returns false only when Supabase confirms the Auth user no longer exists. */
export async function supabaseUserExists(userId) {
  if (!userId) return false;
  const response = await fetch(`${supabaseAuthBase()}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: supabaseAdminHeaders(),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.msg || body?.message || `Supabase Auth ${response.status}`);
  }
  return true;
}

/**
 * Deletes the Supabase Auth identity. billing_* rows cascade through their
 * auth.users foreign keys, so browser-inaccessible billing state cannot become
 * orphaned after the identity is gone.
 */
export async function deleteSupabaseUser(userId) {
  const response = await fetch(`${supabaseAuthBase()}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: supabaseAdminHeaders(),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (response.status === 404) return { deleted: true, alreadyMissing: true };
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.msg || body?.message || `Supabase Auth ${response.status}`);
  return { deleted: true, alreadyMissing: false };
}

function stripeHeaders(secretKey) {
  return {
    Authorization: `Bearer ${secretKey}`,
    'Stripe-Version': STRIPE_API_VERSION,
  };
}

/** Returns the immutable Stripe account that issued a server key. */
export async function stripeAccountIdForKey(secretKey) {
  if (!secretKey) throw new Error('Stripe account verification requires a server key.');
  const response = await fetch('https://api.stripe.com/v1/account', {
    headers: stripeHeaders(secretKey),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Stripe ${response.status}`);
    error.status = response.status;
    error.code = body?.error?.code ?? null;
    throw error;
  }
  if (!/^acct_[A-Za-z0-9]+$/.test(body?.id ?? '')) {
    throw new Error('Stripe did not return a valid account identity.');
  }
  return body.id;
}

/** Retrieves a Customer, returning null only for confirmed absence under this key. */
export async function retrieveStripeCustomer(customerId, { secretKey } = {}) {
  if (!customerId) return null;
  const credential = secretKey ?? env('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
    headers: stripeHeaders(credential),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 404 || body?.error?.code === 'resource_missing') return null;
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Stripe ${response.status}`);
    error.status = response.status;
    error.code = body?.error?.code ?? null;
    throw error;
  }
  if (body?.id !== customerId) throw new Error('Stripe returned an unexpected Customer.');
  return body;
}

/**
 * Stripe Customer deletion immediately closes subscriptions attached to that
 * customer. This must happen before Auth deletion: losing the app identity
 * while leaving recurring billing alive is the unsafe failure direction.
 */
export async function deleteStripeCustomer(
  customerId,
  { secretKey, allowMissing = false } = {}
) {
  if (!customerId) return { deleted: false, skipped: true };
  const credential = secretKey ?? env('STRIPE_SECRET_KEY');
  const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
    headers: stripeHeaders(credential),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 404 || body?.error?.code === 'resource_missing') {
    if (allowMissing) return { deleted: true, alreadyMissing: true };
    const error = new Error('Stripe Customer absence has no verified account provenance.');
    error.status = 404;
    error.code = 'unverified_customer_absence';
    throw error;
  }
  if (!response.ok) throw new Error(body?.error?.message || `Stripe ${response.status}`);
  if (body?.deleted !== true) throw new Error('Stripe did not confirm Customer deletion.');
  return { deleted: true, alreadyMissing: false };
}
