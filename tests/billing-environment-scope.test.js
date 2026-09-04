import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  billingStripeMode,
  stripeEventMatchesDeployment,
} from '../netlify/lib/billingConfiguration.js';
import { stripeModeFilter } from '../netlify/lib/billing.js';

test('billing environment: keys and signed events must share one namespace', () => {
  assert.equal(billingStripeMode({ STRIPE_SECRET_KEY: 'rk_test_example' }), 'test');
  assert.equal(billingStripeMode({ STRIPE_SECRET_KEY: 'sk_live_example' }), 'live');
  assert.equal(
    stripeEventMatchesDeployment({ livemode: false }, { STRIPE_SECRET_KEY: 'rk_test_example' }),
    true
  );
  assert.equal(
    stripeEventMatchesDeployment({ livemode: true }, { STRIPE_SECRET_KEY: 'rk_test_example' }),
    false
  );
  assert.equal(stripeModeFilter('live'), 'stripe_mode=eq.live');
});

test('billing environment: database identities and event ledger are composite by Stripe mode', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260904015408_billing_environment_and_checkout_guards.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /primary key \(user_id, stripe_mode\)/i);
  assert.match(migration, /primary key \(stripe_subscription_id, stripe_mode\)/i);
  assert.match(migration, /primary key \(stripe_event_id, livemode\)/i);
  assert.match(migration, /billing_checkout_attempts/i);
  assert.match(migration, /revoke all .* from public, anon, authenticated/i);
});

test('billing environment: future writes cannot silently default into test mode', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260904020527_billing_require_explicit_stripe_mode.sql', import.meta.url),
    'utf8'
  );
  for (const column of ['stripe_mode', 'livemode']) {
    assert.match(migration, new RegExp(`alter column ${column} drop default`));
  }
  for (const table of [
    'billing_customers',
    'billing_subscriptions',
    'billing_reconciliation_runs',
    'billing_events',
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table}`));
  }
});

test('billing environment: payment, refund and dispute clocks are independent', () => {
  const migration = readFileSync(
    new URL('../supabase/migrations/20260904020833_billing_ordered_access_events.sql', import.meta.url),
    'utf8'
  );
  for (const column of [
    'payment_state_event_at',
    'full_refund_at',
    'refund_state_event_at',
    'dispute_opened_at',
    'dispute_state_event_at',
  ]) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`));
  }
});
