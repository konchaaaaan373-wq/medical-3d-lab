import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAMETER_RANGE,
  LOCATIONS,
  UTERUS,
  solveUterineFibroid,
} from '../src/models/uterineFibroid.js';

/**
 * Layer 1 — what this model asserts about fibroids rather than about itself.
 *
 * The scene is geometry, which is exactly why these are worth fixing: each is a
 * proposition a reader is meant to leave with, and each would be true if this
 * repository did not exist.
 */

const PLACES = ['submucosal', 'intramural', 'subserosal'];
const at = (location, diameter) => solveUterineFibroid({ location, diameter });

test('physiology: where it sits is a choice, and moving the size does not change it', () => {
  // Three names for three depths. Nothing in the model turns one into another,
  // and the depth a location is given does not move with the size.
  for (const location of PLACES) {
    const depths = new Set(
      [0.12, 0.3, 0.45, 0.62].map((diameter) => at(location, diameter).centreDepth.toFixed(9))
    );
    assert.equal(depths.size, 1, `${location}: its depth is a property of the name, not of the size`);
  }

  const depthOf = (location) => at(location, 0.3).centreDepth;
  assert.ok(depthOf('submucosal') < depthOf('intramural'), 'submucosal is nearer the cavity');
  assert.ok(depthOf('intramural') < depthOf('subserosal'), 'and subserosal nearer the surface');
  assert.ok(depthOf('subserosal') < UTERUS.wallDepth, 'all three are inside the wall');

  // The three the scene offers are the three the model knows, and no fourth.
  assert.deepEqual(LOCATIONS.map((entry) => entry.id), ['none', ...PLACES]);
});

test('physiology: the same size is the same uterine volume at every depth', () => {
  // The figure that says nothing. A uterus made larger by a fibroid is made
  // larger by exactly the fibroid, wherever it sits — so "how big has it
  // become" cannot distinguish the three pictures the scene is about.
  for (const diameter of [0.15, 0.3, 0.45, 0.62]) {
    const ratios = PLACES.map((location) => at(location, diameter).uterineVolumeRatio);
    for (const ratio of ratios) assert.equal(ratio, ratios[0], `at ${diameter} the volume is the same`);
    assert.ok(ratios[0] > 1, 'and it is larger than it was');
  }

  // It goes as the cube of the diameter, which is the other half of why the
  // number is a poor guide: doubling the width is eight times the lump.
  const small = at('intramural', 0.2);
  const twice = at('intramural', 0.4);
  assert.ok(
    Math.abs((twice.fibroidVolume / small.fibroidVolume) - 8) < 1e-9,
    'twice the diameter is eight times the volume'
  );
});

test('physiology: the middle of the wall is the one place that reaches nothing', () => {
  // A sphere crosses a plane when its radius exceeds its distance from it. So
  // the shallow one is against the cavity from the start, the deep one against
  // the surface from the start, and only the middle has a range in which it is
  // against neither — and leaves it by reaching both at once.
  const smallest = DIAMETER_RANGE.min;
  assert.equal(at('submucosal', smallest).reachesCavity, true, 'shallow: against the cavity at once');
  assert.equal(at('submucosal', DIAMETER_RANGE.max).reachesSerosa, false, 'and never the surface');
  assert.equal(at('subserosal', DIAMETER_RANGE.max).reachesCavity, false, 'deep: never the cavity');

  const middle = at('intramural', smallest);
  assert.equal(middle.reachesCavity, false, 'the middle reaches neither');
  assert.equal(middle.reachesSerosa, false, 'the middle reaches neither');
  assert.equal(middle.wallThickeningRatio, 1, 'and changes the wall nowhere');

  // Crossing happens at the diameter the model names, and both at once because
  // the middle is the same distance from each side.
  const crossing = at('intramural', DIAMETER_RANGE.max);
  assert.equal(crossing.reachesCavity, true);
  assert.equal(crossing.reachesSerosa, true);
  assert.ok(
    Math.abs(crossing.reachesCavityAt - crossing.reachesSerosaAt) < 1e-9,
    'the middle is equidistant, so it reaches both at the same size'
  );
  assert.ok(
    Math.abs(crossing.cavityIndent - crossing.serosalBulge) < 1e-9,
    'and by the same amount'
  );
});

test('physiology: what presses into the cavity is measured as a share of a surface', () => {
  // The cavity is a plane, so the contact is a disc on it and grows with the
  // square of the radius that disc has — not with the fibroid's volume, and not
  // with the size of the uterus.
  let previous = -1;
  for (const diameter of [0.15, 0.3, 0.45, 0.62]) {
    const solved = at('submucosal', diameter);
    assert.ok(solved.cavityContactFraction > previous, `${diameter}: more of the cavity`);
    assert.ok(solved.cavityContactFraction <= 1, 'and never more than all of it');
    previous = solved.cavityContactFraction;
  }

  // A deep one takes none of it however large, which is the comparison the
  // scene is for: the same volume against a different thing.
  const large = 0.62;
  assert.equal(at('subserosal', large).cavityContactFraction, 0);
  assert.ok(at('submucosal', large).cavityContactFraction > 0.5);
  assert.equal(
    at('subserosal', large).uterineVolumeRatio,
    at('submucosal', large).uterineVolumeRatio,
    'at the same volume'
  );

  // And the same disc on the other side: a deep one stands past the surface.
  assert.ok(at('subserosal', large).serosalBulge > 0);
  assert.equal(at('submucosal', large).serosalBulge, 0);
});
