import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BUNDLE_BUDGET_KB,
  DEVICE_CLASS_IDS,
  PERFORMANCE_BUDGETS,
  PHONE_MAX_WIDTH,
  QUALITY_TIERS,
  QUALITY_TIER_IDS,
  RECOVERY_WINDOWS,
  SAMPLE_WINDOW,
  createFrameBudgetMonitor,
  deviceClassForViewport,
  evaluateStartup,
  pixelRatioFor,
  qualityTier,
} from '../src/app/performanceBudget.js';

const feed = (monitor, frameMs, count) => {
  let last = null;
  for (let i = 0; i < count; i += 1) {
    const transition = monitor.sample(frameMs);
    if (transition) last = transition;
  }
  return last;
};

test('budget: every device class declares a complete, self-consistent budget', () => {
  for (const id of DEVICE_CLASS_IDS) {
    const budget = PERFORMANCE_BUDGETS[id];
    assert.ok(budget, `${id} has no budget`);
    assert.ok(budget.floorFps < budget.recoverFps, `${id}: recovery must sit above the floor`);
    assert.ok(budget.recoverFps <= budget.targetFps, `${id}: cannot recover past the target`);
    assert.ok(budget.maxPixelRatio >= 1, `${id}: pixel ratio ceiling below 1x`);
    assert.ok(budget.startupMs > 0 && budget.startupMs <= 5000, `${id}: implausible start-up budget`);
    assert.ok(budget.jankRatio > 0 && budget.jankRatio < 1, `${id}: jank ratio must be a fraction`);
  }
});

test('budget: device classes partition the viewport with no gap', () => {
  assert.equal(deviceClassForViewport(320), 'phone');
  assert.equal(deviceClassForViewport(430), 'phone');
  assert.equal(deviceClassForViewport(PHONE_MAX_WIDTH), 'phone');
  assert.equal(deviceClassForViewport(PHONE_MAX_WIDTH + 1), 'tablet');
  assert.equal(deviceClassForViewport(1279), 'tablet');
  assert.equal(deviceClassForViewport(1280), 'desktop');
  assert.equal(deviceClassForViewport(Number.NaN), 'desktop');
});

test('budget: phones keep the stricter pixel-ratio ceiling', () => {
  assert.equal(pixelRatioFor({ devicePixelRatio: 3, deviceClass: 'phone' }), 1.5);
  assert.equal(pixelRatioFor({ devicePixelRatio: 3, deviceClass: 'desktop' }), 2);
  assert.equal(pixelRatioFor({ devicePixelRatio: 1, deviceClass: 'desktop' }), 1);
});

test('budget: the lowest tier caps the pixel ratio at 1x on every device', () => {
  for (const id of DEVICE_CLASS_IDS) {
    assert.equal(pixelRatioFor({ devicePixelRatio: 3, deviceClass: id, tier: 'low' }), 1);
  }
});

test('budget: quality tiers give up presentation before they give up resolution', () => {
  assert.deepEqual(QUALITY_TIER_IDS, ['high', 'medium', 'low']);
  assert.equal(qualityTier('high').bloom, true);
  assert.equal(qualityTier('medium').bloom, false);
  assert.equal(qualityTier('medium').pixelRatioCap, null);
  assert.equal(qualityTier('low').pixelRatioCap, 1);
  for (const tier of QUALITY_TIERS) {
    assert.ok(tier.labelEn && tier.labelJa, `${tier.id} needs a label in both languages`);
  }
});

test('monitor: a comfortable frame rate never changes tier', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'desktop' });
  assert.equal(feed(monitor, 16, SAMPLE_WINDOW * 8), null);
  assert.equal(monitor.tier, 'high');
});

test('monitor: no decision is taken before a full window of frames', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'desktop' });
  assert.equal(feed(monitor, 50, SAMPLE_WINDOW - 1), null);
  assert.equal(monitor.windows, 0);
  const transition = monitor.sample(50);
  assert.equal(transition.direction, 'degrade');
  assert.equal(monitor.windows, 1);
});

test('monitor: sustained slow frames walk down the ladder and then stop', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'desktop' });
  const first = feed(monitor, 40, SAMPLE_WINDOW);
  assert.deepEqual([first.from, first.to, first.direction], ['high', 'medium', 'degrade']);
  const second = feed(monitor, 40, SAMPLE_WINDOW);
  assert.deepEqual([second.from, second.to], ['medium', 'low']);
  assert.equal(feed(monitor, 40, SAMPLE_WINDOW * 3), null, 'low is the floor');
  assert.equal(monitor.tier, 'low');
});

