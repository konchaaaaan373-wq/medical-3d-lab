import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { anatomicalSide } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { LIVER_SCALE, buildLiver, liverWarp } from '../src/scenes/hepatobiliary/organs/liver.js';
import {
  HEPATIC_VEINS,
  PLANES,
  SECTORS,
  SEGMENTS,
  anatomicalFrame,
  segmentsOfLiver,
  segmentsOfSector,
  veinOrigin,
} from '../src/scenes/hepatobiliary/organs/liverAnatomy.js';
import { carveInside, planeThrough, radialField, surfaceSamples } from '../src/scenes/shared/geometry/carve.js';

/**
 * The liver, checked as anatomy.
 *
 * Couinaud's division is not a diagram: it is what makes a segment removable,
 * and every claim below is a fact about that. The sector volume fractions are
 * the one calibrated number, and they are checked against what the literature
 * reports rather than against what the builder produces.
 */

function volumeOf(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let volume = 0;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const i0 = index ? index.getX(i) : i;
    const i1 = index ? index.getX(i + 1) : i + 1;
    const i2 = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, i0);
    b.fromBufferAttribute(position, i1);
    c.fromBufferAttribute(position, i2);
    volume += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(volume);
}

const liver = buildLiver({ detail: 8 });
const segmentVolume = new Map(liver.segments.map((segment) => [segment.id, volumeOf(segment.geometry)]));
const totalVolume = [...segmentVolume.values()].reduce((sum, value) => sum + value, 0);
const sectorShare = (id) =>
  SECTORS.find((sector) => sector.id === id).segments.reduce((sum, seg) => sum + segmentVolume.get(seg), 0) /
  totalVolume;

const centreOf = (id) => {
  const segment = liver.segmentById(id);
  segment.geometry.computeBoundingBox();
  return segment.geometry.boundingBox.getCenter(new THREE.Vector3());
};

const vesselNamed = (name) => liver.hepaticVeins.object.getObjectByName(name) ?? liver.portal.object.getObjectByName(name);

/* --------------------------------------------------------------------------
   The division
   -------------------------------------------------------------------------- */

test('there are eight Couinaud segments, and each is a solid of its own', () => {
  // The numbering runs I to VIII, with IV carried as its superior and inferior
  // halves the way a surgeon refers to them.
  const numbers = new Set(SEGMENTS.map((segment) => segment.number.replace(/[ab]$/, '')));
  assert.deepEqual([...numbers].sort(), ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].sort());
  assert.equal(liver.segments.length, 9, 'nine parts, because IV is carried in two halves');
  for (const segment of liver.segments) {
    assert.ok(segment.mesh.isMesh, `${segment.id} is a mesh of its own`);
    assert.ok(volumeOf(segment.geometry) > 0, `${segment.id} encloses a volume`);
    assert.ok(segment.label && segment.labelJa, `${segment.id} is named in both languages`);
  }
});

test('the segments partition the liver: they fill it, and they do not overlap', () => {
  // The property that makes a segmentectomy possible at all. Sampled against
  // the surface the segments were cut from, using the builder's own warp so
  // that a copy of it here cannot drift from the original.
  const samples = surfaceSamples(liverWarp, LIVER_SCALE, 12000);
  const bounds = new THREE.Box3();
  const probe = new THREE.Vector3();
  for (let i = 0; i < samples.length; i += 3) {
    bounds.expandByPoint(probe.set(samples[i], samples[i + 1], samples[i + 2]));
  }
  const centre = bounds.getCenter(new THREE.Vector3());
  const field = radialField(samples, centre);
  const frame = anatomicalFrame(bounds);

  const regions = SEGMENTS.map((segment) => ({
    id: segment.id,
    planes: segment.bounded.map(({ plane, positive }) => {
      const normal = frame.toLocalNormal(PLANES[plane].normal);
      return planeThrough(frame.toLocal(PLANES[plane].through), positive ? normal.negate() : normal);
    }),
  }));

  const size = bounds.getSize(new THREE.Vector3());
  let seed = 4242;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  let inside = 0;
  let exactlyOne = 0;
  for (let i = 0; i < 40000; i++) {
    probe.set(
      bounds.min.x + random() * size.x,
      bounds.min.y + random() * size.y,
      bounds.min.z + random() * size.z
    );
    if (!carveInside(probe, { field })) continue;
    inside += 1;
    const hits = regions.filter((region) => carveInside(probe, { field, planes: region.planes })).length;
    if (hits === 1) exactlyOne += 1;
  }
  assert.ok(inside > 4000, `the sample has to land in the liver, got ${inside}`);
  assert.equal(exactlyOne, inside, 'every point in the liver belongs to exactly one segment');
});

