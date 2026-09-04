import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DRIFT_KINDS,
  NON_TERMINAL,
  findDrift,
  normaliseLocal,
  normaliseStripe,
  reconciliationPlan,
} from '../netlify/lib/reconcile.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const endpoint = read('netlify/functions/billing-reconcile.js');

const originalEnv = { ...process.env };
process.env.STRIPE_PRICE_PATIENT = 'price_patient';
process.env.STRIPE_PRICE_EDUCATION = 'price_education';
process.env.STRIPE_PRICE_COMPLETE = 'price_complete';

test.after(() => {
  process.env.STRIPE_PRICE_PATIENT = originalEnv.STRIPE_PRICE_PATIENT;
  process.env.STRIPE_PRICE_EDUCATION = originalEnv.STRIPE_PRICE_EDUCATION;
  process.env.STRIPE_PRICE_COMPLETE = originalEnv.STRIPE_PRICE_COMPLETE;
});

const PERIOD_END = 1_790_000_000;
const PERIOD_END_ISO = new Date(PERIOD_END * 1000).toISOString();

const stripeSub = (overrides = {}) => ({
  id: 'sub_1',
  customer: 'cus_1',
  status: 'active',
  current_period_end: PERIOD_END,
  cancel_at_period_end: false,
  items: { data: [{ price: { id: 'price_patient' } }] },
  ...overrides,
});

const localRow = (overrides = {}) => ({
  stripe_subscription_id: 'sub_1',
  stripe_customer_id: 'cus_1',
  user_id: 'user_1',
  entitlement: 'patient',
  status: 'active',
  price_id: 'price_patient',
  current_period_end: PERIOD_END_ISO,
  cancel_at_period_end: false,
  ...overrides,
});

const kinds = (drift) => drift.map((item) => item.kind).sort();

test('reconcile: identical state produces no drift', () => {
  assert.deepEqual(findDrift([localRow()], [stripeSub()]), []);
  assert.equal(reconciliationPlan([]).clean, true);
});

test('reconcile: a Stripe subscription is normalised to the fields we store', () => {
  assert.deepEqual(normaliseStripe(stripeSub()), {
    id: 'sub_1',
    customerId: 'cus_1',
    status: 'active',
    priceId: 'price_patient',
    entitlement: 'patient',
    currentPeriodEnd: PERIOD_END_ISO,
    cancelAtPeriodEnd: false,
  });
});

test('reconcile: a Stripe epoch and a stored timestamp compare equal', () => {
  // The two sides store the same instant in different formats; comparing the
  // raw values would report drift on every single subscription.
  assert.equal(normaliseStripe(stripeSub()).currentPeriodEnd, normaliseLocal(localRow()).currentPeriodEnd);
});

test('reconcile: a status disagreement is an error', () => {
  const drift = findDrift([localRow()], [stripeSub({ status: 'canceled' })]);
  const status = drift.find((item) => item.kind === 'status');
  assert.deepEqual(status.detail, { local: 'active', stripe: 'canceled' });
  assert.equal(status.severity, 'error');
});

test('reconcile: an entitlement disagreement is an error — somebody has the wrong thing', () => {
  const drift = findDrift(
    [localRow({ entitlement: 'patient' })],
    [stripeSub({ items: { data: [{ price: { id: 'price_complete' } }] } })]
  );
  const entitlement = drift.find((item) => item.kind === 'entitlement');
  assert.deepEqual(entitlement.detail, { local: 'patient', stripe: 'complete' });
  assert.equal(entitlement.severity, DRIFT_KINDS.entitlement);
});

test('reconcile: a renewal date or cancellation flag disagreement is a warning', () => {
  const drift = findDrift([localRow()], [stripeSub({ cancel_at_period_end: true })]);
  assert.deepEqual(kinds(drift), ['period']);
  assert.equal(drift[0].severity, 'warning');
});

test('reconcile: a live local row Stripe has never heard of is an error', () => {
  const drift = findDrift([localRow()], []);
  assert.deepEqual(kinds(drift), ['missing_in_stripe']);
  assert.equal(drift[0].severity, 'error');
});

test('reconcile: a terminal local row Stripe no longer returns is history, not drift', () => {
  assert.deepEqual(findDrift([localRow({ status: 'canceled' })], []), []);
  for (const status of NON_TERMINAL) {
    assert.equal(findDrift([localRow({ status })], []).length, 1, `${status} should be checked`);
  }
});

test('reconcile: a live Stripe subscription with no local row is the worst case', () => {
  // Somebody is paying and has no access, and nothing in the product looks for
  // a row that is not there.
  const drift = findDrift([], [stripeSub()]);
  assert.deepEqual(kinds(drift), ['missing_locally']);
  assert.equal(drift[0].severity, 'error');
  assert.equal(drift[0].detail.customerId, 'cus_1');
});

test('reconcile: a terminal Stripe subscription with no local row is not drift', () => {
  assert.deepEqual(findDrift([], [stripeSub({ status: 'canceled' })]), []);
});

test('reconcile: a price this deployment does not sell is reported, not mapped', () => {
  const drift = findDrift([localRow()], [stripeSub({ items: { data: [{ price: { id: 'price_unknown' } }] } })]);
  const unsupported = drift.find((item) => item.kind === 'unsupported_price');
  assert.equal(unsupported.detail.priceId, 'price_unknown');
  // And it must not also be reported as an ordinary entitlement mismatch.
  assert.ok(!drift.some((item) => item.kind === 'entitlement'));
});

test('reconcile: several disagreements about one subscription are all reported', () => {
  const drift = findDrift(
    [localRow()],
    [stripeSub({ status: 'past_due', cancel_at_period_end: true, items: { data: [{ price: { id: 'price_complete' } }] } })]
  );
  assert.deepEqual(kinds(drift), ['entitlement', 'period', 'status']);
});