test('monitor: a fast mean with heavy stutter still counts as over budget', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'desktop' });
  // 8ms most frames, a 60ms hitch every third: mean stays under the floor.
  let transition = null;
  for (let i = 0; i < SAMPLE_WINDOW; i += 1) {
    const result = monitor.sample(i % 3 === 0 ? 60 : 8);
    if (result) transition = result;
  }
  assert.ok(transition, 'stutter should be detected even when the mean looks fine');
  assert.ok(monitor.lastWindow.meanMs < monitor.floorMs, 'the mean alone would have passed');
  assert.match(transition.reason, /jank/);
});

test('monitor: quality is restored only after sustained headroom', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'desktop' });
  feed(monitor, 40, SAMPLE_WINDOW);
  assert.equal(monitor.tier, 'medium');

  // Just clearing the floor is not enough to earn the expensive tier back.
  assert.equal(feed(monitor, 25, SAMPLE_WINDOW * (RECOVERY_WINDOWS + 2)), null);
  assert.equal(monitor.tier, 'medium');

  assert.equal(feed(monitor, 12, SAMPLE_WINDOW * (RECOVERY_WINDOWS - 1)), null);
  const recovered = feed(monitor, 12, SAMPLE_WINDOW);
  assert.deepEqual([recovered.from, recovered.to, recovered.direction], ['medium', 'high', 'recover']);
});

test('monitor: recovery streaks are broken by a single bad window', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'desktop' });
  feed(monitor, 40, SAMPLE_WINDOW);
  feed(monitor, 12, SAMPLE_WINDOW * (RECOVERY_WINDOWS - 1));
  feed(monitor, 25, SAMPLE_WINDOW); // healthy enough not to degrade, not enough to count
  assert.equal(feed(monitor, 12, SAMPLE_WINDOW), null, 'the streak must start over');
  assert.equal(monitor.tier, 'medium');
});

test('monitor: reset clears evidence without changing the tier', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'phone' });
  feed(monitor, 40, SAMPLE_WINDOW - 1);
  monitor.reset();
  assert.equal(feed(monitor, 40, SAMPLE_WINDOW - 1), null);
  assert.equal(monitor.tier, 'high');
});

test('monitor: ignores non-frames instead of poisoning the average', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'desktop' });
  for (const bad of [0, -1, Number.NaN, Infinity, undefined]) {
    assert.equal(monitor.sample(bad), null);
  }
  assert.equal(monitor.windows, 0);
});

test('monitor: report is safe to read before any window has completed', () => {
  const monitor = createFrameBudgetMonitor({ deviceClass: 'tablet' });
  const empty = monitor.report();
  assert.equal(empty.tier, 'high');
  assert.equal(empty.windows, 0);
  assert.equal(empty.meanFps, null);

  feed(monitor, 16, SAMPLE_WINDOW);
  const filled = monitor.report();
  assert.equal(filled.windows, 1);
  assert.ok(filled.meanFps > 55 && filled.meanFps < 65);
  assert.equal(filled.deviceClass, 'tablet');
});

test('startup: elapsed time is judged against the class budget', () => {
  const fast = evaluateStartup(900, 'desktop');
  assert.equal(fast.withinBudget, true);
  assert.equal(fast.overByMs, 0);

  const slow = evaluateStartup(PERFORMANCE_BUDGETS.desktop.startupMs + 500, 'desktop');
  assert.equal(slow.withinBudget, false);
  assert.equal(slow.overByMs, 500);

  // The same elapsed time can be within budget on a phone and over it on a desktop.
  const elapsed = PERFORMANCE_BUDGETS.desktop.startupMs + 100;
  assert.equal(evaluateStartup(elapsed, 'phone').withinBudget, true);
  assert.equal(evaluateStartup(elapsed, 'desktop').withinBudget, false);
});

test('startup: an unknown device class falls back to the strictest budget', () => {
  assert.equal(evaluateStartup(2600, 'watch').budgetMs, PERFORMANCE_BUDGETS.desktop.startupMs);
  assert.equal(evaluateStartup(Number.NaN, 'desktop').elapsedMs, 0);
});

test('budget: ship weight is declared and internally ordered', () => {
  assert.ok(BUNDLE_BUDGET_KB.entry < BUNDLE_BUDGET_KB.largestChunk);
  assert.ok(BUNDLE_BUDGET_KB.largestChunk < BUNDLE_BUDGET_KB.code);
  assert.ok(BUNDLE_BUDGET_KB.css < BUNDLE_BUDGET_KB.code);
  // Specimen media is fetched by one scene, code by every visitor. A media
  // allowance below the code allowance would mean we had stopped believing that.
  assert.ok(BUNDLE_BUDGET_KB.media > BUNDLE_BUDGET_KB.code);
});
