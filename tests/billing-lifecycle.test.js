import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  canReclaimBillingEvent,
  claimBillingEvent,
  finishBillingEvent,
  isSubscriptionEvent,
  missingRemoteSubscriptionIds,
  reconcileBillingForUser,
  stripeEventObjectId,
  subscriptionById,
  subscriptionStateUpdatedAt,
  syncSubscriptionUntilCurrent,
  subscriptionsForCustomer,
} from '../netlify/lib/billing.js';

const EVENT = Object.freeze({
  id: 'evt_test_123',
  type: 'customer.subscription.updated',
  livemode: false,
  data: { object: { id: 'sub_123' } },
});

test('billing lifecycle: paused and resumed subscription events are synchronised', () => {
  for (const type of [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
  ]) {
    assert.equal(isSubscriptionEvent(type), true, type);
  }
  assert.equal(isSubscriptionEvent('invoice.upcoming'), false);
});

test('billing lifecycle: the ledger records the Stripe object without retaining a payload', () => {
  assert.equal(stripeEventObjectId(EVENT), 'sub_123');
  assert.equal(stripeEventObjectId({ data: { object: {} } }), null);

  const migration = readFileSync(
    new URL('../supabase/migrations/20260901154950_billing_event_ledger.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /stripe_event_id text primary key/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all .* from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete .* to service_role/i);
  assert.doesNotMatch(migration, /\bpayload\b\s+(json|jsonb|text)/i);
});

test('billing lifecycle: a new event is claimed exactly once', async () => {
  const calls = [];
  const admin = async (path, options = {}) => {
    calls.push({ path, options });
    return [{ stripe_event_id: EVENT.id }];
  };
  const result = await claimBillingEvent(EVENT, {
    admin,
    now: new Date('2026-09-01T12:00:00.000Z'),
  });

  assert.deepEqual(result, { claimed: true, retry: false, attemptCount: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body[0].stripe_event_id, EVENT.id);
  assert.equal(calls[0].options.body[0].stripe_object_id, 'sub_123');
});

test('billing lifecycle: a processed duplicate is acknowledged without repeating work', async () => {
  const admin = async (_path, options = {}) => {
    if (options.method === 'POST') return [];
    return [{ status: 'processed', attempt_count: 1, last_attempt_at: '2026-09-01T11:00:00.000Z' }];
  };
  const result = await claimBillingEvent(EVENT, {
    admin,
    now: new Date('2026-09-01T12:00:00.000Z'),
  });
  assert.deepEqual(result, { claimed: false, reason: 'already_processed' });
});

test('billing lifecycle: failed and abandoned claims can be retried safely', async () => {
  assert.equal(
    canReclaimBillingEvent(
      { status: 'processing', last_attempt_at: '2026-09-01T11:56:00.000Z' },
      new Date('2026-09-01T12:00:00.000Z')
    ),
    false
  );
  assert.equal(
    canReclaimBillingEvent(
      { status: 'processing', last_attempt_at: '2026-09-01T11:55:00.000Z' },
      new Date('2026-09-01T12:00:00.000Z')
    ),
    true
  );
  assert.equal(canReclaimBillingEvent({ status: 'failed' }), true);

  const calls = [];
  const admin = async (path, options = {}) => {
    calls.push({ path, options });
    if (options.method === 'POST') return [];
    if (!options.method) {
      return [{ status: 'failed', attempt_count: 1, last_attempt_at: '2026-09-01T11:59:00.000Z' }];
    }
    return [{ stripe_event_id: EVENT.id, status: 'processing' }];
  };
  const result = await claimBillingEvent(EVENT, {
    admin,
    now: new Date('2026-09-01T12:00:00.000Z'),
  });

  assert.deepEqual(result, { claimed: true, retry: true, attemptCount: 2 });
  assert.equal(calls.at(-1).options.body.attempt_count, 2);
  assert.match(calls.at(-1).path, /status=eq\.failed/);
});

test('billing lifecycle: only the worker that owns an attempt can finish it', async () => {
  const calls = [];
  const admin = async (path, options) => {
    calls.push({ path, options });
    return [];
  };
  const finished = await finishBillingEvent(EVENT.id, {
    attemptCount: 1,
    admin,
    now: new Date('2026-09-01T12:00:00.000Z'),
  });

  assert.equal(finished, false);
  assert.match(calls[0].path, /status=eq\.processing/);
  assert.match(calls[0].path, /attempt_count=eq\.1/);
  assert.equal(calls[0].options.prefer, 'return=representation');
});

test('billing lifecycle: reconciliation fails closed when a live local row vanished from Stripe', async () => {
  const calls = [];
  const synced = [];
  const admin = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.includes('billing_customers?user_id=eq.') && !options.method) {
      return [{ stripe_customer_id: 'cus_123' }];
    }
    if (path.includes('billing_subscriptions?user_id=eq.') && !options.method) {
      return [
        { stripe_subscription_id: 'sub_remote' },
        { stripe_subscription_id: 'sub_missing' },
      ];
    }
    return [];
  };
  const result = await reconcileBillingForUser('user_123', {
    admin,
    listSubscriptions: async (customerId) => {
      assert.equal(customerId, 'cus_123');
      return [{ id: 'sub_remote', status: 'active' }];
    },
    retrieveSubscription: async (subscriptionId) =>
      subscriptionId === 'sub_remote' ? { id: 'sub_remote', status: 'active' } : null,
    sync: async (subscription) => synced.push(subscription.id),
    now: new Date('2026-09-01T12:00:00.000Z'),
  });

  assert.deepEqual(synced, ['sub_remote']);
  assert.deepEqual(result, { reconciled: true, remoteCount: 1, missingCount: 1 });
  const missingPatch = calls.find(
    (call) => call.path.includes('stripe_subscription_id=eq.sub_missing') && call.options.method === 'PATCH'
  );
  assert.equal(missingPatch.options.body.status, 'missing_from_stripe');
  assert.ok(
    calls.some(
      (call) => call.path.includes('billing_customers?user_id=eq.user_123') && call.options.method === 'PATCH'
    )
  );
});

test('billing lifecycle: Stripe subscription listing follows every pagination cursor', async () => {
  const paths = [];
  const subscriptions = await subscriptionsForCustomer('cus_123', {
    get: async (path) => {
      paths.push(path);
      if (paths.length === 1) {
        return { data: [{ id: 'sub_100' }], has_more: true };
      }
      return { data: [{ id: 'sub_101' }], has_more: false };
    },
  });

  assert.deepEqual(subscriptions.map(({ id }) => id), ['sub_100', 'sub_101']);
  assert.doesNotMatch(paths[0], /starting_after=/);
  assert.match(paths[1], /starting_after=sub_100/);
});

test('billing lifecycle: reconciliation re-fetches list snapshots before writing', async () => {
  const synced = [];
  const admin = async (path, options = {}) => {
    if (path.includes('billing_customers?user_id=eq.') && !options.method) {
      return [{ stripe_customer_id: 'cus_123' }];
    }
    if (path.includes('billing_subscriptions?user_id=eq.') && !options.method) return [];
    return [];
  };

  const result = await reconcileBillingForUser('user_123', {
    admin,
    listSubscriptions: async () => [{ id: 'sub_123', status: 'active' }],
    retrieveSubscription: async () => ({ id: 'sub_123', status: 'canceled' }),
    sync: async (subscription) => synced.push(subscription.status),
  });

  assert.deepEqual(synced, ['canceled']);
  assert.equal(result.remoteCount, 1);
});

test('billing lifecycle: post-write verification repairs a retrieve-to-write race', async () => {
  const synced = [];
  const retrieved = [
    { id: 'sub_123', status: 'canceled' },
    { id: 'sub_123', status: 'canceled' },
  ];
  const result = await syncSubscriptionUntilCurrent(
    { id: 'sub_123', status: 'active' },
    {
      sync: async (subscription) => synced.push(subscription.status),
      retrieveSubscription: async () => retrieved.shift(),
    }
  );

  assert.deepEqual(synced, ['active', 'canceled']);
  assert.equal(result.subscription.status, 'canceled');
  assert.equal(result.passes, 2);
});

test('billing lifecycle: post-write resource absence creates a fail-closed tombstone', async () => {
  const synced = [];
  const result = await syncSubscriptionUntilCurrent(
    { id: 'sub_123', status: 'active' },
    {
      sync: async (subscription) => synced.push(subscription.status),
      retrieveSubscription: async () => null,
    }
  );

  assert.deepEqual(synced, ['active', 'missing_from_stripe']);
  assert.equal(result.subscription.status, 'missing_from_stripe');
  assert.equal(result.passes, 1);
});

test('billing lifecycle: terminal history keeps Stripe lifecycle chronology', () => {
  const now = new Date('2026-09-01T12:00:00.000Z');
  assert.equal(
    subscriptionStateUpdatedAt(
      {
        status: 'canceled',
        created: Date.parse('2026-01-01T00:00:00.000Z') / 1000,
        canceled_at: Date.parse('2026-02-01T00:00:00.000Z') / 1000,
        ended_at: Date.parse('2026-02-02T00:00:00.000Z') / 1000,
      },
      now
    ),
    '2026-02-02T00:00:00.000Z'
  );
  assert.equal(
    subscriptionStateUpdatedAt(
      { status: 'incomplete_expired', created: Date.parse('2025-12-01T00:00:00.000Z') / 1000 },
      now
    ),
    '2025-12-01T00:00:00.000Z'
  );
  assert.equal(subscriptionStateUpdatedAt({ status: 'active', created: 1 }, now), now.toISOString());
});

test('billing lifecycle: apparent list gaps are verified by ID before fail-closing', async () => {
  const calls = [];
  const synced = [];
  const admin = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.includes('billing_customers?user_id=eq.') && !options.method) {
      return [{ stripe_customer_id: 'cus_123' }];
    }
    if (path.includes('billing_subscriptions?user_id=eq.') && !options.method) {
      return [{ stripe_subscription_id: 'sub_created_during_reconcile' }];
    }
    return [];
  };

  const result = await reconcileBillingForUser('user_123', {
    admin,
    listSubscriptions: async () => [],
    retrieveSubscription: async (subscriptionId) => ({ id: subscriptionId, status: 'active' }),
    sync: async (subscription) => synced.push(subscription.id),
  });

  assert.deepEqual(synced, ['sub_created_during_reconcile']);
  assert.equal(result.missingCount, 0);
  assert.equal(
    calls.some((call) => call.options.body?.status === 'missing_from_stripe'),
    false
  );
});

