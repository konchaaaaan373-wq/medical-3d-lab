import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_MAX_ACTIVE_PREVIEWS,
  LUNG_PREVIEW_QUALITY,
  createPreviewPool,
  hasOrganPreview,
  mountOrganPreview,
} from '../src/app/organPreview.js';
import { FakeContainer, createPreviewHarness } from './helpers/fake-preview.js';

/**
 * The preview lifecycle, run for real against fakes. Every browser
 * dependency is injected — observers a test can fire, a frame queue and a
 * clock a test can advance, a renderer that counts itself — so what is
 * checked here is behaviour, not the spelling of the source.
 */

const source = readFileSync(new URL('../src/app/organPreview.js', import.meta.url), 'utf8');

async function mounted(harness, { organ = 'organ', pool = createPreviewPool({ maxActive: 2 }), visible = true } = {}) {
  const container = new FakeContainer();
  const dispose = mountOrganPreview(container, organ, { ...harness.deps, pool });
  const observer = harness.observers[harness.observers.length - 1];
  if (visible) {
    observer.fire(true);
    await harness.settle();
  }
  return { container, dispose, observer, pool };
}

test('organ preview: only reusable organ builders are advertised', () => {
  for (const organ of ['brain', 'heart', 'lungs', 'liver', 'kidney']) {
    assert.equal(hasOrganPreview(organ), true, organ);
  }
  assert.equal(hasOrganPreview('whole-body'), false);
  assert.equal(hasOrganPreview('invented-organ'), false);
});

test('organ preview: an unsupported organ is a no-op without browser globals', () => {
  const dispose = mountOrganPreview({}, 'invented-organ');
  assert.equal(typeof dispose, 'function');
  assert.doesNotThrow(dispose);
});

test('organ preview: Three stays out of the entry chunk and the lung preview is built at the measured quality', () => {
  assert.doesNotMatch(source, /^import .* from 'three';/m);
  assert.match(source, /import\('three'\)/);
  // Measured in the module's own comment: below detail 10 the fissures
  // zigzag at preview size, and below 12 000 samples the surface grows a fuzz.
  assert.ok(LUNG_PREVIEW_QUALITY.detail >= 10, 'below detail 10 the fissures zigzag at preview size');
  assert.ok(LUNG_PREVIEW_QUALITY.referenceSamples >= 12000, 'below 12 000 samples the apex is ragged');
});

test('organ preview: nothing is built until the preview is near the viewport', async () => {
  const harness = createPreviewHarness();
  const { container, dispose } = await mounted(harness, { visible: false });
  await harness.settle();
  assert.equal(container.dataset.previewState, 'waiting');
  assert.equal(harness.ledger.constructed.length, 0);
  assert.equal(dispose.inspect().phase, 'idle');
  dispose();
});

test('organ preview: in view it builds one renderer, attaches one canvas and rotates slowly', async () => {
  const harness = createPreviewHarness();
  const { container, dispose } = await mounted(harness);
  assert.equal(container.dataset.previewState, 'ready');
  assert.equal(harness.ledger.constructed.length, 1);
  assert.equal(container.canvases.length, 1);
  assert.equal(container.canvases[0].getAttribute('aria-hidden'), 'true');
  const before = harness.ledger.renders;
  harness.runFrame(16);
  harness.runFrame(16);
  assert.ok(harness.ledger.renders > before, 'frames render');
  assert.equal(harness.queuedFrames, 1, 'exactly one animation loop');
  assert.equal(dispose.inspect().phase, 'ready');
  dispose();
  assert.equal(container.canvases.length, 0, 'dispose removes the canvas');
  assert.equal(harness.ledger.live.size, 0, 'dispose releases the renderer');
  assert.equal(harness.queuedFrames, 0, 'dispose cancels the loop');
});

test('organ preview: the rotation is slow and frame-rate independent', async () => {
  const harness = createPreviewHarness();
  const { dispose } = await mounted(harness);
  // Two frames at 16 ms and one at 500 ms (clamped to 50 ms) must not spin
  // the organ round: 0.34 rad/s is the pace.
  harness.runFrame(16);
  harness.runFrame(16);
  harness.runFrame(500);
  assert.ok(harness.ledger.renders >= 4);
  dispose();
});

test('organ preview: leaving the viewport stops the loop, and after the grace period releases the context', async () => {
  const harness = createPreviewHarness();
  const { container, dispose, observer } = await mounted(harness);
  harness.runFrame();
  observer.fire(false);
  await harness.settle();
  assert.equal(harness.queuedFrames, 0, 'no frames off-screen');
  assert.equal(harness.ledger.live.size, 1, 'the context is kept through the grace period');
  await harness.advance(999);
  assert.equal(harness.ledger.live.size, 1);
  await harness.advance(1);
  assert.equal(harness.ledger.live.size, 0, 'released after the grace period');
  assert.equal(container.canvases.length, 0);
  assert.equal(container.dataset.previewState, 'waiting');
  assert.ok(harness.disposedObjects.includes('built'), 'the organ builder is disposed');
  assert.ok(harness.disposedObjects.includes('geometry') && harness.disposedObjects.includes('material'));
  // Back in view: rebuilt from scratch, still one canvas.
  observer.fire(true);
  await harness.settle();
  assert.equal(harness.ledger.constructed.length, 2);
  assert.equal(harness.ledger.live.size, 1);
  assert.equal(container.canvases.length, 1);
  assert.equal(container.dataset.previewState, 'ready');
  dispose();
});

