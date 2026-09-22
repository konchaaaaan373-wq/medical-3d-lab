import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PERFORMANCE_BUDGETS, pixelRatioFor } from '../src/app/performanceBudget.js';
import { Viewer } from '../src/app/Viewer.js';

const source = readFileSync(new URL('../src/app/Viewer.js', import.meta.url), 'utf8');

/**
 * The animation path only.
 *
 * `snapshot()` deliberately renders off-screen at an exact pixel size for the
 * social presets, so its own `setPixelRatio` calls are an export concern rather
 * than a frame-budget one and must not be read as policy. `captureSize()` holds
 * the same exact size for the length of a video recording and is therefore the
 * same kind of thing — which is why both live below this line, and why putting
 * one of them above it fails here rather than passing quietly.
 */
const animationPath = source.slice(0, source.indexOf('snapshot(size)'));

test('viewer: the export block holds every exact-size manipulation', () => {
  // The boundary above is a position in a file, so it only means something
  // while the methods that belong below it are below it.
  const exportBlock = source.slice(source.indexOf('snapshot(size)'));
  assert.match(exportBlock, /captureSize\(\{ width, height \}\)/);
  assert.match(exportBlock, /_applyHeldSize\(\)/);
});

test('viewer: normal animation never preserves every WebGL drawing buffer', () => {
  assert.match(source, /preserveDrawingBuffer:\s*false/);
  assert.ok(!/preserveDrawingBuffer:\s*true/.test(source));
});

