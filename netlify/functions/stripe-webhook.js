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

  try {
    const event = JSON.parse(raw);
    const object = event.data?.object;

    if (event.type === 'checkout.session.completed' && object?.mode === 'subscription') {
      const userId = object.metadata?.supabase_user_id || object.client_reference_id;
      const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
      await upsertCustomer({
        userId,
        customerId,
        email: object.customer_details?.email ?? null,
      });
      if (object.subscription) {
        const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription.id;
        const subscription = await stripeGet(`subscriptions/${subscriptionId}`);
        await upsertSubscription(subscription);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const priceId = object.items?.data?.[0]?.price?.id ?? null;

      // Portal and Checkout are configured to expose only our known prices, but
      // entitlement must still fail closed if someone changes the subscription
      // manually in Stripe. Mark an existing row ineligible immediately rather
      // than leaving its previous paid entitlement active.
      if (!planForPrice(priceId)) {
        await supabaseAdmin(
          `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(object.id)}`,
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
      } else {
        await upsertSubscription(object);
      }

      await upsertCustomer({
        userId: object.metadata?.supabase_user_id,
        customerId: typeof object.customer === 'string' ? object.customer : object.customer?.id,
      });
    }

    return json(200, { received: true });
  } catch (error) {
    console.error('stripe-webhook', error);
    return json(500, { error: 'Webhook processing failed' });
  }
};
