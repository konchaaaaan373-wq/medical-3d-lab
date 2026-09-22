import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FEEDBACK_CATEGORIES,
  MAX_FEEDBACK_LENGTH,
  buildFeedbackPayload,
  validateFeedback,
} from '../src/components/FeedbackPanel.js';
import { looksSensitive } from '../src/telemetry/redact.js';
import { METRICS } from '../src/telemetry/metrics.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const draft = (overrides = {}) => ({ category: 'bug', message: 'the heart scene never loads', ...overrides });

test('feedback: a complete report is accepted', () => {
  assert.deepEqual(validateFeedback(draft()), []);
  assert.deepEqual(validateFeedback(draft({ contact: 'someone@example.org' })), []);
});

test('feedback: the category must be one that exists', () => {
  assert.match(validateFeedback(draft({ category: 'complaint' }))[0], /what kind of feedback/);
  assert.match(validateFeedback({ message: 'x'.repeat(10) })[0], /what kind of feedback/);
  for (const entry of FEEDBACK_CATEGORIES) {
    assert.deepEqual(validateFeedback(draft({ category: entry.id })), []);
  }
});

test('feedback: an empty or oversized message is rejected', () => {
  assert.match(validateFeedback(draft({ message: '   ' }))[0], /empty/);
  assert.match(validateFeedback(draft({ message: 'x'.repeat(MAX_FEEDBACK_LENGTH + 1) }))[0], /too long/);
});

test('feedback: a malformed contact address is caught before sending', () => {
  assert.match(validateFeedback(draft({ contact: 'not-an-address' }))[0], /email address/);
  // Blank is fine: a reply address is optional and the copy says so.
  assert.deepEqual(validateFeedback(draft({ contact: '   ' })), []);
});

test('feedback: every category is offered in both languages', () => {
  for (const entry of FEEDBACK_CATEGORIES) {
    assert.ok(entry.en && entry.ja, `${entry.id} needs both languages`);
  }
  assert.ok(FEEDBACK_CATEGORIES.some((entry) => entry.id === 'medical'), 'a medical error must be reportable');
});

test('feedback: the message is preserved exactly as written', () => {
  const message = 'The EF number looks wrong at stage 3 — should it fall below 30%?';
  const payload = buildFeedbackPayload(draft({ message }), { surface: 'scene', sceneId: 'heart-failure' });
  assert.equal(payload.message, message);
  assert.equal(payload.scene, 'heart-failure');
  assert.equal(payload.surface, 'scene');
});

test('feedback: the route the product attaches is redacted, the message is not', () => {
  const payload = buildFeedbackPayload(draft(), {
    route: '#access_token=eyJhbGciOi.eyJzdWIi.c2lnbmF0dXJl',
  });
  assert.ok(!looksSensitive(payload.route), payload.route);
  assert.ok(!payload.route.includes('eyJhbGciOi'));
});

test('feedback: an over-long message is trimmed rather than sent whole', () => {
  const payload = buildFeedbackPayload(draft({ message: 'x'.repeat(MAX_FEEDBACK_LENGTH + 500) }), {});
  assert.equal(payload.message.length, MAX_FEEDBACK_LENGTH);
});

test('feedback: no contact address is null rather than an empty string', () => {
  assert.equal(buildFeedbackPayload(draft(), {}).contact, null);
  assert.equal(buildFeedbackPayload(draft({ contact: '  a@b.co ' }), {}).contact, 'a@b.co');
});

test('feedback: what somebody wrote is never turned into a metric', () => {
  // The metric may say that feedback happened and what kind. Nothing else.
  assert.deepEqual(Object.keys(METRICS['feedback.submitted'].props).sort(), ['category', 'scene', 'surface']);

  const source = read('src/components/FeedbackPanel.js');
  const call = source.slice(source.indexOf("telemetry?.record('feedback.submitted'"));
  const body = call.slice(0, call.indexOf('});'));
  assert.ok(!body.includes('message'), 'the feedback metric must not carry the message');
  assert.ok(!body.includes('contact'), 'the feedback metric must not carry a contact address');
});

