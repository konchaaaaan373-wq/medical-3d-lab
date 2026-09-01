import { supabaseUserExists } from '../lib/account.js';
import { notify } from '../lib/alerts.js';
import { classifyInvoice, invoiceOutcome, isInvoiceEvent } from '../lib/invoices.js';
import { ledgerRow, record, replayDecision } from '../lib/ledger.js';
import {
  json,
  planForPrice,
  stripeGet,
  supabaseAdmin,
  upsertCustomer,
  upsertSubscription,
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
    return json(400, { error: 'Malformed webhook body' });
  }

  // Stripe retries until it gets a 2xx, and a handler can succeed with the
  // response lost on the way back. The ledger is what makes "already applied"
  // answerable from storage rather than from hope.
  const replay = await replayDecision(event.id, raw).catch((error) => {
    // A ledger that cannot be read must not stop entitlement being written.
    // Processing an event twice is recoverable; refusing a real one is not.
    console.error('billing ledger unavailable', error?.message ?? error);
    return { process: true, reason: null, digestChanged: false };
  });

  if (!replay.process) {
    if (replay.digestChanged) {
      // Same event id, different body. This should be impossible, and the safe
      // reading is that the delivery is not what it claims to be.
      await notify('webhook_digest_mismatch', { eventId: event.id, type: event.type });
      return json(400, { error: 'Event body does not match the recorded delivery' });
    }
    return json(200, { received: true, ignored: 'duplicate' });
  }

  // Threaded through rather than held in module state, for the reason given on
  // `syncSubscription`.
  let priceSupported = true;

  try {
    const object = event.data?.object;

    if (event.type === 'checkout.session.completed' && object?.mode === 'subscription') {
      const userId = object.metadata?.supabase_user_id || object.client_reference_id;
      // Account deletion can race a delayed Checkout webhook. Never recreate a
      // billing mapping for an Auth identity that has already been removed.
      if (!userId || !(await supabaseUserExists(userId))) {
        await notify('deleted_user_event', { eventId: event.id, type: event.type });
        await recordOutcome(event, raw, 'ignored', { userId: null });
        return json(200, { received: true, ignored: 'deleted_user' });
      }

      const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
      await upsertCustomer({
        userId,
        customerId,
        email: object.customer_details?.email ?? null,
      });
      if (object.subscription) {
        const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription.id;
        const subscription = await stripeGet(`subscriptions/${subscriptionId}`);
        priceSupported = await syncSubscription(subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      // Stripe does not guarantee webhook delivery order. Re-read the current
      // subscription before writing local entitlement state so an old `updated`
      // event arriving late cannot overwrite a newer plan/status. Canceled
      // subscriptions are normally still retrievable; if Stripe refuses the
      // read after deletion, the signed event object is the safe fallback.
      let subscription = object;
      try {
        subscription = await stripeGet(`subscriptions/${object.id}`);
      } catch (error) {
        if (event.type !== 'customer.subscription.deleted') throw error;
      }

      const ownerId = await liveSubscriptionOwnerId(subscription);
      if (!ownerId) {
        await notify('deleted_user_event', {
          eventId: event.id,
          type: event.type,
          subscriptionId: subscription?.id ?? null,
        });
        await recordOutcome(event, raw, 'ignored', { userId: null });
        return json(200, { received: true, ignored: 'deleted_user' });
      }

      priceSupported = await syncSubscription(subscription);
      await upsertCustomer({
        userId: ownerId,
        customerId:
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id,
      });
    }

    // Renewal and payment failure. Entitlement already follows the subscription
    // events; these carry the two facts those cannot — that a renewal happened
    // at all, and that a payment is failing with a known number of attempts
    // left. Neither writes state.
    if (isInvoiceEvent(event.type)) {
      const invoice = classifyInvoice(event);
      if (invoice.alert) {
        await notify(invoice.alert, {
          subscriptionId: invoice.subscriptionId,
          customerId: invoice.customerId,
          attempt: invoice.attempt,
          finalAttempt: invoice.finalAttempt,
          currency: invoice.currency,
        });
      }
      await recordOutcome(event, raw, invoiceOutcome(invoice));
      return json(200, { received: true, invoice: invoice.kind });
    }

    await recordOutcome(event, raw, priceSupported ? 'applied' : 'unsupported_price');
    return json(200, { received: true });
  } catch (error) {
    console.error('stripe-webhook', error);
    // Recorded as failed rather than not recorded: a retry has to be able to
    // tell "we have never seen this" from "we tried and it broke", and an
    // operator has to be able to find the ones that broke.
    await recordOutcome(event, raw, 'failed', { error });
    await notify('webhook_failed', {
      eventId: event.id,
      type: event.type,
      error: error?.message ?? String(error),
    });
    // 500 so Stripe retries. The ledger row is already durable.
    return json(500, { error: 'Webhook processing failed' });
  }
};

/**
 * Append to the ledger without letting a ledger failure change the response.
 *
 * The state tables are what grant access; the ledger is the record of how they
 * got that way. Losing the record is bad, and refusing a paid entitlement
 * because the record could not be written is worse.
 */
async function recordOutcome(event, raw, outcome, { userId, error } = {}) {
  try {
    await record(ledgerRow(event, raw, { outcome, userId, error }));
  } catch (ledgerError) {
    console.error('billing ledger write failed', ledgerError?.message ?? ledgerError);
  }
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

/**
 * Writes local state for one subscription.
 *
 * @returns {Promise<boolean>} whether the price is one this deployment sells.
 *   Returned rather than stored in a module variable: a serverless container is
 *   reused between invocations, so module state would leak one delivery's
 *   outcome into the next one's ledger row.
 */
async function syncSubscription(subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;

  // Portal and Checkout are configured to expose only our known prices, but
  // entitlement must still fail closed if someone changes the subscription
  // manually in Stripe. Mark an existing row ineligible immediately rather
  // than leaving its previous paid entitlement active.
  if (!planForPrice(priceId)) {
    await notify('unsupported_price', { subscriptionId: subscription.id, priceId });
    await supabaseAdmin(
      `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscription.id)}`,
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
    return false;
  }

  await upsertSubscription(subscription);
  return true;
}
