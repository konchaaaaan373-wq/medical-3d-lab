/**
 * Reconciliation endpoint.
 *
 * Webhooks are the fast path and not a guarantee: a delivery can be lost,
 * arrive out of order, or be applied while its response is dropped. Each of
 * those leaves local entitlement wrong in a way no single request will notice,
 * because nothing re-asks. This re-asks.
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
import { json, stripeGet, supabaseAdmin, upsertSubscription } from '../lib/billing.js';
import { NON_TERMINAL, findDrift, reconciliationPlan } from '../lib/reconcile.js';

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
    const stripeSubscriptions = [];
    for (const row of localRows) {
      try {
        stripeSubscriptions.push(await stripeGet(`subscriptions/${row.stripe_subscription_id}`));
      } catch {
        // Left out deliberately: absence is the signal `findDrift` reads.
      }
    }

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
      const byId = new Map(stripeSubscriptions.map((subscription) => [subscription.id, subscription]));
      for (const id of plan.subscriptionIds) {
        const subscription = byId.get(id);
        if (!subscription) continue;
        await upsertSubscription(subscription);
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
