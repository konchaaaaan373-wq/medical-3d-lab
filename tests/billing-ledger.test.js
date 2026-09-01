import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  OUTCOMES,
  eventSubjects,
  ledgerRow,
  payloadDigest,
  priorOutcome,
  recentEvents,
  replayDecision,
} from '../netlify/lib/ledger.js';
import { ALERT_RULES, LEVELS, buildAlert, levelFor, notify } from '../netlify/lib/alerts.js';
import { looksSensitive } from '../src/telemetry/redact.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const webhook = read('netlify/functions/stripe-webhook.js');

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
  process.env.SUPABASE_SECRET_KEY = originalEnv.SUPABASE_SECRET_KEY;
  process.env.OPS_ALERT_WEBHOOK = originalEnv.OPS_ALERT_WEBHOOK;
});

/** Stand in for Supabase REST, returning whatever the test wants. */
function stubSupabase(rows) {
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'service-key';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return calls;
}

const subscriptionEvent = (overrides = {}) => ({
  id: 'evt_123',
  type: 'customer.subscription.updated',
  created: 1_790_000_000,
  data: {
    object: {
      id: 'sub_456',
      customer: 'cus_789',
      metadata: { supabase_user_id: 'user_1' },
      ...overrides,
    },
  },
});

test('ledger: the same event body always produces the same digest', () => {
  assert.equal(payloadDigest('{"a":1}'), payloadDigest('{"a":1}'));
  assert.notEqual(payloadDigest('{"a":1}'), payloadDigest('{"a":2}'));
  assert.match(payloadDigest(''), /^[0-9a-f]{64}$/);
});

test('ledger: a subscription event names its own subscription', () => {
  const subjects = eventSubjects(subscriptionEvent());
  assert.deepEqual(subjects, { customerId: 'cus_789', subscriptionId: 'sub_456', userId: 'user_1' });
});

test('ledger: a checkout session names the subscription it created', () => {
  const event = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        customer: { id: 'cus_1' },
        subscription: 'sub_new',
        client_reference_id: 'user_2',
      },
    },
  };
  assert.deepEqual(eventSubjects(event), {
    customerId: 'cus_1',
    subscriptionId: 'sub_new',
    userId: 'user_2',
  });
});

test('ledger: an event with nothing in it does not throw', () => {
  assert.deepEqual(eventSubjects({}), { customerId: null, subscriptionId: null, userId: null });
  assert.deepEqual(eventSubjects(null), { customerId: null, subscriptionId: null, userId: null });
});

test('ledger: a row records what happened, when, and to what', () => {
  const now = () => new Date('2026-09-01T12:00:00.000Z');
  const row = ledgerRow(subscriptionEvent(), '{"raw":true}', { now });

  assert.equal(row.stripe_event_id, 'evt_123');
  assert.equal(row.type, 'customer.subscription.updated');
  assert.equal(row.stripe_subscription_id, 'sub_456');
  assert.equal(row.outcome, 'applied');
  assert.equal(row.payload_digest, payloadDigest('{"raw":true}'));
  assert.equal(row.received_at, '2026-09-01T12:00:00.000Z');
  assert.equal(row.processed_at, '2026-09-01T12:00:00.000Z');
  assert.equal(row.event_created_at, new Date(1_790_000_000 * 1000).toISOString());
});

test('ledger: a failed row is left unprocessed, so a retry is still expected', () => {
  const row = ledgerRow(subscriptionEvent(), '{}', { outcome: 'failed', error: new Error('boom') });
  assert.equal(row.outcome, 'failed');
  assert.equal(row.processed_at, null);
  assert.equal(row.error, 'boom');
});

test('ledger: the row never carries the event payload', () => {
  const event = subscriptionEvent({
    customer_details: { email: 'nurse@clinic.example', address: { line1: '1 Road' } },
  });
  const row = ledgerRow(event, JSON.stringify(event));
  const serialised = JSON.stringify(row);
  assert.ok(!serialised.includes('nurse@clinic.example'), serialised);
  assert.ok(!serialised.includes('1 Road'));

  // The digest is a 64-character hex string and `looksSensitive` treats long
  // hex as a secret, which is right everywhere except here — so it is checked
  // separately rather than by loosening the predicate everything else uses.
  const { payload_digest: digest, ...rest } = row;
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.ok(!looksSensitive(JSON.stringify(rest)), JSON.stringify(rest));
});

test('ledger: an error message is truncated and carries no stack', () => {
  const error = new Error('x'.repeat(900));
  const row = ledgerRow(subscriptionEvent(), '{}', { outcome: 'failed', error });
  assert.equal(row.error.length, 500);
  assert.ok(!row.error.includes('at '), 'a stack names paths a billing record has no use for');
});

