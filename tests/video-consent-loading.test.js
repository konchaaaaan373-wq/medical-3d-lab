import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the production handler with a controllable module load. No reimplementation
// of its state machine: only the import expression is replaced at this boundary.
const app = readFileSync(new URL('../src/app/App.js', import.meta.url), 'utf8');
const handler = app.slice(app.indexOf('  async function requestVideoDownload() {'), app.indexOf('\n  async function runVideoDownload'))
  .replace("import('../components/VideoConsentDialog.js')", 'load()');
function fixture() {
  const pending = [], opened = [], labels = [];
  const reel = { active: true, sessionId: 1, setDownloadLabel: (...args) => labels.push(args) };
  const load = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
  const create = new Function('reelMode', 'load', 'opened', `
    let videoConsent = null, videoRecording = false, videoConsentRequest = null;
    const entry = {id: 'test'}, meta = {}, ui = {};
    const VIDEO_EXPORT_COPY = {failedShort: 'failed'};
    const videoConsentTerms = () => ({});
    const console = {warn() {}};
    const runVideoDownload = () => {};
    ${handler}
    return requestVideoDownload;
  `);
  const request = create(reel, load, opened);
  const resolve = (index = 0) => pending[index].resolve({ createVideoConsentDialog: () => ({ open: () => opened.push(true) }) });
  const exit = () => { reel.active = false; reel.sessionId++; };
  const enter = () => { reel.active = true; reel.sessionId++; };
  return { request, pending, opened, labels, resolve, exit, enter };
}
test('consent load resolves after Exit without opening a modal', async () => {
  const f = fixture(); const p = f.request(); f.exit(); f.resolve(); await p;
  assert.equal(f.opened.length, 0); assert.equal(f.labels.length, 0);
});
test('Exit then re-enter does not revive the old consent request', async () => {
  const f = fixture(); const p = f.request(); f.exit(); f.enter(); f.resolve(); await p;
  assert.equal(f.opened.length, 0);
});
test('concurrent presses create only one load and one consent dialog', async () => {
  const f = fixture(); const p = f.request(); await f.request();
  assert.equal(f.pending.length, 1); f.resolve(); await p; assert.equal(f.opened.length, 1);
});
test('a failed import is handled, reports failure and allows a fresh attempt', async () => {
  const f = fixture(); const p = f.request(); f.pending[0].reject(new Error('offline')); await p;
  assert.deepEqual(f.labels, [['failed', {busy: false}]]);
  const retry = f.request(); assert.equal(f.pending.length, 2); f.resolve(1); await retry;
  assert.equal(f.opened.length, 1);
});
test('a stale failure neither labels nor unlocks a newer request', async () => {
  const f = fixture(); const old = f.request(); f.exit(); f.enter(); const fresh = f.request();
  f.pending[0].reject(new Error('offline')); await old; await f.request();
  assert.equal(f.labels.length, 0); assert.equal(f.pending.length, 2);
  f.resolve(1); await fresh; assert.equal(f.opened.length, 1);
});
test('a stale successful import cannot unlock a newer request', async () => {
  const f = fixture(); const old = f.request(); f.exit(); f.enter(); const fresh = f.request();
  f.resolve(); await old; await f.request();
  assert.equal(f.opened.length, 0); assert.equal(f.pending.length, 2);
  f.resolve(1); await fresh; assert.equal(f.opened.length, 1);
});
test('an inactive reel cannot ask for consent', async () => {
  const f = fixture(); f.exit(); await f.request(); assert.equal(f.pending.length, 0);
});

// The visit identifier is owned by the real reel, including its own Exit chip.
import { Vector3, PerspectiveCamera } from 'three';
import { createReelMode } from '../src/app/ReelMode.js';
import { FakeElement, installFakeDocument, findByClass } from './helpers/fake-dom.js';
test('the real reel invalidates a visit through Exit and re-entry, including pending recorder loads', async () => {
  const restore = installFakeDocument();
  const oldWindow = globalThis.window, oldRaf = globalThis.requestAnimationFrame;
  const createElement = document.createElement.bind(document);
  document.createElement = (...args) => {
    const element = createElement(...args);
    Object.defineProperties(element, {
      firstChild: {get() { return this.children[0]; }},
      lastChild: {get() { return this.children.at(-1); }},
    });
    return element;
  };
  globalThis.window = {addEventListener() {}};
  globalThis.requestAnimationFrame = () => 1;
  try {
    const ui = new FakeElement('div');
    const mode = createReelMode({
      viewer: {camera: new PerspectiveCamera(), controls: {target: new Vector3()}, resize() {}},
      scene: {}, ui, stage: new FakeElement('div'),
      reel: {durationSeconds: 15, cues: [], viewDirection: new Vector3(0, 0, 1),
        framing: {halfWidth: 1, halfHeight: 1, target: new Vector3()},
        cameraAt: () => ({targetX: 0, targetY: 0, targetZ: 0, distance: 10}), overlayAt: () => ({})},
      setComparison() {}, setProgress() {}, getLanguage: () => 'en',
    });
    mode.enter(); const first = mode.sessionId;
    mode.enter(); assert.equal(mode.sessionId, first, 'repeated enter is the same visit');
    const pending = mode.recordVideo();
    findByClass(ui, 'is-exit')[0].click();
    assert.equal(mode.active, false);
    assert.notEqual(mode.sessionId, first);
    mode.enter(); assert.notEqual(mode.sessionId, first);
    const result = await pending;
    assert.equal(result.complete, false); assert.equal(result.blob, null);
    assert.equal(mode.active, true, 'the new visit remains under the reader\'s control');
  } finally {
    restore(); globalThis.window = oldWindow; globalThis.requestAnimationFrame = oldRaf;
  }
});
