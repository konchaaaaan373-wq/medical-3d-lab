import crypto from 'node:crypto';

import { billingIdentityHash, stripeModeFilter, supabaseAdmin } from './billing.js';
import { billingStripeMode } from './billingConfiguration.js';

// Stripe Checkout defaults to a 24-hour Session. Keep an unconfirmed DB lease
// slightly longer so a Session whose response was lost can never outlive the
// attempt that owns its idempotency key. Near expiry, an acquired (but not yet
// recorded) attempt is renewed before the exact same Stripe request is retried.
const ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000 + 5 * 60 * 1000;
const ACQUIRED_RENEW_BEFORE_MS = 30 * 60 * 1000;
const ACTIVE_ATTEMPT_STATUSES = new Set(['acquired', 'session_created']);

const attemptPath = (userId, mode, suffix = '') =>
  `billing_checkout_attempts?user_id=eq.${encodeURIComponent(userId)}&${stripeModeFilter(mode)}${suffix}`;

function reusableAttempt(row, { plan, returnHash, now }) {
  if (!row || !ACTIVE_ATTEMPT_STATUSES.has(row.status)) return false;
  if (Date.parse(row.expires_at) <= now.getTime()) return false;
  return row.plan === plan && row.return_hash === returnHash;
}

function claimed(row, retry) {
  return {
    claimed: true,
    retry,
    attemptId: row.attempt_id,
    checkoutSessionId: row.checkout_session_id ?? null,
    expiresAt: row.expires_at,
  };
}

/**
 * Atomically owns one Checkout attempt for a user and Stripe namespace.
 * Concurrent identical requests reuse the same attempt and therefore the same
 * Stripe idempotency key. A different in-flight purchase cannot overtake it.
 */
export async function claimCheckoutAttempt({
  userId,
  plan,
  returnHash,
  mode = billingStripeMode(),
  admin = supabaseAdmin,
  now = new Date(),
  attemptId = crypto.randomUUID(),
} = {}) {
  if (!userId || !plan || !returnHash || !attemptId) {
    throw new Error('Checkout attempt requires a user, plan, return path and attempt ID.');
  }

  const expiresAt = new Date(now.getTime() + ATTEMPT_TTL_MS).toISOString();
  const candidate = {
    user_id: userId,
    stripe_mode: mode,
    attempt_id: attemptId,
    plan,
    return_hash: returnHash,
    status: 'acquired',
    checkout_session_id: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    expires_at: expiresAt,
  };
  const inserted = await admin(
    'billing_checkout_attempts?on_conflict=user_id,stripe_mode',
    {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=representation',
      body: [candidate],
    }
  );
  if (inserted?.length) return claimed(inserted[0], false);

  let rows = await admin(`${attemptPath(userId, mode)}&select=*&limit=1`);
  let existing = rows?.[0] ?? null;
  if (reusableAttempt(existing, { plan, returnHash, now })) {
    const remaining = Date.parse(existing.expires_at) - now.getTime();
    if (existing.status === 'acquired' && remaining < ACQUIRED_RENEW_BEFORE_MS) {
      const renewed = await admin(
        `${attemptPath(userId, mode)}&attempt_id=eq.${encodeURIComponent(existing.attempt_id)}&status=eq.acquired&expires_at=eq.${encodeURIComponent(existing.expires_at)}`,
        {
          method: 'PATCH',
          prefer: 'return=representation',
          body: { expires_at: expiresAt, updated_at: now.toISOString() },
        }
      );
      if (renewed?.length) return claimed(renewed[0], true);
      // A concurrent request may have recorded the Session or renewed the same
      // attempt. Re-read instead of minting a second idempotency key.
      rows = await admin(`${attemptPath(userId, mode)}&select=*&limit=1`);
      existing = rows?.[0] ?? null;
      if (reusableAttempt(existing, { plan, returnHash, now })) return claimed(existing, true);
    } else {
      return claimed(existing, true);
    }
  }
  if (
    existing &&
    ACTIVE_ATTEMPT_STATUSES.has(existing.status) &&
    Date.parse(existing.expires_at) > now.getTime()
  ) {
    return { claimed: false, reason: 'different_attempt_in_progress' };
  }

  // Compare-and-swap on the old attempt ID. Exactly one expired/failed owner
  // can replace it; losers reread and reuse the winner when parameters match.
  const replaced = existing
    ? await admin(
        `${attemptPath(userId, mode)}&attempt_id=eq.${encodeURIComponent(existing.attempt_id)}`,
        {
          method: 'PATCH',
          prefer: 'return=representation',
          body: candidate,
        }
      )
    : [];
  if (replaced?.length) return claimed(replaced[0], false);

  rows = await admin(`${attemptPath(userId, mode)}&select=*&limit=1`);
  existing = rows?.[0] ?? null;
  if (reusableAttempt(existing, { plan, returnHash, now })) return claimed(existing, true);
  return { claimed: false, reason: 'attempt_claimed_elsewhere' };
}

export function checkoutIdempotencyKey(userId, mode, attemptId) {
  return `medical3dlab:checkout:${mode}:${billingIdentityHash(userId)}:${attemptId}`;
}

export async function recordCheckoutSession({
  userId,
  mode = billingStripeMode(),
  attemptId,
  sessionId,
  expiresAt,
  admin = supabaseAdmin,
  now = new Date(),
} = {}) {
  if (!userId || !attemptId || !sessionId) return false;
  const rows = await admin(
    `${attemptPath(userId, mode)}&attempt_id=eq.${encodeURIComponent(attemptId)}&status=eq.acquired`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        status: 'session_created',
        checkout_session_id: sessionId,
        updated_at: now.toISOString(),
        ...(Number.isFinite(expiresAt)
          ? { expires_at: new Date(expiresAt * 1000).toISOString() }
          : {}),
      },
    }
  );
  return Boolean(rows?.length);
}

export async function completeCheckoutAttempt({
  userId,
  mode = billingStripeMode(),
  attemptId,
  sessionId,
  admin = supabaseAdmin,
  now = new Date(),
} = {}) {
  if (!userId || !attemptId) return false;
  const rows = await admin(
    `${attemptPath(userId, mode)}&attempt_id=eq.${encodeURIComponent(attemptId)}`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        status: 'completed',
        checkout_session_id: sessionId ?? null,
        updated_at: now.toISOString(),
      },
    }
  );
  return Boolean(rows?.length);
}
