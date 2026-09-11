import test from 'node:test';
import assert from 'node:assert/strict';
import { SEPARATES_ABOVE, solveAclInjury } from '../src/models/aclInjury.js';
import { AclInjuryScene } from '../src/scenes/musculoskeletal/scenes/aclInjury/AclInjuryScene.js';
import { ATTACHMENTS } from '../src/scenes/musculoskeletal/organs/kneeJoint.js';

/** Layer 1 — what this model asserts about knees rather than about itself. */

const at = (disruption, secondaryRestraint = 1) => solveAclInjury({ disruption, secondaryRestraint });

test('physiology: the ligament runs the way an ACL runs, between the atlas’s own attachments', () => {
  // The scene draws its own ligament, so the one thing that has to be true of
  // it is that it is in the right place — which it is because the ends are the
  // atlas's and not this file's.
  const femoral = ATTACHMENTS.aclFemoral;
  const tibial = ATTACHMENTS.aclTibial;
  assert.ok(femoral[1] > tibial[1], 'it starts above and ends below');
  assert.ok(femoral[2] < tibial[2], 'it starts behind and ends in front');

  const scene = new AclInjuryScene({});
  scene.build();
  scene.setProgress(0);
  const start = scene.cords.aclFemoral.surface.curve.getPointAt(0);
  const end = scene.cords.aclTibial.surface.curve.getPointAt(1);
  assert.ok(start.distanceTo(new (start.constructor)(...femoral)) < 0.02, 'the drawn cord starts at the femoral end');
  assert.ok(end.distanceTo(new (end.constructor)(...tibial)) < 0.02, 'and ends at the tibial one');

  // The atlas's own intact cruciates are not what is on screen.
  assert.equal(scene.knee.mesh('anterior-cruciate-ligament').visible, false);
  scene.dispose();
});

test('physiology: with the ligament gone the secondary restraints carry all of what is left', () => {
  // Primary and secondary, and what the words mean when the primary one is
  // gone. This is the sentence the scene reports a share for.
  const intact = at(0);
  assert.ok(intact.aclOfOriginal > intact.secondaryOfOriginal * 3, 'intact, the ligament is the primary one');
  assert.equal(intact.secondaryCarriesIt, false);
  assert.equal(intact.restraintRemaining, 1, 'and all of the restraint is there');

  const torn = at(1);
  assert.equal(torn.aclOfOriginal, 0, 'gone, it carries none of it');
  assert.equal(torn.secondaryCarriesIt, true, 'and the secondary ones carry what is left');
  assert.ok(torn.restraintRemaining < 0.2, `which is ${torn.restraintRemaining} of what there was`);
  assert.equal(torn.secondaryOfOriginal, intact.secondaryOfOriginal, 'they did not become stronger');
});

test('physiology: a discontinuous ligament holds nothing at all', () => {
  // A cord that has failed does not go on carrying a fraction. The step is the
  // claim, and a model that tapered smoothly through it would be drawing
  // something that does not happen.
  const justBefore = at(SEPARATES_ABOVE);
  const justAfter = at(SEPARATES_ABOVE + 0.01);
  assert.equal(justBefore.continuous, true);
  assert.equal(justAfter.continuous, false);
  assert.ok(justBefore.aclOfOriginal > 0, 'it was still holding something');
  assert.equal(justAfter.aclOfOriginal, 0, 'and then it holds nothing');
  assert.ok(justAfter.translationFraction > justBefore.translationFraction, 'so the bone sits further forward');

  for (const disruption of [0.85, 0.92, 1]) {
    assert.equal(at(disruption).aclOfOriginal, 0, `${disruption}: still nothing`);
    assert.equal(at(disruption).state, 'discontinuous');
  }
});

test('physiology: the less is holding it, the further forward it can sit', () => {
  // Mechanics, in the one direction this model has.
  let previous = -1;
  for (const disruption of [0, 0.3, 0.6, 0.8]) {
    const solved = at(disruption);
    assert.ok(solved.translationFraction > previous, `${disruption}: further`);
    previous = solved.translationFraction;
  }
  assert.equal(at(0).translationFraction, 0, 'an intact knee does not sit forward');

  // Past the point the cord fails it stops changing, because there is nothing
  // left of it to lose: more of the axis is not more of the injury.
  assert.equal(at(0.9).translationFraction, at(1).translationFraction);

  // And losing the secondary restraints as well leaves it further forward than
  // losing the ligament alone — which is the reason they are a control.
  assert.ok(at(1, 0).translationFraction > at(1, 1).translationFraction);
  assert.ok(at(0, 0).translationFraction > 0, 'and losing only those is not nothing');
});
