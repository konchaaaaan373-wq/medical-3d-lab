import crypto from 'node:crypto';
import { ACCESS_SUBSCRIPTION_STATUSES } from '../../src/access/policy.js';

import { billingStripeMode } from './billingConfiguration.js';

export const STRIPE_API_VERSION = '2026-08-26.dahlia';
const PROVIDER_TIMEOUT_MS = 8_000;

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
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
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
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
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
      'Stripe-Version': STRIPE_API_VERSION,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: form,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Stripe ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.code ?? null;
    throw error;
  }
  return data;
}

export async function stripeGet(path) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${env('STRIPE_SECRET_KEY')}`,
      'Stripe-Version': STRIPE_API_VERSION,
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || `Stripe ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.code ?? null;
    throw error;
  }
  return data;
}

const PLAN_PRICE_ENV = Object.freeze({
  patient: 'STRIPE_PRICE_PATIENT',
  education: 'STRIPE_PRICE_EDUCATION',
  complete: 'STRIPE_PRICE_COMPLETE',
});

export const stripeModeFilter = (mode = billingStripeMode()) =>
  `stripe_mode=eq.${encodeURIComponent(mode)}`;

export const stripeLivemode = (mode = billingStripeMode()) => mode === 'live';

/** Hashes an Auth UUID before it becomes a provider-visible idempotency label. */
export function billingIdentityHash(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex').slice(0, 24);
}

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

/**
 * A durable Customer↔user mapping outranks subscription metadata once it exists.
 *
 * Metadata is useful for first-contact recovery, but it is mutable in Stripe and
 * can become stale independently of the Customer. Returning the mapped user
 * first prevents an old or manually edited metadata value from reassigning an
 * existing subscription to another Supabase account.
 */
export function subscriptionUserId(mappedUserId, metadataUserId) {
  return mappedUserId || metadataUserId || null;
}

/**
 * Customer ownership is one-to-one and becomes immutable once established.
 *
 * The database already enforces both directions (`user_id` primary key and a
 * unique `stripe_customer_id`). This pure check mirrors that invariant before a
 * webhook write so conflicting metadata is ignored deliberately instead of
 * depending on a constraint error/retry to protect ownership.
 */
export function customerMappingConflict({
  userId,
  customerId,
  existingUserCustomerId = null,
  existingCustomerUserId = null,
}) {
  if (!userId || !customerId) return 'missing_identity';
  if (existingUserCustomerId && existingUserCustomerId !== customerId) {
    return 'user_already_mapped_to_other_customer';
  }
  if (existingCustomerUserId && existingCustomerUserId !== userId) {
    return 'customer_already_mapped_to_other_user';
  }
  return null;
}

export function safeHash(value) {
  if (typeof value !== 'string') return '#/';
  return /^#[/][A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/.test(value) ? value : '#/';
}

/** Eight opaque letters identify the Checkout integration without user data. */
export function checkoutIntegrationIdentifier(randomBytes = crypto.randomBytes) {
  return [...randomBytes(8)]
    .map((byte) => String.fromCharCode(97 + (byte % 26)))
    .join('');
}

/** Stable for one Checkout attempt, random across attempts, and contains no user identity. */
export function checkoutIntegrationIdentifierForAttempt(attemptId) {
  const bytes = crypto.createHash('sha256').update(String(attemptId)).digest().subarray(0, 8);
  return checkoutIntegrationIdentifier(() => bytes);
}

/**
 * Stripe API versions that support flexible billing can expose the current
 * period on the subscription item instead of the subscription root. This app
 * deliberately creates one recurring item per subscription, so persist that
 * item's period end while keeping the legacy root field as a compatibility
 * fallback.
 */
export function subscriptionPeriodEnd(subscription) {
  const seconds =
    subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end ?? null;
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
}

const CHRONOLOGICAL_TERMINAL_STATUSES = new Set(['canceled', 'incomplete_expired']);
const RECONCILIATION_RELEVANT_STATUSES = new Set([
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
]);

