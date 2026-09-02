/**
 * The billing journeys, replayed against the deployed webhook handler.
 *
 * `netlify/lib/journeys.js` says what must happen; this makes it happen. The
 * handler under test is the one Netlify deploys — nothing is injected, nothing
 * is mocked at the module boundary — and it reaches a real HTTP surface that
 * `tests/helpers/billingSandbox.js` happens to be serving.
 *
 * What this cannot do is prove Stripe behaves the way the journeys say it
 * does. That is what the credential-bearing sandbox run is for. What it does
 * prove is that *given* Stripe behaving that way, this product's access,
 * ledger and alerts come out right — which is the half that regresses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import stripeWebhook from '../netlify/functions/stripe-webhook.js';
import {
  BILLING_JOURNEYS,
  JOURNEY_CUSTOMER,
  JOURNEY_PRICES,
  JOURNEY_USER,
  journeyById,
  validateJourneys,
} from '../netlify/lib/journeys.js';
import { ALERT_RULES } from '../netlify/lib/alerts.js';
import { grantsFromSubscriptions } from '../src/access/policy.js';
import { createBillingSandbox } from './helpers/billingSandbox.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_PATIENT',
  'STRIPE_PRICE_EDUCATION',
  'STRIPE_PRICE_COMPLETE',
  'OPS_ALERT_WEBHOOK',
];

function configure() {
  process.env.SUPABASE_URL = 'https://journey.supabase.test';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_journey';
  process.env.STRIPE_SECRET_KEY = 'sk_test_journey';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_journey';
  process.env.STRIPE_PRICE_PATIENT = JOURNEY_PRICES.patient;
  process.env.STRIPE_PRICE_EDUCATION = JOURNEY_PRICES.education;
  process.env.STRIPE_PRICE_COMPLETE = JOURNEY_PRICES.complete;
  process.env.OPS_ALERT_WEBHOOK = 'https://alerts.journey.test/hook';
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of ENV_KEYS) {
    if (originalEnv[name] == null) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

/** Sign a delivery exactly as Stripe does, so the handler's check is exercised. */
function deliver(event) {
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return stripeWebhook(
    new Request('https://medical3dlab.netlify.app/.netlify/functions/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
      body,
    })
  );
}

/** Merge a step's `subscription` patch onto what Stripe already holds. */
function applySubscriptionPatch(sandbox, patch, currentId) {
  if (!patch) return currentId;
  const id = patch.id ?? currentId;
  const existing = sandbox.subscriptions.get(id) ?? {};
  sandbox.subscriptions.set(id, { ...existing, ...patch, id });
  return id;
}

/** The product's own answer to "can this person open the paid mode?" */
const accessFor = (sandbox) =>
  grantsFromSubscriptions(
    sandbox.tables.billing_subscriptions.map((row) => ({
      entitlement: row.entitlement,
      status: row.status,
    }))
  ).sort();

let eventCounter = 0;
const nextEventId = () => `evt_journey_${(eventCounter += 1)}`;

/**
 * Run one journey (and whatever it inherits) on a fresh bench.
 *
 * @returns {{sandbox: ReturnType<typeof createBillingSandbox>, log: object[]}}
 */
async function run(journey) {
  const sandbox = createBillingSandbox().install();
  sandbox.users.add(JOURNEY_USER);
  const log = [];
  let currentId = null;

  // Guarded as well as validated: `validateJourneys` rejects a cycle, and this
  // refuses to loop on one anyway, because the failure mode is a suite that
  // hangs rather than one that fails.
  const chain = [];
  const seen = new Set();
  for (let node = journey; node && !seen.has(node.id); node = journeyById(node.inherits)) {
    seen.add(node.id);
    chain.unshift(node);
  }

  for (const stage of chain) {
    for (const step of stage.steps) {
      currentId = applySubscriptionPatch(sandbox, step.subscription, currentId);
      const subscription = sandbox.subscriptions.get(currentId);

      const object = step.event.invoice ?? step.event.object ?? subscription;
      const event = {
        id: nextEventId(),
        type: step.event.type,
        livemode: false,
        data: { object },
      };

      const before = sandbox.alerts.length;
      const response = await deliver(event);
      const subscriptionId = step.expect?.subscriptionId ?? currentId;
      // Snapshot, not a reference. A journey is a sequence, and the state that
      // matters at step two is the state at step two — reading the tables
      // after the run would assert the last step five times over. That mistake
      // made three journeys pass their own assertions for the wrong reason
      // before it was caught.
      log.push({
        stage: stage.id,
        step,
        event,
        subscriptionId,
        status: response.status,
        body: await response.json(),
        alerts: sandbox.alerts.slice(before),
        ledger: { ...(sandbox.ledgerFor(event.id) ?? {}) },
        row: { ...(sandbox.entitlementFor(subscriptionId) ?? {}) },
        access: accessFor(sandbox),
      });
    }
  }
  return { sandbox, log };
}

