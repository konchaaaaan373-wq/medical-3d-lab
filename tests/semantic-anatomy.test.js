import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  ANATOMICAL_AXES,
  ANATOMY,
  AORTA,
  AORTA_LANDMARKS,
  AORTA_MODEL,
  AORTA_SEGMENTS,
  ANCHORS,
  EJECTION_REACH,
  anatomicalSide,
  buildCavityBlood,
} from '../src/scenes/heartFailure/anatomy.js';
import { buildSegmentedPath } from '../src/scenes/heartFailure/geometry/segmentedPath.js';
import { Vessels } from '../src/scenes/heartFailure/Vessels.js';

/**
 * These tests are about anatomical meaning, not about numbers.
 *
 * The bugs they exist to catch all passed a full unit-test run: the sinuses of
 * Valsalva swelling in the mid-ascending aorta, ejected blood streaming ten
 * units below the apex, the aorta's label on the distal arch, the larger lung
 * on the wrong side of the chest. Each was a coordinate that stayed valid
 * while its meaning moved. So the assertions here are stated in world space and
 * in anatomical relations — never as the arc-length fractions that drifted.
 */

const distance = (landmark, point) => landmark.position.distanceTo(point);

test('aortic landmarks run in anatomical order along the vessel', () => {
  const order = [
    'aorticValve',
    'sinusOfValsalva',
    'sinotubularJunction',
    'ascendingAortaMid',
    'archStart',
    'archApex',
    'archEnd',
    'descendingAortaStart',
  ];
  for (let i = 1; i < order.length; i++) {
    const previous = AORTA_LANDMARKS[order[i - 1]];
    const current = AORTA_LANDMARKS[order[i]];
    assert.ok(
      current.pathT >= previous.pathT,
      `${order[i]} must not come before ${order[i - 1]} along the aorta`
    );
  }
});

test('the aortic valve landmark is the valve the rest of the scene uses', () => {
  // ValveApparatus, the annulus ring and the mitral/aortic geometry all place
  // themselves from ANATOMY.aorticValve. If the curve's own idea of where its
  // valve is drifts away from that, the cusps stop sitting in the root.
  assert.ok(
    distance(AORTA_LANDMARKS.aorticValve, ANATOMY.aorticValve) < 0.15,
    'aortic valve landmark should coincide with ANATOMY.aorticValve'
  );
});

test('the sinuses of Valsalva stay at the aortic root', () => {
  const fromValve = distance(AORTA_LANDMARKS.sinusOfValsalva, ANATOMY.aorticValve);
  // The sinuses are a feature of the root: centimetres above the valve, not
  // the length of the ascending aorta above it.
  assert.ok(fromValve < 1.0, `sinuses should sit within 1cm of the valve, got ${fromValve.toFixed(2)}`);
  assert.equal(AORTA_LANDMARKS.sinusOfValsalva.segment, 'root');
  assert.ok(
    AORTA_LANDMARKS.sinusOfValsalva.position.y > ANATOMY.aorticValve.y,
    'sinuses sit above the valve plane'
  );
});

test('the ascending aorta runs superiorly from the valve', () => {
  const rise = AORTA_LANDMARKS.ascendingAortaMid.position
    .clone()
    .sub(AORTA_LANDMARKS.aorticValve.position);
  assert.ok(
    rise.dot(ANATOMICAL_AXES.superior) > 0.6 * rise.length(),
    'the ascending aorta should head mostly superiorly'
  );
});

test('the arch curves over and turns the vessel back down', () => {
  const apex = AORTA_LANDMARKS.archApex.position;
  assert.ok(apex.y > AORTA_LANDMARKS.archStart.position.y, 'the arch rises to its apex');
  assert.ok(apex.y > AORTA_LANDMARKS.archEnd.position.y, 'and falls again past it');
  // Entering and leaving directions must genuinely differ, or it is not an arch.
  const entry = AORTA.getTangentAt(AORTA_SEGMENTS.arch.startT);
  const exit = AORTA.getTangentAt(AORTA_SEGMENTS.arch.endT);
  assert.ok(entry.dot(exit) < 0.3, 'the arch should turn the vessel through a large angle');
});

test('the descending aorta leaves the frame rather than stopping in it', () => {
  const end = AORTA.getPointAt(1);
  assert.ok(end.y < -6, 'the vessel should run well below the heart, out of shot');
});

