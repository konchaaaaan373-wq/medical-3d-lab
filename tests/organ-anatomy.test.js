import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { ANATOMICAL_AXES, anatomicalSide } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { doubleSidedOpacity, wallMaterial } from '../src/scenes/shared/materials.js';

import { buildHeart } from '../src/scenes/cardiovascular/organs/heart.js';
import { buildBrain } from '../src/scenes/nervous/organs/brain.js';
import { buildAirway } from '../src/scenes/respiratory/organs/airway.js';
import { buildLungs } from '../src/scenes/respiratory/organs/lungs.js';
import { buildGallbladder, buildLiver } from '../src/scenes/hepatobiliary/organs/liver.js';
import { buildPancreas } from '../src/scenes/hepatobiliary/organs/pancreas.js';
import { buildSpleen } from '../src/scenes/hematologic/organs/spleen.js';
import { buildBladder, buildKidney } from '../src/scenes/renal/organs/kidney.js';
import { buildEsophagus, buildStomach } from '../src/scenes/gastrointestinal/organs/stomach.js';
import { buildColon, buildDuodenum, buildSmallIntestine } from '../src/scenes/gastrointestinal/organs/intestine.js';
import { buildThyroid } from '../src/scenes/endocrine/organs/thyroid.js';
import { buildAdrenal } from '../src/scenes/endocrine/organs/adrenal.js';
import { buildBone } from '../src/scenes/musculoskeletal/organs/bone.js';
import { buildMuscle } from '../src/scenes/musculoskeletal/organs/muscle.js';
import { buildUterus } from '../src/scenes/reproductive/organs/uterus.js';
import { buildProstate } from '../src/scenes/reproductive/organs/prostate.js';

/**
 * The organ layer, checked for anatomical meaning rather than for numbers.
 *
 * `semantic-anatomy.test.js` does this for the heart-failure scene, and every
 * bug it exists to catch had passed a full unit run: a coordinate that stayed
 * valid while its meaning moved. Nothing did the same for
 * `src/scenes/*​/organs/`, which is where twenty-odd organs are built and from
 * where every scene borrows them — so the same defects were sitting there.
 * Three were found by writing this file and are named in the tests below:
 *
 *   - the heart's aorta label pointed at the right atrium, left behind on the
 *     far side of the midline when the arch was corrected to sweep left;
 *   - the spleen presented its hilum laterally, so once placed in a body the
 *     splenic vein left from the diaphragmatic surface;
 *   - every hollow organ rendered far more opaque than it asked to, hiding the
 *     contents that were the point of drawing it hollow.
 *
 * Every assertion here is a fact about bodies, not about this repository's
 * numbers: it would still be true if an organ were rebuilt at another scale.
 * Sides come from `ANATOMICAL_AXES`, never from the sign of x written out by
 * hand — one place decides which way is left (architecture rule 5).
 */

/** Nearest point on any mesh of `root` to `point`, and which mesh it was on. */
function nearestSurface(root, point) {
  root.updateMatrixWorld(true);
  const vertex = new THREE.Vector3();
  let best = { distance: Infinity, name: null };
  root.traverse((object) => {
    if (!object.isMesh) return;
    const position = object.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
      const distance = vertex.distanceTo(point);
      if (distance < best.distance) best = { distance, name: object.name || '(unnamed)' };
    }
  });
  return best;
}

/** The world-space box of one named mesh. */
function boxOf(root, name) {
  root.updateMatrixWorld(true);
  const mesh = root.getObjectByName(name);
  assert.ok(mesh, `expected a mesh named "${name}"`);
  return new THREE.Box3().setFromObject(mesh);
}

/* --------------------------------------------------------------------------
   Sides

   Half of these organs are named for the side they are on, and the whole
   catalogue is drawn into one body by `body-overview`. An organ mirrored on
   its own still looks like itself; it only goes wrong once something else is
   placed beside it, which is exactly when nobody is looking at it any more.
   -------------------------------------------------------------------------- */

test('the axes every organ is built in are the ones the heart declares', () => {
  // With superior at +y and anterior at +z, the subject's left is at +x. If
  // this ever stops holding, every assertion below is measuring the mirror of
  // what it says it is.
  const impliedLeft = new THREE.Vector3()
    .crossVectors(ANATOMICAL_AXES.superior, ANATOMICAL_AXES.anterior)
    .normalize();
  assert.ok(impliedLeft.dot(ANATOMICAL_AXES.left) > 0.99, 'the organ layer shares the heart scene’s frame');
});