// --- the declaration -------------------------------------------------------

test('journeys: the declaration is internally consistent', () => {
  const problems = validateJourneys();
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('journeys: an inheritance cycle is rejected rather than hung on', () => {
  // The runner walks the inheritance chain to build a journey's setup, so a
  // cycle would spin forever — a suite that hangs, which tells nobody
  // anything, rather than one that fails.
  const stub = (id, inherits) => ({
    id,
    title: id,
    why: 'a declaration long enough to satisfy the validator, and no shorter.',
    inherits,
    steps: [{ label: 's', event: { type: 'customer.subscription.updated' }, expect: {} }],
  });
  const pair = [stub('a', 'b'), stub('b', 'a'), ...BILLING_JOURNEYS];
  assert.ok(validateJourneys(pair).some((problem) => /loops back/.test(problem)));
  const itself = [stub('c', 'c'), ...BILLING_JOURNEYS];
  assert.ok(validateJourneys(itself).some((problem) => /loops back/.test(problem)));
});

test('journeys: every alert a journey expects is one the alert policy knows', () => {
  for (const journey of BILLING_JOURNEYS) {
    for (const step of journey.steps) {
      for (const [index, kind] of (step.expect.alerts ?? []).entries()) {
        assert.ok(ALERT_RULES[kind], `"${kind}" is expected by ${journey.id} but has no severity`);
        const level = step.expect.alertLevels?.[index];
        if (level) {
          assert.equal(
            ALERT_RULES[kind],
            level,
            `${journey.id} expects "${kind}" at ${level}; the policy says ${ALERT_RULES[kind]}`,
          );
        }
      }
    }
  }
});

// --- the journeys ----------------------------------------------------------

for (const journey of BILLING_JOURNEYS) {
  test(`journey: ${journey.title}`, async (t) => {
    configure();
    const { sandbox, log } = await run(journey);
    t.after(() => sandbox.restore());

    for (const entry of log) {
      // Only the journey under test is asserted; the steps it inherits are
      // setup, and a failure in them is reported by that journey's own test.
      if (entry.stage !== journey.id) continue;
      const where = `${journey.id} — ${entry.step.label}`;
      const expected = entry.step.expect;

      assert.equal(entry.status, 200, `${where}: the delivery was not acknowledged`);
      assert.ok(entry.ledger.stripe_event_id, `${where}: the event left no ledger row`);
      assert.equal(
        entry.ledger.status,
        expected.outcome,
        `${where}: the ledger says ${entry.ledger.status}`,
      );
      if (expected.resultCode) {
        assert.equal(entry.ledger.result_code, expected.resultCode, where);
      }

      if (expected.status || expected.periodEnd || expected.cancelAtPeriodEnd !== undefined) {
        const row = entry.row;
        assert.ok(row.stripe_subscription_id, `${where}: no local row for ${entry.subscriptionId}`);
        if (expected.status) assert.equal(row.status, expected.status, `${where}: status`);
        if (expected.periodEnd) {
          assert.equal(
            row.current_period_end,
            new Date(expected.periodEnd * 1000).toISOString(),
            `${where}: the period end did not move`,
          );
        }
        if (expected.cancelAtPeriodEnd !== undefined) {
          assert.equal(row.cancel_at_period_end, expected.cancelAtPeriodEnd, where);
        }
      }

      if (expected.access) {
        assert.deepEqual(entry.access, [...expected.access].sort(), `${where}: access`);
      }

      assert.deepEqual(
        entry.alerts.map((alert) => alert.kind),
        expected.alerts ?? [],
        `${where}: alerts`,
      );
    }
  });
}

// --- the properties every journey shares -----------------------------------

test('journeys: no journey ever writes a Stripe payload into the ledger', async (t) => {
  configure();
  const { sandbox } = await run(journeyById('payment-failure-final'));
  t.after(() => sandbox.restore());

  for (const row of sandbox.tables.billing_events) {
    // The ledger exists to make redelivery safe, not to become a second copy
    // of a payment processor's records inside a database this product owns.
    assert.deepEqual(
      Object.keys(row).filter((key) => /payload|invoice|card|email/.test(key)),
      [],
      `the ledger row for ${row.stripe_event_id} carries payment data`,
    );
  }
});

test('journeys: a redelivered event is acknowledged without repeating its work', async (t) => {
  configure();
  const sandbox = createBillingSandbox().install();
  t.after(() => sandbox.restore());
  sandbox.users.add(JOURNEY_USER);
  sandbox.subscriptions.set('sub_journey', {
    id: 'sub_journey',
    customer: JOURNEY_CUSTOMER,
    status: 'active',
    current_period_end: 1_800_000_000,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: JOURNEY_PRICES.complete } }] },
    metadata: { supabase_user_id: JOURNEY_USER },
  });

  const event = {
    id: 'evt_redelivered',
    type: 'customer.subscription.updated',
    livemode: false,
    data: { object: sandbox.subscriptions.get('sub_journey') },
  };

  const first = await (await deliver(event)).json();
  assert.equal(first.received, true);
  assert.notEqual(first.duplicate, true);

  const second = await (await deliver(event)).json();
  assert.equal(second.duplicate, true, 'the second delivery was processed again');
  assert.equal(sandbox.tables.billing_events.length, 1);
  assert.equal(sandbox.ledgerFor('evt_redelivered').attempt_count, 1);
});

