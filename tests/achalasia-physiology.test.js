import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPACITY_ML,
  REFERENCE,
  columnPressureMmHg,
  solveAchalasia,
  waveAt,
} from '../src/models/achalasia.js';

/**
 * Constraints the physiology imposes on any model of oesophageal transport,
 * checked without reference to anything this repository chose.
 *
 * **Layer 1.** None of these mentions a calibration constant, a caption or a
 * stored answer, and every one would still be true if this repository did not
 * exist. They are the propositions the scene exists to teach, and they are
 * tests because a swallow model can be internally consistent and still say that
 * a weak wave and a tight ring are the same failure.
 */

const swallow = (relaxationFailure, peristalticVigour, extra = {}) =>
  solveAchalasia({ relaxationFailure, peristalticVigour, ...extra });

test('physiology: a swallow gets through when the wave outpushes the ring, and not otherwise', () => {
  // The sphincter passes nothing below its own pressure. That is the whole of
  // it: what decides a swallow is a difference of two pressures, not either one.
  const normal = swallow(0, 1);
  assert.equal(normal.clearedFraction.toFixed(3), '1.000');
  assert.equal(normal.retainedVolumeMl, 0);

  // A tight ring with a good wave, and a good ring with no wave, are different
  // failures — and neither is the pair. This is the whole reason the scene
  // exists, and the three have to come out different.
  const tightRing = swallow(1, 1);
  const noWave = swallow(0, 0);
  const both = swallow(1, 0);

  // A wave well above the ring's resting tone pushes past a ring that never
  // opens, but only from a standing column: it retains, and it settles.
  assert.ok(tightRing.retainedVolumeMl > 0, 'a ring that never opens retains');
  assert.ok(tightRing.balanced, 'and a vigorous wave still finds a balance against it');

  // A ring that lets go is a wide way through as well as a low pressure to
  // beat, so what is swallowed falls through it. Losing the wave costs
  // something and costs much less.
  assert.ok(noWave.retainedVolumeMl > 0, 'losing the wave is not free');
  assert.ok(
    noWave.retainedVolumeMl < tightRing.retainedVolumeMl / 3,
    `a relaxed ring empties largely on its own: ${noWave.retainedVolumeMl} vs ${tightRing.retainedVolumeMl}`
  );

  // And the pair is worse than either, which is the point of naming both.
  assert.ok(both.retainedVolumeMl > tightRing.retainedVolumeMl, 'the pair retains more than a tight ring alone');
  assert.equal(both.balanced, false, 'and finds no balance at all');
  assert.equal(both.clearedFraction, 0, 'nothing gets through');
});

test('physiology: what is retained supplies pressure of its own', () => {
  // A column of fluid weighs on what is below it. This is why a retained
  // oesophagus is not simply an accumulating one: the collecting column takes
  // over the pushing, and the system settles where that makes up the difference.
  assert.equal(columnPressureMmHg(0), 0);
  assert.ok(columnPressureMmHg(60) > columnPressureMmHg(30), 'taller weighs more');

  const balanced = swallow(0.74, 0.3);
  assert.ok(balanced.retainedVolumeMl > 0, 'it is holding something');
  assert.ok(balanced.balanced, 'and it has settled rather than filled');
  // At the balance, a swallow gets through — but only because of what is
  // already standing there. Take the column away and the same swallow does not.
  assert.equal(balanced.clearedFraction.toFixed(2), '1.00');
  const firstSwallow = solveAchalasia(
    { relaxationFailure: 0.74, peristalticVigour: 0.3 },
    { maxSwallows: 1 }
  );
  assert.ok(firstSwallow.clearedFraction < 1, `${firstSwallow.clearedFraction} on the first swallow`);
});

test('physiology: the column cannot be taller than the organ, so the balance has a limit', () => {
  // A column the height of the whole oesophagus is worth about sixteen
  // millimetres of mercury. Past a point that is not enough to open the ring at
  // all, and no balance exists inside the organ.
  const tallest = columnPressureMmHg(CAPACITY_ML);
  assert.ok(tallest > 10 && tallest < 25, `${tallest} mmHg from a ${REFERENCE.lengthCm} cm column`);
  assert.ok(tallest < REFERENCE.restingToneMmHg, 'which is less than the ring holds at rest');

  const failed = swallow(1, 0.05);
  assert.equal(failed.balanced, false);
  assert.equal(failed.retainedVolumeMl.toFixed(3), CAPACITY_ML.toFixed(3));
  assert.ok(failed.columnHeightCm <= REFERENCE.lengthCm + 1e-9, 'and no height it has no room for is reported');
});

test('physiology: a feeble wave stops travelling rather than pushing gently', () => {
  // The difference a reader has to see. A weak peristaltic wave is not a strong
  // one turned down: it dies out partway along, so nothing arrives at the ring
  // at all — which looks nothing like a gentle push.
  const strong = waveAt(1, 1);
  const feeble = waveAt(1, 0.1);
  assert.ok(strong.arrived, 'a vigorous wave reaches the ring');
  assert.equal(feeble.arrived, false, 'a feeble one does not');
  assert.ok(feeble.at < 0.4, `${feeble.at} of the way along`);

  // And how far it gets falls with vigour throughout, rather than at a step.
  let previous = 0;
  for (const vigour of [0, 0.25, 0.5, 0.75, 1]) {
    const reach = waveAt(1, vigour).at;
    assert.ok(reach >= previous, `${vigour}: ${reach}`);
    previous = reach;
  }
});

test('physiology: a bigger swallow into a failing oesophagus is held, not passed', () => {
  // What arrives has to leave for nothing to accumulate. Increase what arrives
  // without changing what can leave and more is left behind — and the balance
  // moves up, because the column has to weigh more to clear the larger bolus.
  const small = swallow(0.74, 0.3, { swallowVolumeMl: 3 });
  const large = swallow(0.74, 0.3, { swallowVolumeMl: 8 });
  assert.ok(large.retainedVolumeMl > small.retainedVolumeMl, `${small.retainedVolumeMl} -> ${large.retainedVolumeMl}`);
  // And in a normal oesophagus it changes nothing, because there the wave has
  // pressure to spare.
  assert.equal(swallow(0, 1, { swallowVolumeMl: 3 }).retainedVolumeMl, 0);
  assert.equal(swallow(0, 1, { swallowVolumeMl: 12 }).retainedVolumeMl, 0);
});