test('plan: what Stripe can settle is repaired, what it cannot is escalated', () => {
  const drift = findDrift([localRow()], [stripeSub({ status: 'past_due' })]);
  const plan = reconciliationPlan(drift);
  assert.deepEqual(plan.repair.map((item) => item.kind), ['status']);
  assert.deepEqual(plan.escalate, []);
  assert.deepEqual(plan.subscriptionIds, ['sub_1']);
});

test('plan: a local row Stripe has never heard of is never deleted automatically', () => {
  // One empty read is not enough evidence to destroy the record of a payment.
  const plan = reconciliationPlan(findDrift([localRow()], []));
  assert.deepEqual(plan.escalate.map((item) => item.kind), ['missing_in_stripe']);
  assert.deepEqual(plan.repair, []);
});

test('plan: an unsupported price goes to a human, not to a repair', () => {
  const drift = findDrift([localRow()], [stripeSub({ items: { data: [{ price: { id: 'price_unknown' } }] } })]);
  const plan = reconciliationPlan(drift);
  assert.ok(plan.escalate.some((item) => item.kind === 'unsupported_price'));
  assert.ok(!plan.repair.some((item) => item.kind === 'unsupported_price'));
});

test('plan: several disagreements about one subscription cost one write', () => {
  const drift = findDrift(
    [localRow()],
    [stripeSub({ status: 'past_due', cancel_at_period_end: true, items: { data: [{ price: { id: 'price_complete' } }] } })]
  );
  const plan = reconciliationPlan(drift);
  assert.equal(plan.repair.length, 3);
  assert.deepEqual(plan.subscriptionIds, ['sub_1']);
});

test('plan: the summary names the worst thing found', () => {
  assert.equal(reconciliationPlan([]).summary.worst, 'clean');
  assert.equal(reconciliationPlan(findDrift([localRow()], [stripeSub({ cancel_at_period_end: true })])).summary.worst, 'warning');
  assert.equal(reconciliationPlan(findDrift([localRow()], [stripeSub({ status: 'canceled' })])).summary.worst, 'error');
});

// --- the endpoint ----------------------------------------------------------

test('endpoint: refuses every request when no token is configured', () => {
  // Defaulting to open would expose billing state to anybody who found the URL.
  assert.match(endpoint, /if \(!expected\) return json\(503/);
});

test('endpoint: compares the token in constant time', () => {
  assert.match(endpoint, /timingSafeEqual/);
  assert.match(endpoint, /return json\(401, \{ error: 'Unauthorized' \}\)/);
});

test('endpoint: only ever writes the local cache, never Stripe', () => {
  // Through `syncSubscription` — the same writer the webhook uses, so a repair
  // and a delivery cannot leave the row in two different shapes.
  assert.match(endpoint, /syncSubscription\(subscription, \{ mode \}\)/);
  assert.ok(!/stripePost|stripe\.subscriptions\.update|method: 'POST'.*stripe/i.test(endpoint));
});

test('endpoint: offers a dry run, so drift can be inspected before it is repaired', () => {
  assert.match(endpoint, /dry.*===\s*'1'/);
  assert.match(endpoint, /if \(!dryRun\)/);
});

test('endpoint: only compares subscriptions that are still live', () => {
  assert.match(endpoint, /NON_TERMINAL\.map/);
  assert.match(endpoint, /status=in\./);
});

test('endpoint: a clean run still reports, so silence is not mistaken for health', () => {
  assert.match(endpoint, /reconcile_clean/);
});

test('endpoint: it asks Stripe what Stripe has, not only about what we know of', () => {
  // Fetching only the subscriptions already present locally made
  // `missing_locally` — somebody paying and getting no access — unreachable in
  // production while having a branch and a test. A reconciliation that
  // reported `clean` precisely when it mattered most.
  assert.match(endpoint, /subscriptions\?\$\{query\}/);
  assert.match(endpoint, /starting_after/, 'a single page is not the account');
  assert.match(endpoint, /MAX_LISTED_PAGES/, 'and an unbounded scan is not a serverless function');
  assert.match(endpoint, /has_more/);
});

test('endpoint: hitting the listing ceiling is reported, not swallowed', () => {
  assert.match(endpoint, /truncated/);
  assert.match(endpoint, /outgrown this pass/);
});

test('endpoint: provider failures cannot masquerade as missing subscriptions', () => {
  assert.ok(!/subscriptionById\([^)]*\);\s*if \(subscription\?\.id\)[^}]*\}\s*catch/s.test(endpoint));
  assert.match(endpoint, /resource_missing/);
});

test('reconcile: the period is read from Stripe the same way the writer reads it', () => {
  // Reading `current_period_end` directly looked equivalent to
  // `subscriptionPeriodEnd` and was not: newer API versions carry it on the
  // subscription item, and only the helper falls back to it. Every live
  // subscription would have shown a permanent phantom drift, been "repaired"
  // by writing the same value back, and raised an alert every scheduled run.
  const onSubscription = stripeSub({ current_period_end: PERIOD_END });
  const onItem = {
    ...stripeSub(),
    current_period_end: undefined,
    items: { data: [{ price: { id: 'price_patient' }, current_period_end: PERIOD_END }] },
  };
  assert.equal(normaliseStripe(onSubscription).currentPeriodEnd, PERIOD_END_ISO);
  assert.equal(normaliseStripe(onItem).currentPeriodEnd, PERIOD_END_ISO);
  assert.deepEqual(findDrift([localRow()], [onItem]), [], 'a period on the item is not drift');
});
