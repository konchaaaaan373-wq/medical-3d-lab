import { stripeGet } from './billing.js';
import { billingStripeMode } from './billingConfiguration.js';

const CACHE_MS = 5 * 60 * 1000;
let cached = null;

const PRICE_ENV = Object.freeze([
  'STRIPE_PRICE_PATIENT',
  'STRIPE_PRICE_EDUCATION',
  'STRIPE_PRICE_COMPLETE',
]);

function priceReady(price, livemode) {
  return Boolean(
    price?.active &&
      price?.type === 'recurring' &&
      price?.recurring?.interval &&
      Number.isFinite(price?.unit_amount) &&
      price?.currency &&
      Boolean(price?.livemode) === livemode
  );
}

function productReady(product, livemode) {
  return Boolean(product?.active && Boolean(product?.livemode) === livemode);
}

function portalReady(configuration, livemode) {
  return Boolean(
    configuration?.active &&
      Boolean(configuration?.livemode) === livemode &&
      configuration?.features?.payment_method_update?.enabled &&
      configuration?.features?.subscription_cancel?.enabled
  );
}

/** Performs real, non-mutating Stripe resource checks without returning IDs. */
export async function stripeCommerceReadiness({
  get = stripeGet,
  environment = process.env,
} = {}) {
  const mode = billingStripeMode(environment);
  const livemode = mode === 'live';
  try {
    const [prices, portal] = await Promise.all([
      Promise.all(PRICE_ENV.map((name) => get(`prices/${encodeURIComponent(environment[name])}`))),
      // Portal Sessions omit `configuration`, so Stripe will use the default.
      // A healthy non-default configuration must not mask a broken default.
      get('billing_portal/configurations?active=true&is_default=true&limit=10'),
    ]);
    const productIds = [...new Set(prices.map((price) =>
      typeof price?.product === 'string' ? price.product : price?.product?.id
    ).filter(Boolean))];
    const products = await Promise.all(
      productIds.map((id) => get(`products/${encodeURIComponent(id)}`))
    );
    const checks = {
      prices: prices.every((price) => priceReady(price, livemode)),
      products:
        productIds.length === PRICE_ENV.length &&
        products.every((product) => productReady(product, livemode)),
      portal: (portal?.data ?? []).some((configuration) => portalReady(configuration, livemode)),
    };
    return { ready: checks.prices && checks.products && checks.portal, checks };
  } catch {
    return { ready: false, checks: { prices: false, products: false, portal: false } };
  }
}

export async function cachedStripeCommerceReadiness(options = {}) {
  const now = options.now ?? new Date();
  const environment = options.environment ?? process.env;
  const mode = billingStripeMode(environment);
  const cacheKey = [mode, ...PRICE_ENV.map((name) => environment[name] ?? '')].join(':');
  if (cached && cached.key === cacheKey && now.getTime() < cached.expiresAt) return cached.value;
  const value = await stripeCommerceReadiness(options);
  cached = { key: cacheKey, expiresAt: now.getTime() + CACHE_MS, value };
  return value;
}

export function clearStripeReadinessCache() {
  cached = null;
}