/** Keeps historical rows ordered by Stripe lifecycle time, not reconciliation loop order. */
export function subscriptionStateUpdatedAt(subscription, now = new Date()) {
  if (!CHRONOLOGICAL_TERMINAL_STATUSES.has(subscription?.status)) return now.toISOString();
  const lifecycleSeconds = [subscription?.ended_at, subscription?.canceled_at]
    .filter(Number.isFinite);
  const seconds = lifecycleSeconds.length
    ? Math.max(...lifecycleSeconds)
    : subscription?.created;
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : now.toISOString();
}

export async function billingCustomerFor(
  user,
  { mode = billingStripeMode(), admin = supabaseAdmin, post = stripePost } = {}
) {
  const rows = await admin(
    `billing_customers?user_id=eq.${encodeURIComponent(user.id)}&${stripeModeFilter(mode)}&select=stripe_customer_id&limit=1`
  );
  if (rows?.[0]?.stripe_customer_id) return rows[0].stripe_customer_id;

  // Two tabs hitting Checkout before the local mapping exists must not create
  // two Stripe Customers: Stripe's one-subscription guard only works reliably
  // when both sessions use the same Customer. The deterministic key makes the
  // customer creation retry/concurrency safe.
  const customer = await post(
    'customers',
    {
      email: user.email,
      'metadata[supabase_user_id]': user.id,
      'metadata[stripe_mode]': mode,
    },
    { idempotencyKey: `medical3dlab:customer:${mode}:${billingIdentityHash(user.id)}` }
  );
  await admin('billing_customers?on_conflict=user_id,stripe_mode', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [
      {
        user_id: user.id,
        stripe_mode: mode,
        stripe_customer_id: customer.id,
        email: user.email ?? null,
      },
    ],
  });
  return customer.id;
}

/** Stripe is authoritative when local webhook state may still be catching up. */
export async function subscriptionsForCustomer(customerId, { get = stripeGet } = {}) {
  if (!customerId) return [];
  const subscriptions = [];
  let startingAfter = null;

  do {
    const cursor = startingAfter
      ? `&starting_after=${encodeURIComponent(startingAfter)}`
      : '';
    const page = await get(
      `subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100${cursor}`
    );
    const pageSubscriptions = Array.isArray(page?.data) ? page.data : [];
    subscriptions.push(...pageSubscriptions);
    if (!page?.has_more) break;

    const nextCursor = pageSubscriptions.at(-1)?.id;
    if (!nextCursor || nextCursor === startingAfter) {
      throw new Error('Stripe subscription pagination did not provide a new cursor.');
    }
    startingAfter = nextCursor;
  } while (true);

  return subscriptions;
}

/** Retrieves one current subscription, returning null only when Stripe confirms it is absent. */
export async function subscriptionById(subscriptionId, { get = stripeGet } = {}) {
  if (!subscriptionId) return null;
  try {
    return await get(`subscriptions/${encodeURIComponent(subscriptionId)}`);
  } catch (error) {
    if (error?.status === 404 || error?.code === 'resource_missing') return null;
    throw error;
  }
}

export function subscriptionStateFingerprint(subscription) {
  if (!subscription?.id) return null;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const item = subscription.items?.data?.[0];
  return JSON.stringify({
    id: subscription.id,
    customerId: customerId ?? null,
    status: subscription.status ?? null,
    priceId: item?.price?.id ?? null,
    periodEnd: subscriptionPeriodEnd(subscription),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    latestInvoiceId:
      typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id ?? null,
  });
}

/**
 * Repairs a missed invoice.paid delivery only from Stripe-confirmed evidence.
 *
 * An `active` status alone is insufficient because Stripe can keep a lifecycle
 * active while collection is in progress. We therefore require the current
 * latest Invoice to be paid and to expose its authoritative `paid_at` clock.
 * A newer payment failure already stored locally wins through the ordered DB
 * predicate. Re-reading the Subscription immediately before the write prevents
 * an older paid Invoice from clearing a newly-created billing cycle.
 */
