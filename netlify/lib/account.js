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

/**
 * Stripe Customer deletion immediately closes subscriptions attached to that
 * customer. This must happen before Auth deletion: losing the app identity
 * while leaving recurring billing alive is the unsafe failure direction.
 */
export async function deleteStripeCustomer(customerId) {
  if (!customerId) return { deleted: false, skipped: true };
  const response = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
      'Stripe-Version': STRIPE_API_VERSION,
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 404 || body?.error?.code === 'resource_missing') {
    return { deleted: true, alreadyMissing: true };
  }
  if (!response.ok) throw new Error(body?.error?.message || `Stripe ${response.status}`);
  if (body?.deleted !== true) throw new Error('Stripe did not confirm Customer deletion.');
  return { deleted: true, alreadyMissing: false };
}