test('the heart points its apex and its arch to the same side', () => {
  const heart = buildHeart();
  const ventricles = boxOf(heart.object, 'ventricles');
  const arch = boxOf(heart.object, 'aortic-arch');

  // The apex leans towards the patient's left, and so does the arch as it
  // crosses the midline. Drawn disagreeing, the heart is mirrored down its
  // own middle — the defect the heart-failure scene documents at length.
  assert.equal(anatomicalSide(ventricles.max.x + ventricles.min.x), 'left', 'the apex leans left');
  assert.equal(anatomicalSide(arch.max.x), 'left', 'the arch sweeps left');
  assert.equal(anatomicalSide(boxOf(heart.object, 'left-atrium').getCenter(new THREE.Vector3())), 'left');
  assert.equal(anatomicalSide(boxOf(heart.object, 'right-atrium').getCenter(new THREE.Vector3())), 'right');
});

test('the aorta label is on the aorta, and on the aorta’s side of the body', () => {
  // It was not: the anchor stayed at x −1.15 when the arch was corrected to
  // sweep over the left, so the label naming the aorta sat on the right
  // atrium, on the far side of the midline from the vessel. Nothing caught it
  // because the coordinate was still perfectly valid — it had only stopped
  // meaning what it said. Failure mode K in `docs/organ-3d-playbook.md`.
  const heart = buildHeart();
  const anchor = heart.anchors.aorta;
  const arch = boxOf(heart.object, 'aortic-arch');

  assert.equal(anatomicalSide(anchor), anatomicalSide(arch.max.x), 'the label is on the arch’s side');
  const nearest = nearestSurface(heart.object, anchor);
  assert.equal(nearest.name, 'aortic-arch', `the aorta label’s nearest structure is the ${nearest.name}`);
});

test('the right lung is the larger, and each lung is on its own side', () => {
  const lungs = buildLungs();
  const right = boxOf(lungs.object, 'right-lung');
  const left = boxOf(lungs.object, 'left-lung');
  assert.equal(anatomicalSide(right.getCenter(new THREE.Vector3())), 'right');
  assert.equal(anatomicalSide(left.getCenter(new THREE.Vector3())), 'left');

  // The heart takes its room out of the left lung, so the right is the bigger
  // of the two. A pair built the wrong way round reads as a mirrored chest.
  const volume = (box) => {
    const size = box.getSize(new THREE.Vector3());
    return size.x * size.y * size.z;
  };
  assert.ok(volume(right) > volume(left), 'the right lung is the larger');

  // And each lung's label belongs to it.
  assert.equal(anatomicalSide(lungs.anchors.rightLung), 'right');
  assert.equal(anatomicalSide(lungs.anchors.leftLung), 'left');
});

test('the right main bronchus leaves the carina the steeper of the two', () => {
  // This is why inhaled material ends up in the right lung, and it is one of
  // the two things the airway builder says it encodes on purpose.
  const airway = buildAirway({ bronchi: true });
  const [rightPath, leftPath] = airway.airPaths;
  const angleFromVertical = (path) => {
    const heading = path.getPointAt(0.95).clone().sub(path.getPointAt(0.55)).normalize();
    return Math.acos(Math.max(-1, Math.min(1, heading.dot(ANATOMICAL_AXES.inferior))));
  };
  assert.ok(
    angleFromVertical(rightPath) < angleFromVertical(leftPath),
    'the right main bronchus is the more vertical'
  );
  assert.equal(anatomicalSide(airway.anchors.rightBronchus), 'right');
});

test('the thyroid’s lobes sit on the sides they are named for', () => {
  const thyroid = buildThyroid();
  assert.equal(anatomicalSide(boxOf(thyroid.object, 'right-lobe').getCenter(new THREE.Vector3())), 'right');
  assert.equal(anatomicalSide(boxOf(thyroid.object, 'left-lobe').getCenter(new THREE.Vector3())), 'left');
  assert.equal(anatomicalSide(thyroid.anchors.rightLobe), 'right');
  assert.equal(anatomicalSide(thyroid.anchors.leftLobe), 'left');
});

