import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { BreastLesionScene } from '../src/scenes/reproductive/scenes/breastLesion/BreastLesionScene.js';
import { COURSES, ROUTE, solveBreastLesion } from '../src/models/breastLesion.js';
import { MODEL_CONTROLS, PALETTE, VISUAL_MAPPING } from '../src/data/breastLesion.js';

const built = () => { const s = new BreastLesionScene({}); s.build(); return s; };
const DUCTS = COURSES.filter((c) => c.duct !== null).map((c) => c.id);

test('model: the marker is drawn where the model put it, on the course the control named', () => {
  const scene = built();
  for (const site of COURSES.map((c) => c.id)) {
    scene.setModelControl('site', site);
    for (const along of [0, 0.4, 1]) {
      scene.setProgress(along);
      const solved = solveBreastLesion(along, { site });
      assert.ok(scene.marker.position.distanceTo(new THREE.Vector3(...solved.at)) < 1e-9, `${site} at ${along}`);
    }
  }
  scene.dispose();
});

test('model: the marker is one size at every position on every course', () => {
  // The claim the drawing makes on its own. A marker that grew along the axis
  // would be a diameter, and this model has no size in it.
  const scene = built();
  const sizes = new Set();
  for (const site of COURSES.map((c) => c.id)) {
    scene.setModelControl('site', site);
    for (const along of [0, 0.5, 1]) {
      scene.setProgress(along);
      sizes.add(`${scene.marker.scale.toArray().join()}|${scene.marker.geometry.parameters.radius}`);
    }
  }
  assert.equal(sizes.size, 1, `the marker never changes size (${[...sizes].join(' / ')})`);
  const declared = VISUAL_MAPPING.find((m) => m.from === 'at');
  assert.match(declared.notClaim, /no size/i, 'and the visual mapping says why it is fixed');
  scene.dispose();
});

test('model: the drainage route and the nodes are identical whatever the marker does', () => {
  // Nothing travels, so nothing about the route may respond to the place.
  const scene = built();
  const nodes = scene.breast.nodeMeshes ?? [];
  assert.ok(nodes.length >= 3, 'there is a node group to hold still');
  const snapshot = () => ({
    route: Array.from(scene.route.geometry.attributes.position.array),
    where: scene.route.position.toArray(),
    colour: scene.routeMaterial.color.getHexString(),
    nodes: nodes.map((n) => `${n.position.toArray().join()}|${n.material.color.getHexString()}|${n.material.opacity}`),
  });
  const before = JSON.stringify(snapshot());
  for (const site of COURSES.map((c) => c.id)) {
    scene.setModelControl('site', site);
    for (const along of [0, 0.5, 1]) {
      scene.setProgress(along);
      assert.equal(JSON.stringify(snapshot()), before, `${site} at ${along}: the route did not react`);
    }
  }
  scene.dispose();
});

test('model: the line runs from the marker to the nearest place on the route', () => {
  const scene = built();
  for (const site of DUCTS) {
    scene.setModelControl('site', site);
    scene.setProgress(0.8);
    // The beads run between the two ends, so the run they lie on is read back
    // from the first and last of them.
    const beads = scene.beads.map((bead) => bead.position.clone());
    const step = beads[1].clone().sub(beads[0]);
    const from = beads[0].clone().sub(step);
    const to = beads.at(-1).clone().add(step);
    assert.ok(from.distanceTo(scene.marker.position) < 1e-5, `${site}: it starts at the marker`);
    // Its length is the distance the model reports, and its far end is on the route.
    assert.ok(Math.abs(from.distanceTo(to) - scene.solved.toRoute) < 1e-4, `${site}: it is the model's own distance`);
    let onRoute = Infinity;
    for (let i = 0; i < ROUTE.length - 1; i += 1) {
      const a = new THREE.Vector3(...ROUTE[i]);
      const b = new THREE.Vector3(...ROUTE[i + 1]);
      const span = b.clone().sub(a);
      const t = Math.max(0, Math.min(1, to.clone().sub(a).dot(span) / span.lengthSq()));
      onRoute = Math.min(onRoute, a.clone().addScaledVector(span, t).distanceTo(to));
    }
    assert.ok(onRoute < 1e-5, `${site}: and it ends on the route`);
  }
  // On the tail there is no distance to draw, because the place is the route.
  scene.setModelControl('site', 'axillary-tail');
  assert.equal(scene.reach.visible, false);
  scene.dispose();
});