test('feedback: the panel works without a renderer, an account or a scene', () => {
  const source = read('src/components/FeedbackPanel.js');
  assert.ok(!source.includes("from 'three'"), 'the feedback route must not need a renderer');
  assert.ok(!/from '\.\.\/access\//.test(source), 'the feedback route must not need an account');
  assert.match(source, /openMailFallback/, 'an unconfigured endpoint must not discard what was written');
});

test('feedback: it is reachable from the surface where a scene has failed', () => {
  const main = read('src/main.js');
  const fallbackBlock = main.slice(main.indexOf('createSceneFailureFallback'));
  assert.match(fallbackBlock, /surface: 'fallback'/);
  assert.match(fallbackBlock, /askConsent: false/, 'a broken scene is not the moment for a consent dialog');
});

test('feedback: it is reachable from every product-shell surface', () => {
  // Observability — which is what mounts the feedback trigger — used to be
  // installed once per branch in `main.js`, so "every surface" meant "every
  // branch somebody remembered". The document surfaces now share one mount,
  // and the surface name comes from a table rather than from a literal at each
  // call site, so a new surface cannot arrive without one.
  const main = read('src/main.js');
  const surfaces = read('src/app/documentSurfaces.js');

  assert.match(surfaces, /observe\(\{ ui, surface: TELEMETRY_SURFACE\[kind\] \}\)/);
  for (const [kind, name] of [
    ['landing', 'landing'],
    ['explorer', 'explorer'],
    ['lab', 'lab'],
    ['trust', 'trust'],
    ['legal', 'landing'],
    ['locked', 'landing'],
  ]) {
    assert.match(
      surfaces,
      new RegExp(`${kind}: '${name}'`),
      `no observability surface name for ${kind}`
    );
  }

  // The scene and its failure fallback stay in `main.js`, because they are the
  // two routes that own a document rather than share one.
  for (const surface of ['scene', 'fallback']) {
    assert.ok(main.includes(`surface: '${surface}'`), `no observability on the ${surface} surface`);
  }

  // And the trigger is taken down with the surface that mounted it, or every
  // navigation would leave another one on the page.
  assert.match(surfaces, /observability\?\.feedback\?\.dispose\?\.\(\)/);
});

test('feedback: the panel is keyboard-dismissable and announces itself', () => {
  const source = read('src/components/FeedbackPanel.js');
  assert.match(source, /'aria-modal': 'true'/);
  assert.match(source, /role: 'dialog'/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /trigger\.focus\(\)/, 'closing must return focus to what opened it');
});

test('consent: refusing is offered as plainly as accepting', () => {
  const source = read('src/components/ConsentBanner.js');
  assert.match(source, /choice\('denied'/);
  assert.match(source, /choice\('granted'/);
  // The refusal comes first in the DOM and neither is pre-selected.
  assert.ok(source.indexOf("choice('denied'") < source.indexOf("choice('granted'"));
  assert.match(source, /'aria-pressed': 'false'/);
  assert.ok(!/checked/.test(source), 'nothing may be pre-ticked');
});

test('consent: the setting remains available after the question is answered', () => {
  const source = read('src/components/ConsentBanner.js');
  assert.match(source, /class: 'usage-recording-settings'/);
  assert.match(source, /const paint = \(state = telemetry\.consent\)/);
  assert.match(source, /state === 'denied'/);
  assert.match(source, /state === 'granted'/);
  assert.doesNotMatch(source, /telemetry\.consent !== 'unset'\) return null/);
});

test('consent: the preference is mounted inside the information surface, not as a first-load banner', () => {
  const observability = read('src/app/observability.js');
  const anatomy = read('src/app/anatomyShellPresentation.js');
  assert.match(observability, /querySelector\?\.\('\[data-usage-recording-slot\]'\)/);
  assert.match(observability, /slot\.replaceChildren\(settings\.element\)/);
  assert.match(anatomy, /'data-usage-recording-slot': ''/);
  assert.doesNotMatch(observability, /ui\.append\(settings\.element\)/);
});
