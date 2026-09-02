import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENES } from '../src/catalog/index.js';
import {
  METRICS,
  METRIC_NAMES,
  coerceEvent,
  validateEvent,
  validateMetricVocabulary,
} from '../src/telemetry/metrics.js';

test('metrics: the vocabulary is internally consistent', () => {
  assert.deepEqual(validateMetricVocabulary(), []);
});

test('metrics: no property can carry free text', () => {
  const allowed = new Set(['enum', 'sceneId', 'number', 'boolean', 'fingerprint']);
  for (const [name, metric] of Object.entries(METRICS)) {
    for (const [key, spec] of Object.entries(metric.props)) {
      assert.ok(allowed.has(spec.kind), `${name}.${key} is "${spec.kind}"`);
    }
  }
});

test('metrics: every launch question the roadmap names has an event', () => {
  // model start, story/compare completion, learning completion, patient-guide
  // use, conversion, retention and renderer failures.
  for (const name of [
    'model.start',
    'story.complete',
    'compare.complete',
    'learning.complete',
    'patient_guide.open',
    'account.conversion',
    'session.visit',
    'renderer.failure',
  ]) {
    assert.ok(METRIC_NAMES.includes(name), `missing launch metric "${name}"`);
  }
});

test('metrics: every event says which product question it answers', () => {
  for (const [name, metric] of Object.entries(METRICS)) {
    assert.ok(metric.question?.length > 20, `${name}: question is not a question`);
  }
});

test('metrics: a scene property only accepts a registered scene', () => {
  const real = SCENES[0].id;
  assert.deepEqual(validateEvent('model.start', { scene: real, device: 'phone' }), []);
  assert.match(
    validateEvent('model.start', { scene: 'not-a-scene', device: 'phone' })[0],
    /not a registered scene/
  );
});

test('metrics: an undeclared property is rejected rather than trimmed', () => {
  const problems = validateEvent('model.start', {
    scene: SCENES[0].id,
    device: 'phone',
    note: 'the patient said',
  });
  assert.match(problems.join(' '), /undeclared property "note"/);
  assert.equal(coerceEvent('model.start', { scene: SCENES[0].id, device: 'phone', note: 'x' }).note, undefined);
});

test('metrics: an unknown event name is not silently accepted', () => {
  assert.match(validateEvent('made.up', {})[0], /unknown metric/);
  assert.equal(coerceEvent('made.up', {}), null);
});

test('metrics: required properties are required', () => {
  assert.match(validateEvent('model.start', {}).join(' '), /missing required property "scene"/);
  assert.match(validateEvent('model.start', {}).join(' '), /missing required property "device"/);
});

test('metrics: numbers outside their range are clamped rather than dropped', () => {
  const clean = coerceEvent('model.ready', {
    scene: SCENES[0].id,
    device: 'phone',
    elapsedMs: 999_999_999,
    withinBudget: false,
  });
  assert.equal(clean.elapsedMs, 60_000);

  assert.equal(coerceEvent('story.complete', { scene: SCENES[0].id, steps: -4 }).steps, 0);
});

test('metrics: a non-numeric number is rejected outright', () => {
  assert.equal(coerceEvent('story.complete', { scene: SCENES[0].id, steps: 'four' }), null);
  assert.match(validateEvent('story.complete', { scene: SCENES[0].id, steps: 'four' })[0], /not a finite number/);
});

test('metrics: a fingerprint must look like one', () => {
  assert.deepEqual(validateEvent('error.captured', { fingerprint: 'a1b2c3d4' }), []);
  assert.match(validateEvent('error.captured', { fingerprint: 'oops' })[0], /not an 8-character fingerprint/);
});

test('metrics: an enum outside its value set is rejected', () => {
  assert.match(
    validateEvent('account.conversion', { step: 'refunded' })[0],
    /is not one of pricing_view, checkout_start, checkout_complete, cancelled/
  );
});

test('metrics: booleans are booleans', () => {
  assert.match(
    validateEvent('patient_guide.open', { scene: SCENES[0].id, fullscreen: 'yes' })[0],
    /not a boolean/
  );
});

test('metrics: a vocabulary defect is reported, not tolerated', () => {
  const problems = validateMetricVocabulary({
    Bad_Name: { question: 'short', props: {}, required: ['nope'] },
    'a.b': { question: 'a long enough question about the product?', props: { x: { kind: 'text' } } },
    'c.d': { question: 'another long enough question about it?', props: { y: { kind: 'enum', values: [] } } },
  });
  assert.match(problems.join('\n'), /name must be "area.event"/);
  assert.match(problems.join('\n'), /requires undeclared property "nope"/);
  assert.match(problems.join('\n'), /"text" is not a permitted property kind/);
  assert.match(problems.join('\n'), /enum with no values is free text by another name/);
});
