/**
 * Reconciliation endpoint.
 *
 * Webhooks are the fast path and not a guarantee: a delivery can be lost,
 * arrive out of order, or be applied while its response is dropped. Each of
 * those leaves local entitlement wrong in a way no single request will notice,
 * because nothing re-asks. This re-asks.
 *
 * It is deliberately not the same thing as `reconcileBillingForUser`, which
 * repairs one user's state on their own request path — after Checkout returns,
 * or when they read their entitlements. That one cannot see a user who never
 * comes back, and it has nobody to tell. This one answers the other question:
 * **is anyone in a bad state right now that nobody has looked at?**
 *
 * Run it on a schedule (Netlify Scheduled Functions, or any cron that can make
 * an authenticated request). It is safe to run at any time: the comparison is
 * read-only until it decides there is something to repair, and it only ever
 * writes the local cache from Stripe, never the other way round.
 *
 * Authorisation is a shared secret rather than a user session, because there is
 * no user: it is an operations endpoint. With `BILLING_RECONCILE_TOKEN` unset
 * it refuses every request rather than defaulting to open.
 */
import crypto from 'node:crypto';

import { notify } from '../lib/alerts.js';
import { json, stripeGet, subscriptionById, supabaseAdmin, syncSubscription } from '../lib/billing.js';
import { NON_TERMINAL, findDrift, reconciliationPlan } from '../lib/reconcile.js';

/**
 * How many pages of 100 subscriptions one run will list from Stripe.
 *
 * A ceiling rather than an unbounded scan, because this runs on a schedule in
 * a serverless function. Hitting it is reported, not swallowed.
 */
const MAX_LISTED_PAGES = 5;

/** Constant-time compare, so the token cannot be guessed a character at a time. */
function tokenMatches(provided, expected) {
  if (!expected || !provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const expected = process.env.BILLING_RECONCILE_TOKEN;
  if (!expected) return json(503, { error: 'Reconciliation is not configured on this deployment' });

  const provided = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!tokenMatches(provided, expected)) return json(401, { error: 'Unauthorized' });

  const dryRun = new URL(request.url).searchParams.get('dry') === '1';

  try {
    // Only live subscriptions are worth comparing. A terminal row is history,
    // and history does not drift.
    const statuses = NON_TERMINAL.map((status) => `"${status}"`).join(',');
    const localRows =
      (await supabaseAdmin(
        `billing_subscriptions?status=in.(${statuses})&select=stripe_subscription_id,stripe_customer_id,user_id,entitlement,status,price_id,current_period_end,cancel_at_period_end&limit=500`
      )) ?? [];

    // Read each one back from Stripe. A subscription Stripe no longer has
    // returns nothing and shows up as `missing_in_stripe`.
    const byId = new Map();
    for (const row of localRows) {
      try {
        // `subscriptionById` rather than a raw fetch: it is what the webhook
        // and the per-user repair both read Stripe through, and a comparison
        // that reads Stripe differently from the writer invents drift.
        const subscription = await subscriptionById(row.stripe_subscription_id);
        if (subscription?.id) byId.set(subscription.id, subscription);
      } catch {
        // Left out deliberately: absence is the signal `findDrift` reads.
      }
    }

    // And then list Stripe's own live subscriptions.
    //
    // Without this the comparison only ever asked Stripe about subscriptions
    // it already knew of, so `missing_locally` — a Stripe subscription with no
    // local row, which is somebody paying and getting no access — could never
    // be found. That is the single worst state this endpoint exists to catch,
    // it had a branch and a test, and in production it was unreachable: a
    // reconciliation that reported `clean` precisely when it mattered most.
    //
    // Bounded rather than exhaustive. `MAX_LISTED_PAGES` pages of 100 covers a
    // beta comfortably; if a run ever hits the ceiling it says so rather than
    // quietly checking a prefix of the account.
    let cursor = null;
    let pages = 0;
    let truncated = false;
    for (; pages < MAX_LISTED_PAGES; pages += 1) {
      const query = new URLSearchParams({ status: 'all', limit: '100' });
      if (cursor) query.set('starting_after', cursor);
      const page = await stripeGet(`subscriptions?${query}`);
      const data = page?.data ?? [];
      for (const subscription of data) {
        if (subscription?.id && !byId.has(subscription.id)) byId.set(subscription.id, subscription);
      }
      cursor = data.length ? data[data.length - 1].id : null;
      if (!page?.has_more || !cursor) break;
      if (pages + 1 === MAX_LISTED_PAGES) truncated = true;
    }
    if (truncated) {
      await notify('reconcile_drift', {
        detail: `subscription listing stopped at ${MAX_LISTED_PAGES} pages; the account has outgrown this pass`,
      });
    }

    const stripeSubscriptions = [...byId.values()];

    const drift = findDrift(localRows, stripeSubscriptions);
    const plan = reconciliationPlan(drift);

    if (plan.clean) {
      await notify('reconcile_clean', { checked: localRows.length });
      return json(200, { checked: localRows.length, drift: [], repaired: 0, dryRun });
    }

    for (const item of plan.escalate) {
      await notify(item.kind === 'unsupported_price' ? 'unsupported_price' : 'reconcile_drift', {
        kind: item.kind,
        subscriptionId: item.subscriptionId,
        detail: JSON.stringify(item.detail),
      });
    }

    let repaired = 0;
    if (!dryRun) {
      for (const id of plan.subscriptionIds) {
        const subscription = byId.get(id);
        if (!subscription) continue;
        // The same writer the webhook uses, so a repair and a delivery cannot
        // leave the row in two different shapes.
        await syncSubscription(subscription);
        repaired += 1;
      }
    }

    if (plan.repair.length) {
      await notify('reconcile_drift', {
        repairable: plan.repair.length,
        repaired,
        dryRun,
      });
    }

    return json(200, {
      checked: localRows.length,
      drift: drift.map(({ kind, severity, subscriptionId }) => ({ kind, severity, subscriptionId })),
      repaired,
      escalated: plan.escalate.length,
      dryRun,
    });
  } catch (error) {
    console.error('billing-reconcile', error);
    await notify('reconcile_drift', { error: error?.message ?? String(error) });
    return json(500, { error: 'Reconciliation failed' });
  }
};
