import test from 'node:test';
import assert from 'node:assert/strict';

import { stripeCommerceReadiness } from '../netlify/lib/billingReadiness.js';

const ENV = Object.freeze({
  STRIPE_SECRET_KEY: 'rk_live_example',
  STRIPE_PRICE_PATIENT: 'price_patient',
  STRIPE_PRICE_EDUCATION: 'price_education',
  STRIPE_PRICE_COMPLETE: 'price_complete',
});

const livePrice = () => ({
  active: true,
  livemode: true,
  type: 'recurring',
  unit_amount: 1980,
  currency: 'jpy',
  recurring: { interval: 'month' },
});

test('billing readiness: validates real recurring Prices and Portal capabilities', async () => {
  const paths = [];
  const result = await stripeCommerceReadiness({
    environment: ENV,
    get: async (path) => {
      paths.push(path);
      if (path.startsWith('prices/')) return { ...livePrice(), product: `prod_${path}` };
      if (path.startsWith('products/')) return { active: true, livemode: true };
      return {
        data: [{
          active: true,
          livemode: true,
          features: {
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true },
          },
        }],
      };
    },
  });
  assert.deepEqual(result, {
    ready: true,
    checks: { prices: true, products: true, portal: true },
  });
  assert.equal(paths.filter((path) => path.startsWith('prices/')).length, 3);
  assert.ok(paths.some((path) => path.includes('is_default=true')));
});

test('billing readiness: mode mismatch or missing cancellation fails closed', async () => {
  const result = await stripeCommerceReadiness({
    environment: ENV,
    get: async (path) => {
      if (path.startsWith('prices/')) return { ...livePrice(), livemode: false, product: `prod_${path}` };
      if (path.startsWith('products/')) return { active: true, livemode: false };
      return { data: [{ active: true, features: { payment_method_update: { enabled: true } } }] };
    },
  });
  assert.deepEqual(result, {
    ready: false,
    checks: { prices: false, products: false, portal: false },
  });
});
