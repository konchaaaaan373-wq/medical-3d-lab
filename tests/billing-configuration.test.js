import test from 'node:test';
import assert from 'node:assert/strict';
import {
  billingConfiguration,
  billingPortalConfiguration,
  billingReconciliationConfiguration,
  billingWebhookConfiguration,
} from '../netlify/lib/billingConfiguration.js';
import createCheckout from '../netlify/functions/create-checkout.js';
import createPortal from '../netlify/functions/create-portal.js';
import stripeWebhook from '../netlify/functions/stripe-webhook.js';

const configured = (overrides = {}) => ({
  CONTEXT: 'deploy-preview',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  SUPABASE_SECRET_KEY: 'sb_secret_example',
  STRIPE_SECRET_KEY: 'rk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  STRIPE_PRICE_PATIENT: 'price_patient',
  STRIPE_PRICE_EDUCATION: 'price_education',
  STRIPE_PRICE_COMPLETE: 'price_complete',
  ...overrides,
});

test('billing configuration: accepts a least-privilege sandbox setup in Deploy Preview', () => {
  assert.deepEqual(billingConfiguration(configured()), {
    configured: true,
    mode: 'test',
    missing: [],
    issues: [],
  });
});

test('billing configuration: rejects test keys in production and live keys in previews', () => {
  assert.deepEqual(
    billingConfiguration(configured({ CONTEXT: 'production' })).issues,
    ['test_key_in_production']
  );
  assert.deepEqual(
    billingConfiguration(configured({ STRIPE_SECRET_KEY: 'rk_live_example' })).issues,
    ['live_key_outside_production']
  );
  assert.deepEqual(
    billingConfiguration(configured({ CONTEXT: undefined }), 'production').issues,
    ['test_key_in_production']
  );
});

test('billing configuration: requires distinct, well-formed Stripe prices and webhook secret', () => {
  const result = billingConfiguration(
    configured({
      STRIPE_WEBHOOK_SECRET: 'not-a-secret',
      STRIPE_PRICE_PATIENT: 'price_same',
      STRIPE_PRICE_EDUCATION: 'price_same',
      STRIPE_PRICE_COMPLETE: 'product_wrong',
    })
  );
  assert.deepEqual(result.issues, [
    'invalid_webhook_secret',
    'invalid_price_id',
    'duplicate_price_id',
  ]);
});

test('billing configuration: never accepts the browser key as the server key', () => {
  const result = billingConfiguration(
    configured({
      SUPABASE_PUBLISHABLE_KEY: 'same-key',
      SUPABASE_SECRET_KEY: 'same-key',
    })
  );
  assert.deepEqual(result.issues, ['supabase_server_key_is_publishable']);
});

test('billing configuration: portal stays available when unrelated webhook or price config breaks', () => {
  const partial = configured({
    STRIPE_WEBHOOK_SECRET: '',
    STRIPE_PRICE_PATIENT: 'price_same',
    STRIPE_PRICE_EDUCATION: 'price_same',
  });
  assert.equal(billingConfiguration(partial).configured, false);
  assert.equal(billingPortalConfiguration(partial).configured, true);
  assert.equal(
    billingPortalConfiguration(partial, 'production').issues.includes('test_key_in_production'),
    true
  );
});

test('billing configuration: reconciliation runs without webhook and browser credentials', () => {
  const partial = configured({
    STRIPE_WEBHOOK_SECRET: '',
    SUPABASE_PUBLISHABLE_KEY: '',
  });
  assert.equal(billingConfiguration(partial).configured, false);
  assert.equal(billingReconciliationConfiguration(partial).configured, true);
  assert.equal(billingWebhookConfiguration(partial).configured, false);
});

test('billing configuration: webhook processing needs server credentials but no browser key', () => {
  const partial = configured({ SUPABASE_PUBLISHABLE_KEY: '' });
  assert.equal(billingWebhookConfiguration(partial).configured, true);
  assert.equal(
    billingWebhookConfiguration(partial, 'production').issues.includes('test_key_in_production'),
    true
  );
});

test('billing configuration: partial outages do not close Portal or webhook entry points', async () => {
  const previous = { ...process.env };
  Object.assign(
    process.env,
    configured({
      STRIPE_WEBHOOK_SECRET: 'whsec_example',
      STRIPE_PRICE_PATIENT: '',
      STRIPE_PRICE_EDUCATION: '',
      STRIPE_PRICE_COMPLETE: '',
    })
  );
  try {
    const portalResponse = await createPortal(
      new Request('https://medical3dlab.example/.netlify/functions/create-portal', {
        method: 'POST',
      }),
      { deploy: { context: 'deploy-preview' } }
    );
    assert.equal(portalResponse.status, 401, 'Portal passed its operation-specific config gate');

    process.env.SUPABASE_PUBLISHABLE_KEY = '';
    process.env.STRIPE_PRICE_PATIENT = 'price_patient';
    process.env.STRIPE_PRICE_EDUCATION = 'price_education';
    process.env.STRIPE_PRICE_COMPLETE = 'price_complete';
    const webhookResponse = await stripeWebhook(
      new Request('https://medical3dlab.example/.netlify/functions/stripe-webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'invalid' },
        body: '{}',
      }),
      { deploy: { context: 'deploy-preview' } }
    );
    assert.equal(webhookResponse.status, 400, 'Webhook does not depend on a browser key');
  } finally {
    for (const name of Object.keys(process.env)) {
      if (!(name in previous)) delete process.env[name];
    }
    Object.assign(process.env, previous);
  }
});

test('billing configuration: server refuses a test Checkout from the production deploy', async () => {
  const previous = { ...process.env };
  Object.assign(process.env, configured({ CONTEXT: undefined }));
  delete process.env.CONTEXT;
  try {
    const response = await createCheckout(
      new Request('https://medical3dlab.example/.netlify/functions/create-checkout', {
        method: 'POST',
      }),
      { deploy: { context: 'production' } }
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'Checkout is not configured safely on this deployment.',
    });
  } finally {
    for (const name of Object.keys(process.env)) {
      if (!(name in previous)) delete process.env[name];
    }
    Object.assign(process.env, previous);
  }
});
