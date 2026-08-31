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

export function envAny(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing server configuration: ${names.join(' or ')}`);
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
      apikey: envAny('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

/** Supabase REST call using a server-only secret/service key. Never expose it to Vite. */
export async function supabaseAdmin(path, { method = 'GET', body, prefer } = {}) {
  const url = env('SUPABASE_URL').replace(/\/$/, '');
  const key = envAny('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
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

export async function stripePost(path, params, { idempotencyKey } = {}) {
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
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
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

const PLAN_PRICE_ENV = Object.freeze({
  patient: 'STRIPE_PRICE_PATIENT',
  education: 'STRIPE_PRICE_EDUCATION',
  complete: 'STRIPE_PRICE_COMPLETE',
});

export function priceForPlan(plan) {
  const name = PLAN_PRICE_ENV[plan];
  if (!name) throw new Error('Unknown plan.');
  return env(name);
}

/**
 * The Stripe Price ID is authoritative for the plan after checkout.
 *
 * Arbitrary subscription metadata is intentionally not used as an entitlement
 * source. Customer Portal changes the Price when someone switches plans but it
 * does not promise to rewrite our custom metadata. Deriving the plan from the
 * configured Price IDs therefore makes upgrades/downgrades converge correctly.
 *
 * `prices` is injectable only so this pure mapping can be unit-tested without
 * reading process.env. Production callers omit it.
 */
export function planForPrice(
  priceId,
  prices = {
    patient: process.env.STRIPE_PRICE_PATIENT,
    education: process.env.STRIPE_PRICE_EDUCATION,
    complete: process.env.STRIPE_PRICE_COMPLETE,
  }
) {
  if (!priceId) return null;
  for (const [plan, configuredPrice] of Object.entries(prices)) {
    if (configuredPrice && configuredPrice === priceId) return plan;
  }
  return null;
}

export function safeHash(value) {
  if (typeof value !== 'string') return '#/';
  return /^#[/][A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(value) ? value : '#/';
}

export async function billingCustomerFor(user) {
  const rows = await supabaseAdmin(`billing_customers?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id&limit=1`);
  if (rows?.[0]?.stripe_customer_id) return rows[0].stripe_customer_id;

  // Two tabs hitting Checkout before the local mapping exists must not create
  // two Stripe Customers: Stripe's one-subscription guard only works reliably
  // when both sessions use the same Customer. The deterministic key makes the
  // customer creation retry/concurrency safe.
  const customer = await stripePost(
    'customers',
    {
      email: user.email,
      'metadata[supabase_user_id]': user.id,
    },
    { idempotencyKey: `medical3dlab:customer:${user.id}` }
  );
  await supabaseAdmin('billing_customers?on_conflict=user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ user_id: user.id, stripe_customer_id: customer.id, email: user.email ?? null }],
  });
  return customer.id;
}

/** Stripe is authoritative when local webhook state may still be catching up. */
export async function subscriptionsForCustomer(customerId) {
  if (!customerId) return [];
  const data = await stripeGet(
    `subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`
  );
  return Array.isArray(data?.data) ? data.data : [];
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
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

  // Metadata is written at checkout to join the first event to a user. Later
  // events can recover through the durable customer mapping as well.
  let userId = subscription.metadata?.supabase_user_id ?? null;
  if (!userId && customerId) {
    const rows = await supabaseAdmin(
      `billing_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`
    );
    userId = rows?.[0]?.user_id ?? null;
  }

  // Fail closed if Stripe sends a price this deployment does not know. Do not
  // fall back to stale metadata: that is exactly how a Portal plan change could
  // leave the old entitlement active after the price has changed.
  const entitlement = planForPrice(priceId);
  if (!userId || !entitlement) {
    console.error('Ignoring subscription with unknown user/price', {
      subscriptionId: subscription.id,
      userId: userId ?? null,
      priceId,
    });
    return;
  }

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
        stripe_customer_id: customerId,
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
