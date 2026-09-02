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
  MITRAL_INFLOW,
  PULMONARY_VEIN_OSTIA,
  anatomicalSide,
  buildCavityBlood,
} from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { buildSegmentedPath } from '../src/scenes/cardiovascular/scenes/heartFailure/geometry/segmentedPath.js';
import { Vessels } from '../src/scenes/cardiovascular/scenes/heartFailure/Vessels.js';
import {
  VENTRICLE_SHAPING,
  VENTRICLE_SITES,
  wallSiteAzimuth,
  wallSitePoint,
} from '../src/scenes/cardiovascular/scenes/heartFailure/geometry/ventricleGeometry.js';

/**
 * How far past the end of the arch an ejection destination may land, as a
 * fraction of the aorta's length: the jitter applied to each destination,
 * with room to spare.
 */
const EJECTION_BOUNDARY_TOLERANCE = 0.02;

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
    // Destinations are jittered by up to 0.22 units, so one generated at the
    // very end of the arch can be nearest a sample just past the boundary.
    // What must not happen is a particle heading *down* the descending aorta
    // and out of the picture, so allow the junction and measure the rest.
    const pastArch = nearest.t - AORTA_SEGMENTS.arch.endT;
    assert.ok(
      allowed.has(part) || pastArch < EJECTION_BOUNDARY_TOLERANCE,
      `ejection destination ${i} landed ${pastArch.toFixed(3)} into the ${part}; ` +
        'blood must not stream out of frame'
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
  assert.equal(anatomicalSide(AORTA_LANDMARKS.archEnd.position), 'left', 'the arch sweeps left');
  assert.ok(
    ANATOMY.atriumCentre.z < ANATOMY.mitralValve.z,
    'the atrium sits posterior to the valve plane'
  );
});

/* --------------------------------------------------------------------------
   The relationships an anatomy review checks

   The tests above are about the aorta's own course. These are about how the
   structures sit relative to one another, which is what a reviewer holding an
   atlas plate beside the screen actually compares — and what nothing checked
   until the Gate 1 review went looking. Every assertion here is a fact about
   hearts, not about this repository's numbers: it would still be true if the
   whole scene were rebuilt at a different scale.
   -------------------------------------------------------------------------- */

test('review: the aortic valve sits right of, and anterior to, the mitral valve', () => {
  // The two valves share the fibrous skeleton of the heart, side by side in
  // the same plane, with the aortic anterior and to the right. Getting this
  // pair the wrong way round mirrors the whole base of the heart.
  assert.equal(anatomicalSide(ANATOMY.aorticValve), 'right');
  assert.equal(anatomicalSide(ANATOMY.mitralValve), 'left');
  assert.ok(
    ANATOMY.aorticValve.z > ANATOMY.mitralValve.z,
    'the aortic valve is the anterior of the two'
  );
  assert.equal(
    ANATOMY.aorticValve.y,
    ANATOMY.mitralValve.y,
    'both valves sit in the one annular plane the ventricle hangs from'
  );
});

test('review: the left atrium sits above and behind the valve plane it drains through', () => {
  assert.ok(ANATOMY.atriumCentre.y > ANATOMY.baseY, 'the atrium is above the valve plane');
  assert.ok(
    ANATOMY.atriumCentre.z < ANATOMY.mitralValve.z,
    'and posterior to it — the left atrium is the most posterior chamber'
  );
  // Inflow runs downward and forward, from the atrium through the valve. A
  // curve that rose would be drawing blood back into the atrium in diastole.
  const start = MITRAL_INFLOW.getPointAt(0);
  const end = MITRAL_INFLOW.getPointAt(1);
  assert.ok(end.y < start.y, 'mitral inflow descends into the ventricle');
  assert.ok(end.z > start.z, 'and moves forward as it does');
});

test('review: the four pulmonary veins enter the atrium from behind, two a side', () => {
  const centre = ANATOMY.atriumCentre;
  for (const [index, ostium] of PULMONARY_VEIN_OSTIA.entries()) {
    assert.ok(
      ostium.z < centre.z,
      `ostium ${index} is not on the posterior aspect of the atrium`
    );
    assert.ok(
      ostium.distanceTo(centre) < ANATOMY.atriumRadius * 2,
      `ostium ${index} is not on the atrium at all`
    );
  }
  const [leftSuperior, leftInferior, rightSuperior, rightInferior] = PULMONARY_VEIN_OSTIA;
  assert.ok(leftSuperior.y > leftInferior.y, 'the left superior vein is the upper of its pair');
  assert.ok(rightSuperior.y > rightInferior.y, 'and so is the right');
  // The pair draining the right lung arrives on the atrium's right-hand
  // aspect, having crossed the midline behind the heart. Their ostia are
  // medial to the left pair, not on the right side of the body — which is
  // what the "right" in their name means, and is worth stating so that a
  // later reader does not "correct" it.
  const rightward = ANATOMICAL_AXES.right.x;
  assert.ok(
    rightSuperior.x * rightward > leftSuperior.x * rightward,
    'the right-lung veins enter medial to the left-lung veins'
  );
  assert.ok(
    rightInferior.x * rightward > leftInferior.x * rightward,
    'both of them, not just the superior one'
  );
});

