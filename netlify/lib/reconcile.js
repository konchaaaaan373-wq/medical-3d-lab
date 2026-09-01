/**
 * Reconciliation — comparing what we believe against what Stripe says.
 *
 * Webhooks are the fast path and they are not a guarantee. A delivery can be
 * lost, arrive out of order, or be applied while the response is dropped on
 * the way back. Every one of those leaves local entitlement wrong in a way no
 * single request will ever notice, because nothing re-asks.
 *
 * So something has to re-ask. The comparison itself is pure and lives here;
 * `netlify/functions/billing-reconcile.js` is the part that fetches.
 *
 * The direction is fixed and not negotiable: **Stripe is the truth about a
 * subscription.** Local state is a cache of it. Reconciliation therefore only
 * ever proposes changes to local rows, never to Stripe.
 */
import { planForPrice } from './billing.js';

/** Statuses in which a subscription is still live for entitlement purposes. */
export const NON_TERMINAL = Object.freeze([
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
]);

/** Every kind of disagreement, and how serious each is. */
export const DRIFT_KINDS = Object.freeze({
  /** Local says live, Stripe has no such subscription at all. */
  missing_in_stripe: 'error',
  /** Stripe has a live subscription we never recorded. A paying user with no access. */
  missing_locally: 'error',
  /** Both exist; the status differs. */
  status: 'error',
  /** Both exist; the entitlement differs. Someone is being given the wrong thing. */
  entitlement: 'error',
  /** Both exist; the renewal date or cancellation flag differs. */
  period: 'warning',
  /** The price is not one this deployment sells. */
  unsupported_price: 'error',
});

const periodIso = (value) => {
  if (value == null) return null;
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * The fields of a Stripe subscription this product actually stores.
 *
 * @param {object} subscription
 */
export function normaliseStripe(subscription) {
  const priceId = subscription?.items?.data?.[0]?.price?.id ?? null;
  return {
    id: subscription?.id ?? null,
    customerId:
      typeof subscription?.customer === 'string' ? subscription.customer : subscription?.customer?.id ?? null,
    status: subscription?.status ?? null,
    priceId,
    entitlement: planForPrice(priceId),
    currentPeriodEnd: periodIso(subscription?.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
  };
}

/** The same fields from a local `billing_subscriptions` row. */
export function normaliseLocal(row) {
  return {
    id: row?.stripe_subscription_id ?? null,
    customerId: row?.stripe_customer_id ?? null,
    status: row?.status ?? null,
    priceId: row?.price_id ?? null,
    entitlement: row?.entitlement ?? null,
    currentPeriodEnd: periodIso(row?.current_period_end),
    cancelAtPeriodEnd: Boolean(row?.cancel_at_period_end),
    userId: row?.user_id ?? null,
  };
}

/**
 * Every disagreement between local state and Stripe.
 *
 * Both sides are passed in, so the whole comparison is testable without a
 * network — which matters more here than anywhere else in the backend, because
 * this is the code that decides whether somebody keeps access they paid for.
 *
 * @param {object[]} localRows rows from `billing_subscriptions`
 * @param {object[]} stripeSubscriptions subscriptions read from Stripe
 * @returns {{kind: string, severity: string, subscriptionId: string|null, detail: object}[]}
 */
export function findDrift(localRows = [], stripeSubscriptions = []) {
  const drift = [];
  const local = new Map(localRows.map((row) => [row.stripe_subscription_id, normaliseLocal(row)]));
  const remote = new Map(
    stripeSubscriptions.map((subscription) => [subscription.id, normaliseStripe(subscription)])
  );

  for (const [id, mine] of local) {
    const theirs = remote.get(id);

    if (!theirs) {
      // Only a problem while we still believe it is live. A terminal local row
      // that Stripe no longer returns is just history.
      if (NON_TERMINAL.includes(mine.status)) {
        drift.push({
          kind: 'missing_in_stripe',
          severity: DRIFT_KINDS.missing_in_stripe,
          subscriptionId: id,
          detail: { localStatus: mine.status },
        });
      }
      continue;
    }

    if (!theirs.entitlement) {
      drift.push({
        kind: 'unsupported_price',
        severity: DRIFT_KINDS.unsupported_price,
        subscriptionId: id,
        detail: { priceId: theirs.priceId },
      });
    } else if (mine.entitlement !== theirs.entitlement) {
      drift.push({
        kind: 'entitlement',
        severity: DRIFT_KINDS.entitlement,
        subscriptionId: id,
        detail: { local: mine.entitlement, stripe: theirs.entitlement },
      });
    }

    if (mine.status !== theirs.status) {
      drift.push({
        kind: 'status',
        severity: DRIFT_KINDS.status,
        subscriptionId: id,
        detail: { local: mine.status, stripe: theirs.status },
      });
    }

    if (
      mine.currentPeriodEnd !== theirs.currentPeriodEnd ||
      mine.cancelAtPeriodEnd !== theirs.cancelAtPeriodEnd
    ) {
      drift.push({
        kind: 'period',
        severity: DRIFT_KINDS.period,
        subscriptionId: id,
        detail: {
          local: { end: mine.currentPeriodEnd, cancelAtPeriodEnd: mine.cancelAtPeriodEnd },
          stripe: { end: theirs.currentPeriodEnd, cancelAtPeriodEnd: theirs.cancelAtPeriodEnd },
        },
      });
    }
  }

  for (const [id, theirs] of remote) {
    if (local.has(id)) continue;
    // A live Stripe subscription we have no row for is somebody paying with no
    // access. It is the worst of these and the easiest to miss, because nothing
    // in the product ever looks for a row that is not there.
    if (NON_TERMINAL.includes(theirs.status)) {
      drift.push({
        kind: 'missing_locally',
        severity: DRIFT_KINDS.missing_locally,
        subscriptionId: id,
        detail: { stripeStatus: theirs.status, customerId: theirs.customerId },
      });
    }
  }

  return drift;
}

/**
 * What to do about the drift.
 *
 * Everything Stripe can settle on its own is repaired by re-writing the local
 * row from the Stripe subscription. Two cases are not ours to decide and are
 * reported instead:
 *
 *   - `missing_in_stripe`, because deleting a local record on the strength of
 *     one empty read would destroy the evidence if the read was the thing that
 *     was wrong;
 *   - `unsupported_price`, because it means somebody changed a subscription in
 *     the Stripe dashboard to something this product does not sell, and the
 *     right response is a human looking at it.
 *
 * @param {ReturnType<typeof findDrift>} drift
 */
export function reconciliationPlan(drift) {
  const repairable = new Set(['status', 'entitlement', 'period', 'missing_locally']);
  const repair = [];
  const escalate = [];

  for (const item of drift) {
    (repairable.has(item.kind) ? repair : escalate).push(item);
  }

  // One write per subscription, however many fields disagreed about it.
  const subscriptionIds = [...new Set(repair.map((item) => item.subscriptionId))];

  return {
    clean: drift.length === 0,
    repair,
    escalate,
    subscriptionIds,
    summary: {
      total: drift.length,
      repairable: repair.length,
      escalated: escalate.length,
      worst: drift.some((item) => item.severity === 'error') ? 'error' : drift.length ? 'warning' : 'clean',
    },
  };
}
