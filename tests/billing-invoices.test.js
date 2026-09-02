import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  INVOICE_EVENTS,
  alertForInvoice,
  classifyInvoice,
  invoiceOutcome,
  isInvoiceEvent,
} from '../netlify/lib/invoices.js';
import { ALERT_RULES, levelFor } from '../netlify/lib/alerts.js';

const webhook = readFileSync(new URL('../netlify/functions/stripe-webhook.js', import.meta.url), 'utf8');

const invoiceEvent = (type, invoice = {}) => ({
  id: 'evt_inv',
  type,
  data: {
    object: {
      id: 'in_1',
      customer: 'cus_1',
      subscription: 'sub_1',
      amount_due: 1980,
      currency: 'jpy',
      attempt_count: 1,
      ...invoice,
    },
  },
});

test('invoices: only the events this product acts on are recognised', () => {
  for (const type of INVOICE_EVENTS) assert.equal(isInvoiceEvent(type), true);
  assert.equal(isInvoiceEvent('invoice.created'), false);
  assert.equal(isInvoiceEvent('customer.subscription.updated'), false);
  assert.equal(isInvoiceEvent(undefined), false);
});

test('invoices: a renewal and a first payment are different facts', () => {
  // Stripe uses the same event type for both, and "your subscription renewed"
  // is not "your subscription started".
  const first = classifyInvoice(invoiceEvent('invoice.paid', { billing_reason: 'subscription_create' }));
  const renewal = classifyInvoice(invoiceEvent('invoice.paid', { billing_reason: 'subscription_cycle' }));
  assert.equal(first.kind, 'first_payment');
  assert.equal(renewal.kind, 'renewal');
  assert.equal(classifyInvoice(invoiceEvent('invoice.payment_succeeded')).kind, 'renewal');
});

test('invoices: a renewal is not alerted on', () => {
  // Paging on the normal case is how alerts get muted.
  assert.equal(classifyInvoice(invoiceEvent('invoice.paid', { billing_reason: 'subscription_cycle' })).alert, null);
  assert.equal(alertForInvoice('renewal', false), null);
  assert.equal(alertForInvoice('first_payment', false), null);
});

test('invoices: a first failed payment is a warning, because cards decline', () => {
  const failed = classifyInvoice(
    invoiceEvent('invoice.payment_failed', { attempt_count: 1, next_payment_attempt: 1_790_000_000 })
  );
  assert.equal(failed.kind, 'payment_failed');
  assert.equal(failed.finalAttempt, false);
  assert.equal(failed.alert, 'payment_failed');
  assert.equal(levelFor(failed.alert), 'warning');
});

test('invoices: the last failed attempt is an error — access is about to go', () => {
  const final = classifyInvoice(
    invoiceEvent('invoice.payment_failed', { attempt_count: 4, next_payment_attempt: null })
  );
  assert.equal(final.finalAttempt, true);
  assert.equal(final.attempt, 4);
  assert.equal(final.alert, 'payment_final_failure');
  assert.equal(levelFor(final.alert), 'error');
});

test('invoices: an uncollectible invoice is an error', () => {
  const written_off = classifyInvoice(invoiceEvent('invoice.marked_uncollectible'));
  assert.equal(written_off.kind, 'uncollectible');
  assert.equal(written_off.alert, 'payment_uncollectible');
  assert.equal(levelFor('payment_uncollectible'), 'error');
});

test('invoices: a card needing authentication asks for attention, not a page', () => {
  const action = classifyInvoice(invoiceEvent('invoice.payment_action_required'));
  assert.equal(action.kind, 'action_required');
  assert.equal(levelFor(action.alert), 'warning');
});

test('invoices: every alert an invoice can raise is a declared alert', () => {
  for (const type of INVOICE_EVENTS) {
    const { alert } = classifyInvoice(invoiceEvent(type, { next_payment_attempt: null }));
    if (alert) assert.ok(alert in ALERT_RULES, `${alert} is not in the alert policy`);
  }
});

test('invoices: the identifiers needed to find the customer are carried through', () => {
  const classification = classifyInvoice(invoiceEvent('invoice.payment_failed'));
  assert.equal(classification.subscriptionId, 'sub_1');
  assert.equal(classification.customerId, 'cus_1');
  assert.equal(classification.amountDue, 1980);
  assert.equal(classification.currency, 'jpy');
});

test('invoices: an expanded object rather than an id is handled the same', () => {
  const classification = classifyInvoice(
    invoiceEvent('invoice.paid', { customer: { id: 'cus_expanded' }, subscription: { id: 'sub_expanded' } })
  );
  assert.equal(classification.customerId, 'cus_expanded');
  assert.equal(classification.subscriptionId, 'sub_expanded');
});

test('invoices: a malformed event is classified rather than thrown at', () => {
  const classification = classifyInvoice({});
  assert.equal(classification.kind, 'other');
  assert.equal(classification.subscriptionId, null);
  assert.equal(classification.attempt, 0);
  assert.equal(classification.alert, null);
  assert.doesNotThrow(() => classifyInvoice(null));
});

test('invoices: what we saw and acted on is applied; what we saw and skipped is ignored', () => {
  assert.equal(invoiceOutcome(classifyInvoice(invoiceEvent('invoice.paid'))), 'applied');
  assert.equal(invoiceOutcome(classifyInvoice({ type: 'invoice.created' })), 'ignored');
});

test('ledger: an invoice event names the object it belongs to', () => {
  // The ledger records `stripeEventObjectId`, so a renewal can be found when
  // somebody asks what happened to their subscription. That helper lives in
  // netlify/lib/billing.js with the rest of the claim/finish ledger.
  const classified = classifyInvoice(invoiceEvent('invoice.paid'));
  assert.equal(classified.subscriptionId, 'sub_1');
  assert.equal(classified.customerId, 'cus_1');
});

test('webhook: invoice events are answered without touching entitlement state', () => {
  assert.match(webhook, /isInvoiceEvent\(event\.type\)/);
  const block = webhook.slice(webhook.indexOf('isInvoiceEvent(event.type)'));
  const body = block.slice(0, block.indexOf("unsupported_event"));
  assert.ok(
    !/syncSubscription|upsertSubscription|supabaseAdmin/.test(body),
    'entitlement already follows the subscription events'
  );
});

test('webhook: a payment failure raises the alert its classification asked for', () => {
  assert.match(webhook, /if \(invoice\.alert\)/);
  assert.match(webhook, /await notify\(invoice\.alert/);
});