test('review: the great vessels cross the midline in the direction they should', () => {
  // Ascending aorta on the right, arch passing back and to the left,
  // descending aorta on the left. The single most recognisable relationship in
  // the mediastinum, and the one a mirrored scene gets wrong.
  assert.equal(anatomicalSide(AORTA_LANDMARKS.ascendingAortaMid.position), 'right');
  assert.equal(anatomicalSide(AORTA_LANDMARKS.archEnd.position), 'left');

  // Posterior, monotonically, from the valve to the end of the arch. The arch
  // does not wander forward again on its way over.
  const course = [
    ANATOMY.aorticValve,
    AORTA_LANDMARKS.sinotubularJunction.position,
    AORTA_LANDMARKS.archStart.position,
    AORTA_LANDMARKS.archApex.position,
    AORTA_LANDMARKS.archEnd.position,
  ];
  for (let i = 1; i < course.length; i += 1) {
    assert.ok(
      course[i].z < course[i - 1].z,
      `the aorta moves forward again between landmark ${i - 1} and ${i}`
    );
  }

  // And it passes over the atrium rather than through it.
  assert.ok(
    AORTA_LANDMARKS.archApex.position.y > ANATOMY.atriumCentre.y + ANATOMY.atriumRadius,
    'the arch must clear the top of the left atrium'
  );
});

test('the anatomical frame is right-handed and self-consistent', () => {
  // The scene was built with the ventricle on one convention and the vessels
  // on the mirror of it: every structure sat on the correct side of the ones
  // beside it, so nothing looked wrong close up, and the heart as a whole was
  // a mirror image. This is the check that would have caught it.
  //
  // With superior at +y and anterior at +z, a subject's left is at +x.
  const impliedLeft = new THREE.Vector3()
    .crossVectors(ANATOMICAL_AXES.superior, ANATOMICAL_AXES.anterior)
    .normalize();
  assert.ok(
    impliedLeft.dot(ANATOMICAL_AXES.left) > 0.99,
    'the declared left must be the left those axes imply, or the scene is mirrored'
  );

  // And the two halves of the scene must agree with the frame. The septum and
  // the right-ventricular lobe face the right; the free wall faces the left.
  const septalX = Math.sin(VENTRICLE_SHAPING.septalPhi);
  const lateralX = Math.sin(VENTRICLE_SHAPING.lateralPhi);
  assert.equal(anatomicalSide(septalX), 'right', 'the septum faces the right ventricle');
  assert.equal(anatomicalSide(lateralX), 'left', 'the free wall faces left');
  assert.equal(
    anatomicalSide(ANATOMY.atriumCentre),
    anatomicalSide(lateralX),
    'the left atrium is on the same side as the left ventricular free wall'
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

test('the papillary muscles are placed by name, on the wall they belong to', () => {
  // Placed by quoting a profile fraction and an azimuth, these would drift the
  // moment the ventricle's parameterisation changed — exactly what happened to
  // the sinuses of Valsalva when the aorta grew. Asked for by name, they can
  // only be wrong if the wall itself is.
  const shape = {
    cavityRadius: 2.1,
    cavitySemiLength: 3.6,
    outerSemiLength: 4.3,
    baseY: 1.6,
  };
  const point = new THREE.Vector3();
  const sites = Object.keys(VENTRICLE_SITES);
  assert.deepEqual(sites.sort(), ['anterolateralPapillary', 'posteromedialPapillary']);

  const anterolateral = wallSitePoint(shape, 'anterolateralPapillary', point).clone();
  const posteromedial = wallSitePoint(shape, 'posteromedialPapillary', point).clone();

  // Both sit below the valve plane, in the ventricle rather than above it.
  for (const [name, p] of [['anterolateral', anterolateral], ['posteromedial', posteromedial]]) {
    assert.ok(p.y < shape.baseY, `${name} papillary must sit below the valve plane`);
    assert.ok(p.y > -shape.cavitySemiLength, `${name} papillary must sit above the apex`);
  }

  // The anterolateral muscle is the one on the free wall; the posteromedial is
  // the one toward the septum. The scene's septum faces the right ventricle.
  const freeWall = Math.sin(VENTRICLE_SHAPING.lateralPhi);
  const septum = Math.sin(VENTRICLE_SHAPING.septalPhi);
  assert.ok(
    Math.abs(Math.sin(wallSiteAzimuth('anterolateralPapillary')) - freeWall) <
      Math.abs(Math.sin(wallSiteAzimuth('anterolateralPapillary')) - septum),
    'the anterolateral papillary belongs to the free wall'
  );
  assert.ok(
    Math.abs(Math.sin(wallSiteAzimuth('posteromedialPapillary')) - septum) <
      Math.abs(Math.sin(wallSiteAzimuth('posteromedialPapillary')) - freeWall),
    'the posteromedial papillary sits toward the septum'
  );
  assert.notEqual(anatomicalSide(anterolateral), anatomicalSide(posteromedial));
});
