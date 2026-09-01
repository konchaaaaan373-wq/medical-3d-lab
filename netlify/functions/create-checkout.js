import { planIsSellable } from '../../src/access/commerceReadiness.js';
import { NON_TERMINAL_SUBSCRIPTION_STATUSES } from '../../src/access/policy.js';
import {
  authenticatedUser,
  billingCustomerFor,
  json,
  priceForPlan,
  safeHash,
  stripePost,
  subscriptionsForCustomer,
  supabaseAdmin,
} from '../lib/billing.js';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });

    const body = await request.json().catch(() => ({}));
    const plan = body.plan;

    // This gate is repeated server-side intentionally. Hiding a purchase button
    // is not a security or commerce boundary: a stale client or a hand-written
    // request must not be able to create a paid subscription for professional
    // content whose current Clinical Review is stale, pending or unversioned.
    if (!planIsSellable(plan)) {
      return json(409, {
        error: 'This professional plan is temporarily unavailable pending current clinical review.',
        reviewHold: true,
      });
    }

    const price = priceForPlan(plan);
    const returnHash = safeHash(body.returnHash);

    // Fast local guard first. It catches the normal case without an extra Stripe
    // request and includes incomplete/payment-recovery states that should be
    // managed rather than duplicated.
    const statuses = [...NON_TERMINAL_SUBSCRIPTION_STATUSES].join(',');
    const existing = await supabaseAdmin(
      `billing_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&status=in.(${statuses})&select=stripe_subscription_id,status&limit=1`
    );
    if (existing?.length) return existingSubscription();

    const customer = await billingCustomerFor(user);

    // The webhook may be seconds behind Stripe. Ask Stripe itself before
    // creating Checkout so that "DB has not caught up yet" cannot become a
    // duplicate recurring subscription. The Dashboard one-subscription setting
    // is a third boundary, not a substitute for this server-side check.
    const stripeSubscriptions = await subscriptionsForCustomer(customer);
    if (stripeSubscriptions.some((subscription) => NON_TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status))) {
      return existingSubscription();
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
      allow_promotion_codes: 'true',
      client_reference_id: user.id,
      'metadata[supabase_user_id]': user.id,
      'metadata[entitlement]': plan,
      'subscription_data[metadata][supabase_user_id]': user.id,
      'subscription_data[metadata][entitlement]': plan,
    });

    return json(200, { url: session.url });
  } catch (error) {
    console.error('create-checkout', error);
    const message = /Missing server configuration/.test(error.message)
      ? 'Checkout is not configured on this deployment yet.'
      : error.message || 'Checkout could not be started.';
    return json(500, { error: message });
  }
};

function existingSubscription() {
  return json(409, {
    error: 'A subscription already exists for this account. Manage it in Billing Portal instead.',
    usePortal: true,
  });
}
