import test from 'node:test';
import assert from 'node:assert/strict';

import { UrinaryObstructionScene } from '../src/scenes/renal/scenes/urinaryObstruction/UrinaryObstructionScene.js';
import { LEVELS, solveUrinaryObstruction } from '../src/models/urinaryObstruction.js';
import { MODEL_CONTROLS } from '../src/data/urinaryObstruction.js';

/** A scene that has been built, so the meshes exist to measure. */
const built = () => {
  const scene = new UrinaryObstructionScene({});
  scene.build();
  return scene;
};

test('model: the scene draws each stretch at the calibre the model gave it', () => {
  const scene = built();
  scene.setModelControl('level', 'mid-ureter');
  scene.setProgress(1);

  const solved = scene.solved;
  const ureter = scene.ureters.left;
  // The tube's drawn radius is the modifier applied to its own base, which is
  // what `refresh` stored — reading the base alone would read the resting one.
  const drawnAt = (u) => ureter.surface.modifier(u, ureter.surface.baseRadius(u));

  const upper = drawnAt(0.15);
  const lower = drawnAt(0.85);
  assert.ok(
    Math.abs(upper / lower - solved.stretch('left-mid-ureter').ratio) < 1e-6,
    `${upper / lower} drawn against ${solved.stretch('left-mid-ureter').ratio} solved`
  );
  assert.ok(upper > lower, 'the stretch above the blockage is the wider one');

  // And the other side, which nothing is above, is drawn at rest all the way.
  const other = scene.ureters.right;
  const otherAt = (u) => other.surface.modifier(u, other.surface.baseRadius(u));
  assert.ok(Math.abs(otherAt(0.15) - otherAt(0.85)) < 1e-9, 'the spared tube has no step in it');

  scene.dispose();
});

test('model: the pelvis is drawn at the model’s ratio and stays inside the capsule', () => {
  const scene = built();
  scene.setModelControl('level', 'mid-ureter');

  // Where the collecting system reaches out of the hilum at rest, which is the
  // one edge the dilation is not allowed to move.
  scene.setProgress(0);
  const atRest = scene.kidneys.left.pelvis;
  atRest.geometry.computeBoundingBox();
  const restingHilarEdge =
    atRest.position.x + atRest.geometry.boundingBox.min.x * atRest.scale.x;

  for (const progress of [0, 0.5, 1]) {
    scene.setProgress(progress);
    const state = scene.solved.kidneys.left;
    const { cortex, pelvis } = scene.kidneys.left;
    // **The gap on screen is the number the read-out prints.** The collecting
    // system is drawn as the capsule inset by the thickness the model reports,
    // so a reader measuring the parenchyma on any axis measures that ratio and
    // not a scaling that happens to look like it.
    const rest = scene.pelvisRest;
    for (const axis of ['x', 'y', 'z']) {
      const drawnGap = rest.capsule[axis] * state.capsuleRatio - rest.pelvis[axis] * pelvis.scale[axis];
      const restingGap = rest.capsule[axis] - rest.pelvis[axis];
      assert.ok(
        Math.abs(drawnGap / restingGap - state.parenchymaRatio) < 1e-6,
        `${progress}: the gap drawn on ${axis} is ${drawnGap / restingGap}, not the ${state.parenchymaRatio} reported`
      );
    }
    assert.ok(Math.abs(cortex.scale.x - state.capsuleRatio) < 1e-6, `${progress}: and the capsule at its own`);

    // The gap the parenchyma is drawn as has to stay a gap, or the claim is
    // drawn as a collecting system that has burst out of the kidney. Signed
    // extents, not magnitudes: the bean is not centred on its own origin, and
    // comparing absolute sizes hid a collecting system leaving through the
    // hilum for as long as it was there.
    pelvis.geometry.computeBoundingBox();
    cortex.geometry.computeBoundingBox();
    for (const axis of ['x', 'y', 'z']) {
      const low = pelvis.position[axis] + pelvis.geometry.boundingBox.min[axis] * pelvis.scale[axis];
      const high = pelvis.position[axis] + pelvis.geometry.boundingBox.max[axis] * pelvis.scale[axis];
      const capsuleLow = cortex.geometry.boundingBox.min[axis] * cortex.scale[axis];
      const capsuleHigh = cortex.geometry.boundingBox.max[axis] * cortex.scale[axis];
      // The one exception is the hilum, which the resting collecting system
      // already reaches out of because that is where its funnel leaves. What
      // must hold is that dilating it does not reach any further out.
      const hilar = axis === 'x' && low < capsuleLow;
      if (hilar) {
        assert.ok(
          Math.abs(low - restingHilarEdge) < 1e-6,
          `${progress}: the hilar edge has moved, so the room is escaping rather than being taken`
        );
      } else {
        assert.ok(low > capsuleLow, `${progress}: inside the capsule at the low end of ${axis}`);
      }
      assert.ok(high < capsuleHigh, `${progress}: inside the capsule at the high end of ${axis}`);
    }
  }

  scene.dispose();
});

test('model: the spared kidney is not touched by anything the scene does', () => {
  const scene = built();
  scene.setModelControl('level', 'vesicoureteric');
  scene.setProgress(1);

  const spared = scene.kidneys.right;
  assert.equal(spared.pelvis.scale.x, 1, 'its collecting system is at its resting size');
  assert.equal(spared.cortex.scale.x, 1, 'and so is its capsule');
  assert.equal(scene.solved.sparedSide, 'right');

  // At the bladder outlet there is no spared side and both kidneys have moved.
  scene.setModelControl('level', 'bladder-outlet');
  assert.equal(scene.solved.sparedSide, null);
  assert.ok(scene.kidneys.right.pelvis.scale.x > 1, 'both sides are behind it now');
  assert.ok(scene.kidneys.left.pelvis.scale.x > 1);

  scene.dispose();
});