test('the liver is bulky on the right and thins to an edge on the left', () => {
  const liver = buildLiver();
  liver.object.updateMatrixWorld(true);
  const position = liver.object.geometry.attributes.position;
  const vertex = new THREE.Vector3();

  /**
   * How tall the organ is in a band the same distance out from the midline,
   * on each side. Compared as the greatest height over a whole half instead,
   * both halves return the central dome and the wedge does not show — the
   * shape is a wedge *across* the organ, so it has to be measured across it.
   */
  const heightAt = (from, to) => {
    const reach = { left: { min: Infinity, max: -Infinity }, right: { min: Infinity, max: -Infinity } };
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      const out = Math.abs(vertex.x);
      if (out < from || out > to) continue;
      const side = reach[anatomicalSide(vertex)];
      side.min = Math.min(side.min, vertex.y);
      side.max = Math.max(side.max, vertex.y);
    }
    return { left: reach.left.max - reach.left.min, right: reach.right.max - reach.right.min };
  };

  // A liver is a wedge: at the same distance from the midline the right lobe
  // is much the deeper, and the left runs out to an edge. Mirror it and the
  // bulk sits under the wrong costal margin in every abdomen it is drawn in.
  const waist = heightAt(1.25, 1.75);
  assert.ok(
    waist.right > waist.left * 1.4,
    `the right lobe should be much the deeper: ${waist.right.toFixed(2)} vs ${waist.left.toFixed(2)}`
  );
  // And it keeps thinning outwards rather than bulging again at the tip.
  const tip = heightAt(1.75, 2.25);
  assert.ok(tip.left < waist.left, 'the left lobe thins towards its edge');

  assert.equal(anatomicalSide(liver.anchors.rightLobe), 'right');
  assert.equal(anatomicalSide(liver.anchors.leftLobe), 'left');
});

test('the stomach runs from a fundus on the left to a pylorus on the right', () => {
  const stomach = buildStomach();
  assert.equal(anatomicalSide(stomach.anchors.fundus), 'left');
  assert.equal(anatomicalSide(stomach.anchors.pylorus), 'right');
  // The lumen itself, not only the labels: contents enter high on the left and
  // leave low on the right, and the flow stream follows this curve.
  assert.equal(anatomicalSide(stomach.curve.getPointAt(0)), 'left', 'the fundus end of the lumen');
  assert.equal(anatomicalSide(stomach.curve.getPointAt(1)), 'right', 'the pyloric end of the lumen');
  assert.ok(stomach.curve.getPointAt(0).y > stomach.curve.getPointAt(1).y, 'and it descends on the way');
});

test('the colon ascends on the right and descends on the left', () => {
  const colon = buildColon();
  assert.equal(anatomicalSide(colon.anchors.ileocecal), 'right');
  assert.equal(anatomicalSide(colon.anchors.ascending), 'right');
  // Round the frame: caecum on the right, transverse across, descending down
  // the left. A colon mirrored here puts the appendix on the wrong side of
  // every abdomen it is drawn into.
  assert.equal(anatomicalSide(colon.curve.getPointAt(0)), 'right', 'the caecum');
  assert.equal(anatomicalSide(colon.curve.getPointAt(0.7)), 'left', 'the descending colon');
});

/* --------------------------------------------------------------------------
   Medial and lateral

   A left-sided organ's hilum faces the midline. Getting this wrong is
   invisible while the organ is alone in the frame and wrong the moment it is
   not, because the vessels that should leave by the hilum leave by the back.
   -------------------------------------------------------------------------- */

test('each kidney turns its hilum towards the midline', () => {
  for (const [side, medialSide] of [['left', 'right'], ['right', 'left']]) {
    const kidney = buildKidney({ side });
    // A left kidney sits at +x, so the face it turns towards the midline
    // points to −x — which `anatomicalSide` calls the right.
    assert.equal(anatomicalSide(kidney.hilum), medialSide, `the ${side} kidney's hilum faces medially`);
    assert.equal(anatomicalSide(kidney.anchors.hilum), medialSide);
    assert.equal(anatomicalSide(kidney.anchors.cortex), side, 'and its cortex label sits laterally');
    // Every filtration path ends at the collecting system, whichever cortical
    // point it started from: filtrate leaves by the hilum, not by the surface.
    for (const path of kidney.filtrationPaths) {
      assert.ok(
        path.getPointAt(1).distanceTo(kidney.hilum) < 0.4,
        `a ${side} filtration path does not arrive at the collecting system`
      );
    }
  }
});

