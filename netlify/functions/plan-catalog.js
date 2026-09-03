import { commerceReadiness, planIsSellable } from '../../src/access/commerceReadiness.js';
import { json, stripeGet } from '../lib/billing.js';
import { billingConfiguration } from '../lib/billingConfiguration.js';

const PLAN_PRICE_ENV = Object.freeze({
  patient: 'STRIPE_PRICE_PATIENT',
  education: 'STRIPE_PRICE_EDUCATION',
  complete: 'STRIPE_PRICE_COMPLETE',
});

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

const priceIsUsable = (price) =>
  Boolean(price?.active && price?.recurring && Number.isFinite(price?.unitAmount) && price?.currency);

/**
 * Public price catalogue for rendering the purchase surface.
 *
 * Price IDs and secrets never leave the server. Clinical-review readiness is
 * checked before Stripe is queried, so a stale/legacy professional surface does
 * not even get advertised as a priced plan. Checkout repeats the same gate and
 * therefore cannot be bypassed by calling the function directly.
 */
export default async (request, context) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });

  if (!billingConfiguration(process.env, context?.deploy?.context).configured) {
    return json(200, { billingConfigured: false, commerceReady: false, plans: {} });
  }

  const readiness = commerceReadiness();

  try {
    const entries = await Promise.all(
      Object.entries(PLAN_PRICE_ENV).map(async ([plan, envName]) => {
        if (!planIsSellable(plan, readiness)) {
          return [plan, { available: false, reason: 'clinical_review' }];
        }

        const priceId = process.env[envName];
        const price = safePrice(await stripeGet(`prices/${encodeURIComponent(priceId)}`));
        return [
          plan,
          priceIsUsable(price)
            ? { ...price, available: true }
            : { available: false, reason: 'price_unavailable' },
        ];
      })
    );

    const plans = Object.fromEntries(entries);
    const commerceReady = Object.values(plans).some((plan) => plan.available === true);

    return json(200, {
      billingConfigured: true,
      commerceReady,
      plans,
    });
  } catch (error) {
    console.error('plan-catalog', error);
    return json(200, { billingConfigured: false, commerceReady: false, plans: {} });
  }
};
