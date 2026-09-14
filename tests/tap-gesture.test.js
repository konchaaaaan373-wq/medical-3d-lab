import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  TAP_DISPLACEMENT_PX,
  TAP_TRAVEL_PX,
  createTapTracker,
} from '../src/scenes/shared/anatomy/tapGesture.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** Walk a press through a path of points and report what the release was. */
function press(tracker, path) {
  const [start, ...rest] = path;
  tracker.begin(start[0], start[1]);
  for (const [x, y] of rest.slice(0, -1)) tracker.move(x, y);
  const [endX, endY] = rest.at(-1) ?? start;
  return tracker.end(endX, endY);
}

test('tap gesture: a still press is a tap and a one-way drag is not', () => {
  const tap = createTapTracker();

  assert.equal(press(tap, [[100, 100], [100, 100]]), true, 'a press that does not move is a tap');
  // A finger is never perfectly still, and a tap thrown away for a pixel of
  // roll is the failure a reader cannot make sense of.
  assert.equal(press(tap, [[100, 100], [102, 101], [103, 102], [102, 103]]), true);
  assert.equal(press(tap, [[100, 100], [140, 100], [220, 100]]), false, 'a drag is not a tap');
});

/* The case a finger meets and a mouse rarely does: turning the model to see
   its other side and turning it back is one press that ends where it began.
   Measured by displacement alone it stood still, so releasing it named
   whatever had rotated under the thumb — a structure nobody chose. */
test('tap gesture: a drag that returns to where it started is still a drag', () => {
  const tap = createTapTracker();

  assert.equal(press(tap, [[200, 200], [260, 200], [310, 202], [201, 201]]), false);
  // Exactly back to the press, which is the displacement test's blind spot.
  assert.equal(press(tap, [[200, 200], [320, 200], [200, 200]]), false);
  // And a small wobble that never leaves the neighbourhood is still a tap.
  assert.equal(press(tap, [[200, 200], [205, 203], [201, 199], [200, 200]]), true);
});

test('tap gesture: a release with no press, and a cancelled press, are not taps', () => {
  const tap = createTapTracker();

  assert.equal(tap.pressed, false);
  assert.equal(tap.end(10, 10), false, 'a release nothing opened is not a tap');

  tap.begin(10, 10);
  assert.equal(tap.pressed, true);
  tap.cancel();
  assert.equal(tap.pressed, false);
  assert.equal(tap.end(10, 10), false, 'a cancelled press cannot still become a tap');

  // Travel does not survive into the next press.
  press(tap, [[10, 10], [400, 10], [10, 10]]);
  assert.equal(press(tap, [[10, 10], [11, 11]]), true);
});

test('tap gesture: both anatomy scenes ask the same question of a release', () => {
  assert.ok(TAP_DISPLACEMENT_PX > 0 && TAP_TRAVEL_PX > TAP_DISPLACEMENT_PX,
    'travel is the looser of the two bounds; a tap is not perfectly still');

  // One rule, used twice. The two scenes carried a copy of the threshold each,
  // which is how one of them could be fixed and the other left behind.
  for (const path of [
    'src/scenes/shared/anatomy/OrganAnatomyScene.js',
    'src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js',
  ]) {
    const source = read(path);
    assert.match(source, /createTapTracker\(\)/, `${path} does not use the shared rule`);
    assert.doesNotMatch(
      source,
      /Math\.hypot\(event\.clientX/,
      `${path} still measures the release itself`
    );
  }
});
