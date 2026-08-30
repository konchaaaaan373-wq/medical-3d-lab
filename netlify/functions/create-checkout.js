import {
  authenticatedUser,
  billingCustomerFor,
  json,
  priceForPlan,
  safeHash,
  stripePost,
} from '../lib/billing.js';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });

    const body = await request.json().catch(() => ({}));
    const plan = body.plan;
    const price = priceForPlan(plan);
    const customer = await billingCustomerFor(user);
    const origin = new URL(request.url).origin;
    const returnHash = safeHash(body.returnHash);

    const session = await stripePost('checkout/sessions', {
      mode: 'subscription',
      customer,
      'line_items[0][price]': price,
      'line_items[0][quantity]': 1,
      success_url: `${origin}/?billing=success&session_id={CHECKOUT_SESSION_ID}${returnHash}`,
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
