import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXPANDED_ABOVE,
  LOBES,
  RESIDUAL,
  TAKEN_BY_REST,
  solveLobarCollapse,
} from '../src/models/lobarCollapse.js';

const at = (bronchus, absorbed = 1) => solveLobarCollapse(absorbed, { bronchus });
const BLOCKABLE = LOBES.map((lobe) => lobe.id);

test('physiology: a collapsed lobe loses volume rather than keeping it', () => {
  // The claim the scene exists for, and the one a picture of density cannot
  // make: the lobe gets smaller. Consolidation is the other picture, and this
  // model must not be readable as a version of it.
  for (const bronchus of BLOCKABLE) {
    const lobe = at(bronchus).lobe(bronchus);
    assert.ok(lobe.volumeRatio < 0.2, `${bronchus}: ${lobe.volumeRatio} is not a lobe that has lost its air`);
    assert.equal(lobe.collapsed, true);
  }

  // It falls monotonically with the axis, and from its whole volume.
  let previous = 1.01;
  for (const absorbed of [0, 0.25, 0.5, 0.75, 1]) {
    const ratio = at('right-lower', absorbed).lobe('right-lower').volumeRatio;
    assert.ok(ratio < previous, `${absorbed}: it goes on losing volume`);
    previous = ratio;
  }
  assert.equal(at('right-lower', 0).lobe('right-lower').volumeRatio, 1);
  assert.equal(at('none').blocked, false);

  // And it never reaches nothing, because a lobe scaled to zero is a lobe the
  // scene has deleted rather than one it is drawing.
  assert.ok(Math.abs(at('right-lower').lobe('right-lower').volumeRatio - RESIDUAL) < 1e-9);
});

test('physiology: the room the lobe vacates is accounted for, all of it', () => {
  // The model's only real assertion: the three amounts add up. A picture that
  // showed a lobe shrinking and nothing else would be claiming a chest can have
  // a hole in it.
  for (const bronchus of BLOCKABLE) {
    for (const absorbed of [0.4, 1]) {
      const solved = at(bronchus, absorbed);
      assert.ok(
        Math.abs(solved.takenByTheRest + solved.takenByTheHemithorax - solved.vacated) < 1e-12,
        `${bronchus} at ${absorbed}: the room is not accounted for`
      );
      assert.ok(solved.takenByTheRest > 0 && solved.takenByTheHemithorax > 0, 'and both halves happen');
    }
  }

  // The rest of that lung gains exactly what it is said to have taken.
  const solved = at('right-lower');
  const gained = solved.lobes
    .filter((lobe) => lobe.onTheSide && lobe.id !== 'right-lower')
    .reduce((sum, lobe) => sum + (lobe.volumeRatio - 1) * lobe.restingShare, 0);
  assert.ok(Math.abs(gained - solved.takenByTheRest) < 1e-12, `${gained} gained against ${solved.takenByTheRest} taken`);
  assert.ok(Math.abs(TAKEN_BY_REST - solved.takenByTheRest / solved.vacated) < 1e-12);
});

test('physiology: the other lung takes none of it', () => {
  // Two hemithoraces, so compensation is a fact about one side. A severity axis
  // would have taken both lungs along together.
  for (const bronchus of BLOCKABLE) {
    const solved = at(bronchus);
    for (const lobe of solved.lobes) {
      if (lobe.side === solved.side) continue;
      assert.equal(lobe.volumeRatio, 1, `${bronchus}: ${lobe.id} is on the other side and is unchanged`);
      assert.equal(lobe.expanded, false);
      assert.equal(lobe.onTheSide, false);
    }
  }

  assert.equal(at('right-lower').sparedSide, 'left');
  assert.equal(at('left-upper').sparedSide, 'right');
  assert.equal(at('none').sparedSide, null);
});

test('physiology: the middle is drawn towards the side the collapse is on', () => {
  // The half of the answer that is not inside the lung. It has a direction, and
  // the direction is a property of which bronchus rather than of how much.
  assert.equal(at('right-lower').shiftTowards, 'right');
  assert.equal(at('right-upper').shiftTowards, 'right');
  assert.equal(at('left-lower').shiftTowards, 'left');
  assert.equal(at('none').shiftTowards, null);
  assert.equal(at('right-lower', 0).shiftTowards, null, 'nothing has been vacated yet');

  // Its size follows the room the hemithorax took, and nothing else.
  for (const bronchus of BLOCKABLE) {
    const solved = at(bronchus);
    assert.ok(solved.shift > 0);
    assert.ok(
      Math.abs(solved.shift / solved.takenByTheHemithorax - at('right-lower').shift / at('right-lower').takenByTheHemithorax) < 1e-9,
      `${bronchus}: the same volume becomes the same distance wherever it came from`
    );
  }
});

test('physiology: which bronchus decides how much room there is, and who is left to take it', () => {
  // Six arrangements rather than six degrees. The smallest lobe and the largest
  // are the same picture at different sizes, and the left side has one lobe to
  // take the room where the right has two.
  const biggest = at('right-lower');
  const smallest = at('right-middle');
  assert.ok(biggest.vacated > smallest.vacated * 2, 'the largest lobe vacates much more than the smallest');
  assert.ok(biggest.shift > smallest.shift);

  // On the left, one lobe takes all of it; on the right, two share it.
  const left = at('left-upper');
  const takers = (solved) => solved.lobes.filter((lobe) => lobe.expanded).length;
  assert.equal(takers(left), 1, 'the left lung has one lobe left to take it');
  assert.equal(takers(biggest), 2, 'the right lung has two');
  assert.ok(left.lobe('left-lower').volumeRatio > EXPANDED_ABOVE);

  // And the room is shared out in proportion to what each lobe already had.
  const upper = biggest.lobe('right-upper');
  const middle = biggest.lobe('right-middle');
  assert.ok(
    Math.abs(upper.volumeRatio - middle.volumeRatio) < 1e-12,
    'in proportion to their own volumes is the same ratio for each of them'
  );
  assert.ok(
    upper.volumeRatio * upper.restingShare - upper.restingShare >
      middle.volumeRatio * middle.restingShare - middle.restingShare,
    'so the larger lobe takes the larger absolute share'
  );
});
