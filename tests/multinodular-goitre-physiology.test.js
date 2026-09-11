import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BURDEN_RANGE,
  DIRECTIONS,
  THYROID,
  solveMultinodularGoitre,
} from '../src/models/multinodularGoitre.js';
import { MultinodularGoitreScene } from '../src/scenes/endocrine/scenes/multinodularGoitre/MultinodularGoitreScene.js';

/**
 * Layer 1 — what this model asserts about a nodular thyroid rather than about
 * itself. Each is a proposition about where things are and what will move,
 * and each would be true if this repository did not exist.
 */

const PLACES = ['anterior', 'medial', 'posterior', 'retrosternal'];
const at = (direction, burden = BURDEN_RANGE.max) => solveMultinodularGoitre({ direction, burden });

test('physiology: displacement dominates in the neck and narrowing dominates at the inlet', () => {
  // The whole claim, and it is a claim about **shares**. A goitre in the neck
  // both moves the airway and narrows it; so does one below the inlet. What
  // the direction sets is which of the two takes the larger part.
  const inTheNeck = at('medial');
  const behindTheSternum = at('retrosternal');

  assert.equal(inTheNeck.airwayEffect, 'pushed aside');
  assert.ok(inTheNeck.deviationRadii > 1, 'having moved more than its own radius');

  // **The neck narrows too.** The model must not be readable as "a cervical
  // goitre cannot compress the airway": the share is the minority one, not zero.
  assert.ok(inTheNeck.tracheaWidthFraction < 0.95, 'a large cervical goitre does narrow the airway');
  assert.ok(inTheNeck.tracheaWidthFraction > 0.6, 'but narrowing is not what most of it did');
  assert.ok(inTheNeck.indent > 0, 'and the narrowing is a real quantity, not a rounding artefact');

  assert.equal(behindTheSternum.airwayEffect, 'narrowed');
  assert.equal(behindTheSternum.confined, true, 'because the surroundings cannot move aside');
  assert.ok(behindTheSternum.tracheaWidthFraction < 0.6, 'and most of the tissue went into narrowing');
  assert.ok(behindTheSternum.deviationRadii < 0.3, 'while barely moving it at all');

  // The two are not a matter of degree along one axis: the enclosed one narrows
  // more while displacing less, which a single severity axis cannot produce.
  assert.ok(behindTheSternum.tracheaWidthFraction < inTheNeck.tracheaWidthFraction);
  assert.ok(behindTheSternum.deviationRadii < inTheNeck.deviationRadii);

  // And the direction that is not aimed at the airway does neither.
  assert.equal(at('anterior').airwayEffect, 'neither');
  assert.equal(at('anterior').tracheaWidthFraction, 1);
});

test('physiology: the narrowing is at the level the gland is, not always at the inlet', () => {
  // The level is part of the claim. A cervical goitre narrows the airway where
  // it lies; only one that has followed the airway down narrows it at the
  // inlet. A scene that drew every dip at the inlet would put the cervical
  // narrowing somewhere it is not.
  assert.equal(at('medial').pressesAt, 'gland');
  assert.equal(at('posterior').pressesAt, 'gland');
  assert.equal(at('retrosternal').pressesAt, 'inlet');

  // And a gland that has not enlarged is not pressing anywhere.
  assert.equal(at('medial', 0).pressesAt, null);
  assert.equal(at('none').pressesAt, null);
});

test('physiology: the same amount of gland is the same size in every direction', () => {
  // The figure that says nothing, and the reason the read-out prints it first.
  for (const burden of [0.5, 1.5, 3]) {
    const sizes = PLACES.map((direction) => at(direction, burden).glandVolumeRatio);
    for (const size of sizes) assert.equal(size, sizes[0], `at ${burden} the gland is the same size`);
    assert.ok(sizes[0] > 1, 'and larger than it was');
  }
  assert.equal(at('none').glandVolumeRatio, 1, 'a gland that has not enlarged is its own size');
  assert.equal(at('none').burden, 0, 'and an amount with nowhere to go is not an enlargement');
});

test('physiology: a backward enlargement passes the nerve and the parathyroids rather than approaching them', () => {
  // They lie against the posterior surface, so the question is not how close
  // the gland gets: it is how far past them it has gone.
  const backward = at('posterior');
  assert.ok(backward.behindFraction > 0.4, 'a backward enlargement reaches well past them');
  assert.equal(backward.envelopsPosterior, true);

  for (const direction of ['anterior', 'medial']) {
    assert.ok(at(direction).behindFraction < 0.1, `${direction}: it does not go back`);
    assert.equal(at(direction).envelopsPosterior, false);
  }

  // It grows monotonically with the amount, and from nothing.
  let previous = -1;
  for (const burden of [0, 1, 2, 3]) {
    const solved = at('posterior', burden);
    assert.ok(solved.behindFraction > previous || burden === 0, `${burden}`);
    previous = solved.behindFraction;
  }
  assert.equal(at('posterior', 0).behindFraction, 0);
});

test('physiology: a trachea pushed equally from both sides does not move', () => {
  // Two lobes round one airway. Deviation is a consequence of asymmetry, so the
  // scene's medial picture has one lobe leading — and the airway goes the other
  // way, which is a statement about sides and therefore about the scene's own
  // anatomical axis.
  const scene = new MultinodularGoitreScene({});
  scene.build();
  scene.setModelControl('direction', 'medial');
  scene.setProgress(1);

  const leading = MultinodularGoitreScene.LEADING_SIDE;
  const lobe = (id) => scene.thyroid.mesh(id);
  const grown = leading < 0 ? lobe('right-lobe') : lobe('left-lobe');
  const other = leading < 0 ? lobe('left-lobe') : lobe('right-lobe');
  assert.ok(grown.scale.x > other.scale.x, 'one lobe leads');

  // The airway is bent away from the leading lobe, not towards it.
  const bend = scene.airway.curve.getPointAt(0.5).x;
  assert.ok(Math.abs(bend) > 0.1, 'it has been bent');
  assert.equal(Math.sign(bend), -leading, 'away from the side that grew');

  // Symmetric growth in the same anatomy leaves it where it was.
  scene.setModelControl('direction', 'anterior');
  assert.ok(Math.abs(scene.airway.curve.getPointAt(0.5).x) < 0.05, 'and symmetric growth does not bend it');

  // The gland really is on both sides of one airway, which is what makes that so.
  assert.ok(lobe('right-lobe').position.x < 0 && lobe('left-lobe').position.x > 0);
  assert.ok(Math.abs(scene.airwayRadiusAt(0.5) - THYROID.tracheaRadius) < 1e-9, 'and open where nothing confines it');

  scene.dispose();
});