export async function repairRecoveredPaymentState(
  subscription,
  {
    admin = supabaseAdmin,
    get = stripeGet,
    retrieveSubscription = subscriptionById,
    mode = billingStripeMode(),
    now = new Date(),
  } = {}
) {
  if (!subscription?.id || !['active', 'trialing'].includes(subscription.status)) {
    return { repaired: false, reason: 'status_not_recovered', subscription };
  }
  const latestInvoiceId =
    typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id ?? null;
  if (!latestInvoiceId) return { repaired: false, reason: 'latest_invoice_missing', subscription };

  const invoice =
    subscription.latest_invoice && typeof subscription.latest_invoice === 'object'
      ? subscription.latest_invoice
      : await get(`invoices/${encodeURIComponent(latestInvoiceId)}`);
  const paidAtSeconds = invoice?.status_transitions?.paid_at;
  if (
    invoice?.id !== latestInvoiceId ||
    (invoice?.paid !== true && invoice?.status !== 'paid') ||
    !Number.isFinite(paidAtSeconds)
  ) {
    return { repaired: false, reason: 'latest_invoice_not_confirmed_paid', subscription };
  }

  const verifiedSubscription = await retrieveSubscription(subscription.id);
  if (!verifiedSubscription?.id) {
    return { repaired: false, reason: 'subscription_missing', subscription: null };
  }
  if (
    subscriptionStateFingerprint(verifiedSubscription) !==
    subscriptionStateFingerprint(subscription)
  ) {
    return { repaired: false, reason: 'subscription_changed', subscription: verifiedSubscription };
  }

  const paidAt = new Date(paidAtSeconds * 1000).toISOString();
  const path = `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscription.id)}&${stripeModeFilter(mode)}`;
  const rows = await admin(
    `${path}&payment_failed_at=not.is.null&or=(payment_state_event_at.is.null,payment_state_event_at.lte.${encodeURIComponent(paidAt)})`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        payment_failed_at: null,
        grace_until: null,
        payment_state_event_at: paidAt,
        updated_at: now.toISOString(),
      },
    }
  );
  return {
    repaired: Boolean(rows?.length),
    reason: rows?.length ? 'payment_recovery_repaired' : 'payment_state_already_newer',
    subscription: verifiedSubscription,
  };
}

/**
 * Persists a retrieved subscription, then verifies Stripe still reports the
 * same entitlement-bearing state. If the state changed between read and write,
 * the newer object is written and verified again before reconciliation can
 * report success.
 */
export async function syncSubscriptionUntilCurrent(
  initialSubscription,
  { retrieveSubscription = subscriptionById, sync, maxPasses = 3 } = {}
) {
  if (!initialSubscription?.id) return { subscription: null, passes: 0 };
  if (typeof sync !== 'function') throw new Error('Subscription convergence requires a sync function.');

  let current = initialSubscription;
  for (let pass = 1; pass <= maxPasses; pass += 1) {
    const result = await sync(current);
    if (result?.synced === false) {
      const error = new Error(`Subscription sync failed closed: ${result.reason || 'unknown'}`);
      error.code = result.reason || 'subscription_sync_failed';
      throw error;
    }
    const verified = await retrieveSubscription(current.id);
    if (!verified?.id) {
      // The read before this write may have raced a deletion. Never leave that
      // older snapshot active after Stripe confirms the object is now absent.
      const tombstone = { ...current, status: 'missing_from_stripe' };
      const tombstoneResult = await sync(tombstone);
      if (tombstoneResult?.synced === false) {
        const error = new Error(
          `Subscription tombstone sync failed closed: ${tombstoneResult.reason || 'unknown'}`
        );
        error.code = tombstoneResult.reason || 'subscription_sync_failed';
        throw error;
      }
      return { subscription: tombstone, passes: pass };
    }
    if (subscriptionStateFingerprint(verified) === subscriptionStateFingerprint(current)) {
      return { subscription: verified, passes: pass };
    }
    current = verified;
  }
  throw new Error('Stripe subscription state did not stabilise during reconciliation.');
}

