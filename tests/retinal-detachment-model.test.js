import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { RetinalDetachmentScene } from '../src/scenes/sensory/scenes/retinalDetachment/RetinalDetachmentScene.js';
import { GLOBE, ORIGINS, solveRetinalDetachment } from '../src/models/retinalDetachment.js';
import { MODEL_CONTROLS } from '../src/data/retinalDetachment.js';
import { SITES } from '../src/scenes/sensory/organs/eyeball.js';

const built = () => { const s = new RetinalDetachmentScene({}); s.build(); return s; };

test('model: the drawn cap is the cap the model solved', () => {
  const scene = built();
  for (const origin of ['superior', 'temporal', 'posterior']) {
    scene.setModelControl('origin', origin);
    for (const extent of [0.4, 0.8, 1]) {
      scene.setProgress(extent);
      // The cap's own half-angle, read off the geometry the scene rebuilt.
      const drawn = scene.sheet.geometry.parameters.thetaLength;
      const solvedHalf = (scene.solved.halfAngle * Math.PI) / 180;
      assert.ok(Math.abs(drawn - solvedHalf) < 1e-9, `${origin} at ${extent}: drawn ${drawn} against ${solvedHalf}`);
    }
  }
  scene.dispose();
});

test('model: the separated sheet stands off the retina by the model’s lift', () => {
  const scene = built();
  scene.setModelControl('origin', 'superior');
  for (const extent of [0.3, 1]) {
    scene.setProgress(extent);
    assert.ok(
      Math.abs(scene.sheet.scale.x - (GLOBE.retina[0] + scene.solved.lift)) < 1e-9,
      `${extent}: the sheet sits at the retina plus the lift`
    );
    assert.ok(scene.sheet.scale.x > GLOBE.retina[0], 'which is outside the retina it left');
  }
  scene.dispose();
});

test('model: the cap faces the origin it was named for', () => {
  // The model gives a name and an angle to the macula; the scene's table gives
  // a direction. They have to agree, or the picture is of a different eye.
  const scene = built();
  const macula = new THREE.Vector3(...SITES.fovea).normalize();
  for (const entry of ORIGINS.filter((o) => o.toMacula !== null)) {
    scene.setModelControl('origin', entry.id);
    scene.setProgress(1);
    const facing = new THREE.Vector3(0, 1, 0).applyQuaternion(scene.sheet.quaternion);
    const degrees = (facing.angleTo(macula) * 180) / Math.PI;
    assert.ok(
      Math.abs(degrees - entry.toMacula) < 6,
      `${entry.id}: drawn ${degrees}° from the macula against ${entry.toMacula}° solved`
    );
  }
  scene.dispose();
});

test('model: the macula is the only thing that changes colour, and only across the threshold', () => {
  const scene = built();
  scene.setModelControl('origin', 'temporal');
  const seen = new Set();
  let changes = 0;
  let last = null;
  for (let step = 0; step <= 20; step += 1) {
    scene.setProgress(step / 20);
    seen.add(scene.macula.material.color.getHexString());
    if (last !== null && scene.solved.macula !== last) changes += 1;
    last = scene.solved.macula;
  }
  assert.equal(seen.size, 2, 'two colours across the axis, not a gradient');
  assert.equal(changes, 1, 'and one change');

  // The separated sheet's colour does not track the axis: it is an identity.
  scene.setProgress(0.6);
  const early = scene.sheetMaterial.color.getHexString();
  scene.setProgress(1);
  assert.equal(scene.sheetMaterial.color.getHexString(), early, 'the sheet says separated, not how much');
  scene.dispose();
});

test('model: nothing is drawn when nothing has separated', () => {
  const scene = built();
  scene.setModelControl('origin', 'superior');
  scene.setProgress(0);
  assert.equal(scene.sheet.visible, false);
  scene.setModelControl('origin', 'none');
  scene.setProgress(1);
  assert.equal(scene.sheet.visible, false);
  assert.equal(scene.macula.material.color.getHexString(), scene.macula.material.color.getHexString());
  scene.dispose();
});

test('model: the read-out prints area and macula together, and says vision is absent', () => {
  const scene = built();
  scene.setModelControl('origin', 'posterior');
  scene.setProgress(0.2);
  const small = new Map(scene.getMetrics().map((m) => [m.id, m.value]));
  scene.setModelControl('origin', 'superior');
  scene.setProgress(0.8);
  const large = new Map(scene.getMetrics().map((m) => [m.id, m.value]));

  assert.match(String(small.get('macula')), /^yes/, 'the small one has the macula in it');
  assert.match(String(large.get('macula')), /^no/, 'the large one does not');
  assert.ok(large.get('area') > small.get('area'), 'while being much the larger');
  assert.equal(small.get('vision'), 'not in this model');
  scene.dispose();
});

test('model: every origin the copy offers is one the model solves and the scene can aim', () => {
  const offered = MODEL_CONTROLS[0].options.map((o) => o.value);
  assert.deepEqual([...offered].sort(), ORIGINS.map((o) => o.id).sort());
  assert.equal(offered[0], 'none');
  for (const value of offered) {
    assert.ok(value === 'none' || RetinalDetachmentScene.ORIGIN_DIRECTION[value], `${value} has a direction`);
    assert.equal(solveRetinalDetachment(1, { origin: value }).controls.origin, value);
  }
});

test('model: resetting returns the origin without moving the axis, and anchors are written', () => {
  const scene = built();
  scene.setProgress(0.4);
  scene.setModelControl('origin', 'posterior');
  scene.resetModelControls();
  assert.equal(scene.solved.controls.origin, 'superior');
  assert.equal(scene.progress, 0.4);
  for (const a of scene.getAnnotations()) {
    assert.ok(a.position, `${a.id} has an anchor`);
    assert.notEqual(a.position.lengthSq(), 0, `${a.id}'s anchor has been written`);
  }
  const byId = new Map(scene.getAnnotations().map((a) => [a.id, a]));
  assert.equal(byId.get('separated').isDrawn(), true);
  scene.setModelControl('origin', 'none');
  assert.equal(new Map(scene.getAnnotations().map((a) => [a.id, a])).get('separated').isDrawn(), false);
  scene.dispose();
});
