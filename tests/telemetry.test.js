import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENES } from '../src/catalog/index.js';
import {
  CONSENT_STORAGE_KEY,
  VISIT_STORAGE_KEY,
  createTelemetry,
} from '../src/telemetry/telemetry.js';
import {
  REGULAR_VISIT_DAYS,
  localDay,
  normaliseVisitProfile,
  visitBucket,
  withVisit,
} from '../src/telemetry/retention.js';
import { looksSensitive } from '../src/telemetry/redact.js';

const SCENE = SCENES[0].id;

/** An in-memory `Storage`, plus a mode where every access throws. */
function fakeStorage({ denied = false } = {}) {
  const map = new Map();
  const guard = () => {
    if (denied) throw new Error('storage denied');
  };
  return {
    map,
    getItem: (key) => (guard(), map.get(key) ?? null),
    setItem: (key, value) => (guard(), void map.set(key, value)),
    removeItem: (key) => (guard(), void map.delete(key)),
  };
}

function recorder() {
  const batches = [];
  return { batches, transport: async (payload) => void batches.push(payload) };
}

test('telemetry: nothing is transmitted before consent is granted', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.record('model.start', { scene: SCENE, device: 'phone' });
  assert.equal(await telemetry.flush(), false);
  assert.equal(batches.length, 0);
  assert.equal(telemetry.pending, 1);
});

test('telemetry: granting consent flushes what was held', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.record('model.start', { scene: SCENE, device: 'phone' });
  telemetry.setConsent('granted');
  await telemetry.flush();
  assert.equal(batches.length, 1);
  assert.equal(batches[0].events[0].name, 'model.start');
});

test('telemetry: refusing consent destroys the queue instead of keeping it', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.record('model.start', { scene: SCENE, device: 'phone' });
  telemetry.setConsent('denied');
  assert.equal(telemetry.pending, 0);

  // And a later grant cannot resurrect it — the events no longer exist.
  telemetry.setConsent('granted');
  await telemetry.flush();
  assert.equal(batches.length, 0);
});

test('telemetry: after refusal, nothing new is even collected', () => {
  const telemetry = createTelemetry({});
  telemetry.setConsent('denied');
  assert.equal(telemetry.record('model.start', { scene: SCENE, device: 'phone' }), false);
  assert.equal(telemetry.reportError({ message: 'x' }), null);
  assert.equal(telemetry.pending, 0);
});

test('telemetry: the consent answer is remembered across page loads', () => {
  const storage = fakeStorage();
  createTelemetry({ storage }).setConsent('granted');
  assert.equal(storage.map.get(CONSENT_STORAGE_KEY), 'granted');
  assert.equal(createTelemetry({ storage }).consent, 'granted');
});

test('telemetry: a browser that refuses storage still works', () => {
  const telemetry = createTelemetry({ storage: fakeStorage({ denied: true }) });
  assert.equal(telemetry.consent, 'unset');
  telemetry.setConsent('granted');
  assert.equal(telemetry.consent, 'granted');
  assert.equal(telemetry.recordVisit({ device: 'phone' }), 'first');
});

test('telemetry: an unknown or malformed event is dropped, not sent', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.setConsent('granted');
  assert.equal(telemetry.record('not.declared', {}), false);
  assert.equal(telemetry.record('model.start', { scene: 'nope', device: 'phone' }), false);
  assert.equal(await telemetry.flush(), false);
  assert.equal(batches.length, 0);
});

test('telemetry: ambient context fills only the properties an event declares', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.setConsent('granted');
  telemetry.setContext({ device: 'tablet', scene: SCENE, surface: 'scene' });
  telemetry.record('model.start', {});
  // `error.captured` declares surface but not device or scene.
  telemetry.record('error.captured', { fingerprint: 'a1b2c3d4' });
  await telemetry.flush();

  const [start, error] = batches[0].events;
  assert.deepEqual(start.props, { scene: SCENE, surface: 'scene', device: 'tablet' });
  assert.deepEqual(error.props, { surface: 'scene', fingerprint: 'a1b2c3d4' });
});

test('telemetry: an explicit property beats the ambient one', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.setConsent('granted');
  telemetry.setContext({ device: 'tablet' });
  telemetry.record('model.start', { scene: SCENE, device: 'phone' });
  await telemetry.flush();
  assert.equal(batches[0].events[0].props.device, 'phone');
});

test('telemetry: the queue is bounded so a long session cannot grow without limit', () => {
  const telemetry = createTelemetry({ maxQueue: 5 });
  for (let i = 0; i < 40; i += 1) telemetry.record('model.start', { scene: SCENE, device: 'phone' });
  assert.equal(telemetry.pending, 5);
  assert.ok(telemetry.stats.dropped > 0);
});

test('telemetry: one event name cannot flood a session', () => {
  const telemetry = createTelemetry({ maxPerName: 3, maxQueue: 100 });
  const accepted = Array.from({ length: 10 }, () =>
    telemetry.record('model.start', { scene: SCENE, device: 'phone' })
  ).filter(Boolean);
  assert.equal(accepted.length, 3);
});

test('telemetry: a failed transport keeps the batch for one more attempt', async () => {
  let attempts = 0;
  const telemetry = createTelemetry({
    transport: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
    },
  });
  telemetry.setConsent('granted');
  telemetry.record('model.start', { scene: SCENE, device: 'phone' });
  assert.equal(await telemetry.flush(), false);
  assert.equal(telemetry.pending, 1, 'the event survived the failure');
  assert.equal(await telemetry.flush(), true);
  assert.equal(telemetry.pending, 0);
});

