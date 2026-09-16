import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  TAP_DISPLACEMENT_PX,
  TAP_EXCURSION_PX,
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

/* Measuring how far the pointer *travelled* rather than how far it *got* makes
   the answer depend on how long the press lasted: a contact patch rolls a
   fraction of a pixel per event, so a deliberate press on a small structure at
   120 Hz totals tens of pixels without leaving a two-pixel neighbourhood. That
   reading threw the tap away — the worse of the two failures, and one a reader
   cannot make sense of. Excursion does not accumulate. */
test('tap gesture: a long, deliberate press is a tap however many events it emits', () => {
  const tap = createTapTracker();

  for (const [hz, ms] of [[60, 300], [120, 600], [60, 800], [240, 1500]]) {
    const events = Math.round((hz * ms) / 1000);
    tap.begin(200, 200);
    for (let index = 0; index < events; index += 1) {
      // A finger rolling inside a pixel or so, the way a real one does.
      tap.move(200 + Math.sin(index) * 0.8, 200 + Math.cos(index) * 0.8);
    }
    assert.equal(
      tap.end(200.4, 200.3),
      true,
      `a ${ms}ms press at ${hz}Hz (${events} moves) is still a tap`
    );
  }
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

  // The excursion of one press does not survive into the next.
  press(tap, [[10, 10], [400, 10], [10, 10]]);
  assert.equal(press(tap, [[10, 10], [11, 11]]), true);
});

test('tap gesture: both anatomy scenes ask the same question of a release', () => {
  assert.ok(TAP_DISPLACEMENT_PX > 0 && TAP_EXCURSION_PX > TAP_DISPLACEMENT_PX,
    'excursion is the looser of the two bounds; a tap is not perfectly still');

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

/* `cancel()` is only reachable if something listens for the gesture being taken
   away, and the browser takes it away exactly where it matters: under
   `touch-action: pan-y pinch-zoom` a pinch or a vertical swipe becomes the
   page's, and the canvas gets `pointercancel` with no `pointerup` at all. The
   shared organ scene wired it and the brain scene — the one published model —
   did not, which left a press open across gestures. */
test('tap gesture: both scenes hear the press being taken away', () => {
  for (const path of [
    'src/scenes/shared/anatomy/OrganAnatomyScene.js',
    'src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js',
  ]) {
    const source = read(path);
    assert.match(source, /addEventListener\('pointercancel'/, `${path} never hears a cancelled press`);
    assert.match(source, /removeEventListener\('pointercancel'/, `${path} leaves the listener behind`);
    assert.match(
      source,
      /_pointerCancel = \(\) => \{\s*tap\.cancel\(\);/,
      `${path} hears the cancel but does not close the press`
    );
    // The other way a press ends where the canvas cannot see it.
    assert.match(
      source,
      /_pointerLeave = \(\) => \{\s*tap\.cancel\(\);/,
      `${path} leaves a press open when the pointer leaves the canvas`
    );
  }
});

/* A rule that decides what a click selects is part of what the model *is*, and
   `docs/model-cards/revisions.json` says so: a scene's `modelSources` are "the
   part correspondence and the selection behaviour built on it", and a
   publication decision is pinned to their digest. Lifting the rule out of the
   two scenes and into one shared file moved it outside every one of those pins
   — so a later change to what a tap is would no longer close the beta gate,
   which is the one thing the pin exists to do. It is declared now, and this is
   what keeps it declared. */
test('tap gesture: the shared rule is part of every model that picks with it', () => {
  const registry = JSON.parse(read('docs/model-cards/revisions.json'));
  const SHARED = 'src/scenes/shared/anatomy/tapGesture.js';
  const carriers = [
    'src/scenes/shared/anatomy/OrganAnatomyScene.js',
    'src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js',
  ];

  // The premise: the carriers are the files that own picking, and they use it.
  for (const carrier of carriers) assert.match(read(carrier), /from '.*tapGesture\.js'/);

  const picking = registry.filter((entry) =>
    entry.modelSources.some((source) => carriers.includes(source))
  );
  assert.ok(picking.length > 0, 'no model declares a scene that picks');
  for (const entry of picking) {
    assert.ok(
      entry.modelSources.includes(SHARED),
      `${entry.sceneId} picks with the shared rule but does not declare it as a model source`
    );
  }
});
