import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPSULE_GIVE,
  KIDNEY_VOLUME,
  LEVELS,
  PELVIS_VOLUME,
  STRETCHES,
  THINNED_BELOW,
  solveUrinaryObstruction,
} from '../src/models/urinaryObstruction.js';

const at = (level, backPressure = 1) => solveUrinaryObstruction(backPressure, { level });
const BLOCKING = LEVELS.filter((level) => level.blocks).map((level) => level.id);

test('physiology: how many kidneys are behind it is decided by the place, not the amount', () => {
  // The whole reason the level is a control and not a point on the axis. Three
  // of the four blocking levels have one kidney above them whatever the amount;
  // the fourth has both, at any amount at all.
  for (const backPressure of [0.2, 0.6, 1]) {
    assert.equal(at('pelviureteric', backPressure).kidneysBehind, 1);
    assert.equal(at('mid-ureter', backPressure).kidneysBehind, 1);
    assert.equal(at('vesicoureteric', backPressure).kidneysBehind, 1);
    assert.equal(at('bladder-outlet', backPressure).kidneysBehind, 2);
  }

  // And the side that is not behind it is named, because "the other one is
  // unchanged" is half of what the level decides.
  assert.equal(at('mid-ureter').sparedSide, 'right');
  assert.equal(at('bladder-outlet').sparedSide, null);
  assert.equal(at('none').kidneysBehind, 0);
});

test('physiology: the spared kidney is untouched, whatever the amount', () => {
  // A severity axis would take both kidneys down together. This one must not:
  // the right-hand kidney is at rest in every one-sided level, at every amount.
  for (const level of ['pelviureteric', 'mid-ureter', 'vesicoureteric']) {
    for (const backPressure of [0.3, 1]) {
      const solved = at(level, backPressure);
      assert.equal(solved.kidneys.right.pelvisRatio, 1, `${level}: the other pelvis is at rest`);
      assert.equal(solved.kidneys.right.parenchymaRatio, 1, `${level}: and its parenchyma is whole`);
      assert.ok(solved.kidneys.left.pelvisRatio > 1, `${level}: while this one has filled`);
    }
  }

  // At the bladder outlet neither is spared, and both are in the same state.
  const both = at('bladder-outlet');
  assert.deepEqual(both.kidneys.left, both.kidneys.right);
  assert.ok(both.kidneys.right.pelvisRatio > 1);
});

test('physiology: everything above the blockage is distended and everything below is not', () => {
  // The step from one to the other is where the blockage is, and it is the only
  // thing in the picture that says "above" rather than "affected".
  for (const level of BLOCKING) {
    const solved = at(level);
    const blockedIndex = STRETCHES.findIndex((stretch) => stretch.id === solved.blockedAt);
    assert.ok(blockedIndex >= 0, `${level}: names a stretch the tract has`);

    const above = solved.stretches.filter((stretch) => stretch.above).map((stretch) => stretch.id);
    assert.ok(above.includes(solved.blockedAt), `${level}: the blocked stretch fills`);

    for (const stretch of solved.stretches) {
      if (stretch.above) {
        assert.ok(stretch.ratio > 1, `${level}: ${stretch.id} is above it and distended`);
      } else {
        assert.equal(stretch.ratio, 1, `${level}: ${stretch.id} is below it and is not`);
      }
    }
  }

  // Nothing is distended when nothing is blocked.
  assert.equal(at('none').stretches.every((stretch) => stretch.ratio === 1), true);
  assert.equal(at('mid-ureter', 0).blocked, false, 'and nothing has backed up at the bottom of the axis');
});

test('physiology: further down the same ureter puts more of the tract above the same kidney', () => {
  // The second thing the place decides, and the one that is not about sides:
  // the same kidney with a different length of tube behind the blockage.
  const high = at('pelviureteric');
  const middle = at('mid-ureter');
  const low = at('vesicoureteric');

  assert.ok(high.distendedShare < middle.distendedShare);
  assert.ok(middle.distendedShare < low.distendedShare);
  assert.equal(high.kidneysBehind, low.kidneysBehind, 'with the same number of kidneys throughout');

  // The pelviureteric level leaves the whole tube alone, which is the picture
  // a reader is least likely to expect.
  const tube = high.stretches.filter((stretch) => stretch.kind === 'ureter');
  assert.equal(tube.every((stretch) => stretch.ratio === 1), true);
  assert.equal(high.stretch('left-pelvis').above, true);

  // And the bladder outlet is the only level with the bladder above it.
  assert.equal(at('bladder-outlet').stretch('bladder').above, true);
  for (const level of ['pelviureteric', 'mid-ureter', 'vesicoureteric']) {
    assert.equal(at(level).stretch('bladder').above, false, `${level}: the bladder is downstream`);
  }
});

test('physiology: the room the collecting system gains comes mostly out of the parenchyma', () => {
  // The second claim, and it is a conservation statement: the capsule barely
  // gives, so a pelvis that has filled is a parenchyma that has thinned.
  const solved = at('mid-ureter');
  const kidney = solved.kidneys.left;

  assert.ok(kidney.pelvisRatio > 2, 'the collecting system is much larger than it was');
  assert.ok(kidney.capsuleRatio < 1.06, 'while the outside of the kidney is barely different');
  assert.ok(kidney.parenchymaRatio < THINNED_BELOW, 'and what is between them has thinned');
  assert.equal(solved.parenchymaThinned, true);

  // Most of the volume came from inside rather than from the capsule giving.
  assert.ok(solved.retainedVolume > 3 * solved.capsuleGained, 'the capsule is not where the room came from');
  assert.ok(solved.capsuleGained > 0, 'though it is not a rigid box either');
  assert.ok(solved.capsuleGained <= CAPSULE_GIVE * KIDNEY_VOLUME + 1e-9);

  // It grows monotonically with the amount, and from nothing.
  let previous = 2;
  for (const backPressure of [0, 0.25, 0.5, 0.75, 1]) {
    const thickness = at('mid-ureter', backPressure).kidneys.left.parenchymaRatio;
    assert.ok(thickness < previous, `${backPressure}: it goes on thinning`);
    previous = thickness;
  }
  assert.equal(at('mid-ureter', 0).kidneys.left.parenchymaRatio, 1);
});

test('physiology: the thickness falls faster than the volume, and the model says both', () => {
  // A thin shell round a large cavity still holds a good deal, so a reader who
  // takes the thickness for "how much kidney is left" reads it as worse than
  // the volume is. Both numbers exist so that neither stands alone.
  const kidney = at('mid-ureter').kidneys.left;
  const capsuleVolume = KIDNEY_VOLUME * Math.pow(kidney.capsuleRatio, 3);
  const collectingVolume = PELVIS_VOLUME * Math.pow(kidney.pelvisRatio, 3);
  const parenchymaVolume = capsuleVolume - collectingVolume;

  assert.ok(parenchymaVolume > 0, 'the collecting system has not reached the capsule');
  const volumeShare = parenchymaVolume / (KIDNEY_VOLUME - PELVIS_VOLUME);
  assert.ok(
    volumeShare > kidney.parenchymaRatio,
    `${volumeShare} of the volume against ${kidney.parenchymaRatio} of the thickness`
  );
});