test('ejected blood is aimed at the aorta it would actually occupy', () => {
  const count = 400;
  const blood = buildCavityBlood(count);
  // Sample the vessel once so each destination can be placed on it by nearest
  // point, rather than by trusting the fraction it was generated from.
  const samples = [];
  for (let i = 0; i <= 600; i++) samples.push({ t: i / 600, point: AORTA.getPointAt(i / 600) });

  const allowed = new Set(['root', 'ascending', 'arch']);
  const exit = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    exit.set(blood.exits[i * 3], blood.exits[i * 3 + 1], blood.exits[i * 3 + 2]);
    let nearest = samples[0];
    for (const sample of samples) {
      if (exit.distanceTo(sample.point) < exit.distanceTo(nearest.point)) nearest = sample;
    }
    const part = AORTA_MODEL.segmentAt(nearest.t);
    assert.ok(
      allowed.has(part),
      `ejection destination ${i} landed on the ${part}; blood must not stream out of frame`
    );
    // And never back down below the valve it just left through.
    assert.ok(
      exit.y > ANATOMY.aorticValve.y - 0.5,
      `ejection destination ${i} sits below the aortic valve: y=${exit.y.toFixed(2)}`
    );
  }
  assert.equal(AORTA_MODEL.segmentAt(EJECTION_REACH.endT), 'arch');
});

test("the aorta's label anchor stays on the proximal aorta", () => {
  const anchor = ANCHORS.aorta;
  assert.ok(
    anchor.distanceTo(AORTA_LANDMARKS.ascendingAortaMid.position) < 0.01,
    'the anchor is the ascending aorta landmark'
  );
  // Concretely: it must not drift onto the distal arch, where it collides with
  // the pulmonary labels, nor down the descending aorta.
  assert.ok(
    anchor.distanceTo(AORTA_LANDMARKS.archEnd.position) > 2,
    'the label must not sit on the distal arch'
  );
  assert.ok(anatomicalSide(anchor) === 'right', 'the ascending aorta is on the right');
});

test('anatomical axes agree with every structure that names a side', () => {
  assert.equal(anatomicalSide(ANATOMY.atriumCentre), 'left', 'the left atrium is on the left');
  assert.equal(anatomicalSide(ANATOMY.pulmonaryBed), 'left', 'the labelled left bed is on the left');
  assert.equal(anatomicalSide(ANATOMY.pulmonaryBedRight), 'right');
  assert.equal(anatomicalSide(ANATOMY.aorticValve), 'right', 'the aortic valve is right of mitral');
  assert.ok(
    ANATOMY.atriumCentre.z < ANATOMY.mitralValve.z,
    'the atrium sits posterior to the valve plane'
  );
});

test('the right lung is the larger one, and each is on its own side', () => {
  const vessels = new Vessels();
  const left = vessels.lungs.getObjectByName('lung-left');
  const right = vessels.lungs.getObjectByName('lung-right');
  assert.ok(left && right, 'both lungs are built');
  assert.equal(anatomicalSide(left.position), 'left');
  assert.equal(anatomicalSide(right.position), 'right');
  const volume = (mesh) => mesh.scale.x * mesh.scale.y * mesh.scale.z;
  assert.ok(
    volume(right) > volume(left),
    `the right lung should be the larger: ${volume(right).toFixed(2)} vs ${volume(left).toFixed(2)}`
  );
});

test('landmarks follow the anatomy when the shape changes', () => {
  // The real check on this architecture: lengthen one part of a vessel and the
  // landmarks in the other parts must keep their meaning. Under arc-length
  // constants they would all slide, silently, which is exactly what happened.
  const root = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
  const shortArch = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 2, 0)];
  const longArch = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 9, 0)];
  const spec = { midRoot: { segment: 'root', u: 0.5 } };

  const before = buildSegmentedPath(
    [{ id: 'root', points: root }, { id: 'arch', points: shortArch }],
    spec
  );
  const after = buildSegmentedPath(
    [{ id: 'root', points: root }, { id: 'arch', points: longArch }],
    spec
  );

  assert.ok(
    before.landmarks.midRoot.position.distanceTo(after.landmarks.midRoot.position) < 0.2,
    'a landmark in the root must not move when the arch grows'
  );
  assert.ok(
    after.landmarks.midRoot.pathT < before.landmarks.midRoot.pathT,
    'its arc-length coordinate does change — which is why nothing may quote it'
  );
});
