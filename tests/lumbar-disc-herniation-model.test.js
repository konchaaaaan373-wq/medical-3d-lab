import test from 'node:test';
import assert from 'node:assert/strict';

import { LumbarDiscHerniationScene } from '../src/scenes/musculoskeletal/scenes/lumbarDiscHerniation/LumbarDiscHerniationScene.js';
import { DIRECTIONS, TARGETS } from '../src/models/lumbarDiscHerniation.js';
import { MODEL_CONTROLS } from '../src/data/lumbarDiscHerniation.js';

const built = () => {
  const scene = new LumbarDiscHerniationScene({});
  scene.build();
  return scene;
};

test('model: the centre is drawn displaced by exactly what the model says', () => {
  const scene = built();
  for (const direction of ['central', 'posterolateral', 'far-lateral']) {
    scene.setModelControl('direction', direction);
    for (const progress of [0, 0.5, 1]) {
      scene.setProgress(progress);
      const moved = scene.nucleus.position.distanceTo(scene.nucleusRest);
      assert.ok(
        Math.abs(moved - scene.solved.reach) < 1e-9,
        `${direction} at ${progress}: drawn ${moved} against ${scene.solved.reach} solved`
      );
    }
  }
  scene.setModelControl('direction', 'none');
  scene.setProgress(1);
  assert.equal(scene.nucleus.position.distanceTo(scene.nucleusRest), 0, 'and it does not move when it goes nowhere');
  scene.dispose();
});

test('model: each direction takes the material somewhere different', () => {
  const scene = built();
  const ends = {};
  for (const direction of ['central', 'posterolateral', 'far-lateral']) {
    scene.setModelControl('direction', direction);
    scene.setProgress(1);
    ends[direction] = scene.nucleus.position.clone();
  }
  assert.ok(ends.central.distanceTo(ends.posterolateral) > 0.2);
  assert.ok(ends.posterolateral.distanceTo(ends['far-lateral']) > 0.15);
  assert.ok(ends.central.distanceTo(ends['far-lateral']) > 0.3);
  scene.dispose();
});

test('model: the ring changes colour once, and only at the threshold', () => {
  const scene = built();
  scene.setModelControl('direction', 'central');
  const seen = new Set();
  let lastState = null;
  let changes = 0;
  for (let step = 0; step <= 20; step += 1) {
    scene.setProgress(step / 20);
    const colour = scene.annulus.material.color.getHexString();
    seen.add(colour);
    if (lastState !== null && scene.solved.annulus !== lastState) changes += 1;
    lastState = scene.solved.annulus;
  }
  assert.equal(seen.size, 2, 'the ring has two colours across the whole axis, not a gradient');
  assert.equal(changes, 1, 'and it changes state exactly once');
  scene.dispose();
});

test('model: the overlap is marked where the two shapes meet, and only when they do', () => {
  const scene = built();
  scene.setModelControl('direction', 'posterolateral');

  scene.setProgress(0);
  assert.equal(scene.mark.visible, false, 'nothing has moved, so nothing overlaps');

  scene.setProgress(1);
  assert.equal(scene.mark.visible, true);
  // The marker sits at the clearance along the aim, which is the surface of
  // what it met by construction.
  const expected = scene.nucleusRest
    .clone()
    .addScaledVector(LumbarDiscHerniationScene.AIM.posterolateral, TARGETS['root-shoulder'].clearance);
  assert.ok(scene.mark.position.distanceTo(expected) < 1e-9, 'the marker is where the model says they meet');

  // It is sized by how far in, so a deeper overlap is a larger mark.
  const deep = scene.mark.scale.x;
  scene.setModelControl('direction', 'central');
  scene.setProgress(0.62);
  assert.equal(scene.solved.touching, true);
  assert.ok(scene.mark.scale.x !== deep, 'a different overlap is a different size');

  scene.setModelControl('direction', 'none');
  assert.equal(scene.mark.visible, false, 'and material going nowhere marks nothing');
  scene.dispose();
});

test('model: nothing in the scene stands for a symptom, and the read-out says so', () => {
  const scene = built();
  scene.setModelControl('direction', 'posterolateral');
  scene.setProgress(1);
  const metrics = new Map(scene.getMetrics().map((m) => [m.id, m.value]));
  assert.equal(metrics.get('symptoms'), 'not in this model', 'the row is printed, not omitted');
  assert.match(String(metrics.get('reaches')), /in this drawing/, 'and contact is said to be in a drawing');

  // The three questions are three different rows, and they do not agree by
  // construction: past the ring with nothing reached has to be sayable.
  scene.setModelControl('direction', 'far-lateral');
  scene.setProgress(0.55);
  const mid = new Map(scene.getMetrics().map((m) => [m.id, m.value]));
  assert.match(String(mid.get('ring')), /^no/, 'past the ring');
  assert.match(String(mid.get('reaches')), /^no/, 'and reaching nothing, at the same time');
  scene.dispose();
});

test('model: every direction the copy offers is one the model solves', () => {
  const offered = MODEL_CONTROLS[0].options.map((o) => o.value);
  assert.deepEqual([...offered].sort(), DIRECTIONS.map((d) => d.id).sort());
  assert.equal(offered[0], 'none');
  for (const value of offered) {
    assert.ok(value === 'none' || LumbarDiscHerniationScene.AIM[value], `${value} has a direction in the scene`);
  }
});

test('model: resetting the controls returns the direction without moving the axis', () => {
  const scene = built();
  scene.setProgress(0.4);
  scene.setModelControl('direction', 'central');
  scene.resetModelControls();
  assert.equal(scene.solved.controls.direction, 'posterolateral');
  assert.equal(scene.progress, 0.4, 'the axis is not a control');
  scene.dispose();
});

test('model: every annotation has an anchor, and the conditional ones say when they are absent', () => {
  const scene = built();
  scene.setModelControl('direction', 'posterolateral');
  scene.setProgress(1);
  const byId = (s) => new Map(s.getAnnotations().map((a) => [a.id, a]));
  for (const a of scene.getAnnotations()) {
    assert.ok(a.position, `${a.id} has an anchor`);
    assert.notEqual(a.position.lengthSq(), 0, `${a.id}'s anchor has been written`);
  }
  assert.equal(byId(scene).get('touched').isDrawn(), true);
  scene.setProgress(0);
  assert.equal(byId(scene).get('touched').isDrawn(), false);
  assert.equal(byId(scene).get('displaced').isDrawn(), false);
  scene.dispose();
});
