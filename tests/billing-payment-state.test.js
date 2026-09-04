import test from 'node:test';
import assert from 'node:assert/strict';

import { applyInvoiceBillingState } from '../netlify/lib/paymentState.js';
import { classifyInvoice } from '../netlify/lib/invoices.js';

const subscription = Object.freeze({
  id: 'sub_123',
  customer: 'cus_123',
  status: 'past_due',
  metadata: { supabase_user_id: '11111111-1111-1111-1111-111111111111' },
  items: { data: [{ price: { id: 'price_complete' } }] },
});

function failedEvent() {
  return {
    id: 'evt_failed',
    type: 'invoice.payment_failed',
    created: Date.parse('2026-09-04T00:00:00.000Z') / 1000,
    data: { object: { subscription: 'sub_123', customer: 'cus_123', attempt_count: 1 } },
  };
}

test('payment state: first failure creates a fixed grace window in the active Stripe mode', async () => {
  const calls = [];
  const admin = async (path, options = {}) => {
    calls.push({ path, options });
    return [];
  };
  await applyInvoiceBillingState(failedEvent(), classifyInvoice(failedEvent()), {
    admin,
    mode: 'test',
    environment: { BILLING_PAST_DUE_GRACE_DAYS: '3', STRIPE_PRICE_COMPLETE: 'price_complete' },
    retrieveSubscription: async () => subscription,
    sync: async () => ({ synced: true }),
    now: new Date('2026-09-04T01:00:00.000Z'),
  });
  const graceWrite = calls.find((call) => call.path.includes('payment_failed_at=is.null'));
  assert.ok(graceWrite);
  assert.match(graceWrite.path, /stripe_mode=eq\.test/);
  assert.equal(graceWrite.options.body.payment_failed_at, '2026-09-04T00:00:00.000Z');
  assert.equal(graceWrite.options.body.grace_until, '2026-09-07T00:00:00.000Z');
  assert.equal(graceWrite.options.body.payment_state_event_at, '2026-09-04T00:00:00.000Z');
  assert.match(graceWrite.path, /payment_state_event_at\.lt/);
});

test('payment state: successful payment clears the failure window', async () => {
  const calls = [];
  const event = {
    type: 'invoice.paid',
    data: { object: { subscription: 'sub_123', billing_reason: 'subscription_cycle' } },
  };
  await applyInvoiceBillingState(event, classifyInvoice(event), {
    admin: async (path, options = {}) => {
      calls.push({ path, options });
      return options.prefer === 'return=representation' ? [{}] : [];
    },
    mode: 'test',
    environment: { STRIPE_PRICE_COMPLETE: 'price_complete' },
    retrieveSubscription: async () => ({ ...subscription, status: 'active' }),
    sync: async () => ({ synced: true }),
  });
  assert.ok(calls.some((call) => call.options.body?.payment_failed_at === null));
  assert.ok(calls.some((call) => call.options.body?.grace_until === null));
  assert.ok(calls.some((call) => call.path.includes('access_suspended_reason=eq.full_refund')));
  assert.ok(calls.some((call) => call.options.body?.refund_state_event_at));
  assert.ok(calls.some((call) => call.path.includes('payment_state_event_at.lte')));
});

test('payment state: an older failure cannot overwrite a newer recovery', async () => {
  const row = {
    payment_failed_at: null,
    grace_until: null,
    payment_state_event_at: null,
    refund_state_event_at: null,
  };
  const admin = async (path, options = {}) => {
    if (options.method !== 'PATCH') return [row];
    const incoming = Date.parse(
      options.body?.payment_state_event_at ?? options.body?.refund_state_event_at
    );
    const marker = path.includes('refund_state_event_at')
      ? Date.parse(row.refund_state_event_at)
      : Date.parse(row.payment_state_event_at);
    const ordered = !Number.isFinite(marker) ||
      (path.includes('.lte.') ? marker <= incoming : marker < incoming);
    if (!ordered) return [];
    if (path.includes('payment_failed_at=is.null') && row.payment_failed_at !== null) return [];
    if (path.includes('payment_failed_at=not.is.null') && row.payment_failed_at === null) return [];
    Object.assign(row, options.body);
    return options.prefer === 'return=representation' ? [row] : [];
  };
  const paid = {
    type: 'invoice.paid',
    created: Date.parse('2026-09-04T00:02:00.000Z') / 1000,
    data: {
      object: {
        subscription: 'sub_123',
        billing_reason: 'subscription_cycle',
      },
    },
  };
  const options = {
    admin,
    mode: 'test',
    environment: { STRIPE_PRICE_COMPLETE: 'price_complete' },
    retrieveSubscription: async () => ({ ...subscription, status: 'active' }),
    sync: async () => ({ synced: true }),
  };
  await applyInvoiceBillingState(paid, classifyInvoice(paid), options);
  await applyInvoiceBillingState(failedEvent(), classifyInvoice(failedEvent()), options);
  assert.equal(row.payment_failed_at, null);
  assert.equal(row.grace_until, null);
  assert.equal(row.payment_state_event_at, '2026-09-04T00:02:00.000Z');
});
