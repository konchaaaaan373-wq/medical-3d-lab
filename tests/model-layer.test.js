import test from 'node:test';
import assert from 'node:assert/strict';
import { createStepper, fixedPoint, run } from '../src/models/integrate.js';
import { scatter, seededRandom } from '../src/models/random.js';
import { cmH2OToMmHg, mmHgToCmH2O, perMinuteToPerSecond } from '../src/models/units.js';

/**
 * The medical layer's foundations. Nothing here is physiology yet — these are
 * the properties every model built on top is allowed to assume: that the answer
 * does not depend on the frame rate, that heterogeneity is the same on every
 * reload, and that the units convert back to themselves.
 */

test('a fixed-step stepper takes the same number of steps however the frames fall', () => {
  const count = (frames) => {
    const stepper = createStepper({ hz: 100 });
    let steps = 0;
    for (const dt of frames) stepper.advance(dt, () => (steps += 1));
    return steps;
  };

  // One second of real time, delivered as 60 fps, as 30 fps, and as a jittery
  // mixture of the two. The physiology has to be the same in all three.
  const smooth = Array.from({ length: 60 }, () => 1 / 60);
  const slow = Array.from({ length: 30 }, () => 1 / 30);
  const jittery = Array.from({ length: 45 }, (_, i) => (i % 3 === 0 ? 1 / 20 : 1 / 120));

  assert.equal(count(smooth), 100);
  assert.equal(count(slow), 100);
  // The jittery frames add to one second too, give or take the leftover the
  // accumulator is carrying into the next call.
  assert.ok(Math.abs(count(jittery) - 100) <= 1, `jittery frames took ${count(jittery)} steps`);
});

test('a backgrounded tab does not fast-forward the physiology', () => {
  const stepper = createStepper({ hz: 100, maxCatchUp: 0.25 });
  let steps = 0;
  // Ten minutes of wall clock, because the tab was hidden.
  stepper.advance(600, () => (steps += 1));
  assert.equal(steps, 25, 'a long gap is clamped to the catch-up limit');
});

test('a stepper reports where between two solved states the drawn frame falls', () => {
  const stepper = createStepper({ hz: 10 });
  stepper.advance(0.15, () => {});
  assert.ok(stepper.alpha > 0.49 && stepper.alpha < 0.51, `alpha was ${stepper.alpha}`);
});

test('`run` integrates a known decay to the analytic answer', () => {
  // dx/dt = -x/tau, so x(t) = x0 * exp(-t/tau). If the integrator cannot get
  // this right, nothing built on it is worth reading.
  const tau = 2;
  let x = 1;
  run({ seconds: 4, hz: 1000, step: (h) => (x -= (x / tau) * h) });
  assert.ok(Math.abs(x - Math.exp(-2)) < 1e-3, `got ${x}, expected ${Math.exp(-2)}`);
});

test('`run` samples at the rate asked for, not at the solver rate', () => {
  const samples = run({ seconds: 1, hz: 400, sampleHz: 20, step: () => {}, sample: (t) => t });
  // Twenty samples in the second, plus the closing one at t = 1.
  assert.equal(samples.length, 21);
  assert.equal(samples[0], 0);
  assert.ok(Math.abs(samples[20] - 1) < 1e-9);
});

test('a fixed point converges, and says so when it does not', () => {
  // x = cos(x) has one, near 0.739.
  const solved = fixedPoint({
    initial: 0,
    next: (x) => Math.cos(x),
    blend: (a, b, t) => a + (b - a) * t,
    distance: (a, b) => Math.abs(a - b),
  });
  assert.ok(solved.converged);
  assert.ok(Math.abs(solved.value - 0.739085) < 1e-3, `got ${solved.value}`);

  // Something that never settles has to report that rather than hand back its
  // last iterate as an answer.
  const unsettled = fixedPoint({
    initial: 0,
    next: (x) => x + 1,
    blend: (a, b, t) => a + (b - a) * t,
    distance: (a, b) => Math.abs(a - b),
    maxIterations: 20,
  });
  assert.equal(unsettled.converged, false);
});

test('seeded randomness is the same lung on every reload', () => {
  const first = Array.from({ length: 8 }, seededRandom(42));
  const second = Array.from({ length: 8 }, seededRandom(42));
  const other = Array.from({ length: 8 }, seededRandom(43));
  assert.deepEqual(first, second, 'the same seed gives the same sequence');
  assert.notDeepEqual(first, other, 'a different seed gives a different one');
});

test('scattering units keeps the average exactly where it was', () => {
  for (const spread of [0.1, 0.4, 0.8]) {
    const values = scatter({ count: 24, spread, seed: 7 });
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    assert.ok(Math.abs(mean - 1) < 1e-12, `spread ${spread} moved the mean to ${mean}`);
    assert.ok(Math.max(...values) > Math.min(...values), 'there is actually variation');
  }
});

test('scatter is reproducible and its spread is what was asked for', () => {
  assert.deepEqual(scatter({ count: 6, spread: 0.3, seed: 3 }), scatter({ count: 6, spread: 0.3, seed: 3 }));
  const wide = scatter({ count: 40, spread: 0.6, seed: 3 });
  const narrow = scatter({ count: 40, spread: 0.15, seed: 3 });
  const range = (values) => Math.max(...values) - Math.min(...values);
  assert.ok(range(wide) > range(narrow), 'a larger spread produces a wider population');
});

test('pressure units convert back to themselves', () => {
  for (const value of [1, 7.5, 30]) {
    assert.ok(Math.abs(mmHgToCmH2O(cmH2OToMmHg(value)) - value) < 1e-9);
  }
  // The one number everybody knows: 10 cmH₂O is a little over 7 mmHg.
  assert.ok(Math.abs(cmH2OToMmHg(10) - 7.36) < 0.01);
  assert.equal(perMinuteToPerSecond(60), 1);
});
