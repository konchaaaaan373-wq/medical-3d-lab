import {
  stripeModeFilter,
  subscriptionById,
  supabaseAdmin,
  syncSubscription,
  syncSubscriptionUntilCurrent,
} from './billing.js';
import { billingPastDueGraceDays, billingStripeMode } from './billingConfiguration.js';

const FAILURE_KINDS = new Set(['payment_failed', 'action_required']);
const RECOVERY_KINDS = new Set(['renewal', 'first_payment']);

function eventTime(event, fallback) {
  const seconds = Number(event?.created);
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : fallback;
}

function orderedPath(path, column, occurredAt, operator) {
  const timestamp = encodeURIComponent(occurredAt.toISOString());
  return `${path}&or=(${column}.is.null,${column}.${operator}.${timestamp})`;
}

/** Persists a bounded payment-failure grace window for subscription access. */
export async function applyInvoiceBillingState(
  event,
  classification,
  {
    admin = supabaseAdmin,
    retrieveSubscription = subscriptionById,
    sync = (value) => syncSubscription(value, { admin, mode }),
    mode = billingStripeMode(),
    environment = process.env,
    now = new Date(),
  } = {}
) {
  const subscriptionId = classification?.subscriptionId;
  if (!subscriptionId || classification?.kind === 'other') return false;

  const subscription = await retrieveSubscription(subscriptionId);
  if (!subscription?.id) {
    const error = new Error('Invoice subscription is not present in Stripe.');
    error.code = 'missing_invoice_subscription';
    throw error;
  }
  await syncSubscriptionUntilCurrent(subscription, {
    retrieveSubscription,
    sync,
  });

  const occurredAt = eventTime(event, now);
  const path = `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&${stripeModeFilter(mode)}`;
  if (FAILURE_KINDS.has(classification.kind)) {
    const graceUntil = new Date(
      occurredAt.getTime() + billingPastDueGraceDays(environment) * 24 * 60 * 60 * 1000
    );
    // Failure uses strict `lt`; a successful payment at the same Stripe second
    // wins regardless of delivery order. `is.null` fixes the grace start at
    // the first failure we observe, while the second update advances only the
    // ordering marker for later retries.
    const failurePath = orderedPath(path, 'payment_state_event_at', occurredAt, 'lt');
    const created = await admin(`${failurePath}&payment_failed_at=is.null`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        payment_failed_at: occurredAt.toISOString(),
        grace_until: graceUntil.toISOString(),
        payment_state_event_at: occurredAt.toISOString(),
        updated_at: now.toISOString(),
      },
    });
    if (!created?.length) {
      await admin(`${failurePath}&payment_failed_at=not.is.null`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          payment_state_event_at: occurredAt.toISOString(),
          updated_at: now.toISOString(),
        },
      });
    }
    return true;
  }

  if (RECOVERY_KINDS.has(classification.kind)) {
    const recoveryPath = orderedPath(path, 'payment_state_event_at', occurredAt, 'lte');
    await admin(recoveryPath, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        payment_failed_at: null,
        grace_until: null,
        payment_state_event_at: occurredAt.toISOString(),
        updated_at: now.toISOString(),
      },
    });

    // A later successful invoice restores a full-refund suspension. The
    // marker is retained so an old refund delivery cannot suspend access
    // again. Refund wins ties, so recovery uses strict `lt` here.
    const refundPath = orderedPath(path, 'refund_state_event_at', occurredAt, 'lt');
    const refundRows = await admin(refundPath, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        full_refund_at: null,
        refund_state_event_at: occurredAt.toISOString(),
        updated_at: now.toISOString(),
      },
    });
    if (refundRows?.length) {
      await admin(`${path}&access_suspended_reason=eq.full_refund`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          access_suspended_reason: null,
          access_suspended_at: null,
          updated_at: now.toISOString(),
        },
      });
    }
    return true;
  }

  if (classification.kind === 'uncollectible') {
    await admin(orderedPath(path, 'payment_state_event_at', occurredAt, 'lte'), {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        payment_failed_at: occurredAt.toISOString(),
        grace_until: occurredAt.toISOString(),
        payment_state_event_at: occurredAt.toISOString(),
        updated_at: now.toISOString(),
      },
    });
    return true;
  }
  return false;
}