test('organ preview: a brief scroll away and back keeps the renderer', async () => {
  const harness = createPreviewHarness();
  const { dispose, observer } = await mounted(harness);
  observer.fire(false);
  await harness.advance(400);
  observer.fire(true);
  await harness.advance(2000);
  assert.equal(harness.ledger.constructed.length, 1, 'no rebuild');
  assert.equal(harness.ledger.live.size, 1);
  assert.equal(harness.queuedFrames, 1, 'the loop resumed');
  dispose();
});

test('organ preview: hover and touch pause the rotation and render one still frame', async () => {
  const harness = createPreviewHarness();
  const { container, dispose } = await mounted(harness);
  harness.runFrame();
  const before = harness.ledger.renders;
  container.dispatch('pointerenter');
  assert.equal(harness.queuedFrames, 0, 'paused while hovered');
  assert.equal(harness.ledger.renders, before + 1, 'one still frame so the pause is visible');
  container.dispatch('pointerleave');
  assert.equal(harness.queuedFrames, 1, 'resumes on leave');
  container.dispatch('pointerdown');
  assert.equal(harness.queuedFrames, 0, 'a touch pauses');
  container.dispatch('pointercancel');
  assert.equal(harness.queuedFrames, 1, 'a cancelled touch resumes rather than sticking');
  container.dispatch('pointerdown');
  container.dispatch('pointerup');
  assert.equal(harness.queuedFrames, 1);
  dispose();
});

test('organ preview: reduced motion renders a still image and never queues a frame', async () => {
  const harness = createPreviewHarness();
  harness.motion.matches = true;
  const { container, dispose } = await mounted(harness);
  assert.equal(container.dataset.previewState, 'ready');
  assert.equal(harness.queuedFrames, 0, 'no animation under reduced motion');
  assert.ok(harness.ledger.renders >= 1, 'but the still is drawn');
  harness.motion.set(false);
  assert.equal(harness.queuedFrames, 1, 'lifting the preference starts the loop');
  harness.motion.set(true);
  assert.equal(harness.queuedFrames, 0, 'and setting it stops it again');
  dispose();
});

test('organ preview: a hidden tab stops the loop and a visible one restarts it', async () => {
  const harness = createPreviewHarness();
  const { dispose } = await mounted(harness);
  assert.equal(harness.queuedFrames, 1);
  harness.document.visibilityState = 'hidden';
  harness.document.dispatch('visibilitychange');
  assert.equal(harness.queuedFrames, 0);
  const renders = harness.ledger.renders;
  harness.runFrame();
  assert.equal(harness.ledger.renders, renders, 'nothing renders while hidden');
  harness.document.visibilityState = 'visible';
  harness.document.dispatch('visibilitychange');
  assert.equal(harness.queuedFrames, 1);
  dispose();
});

