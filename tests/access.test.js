import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  ACCESS_SUBSCRIPTION_STATUSES,
  accessForScene,
  canAccess,
  ENTITLEMENT,
  grantsFromSubscriptions,
  NON_TERMINAL_SUBSCRIPTION_STATUSES,
} from '../src/access/policy.js';
import { patientGuideFor } from '../src/data/patientGuides.js';
import { planForPrice, safeHash, verifyStripeSignature } from '../netlify/lib/billing.js';

test('access: accurate core scenes are free by default', () => {
  const access = accessForScene({});
  assert.equal(access.scene, ENTITLEMENT.FREE);
  assert.equal(access.patient, ENTITLEMENT.PATIENT);
  assert.equal(access.education, ENTITLEMENT.EDUCATION);
  assert.equal(canAccess([], access.scene), true);
  assert.equal(canAccess([], access.patient), false);
});

test('access: patient and education subscriptions grant only their own use case', () => {
  assert.deepEqual(
    grantsFromSubscriptions([{ entitlement: 'patient', status: 'active' }]).sort(),
    ['free', 'patient']
  );
  assert.deepEqual(
    grantsFromSubscriptions([{ entitlement: 'education', status: 'trialing' }]).sort(),
    ['education', 'free']
  );
});

test('access: complete grants both paid use cases', () => {
  assert.deepEqual(
    grantsFromSubscriptions([{ entitlement: 'complete', status: 'active' }]).sort(),
    ['education', 'free', 'patient']
  );
});

test('access: past_due has a grace period, terminal/non-paying states do not', () => {
  assert.equal(ACCESS_SUBSCRIPTION_STATUSES.has('past_due'), true);
  assert.deepEqual(
    grantsFromSubscriptions([{ entitlement: 'complete', status: 'past_due' }]).sort(),
    ['education', 'free', 'patient']
  );

  for (const status of ['canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused']) {
    assert.deepEqual(grantsFromSubscriptions([{ entitlement: 'complete', status }]), ['free'], status);
  }
});

test('billing: every non-terminal subscription lifecycle blocks a second Checkout', () => {
  for (const status of ['incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'paused']) {
    assert.equal(NON_TERMINAL_SUBSCRIPTION_STATUSES.has(status), true, status);
  }
  assert.equal(NON_TERMINAL_SUBSCRIPTION_STATUSES.has('canceled'), false);
  assert.equal(NON_TERMINAL_SUBSCRIPTION_STATUSES.has('incomplete_expired'), false);
});

test('billing: Stripe Price ID, not mutable metadata, selects the entitlement plan', () => {
  const prices = {
    patient: 'price_patient',
    education: 'price_education',
    complete: 'price_complete',
  };
  assert.equal(planForPrice('price_patient', prices), 'patient');
  assert.equal(planForPrice('price_education', prices), 'education');
  assert.equal(planForPrice('price_complete', prices), 'complete');
  assert.equal(planForPrice('price_unknown', prices), null);
});

test('billing: return hashes cannot become arbitrary redirects', () => {
  assert.equal(safeHash('#/copd'), '#/copd');
  assert.equal(safeHash('#/portal-hypertension'), '#/portal-hypertension');
  assert.equal(safeHash('https://evil.example/'), '#/');
  assert.equal(safeHash('//evil.example'), '#/');
});

test('billing: Stripe webhook signature verifies the raw body and timestamp', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ id: 'evt_123', type: 'customer.subscription.updated' });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex');
  assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(verifyStripeSignature(`${body} `, `t=${timestamp},v1=${signature}`, secret), false);
});

test('billing: stale Stripe signatures are rejected', () => {
  const secret = 'whsec_test';
  const body = '{}';
  const timestamp = Math.floor(Date.now() / 1000) - 1000;
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret), false);
});

test('patient mode: guides stay on each scene progression axis', () => {
  for (const sceneId of ['heart-failure', 'copd-hyperinflation', 'asthma-heterogeneity', 'portal-hypertension']) {
    const guide = patientGuideFor(sceneId);
    assert.ok(guide, sceneId);
    const values = guide.steps.map((step) => step.progress);
    assert.ok(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), sceneId);
    assert.deepEqual(values, [...values].sort((a, b) => a - b), sceneId);
  }
});

test('patient mode: COPD copy does not reinterpret demand as disease progression', () => {
  const guide = patientGuideFor('copd-hyperinflation');
  const allCopy = guide.steps.map((step) => `${step.title} ${step.body} ${step.titleJa} ${step.bodyJa}`).join(' ');
  assert.match(allCopy, /already showing an obstructed lung/);
  assert.match(allCopy, /安静時/);
  assert.doesNotMatch(allCopy, /A normal lung has enough time/);
});
