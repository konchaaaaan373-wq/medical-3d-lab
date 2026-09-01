import { supabaseUserExists } from '../lib/account.js';
import {
  claimBillingEvent,
  finishBillingEvent,
  isSubscriptionEvent,
  json,
  subscriptionById,
  stripeGet,
  supabaseAdmin,
  syncSubscription,
  syncSubscriptionUntilCurrent,
  upsertCustomer,
  verifyStripeSignature,
} from '../lib/billing.js';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
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

  let claim;
  try {
    claim = await claimBillingEvent(event);
  } catch (error) {
    console.error('stripe-webhook claim', error);
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
    const outcome = await processStripeEvent(event);
    const finished = await finishBillingEvent(event.id, {
      attemptCount: claim.attemptCount,
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
        status: 'failed',
        resultCode: 'processing_error',
      });
    } catch (ledgerError) {
      console.error('stripe-webhook ledger failure', ledgerError);
    }
    console.error('stripe-webhook', error);
    return json(500, { error: 'Webhook processing failed' });
  }
};

async function processStripeEvent(event) {
  const object = event.data?.object;

  if (event.type === 'checkout.session.completed') {
    if (object?.mode !== 'subscription') {
      return { status: 'ignored', reason: 'non_subscription_checkout' };
    }
    const userId = object.metadata?.supabase_user_id || object.client_reference_id;
    // Account deletion can race a delayed Checkout webhook. Never recreate a
    // billing mapping for an Auth identity that has already been removed.
    if (!userId || !(await supabaseUserExists(userId))) {
      console.info('Ignoring checkout webhook for deleted/missing account', {
        eventId: event.id,
        userId: userId ?? null,
      });
      return { status: 'ignored', reason: 'deleted_user' };
    }

    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const mapped = await upsertCustomer({
      userId,
      customerId,
      email: object.customer_details?.email ?? null,
    });
    if (!mapped) throw new Error('Stripe Customer ownership could not be established.');
    if (object.subscription) {
      const subscriptionId =
        typeof object.subscription === 'string' ? object.subscription : object.subscription.id;
      const subscription = await stripeGet(`subscriptions/${subscriptionId}`);
      await syncSubscriptionUntilCurrent(subscription, { sync: syncSubscription });
    }
    return { status: 'processed', reason: 'checkout_synced' };
  }

  if (isSubscriptionEvent(event.type)) {
    if (!object?.id) throw new Error('Subscription event is missing its object ID.');
    // Stripe does not guarantee webhook delivery order. Re-read the current
    // subscription before writing local entitlement state so an old `updated`
    // event arriving late cannot overwrite a newer plan/status. Canceled
    // subscriptions are normally still retrievable; if Stripe refuses the
    // read after deletion, the signed event object is the safe fallback.
    let subscription = object;
    let retrievedCurrent = false;
    try {
      subscription = await subscriptionById(object.id);
      retrievedCurrent = Boolean(subscription);
      if (!subscription && event.type !== 'customer.subscription.deleted') {
        throw new Error('Current Stripe subscription could not be retrieved.');
      }
    } catch (error) {
      if (event.type !== 'customer.subscription.deleted') throw error;
      subscription = object;
    }

    const ownerId = await liveSubscriptionOwnerId(subscription);
    if (!ownerId) {
      console.info('Ignoring subscription webhook for deleted/missing account', {
        eventId: event.id,
        subscriptionId: subscription?.id ?? null,
      });
      return { status: 'ignored', reason: 'deleted_user' };
    }

    let syncedSubscription = subscription;
    if (retrievedCurrent) {
      const converged = await syncSubscriptionUntilCurrent(subscription, { sync: syncSubscription });
      syncedSubscription = converged.subscription ?? subscription;
    } else {
      await syncSubscription(subscription);
    }
    await upsertCustomer({
      userId: ownerId,
      customerId:
        typeof syncedSubscription.customer === 'string'
          ? syncedSubscription.customer
          : syncedSubscription.customer?.id,
    });
    return { status: 'processed', reason: 'subscription_synced' };
  }

  return { status: 'ignored', reason: 'unsupported_event' };
}

async function liveSubscriptionOwnerId(subscription) {
  if (!subscription) return null;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  let mappedUserId = null;
  if (customerId) {
    const rows = await supabaseAdmin(
      `billing_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id&limit=1`
    );
    mappedUserId = rows?.[0]?.user_id ?? null;
  }
  const candidate = mappedUserId ?? subscription.metadata?.supabase_user_id ?? null;
  if (!candidate) return null;
  return (await supabaseUserExists(candidate)) ? candidate : null;
}
