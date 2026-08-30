import crypto from 'node:crypto';

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function bearer(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

/** Authenticates a browser Supabase access token against Supabase Auth. */
export async function authenticatedUser(request) {
  const token = bearer(request);
  if (!token) return null;
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: env('SUPABASE_ANON_KEY'),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

/** Supabase REST call using the service role. Never expose this key to Vite. */
export async function supabaseAdmin(path, { method = 'GET', body, prefer } = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase REST ${response.status}`);
  return data;
}

export async function stripePost(path, params) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    form.append(key, String(value));
  }
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Stripe ${response.status}`);
  return data;
}

export async function stripeGet(path) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `Stripe ${response.status}`);
  return data;
}

export function priceForPlan(plan) {
  const names = {
    patient: 'STRIPE_PRICE_PATIENT',
    education: 'STRIPE_PRICE_EDUCATION',
    complete: 'STRIPE_PRICE_COMPLETE',
  };
  const name = names[plan];
  if (!name) throw new Error('Unknown plan.');
  return env(name);
}

export function safeHash(value) {
  if (typeof value !== 'string') return '#/';
  return /^#[/][A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(value) ? value : '#/';
}

export async function billingCustomerFor(user) {
  const rows = await supabaseAdmin(`billing_customers?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id&limit=1`);
  if (rows?.[0]?.stripe_customer_id) return rows[0].stripe_customer_id;

  const customer = await stripePost('customers', {
    email: user.email,
    'metadata[supabase_user_id]': user.id,
  });
  await supabaseAdmin('billing_customers?on_conflict=user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ user_id: user.id, stripe_customer_id: customer.id, email: user.email ?? null }],
  });
  return customer.id;
}

export async function upsertCustomer({ userId, customerId, email = null }) {
  if (!userId || !customerId) return;
  await supabaseAdmin('billing_customers?on_conflict=user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ user_id: userId, stripe_customer_id: customerId, email }],
  });
}

export async function upsertSubscription(subscription) {
  const userId = subscription.metadata?.supabase_user_id;
  const entitlement = subscription.metadata?.entitlement;
  if (!userId || !entitlement) return;
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  await supabaseAdmin('billing_subscriptions?on_conflict=stripe_subscription_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [
      {
        stripe_subscription_id: subscription.id,
        user_id: userId,
        stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
        entitlement,
        status: subscription.status,
        price_id: priceId,
        current_period_end: periodEnd,
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        updated_at: new Date().toISOString(),
      },
    ],
  });
}

/** Verifies Stripe's signed raw request body with a five-minute tolerance. */
export function verifyStripeSignature(rawBody, signatureHeader, secret = env('STRIPE_WEBHOOK_SECRET')) {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(',').map((item) => item.trim().split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  return signatures.some((candidate) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  });
}