test('the sectors take the share of the liver the literature reports', () => {
  // The calibrated claim: the plane positions were chosen to land these and
  // nothing else. A caudate of a couple of per cent, the two left sectors
  // sharing about a third between them, and the two right sectors a third each.
  for (const sector of SECTORS) {
    const share = sectorShare(sector.id);
    assert.ok(
      Math.abs(share - sector.share) < 0.05,
      `${sector.id} took ${(share * 100).toFixed(1)}% against a target of ${(sector.share * 100).toFixed(0)}%`
    );
  }
  const right = sectorShare('right-anterior') + sectorShare('right-posterior');
  const left = sectorShare('left-lateral') + sectorShare('left-medial');
  assert.ok(right > left * 1.5, `the right liver is much the larger: ${(right * 100).toFixed(0)}% vs ${(left * 100).toFixed(0)}%`);
  assert.ok(sectorShare('caudate') < 0.05, 'and the caudate is a small part of it');
});

test("Cantlie's line is the right/left division, and it is not the falciform ligament", () => {
  // The commonest mistake about liver anatomy. The plane of the middle hepatic
  // vein divides right liver from left; the falciform ligament is well to the
  // left of it and divides segment IV from II and III.
  const cantlieAt = PLANES.cantlie.through[0];
  const falciformAt = PLANES.falciform.through[0];
  assert.ok(falciformAt > cantlieAt, 'the falciform ligament lies to the left of Cantlie’s line');
  assert.ok(falciformAt - cantlieAt > 0.15, 'and by a real distance, not a rounding');

  // Segment IV is between the two: right of the falciform, left of Cantlie.
  const four = centreOf('IVb');
  assert.ok(four.x < centreOf('III').x, 'segment IV is medial to segment III');
  assert.ok(four.x > centreOf('V').x, 'and lateral to segment V, which is right liver');

  // Cantlie's line is oblique, not vertical: it runs from the gallbladder
  // fossa in front to the cava behind.
  assert.notEqual(PLANES.cantlie.normal[2], 0, 'the plane is tipped front to back');
});

test('the segments sit on the sides and levels their names describe', () => {
  // Right liver on the patient's right, left liver on the left.
  for (const segment of segmentsOfLiver('right')) {
    assert.equal(anatomicalSide(centreOf(segment.id)), 'right', `${segment.id} is right liver`);
  }
  for (const segment of segmentsOfLiver('left')) {
    assert.equal(anatomicalSide(centreOf(segment.id)), 'left', `${segment.id} is left liver`);
  }

  // Superior segments above their inferior partners, in every sector that has
  // a pair. This is what the portal plane is for.
  for (const [superior, inferior] of [
    ['II', 'III'],
    ['IVa', 'IVb'],
    ['VIII', 'V'],
    ['VII', 'VI'],
  ]) {
    assert.ok(
      centreOf(superior).y > centreOf(inferior).y,
      `${superior} should sit above ${inferior}`
    );
  }

  // And the posterior sector is behind the anterior one.
  assert.ok(centreOf('VII').z < centreOf('VIII').z, 'VII is posterior to VIII');
  assert.ok(centreOf('VI').z < centreOf('V').z, 'and VI is posterior to V');
});

test('the caudate lobe belongs to neither the right liver nor the left', () => {
  // It takes blood from both sides and drains straight into the cava, which is
  // why it survives — and hypertrophies — when the hepatic veins occlude.
  const caudate = SEGMENTS.find((segment) => segment.id === 'I');
  assert.equal(caudate.sector, 'caudate');
  assert.equal(SECTORS.find((sector) => sector.id === 'caudate').liver, 'independent');
  assert.ok(!segmentsOfLiver('right').includes(caudate));
  assert.ok(!segmentsOfLiver('left').includes(caudate));

  // It is the most posterior part of the liver.
  const behind = centreOf('I').z;
  for (const segment of liver.segments.filter((entry) => entry.id !== 'I')) {
    assert.ok(behind < centreOf(segment.id).z, `the caudate sits behind ${segment.id}`);
  }

  // It drains by its own veins rather than through any of the three, and it is
  // fed from both portal branches.
  assert.ok(vesselNamed('caudate-veins'), 'the caudate has its own drainage');
  assert.ok(vesselNamed('portal-pedicle-I-right'), 'and a pedicle from the right branch');
  assert.ok(vesselNamed('portal-pedicle-I-left'), 'and one from the left');
});

/* --------------------------------------------------------------------------
   The two trees, and the difference between them
   -------------------------------------------------------------------------- */

