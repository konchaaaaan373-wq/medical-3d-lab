import test from 'node:test';
import assert from 'node:assert/strict';

import { CANALS, DRIVES_ABOVE, MAX_PITCH, solveBppv } from '../src/models/bppv.js';

const at = (canal, head = 1, side = 'left') => solveBppv(head, { canal, side });
const LOOPS = CANALS.filter((c) => c.normal).map((c) => c.id);

test('physiology: a loop can only be driven by the gravity lying in its plane', () => {
  // The whole model. The lateral loop is level with the head upright, so
  // upright gravity runs along its normal and there is nothing in its plane.
  const level = at('lateral', 0);
  assert.ok(level.inPlane < DRIVES_ABOVE, `${level.inPlane} should be nothing in the plane`);
  assert.equal(level.drives, false, 'so it can drive nothing at all');
  assert.equal(level.travel, 0);

  // The posterior loop's plane already holds gravity when the head is upright.
  const upright = at('posterior', 0);
  assert.ok(upright.inPlane > 0.9, 'the posterior plane holds nearly all of it');
  assert.equal(upright.drives, true);
});

test('physiology: two loops in one ear, at one head position, are in different states', () => {
  // The reason the scene is worth three dimensions, stated as a comparison at a
  // single point on the axis.
  const lateral = at('lateral', 0);
  const posterior = at('posterior', 0);
  assert.equal(lateral.drives, false);
  assert.equal(posterior.drives, true);
  assert.ok(posterior.inPlane - lateral.inPlane > 0.85, 'and not by a little');
});

test('physiology: taking the head back brings gravity into the level loop’s plane', () => {
  // Gravity does not move; the head does, and the plane goes with it. The
  // share is **not monotonic** and must not be asserted to be: the head can
  // carry the plane past the point where it holds the most, after which it
  // starts to leave again. What has to hold is that it begins at nothing and
  // becomes most of it.
  assert.ok(at('lateral', 0).inPlane < DRIVES_ABOVE, 'it begins with nothing in the plane');
  const shares = [0.25, 0.5, 0.75, 1].map((head) => at('lateral', head).inPlane);
  assert.ok(shares[0] > 0.3, 'and rises quickly once the head moves at all');
  assert.ok(Math.max(...shares) > 0.95, 'to nearly all of it');
  assert.ok(at('lateral', 1).inPlane > 0.8, 'and is still most of it at the top of the axis');
  assert.ok(at('lateral', 1).drives, 'and the loop can drive something');
  assert.ok(MAX_PITCH > 0);
});

test('physiology: the particle starts where it already was, not somewhere convenient', () => {
  // A particle in a loop whose plane already holds gravity has long since
  // settled, so an upright head must show no travel at all — otherwise the
  // picture draws a journey a still head had already finished.
  for (const canal of LOOPS) {
    assert.equal(at(canal, 0).travel, 0, `${canal}: nothing has moved with the head upright`);
    assert.equal(at(canal, 0).travelFraction, 0);
  }
  // And travel grows from there as the head goes back.
  assert.ok(at('posterior', 1).travelFraction > 0.4, 'the posterior particle travels a long way round');
});

test('physiology: the direction of travel is named against the ampulla, not signed', () => {
  for (const canal of LOOPS) {
    assert.equal(at(canal, 0).towardsAmpulla, null, 'nothing has moved, so nothing has a direction');
    assert.equal(typeof at(canal, 1).towardsAmpulla, 'boolean', `${canal}: once it moves, it has one`);
  }
  // Nothing loose means no direction and no travel anywhere.
  const none = at('none', 1);
  assert.equal(none.drives, false);
  assert.equal(none.travel, 0);
  assert.equal(none.towardsAmpulla, null);
});

test('physiology: no eye movement is produced anywhere in the output', () => {
  // The step this model refuses to take. A caller has to find the absence.
  for (const canal of [...LOOPS, 'none']) {
    const solved = at(canal, 1);
    assert.equal(solved.nystagmus, null, `${canal}: no eye movement is produced`);
    for (const key of Object.keys(solved)) {
      assert.ok(
        !/nystag|eye|gaze|vertigo|dizz|severity|grade/i.test(key) || key === 'nystagmus',
        `${canal}: "${key}" reads as an eye movement or a symptom`
      );
    }
  }
});
