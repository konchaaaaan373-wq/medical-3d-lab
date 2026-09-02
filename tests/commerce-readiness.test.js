import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COMMERCE_PLAN,
  commerceReadiness,
  planIsSellable,
  sceneCapabilityIsCurrent,
} from '../src/access/commerceReadiness.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';

const reviewed = (scene) => scene.review === 'reviewed';

const syntheticScene = (id, { status = 'reviewed', review = 'reviewed', patient = false, education = false } = {}) => ({
  id,
  status,
  review,
  access: { patient, education },
});

test('commerce readiness: current repository fails closed while all authored professional content awaits current review', () => {
  const readiness = commerceReadiness();
  assert.deepEqual(readiness, {
    patient: false,
    education: false,
    complete: false,
    any: false,
  });

  for (const scene of SCENE_MANIFEST.filter((entry) => entry.access)) {
    assert.equal(sceneCapabilityIsCurrent(scene, 'patient'), false, `${scene.id}: Patient should not be sellable`);
    assert.equal(sceneCapabilityIsCurrent(scene, 'education'), false, `${scene.id}: Education should not be sellable`);
  }
});

test('commerce readiness: one current Patient surface makes only Patient sellable', () => {
  const readiness = commerceReadiness(
    [syntheticScene('patient-scene', { patient: true })],
    reviewed
  );
  assert.equal(planIsSellable(COMMERCE_PLAN.PATIENT, readiness), true);
  assert.equal(planIsSellable(COMMERCE_PLAN.EDUCATION, readiness), false);
  assert.equal(planIsSellable(COMMERCE_PLAN.COMPLETE, readiness), false);
});

test('commerce readiness: Complete requires current Patient and Education content', () => {
  const readiness = commerceReadiness(
    [
      syntheticScene('patient-scene', { patient: true }),
      syntheticScene('education-scene', { education: true }),
    ],
    reviewed
  );
  assert.equal(readiness.patient, true);
  assert.equal(readiness.education, true);
  assert.equal(readiness.complete, true);
  assert.equal(planIsSellable(COMMERCE_PLAN.COMPLETE, readiness), true);
});

test('commerce readiness: authored content with stale review or low model maturity is not sellable', () => {
  const readiness = commerceReadiness(
    [
      syntheticScene('stale', { patient: true, review: 'stale' }),
      syntheticScene('alpha', { status: 'alpha', review: 'reviewed', education: true }),
    ],
    reviewed
  );
  assert.equal(readiness.any, false);
});

test('checkout endpoint repeats the clinical-review sale gate server-side before selecting a Stripe price', () => {
  const source = readFileSync(new URL('../netlify/functions/create-checkout.js', import.meta.url), 'utf8');
  const reviewGate = source.indexOf('if (!planIsSellable(plan))');
  const priceSelection = source.indexOf('const price = priceForPlan(plan)');
  const stripeCheckout = source.indexOf("stripePost('checkout/sessions'");
  assert.ok(reviewGate >= 0, 'checkout has no clinical-review gate');
  assert.ok(priceSelection > reviewGate, 'Stripe Price is selected before review readiness is checked');
  assert.ok(stripeCheckout > reviewGate, 'Stripe Checkout is created before review readiness is checked');
  assert.match(source, /reviewHold: true/);
});

test('public plan catalogue marks review-blocked plans unavailable before fetching their Stripe price', () => {
  const source = readFileSync(new URL('../netlify/functions/plan-catalog.js', import.meta.url), 'utf8');
  const reviewGate = source.indexOf('if (!planIsSellable(plan, readiness))');
  const stripeFetch = source.indexOf('stripeGet(`prices/');
  assert.ok(reviewGate >= 0, 'plan catalogue has no clinical-review gate');
  assert.ok(stripeFetch > reviewGate, 'plan catalogue fetches Stripe price before review readiness is checked');
  assert.match(source, /reason: 'clinical_review'/);
});