test('the spleen turns its hilum towards the midline, not towards the ribs', () => {
  // It did not. The spleen is a left-sided organ, so its concave visceral
  // surface — the one the builder's own comment says faces the stomach and the
  // kidney — has to look medially, at −x. Built facing +x it presented the
  // hilum to the ribs the moment it was placed in a body, and the portal
  // scene drew the splenic vein starting half a unit off the notch.
  const spleen = buildSpleen();
  assert.equal(anatomicalSide(spleen.hilum), 'right', 'the hilum of a left-sided organ faces medially');
  assert.equal(anatomicalSide(spleen.anchors.hilum), 'right');

  // And it is genuinely the concave face: measured across the organ's waist,
  // the hilar side reaches less far from the midline than the convex
  // diaphragmatic side opposite it.
  spleen.object.updateMatrixWorld(true);
  const position = spleen.object.geometry.attributes.position;
  const vertex = new THREE.Vector3();
  let hilarReach = 0;
  let convexReach = 0;
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    if (Math.abs(vertex.y) > 0.25 || Math.abs(vertex.z) > 0.25) continue;
    const towardsHilum = vertex.x * Math.sign(spleen.hilum.x);
    if (towardsHilum > 0) hilarReach = Math.max(hilarReach, towardsHilum);
    else convexReach = Math.max(convexReach, -towardsHilum);
  }
  assert.ok(
    hilarReach < convexReach,
    `the hilar face should be the scooped one: ${hilarReach.toFixed(2)} vs ${convexReach.toFixed(2)}`
  );
});

/* --------------------------------------------------------------------------
   Labels point at what they name
   -------------------------------------------------------------------------- */

const LABELLED = [
  ['heart', () => buildHeart(), { heart: 'ventricles', aorta: 'aortic-arch' }],
  ['lungs', () => buildLungs(), { rightLung: 'right-lung', leftLung: 'left-lung' }],
  ['spleen', () => buildSpleen(), { spleen: 'spleen', hilum: 'spleen', pulp: 'spleen' }],
  ['liver', () => buildLiver(), { rightLobe: 'liver', leftLobe: 'liver', porta: 'liver' }],
  ['gallbladder', () => buildGallbladder(), { gallbladder: 'gallbladder' }],
  ['thyroid', () => buildThyroid(), { rightLobe: 'right-lobe', leftLobe: 'left-lobe', isthmus: 'isthmus' }],
  ['stomach', () => buildStomach(), { fundus: 'gastric-body', antrum: 'gastric-body' }],
  ['colon', () => buildColon(), { ileocecal: 'colon', transverse: 'colon', sigmoid: 'colon' }],
  ['small intestine', () => buildSmallIntestine(), { small: 'small-intestine' }],
  ['duodenum', () => buildDuodenum(), { duodenum: 'duodenum' }],
  ['oesophagus', () => buildEsophagus(), { esophagus: 'esophagus' }],
  ['pancreas', () => buildPancreas(), { head: 'gland', body: 'gland', tail: 'gland', islet: 'gland' }],
  ['brain', () => buildBrain(), { cerebrum: 'cerebrum', cerebellum: 'cerebellum' }],
  ['bladder', () => buildBladder(), { bladder: 'bladder-wall' }],
];

for (const [organ, build, expected] of LABELLED) {
  test(`${organ}: every label's nearest structure is the one it names`, () => {
    const built = build();
    for (const [anchor, structure] of Object.entries(expected)) {
      const nearest = nearestSurface(built.object, built.anchors[anchor]);
      assert.equal(
        nearest.name,
        structure,
        `${organ}.${anchor} is nearest "${nearest.name}", not "${structure}"`
      );
      // Close enough to read as pointing at the organ, far enough not to be
      // buried in it. Both ends have been wrong here at some point.
      assert.ok(
        nearest.distance > 0.05 && nearest.distance < 1.0,
        `${organ}.${anchor} sits ${nearest.distance.toFixed(2)} from the surface it names`
      );
    }
  });
}

/* --------------------------------------------------------------------------
   Nested structures stay nested
   -------------------------------------------------------------------------- */

