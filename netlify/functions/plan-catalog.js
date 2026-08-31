import { json, stripeGet } from '../lib/billing.js';

const PLAN_PRICE_ENV = Object.freeze({
  patient: 'STRIPE_PRICE_PATIENT',
  education: 'STRIPE_PRICE_EDUCATION',
  complete: 'STRIPE_PRICE_COMPLETE',
});

const hasAny = (...names) => names.some((name) => Boolean(process.env[name]));

function billingConfigured() {
  return (
    Boolean(process.env.SUPABASE_URL) &&
    hasAny('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY') &&
    hasAny('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY') &&
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    Boolean(process.env.STRIPE_WEBHOOK_SECRET) &&
    Object.values(PLAN_PRICE_ENV).every((name) => Boolean(process.env[name]))
  );
}

const safePrice = (price) => ({
  active: Boolean(price?.active),
  currency: price?.currency ?? null,
  unitAmount: Number.isFinite(price?.unit_amount) ? price.unit_amount : null,
  recurring: price?.recurring
    ? {
        interval: price.recurring.interval ?? null,
        intervalCount: Number.isFinite(price.recurring.interval_count) ? price.recurring.interval_count : 1,
      }
    : null,
});

/**
 * Public price catalogue for rendering the purchase surface.
 *
 * No secret, Customer, Subscription or Price ID is returned. Checkout still
 * selects its Price exclusively on the server from the plan name; browser price
 * data is display-only and cannot change what Stripe charges.
 */
export default async (request) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });

  if (!billingConfigured()) {
    return json(200, { billingConfigured: false, plans: {} });
  }

  try {
    const entries = await Promise.all(
      Object.entries(PLAN_PRICE_ENV).map(async ([plan, envName]) => {
        const priceId = process.env[envName];
        const price = await stripeGet(`prices/${encodeURIComponent(priceId)}`);
        return [plan, safePrice(price)];
      })
    );

    const plans = Object.fromEntries(entries);
    const usable = Object.values(plans).every(
      (price) => price.active && price.recurring && Number.isFinite(price.unitAmount) && Boolean(price.currency)
    );

    return json(200, {
      billingConfigured: usable,
      plans: usable ? plans : {},
    });
  } catch (error) {
    console.error('plan-catalog', error);
    // Price display and Checkout readiness fail closed together. Free models are
    // unaffected; users are never shown a purchase CTA with an unknown price.
    return json(200, { billingConfigured: false, plans: {} });
  }
};
