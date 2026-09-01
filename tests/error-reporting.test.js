import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENES } from '../src/catalog/index.js';
import { createTelemetry } from '../src/telemetry/telemetry.js';
import { createErrorReporter } from '../src/telemetry/errorReporter.js';
import { looksSensitive } from '../src/telemetry/redact.js';

const SCENE = SCENES[0].id;

function harness({ ratePerSecond, clock } = {}) {
  const batches = [];
  const telemetry = createTelemetry({ transport: async (payload) => void batches.push(payload) });
  telemetry.setConsent('granted');
  const reporter = createErrorReporter({
    telemetry,
    surface: 'scene',
    ratePerSecond,
    now: clock,
  });
  return { batches, telemetry, reporter };
}

/** A window-shaped object, so install/uninstall can be tested without a browser. */
function fakeTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
    emit: (type, event) => listeners.get(type)?.(event),
  };
}

test('reporter: a captured error produces both a diagnostic and a metric', async () => {
  const { batches, telemetry, reporter } = harness();
  const id = reporter.capture(new Error('scene failed to build'));
  await telemetry.flush();

  assert.match(id, /^[0-9a-f]{8}$/);
  assert.equal(batches[0].errors[0].fingerprint, id);
  const metric = batches[0].events.find((event) => event.name === 'error.captured');
  assert.deepEqual(metric.props, { fingerprint: id, surface: 'scene', handled: false });
});

test('reporter: the metric carries a fingerprint and never the message', async () => {
  const { batches, telemetry, reporter } = harness();
  reporter.capture(new Error('failed for patient@clinic.example'));
  await telemetry.flush();
  const serialised = JSON.stringify(batches[0].events);
  assert.ok(!serialised.includes('patient@clinic.example'));
  assert.ok(!serialised.includes('failed for'));
  assert.ok(!looksSensitive(JSON.stringify(batches[0].errors)));
});

test('reporter: an error thrown every frame cannot become a send loop', async () => {
  let time = 1_000;
  const { batches, telemetry, reporter } = harness({ ratePerSecond: 5, clock: () => time });
  const error = new Error('thrown in the animation loop');
  const results = Array.from({ length: 60 }, () => reporter.capture(error));
  await telemetry.flush();

  assert.equal(results.filter(Boolean).length, 5, 'rate limit');
  assert.equal(reporter.suppressed, 55);
  assert.equal(batches[0].errors.length, 1, 'deduplicated by fingerprint');
});

test('reporter: the rate limit is a rolling window, not a session cap', () => {
  let time = 1_000;
  const { reporter } = harness({ ratePerSecond: 2, clock: () => time });
  assert.ok(reporter.capture(new Error('a')));
  assert.ok(reporter.capture(new Error('b')));
  assert.equal(reporter.capture(new Error('c')), null);
  time += 1_500;
  assert.ok(reporter.capture(new Error('d')));
});

test('reporter: anything a rejection can carry is handled', () => {
  const { reporter } = harness();
  for (const thrown of ['a string', 42, null, undefined, { code: 500 }, new TypeError('real')]) {
    assert.doesNotThrow(() => reporter.capture(thrown));
  }
});

test('reporter: a broken telemetry sink cannot break the page', () => {
  const reporter = createErrorReporter({
    telemetry: {
      reportError() {
        throw new Error('telemetry is itself broken');
      },
      record() {},
    },
  });
  assert.equal(reporter.capture(new Error('original failure')), null);
});

test('reporter: install listens for both global failure events and can be removed', async () => {
  const { batches, telemetry, reporter } = harness();
  const target = fakeTarget();
  const uninstall = reporter.install(target);

  target.emit('error', { error: new Error('uncaught'), filename: 'https://lab.example/a.js?t=1' });
  target.emit('unhandledrejection', { reason: new Error('rejected') });
  await telemetry.flush();
  assert.equal(batches[0].errors.length, 2);

  uninstall();
  assert.equal(target.listeners.size, 0);
});

test('reporter: install on something that is not a window is a no-op', () => {
  const { reporter } = harness();
  assert.doesNotThrow(() => reporter.install(null)());
  assert.doesNotThrow(() => reporter.install({})());
});

test('reporter: the surface a failure happened on follows navigation', async () => {
  const { batches, telemetry, reporter } = harness();
  reporter.setSurface('explorer');
  reporter.capture(new Error('in the explorer'));
  await telemetry.flush();
  assert.equal(batches[0].events[0].props.surface, 'explorer');
});

test('reporter: a renderer failure is a product metric, not only a bug report', async () => {
  const { batches, telemetry, reporter } = harness();
  const id = reporter.captureRendererFailure(new Error('WebGL context lost'), {
    scene: SCENE,
    device: 'phone',
    reason: 'no_context',
    fallbackShown: true,
  });
  await telemetry.flush();

  const metric = batches[0].events.find((event) => event.name === 'renderer.failure');
  assert.deepEqual(metric.props, {
    scene: SCENE,
    device: 'phone',
    reason: 'no_context',
    fingerprint: id,
    fallbackShown: true,
  });
  assert.equal(batches[0].errors[0].surface, 'fallback');
});

test('reporter: a renderer failure is not silently reclassified when its reason is unknown', async () => {
  const { batches, telemetry, reporter } = harness();
  reporter.captureRendererFailure(new Error('something'), { scene: SCENE, device: 'desktop' });
  await telemetry.flush();
  assert.equal(batches[0].events[0].props.reason, 'unknown');
});

test('reporter: with consent refused it collects nothing at all', async () => {
  const telemetry = createTelemetry({ transport: async () => {} });
  telemetry.setConsent('denied');
  const reporter = createErrorReporter({ telemetry });
  reporter.capture(new Error('nope'));
  reporter.captureRendererFailure(new Error('nope'), { device: 'phone' });
  assert.equal(telemetry.pending, 0);
});