export async function upsertCustomer(
  { userId, customerId, email = null },
  { mode = billingStripeMode(), admin = supabaseAdmin } = {}
) {
  if (!userId || !customerId) return false;

  const [byUser, byCustomer] = await Promise.all([
    admin(
      `billing_customers?user_id=eq.${encodeURIComponent(userId)}&${stripeModeFilter(mode)}&select=user_id,stripe_customer_id&limit=1`
    ),
    admin(
      `billing_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&${stripeModeFilter(mode)}&select=user_id,stripe_customer_id&limit=1`
    ),
  ]);
  const conflict = customerMappingConflict({
    userId,
    customerId,
    existingUserCustomerId: byUser?.[0]?.stripe_customer_id ?? null,
    existingCustomerUserId: byCustomer?.[0]?.user_id ?? null,
  });

  if (conflict) {
    console.error('Refusing conflicting Stripe Customer ownership mapping', {
      conflict,
      userRef: billingIdentityHash(userId),
      customerRef: billingIdentityHash(customerId),
      existingCustomerRef: byUser?.[0]?.stripe_customer_id
        ? billingIdentityHash(byUser[0].stripe_customer_id)
        : null,
      existingUserRef: byCustomer?.[0]?.user_id
        ? billingIdentityHash(byCustomer[0].user_id)
        : null,
    });
    return false;
  }

  await admin('billing_customers?on_conflict=user_id,stripe_mode', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ user_id: userId, stripe_mode: mode, stripe_customer_id: customerId, email }],
  });
  return true;
}

export async function upsertSubscription(
  subscription,
  { admin = supabaseAdmin, now = new Date(), mode = billingStripeMode() } = {}
) {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const metadataUserId = subscription.metadata?.supabase_user_id ?? null;

  // Customer identity is durable and is created before Checkout. Prefer it on
  // every webhook; use metadata only to recover a legacy/first-contact event
  // for which no mapping exists yet. This makes user identity follow the same
  // fail-safe principle as plan identity (which follows Price ID, not metadata).
  let mappedUserId = null;
  if (customerId) {
    const rows = await admin(
      `billing_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&${stripeModeFilter(mode)}&select=user_id&limit=1`
    );
    mappedUserId = rows?.[0]?.user_id ?? null;
  }
  const userId = subscriptionUserId(mappedUserId, metadataUserId);
  if (mappedUserId && metadataUserId && mappedUserId !== metadataUserId) {
    console.warn('Subscription metadata user disagrees with durable customer mapping; using mapping', {
      subscriptionRef: billingIdentityHash(subscription.id),
      customerRef: billingIdentityHash(customerId),
      mappedUserRef: billingIdentityHash(mappedUserId),
      metadataUserRef: billingIdentityHash(metadataUserId),
    });
  }

  // Fail closed if Stripe sends a price this deployment does not know. Do not
  // fall back to stale metadata: that is exactly how a Portal plan change could
  // leave the old entitlement active after the price has changed.
  const entitlement = planForPrice(priceId);
  if (!userId || !entitlement) {
    console.error('Ignoring subscription with unknown user/price', {
      reason: !userId ? 'unknown_user' : 'unsupported_price',
      subscriptionRef: billingIdentityHash(subscription.id),
      userRef: userId ? billingIdentityHash(userId) : null,
      priceRef: priceId ? billingIdentityHash(priceId) : null,
    });
    return { synced: false, reason: !userId ? 'unknown_user' : 'unsupported_price' };
  }

  const periodEnd = subscriptionPeriodEnd(subscription);
  await admin('billing_subscriptions?on_conflict=stripe_subscription_id,stripe_mode', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [
      {
        stripe_subscription_id: subscription.id,
        stripe_mode: mode,
        user_id: userId,
        stripe_customer_id: customerId,
        entitlement,
        status: subscription.status,
        price_id: priceId,
        current_period_end: periodEnd,
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        updated_at: subscriptionStateUpdatedAt(subscription, now),
      },
    ],
  });
  return { synced: true, reason: 'synced' };
}