test('an organ drawn inside another stays inside it, through every state', () => {
  const inside = (root, inner, outer) => boxOf(root, outer).containsBox(boxOf(root, inner));

  const kidney = buildKidney({ side: 'left' });
  assert.ok(inside(kidney.object, 'medulla', 'cortex'), 'the medulla is inside the cortex');

  const adrenal = buildAdrenal();
  assert.ok(inside(adrenal.object, 'medulla', 'cortex'), 'the adrenal medulla is inside its cortex');

  // These two change shape, and the containment is the medical claim: a
  // bladder whose contents reach the wall stops reading as a container, and a
  // lining drawn out to the myometrium teaches that the uterus is mostly
  // endometrium. Both have to hold across the whole range, not just at rest.
  const bladder = buildBladder();
  for (let step = 0; step <= 10; step++) {
    bladder.setFill(step / 10);
    assert.ok(inside(bladder.object, 'bladder-contents', 'bladder-wall'), `contents escape at fill ${step / 10}`);
  }

  const uterus = buildUterus();
  for (let step = 0; step <= 10; step++) {
    uterus.setLining(step / 10);
    assert.ok(inside(uterus.object, 'endometrium', 'myometrium'), `the lining reaches the wall at ${step / 10}`);
  }
});

/* --------------------------------------------------------------------------
   State returns

   `docs/organ-3d-playbook.md` §4: walk every state and come back, and check
   the organ is where it started. A setter that leaves something behind is
   invisible until a scene is scrubbed backwards.
   -------------------------------------------------------------------------- */

/** Everything the graph would draw, as one string. */
function drawnState(root) {
  const parts = [];
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    parts.push(object.name, object.position.toArray().join(), object.scale.toArray().join());
    if (!object.isMesh) return;
    const array = object.geometry.attributes.position.array;
    let sum = 0;
    for (let i = 0; i < array.length; i++) sum += array[i];
    parts.push(sum.toFixed(6));
    for (const material of [object.material].flat()) {
      parts.push(`${material.opacity},${material.emissiveIntensity},${material.color?.getHexString()}`);
    }
  });
  return parts.join('|');
}

const SETTERS = [
  ['heart', () => buildHeart(), 'setBeat'],
  ['lungs', () => buildLungs(), 'setInflation'],
  ['airway', () => buildAirway({ branches: true }), 'setCompression'],
  ['gallbladder', () => buildGallbladder(), 'setFill'],
  ['bladder', () => buildBladder(), 'setFill'],
  ['bone', () => buildBone(), 'setCavity'],
  ['muscle', () => buildMuscle(), 'setContraction'],
  ['uterus', () => buildUterus(), 'setLining'],
  ['prostate', () => buildProstate(), 'setEnlargement'],
];

for (const [organ, build, setter] of SETTERS) {
  test(`${organ}.${setter} returns the organ to where it was`, () => {
    const built = build();
    built[setter](0);
    const rest = drawnState(built.object);
    for (const value of [0.25, 0.5, 0.75, 1, 0.5, 0]) built[setter](value);
    assert.equal(drawnState(built.object), rest, `${organ} does not come back from ${setter}`);
  });
}

/* --------------------------------------------------------------------------
   Materials
   -------------------------------------------------------------------------- */

test('a hollow organ transmits as much as its wall says it does', () => {
  // Failure mode B: a ray crosses a closed double-sided shell twice, so two
  // layers of `a` pass only (1 − a)² of what is behind them. Written straight
  // through, the stomach asked for 0.84 and rendered at 0.97 — 2.6% of its
  // contents visible where 16% was intended, in the one scene whose whole
  // subject is what is moving through it.
  for (const wanted of [0.84, 0.9, 0.92, 0.96]) {
    const material = wallMaterial({ color: '#d08a86', opacity: wanted });
    const a = material.opacity;
    const composited = 2 * a - a * a;
    assert.ok(
      Math.abs(composited - wanted) < 1e-9,
      `a wall asking for ${wanted} composites to ${composited.toFixed(3)}`
    );
    assert.ok(material.side === THREE.DoubleSide, 'a hollow organ is seen from inside as well as out');
  }
  // An opaque wall is still opaque, and is not made transparent by the inverse.
  const solid = wallMaterial({ color: '#f0b9ae', opacity: 1 });
  assert.equal(solid.opacity, 1);
  assert.equal(solid.transparent, false);
  assert.equal(doubleSidedOpacity(0), 0);
});