test('model: nothing is coloured as filling until something has backed up', () => {
  // The level says which side *would* be behind a blockage. At the bottom of
  // the axis nothing has backed up yet, and a side painted as filling there is
  // the picture claiming something the model has not solved.
  const scene = built();
  scene.setModelControl('level', 'mid-ureter');
  scene.setProgress(0);

  const resting = scene.kidneys.left.pelvis.material.color.getHexString();
  const other = scene.kidneys.right.pelvis.material.color.getHexString();
  assert.equal(resting, other, 'at rest the two collecting systems are drawn the same');
  assert.equal(
    scene.ureters.left.object.material.color.getHexString(),
    scene.ureters.right.object.material.color.getHexString(),
    'and so are the two tubes'
  );

  scene.setProgress(1);
  assert.notEqual(
    scene.kidneys.left.pelvis.material.color.getHexString(),
    resting,
    'and once it has backed up, the side behind it is told apart'
  );

  scene.dispose();
});

test('model: the blockage marker sits where the picture changes, and only when there is one', () => {
  const scene = built();

  scene.setModelControl('level', 'none');
  scene.setProgress(1);
  assert.equal(scene.marker.visible, false, 'nothing blocked, nothing marked');

  scene.setModelControl('level', 'mid-ureter');
  scene.setProgress(0);
  assert.equal(scene.marker.visible, false, 'nothing has backed up yet');

  scene.setProgress(1);
  assert.equal(scene.marker.visible, true);
  const at = scene.marker.position.clone();
  const onTheTube = scene.ureters.left.curve.getPointAt(2 / 3);
  assert.ok(at.distanceTo(onTheTube) < 1e-6, 'the marker is on the tube where the stretch ends');

  // Moving the blockage moves the marker, which is the thing that makes the
  // level a place rather than a label.
  scene.setModelControl('level', 'vesicoureteric');
  assert.ok(scene.marker.position.distanceTo(at) > 0.2, 'a different level is a different place');

  scene.setModelControl('level', 'bladder-outlet');
  const { bladder } = UrinaryObstructionScene.PLACES;
  assert.ok(scene.marker.position.y < bladder.y, 'and the bladder outlet is below the bladder');

  scene.dispose();
});

test('model: every level the copy offers is one the model solves', () => {
  const offered = MODEL_CONTROLS[0].options.map((option) => option.value);
  const solved = LEVELS.map((level) => level.id);
  assert.deepEqual(offered, solved, 'the control and the model name the same five places');

  for (const value of offered) {
    assert.equal(solveUrinaryObstruction(1, { level: value }).controls.level, value);
  }
});

test('model: the read-out never reports a kidney the level did not put behind it', () => {
  const scene = built();
  scene.setProgress(1);

  for (const level of LEVELS) {
    scene.setModelControl('level', level.id);
    const metrics = new Map(scene.getMetrics().map((metric) => [metric.id, metric.value]));
    assert.equal(
      metrics.get('kidneys'),
      level.sides.length === 0 ? 'none' : String(level.sides.length),
      `${level.id}: says how many are behind it`
    );
    if (level.sides.length === 0) {
      assert.equal(metrics.get('parenchyma'), 100, 'and nothing has thinned');
      assert.equal(metrics.get('tract'), 0);
    }
  }

  scene.dispose();
});

test('model: resetting the controls puts the level back without moving the axis', () => {
  const scene = built();
  scene.setProgress(0.4);
  scene.setModelControl('level', 'bladder-outlet');
  assert.equal(scene.solved.kidneysBehind, 2);

  scene.resetModelControls();
  assert.equal(scene.solved.controls.level, 'mid-ureter');
  assert.equal(scene.progress, 0.4, 'the axis is not a control and does not reset with them');
  assert.equal(scene.solved.backPressure, 0.4);

  scene.dispose();
});

test('model: every annotation the scene offers has a position, and the conditional ones say so', () => {
  const scene = built();
  scene.setModelControl('level', 'mid-ureter');
  scene.setProgress(1);

  const annotations = scene.getAnnotations();
  for (const annotation of annotations) {
    assert.ok(annotation.position, `${annotation.id} has an anchor`);
    assert.notEqual(annotation.position.lengthSq(), 0, `${annotation.id}'s anchor has been written`);
  }

  const byId = new Map(annotations.map((annotation) => [annotation.id, annotation]));
  assert.equal(byId.get('spared').isDrawn(), true);

  // At the bladder outlet there is no spared side, and the label must go rather
  // than hang over a kidney that is behind the blockage like the other one.
  scene.setModelControl('level', 'bladder-outlet');
  const after = new Map(scene.getAnnotations().map((annotation) => [annotation.id, annotation]));
  assert.equal(after.get('spared').isDrawn(), false);
  assert.equal(after.get('blockage').isDrawn(), true);

  scene.setModelControl('level', 'none');
  assert.equal(
    new Map(scene.getAnnotations().map((a) => [a.id, a])).get('blockage').isDrawn(),
    false,
    'with nothing blocked there is no boundary to point at'
  );

  scene.dispose();
});
