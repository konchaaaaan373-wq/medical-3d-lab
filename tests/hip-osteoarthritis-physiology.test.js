import test from 'node:test';
import assert from 'node:assert/strict';
import { HIP, solveHipOsteoarthritis } from '../src/models/hipOsteoarthritis.js';

/** Layer 1 — what this model asserts about hips rather than about itself. */

const at = (direction, loss = 1) => solveHipOsteoarthritis({ direction, loss });

test('physiology: an intact hip is concentric and its space is even all round', () => {
  // The sentence the whole scene is built on, and the one the atlas states of
  // its own two sites.
  const intact = at('superolateral', 0);
  assert.equal(intact.concentric, true);
  assert.equal(intact.offset, 0);
  for (const place of Object.values(intact.at)) {
    assert.ok(Math.abs(place.gapFraction - 1) < 1e-9, `${place.id}: the same all round`);
  }
  assert.equal(at('none', 1).concentric, true, 'and a hip with nothing wrong with it is the same');
  assert.ok(HIP.layer > 0, 'there is something between the two bones to lose');
});

test('physiology: a hip narrows in a direction and the ball settles that way', () => {
  // Not a compartment: a direction. So the narrowest place follows the choice
  // and nothing else, and the centres come apart by what has gone there.
  for (const direction of ['superolateral', 'superior', 'medial']) {
    const solved = at(direction);
    assert.equal(solved.narrowest.id, direction, `${direction}: narrowest where the layer went`);
    assert.equal(solved.concentric, false);
    assert.ok(Math.abs(solved.offsetFraction - solved.loss) < 1e-9, 'by what has gone there');
    assert.ok(solved.at[direction].gapFraction < 0.05, 'and the space there has closed');
  }

  // It follows the direction rather than the amount: at half the loss the same
  // place is still the narrowest.
  assert.equal(at('medial', 0.4).narrowest.id, 'medial');
});

test('physiology: the far side opens by what the ball moved', () => {
  // The half of the picture a reader does not expect, and it is geometry: a
  // sphere off-centre in a shell has more clearance opposite than it had.
  const solved = at('superolateral');
  assert.equal(solved.apparentWidening, true);
  assert.ok(solved.widest.gapFraction > 1, `${solved.widest.id} is wider than it began`);
  assert.notEqual(solved.widest.id, solved.narrowest.id);

  // And it grows with the movement rather than independently of it.
  let previous = 1;
  for (const loss of [0.25, 0.5, 0.75, 1]) {
    const wider = at('superolateral', loss).widest.gapFraction;
    assert.ok(wider > previous, `${loss}: wider still`);
    previous = wider;
  }
  assert.equal(at('superolateral', 0).apparentWidening, false, 'and an intact hip has none of it');
});

test('physiology: even loss leaves the centres shared', () => {
  // The pattern with no direction in it. The ball has nowhere thinner to settle
  // towards, so nothing moves and everything closes.
  const even = at('concentric');
  assert.equal(even.concentric, true);
  assert.equal(even.offset, 0);
  assert.equal(even.apparentWidening, false);
  for (const place of Object.values(even.at)) {
    assert.ok(place.gapFraction < 0.05, `${place.id}: closed as well`);
  }

  // Which is a different picture from a directional loss of the same amount,
  // and not a milder one: the same axis position, and the opposite side of the
  // joint is in the opposite state.
  const directional = at('superolateral');
  assert.equal(even.loss, directional.loss, 'the same amount is gone');
  assert.ok(directional.widest.gapFraction > even.widest.gapFraction + 0.9, 'and the far side is not the same');
});