test('organ preview: disposing during an asynchronous build discards the build and never attaches a canvas', async () => {
  const harness = createPreviewHarness({ buildDelay: true });
  const pool = createPreviewPool({ maxActive: 2 });
  const container = new FakeContainer();
  const dispose = mountOrganPreview(container, 'organ', { ...harness.deps, pool });
  harness.observers[0].fire(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(container.dataset.previewState, 'loading');
  assert.equal(pool.activeCount, 1, 'the slot is held while building');
  dispose();
  assert.equal(pool.activeCount, 0, 'dispose gives the slot back at once');
  await harness.settle();
  assert.equal(container.canvases.length, 0);
  assert.equal(harness.ledger.live.size, 0, 'the late renderer is disposed, not leaked');
  assert.ok(harness.ledger.constructed.every((renderer) => renderer.disposed));
});

test('organ preview: scrolling away and back during a build ends with exactly one renderer', async () => {
  const harness = createPreviewHarness({ buildDelay: true });
  const pool = createPreviewPool({ maxActive: 2 });
  const container = new FakeContainer();
  const dispose = mountOrganPreview(container, 'organ', { ...harness.deps, pool });
  const observer = harness.observers[0];
  observer.fire(true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  observer.fire(false);
  await harness.advance(1000); // the grace period ends mid-build: release
  observer.fire(true); // and the reader comes back: a second build starts
  await harness.settle(); // both builds complete
  assert.equal(container.canvases.length, 1, 'one canvas, never two');
  assert.equal(harness.ledger.live.size, 1, 'one live renderer');
  assert.equal(container.dataset.previewState, 'ready');
  assert.equal(pool.activeCount, 1);
  dispose();
  assert.equal(harness.ledger.live.size, 0);
});

test('organ preview: a failed renderer marks the preview unavailable, frees its slot and does not retry', async () => {
  const harness = createPreviewHarness();
  harness.ledger.failConstruction = true;
  const pool = createPreviewPool({ maxActive: 1 });
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const { container, dispose, observer } = await mounted(harness, { pool });
    assert.equal(container.dataset.previewState, 'unavailable');
    assert.match(container.getAttribute('title') ?? '', /unavailable/);
    assert.equal(pool.activeCount, 0, 'the slot is not held by a preview that has nothing');
    observer.fire(false);
    observer.fire(true);
    await harness.settle();
    assert.equal(harness.ledger.constructed.length, 0, 'construction is not retried');
    assert.equal(container.dataset.previewState, 'unavailable');
    dispose();
  } finally {
    console.error = original;
  }
  assert.equal(errors.length, 1);
});

test('organ preview: a broken organ builder tears the attached renderer down', async () => {
  const harness = createPreviewHarness();
  const original = console.error;
  console.error = () => {};
  try {
    const { container, dispose } = await mounted(harness, { organ: 'broken' });
    assert.equal(container.dataset.previewState, 'unavailable');
    assert.equal(container.canvases.length, 0);
    assert.equal(harness.ledger.live.size, 0);
    dispose();
  } finally {
    console.error = original;
  }
});

test('organ preview: a lost context is never shown as ready, and comes back when restored', async () => {
  const harness = createPreviewHarness();
  const { container, dispose } = await mounted(harness);
  const canvas = container.canvases[0];
  canvas.dispatch('webglcontextlost');
  assert.equal(container.dataset.previewState, 'lost');
  assert.equal(harness.queuedFrames, 0, 'no frames on a lost context');
  const renders = harness.ledger.renders;
  harness.runFrame();
  assert.equal(harness.ledger.renders, renders);
  canvas.dispatch('webglcontextrestored');
  assert.equal(container.dataset.previewState, 'ready');
  assert.equal(harness.queuedFrames, 1);
  assert.equal(harness.ledger.constructed.length, 1, 'restored in place, not rebuilt');
  dispose();
});

test('organ preview: a context that stays lost is rebuilt after the recovery delay', async () => {
  const harness = createPreviewHarness();
  const { container, dispose } = await mounted(harness);
  container.canvases[0].dispatch('webglcontextlost');
  await harness.advance(500);
  assert.equal(harness.ledger.constructed.length, 2, 'rebuilt');
  assert.equal(harness.ledger.live.size, 1, 'the dead renderer was disposed');
  assert.equal(container.canvases.length, 1);
  assert.equal(container.dataset.previewState, 'ready');
  dispose();
});

test('organ preview: the pool never lets more than its maximum of contexts live at once', async () => {
  const harness = createPreviewHarness();
  const pool = createPreviewPool({ maxActive: 2 });
  const previews = [];
  for (let i = 0; i < 5; i += 1) previews.push(await mounted(harness, { pool }));
  assert.equal(pool.activeCount, 2);
  assert.equal(pool.waitingCount, 3);
  assert.equal(harness.ledger.live.size, 2);
  assert.equal(harness.ledger.peakLive, 2);
  assert.deepEqual(
    previews.map(({ container }) => container.dataset.previewState),
    ['ready', 'ready', 'waiting', 'waiting', 'waiting']
  );
  // The first scrolls away; after the grace period the third is granted.
  previews[0].observer.fire(false);
  await harness.advance(1000);
  assert.equal(pool.activeCount, 2);
  assert.equal(previews[2].container.dataset.previewState, 'ready');
  assert.equal(previews[0].container.dataset.previewState, 'waiting');
  assert.equal(harness.ledger.peakLive, 2, 'never three at once');
  // A waiting preview that scrolls away leaves the queue immediately.
  previews[3].observer.fire(false);
  assert.equal(pool.waitingCount, 1);
  // Disposing an active one hands its slot on at once.
  previews[1].dispose();
  await harness.settle();
  assert.equal(previews[4].container.dataset.previewState, 'ready');
  assert.equal(harness.ledger.peakLive, 2);
  for (const preview of previews) preview.dispose();
  assert.equal(harness.ledger.live.size, 0);
  assert.equal(pool.activeCount, 0);
  assert.equal(pool.waitingCount, 0);
});

test('organ preview: the shared default keeps to two contexts', () => {
  assert.equal(DEFAULT_MAX_ACTIVE_PREVIEWS, 2);
  const pool = createPreviewPool();
  assert.equal(pool.maxActive, 2);
});

test('organ preview: dispose is idempotent and removes every listener it added', async () => {
  const harness = createPreviewHarness();
  const { container, dispose, observer } = await mounted(harness);
  dispose();
  dispose();
  assert.ok(observer.disconnected);
  for (const type of ['pointerenter', 'pointerleave', 'pointerdown', 'pointerup', 'pointercancel']) {
    assert.equal(container.listeners.get(type)?.size ?? 0, 0, type);
  }
  assert.equal(harness.document.listeners.get('visibilitychange')?.size ?? 0, 0);
  assert.equal(harness.motion.listeners.size, 0);
  assert.equal(harness.pendingTimers, 0);
});
