import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import stripeWebhook from '../netlify/functions/stripe-webhook.js';
import { ACCESS_SUBSCRIPTION_STATUSES } from '../src/access/policy.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_PATIENT',
    'STRIPE_PRICE_EDUCATION',
    'STRIPE_PRICE_COMPLETE',
  ]) {
    if (originalEnv[name] == null) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

function configure() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  process.env.STRIPE_SECRET_KEY = 'sk_test_example';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_example';
  process.env.STRIPE_PRICE_PATIENT = 'price_patient';
  process.env.STRIPE_PRICE_EDUCATION = 'price_education';
  process.env.STRIPE_PRICE_COMPLETE = 'price_complete';
}

function signedRequest(event) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return new Request('https://medical3dlab.netlify.app/.netlify/functions/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
    body,
  });
}

const subscription = Object.freeze({
  id: 'sub_123',
  customer: 'cus_123',
  status: 'active',
  current_period_end: 1_800_000_000,
  cancel_at_period_end: false,
  metadata: { supabase_user_id: '11111111-1111-1111-1111-111111111111' },
  items: { data: [{ price: { id: 'price_complete' } }] },
});

test('billing webhook: a claimed subscription event reaches processed state', async () => {
  configure();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });

    if (target.includes('/rest/v1/billing_events?on_conflict=') && options.method === 'POST') {
      return response([{ stripe_event_id: 'evt_123' }]);
    }
    if (target.includes('/rest/v1/billing_events?') && options.method === 'PATCH') {
      return response([{ stripe_event_id: 'evt_123', attempt_count: 1 }]);
    }
    if (target.endsWith('/v1/subscriptions/sub_123')) return response(subscription);
    if (target.includes('/auth/v1/admin/users/')) return response({ id: subscription.metadata.supabase_user_id });
    if (target.includes('/rest/v1/billing_customers?') && options.method !== 'POST') {
      return response([
        {
          user_id: subscription.metadata.supabase_user_id,
          stripe_customer_id: subscription.customer,
        },
      ]);
    }
    if (target.includes('/rest/v1/billing_customers?') && options.method === 'POST') return response([]);
    if (target.includes('/rest/v1/billing_subscriptions?') && options.method === 'POST') return response([]);
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const event = {
    id: 'evt_123',
    type: 'customer.subscription.updated',
    livemode: false,
    data: { object: subscription },
  };
  const result = await stripeWebhook(signedRequest(event));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { received: true });

  const ledgerFinish = calls.find(
    (call) => call.target.includes('/rest/v1/billing_events?') && call.options.method === 'PATCH'
  );
  assert.equal(JSON.parse(ledgerFinish.options.body).status, 'processed');
  assert.match(ledgerFinish.target, /attempt_count=eq\.1/);
  assert.ok(
    calls.some(
      (call) => call.target.includes('/rest/v1/billing_subscriptions?on_conflict=') && call.options.method === 'POST'
    )
  );
});

test('billing webhook: a completed duplicate performs no Stripe or entitlement work', async () => {
  configure();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (options.method === 'POST') return response([]);
    return response([
      {
        status: 'processed',
        attempt_count: 1,
        last_attempt_at: '2026-09-01T12:00:00.000Z',
      },
    ]);
  };

  const event = {
    id: 'evt_duplicate',
    type: 'customer.subscription.updated',
    livemode: false,
    data: { object: subscription },
  };
  const result = await stripeWebhook(signedRequest(event));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { received: true, duplicate: true });
  assert.equal(calls.length, 2);
  assert.equal(calls.some((call) => call.target.includes('api.stripe.com')), false);
});

test('billing webhook: a cancellation revokes access even when no owner can be resolved', async () => {
  // The failure this holds: a `customer.subscription.deleted` whose owner
  // cannot be looked up returned 200 with `ignored: deleted_user`, so Stripe
  // never retried, and nothing wrote the cancellation onto the local row. The
  // row stayed `active`, and `active` is what grants access — so a customer who
  // cancelled kept paid access indefinitely, silently, forever.
  //
  // Revoking never needs to know who owns a subscription. Only granting does.
  configure();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.includes('/rest/v1/billing_events?on_conflict=') && options.method === 'POST') {
      return response([{ stripe_event_id: 'evt_cancel' }]);
    }
    if (target.includes('/rest/v1/billing_events?') && options.method === 'PATCH') {
      return response([{ stripe_event_id: 'evt_cancel', attempt_count: 1 }]);
    }
    // Stripe no longer has the subscription: the signed event object is all
    // there is.
    if (target.endsWith('/v1/subscriptions/sub_gone')) return response({ error: {} }, 404);
    // And nothing maps this customer to a user — a mapping row that was never
    // written, or one lost to a restore. This is the case that used to be
    // reported as "deleted_user" when no user had been deleted at all.
    if (target.includes('/rest/v1/billing_customers?')) return response([]);
    if (target.includes('/rest/v1/billing_subscriptions?') && options.method === 'PATCH') {
      return response([]);
    }
    if (target.includes('/rest/v1/alerts') || target.includes('/functions/v1/')) return response({});
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const cancelled = {
    ...subscription,
    id: 'sub_gone',
    status: 'canceled',
    metadata: {},
  };
  const result = await stripeWebhook(
    signedRequest({
      id: 'evt_cancel',
      type: 'customer.subscription.deleted',
      livemode: false,
      data: { object: cancelled },
    })
  );
  assert.equal(result.status, 200);

  const revocation = calls.find(
    (call) =>
      call.target.includes('/rest/v1/billing_subscriptions?stripe_subscription_id=eq.sub_gone') &&
      call.options.method === 'PATCH'
  );
  assert.ok(revocation, 'the cancellation was never written to the local subscription row');
  const written = JSON.parse(revocation.options.body);
  assert.equal(written.status, 'canceled');
  assert.ok(
    !ACCESS_SUBSCRIPTION_STATUSES.has(written.status),
    `wrote ${written.status}, which still grants access`
  );

  // And it must not invent an owner on the way: the row is addressed by
  // subscription ID, and nothing is written to billing_customers.
  assert.equal(
    calls.some((call) => call.target.includes('/rest/v1/billing_customers?') && call.options.method === 'POST'),
    false,
    'an unresolvable event created a customer mapping'
  );
});

test('billing webhook: an unresolvable owner on a live subscription still grants nothing', async () => {
  // The other half of the same rule. Revoking without an owner is safe;
  // granting without one is the thing the guard exists to prevent, and it has
  // to keep preventing it.
  configure();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.includes('/rest/v1/billing_events?on_conflict=') && options.method === 'POST') {
      return response([{ stripe_event_id: 'evt_orphan' }]);
    }
    if (target.includes('/rest/v1/billing_events?') && options.method === 'PATCH') {
      return response([{ stripe_event_id: 'evt_orphan', attempt_count: 1 }]);
    }
    if (target.endsWith('/v1/subscriptions/sub_123')) return response({ ...subscription, metadata: {} });
    if (target.includes('/rest/v1/billing_customers?')) return response([]);
    if (target.includes('/rest/v1/alerts') || target.includes('/functions/v1/')) return response({});
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const result = await stripeWebhook(
    signedRequest({
      id: 'evt_orphan',
      type: 'customer.subscription.updated',
      livemode: false,
      data: { object: { ...subscription, metadata: {} } },
    })
  );
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { received: true, ignored: 'unknown_owner' });
  assert.equal(
    calls.some(
      (call) => call.target.includes('/rest/v1/billing_subscriptions?') && call.options.method === 'POST'
    ),
    false,
    'an active subscription with no resolvable owner was written to the entitlement table'
  );
});

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
