import test from 'node:test';
import assert from 'node:assert/strict';
import { SHARE, solveRotatorCuffTear } from '../src/models/rotatorCuffTear.js';
import { RotatorCuffTearScene } from '../src/scenes/musculoskeletal/scenes/rotatorCuffTear/RotatorCuffTearScene.js';

/** Layer 1 — what this model asserts about shoulders rather than about itself. */

const at = (tear, couple = 1) => solveRotatorCuffTear({ tear, couple });

test('physiology: the cuff holds the head on its socket rather than lifting the arm', () => {
  // The correction the scene opens with, and it has to be true of the model as
  // well as of the copy: everything the cuff does here is containment, and
  // there is nothing in it that lifts anything.
  const solved = at(0);
  assert.equal(solved.containment, 1, 'intact, all of the holding is there');
  assert.ok(solved.fromSupraspinatus > 0 && solved.fromCouple > 0, 'and it comes from both');
  assert.ok(
    Math.abs(SHARE.supraspinatus + SHARE.couple - 1) < 1e-9,
    'between them they are the whole of the job'
  );

  // Nothing in the model is a movement, a force on the arm or a range.
  const keys = Object.keys(solved).join(' ');
  assert.doesNotMatch(keys, /abduct|elevat|range|strength|power/i);
});

test('physiology: a tear that spares the facing pair leaves the head where it was', () => {
  // The claim the scene exists for. The whole width of the top tendon can be
  // gone with nothing having moved.
  for (const tear of [0.3, 0.6, 1]) {
    const solved = at(tear, 1);
    assert.equal(solved.riseFraction, 0, `${tear}: the head has not moved`);
    assert.equal(solved.centred, true);
    assert.equal(solved.coupleHolds, true, 'because the pair is still holding');
  }
  assert.equal(at(1, 1).fullWidth, true, 'and that is with the whole width gone');
});

test('physiology: the head rises only once the pair has stopped holding it', () => {
  const held = at(1, 1);
  const going = at(1, 0.5);
  const gone = at(1, 0);

  assert.equal(held.riseFraction, 0);
  assert.ok(going.riseFraction > 0, 'once the pair is failing it begins to rise');
  assert.ok(gone.riseFraction > going.riseFraction, 'and further with less of it');
  assert.equal(gone.coupleHolds, false);

  // It is the pair that decides it and not the tear: losing the pair with the
  // top tendon whole moves the head too.
  assert.ok(at(0, 0).riseFraction > 0, 'an intact top tendon does not keep it down by itself');

  // And it is monotone in what is left, which is the only quantitative claim.
  let previous = Infinity;
  for (const couple of [0, 0.25, 0.5, 0.75, 1]) {
    const rise = at(1, couple).riseFraction;
    assert.ok(rise <= previous, `${couple}: no higher with more holding it`);
    previous = rise;
  }
});

test('physiology: the same complete defect is two pictures, depending on the pair', () => {
  // Why "how big is the tear" is the wrong first question. Identical defects,
  // and the thing a reader came to look at is different in each.
  const sparing = at(1, 1);
  const reaching = at(1, 0.3);
  assert.equal(sparing.defectFraction, reaching.defectFraction, 'the same hole');
  assert.equal(sparing.fullWidth, reaching.fullWidth);
  assert.notEqual(sparing.centred, reaching.centred, 'and not the same picture');

  // The scene draws that difference rather than only printing it.
  const scene = new RotatorCuffTearScene({});
  scene.build();
  scene.setProgress(1);
  scene.setModelControl('couple', 1);
  const centred = scene.shoulder.mesh('humeral-head').position.y;
  scene.setModelControl('couple', 0);
  assert.ok(scene.shoulder.mesh('humeral-head').position.y > centred, 'the head is drawn higher');
  scene.dispose();
});
