import { planIsSellable } from '../../src/access/commerceReadiness.js';
import { legalReadiness } from '../../src/access/legalReadiness.js';
import { NON_TERMINAL_SUBSCRIPTION_STATUSES } from '../../src/access/policy.js';
import {
  authenticatedUser,
  billingCustomerFor,
  checkoutIntegrationIdentifierForAttempt,
  json,
  priceForPlan,
  reconcileBillingForUser,
  safeHash,
  stripeModeFilter,
  stripePost,
  subscriptionsForCustomer,
  supabaseAdmin,
} from '../lib/billing.js';
import { billingConfiguration, billingStripeMode } from '../lib/billingConfiguration.js';
import {
  checkoutIdempotencyKey,
  claimCheckoutAttempt,
  recordCheckoutSession,
} from '../lib/checkoutAttempts.js';
import { cachedStripeCommerceReadiness } from '../lib/billingReadiness.js';

export const config = {
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

export default async (request, context) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!billingConfiguration(process.env, context?.deploy?.context).configured) {
    return json(503, { error: 'Checkout is not configured safely on this deployment.' });
  }
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });

    const body = await request.json().catch(() => ({}));
    const plan = body.plan;

    // Two gates, and both are repeated server-side intentionally. Hiding a
    // purchase button is not a boundary: a stale client or a hand-written
    // request must not be able to start a paid subscription either way.
    //
    // The first is a legal one and it is about the seller, not the buyer or the
    // content. Japan's 特定商取引法 requires a seller of a digital service to
    // publish its identity, its terms and its cancellation policy before taking
    // money, and `src/data/operator.js` ships those fields null so nothing is
    // invented. Until they are filled in, this deployment may not sell at all.
    const legal = legalReadiness();
    if (!legal.ready) {
      return json(409, {
        error: 'Checkout is unavailable until the required commercial disclosure is published.',
        disclosureHold: true,
      });
    }

    // The second is about the content: professional plans must be backed by a
    // scene whose Clinical Review is current, not stale, pending or unversioned.
    if (!planIsSellable(plan)) {
      return json(409, {
        error: 'This professional plan is temporarily unavailable pending current clinical review.',
        reviewHold: true,
      });
    }

    const stripeReadiness = await cachedStripeCommerceReadiness({
      environment: process.env,
    });
    if (!stripeReadiness.ready) {
      return json(503, {
        error: 'Checkout is temporarily unavailable while billing configuration is verified.',
      });
    }

    const price = priceForPlan(plan);
    const returnHash = safeHash(body.returnHash);
    const mode = billingStripeMode(process.env);

    // Fast local guard first. It catches the normal case without an extra Stripe
    // request and includes incomplete/payment-recovery states that should be
    // managed rather than duplicated.
    const statuses = [...NON_TERMINAL_SUBSCRIPTION_STATUSES].join(',');
    let existing = await supabaseAdmin(
      `billing_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&${stripeModeFilter(mode)}&status=in.(${statuses})&select=stripe_subscription_id,status&limit=1`
    );
    if (existing?.length) {
      // A missed cancellation webhook must not trap a former subscriber in a
      // stale local "active" row forever. Re-read Stripe before deciding that
      // this account can only use Portal.
      try {
        await reconcileBillingForUser(user.id, { mode });
      } catch (error) {
        // The safe fallback is Portal, not a second recurring subscription.
        console.warn('create-checkout reconciliation failed', { code: error?.code ?? 'unknown' });
        return existingSubscription();
      }
      existing = await supabaseAdmin(
        `billing_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&${stripeModeFilter(mode)}&status=in.(${statuses})&select=stripe_subscription_id,status&limit=1`
      );
      if (existing?.length) return existingSubscription();
    }

    const customer = await billingCustomerFor(user, { mode });

    // The webhook may be seconds behind Stripe. Ask Stripe itself before
    // creating Checkout so that "DB has not caught up yet" cannot become a
    // duplicate recurring subscription. The Dashboard one-subscription setting
    // is a third boundary, not a substitute for this server-side check.
    const stripeSubscriptions = await subscriptionsForCustomer(customer);
    if (stripeSubscriptions.some((subscription) => NON_TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status))) {
      return existingSubscription();
    }

    const attempt = await claimCheckoutAttempt({ userId: user.id, plan, returnHash, mode });
    if (!attempt.claimed) {
      return json(409, {
        error: 'Another checkout is already being prepared for this account. Please try again shortly.',
        checkoutPending: true,
      });
    }

    const origin = new URL(request.url).origin;
    const session = await stripePost('checkout/sessions', {
      mode: 'subscription',
      customer,
      'line_items[0][price]': price,
      'line_items[0][quantity]': 1,
      // `billing_plan` lets the returning browser know which entitlement it is
      // waiting for while the signed webhook catches up. It is a hint only —
      // entitlement still comes from the server-side subscription state.
      success_url: `${origin}/?billing=success&billing_plan=${encodeURIComponent(plan)}&session_id={CHECKOUT_SESSION_ID}${returnHash}`,
      cancel_url: `${origin}/${returnHash}`,
      // Match Stripe's own expiry to the atomic DB lease. Once the lease can
      // be replaced, the old Session is no longer completable, preventing two
      // concurrently valid subscription checkouts for one account.
      expires_at: Math.floor(Date.parse(attempt.expiresAt) / 1000),
      allow_promotion_codes: 'true',
      integration_identifier: checkoutIntegrationIdentifierForAttempt(attempt.attemptId),
      client_reference_id: user.id,
      'metadata[supabase_user_id]': user.id,
      'metadata[entitlement]': plan,
      'metadata[checkout_attempt_id]': attempt.attemptId,
      'metadata[stripe_mode]': mode,
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][entitlement]': plan,
      'subscription_data[metadata][stripe_mode]': mode,
    }, {
      idempotencyKey: checkoutIdempotencyKey(user.id, mode, attempt.attemptId),
    });

    await recordCheckoutSession({
      userId: user.id,
      mode,
      attemptId: attempt.attemptId,
      sessionId: session.id,
      expiresAt: session.expires_at,
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error('create-checkout failed', { code: error?.code ?? 'unknown' });
    const message = /Missing server configuration/.test(error.message)
      ? 'Checkout is not configured on this deployment yet.'
      : 'Checkout could not be started. Please try again.';
    return json(500, { error: message });
  }
};

function existingSubscription() {
  return json(409, {
    error: 'A subscription already exists for this account. Manage it in Billing Portal instead.',
    usePortal: true,
  });
}