test('ledger: an unknown outcome is refused rather than written', () => {
  assert.throws(() => ledgerRow(subscriptionEvent(), '{}', { outcome: 'probably_fine' }), /unknown ledger outcome/);
  for (const outcome of OUTCOMES) {
    assert.doesNotThrow(() => ledgerRow(subscriptionEvent(), '{}', { outcome }));
  }
});

test('ledger: an explicit null user overrides the one in the metadata', () => {
  // Used when the account has been deleted: the metadata still names it.
  const row = ledgerRow(subscriptionEvent(), '{}', { outcome: 'ignored', userId: null });
  assert.equal(row.user_id, null);
});

test('replay: an unseen event is processed', async () => {
  stubSupabase([]);
  assert.deepEqual(await replayDecision('evt_new', '{}'), {
    process: true,
    reason: null,
    digestChanged: false,
  });
});

test('replay: an event already applied is not applied twice', async () => {
  stubSupabase([{ outcome: 'applied', payload_digest: payloadDigest('{}') }]);
  const decision = await replayDecision('evt_123', '{}');
  assert.equal(decision.process, false);
  assert.equal(decision.reason, 'duplicate');
});

test('replay: a retry of a failure runs again — that is what a retry is for', async () => {
  stubSupabase([{ outcome: 'failed', payload_digest: payloadDigest('{}') }]);
  assert.equal((await replayDecision('evt_123', '{}')).process, true);
});

test('replay: the same event id with a different body is refused, not processed', async () => {
  stubSupabase([{ outcome: 'applied', payload_digest: payloadDigest('{"original":true}') }]);
  const decision = await replayDecision('evt_123', '{"tampered":true}');
  assert.equal(decision.process, false);
  assert.equal(decision.digestChanged, true);
  assert.equal(decision.reason, 'digest_mismatch');
});

test('replay: an event with no id is treated as unseen rather than as a duplicate', async () => {
  stubSupabase([{ outcome: 'applied', payload_digest: 'x' }]);
  assert.deepEqual(await priorOutcome(''), { seen: false, outcome: null, digest: null });
});

test('ledger: a query for one subscription filters on it server-side', async () => {
  const calls = stubSupabase([]);
  await recentEvents({ subscriptionId: 'sub_456', outcome: 'failed', limit: 5 });
  assert.match(calls[0].url, /stripe_subscription_id=eq\.sub_456/);
  assert.match(calls[0].url, /outcome=eq\.failed/);
  assert.match(calls[0].url, /limit=5/);
});

test('ledger: a caller cannot ask for an unbounded page', async () => {
  const calls = stubSupabase([]);
  await recentEvents({ limit: 100_000 });
  assert.match(calls[0].url, /limit=200/);
  await recentEvents({ limit: -4 });
  assert.match(calls[1].url, /limit=1/);
});

// --- webhook wiring --------------------------------------------------------

test('webhook: every exit records an outcome', () => {
  // Applied, ignored, failed — three paths, three records. A path that returns
  // without recording is a delivery nobody can account for afterwards.
  assert.match(webhook, /recordOutcome\(event, raw, priceSupported \? 'applied' : 'unsupported_price'\)/);
  assert.match(webhook, /recordOutcome\(event, raw, 'ignored'/);
  assert.match(webhook, /recordOutcome\(event, raw, 'failed'/);
});

test('webhook: a duplicate delivery is answered 200 without being re-applied', () => {
  assert.match(webhook, /if \(!replay\.process\)/);
  assert.match(webhook, /ignored: 'duplicate'/);
});

test('webhook: a tampered replay is rejected rather than processed', () => {
  assert.match(webhook, /replay\.digestChanged/);
  assert.match(webhook, /webhook_digest_mismatch/);
  assert.match(webhook, /return json\(400/);
});

test('webhook: a ledger failure never blocks entitlement', () => {
  // Processing twice is recoverable; refusing a real event is not.
  assert.match(webhook, /billing ledger unavailable/);
  assert.match(webhook, /return \{ process: true/);
  assert.match(webhook, /billing ledger write failed/);
});

test('webhook: a failure still returns 500, so Stripe retries', () => {
  const tail = webhook.slice(webhook.indexOf("recordOutcome(event, raw, 'failed'"));
  assert.match(tail, /return json\(500/);
});

test('webhook: per-delivery state is not held in a module variable', () => {
  // A serverless container is reused; module state leaks one delivery's
  // outcome into the next one's record.
  assert.ok(!/^let unsupportedPrice/m.test(webhook));
  assert.match(webhook, /let priceSupported = true;/);
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
  assert.equal(alert.context.subscriptionId, 'sub_456');
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
  assert.equal(calls[0].body.context.priceId, 'price_x');
});
