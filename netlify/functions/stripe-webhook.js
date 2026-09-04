import { supabaseUserExists } from '../lib/account.js';
import { notify } from '../lib/alerts.js';
import { classifyInvoice, isInvoiceEvent } from '../lib/invoices.js';
import { applyFinancialEvent, isFinancialEvent } from '../lib/financialEvents.js';
import { applyInvoiceBillingState } from '../lib/paymentState.js';
import { completeCheckoutAttempt } from '../lib/checkoutAttempts.js';
import {
  claimBillingEvent,
  finishBillingEvent,
  isSubscriptionEvent,
  json,
  subscriptionById,
  stripeGet,
  revokeSubscriptionLocally,
  stripeModeFilter,
  supabaseAdmin,
  syncSubscription,
  syncSubscriptionUntilCurrent,
  upsertCustomer,
  verifyStripeSignature,
} from '../lib/billing.js';
import {
  billingStripeMode,
  billingWebhookConfiguration,
  stripeEventMatchesDeployment,
} from '../lib/billingConfiguration.js';

export default async (request, context) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!billingWebhookConfiguration(process.env, context?.deploy?.context).configured) {
    return json(503, { error: 'Webhook is not configured safely on this deployment.' });
  }
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'))) {
    return json(400, { error: 'Invalid Stripe signature' });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Invalid Stripe event' });
  }
  if (!event?.id || !event?.type) return json(400, { error: 'Invalid Stripe event' });
  if (!stripeEventMatchesDeployment(event, process.env)) {
    return json(400, { error: 'Stripe event mode does not match this deployment' });
  }
  const mode = billingStripeMode(process.env);

  let claim;
  try {
    claim = await claimBillingEvent(event);
  } catch (error) {
    console.error('stripe-webhook claim failed', { code: error?.code ?? 'unknown' });
    return json(500, { error: 'Webhook event could not be claimed' });
  }
  if (!claim.claimed) {
    if (claim.reason === 'already_processed') {
      return json(200, { received: true, duplicate: true });
    }
    // A previous worker may have crashed after claiming but before finishing.
    // Keep the delivery retryable until the five-minute reclaim window opens.
    return json(500, { error: 'Webhook event is already processing' });
  }

  try {
    const outcome = await processStripeEvent(event, { mode });
    const finished = await finishBillingEvent(event.id, {
      attemptCount: claim.attemptCount,
      livemode: Boolean(event.livemode),
      status: outcome.status,
      resultCode: outcome.reason ?? null,
    });
    if (!finished) {
      // This worker outlived its claim and a retry now owns the Event. Keep the
      // response retryable instead of acknowledging another attempt's work.
      return json(500, { error: 'Webhook event claim expired' });
    }
    return json(200, {
      received: true,
      ...(outcome.status === 'ignored' ? { ignored: outcome.reason } : {}),
    });
  } catch (error) {
    try {
      await finishBillingEvent(event.id, {
        attemptCount: claim.attemptCount,
        livemode: Boolean(event.livemode),
        status: 'failed',
        resultCode: 'processing_error',
      });
    } catch (ledgerError) {
      console.error('stripe-webhook ledger failure', { code: ledgerError?.code ?? 'unknown' });
    }
    console.error('stripe-webhook processing failed', { code: error?.code ?? 'unknown' });
    await notify('webhook_failed', {
      eventId: event.id,
      type: event.type,
      error: error?.message ?? String(error),
    });
    return json(500, { error: 'Webhook processing failed' });
  }
};

