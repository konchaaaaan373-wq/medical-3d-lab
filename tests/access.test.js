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
import {
  featuresForScene,
  productBadgesForScene,
  SCENE_PRODUCT_FEATURES,
} from '../src/access/features.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { educationGuideFor } from '../src/data/educationGuides.js';
import { patientGuideFor } from '../src/data/patientGuides.js';
import {
  checkoutIntegrationIdentifier,
  planForPrice,
  safeHash,
  STRIPE_API_VERSION,
  subscriptionPeriodEnd,
  verifyStripeSignature,
} from '../netlify/lib/billing.js';

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

test('product: paid capabilities are declared by the scene manifest and prototypes stay free-only', () => {
  const declared = SCENE_MANIFEST.filter(
    (scene) => scene.access?.patient === true || scene.access?.education === true
  );
  assert.deepEqual(
    Object.keys(SCENE_PRODUCT_FEATURES).sort(),
    declared.map((scene) => scene.id).sort()
  );

  for (const scene of SCENE_MANIFEST) {
    const features = featuresForScene(scene);
    assert.equal(features.core, 'free', scene.id);
    if (scene.status === 'prototype') {
      assert.equal(scene.access, undefined, `${scene.id}: prototype must not declare paid access`);
      assert.equal(features.patient, false, `${scene.id}: patient`);
      assert.equal(features.education, false, `${scene.id}: education`);
    }
  }
});

test('product: paid patient/education modes require a reviewed or production scene', () => {
  for (const scene of SCENE_MANIFEST) {
    if (!scene.access?.patient && !scene.access?.education) continue;
    assert.ok(
      scene.status === 'reviewed' || scene.status === 'production',
      `${scene.id}: ${scene.status} must not advertise paid clinical/teaching modes`
    );
    assert.equal(typeof scene.access.patient, 'boolean', `${scene.id}: patient declaration`);
    assert.equal(typeof scene.access.education, 'boolean', `${scene.id}: education declaration`);
  }

  const hrs = SCENE_MANIFEST.find((scene) => scene.id === 'hepatorenal-syndrome');
  assert.equal(hrs?.status, 'alpha');
  assert.equal(hrs?.access, undefined);
  assert.equal(featuresForScene(hrs).patient, false);
  assert.equal(featuresForScene(hrs).education, false);
});

test('product: every advertised paid capability has authored content', () => {
  for (const [sceneId, features] of Object.entries(SCENE_PRODUCT_FEATURES)) {
    if (features.patient) assert.ok(patientGuideFor(sceneId), `${sceneId}: patient guide`);
    if (features.education) assert.ok(educationGuideFor(sceneId), `${sceneId}: education guide`);
  }
});

test('product: catalogue badges always lead with the free core model', () => {
  for (const scene of SCENE_MANIFEST) {
    const badges = productBadgesForScene(scene);
    assert.equal(badges[0]?.id, 'core', scene.id);
    assert.equal(badges[0]?.kind, 'free', scene.id);
    const features = featuresForScene(scene);
    assert.equal(badges.some((badge) => badge.id === 'patient'), features.patient, scene.id);
    assert.equal(badges.some((badge) => badge.id === 'education'), features.education, scene.id);
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

test('billing: Stripe period end supports legacy root and flexible-billing item shapes', () => {
  const rootSeconds = 1_800_000_000;
  const itemSeconds = 1_810_000_000;
  assert.equal(
    subscriptionPeriodEnd({ current_period_end: rootSeconds, items: { data: [{ current_period_end: itemSeconds }] } }),
    new Date(rootSeconds * 1000).toISOString()
  );
  assert.equal(
    subscriptionPeriodEnd({ items: { data: [{ current_period_end: itemSeconds }] } }),
    new Date(itemSeconds * 1000).toISOString()
  );
  assert.equal(subscriptionPeriodEnd({ items: { data: [] } }), null);
});

test('billing: return hashes cannot become arbitrary redirects', () => {
  assert.equal(safeHash('#/copd'), '#/copd');
  assert.equal(safeHash('#/portal-hypertension'), '#/portal-hypertension');
  assert.equal(safeHash('https://evil.example/'), '#/');
  assert.equal(safeHash('//evil.example'), '#/');
});

test('billing: Stripe requests are version-pinned and Checkout identifiers contain no identity', () => {
  assert.equal(STRIPE_API_VERSION, '2026-08-26.dahlia');
  const identifier = checkoutIntegrationIdentifier(() => Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]));
  assert.equal(identifier, 'abcdefgh');
  assert.match(identifier, /^[a-z]{8}$/);
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

test('patient mode: guides stay on each authored scene progression axis', () => {
  for (const [sceneId, features] of Object.entries(SCENE_PRODUCT_FEATURES)) {
    if (!features.patient) continue;
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

test('patient mode: amyloid guide separates aggregation from individual cognition', () => {
  const guide = patientGuideFor('amyloid-beta');
  const allCopy = guide.steps.map((step) => `${step.title} ${step.body} ${step.titleJa} ${step.bodyJa}`).join(' ');
  assert.match(allCopy, /does not .*tell us how much memory difficulty/i);
  assert.match(allCopy, /判断することはできません/);
});

test('education mode: guides use ordered model states and end by teaching scope', () => {
  for (const [sceneId, features] of Object.entries(SCENE_PRODUCT_FEATURES)) {
    if (!features.education) continue;
    const guide = educationGuideFor(sceneId);
    assert.ok(guide, sceneId);
    const values = guide.steps.map((step) => step.progress);
    assert.ok(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), sceneId);
    assert.deepEqual(values, [...values].sort((a, b) => a - b), sceneId);
    assert.equal(guide.steps.at(-1)?.kind, 'scope', sceneId);
    for (const step of guide.steps) {
      assert.ok(step.prompt && step.promptJa && step.answer && step.answerJa, `${sceneId}:${step.kind}`);
    }
  }
});

test('education mode: asthma guide teaches heterogeneity without a calibration-specific half-lung claim', () => {
  const guide = educationGuideFor('asthma-heterogeneity');
  const allCopy = guide.steps.map((step) => `${step.prompt} ${step.answer} ${step.promptJa} ${step.answerJa}`).join(' ');
  assert.match(allCopy, /clustered heterogeneity/i);
  assert.doesNotMatch(allCopy, /half the lung goes dark/i);
});