/**
 * Write a non-entitling status onto the local row, addressed by subscription ID.
 *
 * **Revoking never needs to know who owns a subscription; granting does.** Every
 * other write here resolves an owner first, and rightly: writing `active` for a
 * subscription whose owner cannot be established is how one customer's payment
 * becomes another's access. Revoking is the opposite direction. Refusing to
 * revoke because the owner is unclear does not fail safe — it leaves whatever
 * the row already said, and what it already said was `active`.
 *
 * That is not hypothetical. A `customer.subscription.deleted` whose customer had
 * no mapping row returned 200 with `ignored: deleted_user` — no user had been
 * deleted — and Stripe, having been acknowledged, never sent it again. The row
 * stayed `active`, and `active` is what `grantsFromSubscriptions` reads. A
 * customer who cancelled kept paid access indefinitely, and nothing anywhere
 * recorded that it had happened.
 *
 * Refuses to write a status that grants access, so it cannot be reached for and
 * used as a general writer.
 *
 * @param {{ id?: string, status?: string }} subscription
 */
export async function revokeSubscriptionLocally(
  subscription,
  { admin = supabaseAdmin, now = new Date(), mode = billingStripeMode() } = {}
) {
  const subscriptionId = subscription?.id;
  if (!subscriptionId) return { revoked: false, reason: 'missing_subscription' };
  const status = subscription.status ?? 'canceled';
  if (ACCESS_SUBSCRIPTION_STATUSES.has(status)) {
    return { revoked: false, reason: 'status_grants_access', status };
  }
  await admin(
    `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&${stripeModeFilter(mode)}`,
    {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        status,
        // `boolean not null` in the schema, and the object this reaches for is
        // often the thin signed event rather than a full subscription — so a
        // `?? null` here 400s the PATCH and the revocation this function exists
        // to guarantee never lands, in exactly the deleted-subscription case it
        // was written for. False is also the true answer: a subscription that has
        // ended is not going to cancel at the end of a period.
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        updated_at: subscriptionStateUpdatedAt(subscription, now),
      },
    }
  );
  return { revoked: true, status };
}

const SUBSCRIPTION_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
]);

const EVENT_RECLAIM_AFTER_MS = 5 * 60 * 1000;

export function isSubscriptionEvent(type) {
  return SUBSCRIPTION_EVENT_TYPES.has(type);
}

export function stripeEventObjectId(event) {
  const object = event?.data?.object;
  return typeof object?.id === 'string' ? object.id : null;
}

export function canReclaimBillingEvent(row, now = new Date()) {
  if (row?.status === 'failed') return true;
  if (row?.status !== 'processing') return false;
  const attemptedAt = Date.parse(row.last_attempt_at);
  return Number.isFinite(attemptedAt) && now.getTime() - attemptedAt >= EVENT_RECLAIM_AFTER_MS;
}

/**
 * Claims a signed Stripe Event before applying its side effects.
 *
 * Stripe can deliver the same Event more than once. The primary-key insert is
 * the normal claim path. Failed or abandoned claims can be retried, while a
 * completed Event is acknowledged without repeating its work.
 */
