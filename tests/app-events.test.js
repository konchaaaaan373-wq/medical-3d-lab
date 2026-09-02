import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SCENES } from '../src/catalog/index.js';
import {
  APP_EVENTS,
  emitAppEvent,
  onAppEvent,
  resetAppEvents,
  subscriberCount,
} from '../src/app/appEvents.js';
import { bridgeAppEvents } from '../src/app/observability.js';
import { createTelemetry } from '../src/telemetry/telemetry.js';
import { METRIC_NAMES } from '../src/telemetry/metrics.js';

const SCENE = SCENES[0].id;
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function bridged() {
  resetAppEvents();
  const batches = [];
  const telemetry = createTelemetry({ transport: async (payload) => void batches.push(payload) });
  telemetry.setConsent('granted');
  const off = bridgeAppEvents(telemetry, {
    sceneId: SCENE,
    deviceClass: 'desktop',
    surface: 'scene',
  });
  return { batches, telemetry, off };
}

test('events: emitting an undeclared event is refused rather than delivered', () => {
  resetAppEvents();
  let called = false;
  onAppEvent('story:invented', () => {
    called = true;
  });
  emitAppEvent('story:invented', {});
  assert.equal(called, false);
  assert.equal(subscriberCount('story:invented'), 0);
});

test('events: a subscriber that throws cannot break the emitter', () => {
  resetAppEvents();
  const seen = [];
  onAppEvent('story:complete', () => {
    throw new Error('subscriber is broken');
  });
  onAppEvent('story:complete', (payload) => seen.push(payload));
  assert.doesNotThrow(() => emitAppEvent('story:complete', { steps: 3 }));
  assert.deepEqual(seen, [{ steps: 3 }]);
});

test('events: unsubscribing actually stops delivery', () => {
  resetAppEvents();
  let count = 0;
  const off = onAppEvent('reel:export', () => (count += 1));
  emitAppEvent('reel:export', { format: 'png' });
  off();
  emitAppEvent('reel:export', { format: 'png' });
  assert.equal(count, 1);
});

test('bridge: a finished story becomes a launch metric', async () => {
  const { batches, telemetry, off } = bridged();
  emitAppEvent('story:complete', { steps: 6, elapsedMs: 42_000 });
  await telemetry.flush();
  off();
  assert.deepEqual(batches[0].events[0], {
    name: 'story.complete',
    at: batches[0].events[0].at,
    props: { scene: SCENE, steps: 6, elapsedMs: 42_000 },
  });
});

test('bridge: every announced event maps onto a declared metric', async () => {
  const { batches, telemetry, off } = bridged();
  emitAppEvent('story:complete', { steps: 4 });
  emitAppEvent('compare:complete', { elapsedMs: 9_000 });
  emitAppEvent('learning:complete', { modules: 2, correct: 1 });
  emitAppEvent('guide:open', { fullscreen: true });
  emitAppEvent('reel:export', { format: 'png', preset: 'square' });
  emitAppEvent('conversion:step', { step: 'checkout_start', plan: 'complete' });
  await telemetry.flush();
  off();

  const names = batches[0].events.map((event) => event.name);
  assert.deepEqual(names, [
    'story.complete',
    'compare.complete',
    'learning.complete',
    'patient_guide.open',
    'reel.export',
    'account.conversion',
  ]);
  for (const name of names) assert.ok(METRIC_NAMES.includes(name));
});

test('bridge: a payload with nothing in it still produces a valid event', async () => {
  const { batches, telemetry, off } = bridged();
  emitAppEvent('story:complete', {});
  emitAppEvent('learning:complete', {});
  await telemetry.flush();
  off();
  assert.equal(batches[0].events.length, 2);
  assert.equal(batches[0].events[0].props.steps, 0);
});

test('bridge: an unrecognised plan is omitted rather than guessed', async () => {
  const { batches, telemetry, off } = bridged();
  emitAppEvent('conversion:step', { step: 'pricing_view', plan: null });
  await telemetry.flush();
  off();
  assert.deepEqual(batches[0].events[0].props, { step: 'pricing_view', scene: SCENE });
});

test('bridge: disconnecting stops the translation', async () => {
  const { batches, telemetry, off } = bridged();
  off();
  emitAppEvent('story:complete', { steps: 3 });
  assert.equal(await telemetry.flush(), false);
  assert.equal(batches.length, 0);
});

test('events: announcements come from the module that owns the fact', () => {
  const sources = {
    'story:complete': 'src/app/StoryMode.js',
    'compare:complete': 'src/app/App.js',
    'reel:export': 'src/app/App.js',
    'learning:complete': 'src/components/LearningPanel.js',
    'guide:open': 'src/access/installAccess.js',
    'conversion:step': 'src/access/AccessManager.js',
  };
  for (const [event, path] of Object.entries(sources)) {
    assert.match(read(path), new RegExp(`emitAppEvent\\('${event}'`), `${path} never announces ${event}`);
  }
});

test('events: every declared event has both a producer and a translation', () => {
  const producers = [
    'src/app/App.js',
    'src/app/StoryMode.js',
    'src/components/LearningPanel.js',
    'src/access/installAccess.js',
    'src/access/AccessManager.js',
  ]
    .map(read)
    .join('\n');
  const bridge = read('src/app/observability.js');
  for (const event of APP_EVENTS) {
    assert.ok(producers.includes(`emitAppEvent('${event}'`), `nothing announces "${event}"`);
    assert.ok(bridge.includes(`onAppEvent('${event}'`), `nothing translates "${event}"`);
  }
});

test('events: a presentation module never imports telemetry directly', () => {
  for (const path of [
    'src/app/App.js',
    'src/app/StoryMode.js',
    'src/components/LearningPanel.js',
    'src/access/installAccess.js',
    'src/access/AccessManager.js',
  ]) {
    const source = read(path);
    assert.ok(
      !/from '.*telemetry\/(telemetry|install|metrics)\.js'/.test(source),
      `${path} should announce facts, not record metrics`
    );
  }
});
