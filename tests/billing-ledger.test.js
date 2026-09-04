import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ALERT_RULES, LEVELS, buildAlert, levelFor, notify } from '../netlify/lib/alerts.js';
import { looksSensitive } from '../src/telemetry/redact.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const webhook = read('netlify/functions/stripe-webhook.js');

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.OPS_ALERT_WEBHOOK = originalEnv.OPS_ALERT_WEBHOOK;
});

// --- the ledger -------------------------------------------------------------

test('ledger: the webhook claims an event before doing any work', () => {
  // The ledger itself is `claimBillingEvent`/`finishBillingEvent` in
  // netlify/lib/billing.js, with its own tests. What matters here is that the
  // webhook actually uses it on every path: a delivery that is processed
  // without being claimed can be processed twice by two concurrent workers.
  assert.match(webhook, /claimBillingEvent\(event\)/);
  assert.match(webhook, /already_processed/);
  assert.match(webhook, /finishBillingEvent\(event\.id/);
});

test('ledger: a failed delivery is recorded as failed and stays retryable', () => {
  const failure = webhook.slice(webhook.indexOf("status: 'failed'"));
  assert.match(failure, /processing_error/);
  assert.match(failure, /return json\(500/, 'Stripe has to be told to retry');
});

// --- webhook wiring --------------------------------------------------------

test('webhook: every delivery is claimed, finished, and given an outcome', () => {
  // Three exits, three outcomes. A path that returns without finishing its
  // claim leaves the event marked `processing` until the reclaim window opens,
  // which turns a success into a retry.
  assert.match(webhook, /status: outcome\.status/);
  assert.match(webhook, /status: 'failed'/);
  assert.match(webhook, /return \{ status: 'ignored', reason: 'unsupported_event' \}/);
});

test('webhook: a duplicate delivery is answered 200 without being re-applied', () => {
  assert.match(webhook, /already_processed/);
  assert.match(webhook, /duplicate: true/);
});

test('webhook: a claim that expired mid-flight is not acknowledged', () => {
  // Another attempt owns the event by then; acknowledging would discard its work.
  assert.match(webhook, /claim expired/);
});

test('webhook: renewal and payment failure are handled, not dropped as unsupported', () => {
  // Entitlement follows the subscription events; these carry the two facts
  // those cannot — that a renewal happened at all, and that a payment is
  // failing with a known number of attempts left.
  assert.match(webhook, /isInvoiceEvent\(event\.type\)/);
  assert.match(webhook, /classifyInvoice\(event\)/);
  assert.match(webhook, /invoice_\$\{invoice\.kind\}/);
});

test('webhook: an invoice branch applies bounded payment state', () => {
  const branch = webhook.slice(webhook.indexOf('isInvoiceEvent(event.type)'));
  const body = branch.slice(0, branch.indexOf('unsupported_event'));
  assert.match(body, /applyInvoiceBillingState/);
});

test('webhook: the failures worth waking somebody for raise an alert', () => {
  assert.match(webhook, /notify\('webhook_failed'/);
  assert.match(webhook, /notify\('deleted_user_event'/);
  assert.match(webhook, /await notify\(invoice\.alert/);
});

// --- alerts ----------------------------------------------------------------

test('alerts: the policy says what is worth waking somebody for', () => {
  assert.equal(levelFor('webhook_failed'), 'critical');
  assert.equal(levelFor('webhook_digest_mismatch'), 'critical');
  assert.equal(levelFor('reconcile_drift'), 'error');
  assert.equal(levelFor('deleted_user_event'), 'info');
  // An unknown kind is a warning rather than silence.
  assert.equal(levelFor('something_new'), 'warning');
  for (const level of Object.values(ALERT_RULES)) assert.ok(LEVELS.includes(level));
});

test('alerts: nothing personal travels in an alert', () => {
  const alert = buildAlert('webhook_failed', {
    error: 'charge failed for nurse@clinic.example using sk_live_abcd1234efgh',
    subscriptionId: 'sub_456',
  });
  assert.ok(!looksSensitive(JSON.stringify(alert)), JSON.stringify(alert));
  assert.match(alert.context.subscriptionId, /^ref:[a-f0-9]{16}$/);
  assert.doesNotMatch(JSON.stringify(alert), /sub_456|nurse@clinic\.example|sk_live/);
  assert.notEqual(
    alert.context.subscriptionId,
    buildAlert('webhook_failed', { subscriptionId: 'sub_789' }).context.subscriptionId
  );
  assert.equal(alert.level, 'critical');
});

test('alerts: a long message is truncated before it is sent', () => {
  const alert = buildAlert('reconcile_drift', { detail: 'y'.repeat(1000) });
  assert.equal(alert.context.detail.length, 300);
});

test('alerts: an absent value is left out rather than sent as null', () => {
  const alert = buildAlert('reconcile_drift', { subscriptionId: null, checked: 0 });
  assert.deepEqual(Object.keys(alert.context), ['checked']);
});

test('alerts: with no channel configured it reports rather than throws', async () => {
  delete process.env.OPS_ALERT_WEBHOOK;
  const result = await notify('reconcile_clean', { checked: 3 });
  assert.equal(result.sent, false);
  assert.equal(result.alert.kind, 'reconcile_clean');
});

test('alerts: a channel that is down cannot turn into an unhandled failure', async () => {
  process.env.OPS_ALERT_WEBHOOK = 'https://alerts.example/hook';
  globalThis.fetch = async () => {
    throw new Error('alerting is down');
  };
  const result = await notify('webhook_failed', { eventId: 'evt_1' });
  assert.equal(result.sent, false);
});

test('alerts: outbound delivery has a deadline', () => {
  const alerts = read('netlify/lib/alerts.js');
  assert.match(alerts, /AbortSignal\.timeout\(ALERT_TIMEOUT_MS\)/);
});

test('alerts: a configured channel receives the built alert as JSON', async () => {
  process.env.OPS_ALERT_WEBHOOK = 'https://alerts.example/hook';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    return new Response('', { status: 200 });
  };
  const result = await notify('unsupported_price', { subscriptionId: 'sub_9', priceId: 'price_x' });
  assert.equal(result.sent, true);
  assert.equal(calls[0].url, 'https://alerts.example/hook');
  assert.equal(calls[0].body.level, 'error');
  assert.match(calls[0].body.context.priceId, /^ref:[a-f0-9]{16}$/);
  assert.doesNotMatch(JSON.stringify(calls[0].body), /price_x|sub_9/);
});
