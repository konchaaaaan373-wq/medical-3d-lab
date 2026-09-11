import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONTROLS, KNEE, solveAclInjury } from '../src/models/aclInjury.js';
import { AclInjuryScene } from '../src/scenes/musculoskeletal/scenes/aclInjury/AclInjuryScene.js';
import { STAGES, VISUAL_MAPPING, MODEL_SCOPE } from '../src/data/aclInjury.js';

/** Model integrity, and the axis the scene owns. */

test('acl model: it is deterministic, and an intact ligament is an intact knee', () => {
  const a = solveAclInjury();
  const b = solveAclInjury({ ...DEFAULT_CONTROLS });
  assert.equal(a.translationFraction, b.translationFraction);

  const intact = solveAclInjury({ disruption: 0, secondaryRestraint: 1 });
  assert.equal(intact.state, 'intact');
  assert.equal(intact.continuous, true);
  assert.equal(intact.translationFraction, 0);
  assert.equal(intact.restraintRemaining, 1);
  assert.equal(intact.nothingHolding, false);
});

test('acl model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null, 'partly']) {
    const solved = solveAclInjury({ disruption: value, secondaryRestraint: value });
    for (const [key, number] of Object.entries(solved)) {
      if (typeof number !== 'number') continue;
      assert.ok(Number.isFinite(number), `${key} with ${String(value)}`);
    }
    assert.ok(solved.translationFraction >= 0, String(value));
    assert.ok(solved.restraintRemaining >= 0 && solved.restraintRemaining <= 1, String(value));
    assert.ok(['intact', 'stretched', 'discontinuous'].includes(solved.state), String(value));
  }
});

test('acl scene: the ligament is redrawn as a state, not moved as a structure', () => {
  const scene = new AclInjuryScene({});
  scene.build();

  // Intact: the two halves meet, so the cord reads as one.
  scene.setProgress(0);
  const meetingGap = scene.cords.aclFemoral.surface.curve
    .getPointAt(1)
    .distanceTo(scene.cords.aclTibial.surface.curve.getPointAt(0));
  assert.ok(meetingGap < 0.08, `the two halves meet: ${meetingGap}`);
  // Read back through the tube's own modifier: the calibre is written there,
  // not into the radius the surface was constructed with.
  const drawnRadius = () => {
    const surface = scene.cords.aclFemoral.surface;
    return surface.modifier(0.5, surface.baseRadius(0.5));
  };
  const intactRadius = drawnRadius();

  // Torn: they do not, and the cord is thinner as well as parted.
  scene.setProgress(1);
  const tornGap = scene.cords.aclFemoral.surface.curve
    .getPointAt(1)
    .distanceTo(scene.cords.aclTibial.surface.curve.getPointAt(0));
  assert.ok(tornGap > meetingGap + 0.15, `and then they do not: ${tornGap}`);
  assert.ok(drawnRadius() < intactRadius * 0.7, 'and it is thinner');

  // The atlas's own intact cruciates are not what is on screen, either of them.
  for (const id of ['anterior-cruciate-ligament', 'posterior-cruciate-ligament']) {
    assert.equal(scene.knee.mesh(id).visible, false, id);
  }
  scene.dispose();
});

test('acl scene: the tibia and only the tibia moves forward', () => {
  const scene = new AclInjuryScene({});
  scene.build();
  scene.setProgress(0);
  const restZ = new Map(
    [...scene.restPosition].map(([id, entry]) => [id, entry.mesh.position.z])
  );
  const femurZ = scene.knee.mesh('medial-femoral-condyle').position.z;

  scene.setProgress(1);
  const forward = scene.solved.translationFraction * KNEE.plateauDepth;
  assert.ok(forward > 0.1, 'the model puts it somewhere to go');
  for (const [id, entry] of scene.restPosition) {
    assert.ok(
      Math.abs(entry.mesh.position.z - (restZ.get(id) + forward)) < 1e-9,
      `${id} moved with the tibia`
    );
  }
  assert.equal(scene.knee.mesh('medial-femoral-condyle').position.z, femurZ, 'and the femur did not');

  // The other cruciate follows the bone it is attached to.
  const pclEnd = scene.cords.pcl.surface.curve.getPointAt(1);
  scene.setProgress(0);
  assert.ok(pclEnd.z > scene.cords.pcl.surface.curve.getPointAt(1).z + 0.1, 'the PCL followed it');

  // The read-out is the same solve.
  scene.setProgress(1);
  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(Number(rows.translation), Math.round(scene.solved.translationFraction * 100));
  assert.match(rows.who, /secondary restraints/);
  assert.match(rows.state, /discontinuous/);

  scene.dispose();
});

test('acl scene: no number in it is an examination', () => {
  // The sharpest rule here. A tibia sitting forward looks exactly like the
  // thing a pair of hands is testing for, and this is not that.
  const translation = VISUAL_MAPPING.find((entry) => entry.id === 'anterior-translation');
  assert.match(translation.notClaim, /not a Lachman grade/i);
  assert.match(translation.notClaim, /not millimetres/i);
  assert.match(translation.notClaimJa, /Lachman/);

  const scope = MODEL_SCOPE.excludes.find((entry) => /Lachman/i.test(entry.text));
  assert.ok(scope, 'the scope panel refuses the manoeuvres by name');
  assert.match(scope.text, /pivot shift/i);
  assert.match(scope.text, /no examiner in this model/i);
  assert.match(scope.textJa, /診察者はおらず/);

  // And the state the scene draws says what it does not know about a tear.
  const state = VISUAL_MAPPING.find((entry) => entry.id === 'injury-state');
  assert.match(state.claim, /draws its own ligament rather than moving/i);
  assert.match(state.notClaim, /gap is drawn, not solved/i);

  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