test('telemetry: an error report is redacted before it is ever queued', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.setConsent('granted');
  telemetry.reportError({
    name: 'AuthError',
    message: 'no session for nurse@clinic.example with sk_live_abcd1234efgh',
    stack: 'at auth (/home/dev/lab/src/access/auth.js:9:1)',
    url: 'https://lab.example/#access_token=eyJhbGc.eyJzdWI.c2ln',
  });
  await telemetry.flush();

  const report = batches[0].errors[0];
  assert.ok(!looksSensitive(report.message), report.message);
  assert.ok(!looksSensitive(report.frames.join('\n')), report.frames.join('\n'));
  assert.ok(!report.url.includes('eyJhbGc'), report.url);
  assert.match(report.fingerprint, /^[0-9a-f]{8}$/);
});

test('telemetry: a repeated failure is counted once and reported once', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport });
  telemetry.setConsent('granted');
  const report = { name: 'TypeError', message: 'x is undefined', stack: 'at tick (app.js:1:1)' };
  const first = telemetry.reportError(report);
  for (let i = 0; i < 50; i += 1) telemetry.reportError(report);

  await telemetry.flush();
  assert.equal(batches[0].errors.length, 1, 'an error loop must not become a send loop');
  assert.equal(telemetry.occurrences(first), 51);
});

test('telemetry: distinct failures are capped per session', async () => {
  const { batches, transport } = recorder();
  const telemetry = createTelemetry({ transport, maxErrors: 3 });
  telemetry.setConsent('granted');
  for (let i = 0; i < 20; i += 1) {
    telemetry.reportError({ name: 'Error', message: `failure ${'x'.repeat(i)}` });
  }
  await telemetry.flush();
  assert.equal(batches[0].errors.length, 3);
});

test('telemetry: the batch carries no identifier that outlives the page load', async () => {
  const { batches, transport } = recorder();
  const storage = fakeStorage();
  const first = createTelemetry({ transport, storage });
  first.setConsent('granted');
  first.record('model.start', { scene: SCENE, device: 'phone' });
  await first.flush();

  const second = createTelemetry({ transport, storage });
  second.record('model.start', { scene: SCENE, device: 'phone' });
  await second.flush();

  assert.notEqual(batches[0].sessionRef, batches[1].sessionRef);
  const stored = JSON.stringify([...storage.map.entries()]);
  assert.ok(!stored.includes(batches[0].sessionRef), 'a session reference was persisted');
});

test('telemetry: forget removes the only two things ever written to disk', () => {
  const storage = fakeStorage();
  const telemetry = createTelemetry({ storage });
  telemetry.setConsent('granted');
  telemetry.recordVisit({ device: 'phone' });
  assert.equal(storage.map.size, 2);

  telemetry.forget();
  assert.equal(storage.map.size, 0);
  assert.equal(telemetry.consent, 'unset');
  assert.equal(telemetry.pending, 0);
});

test('telemetry: consent listeners are told when the answer changes', () => {
  const telemetry = createTelemetry({});
  const seen = [];
  const off = telemetry.onConsent((state) => seen.push(state));
  telemetry.setConsent('granted');
  telemetry.setConsent('granted'); // no change, no announcement
  off();
  telemetry.setConsent('denied');
  assert.deepEqual(seen, ['granted']);
});

test('retention: a day of use is counted once however often the app is opened', () => {
  let profile = withVisit(null, '2026-09-01');
  profile = withVisit(profile, '2026-09-01');
  profile = withVisit(profile, '2026-09-01');
  assert.equal(profile.days, 1);
  assert.equal(visitBucket(profile), 'first');
});

test('retention: buckets are the only thing that can leave the device', () => {
  let profile = null;
  for (let day = 1; day <= REGULAR_VISIT_DAYS; day += 1) {
    profile = withVisit(profile, `2026-09-${String(day).padStart(2, '0')}`);
  }
  assert.equal(visitBucket(profile), 'regular');
  assert.equal(visitBucket(withVisit(withVisit(null, '2026-09-01'), '2026-09-02')), 'returning');
});

test('retention: a corrupted profile degrades to a first visit', () => {
  assert.deepEqual(normaliseVisitProfile('nonsense'), { days: 0, lastDay: null });
  assert.deepEqual(normaliseVisitProfile({ days: -3, lastDay: 'yesterday' }), { days: 0, lastDay: null });
  assert.deepEqual(normaliseVisitProfile({ days: 2, lastDay: 'yesterday' }), { days: 2, lastDay: null });
  assert.equal(visitBucket({ days: Number.NaN }), 'first');
});

test('retention: the local day is a local calendar day', () => {
  assert.match(localDay(new Date(2026, 8, 1, 23, 30)), /^2026-09-01$/);
});

test('telemetry: recording a visit stores a count and reports a word', async () => {
  const { batches, transport } = recorder();
  const storage = fakeStorage();
  const telemetry = createTelemetry({ transport, storage });
  telemetry.setConsent('granted');
  assert.equal(telemetry.recordVisit({ device: 'phone', surface: 'landing', today: '2026-09-01' }), 'first');
  assert.equal(telemetry.recordVisit({ device: 'phone', surface: 'landing', today: '2026-09-02' }), 'returning');
  await telemetry.flush();

  assert.deepEqual(
    batches[0].events.map((event) => event.props.bucket),
    ['first', 'returning']
  );
  assert.equal(JSON.parse(storage.map.get(VISIT_STORAGE_KEY)).days, 2);
});