test('billing lifecycle: only confirmed Stripe resource absence becomes null', async () => {
  assert.equal(
    await subscriptionById('sub_missing', {
      get: async () => {
        const error = new Error('missing');
        error.code = 'resource_missing';
        throw error;
      },
    }),
    null
  );
  await assert.rejects(
    subscriptionById('sub_unknown', {
      get: async () => {
        throw new Error('network failure');
      },
    }),
    /network failure/
  );
});

test('billing lifecycle: missing remote IDs are derived without touching terminal history', () => {
  assert.deepEqual(
    missingRemoteSubscriptionIds(
      [{ stripe_subscription_id: 'sub_a' }, { stripe_subscription_id: 'sub_b' }],
      [{ id: 'sub_b' }, { id: 'sub_c' }]
    ),
    ['sub_a']
  );
});

test('billing lifecycle: Checkout and Portal returns request authoritative reconciliation', () => {
  const access = readFileSync(new URL('../src/access/AccessManager.js', import.meta.url), 'utf8');
  const portal = readFileSync(new URL('../netlify/functions/create-portal.js', import.meta.url), 'utf8');
  assert.match(access, /entitlements\?reconcile=1/);
  assert.match(access, /params\.get\('billing'\) === 'portal'/);
  assert.match(access, /result\.reconciliationSucceeded/);
  assert.match(access, /最新状態を確認できませんでした/);
  assert.match(portal, /billing=portal/);
});
