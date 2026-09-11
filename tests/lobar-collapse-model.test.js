import test from 'node:test';
import assert from 'node:assert/strict';

import { LobarCollapseScene } from '../src/scenes/respiratory/scenes/lobarCollapse/LobarCollapseScene.js';
import { LOBES, solveLobarCollapse } from '../src/models/lobarCollapse.js';
import { MODEL_CONTROLS } from '../src/data/lobarCollapse.js';

/** A scene that has been built, so the lobes exist to measure. */
const built = () => {
  const scene = new LobarCollapseScene({});
  scene.build();
  return scene;
};

test('model: every lobe is drawn holding the volume the model gave it', () => {
  // Volume goes as the cube of the scale, so what must match is the cube — a
  // scene that applied the ratio as a scale would be drawing a lobe at a third
  // of the volume the read-out prints.
  const scene = built();
  scene.setModelControl('bronchus', 'right-lower');

  for (const progress of [0, 0.5, 1]) {
    scene.setProgress(progress);
    for (const state of scene.solved.lobes) {
      const mesh = scene.lobeById.get(state.id).mesh;
      const drawn = mesh.scale.x * mesh.scale.y * mesh.scale.z;
      assert.ok(
        Math.abs(drawn - state.volumeRatio) < 1e-9,
        `${progress}: ${state.id} is drawn at ${drawn} of its volume, not ${state.volumeRatio}`
      );
    }
  }

  scene.dispose();
});

test('model: what changes about a collapsing lobe is its size, not its opacity', () => {
  // The whole difference between this scene and a picture of density. If the
  // lobe faded instead of shrinking, it would be drawing consolidation.
  const scene = built();
  scene.setModelControl('bronchus', 'right-lower');

  scene.setProgress(0);
  const lobe = scene.lobeById.get('right-lower').mesh;
  const opacityBefore = lobe.material.opacity;
  const scaleBefore = lobe.scale.x;

  scene.setProgress(1);
  assert.equal(lobe.material.opacity, opacityBefore, 'the lobe does not fade');
  assert.ok(lobe.scale.x < scaleBefore * 0.6, 'it gets smaller, and unmistakably so');

  scene.dispose();
});

test('model: a shrinking lobe stays where it is instead of sliding inwards', () => {
  // Scaling a mesh about its origin walks it towards the lung's centre, which
  // draws a lobe migrating rather than one losing volume.
  const scene = built();
  scene.setModelControl('bronchus', 'right-lower');
  scene.setProgress(1);

  const lobe = scene.lobeById.get('right-lower');
  const drawnCentre = lobe.centre.clone().multiplyScalar(lobe.mesh.scale.x).add(lobe.mesh.position);
  assert.ok(
    drawnCentre.distanceTo(lobe.centre) < 1e-9,
    'the lobe shrinks about its own centre, so its centre does not move'
  );

  scene.dispose();
});

test('model: the middle is drawn twice, and only one of them moves', () => {
  // The model's distance is a third of a unit, which a reader has no reference
  // for. The resting bar is that reference, so it must not move.
  const scene = built();
  scene.setModelControl('bronchus', 'right-lower');
  scene.setProgress(1);

  assert.equal(scene.restingMidline.position.x, 0, 'the resting midline stays where it began');
  assert.ok(
    Math.abs(scene.midline.position.x + scene.solved.shift) < 1e-9,
    'and the other carries the model’s distance, towards the right'
  );

  scene.setModelControl('bronchus', 'left-upper');
  assert.ok(scene.midline.position.x > 0, 'a collapse on the left draws it the other way');
  assert.equal(scene.restingMidline.position.x, 0);

  scene.setModelControl('bronchus', 'none');
  assert.equal(scene.midline.position.x, 0, 'with nothing collapsed the two coincide');

  scene.dispose();
});

test('model: colour says which lobe is which, and never how airless it is', () => {
  const scene = built();
  scene.setModelControl('bronchus', 'right-lower');
  scene.setProgress(1);

  const colourOf = (id) => scene.lobeById.get(id).mesh.material.color.getHexString();
  const collapsed = colourOf('right-lower');
  const expanded = colourOf('right-upper');
  const other = colourOf('left-lower');
  assert.notEqual(collapsed, expanded, 'the collapsed lobe and the ones that took its room differ');
  assert.notEqual(expanded, other, 'and the side that took nothing differs again');
  assert.equal(colourOf('right-middle'), expanded, 'both lobes that expanded are drawn the same');

  // The collapsed lobe's colour does not track the axis: it is an identity, not
  // a reading of how much air is left.
  scene.setProgress(0.4);
  assert.equal(colourOf('right-lower'), collapsed, 'the colour is the same at any amount');

  scene.dispose();
});

test('model: every bronchus the copy offers is one the model solves', () => {
  const offered = MODEL_CONTROLS[0].options.map((option) => option.value);
  assert.deepEqual(
    [...offered].sort(),
    ['none', ...LOBES.map((lobe) => lobe.id)].sort(),
    'the control and the model name the same six places'
  );
  assert.equal(offered[0], 'none', 'and the one with nothing blocked comes first');
  for (const value of offered) {
    assert.equal(solveLobarCollapse(1, { bronchus: value }).controls.bronchus, value);
  }
});

test('model: the read-out says where the room went, and the shares add to all of it', () => {
  const scene = built();
  scene.setModelControl('bronchus', 'right-lower');
  scene.setProgress(1);

  const metrics = new Map(scene.getMetrics().map((metric) => [metric.id, metric.value]));
  const shares = String(metrics.get('where')).match(/(\d+)%/g).map((match) => Number.parseInt(match, 10));
  assert.equal(shares.length, 2, 'both destinations are named');
  assert.equal(shares[0] + shares[1], 100, 'and between them they are all of it');
  assert.equal(metrics.get('otherSide'), 'unchanged by this model');

  scene.setModelControl('bronchus', 'none');
  const idle = new Map(scene.getMetrics().map((metric) => [metric.id, metric.value]));
  assert.equal(idle.get('lobe'), 100);
  assert.equal(idle.get('shift'), '0.00');

  scene.dispose();
});

test('model: the conditional labels say when they are not being drawn', () => {
  const scene = built();
  scene.setModelControl('bronchus', 'right-lower');
  scene.setProgress(1);

  const byId = (s) => new Map(s.getAnnotations().map((annotation) => [annotation.id, annotation]));
  for (const annotation of scene.getAnnotations()) {
    assert.ok(annotation.position, `${annotation.id} has an anchor`);
  }
  assert.equal(byId(scene).get('collapsed').isDrawn(), true);
  assert.equal(byId(scene).get('expanded').isDrawn(), true);

  scene.setProgress(0);
  assert.equal(byId(scene).get('collapsed').isDrawn(), false, 'nothing has collapsed yet');
  assert.equal(byId(scene).get('expanded').isDrawn(), false, 'so nothing has expanded either');

  scene.setProgress(1);
  scene.setModelControl('bronchus', 'none');
  assert.equal(byId(scene).get('blockage').isDrawn(), false);

  scene.dispose();
});
