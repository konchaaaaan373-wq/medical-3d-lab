import test from 'node:test';
import assert from 'node:assert/strict';

import { CataractScene } from '../src/scenes/sensory/scenes/cataract/CataractScene.js';
import { KINDS, LENS, PUPILS, solveCataract } from '../src/models/cataract.js';
import { MODEL_CONTROLS } from '../src/data/cataract.js';

const built = () => { const s = new CataractScene({}); s.build(); return s; };
const radii = (mesh) => [mesh.geometry.parameters.innerRadius / LENS.radius, mesh.geometry.parameters.outerRadius / LENS.radius];

test('model: the cloud is drawn at the band the model named', () => {
  const scene = built();
  for (const kind of ['nuclear', 'cortical', 'posterior-subcapsular']) {
    scene.setModelControl('kind', kind);
    scene.setProgress(1);
    const [from, to] = radii(scene.cloud);
    assert.ok(Math.abs(from - scene.solved.band[0]) < 1e-6, `${kind}: inner radius`);
    assert.ok(Math.abs(to - scene.solved.band[1]) < 1e-6, `${kind}: outer radius`);
  }
  scene.dispose();
});

test('model: the aperture is drawn at the model’s radius, on the same plane as the cloud', () => {
  const scene = built();
  for (const pupil of ['narrow', 'wide']) {
    scene.setModelControl('pupil', pupil);
    scene.setProgress(1);
    assert.ok(Math.abs(radii(scene.aperture)[1] - PUPILS[pupil]) < 1e-6, `${pupil}: the edge is at the aperture`);
    assert.equal(scene.aperture.position.z, scene.cloud.position.z, 'and shares a plane with the cloud');
  }
  scene.dispose();
});

test('model: the overlap is exactly where the two rings meet, and absent when they do not', () => {
  const scene = built();

  scene.setModelControl('kind', 'cortical');
  scene.setModelControl('pupil', 'narrow');
  scene.setProgress(1);
  assert.equal(scene.overlap.visible, false, 'the rim is outside a small pupil, so there is nothing to draw');
  assert.equal(scene.solved.inPath, 0);

  scene.setModelControl('pupil', 'wide');
  assert.equal(scene.overlap.visible, true);
  const [from, to] = radii(scene.overlap);
  assert.ok(Math.abs(from - scene.solved.band[0]) < 1e-6, 'it starts where the cloud does');
  assert.ok(Math.abs(to - scene.solved.apertureRadius) < 1e-6, 'and ends where the aperture does');

  // The coloured area is the number: its area over the aperture's is `inPath`.
  const area = to * to - from * from;
  const apertureArea = scene.solved.apertureRadius ** 2;
  assert.ok(Math.abs(area / apertureArea - scene.solved.inPath) < 1e-6, 'the drawn area is the reported share');
  scene.dispose();
});

test('model: the axis moves how opaque the cloud is drawn, and moves no geometry', () => {
  const scene = built();
  scene.setModelControl('kind', 'nuclear');
  scene.setProgress(0.2);
  const faint = scene.cloudMaterial.opacity;
  const band = radii(scene.cloud);
  scene.setProgress(1);
  assert.ok(scene.cloudMaterial.opacity > faint, 'a denser cloud is drawn more solidly');
  assert.deepEqual(radii(scene.cloud), band, 'and the band it occupies has not moved');
  scene.dispose();
});

test('model: nothing is drawn for a clear lens', () => {
  const scene = built();
  scene.setModelControl('kind', 'none');
  scene.setProgress(1);
  assert.equal(scene.cloud.visible, false);
  assert.equal(scene.overlap.visible, false);
  assert.equal(new Map(scene.getAnnotations().map((a) => [a.id, a])).get('opacity').isDrawn(), false);
  scene.dispose();
});

test('model: the read-out prints both shares, and says sight is absent', () => {
  const scene = built();
  scene.setModelControl('kind', 'cortical');
  scene.setModelControl('pupil', 'narrow');
  scene.setProgress(1);
  const rim = new Map(scene.getMetrics().map((m) => [m.id, m.value]));
  scene.setModelControl('kind', 'posterior-subcapsular');
  const patch = new Map(scene.getMetrics().map((m) => [m.id, m.value]));

  assert.ok(rim.get('ofLens') > patch.get('ofLens'), 'the rim is the bigger cloud');
  assert.ok(rim.get('inPath') < patch.get('inPath'), 'and the smaller obstruction');
  assert.equal(rim.get('vision'), 'not in this model');
  assert.equal(rim.get('pupil'), 'small');
  scene.dispose();
});

test('model: every place and every aperture the copy offers is one the model solves', () => {
  const kinds = MODEL_CONTROLS.find((c) => c.id === 'kind').options.map((o) => o.value);
  const pupils = MODEL_CONTROLS.find((c) => c.id === 'pupil').options.map((o) => o.value);
  assert.deepEqual([...kinds].sort(), KINDS.map((k) => k.id).sort());
  assert.deepEqual([...pupils].sort(), Object.keys(PUPILS).sort());
  assert.equal(kinds[0], 'none');
  for (const kind of kinds) for (const pupil of pupils) {
    const solved = solveCataract(1, { kind, pupil });
    assert.equal(solved.kind, kind);
    assert.equal(solved.pupil, pupil);
  }
});

test('model: resetting returns both controls without moving the axis', () => {
  const scene = built();
  scene.setProgress(0.4);
  scene.setModelControl('kind', 'cortical');
  scene.setModelControl('pupil', 'wide');
  scene.resetModelControls();
  assert.equal(scene.solved.controls.kind, 'nuclear');
  assert.equal(scene.solved.controls.pupil, 'narrow');
  assert.equal(scene.progress, 0.4, 'the axis is not a control');
  for (const a of scene.getAnnotations()) assert.ok(a.position && a.position.lengthSq() > 0, `${a.id} has an anchor`);
  scene.dispose();
});