test('model: the line shortens on one course and lengthens on another, on screen', () => {
  // The claim, measured off the drawing rather than off the solver.
  const scene = built();
  const drawnLength = () => {
    const beads = scene.beads.map((bead) => bead.position.clone());
    const step = beads[1].clone().sub(beads[0]);
    return beads[0].clone().sub(step).distanceTo(beads.at(-1).clone().add(step));
  };
  scene.setModelControl('site', 'upper-outer');
  scene.setProgress(0);
  const start = drawnLength();
  scene.setProgress(1);
  assert.ok(drawnLength() < start * 0.6, 'out along the upper outer course the line is plainly shorter');

  scene.setModelControl('site', 'lower-inner');
  scene.setProgress(1);
  assert.ok(drawnLength() > start, 'and along the lower inner course it is longer than it began');
  scene.dispose();
});

test('model: the duct in question is lit and the others are dimmed', () => {
  const scene = built();
  scene.setModelControl('site', 'upper-outer');
  const lit = scene.ductMaterials.get('lactiferous-duct-3');
  const other = scene.ductMaterials.get('lactiferous-duct-7');
  assert.equal(lit.opacity, 1);
  assert.ok(other.opacity < 0.5);
  assert.notEqual(lit.color.getHexString(), other.color.getHexString());

  scene.setModelControl('site', 'lower-inner');
  assert.equal(other.opacity, 1, 'and it follows the control');
  assert.ok(lit.opacity < 0.5);

  // On the tail no duct is the one in question, so none is lit.
  scene.setModelControl('site', 'axillary-tail');
  for (const material of scene.ductMaterials.values()) assert.ok(material.opacity < 0.5);
  scene.dispose();
});

test('model: the read-out prints the absence of a spread rather than omitting it', () => {
  const scene = built();
  for (const site of COURSES.map((c) => c.id)) {
    scene.setModelControl('site', site);
    scene.setProgress(1);
    const row = scene.getMetrics().find((m) => m.id === 'spread');
    assert.ok(row, `${site}: the row is there`);
    assert.match(row.value, /nothing spreads/i);
    for (const metric of scene.getMetrics()) {
      assert.ok(!/\bmm\b|\bcm\b|stage|N[0-3]\b/i.test(String(metric.value)), `${site}: "${metric.value}" reads as a size or a stage`);
    }
  }
  scene.dispose();
});

test('model: the controls offer five places and reset to the one the claim is made against', () => {
  const scene = built();
  const control = MODEL_CONTROLS.find((c) => c.id === 'site');
  assert.deepEqual(
    [...control.options.map((o) => o.value)].sort(),
    [...COURSES.map((c) => c.id)].sort(),
    'every course the model has is offered, and no others'
  );
  scene.setModelControl('site', 'lower-inner');
  assert.equal(scene.getModelControls()[0].value, 'lower-inner');
  scene.resetModelControls();
  assert.equal(scene.solved.site, 'upper-outer');
  scene.dispose();
});

test('model: labels sit above what they point at', () => {
  // The explanation panel takes the lower third of the screen.
  const scene = built();
  scene.setModelControl('site', 'upper-outer');
  scene.setProgress(1);
  const anchors = Object.fromEntries(scene.getAnnotations().map((a) => [a.id, a.position]));
  assert.ok(anchors.marker.y > scene.marker.position.y, 'the marker’s label is above the marker');
  assert.ok(anchors.nipple.y > 0, 'and the nipple’s above the nipple');
  assert.equal(scene.getAnnotations().find((a) => a.id === 'duct').isDrawn(), true);
  scene.setModelControl('site', 'axillary-tail');
  assert.equal(scene.getAnnotations().find((a) => a.id === 'duct').isDrawn(), false, 'and no duct is claimed on the tail');
  scene.dispose();
});

test('model: the scene disposes what it made', () => {
  const scene = built();
  const drawn = [];
  scene.root.traverse((o) => { if (o.geometry) drawn.push(o); });
  assert.ok(drawn.length > 5, 'there is something to free');
  let freed = 0;
  for (const object of drawn) {
    const geometry = object.geometry;
    const dispose = geometry.dispose.bind(geometry);
    geometry.dispose = () => { freed += 1; dispose(); };
  }
  scene.dispose();
  assert.ok(freed >= drawn.length, `every geometry was freed (${freed} of ${drawn.length})`);
});