test('journeys: a webhook for a deleted account never recreates its billing rows', async (t) => {
  configure();
  const sandbox = createBillingSandbox().install();
  t.after(() => sandbox.restore());
  // The identity is gone: the customer deleted their account while a webhook
  // was in flight. This is the ordinary race, not an attack.
  sandbox.subscriptions.set('sub_gone', {
    id: 'sub_gone',
    customer: 'cus_gone',
    status: 'active',
    current_period_end: 1_800_000_000,
    items: { data: [{ price: { id: JOURNEY_PRICES.complete } }] },
    metadata: { supabase_user_id: JOURNEY_USER },
  });

  const body = await (
    await deliver({
      id: 'evt_deleted_user',
      type: 'customer.subscription.updated',
      livemode: false,
      data: { object: sandbox.subscriptions.get('sub_gone') },
    })
  ).json();

  assert.equal(body.ignored, 'deleted_user');
  assert.deepEqual(sandbox.tables.billing_subscriptions, []);
  assert.deepEqual(sandbox.tables.billing_customers, []);
  assert.deepEqual(sandbox.alertKinds(), ['deleted_user_event']);
});

test('journeys: a price this deployment does not sell never grants access', async (t) => {
  configure();
  const sandbox = createBillingSandbox().install();
  t.after(() => sandbox.restore());
  sandbox.users.add(JOURNEY_USER);
  sandbox.subscriptions.set('sub_unknown_price', {
    id: 'sub_unknown_price',
    customer: JOURNEY_CUSTOMER,
    status: 'active',
    current_period_end: 1_800_000_000,
    items: { data: [{ price: { id: 'price_from_another_deployment' } }] },
    metadata: { supabase_user_id: JOURNEY_USER },
  });

  await deliver({
    id: 'evt_unknown_price',
    type: 'customer.subscription.updated',
    livemode: false,
    data: { object: sandbox.subscriptions.get('sub_unknown_price') },
  });

  // Fail closed: an unknown price is not a reason to guess a plan.
  assert.deepEqual(accessFor(sandbox), ['free']);
});