test('the hepatic veins lie on the planes that separate the segments', () => {
  // Between segments, not inside them — which is why a surgeon finds a
  // resection plane by following one.
  const frame = liver.frame;
  for (const vein of HEPATIC_VEINS) {
    const branch = vesselNamed(vein.id);
    assert.ok(branch, `${vein.id} is drawn`);
    const definition = PLANES[vein.plane];
    const normal = frame.toLocalNormal(definition.normal);
    const through = frame.toLocal(definition.through);
    // The point the vein starts from sits on its own plane, to within the
    // width of a vessel.
    const from = veinOrigin(frame, vein);
    const offset = Math.abs(normal.dot(from) - normal.dot(through));
    assert.ok(offset < 1e-9, `${vein.id} starts ${offset.toFixed(3)} off the plane it is supposed to run in`);
  }
  assert.ok(vesselNamed('inferior-vena-cava'), 'and they converge on the cava');
});

test('the portal pedicles run inside the segments they supply', () => {
  // The other half of the arrangement: what supplies a unit sits within it.
  // Together with the veins on the boundaries, this is the whole reason a
  // segment can be taken out without cutting into its neighbours.
  for (const segment of liver.segments) {
    if (segment.id === 'I') continue;
    assert.ok(vesselNamed(`portal-pedicle-${segment.id}`), `${segment.id} has a portal pedicle`);
    // The pedicle ends inside its own segment, not on a boundary.
    assert.ok(
      segment.planes.every((plane) => plane.normal.dot(segment.pedicle) - plane.constant <= 0),
      `${segment.id}'s pedicle ends outside its own segment`
    );
    assert.equal(liver.segmentAt(segment.pedicle)?.id, segment.id);
  }
  assert.ok(vesselNamed('portal-vein'));
  assert.ok(vesselNamed('right-portal-branch'));
  assert.ok(vesselNamed('left-portal-branch'));
});

test('a hepatic vein and a portal pedicle are not the same kind of thing', () => {
  // Stated as a measurement rather than as a comment: the veins sit near the
  // planes, the pedicles sit far from them and near the segment centres.
  const frame = liver.frame;
  const middle = PLANES.cantlie;
  const normal = frame.toLocalNormal(middle.normal);
  const through = frame.toLocal(middle.through);
  const distanceToCantlie = (point) => Math.abs(normal.dot(point) - normal.dot(through));

  const veinStart = veinOrigin(frame, HEPATIC_VEINS.find((vein) => vein.plane === 'cantlie'));
  // A pedicle in a segment that borders Cantlie's line, which is the fair
  // comparison: both are near the middle of the liver.
  const pedicle = liver.segmentById('V').pedicle;
  assert.ok(
    distanceToCantlie(veinStart) < distanceToCantlie(pedicle),
    'the middle hepatic vein runs nearer its own plane than a neighbouring pedicle does'
  );
});

/* --------------------------------------------------------------------------
   The interface
   -------------------------------------------------------------------------- */

test('a segment and a sector can each be taken away on their own', () => {
  const built = buildLiver({ vessels: false, detail: 6 });
  built.setSegmentVisible('VIII', false);
  assert.equal(built.segmentById('VIII').mesh.visible, false);
  assert.equal(built.segmentById('V').mesh.visible, true, 'its neighbour stays');

  built.setSectorVisible('right-posterior', false);
  for (const id of segmentsOfSector('right-posterior').map((segment) => segment.id)) {
    assert.equal(built.segmentById(id).mesh.visible, false, `${id} goes with its sector`);
  }
  assert.equal(built.segmentById('IVa').mesh.visible, true, 'and the left liver is untouched');
  built.dispose();
});

test('the liver still answers what the four scenes that draw it ask', () => {
  // The rebuild changed what a liver is made of. `object.material` is gone —
  // there are nine of them — so the scenes say what they mean instead.
  const built = buildLiver({ color: '#8f3f43', opacity: 0.62, detail: 6 });
  assert.ok(built.object.isObject3D);
  assert.ok(built.anchors.rightLobe && built.anchors.leftLobe && built.anchors.porta);
  built.object.position.set(-1.1, 0.15, 0);
  built.object.scale.setScalar(0.92);

  built.setParenchymaColor('#5d3038');
  assert.ok(built.segments.every((segment) => segment.material.color.getHexString() === '5d3038'));
  built.setSegmentColor('I', '#ffffff');
  assert.equal(built.segmentById('I').material.color.getHexString(), 'ffffff');
  assert.equal(built.segmentById('II').material.color.getHexString(), '5d3038', 'and only that one');
  built.dispose();
});

test('every point the builder reports as inside really is inside a segment', () => {
  // `contains` and `segmentAt` have to agree, or a scene placing something in
  // the liver can put it in a segment that does not reach there.
  const built = buildLiver({ vessels: false, detail: 6 });
  built.object.updateMatrixWorld(true);
  let checked = 0;
  for (const segment of built.segments) {
    assert.ok(built.contains(segment.centre), `${segment.id}'s centre is inside the liver`);
    assert.equal(built.segmentAt(segment.centre)?.id, segment.id, `${segment.id}'s centre is in itself`);
    checked += 1;
  }
  assert.equal(checked, 9);
  built.dispose();
});
