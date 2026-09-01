import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PERFORMANCE_BUDGETS, pixelRatioFor } from '../src/app/performanceBudget.js';

const source = readFileSync(new URL('../src/app/Viewer.js', import.meta.url), 'utf8');

/**
 * The animation path only.
 *
 * `snapshot()` deliberately renders off-screen at an exact pixel size for the
 * social presets, so its own `setPixelRatio` calls are an export concern rather
 * than a frame-budget one and must not be read as policy.
 */
const animationPath = source.slice(0, source.indexOf('snapshot(size)'));

test('viewer: normal animation never preserves every WebGL drawing buffer', () => {
  assert.match(source, /preserveDrawingBuffer:\s*false/);
  assert.ok(!/preserveDrawingBuffer:\s*true/.test(source));
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