export async function processStripeEvent(event, { mode = billingStripeMode() } = {}) {
  const object = event.data?.object;

  if (event.type === 'checkout.session.completed') {
    if (object?.mode !== 'subscription') {
      return { status: 'ignored', reason: 'non_subscription_checkout' };
    }
    const userId = object.metadata?.supabase_user_id || object.client_reference_id;
    // Account deletion can race a delayed Checkout webhook. Never recreate a
    // billing mapping for an Auth identity that has already been removed.
    if (!userId || !(await supabaseUserExists(userId))) {
      await notify('deleted_user_event', { eventId: event.id, type: event.type });
      return { status: 'ignored', reason: 'deleted_user' };
    }

    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const mapped = await upsertCustomer({
      userId,
      customerId,
      email: object.customer_details?.email ?? null,
    }, { mode });
    if (!mapped) throw new Error('Stripe Customer ownership could not be established.');
    if (!object.subscription) throw new Error('Subscription Checkout completed without a Subscription.');
    const subscriptionId =
      typeof object.subscription === 'string' ? object.subscription : object.subscription.id;
    const subscription = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`);
    await syncSubscriptionUntilCurrent(subscription, {
      sync: (value) => syncSubscription(value, { mode }),
    });
    await completeCheckoutAttempt({
      userId,
      mode,
      attemptId: object.metadata?.checkout_attempt_id,
      sessionId: object.id,
    });
    return { status: 'processed', reason: 'checkout_synced' };
  }

  if (isSubscriptionEvent(event.type)) {
    if (!object?.id) throw new Error('Subscription event is missing its object ID.');
    // Stripe does not guarantee webhook delivery order. Re-read the current
    // subscription before writing local entitlement state so an old `updated`
    // event arriving late cannot overwrite a newer plan/status. Canceled
    // subscriptions are normally still retrievable; if Stripe no longer serves
    // the object, the signed event object is the safe fallback.
    //
    // Both ways of not getting one have to land on that fallback.
    // `subscriptionById` **returns null** on a 404 and only throws on anything
    // else, so a `catch` alone caught every case except the one it was written
    // for: on the ordinary deleted-subscription 404 this left `subscription`
    // null, and a null subscription resolves no owner, syncs nothing and
    // revokes nothing — the event was acknowledged to Stripe and dropped.
    let current = null;
    try {
      current = await subscriptionById(object.id);
    } catch (error) {
      if (event.type !== 'customer.subscription.deleted') throw error;
    }
    if (!current && event.type !== 'customer.subscription.deleted') {
      throw new Error('Current Stripe subscription could not be retrieved.');
    }
    const retrievedCurrent = Boolean(current);
    const subscription = current ?? object;

    const ownerId = await liveSubscriptionOwnerId(subscription, mode);
    if (!ownerId) {
      // No owner, so nothing may be granted. But a subscription that has stopped
      // entitling still has to stop entitling: the local row is addressed by
      // subscription ID and does not need to know whose it is to say that it is
      // over. Skipping this returned 200 for a cancellation, which told Stripe
      // never to send it again, and left a row reading `active` behind it.
      const revocation = await revokeSubscriptionLocally(subscription, { mode });
      await notify('unresolvable_subscription_event', {
        eventId: event.id,
        type: event.type,
        subscriptionId: subscription?.id ?? null,
        status: subscription?.status ?? null,
        revoked: revocation.revoked,
      });
      return {
        status: 'ignored',
        reason: revocation.revoked ? 'revoked_without_owner' : 'unknown_owner',
      };
    }

    let syncedSubscription = subscription;
    if (retrievedCurrent) {
      const converged = await syncSubscriptionUntilCurrent(subscription, {
        sync: (value) => syncSubscription(value, { mode }),
      });
      syncedSubscription = converged.subscription ?? subscription;
    } else {
      const result = await syncSubscription(subscription, { mode });
      if (result?.synced === false) {
        const error = new Error(`Subscription sync failed closed: ${result.reason}`);
        error.code = result.reason;
        throw error;
      }
    }
    await upsertCustomer({
      userId: ownerId,
      customerId:
        typeof syncedSubscription.customer === 'string'
          ? syncedSubscription.customer
          : syncedSubscription.customer?.id,
    }, { mode });
    return { status: 'processed', reason: 'subscription_synced' };
  }

  // Renewal and payment failure.
  //
  // Entitlement already follows the subscription events above: when a payment
  // fails Stripe moves the subscription to `past_due` and then to `unpaid` or
  // `canceled`, and that is written there. These carry the two facts the
  // subscription events cannot — that a renewal happened at all, which changes
  // no status and would otherwise leave a year of a customer's history with no
  // record, and that a payment is failing *right now* with a known number of
  // attempts left, which is the moment somebody should be told.
  //
  if (isInvoiceEvent(event.type)) {
    const invoice = classifyInvoice(event);
    if (invoice.kind === 'other') {
      return { status: 'ignored', reason: 'unsupported_invoice' };
    }
    if (!invoice.subscriptionId) {
      // This product only grants recurring-subscription access. A signed
      // one-off Invoice may legitimately exist in the same Stripe account,
      // but it must neither mutate entitlements nor page the subscription
      // operator as if a Medical 3D Lab renewal failed.
      return { status: 'ignored', reason: 'non_subscription_invoice' };
    }
    await applyInvoiceBillingState(event, invoice, { mode });
    if (invoice.alert) {
      await notify(invoice.alert, {
        subscriptionId: invoice.subscriptionId,
        customerId: invoice.customerId,
        attempt: invoice.attempt,
        finalAttempt: invoice.finalAttempt,
        currency: invoice.currency,
      });
    }
    return { status: 'processed', reason: `invoice_${invoice.kind}` };
  }

  if (isFinancialEvent(event.type)) {
    const financial = await applyFinancialEvent(event, { mode });
    if (financial.alert) {
      await notify(financial.alert, { subscriptionId: financial.subscriptionId });
    }
    return financial.handled
      ? { status: 'processed', reason: financial.reason }
      : { status: 'ignored', reason: financial.reason };
  }

  return { status: 'ignored', reason: 'unsupported_event' };
}

async function liveSubscriptionOwnerId(subscription, mode = billingStripeMode()) {
  if (!subscription) return null;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  let mappedUserId = null;
  if (customerId) {
    const rows = await supabaseAdmin(
      `billing_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&${stripeModeFilter(mode)}&select=user_id&limit=1`
    );
    mappedUserId = rows?.[0]?.user_id ?? null;
  }
  const candidate = mappedUserId ?? subscription.metadata?.supabase_user_id ?? null;
  if (!candidate) return null;
  return (await supabaseUserExists(candidate)) ? candidate : null;
}