export async function claimBillingEvent(event, { admin = supabaseAdmin, now = new Date() } = {}) {
  if (!event?.id || !event?.type) return { claimed: false, reason: 'invalid_event' };

  const timestamp = now.toISOString();
  const livemode = Boolean(event.livemode);
  const created = await admin('billing_events?on_conflict=stripe_event_id,livemode', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates,return=representation',
    body: [
      {
        stripe_event_id: event.id,
        event_type: event.type,
        stripe_object_id: stripeEventObjectId(event),
        livemode,
        status: 'processing',
        attempt_count: 1,
        first_received_at: timestamp,
        last_attempt_at: timestamp,
      },
    ],
  });
  if (created?.length) return { claimed: true, retry: false, attemptCount: 1 };

  const rows = await admin(
    `billing_events?stripe_event_id=eq.${encodeURIComponent(event.id)}&livemode=eq.${livemode}&select=status,attempt_count,last_attempt_at&limit=1`
  );
  const existing = rows?.[0];
  if (!existing) throw new Error('Stripe Event claim disappeared before processing.');
  if (!canReclaimBillingEvent(existing, now)) {
    return {
      claimed: false,
      reason: existing.status === 'processing' ? 'already_processing' : 'already_processed',
    };
  }

  const filters = [
    `stripe_event_id=eq.${encodeURIComponent(event.id)}`,
    `livemode=eq.${livemode}`,
  ];
  if (existing.status === 'failed') {
    filters.push('status=eq.failed');
  } else {
    const staleBefore = new Date(now.getTime() - EVENT_RECLAIM_AFTER_MS).toISOString();
    filters.push('status=eq.processing', `last_attempt_at=lte.${encodeURIComponent(staleBefore)}`);
  }

  const attemptCount = Number(existing.attempt_count || 0) + 1;
  const reclaimed = await admin(`billing_events?${filters.join('&')}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      status: 'processing',
      attempt_count: attemptCount,
      last_attempt_at: timestamp,
      processed_at: null,
      result_code: null,
    },
  });
  return reclaimed?.length
    ? { claimed: true, retry: true, attemptCount }
    : { claimed: false, reason: 'claimed_elsewhere' };
}

export async function finishBillingEvent(
  eventId,
  {
    attemptCount,
    status = 'processed',
    resultCode = null,
    livemode,
    admin = supabaseAdmin,
    now = new Date(),
  } = {}
) {
  if (!['processed', 'ignored', 'failed'].includes(status)) {
    throw new Error(`Invalid billing event status: ${status}`);
  }
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    throw new Error('Billing event completion requires a valid attempt count.');
  }
  if (typeof livemode !== 'boolean') {
    throw new Error('Billing event completion requires its Stripe mode.');
  }
  const updated = await admin(
    `billing_events?stripe_event_id=eq.${encodeURIComponent(eventId)}&livemode=eq.${livemode}&status=eq.processing&attempt_count=eq.${attemptCount}`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        status,
        processed_at: status === 'failed' ? null : now.toISOString(),
        result_code: resultCode,
      },
    }
  );
  return Boolean(updated?.length);
}

/**
 * Synchronises one Stripe subscription into fail-closed local access state.
 */
export async function syncSubscription(
  subscription,
  { admin = supabaseAdmin, mode = billingStripeMode() } = {}
) {
  if (!subscription?.id) return { synced: false, reason: 'missing_subscription' };
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

  if (!planForPrice(priceId)) {
    await admin(
      `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscription.id)}&${stripeModeFilter(mode)}`,
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          status: 'unsupported_price',
          price_id: priceId,
          updated_at: new Date().toISOString(),
        },
      }
    );
    return { synced: false, reason: 'unsupported_price' };
  }

  return upsertSubscription(subscription, { admin, mode });
}

export function missingRemoteSubscriptionIds(localRows, remoteSubscriptions) {
  const remoteIds = new Set(
    (remoteSubscriptions ?? []).map((subscription) => subscription?.id).filter(Boolean)
  );
  return (localRows ?? [])
    .map((row) => row?.stripe_subscription_id)
    .filter((id) => id && !remoteIds.has(id));
}

/**
 * Repairs local entitlement state from Stripe's current subscription objects.
 * This is used after Checkout/Portal returns and before a stale local row can
 * block a legitimate repurchase. Webhooks remain the normal update path.
 */
export async function reconcileBillingForUser(
  userId,
  {
    admin = supabaseAdmin,
    listSubscriptions = subscriptionsForCustomer,
    retrieveSubscription = subscriptionById,
    retrieveInvoice = stripeGet,
    sync = null,
    now = new Date(),
    mode = billingStripeMode(),
  } = {}
) {
  const syncCurrent = sync ?? ((subscription) => syncSubscription(subscription, { admin, mode }));
  const customerRows = await admin(
    `billing_customers?user_id=eq.${encodeURIComponent(userId)}&${stripeModeFilter(mode)}&select=stripe_customer_id&limit=1`
  );
  const customerId = customerRows?.[0]?.stripe_customer_id ?? null;
  if (!customerId) return { reconciled: false, reason: 'no_customer' };

  const listedSubscriptions = await listSubscriptions(customerId);
  const localRows = await admin(
    `billing_subscriptions?user_id=eq.${encodeURIComponent(userId)}&${stripeModeFilter(mode)}&status=in.(incomplete,trialing,active,past_due,unpaid,paused)&select=stripe_subscription_id,payment_failed_at`
  );
  const localNonterminalIds = new Set(
    (localRows ?? []).map((row) => row?.stripe_subscription_id).filter(Boolean)
  );
  const localPaymentFailureIds = new Set(
    (localRows ?? [])
      .filter((row) => row?.payment_failed_at)
      .map((row) => row?.stripe_subscription_id)
      .filter(Boolean)
  );
  const relevantSubscriptions = listedSubscriptions.filter(
    (subscription) =>
      subscription?.id &&
      (RECONCILIATION_RELEVANT_STATUSES.has(subscription.status) ||
        localNonterminalIds.has(subscription.id))
  );
  const remoteSubscriptions = [];
  for (const listedSubscription of relevantSubscriptions) {
    // List responses are snapshots. Re-read immediately before writing so a
    // webhook that already persisted a newer status cannot be overwritten by
    // an older list page returned earlier in this reconciliation run.
    const currentSubscription = await retrieveSubscription(listedSubscription.id);
    if (!currentSubscription?.id) continue;
    const converged = await syncSubscriptionUntilCurrent(currentSubscription, {
      retrieveSubscription,
      sync: syncCurrent,
    });
    let latestSubscription = converged.subscription;
    if (latestSubscription?.id && localPaymentFailureIds.has(latestSubscription.id)) {
      for (let pass = 0; pass < 3; pass += 1) {
        const recovery = await repairRecoveredPaymentState(latestSubscription, {
          admin,
          get: retrieveInvoice,
          retrieveSubscription,
          mode,
          now,
        });
        if (recovery.reason === 'subscription_missing') {
          latestSubscription = { ...latestSubscription, status: 'missing_from_stripe' };
          await syncCurrent(latestSubscription);
          break;
        }
        if (recovery.reason !== 'subscription_changed') break;
        const refreshed = await syncSubscriptionUntilCurrent(recovery.subscription, {
          retrieveSubscription,
          sync: syncCurrent,
        });
        latestSubscription = refreshed.subscription;
        if (pass === 2) {
          const error = new Error('Stripe payment recovery state did not stabilise.');
          error.code = 'payment_recovery_unstable';
          throw error;
        }
      }
    }
    if (latestSubscription?.id) remoteSubscriptions.push(latestSubscription);
  }

  const missingCandidates = missingRemoteSubscriptionIds(localRows, remoteSubscriptions);
  let missingCount = 0;
  for (const subscriptionId of missingCandidates) {
    // A subscription can be created after the paginated list request. Verify
    // every apparent gap by ID before fail-closing the local row.
    const currentSubscription = await retrieveSubscription(subscriptionId);
    if (currentSubscription?.id) {
      await syncSubscriptionUntilCurrent(currentSubscription, {
        retrieveSubscription,
        sync: syncCurrent,
      });
      continue;
    }
    await admin(
      `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&${stripeModeFilter(mode)}`,
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          status: 'missing_from_stripe',
          updated_at: now.toISOString(),
        },
      }
    );
    missingCount += 1;
  }

  await admin(
    `billing_customers?user_id=eq.${encodeURIComponent(userId)}&${stripeModeFilter(mode)}`,
    {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: { last_reconciled_at: now.toISOString(), updated_at: now.toISOString() },
    }
  );
  return {
    reconciled: true,
    remoteCount: listedSubscriptions.length,
    reconciledCount: relevantSubscriptions.length,
    missingCount,
  };
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
