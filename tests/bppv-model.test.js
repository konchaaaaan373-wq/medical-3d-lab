import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { BppvScene } from '../src/scenes/sensory/scenes/bppv/BppvScene.js';
import { CANAL, CANALS, solveBppv } from '../src/models/bppv.js';
import { MODEL_CONTROLS } from '../src/data/bppv.js';

const built = () => { const s = new BppvScene({}); s.build(); return s; };

test('model: the particle is drawn at the angle the model solved, on the loop it named', () => {
  const scene = built();
  for (const canal of ['posterior', 'lateral']) {
    scene.setModelControl('canal', canal);
    for (const head of [0, 0.5, 1]) {
      scene.setProgress(head);
      const entry = CANALS.find((c) => c.id === canal);
      const expected = scene.pointOnLoop(entry.normal, scene.solved.restsAt);
      assert.ok(scene.particle.position.distanceTo(expected) < 1e-9, `${canal} at ${head}`);
      // And it is on the loop: its distance from the loop's own centre, in the
      // loop's plane, is the loop's radius.
      const { axis } = scene.loopFrame(entry.normal);
      const offset = scene.particle.position.clone().sub(scene.centre);
      const inPlane = offset.clone().addScaledVector(axis, -offset.dot(axis));
      assert.ok(Math.abs(inPlane.length() - CANAL.radius) < 1e-9, `${canal} at ${head}: on the loop`);
    }
  }
  scene.dispose();
});

test('model: the loop in question is lit and the others are dimmed', () => {
  const scene = built();
  scene.setModelControl('canal', 'lateral');
  scene.setProgress(1);
  const lateral = scene.loopMaterials.get('lateral-semicircular-canal');
  const posterior = scene.loopMaterials.get('posterior-semicircular-canal');
  assert.equal(lateral.opacity, 1, 'the one in question is solid');
  assert.ok(posterior.opacity < 0.5, 'and the others are not');
  assert.notEqual(lateral.color.getHexString(), posterior.color.getHexString());

  scene.setModelControl('canal', 'posterior');
  assert.equal(posterior.opacity, 1, 'and it follows the control');
  assert.ok(lateral.opacity < 0.5);
  scene.dispose();
});

test('model: the arrow carries the model’s gravity, and the head never moves', () => {
  const scene = built();
  scene.setModelControl('canal', 'posterior');
  const earAt = scene.ear.object.position.clone();
  const earTurn = scene.ear.object.quaternion.clone();

  scene.setProgress(0);
  // An ArrowHelper points its own +y down its direction.
  const upright = new THREE.Vector3(0, 1, 0).applyQuaternion(scene.arrow.quaternion);
  assert.ok(upright.distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-6, 'upright, down is down');

  scene.setProgress(1);
  const tipped = new THREE.Vector3(0, 1, 0).applyQuaternion(scene.arrow.quaternion);
  const solved = new THREE.Vector3(...scene.solved.gravity).normalize();
  assert.ok(tipped.distanceTo(solved) < 1e-6, 'and it carries the model’s own direction');
  assert.ok(tipped.distanceTo(upright) > 0.5, 'which has plainly moved');

  assert.ok(scene.ear.object.position.equals(earAt), 'while the ear has not moved');
  assert.ok(scene.ear.object.quaternion.equals(earTurn), 'or turned');
  scene.dispose();
});

test('model: a loop that cannot drive anything leaves the particle where it was', () => {
  const scene = built();
  scene.setModelControl('canal', 'lateral');
  // The turn that gives the level loop somewhere to send its particle: in this
  // drawing the two turns are not mirror images, and one of them moves it
  // further than the other.
  scene.setModelControl('side', 'right');
  scene.setProgress(0);
  const still = scene.particle.position.clone();
  assert.equal(scene.solved.drives, false, 'nothing is in its plane');
  assert.equal(scene.solved.travel, 0, 'so it has gone nowhere');

  scene.setProgress(1);
  assert.equal(scene.solved.drives, true, 'and now something is');
  // Measured against the model's own travel rather than a distance chosen here.
  const arc = Math.abs(scene.solved.travel) * 0.32;
  assert.ok(arc > 0.1, `${arc} is not a journey anybody can see`);
  assert.ok(scene.particle.position.distanceTo(still) > 0.05, 'and the drawn particle has made it');
  scene.dispose();
});

test('model: nothing is drawn when nothing is loose', () => {
  const scene = built();
  scene.setModelControl('canal', 'none');
  scene.setProgress(1);
  assert.equal(scene.particle.visible, false);
  assert.equal(scene.ampulla.visible, false);
  const byId = new Map(scene.getAnnotations().map((a) => [a.id, a]));
  assert.equal(byId.get('particle').isDrawn(), false);
  assert.equal(byId.get('ampulla').isDrawn(), false);
  scene.dispose();
});

test('model: the read-out says a level loop drives nothing, and that no eye movement is derived', () => {
  const scene = built();
  scene.setModelControl('canal', 'lateral');
  scene.setProgress(0);
  const level = new Map(scene.getMetrics().map((m) => [m.id, m.value]));
  assert.equal(level.get('inPlane'), 0);
  assert.match(String(level.get('drives')), /^no/);
  assert.equal(level.get('nystagmus'), 'not derived here');

  scene.setModelControl('canal', 'posterior');
  const holding = new Map(scene.getMetrics().map((m) => [m.id, m.value]));
  assert.ok(holding.get('inPlane') > 90, 'while the other loop, at the same head position, holds nearly all of it');
  assert.equal(holding.get('drives'), 'yes');
  scene.dispose();
});

test('model: every loop and every turn the copy offers is one the model solves', () => {
  const canals = MODEL_CONTROLS.find((c) => c.id === 'canal').options.map((o) => o.value);
  const sides = MODEL_CONTROLS.find((c) => c.id === 'side').options.map((o) => o.value);
  assert.deepEqual([...canals].sort(), CANALS.map((c) => c.id).sort());
  assert.deepEqual([...sides].sort(), ['left', 'right']);
  assert.equal(canals[0], 'none');
  for (const canal of canals) for (const side of sides) {
    assert.equal(solveBppv(1, { canal, side }).controls.canal, canal);
  }
});

test('model: resetting returns both controls without moving the axis', () => {
  const scene = built();
  scene.setProgress(0.4);
  scene.setModelControl('canal', 'lateral');
  scene.setModelControl('side', 'right');
  scene.resetModelControls();
  assert.equal(scene.solved.controls.canal, 'posterior');
  assert.equal(scene.solved.controls.side, 'left');
  assert.equal(scene.progress, 0.4);
  for (const a of scene.getAnnotations()) assert.ok(a.position && a.position.lengthSq() > 0, `${a.id} has an anchor`);
  scene.dispose();
});