test('viewer: partial construction is cleaned before the error escapes', () => {
  const constructor = source.slice(source.indexOf('constructor('), source.indexOf('onFrame(handler)'));
  assert.match(constructor, /try \{[\s\S]*new THREE\.WebGLRenderer/);
  assert.match(constructor, /catch \(error\) \{[\s\S]*this\.dispose\(\);[\s\S]*throw error;/);
  assert.match(source, /this\.renderer\?\.forceContextLoss\?\.\(\)/);
  assert.match(source, /this\.renderer\?\.domElement\?\.remove\(\)/);
});

test('viewer: PNG capture explicitly renders immediately before readback', () => {
  const snapshot = source.slice(source.indexOf('snapshot(size)'));
  assert.match(snapshot, /this\.composer\.render\(\);\s*return this\.renderer\.domElement\.toDataURL\('image\/png'\)/);
  assert.match(snapshot, /this\.composer\.render\(\);\s*const url = this\.renderer\.domElement\.toDataURL\('image\/png'\)/);
});

test('viewer: the frame budget is declared centrally, not inlined as magic numbers', () => {
  assert.match(source, /from '\.\/performanceBudget\.js'/);
  // The policy the viewer used to carry itself.
  assert.ok(!/window\.innerWidth < 720/.test(source), 'device class must come from the budget module');
  assert.ok(!/0\.026/.test(source), 'frame-time thresholds must come from the budget module');
  assert.ok(
    !/setPixelRatio\(1\)/.test(animationPath),
    'pixel-ratio floors must come from the budget module'
  );
});

test('viewer: every pixel ratio it asks for goes through the budget', () => {
  const calls = animationPath.match(/setPixelRatio\(([^)]*)\)/g) ?? [];
  assert.ok(calls.length > 0);
  for (const call of calls) {
    assert.match(call, /ratio|_budgetedPixelRatio/, `un-budgeted pixel ratio: ${call}`);
  }
});

test('viewer: phones still keep the stricter pixel-ratio ceiling and can reach 1x', () => {
  assert.equal(PERFORMANCE_BUDGETS.phone.maxPixelRatio, 1.5);
  assert.equal(pixelRatioFor({ devicePixelRatio: 3, deviceClass: 'phone' }), 1.5);
  assert.equal(pixelRatioFor({ devicePixelRatio: 3, deviceClass: 'phone', tier: 'low' }), 1);
});

test('viewer: quality transitions are observable rather than console-only', () => {
  assert.match(source, /onQuality\(handler\)/);
  assert.match(source, /for \(const handler of this\.qualityHandlers\)/);
});

test('viewer: applying a tier cannot recurse through resize', () => {
  const sync = source.slice(source.indexOf('_syncDeviceClass()'), source.indexOf('start()'));
  assert.ok(!/this\.resize\(\)/.test(sync), '_syncDeviceClass runs inside resize and must not call it');
});

/**
 * A viewer with fake plumbing, so the held-size path can be *run* rather than
 * read. Everything `captureSize` touches is here and nothing else is: the real
 * constructor needs a WebGL context, which `node --test` does not have.
 */
function stubViewer({ devicePixelRatio = 2, tier = 'high', deviceClass = 'desktop' } = {}) {
  const calls = { renderer: [], composer: [] };
  const viewer = Object.create(Viewer.prototype);
  viewer.deviceClass = deviceClass;
  viewer.frameBudget = { tier };
  viewer.resizeHandlers = new Set();
  viewer.camera = { aspect: 16 / 9, fov: 42, updateProjectionMatrix() {} };
  viewer.renderer = {
    _ratio: pixelRatioFor({ devicePixelRatio, deviceClass, tier }),
    _size: { x: 800, y: 450 },
    getPixelRatio() {
      return this._ratio;
    },
    setPixelRatio(value) {
      this._ratio = value;
      calls.renderer.push(value);
    },
    getSize(target) {
      target.x = this._size.x;
      target.y = this._size.y;
      return target;
    },
    setSize(width, height) {
      this._size = { x: width, y: height };
    },
  };
  viewer.composer = {
    size: null,
    setSize(width, height) {
      this.size = { width, height };
    },
    setPixelRatio(value) {
      calls.composer.push(value);
    },
  };
  return { viewer, calls };
}

test('viewer: a held capture holds the composer at 1x too, not only the renderer', () => {
  // The composer keeps its own pixel ratio, taken from the renderer when it was
  // constructed. Holding only the renderer's at 1 left a 1080x1920 export
  // rendering its passes at 2160x3840 on a 2x display — and the probe that
  // decides whether this machine can sustain the declared size was timing that
  // larger number, so it could reject a size the device could actually draw.
  const previous = globalThis.window;
  globalThis.window = { devicePixelRatio: 2, innerWidth: 1440 };
  try {
    const { viewer, calls } = stubViewer({ devicePixelRatio: 2 });
    viewer.captureSize({ width: 1080, height: 1920 });
    assert.deepEqual(calls.renderer, [1]);
    assert.deepEqual(calls.composer, [1], 'the composer was left at its construction ratio');
    assert.deepEqual(viewer.composer.size, { width: 1080, height: 1920 });
  } finally {
    globalThis.window = previous;
  }
});

test('viewer: releasing a capture asks the budget again rather than restoring a stale ratio', () => {
  // A fifteen-second recording is long enough for the frame-budget monitor to
  // drop a tier while it runs. Restoring the ratio the viewer had *before* the
  // recording put the interactive scene back at a quality the monitor had
  // already decided this machine could not hold — and nothing recomputes it
  // afterwards, so it stayed there for the rest of the session.
  const previous = globalThis.window;
  globalThis.window = { devicePixelRatio: 2, innerWidth: 1440 };
  try {
    const { viewer, calls } = stubViewer({ devicePixelRatio: 2, tier: 'high' });
    const before = viewer.renderer.getPixelRatio();
    const release = viewer.captureSize({ width: 1080, height: 1920 });
    // What a slow recording does to the monitor.
    viewer.frameBudget = { tier: 'low' };
    release();
    const budgeted = pixelRatioFor({ devicePixelRatio: 2, deviceClass: 'desktop', tier: 'low' });
    assert.notEqual(budgeted, before, 'the fixture must actually change tiers, or this proves nothing');
    assert.equal(viewer.renderer.getPixelRatio(), budgeted);
    assert.equal(calls.composer.at(-1), budgeted, 'the composer was left behind at the capture ratio');
    assert.deepEqual(viewer.composer.size, { width: 800, height: 450 });
  } finally {
    globalThis.window = previous;
  }
});
