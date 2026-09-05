import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { ANATOMICAL_AXES, anatomicalSide } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { SIDE_SHAPE, buildLungs, lungWarp } from '../src/scenes/respiratory/organs/lungs.js';
import { buildAirwayTree } from '../src/scenes/respiratory/organs/airwayTree.js';
import {
  MAIN_BRONCHUS_INDEX,
  NAMED_BRANCHES,
  WHERE_THE_CORRESPONDENCE_ENDS,
  lateralSignFor,
  sideOfModelBranch,
} from '../src/scenes/respiratory/organs/airwayCorrespondence.js';
import {
  FISSURES,
  LOBES,
  LOBE_VOLUME_SHARES,
  SEGMENTS,
  SIDES,
  anatomicalFrame,
  lobesOfSide,
  segmentsOfLobe,
  segmentsOfSide,
} from '../src/scenes/respiratory/organs/lungAnatomy.js';
import { partitionQuality, wholeVolume } from './partition.js';
import {
  carveInside,
  partCentroid,
  planeThrough,
  radialField,
  starShaped,
  surfaceSamples,
} from '../src/scenes/shared/geometry/carve.js';

/**
 * The lung, checked as anatomy.
 *
 * Every assertion is a fact about lungs, not about this repository's numbers.
 * The lung was rebuilt from a single surface with grooves scratched in it into
 * five closed lobes, eighteen named segments and a bronchovascular tree, and
 * these are the claims that rebuild is making. The volume fractions are the one
 * place a chosen number appears, and they are checked against a stated target
 * rather than against what the builder happens to produce — the target being
 * the approximate shares taught with the lobes, which are uncited and recorded
 * as such in `docs/medical-notes.md`.
 */

/** Signed volume of a closed mesh. */
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

// The tree is opt-in on the builder, because three scenes draw this lung and
// none of them wants one. Everything about the tree is asked of a lung that
// asked for it.
const lungs = buildLungs({ bronchi: true, vessels: true });

/**
 * The mesh resolution the partition claims are measured at.
 *
 * Finer than the default the scenes draw with, because the shortfall a carve
 * leaves at its cuts is a function of resolution and the claim being made is
 * about the partition rather than about any one scene's mesh. The scenes'
 * default is checked too — by the convergence test, which measures both ends.
 */
const PARTITION_DETAIL = 8;
const lobeVolume = new Map(lungs.lobes.map((lobe) => [lobe.id, volumeOf(lobe.geometry)]));
const sideVolume = (side) =>
  lungs.lobes.filter((lobe) => lobe.side === side).reduce((sum, lobe) => sum + lobeVolume.get(lobe.id), 0);
const share = (id) => lobeVolume.get(id) / sideVolume(LOBES.find((lobe) => lobe.id === id).side);

/** The centre of a lung, from the union of its lobes — the point the field is built about. */
const lungCentre = (side) => {
  const box = new THREE.Box3();
  for (const lobe of lungs.lobes.filter((entry) => entry.side === side)) {
    lobe.geometry.computeBoundingBox();
    box.union(lobe.geometry.boundingBox);
  }
  return box.getCenter(new THREE.Vector3());
};

/** Which lung a branch belongs to, from the name the builder gives it. */
const sideOfBranch = (name) => {
  if (/^right-/.test(name)) return 'right';
  if (/^left-/.test(name)) return 'left';
  if (/^RS/.test(name)) return 'right';
  if (/^LS/.test(name)) return 'left';
  return null;
};
/** Whether a branch is parented to a lung, and so lives in that lung's coordinates. */
const isIntrapulmonary = (branch, side) => {
  let parent = branch.mesh.parent;
  while (parent) {
    if (parent.name === `${side}-lung`) return true;
    parent = parent.parent;
  }
  return false;
};

/** One lung's bounds in world space, from the lobes that make it up. */
const lungBox = (side) => {
  lungs.object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(lungs.object.getObjectByName(`${side}-lung`));
};

const branchNamed = (name) => lungs.bronchi.branches.find((branch) => branch.name === name);
const arteryNamed = (name) => lungs.arteries.branches.find((branch) => branch.name === name);
const veinNamed = (name) => lungs.veins.branches.find((branch) => branch.name === name);

// A branch's curve is in the coordinates of whatever it is parented to — the
// scene root for the extrapulmonary part of a tree, the lung for the part
// inside it — so anything comparing across that boundary has to go to world
// space first.
lungs.object.updateMatrixWorld(true);
const worldPointAt = (branch, t) =>
  branch.curve.getPointAt(t).clone().applyMatrix4(branch.mesh.matrixWorld);

/* --------------------------------------------------------------------------
   Lobes
   -------------------------------------------------------------------------- */

test('the right lung has three lobes and the left has two', () => {
  // The most basic fact about a lung, and the one a single-mesh lung with
  // grooves scratched into it could not actually be asked.
  assert.equal(lobesOfSide('right').length, 3);
  assert.equal(lobesOfSide('left').length, 2);
  assert.equal(lungs.lobes.length, 5);
  for (const lobe of lungs.lobes) {
    assert.ok(lobe.mesh.isMesh, `${lobe.id} is a mesh of its own`);
    assert.ok(volumeOf(lobe.geometry) > 0, `${lobe.id} encloses a volume`);
  }
});

test('only the right lung has a horizontal fissure', () => {
  // It is what makes the difference between two lobes and three. The left lung
  // has an oblique fissure and nothing else.
  const cutBy = (side, fissure) =>
    lobesOfSide(side).some((lobe) => lobe.bounded.some((bound) => bound.fissure === fissure));
  assert.ok(cutBy('right', 'oblique'));
  assert.ok(cutBy('right', 'horizontal'));
  assert.ok(cutBy('left', 'oblique'));
  assert.ok(!cutBy('left', 'horizontal'), 'the left lung has no horizontal fissure');
});

test('the oblique fissure runs from high behind to low in front', () => {
  // Which is why so much of what looks like upper lung on a frontal film is
  // lower lobe. Stated as the normal: it points antero-superiorly, so the lobe
  // on its far side is the antero-superior one.
  const [, vertical, anterior] = FISSURES.oblique.normal;
  assert.ok(vertical > 0, 'the normal points superiorly');
  assert.ok(anterior > 0, 'and anteriorly');
  // Steeply set rather than level: the vertical and anterior components are
  // within a factor of two of each other. A normal that was nearly all vertical
  // would be a horizontal fissure by another name.
  assert.ok(vertical / anterior > 1 && vertical / anterior < 2.5, 'the fissure is steep, not level');

  // And the horizontal fissure really is nearly level.
  const horizontal = FISSURES.horizontal.normal;
  assert.ok(horizontal[1] / horizontal[2] > 3, 'the horizontal fissure is nearly level');
});

test('the lobes sit where their names say, relative to one another', () => {
  const centreOf = (id) => {
    const lobe = lungs.lobes.find((entry) => entry.id === id);
    lobe.geometry.computeBoundingBox();
    return lobe.geometry.boundingBox.getCenter(new THREE.Vector3());
  };
  const rightUpper = centreOf('right-upper');
  const rightMiddle = centreOf('right-middle');
  const rightLower = centreOf('right-lower');

  assert.ok(rightUpper.y > rightMiddle.y, 'the upper lobe is above the middle');
  assert.ok(rightMiddle.y > rightLower.y - 0.35, 'and the middle sits above or beside the lower, not under it');
  // The middle lobe is the anterior one — it is what a lingula answers to on
  // the left, and it is why right middle lobe collapse silhouettes the heart.
  assert.ok(rightMiddle.z > rightLower.z, 'the middle lobe is anterior to the lower');
  assert.ok(rightMiddle.z > rightUpper.z, 'and anterior to the upper');
  // The lower lobe is the posterior one.
  assert.ok(rightLower.z < rightUpper.z, 'the lower lobe lies behind the upper');

  assert.ok(centreOf('left-upper').y > centreOf('left-lower').y, 'and the same on the left');
  assert.ok(centreOf('left-upper').z > centreOf('left-lower').z);
});

/**
 * How far a measured share may sit from its reference value, in percentage
 * points of its own lung.
 *
 * Not a confidence interval and not a normal range — the reference is a single
 * specimen and has neither. It is the width inside which this geometry is
 * making the claim, chosen so that the two independent readings of the same
 * anatomy both fall inside it: Bakker's weighted cohort means, and the worked
 * subject in Yamada et al., who comes to 35.0 / 18.8 / 46.2 on the right. A
 * band that excluded one of those would be asserting a precision no source
 * here has.
 */
const LOBE_TOLERANCE_PP = { right: 3, left: 4 };

test('each lobe takes the share of its own lung the reference specimen gives it', () => {
  for (const lobe of LOBES) {
    const target = LOBE_VOLUME_SHARES[lobe.id];
    const tolerance = LOBE_TOLERANCE_PP[lobe.side] / 100;
    const measured = share(lobe.id);
    assert.ok(
      Math.abs(measured - target) <= tolerance,
      `${lobe.short} took ${(measured * 100).toFixed(2)}% of the ${lobe.side} lung, ` +
        `against ${(target * 100).toFixed(0)}% ± ${LOBE_TOLERANCE_PP[lobe.side]}`
    );
  }

  // Shares of one lung, so each side sums to 1 by construction — which is why
  // that is not asserted here. It cannot fail, and a test that cannot fail is
  // worse than no test: it reads like cover. What the parts are checked
  // against is the lung itself, in the partition test below.

  // The middle lobe is the smallest of the five, on either side. True of the
  // reference values and true of real lungs, and it is the ordering that a
  // fissure offset edited in the wrong direction breaks first.
  const smallest = [...lobeVolume.entries()].sort((a, b) => a[1] - b[1])[0][0];
  assert.equal(smallest, 'right-middle');
});

test('the reference shares are shares of one lung, and each lung is whole', () => {
  // The denominator, asserted where it is declared rather than left to a
  // reader. Stated against both lungs the numbers would be wrong by a factor
  // of about two, and the geometry would still pass every band above.
  for (const side of ['right', 'left']) {
    const total = lobesOfSide(side).reduce((sum, lobe) => sum + LOBE_VOLUME_SHARES[lobe.id], 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `the ${side} lobes' reference shares sum to ${total}`);
  }
});

test('the lobes partition the lung: they fill it, and they do not overlap', () => {
  // The property that makes them lobes rather than five blobs, checked against
  // the lung rather than against each other. Each lobe carries the distance
  // field it was cut out of, so the solid being partitioned here is the one
  // that was actually partitioned — not a second lung rebuilt from the same
  // parameters, which would drift the moment the shape changed.
  const built = buildLungs({ detail: PARTITION_DETAIL, bronchi: false, vessels: false });
  for (const side of ['right', 'left']) {
    const parts = built.lobes.filter((lobe) => lobe.side === side);
    const bounds = new THREE.Box3();
    for (const lobe of parts) {
      lobe.geometry.computeBoundingBox();
      bounds.union(lobe.geometry.boundingBox);
    }
    bounds.expandByScalar(0.02);

    const quality = partitionQuality({
      bounds,
      contains: (point) => built.contains(side, point),
      parts,
      samples: 50000,
      seed: side === 'right' ? 7 : 11,
    });
    assert.equal(quality.samples, 50000, `${side}: the sample has to land in the lung 50000 times`);
    assert.ok(
      quality.unassignedRate <= 0.001,
      `${side}: ${quality.unassigned} of ${quality.samples} points belong to no lobe — ${quality.worst}`
    );
    assert.ok(
      quality.multipleRate <= 0.001,
      `${side}: ${quality.multiple} of ${quality.samples} points belong to more than one lobe — ${quality.worst}`
    );

    // And the lobes have to add up to the lung, which sampling cannot see: a
    // carve is a polyhedron inscribed in the surface, so cutting one solid into
    // several loses a little at every new facet. This is the check that caught
    // the lobes summing to 182% of their lung.
    const whole = wholeVolume({ field: parts[0].field, detail: PARTITION_DETAIL, volumeOf });
    const sum = parts.reduce((total, lobe) => total + volumeOf(lobe.geometry), 0);
    assert.ok(
      Math.abs(sum / whole - 1) <= 0.01,
      `${side}: the lobes sum to ${(100 * (sum / whole)).toFixed(2)}% of the lung they were cut from`
    );
  }
  built.dispose();
});

test('the volume a carve loses at its cuts is resolution, not a hole', () => {
  // The previous test allows the parts to fall 1% short of the whole, and that
  // allowance is only safe if the shortfall is the inscribed-polyhedron error
  // and not a wedge belonging to nobody. The two look identical at one
  // resolution and behave oppositely across resolutions: an approximation error
  // shrinks as the mesh refines, a hole does not.
  const measure = (detail) => {
    const built = buildLungs({ detail, bronchi: false, vessels: false });
    const parts = built.lobes.filter((lobe) => lobe.side === 'right');
    const whole = wholeVolume({ field: parts[0].field, detail, volumeOf });
    const sum = parts.reduce((total, lobe) => total + volumeOf(lobe.geometry), 0);
    built.dispose();
    return 1 - sum / whole;
  };
  const coarse = measure(5);
  const fine = measure(12);
  assert.ok(coarse > 0, `a carve should lose volume at its cuts, not gain it (${coarse})`);
  assert.ok(
    fine < coarse * 0.7,
    `refining the mesh should shrink the shortfall: ${(100 * coarse).toFixed(3)}% at detail 5, ` +
      `${(100 * fine).toFixed(3)}% at detail 12`
  );
});

/* --------------------------------------------------------------------------
   Segments
   -------------------------------------------------------------------------- */

test('the segments are the ones each lobe actually carries', () => {
  // Ten on the right, eight on the left. The left has fewer because its apical
  // and posterior segments share a bronchus and it has no medial basal segment.
  assert.equal(segmentsOfSide('right').length, 10);
  assert.equal(segmentsOfSide('left').length, 8);

  assert.deepEqual(segmentsOfLobe('right-upper').map((s) => s.number), ['S1', 'S2', 'S3']);
  assert.deepEqual(segmentsOfLobe('right-middle').map((s) => s.number), ['S4', 'S5']);
  assert.deepEqual(segmentsOfLobe('right-lower').map((s) => s.number), ['S6', 'S7', 'S8', 'S9', 'S10']);
  assert.deepEqual(segmentsOfLobe('left-upper').map((s) => s.number), ['S1+2', 'S3', 'S4', 'S5']);
  assert.deepEqual(segmentsOfLobe('left-lower').map((s) => s.number), ['S6', 'S8', 'S9', 'S10']);

  // The left lower lobe has no medial basal segment: the heart is there.
  assert.ok(!segmentsOfLobe('left-lower').some((s) => s.number === 'S7'));
  // The lingula is part of the left upper lobe, not a lobe of its own.
  assert.ok(segmentsOfLobe('left-upper').some((s) => s.label.includes('lingular')));

  for (const segment of SEGMENTS) {
    assert.ok(segment.label && segment.labelJa, `${segment.id} is named in both languages`);
  }
});

test('every segment sits where its own name says it does', () => {
  // The names are positional, so this is not a convention check: a segment
  // drawn somewhere its name does not describe is wrong. `at` is
  // [lateral, vertical, anterior], each −1 to +1.
  const at = (id) => SEGMENTS.find((segment) => segment.id === id).at;

  // Apical is at the top; posterior basal is at the back of the base.
  assert.ok(at('RS1')[1] > 0.6, 'the apical segment is at the apex');
  assert.ok(at('RS10')[1] < -0.4 && at('RS10')[2] < -0.4, 'the posterior basal segment is low and behind');
  assert.ok(at('RS8')[2] > 0.2 && at('RS8')[1] < -0.4, 'the anterior basal segment is low and in front');
  assert.ok(at('RS9')[0] > 0.4, 'the lateral basal segment faces the ribs');
  assert.ok(at('RS7')[0] < -0.3, 'the medial basal segment faces the mediastinum');

  // In the upper lobe, posterior is behind and anterior is in front.
  assert.ok(at('RS2')[2] < 0, 'S2 is the posterior segment');
  assert.ok(at('RS3')[2] > 0, 'S3 is the anterior segment');

  // The middle lobe's two: lateral out, medial in.
  assert.ok(at('RS4')[0] > at('RS5')[0], 'S4 is lateral to S5');

  // The superior segment of the lower lobe is its highest, and posterior — it
  // is the one that fills first in an aspiration in the supine patient.
  const lowerRight = segmentsOfLobe('right-lower');
  const superior = lowerRight.find((s) => s.number === 'S6');
  for (const other of lowerRight.filter((s) => s.number !== 'S6')) {
    assert.ok(superior.at[1] > other.at[1], `S6 sits above ${other.number}`);
  }
  assert.ok(superior.at[2] < 0, 'and behind');

  // The lingular segments are anterior and inferior in the left upper lobe.
  assert.ok(at('LS4')[2] > 0.3 && at('LS5')[2] > 0.3, 'the lingula is anterior');
  assert.ok(at('LS5')[1] < at('LS4')[1], 'the inferior lingular segment is the lower of the two');
});

test('a segment belongs to one lobe and never crosses a fissure', () => {
  // Which is why a segmentectomy is possible at all.
  for (const segment of lungs.segments) {
    const lobe = lungs.lobes.find((entry) => entry.id === segment.lobe);
    assert.ok(lobe, `${segment.id} names a lobe that exists`);
    assert.equal(lobe.side, segment.side);
    // The nearest segment to a segment's own bronchus is itself, searched
    // across the whole lung rather than only within its lobe.
    assert.equal(lungs.segmentAt(segment.position).id, segment.id, `${segment.id} is nearest to itself`);
  }
});

test('the segment colouring covers the parenchyma and names what it coloured', () => {
  for (const lobe of lungs.lobes) {
    const colour = lobe.geometry.getAttribute('color');
    assert.ok(colour, `${lobe.id} carries a segment colour per vertex`);
    assert.equal(colour.count, lobe.geometry.attributes.position.count);
    assert.deepEqual(
      lobe.geometry.userData.segmentIds,
      segmentsOfLobe(lobe.id).map((segment) => segment.id),
      `${lobe.id} records which segments its colours mean`
    );
  }
});

/* --------------------------------------------------------------------------
   Airways and vessels
   -------------------------------------------------------------------------- */

test('the bronchial tree divides trachea, main, lobar, segmental', () => {
  assert.ok(branchNamed('trachea'), 'there is a trachea');
  assert.ok(branchNamed('right-main-bronchus'));
  assert.ok(branchNamed('left-main-bronchus'));
  for (const lobe of LOBES) {
    assert.ok(branchNamed(`${lobe.id}-lobar-bronchus`), `${lobe.id} has a lobar bronchus`);
  }
  for (const segment of SEGMENTS) {
    assert.ok(branchNamed(`${segment.id}-segmental-bronchus`), `${segment.id} has a segmental bronchus`);
  }
});

test('the right main bronchus is the wider, shorter and steeper of the two', () => {
  // Which is why an inhaled object goes right, and why the right lung is the
  // one that gets an aspiration pneumonia.
  const lengthOf = (branch) => branch.curve.getLength();
  const right = branchNamed('right-main-bronchus');
  const left = branchNamed('left-main-bronchus');
  // By a margin, not by a hair. This read 1.457 against 1.446 once — the right
  // ordering by 0.7%, which is a coin toss dressed as a fact, and it passed.
  assert.ok(
    lengthOf(right) < lengthOf(left) * 0.95,
    `right ${lengthOf(right).toFixed(3)} vs left ${lengthOf(left).toFixed(3)}`
  );

  const descent = (branch) => {
    const heading = branch.curve.getPointAt(1).clone().sub(branch.curve.getPointAt(0)).normalize();
    return Math.acos(Math.max(-1, Math.min(1, heading.dot(ANATOMICAL_AXES.inferior))));
  };
  assert.ok(
    descent(right) < descent(left) - 0.15,
    `the right main bronchus is the more vertical (${((descent(right) * 180) / Math.PI).toFixed(1)}° ` +
      `against ${((descent(left) * 180) / Math.PI).toFixed(1)}° from vertical)`
  );
});

test('an artery runs with every bronchus', () => {
  // The bronchoarterial pair: it is the unit a segment is supplied by, and the
  // reason a segment can be taken out on its own. Existing is not enough — the
  // artery has to actually accompany its bronchus, so this measures the gap
  // along the whole length of the pair and not only at the ends.
  // The drawing offset that separates the pair so it reads as two vessels
  // rather than one (`pairOffset` in lungs.js, at scale 1). It is a
  // presentation distance, not an anatomical one — in life the two are in one
  // sheath and touching.
  const pairing = Math.hypot(0.055, 0.02, 0.055);
  for (const segment of SEGMENTS) {
    const bronchus = branchNamed(`${segment.id}-segmental-bronchus`);
    const artery = arteryNamed(`${segment.id}-segmental-artery`);
    assert.ok(artery, `${segment.id} has an artery of its own`);
    assert.ok(bronchus, `${segment.id} has a bronchus`);
    let worst = 0;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      worst = Math.max(worst, worldPointAt(bronchus, t).distanceTo(worldPointAt(artery, t)));
    }
    // Within one drawing offset of it, and nowhere near the ~0.6 that separates
    // one segment from the next.
    assert.ok(
      worst < pairing * 1.6,
      `${segment.id}: the artery strays ${worst.toFixed(3)} from its bronchus`
    );
  }
  for (const lobe of LOBES) {
    assert.ok(arteryNamed(`${lobe.id}-lobar-artery`), `${lobe.id} has a lobar artery`);
  }
});

test('the veins run between the segments rather than with them', () => {
  // The fact a surgeon uses to find the plane of a segmentectomy. Each
  // tributary starts nearer the midpoint of two segments than either of them —
  // which is the claim actually worth holding, so it is the one measured.
  const tributaries = lungs.veins.branches.filter((branch) => branch.name.includes('intersegmental'));
  assert.ok(
    tributaries.length >= 8,
    `expected a tributary between neighbouring segments, found ${tributaries.length}`
  );

  const segmentCentres = lungs.segments.map((segment) => ({
    id: segment.id,
    at: segment.position.clone().applyMatrix4(lungs.object.getObjectByName(`${segment.side}-lung`).matrixWorld),
  }));
  for (const tributary of tributaries) {
    const start = worldPointAt(tributary, 0);
    const sorted = segmentCentres
      .map((segment) => ({ id: segment.id, d: segment.at.distanceTo(start) }))
      .sort((a, b) => a.d - b.d);
    // The two nearest segments are near-equidistant: the tributary starts on
    // the plane between them, not on either one. A vein that ran with a
    // segment the way its artery does would fail this.
    const [first, second] = sorted;
    assert.ok(
      second.d - first.d < first.d * 0.5,
      `${tributary.name} starts ${first.d.toFixed(3)} from ${first.id} but ${second.d.toFixed(3)} from ${second.id}`
    );
  }

  // And two pulmonary veins leave each hilum.
  for (const side of ['right', 'left']) {
    assert.ok(veinNamed(`${side}-superior-pulmonary-vein`));
    assert.ok(veinNamed(`${side}-inferior-pulmonary-vein`));
  }
});

test('RALS: the artery is anterior on the right and superior on the left', () => {
  // The arrangement everybody is taught to check at the hilum, and the one a
  // mirrored scene gets wrong. Held here as geometry rather than as a comment.
  const right = lungs.hilum.right;
  const left = lungs.hilum.left;

  const rightForward = right.artery.z - right.bronchus.z;
  const rightUp = right.artery.y - right.bronchus.y;
  assert.ok(rightForward > 0.1, `the right artery is anterior to its bronchus, by ${rightForward.toFixed(2)}`);
  assert.ok(rightForward > Math.abs(rightUp) * 2, 'and anterior rather than superior');

  const leftUp = left.artery.y - left.bronchus.y;
  const leftForward = left.artery.z - left.bronchus.z;
  assert.ok(leftUp > 0.1, `the left artery is superior to its bronchus, by ${leftUp.toFixed(2)}`);
  assert.ok(leftUp > Math.abs(leftForward) * 2, 'and superior rather than anterior');

  // Both veins sit below the artery on either side.
  for (const hilum of [right, left]) {
    assert.ok(hilum.superiorVein.y < hilum.artery.y, 'the veins are the inferior structures');
    assert.ok(hilum.inferiorVein.y < hilum.superiorVein.y, 'and the inferior vein is the lower of the two');
  }
});

/* --------------------------------------------------------------------------
   The frame
   -------------------------------------------------------------------------- */

test('each lung is on its own side, and lateral means away from the midline', () => {
  const bounds = (side) => {
    const box = new THREE.Box3();
    for (const lobe of lungs.lobes.filter((lobe) => lobe.side === side)) {
      box.union(new THREE.Box3().setFromObject(lobe.mesh));
    }
    return box;
  };
  lungs.object.updateMatrixWorld(true);
  assert.equal(anatomicalSide(bounds('right').getCenter(new THREE.Vector3())), 'right');
  assert.equal(anatomicalSide(bounds('left').getCenter(new THREE.Vector3())), 'left');

  // The right lung is the larger: the heart takes its room out of the left.
  const volume = (box) => {
    const size = box.getSize(new THREE.Vector3());
    return size.x * size.y * size.z;
  };
  assert.ok(volume(bounds('right')) > volume(bounds('left')));

  // And `lateralX` points away from the midline on both sides, which is the one
  // place the sides differ and the reason nothing else has to.
  assert.equal(Math.sign(SIDES.right.lateralX), -1, 'the right lung reaches towards −x');
  assert.equal(Math.sign(SIDES.left.lateralX), 1);
});

test('the anatomical frame carries normals by the inverse of the scaling, not by it', () => {
  // A lung is twice as tall as it is wide, so the frame is an anisotropic
  // scaling, and under one of those a plane normal does not transform like a
  // point. Scaled like a point, the oblique fissure arrived at a different
  // angle from the one it was written at and the lobes summed to twice the lung
  // they were cut from.
  const bounds = new THREE.Box3(new THREE.Vector3(-1, -4, -1), new THREE.Vector3(1, 4, 1));
  const frame = anatomicalFrame('right', bounds);
  const normal = frame.toLocalNormal([0, 1, 1]);
  // Equal parts vertical and anterior in a frame stretched four times in y
  // comes out mostly anterior, because the normal is divided by the extents.
  assert.ok(normal.z > normal.y * 2, `expected the normal to tip anteriorly, got ${normal.toArray()}`);

  // A point, in the same frame, does the opposite.
  const point = frame.toLocal([0, 1, 1]);
  assert.ok(point.y > point.z * 2, 'a point stretches with the frame');
});

test('the airways and vessels breathe with the lung they are inside', () => {
  // Failure mode G: an overlay that does not follow its subject. The whole tree
  // used to sit in the top-level group with world positions baked in at the
  // rest pose, so inflating moved the parenchyma a quarter of a unit and left
  // every airway and vessel exactly where it was — in three scenes that animate
  // this every frame. Nothing in the suite noticed, because everything was
  // finite and every anatomical relation still held at rest.
  const built = buildLungs({ bronchi: true, vessels: true });
  const meshNamed = (name) => {
    let found = null;
    built.object.traverse((object) => {
      if (object.isMesh && object.name === name) found = object;
    });
    return found;
  };
  const worldEnd = (name, t) => {
    const branch = built.bronchi.branches.find((entry) => entry.name === name);
    const mesh = meshNamed(name);
    built.object.updateMatrixWorld(true);
    return branch.curve.getPointAt(t).clone().applyMatrix4(mesh.matrixWorld);
  };
  const lobeBase = () => {
    built.object.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(built.object.getObjectByName('right-lower')).min.y;
  };

  built.setInflation(0);
  const restBase = lobeBase();
  const restTip = worldEnd('RS9-segmental-bronchus', 1);

  built.setInflation(1);
  const fullBase = lobeBase();
  const fullTip = worldEnd('RS9-segmental-bronchus', 1);

  assert.ok(restBase - fullBase > 0.1, 'the lung has to actually move for this to be a test');
  assert.ok(
    restTip.y - fullTip.y > 0.1,
    `the segmental bronchus stayed at y ${fullTip.y.toFixed(3)} while its lung descended`
  );

  // And the extrapulmonary tree does not move, because the lung is tethered at
  // the hilum: the junction between the main bronchus and the lobar bronchi is
  // the one point that has to stay put.
  for (const inflation of [-0.4, 0, 0.5, 1]) {
    built.setInflation(inflation);
    const handover = worldEnd('right-main-bronchus', 1).distanceTo(
      worldEnd('right-lower-lobar-bronchus', 0)
    );
    assert.ok(handover < 1e-6, `main and lobar bronchi came apart by ${handover.toFixed(4)} at ${inflation}`);
  }
  built.dispose();
});

test('the lung still answers everything the older scenes ask it', () => {
  // The rebuild changed what a lung is made of. These are the calls three
  // existing scenes make, and none of them may break.
  const built = buildLungs({ color: '#d98d95', opacity: 0.8, excursion: 1.4 });
  assert.ok(built.object.isObject3D);
  assert.equal(built.regions.length, 12);
  assert.ok(built.anchors.rightLung && built.anchors.hilum);
  const before = built.baseY();
  built.setInflation(1);
  assert.ok(built.baseY() < before, 'inflating drops the bases');
  built.setInflation(0);
  assert.ok(Math.abs(built.baseY() - before) < 1e-9, 'and it comes back');
  built.setInflation(-0.4);
  assert.ok(Number.isFinite(built.baseY()));
  built.dispose();
});

test('segment colouring is a second reading of one unmoved mesh', () => {
  // The geometry may not move when the colouring changes: it is the same lung,
  // read a different way.
  const built = buildLungs({ bronchi: false, vessels: false });
  const before = built.lobes.map((lobe) => volumeOf(lobe.geometry));
  built.setSegmentColoring(true);
  assert.ok(built.lobes.every((lobe) => lobe.material.vertexColors));
  built.setSegmentColoring(false);
  assert.ok(built.lobes.every((lobe) => !lobe.material.vertexColors));
  const after = built.lobes.map((lobe) => volumeOf(lobe.geometry));
  assert.deepEqual(after, before, 'nothing moved');
  built.dispose();
});

test('each lobe really is star-shaped about the centre it was carved from', () => {
  // The assumption the whole carve rests on: from the centre, every direction
  // leaves the surface exactly once. `carve.js` says so in prose and exports a
  // check so the answer can be measured — this is the measurement. If it ever
  // fails, the lobe is not a solid the carve can describe and the fix is a
  // different centre, not a finer mesh.
  for (const lobe of lungs.lobes) {
    const { ok, failures } = starShaped(lobe.geometry, lobe.centre, { detail: 2 });
    assert.ok(
      ok,
      `${lobe.id}: ${failures.length} directions leave the surface other than once, ` +
        `first at ${failures[0]?.direction.toArray().map((v) => v.toFixed(2)).join(', ')} ` +
        `with ${failures[0]?.hits} crossings`
    );
  }
});

test('nothing intrapulmonary pokes through the pleura', () => {
  // The defect a rendered frame found and no unit test did. The hilum and the
  // segment centres were both written as fractions of the lung's extents, which
  // places a point on an ellipsoid rather than in a lung: seven of the eight
  // hilar structures and three of the eighteen segment centres fell outside the
  // surface, so twenty-one vessel and airway endpoints ended in mid-air, plainly
  // visible in the scene. Every test passed, because nothing asked where the
  // surface was.
  const outside = [];
  for (const tree of ['bronchi', 'arteries', 'veins']) {
    for (const branch of lungs[tree].branches) {
      const side = sideOfBranch(branch.name);
      if (!side || !isIntrapulmonary(branch, side)) continue;
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        if (!lungs.contains(side, branch.curve.getPointAt(t))) outside.push(`${branch.name}@${t}`);
      }
    }
  }
  assert.equal(outside.length, 0, `${outside.length} outside: ${outside.slice(0, 6).join(' ')}`);
});

test('every segment centre lies inside the lung it names a part of', () => {
  // It is also the seed of the segment partition, so one outside the surface
  // does not merely draw badly — it anchors a territory from outside the solid
  // it is dividing. The apical and posterior segments, where the lung tapers,
  // were the ones that fell out.
  for (const segment of lungs.segments) {
    assert.ok(
      lungs.contains(segment.side, segment.position),
      `${segment.id} sits outside its own lung at ${segment.position.toArray().map((v) => v.toFixed(2))}`
    );
  }
});

test('the hilum is on the mediastinal surface, not beyond it', () => {
  // What `HILUM.at` says it is: "where the structures cross the mediastinal
  // surface". Held as a measurement, because it was written as a fraction of
  // the extents and was not true.
  for (const side of ['right', 'left']) {
    const group = lungs.object.getObjectByName(`${side}-lung`);
    for (const key of ['bronchus', 'artery', 'superiorVein', 'inferiorVein']) {
      const local = lungs.hilum[side][key].clone().sub(group.position);
      assert.ok(lungs.contains(side, local), `the ${side} ${key} enters outside the lung`);
      // And on the surface rather than buried in the middle of it: a hilum
      // halfway to the centre would pass the test above and be nowhere near a
      // hilum. Asked without needing the field — a step further out along the
      // same ray has to leave the lung.
      const centre = lungCentre(side);
      const outward = local.clone().sub(centre);
      const step = local.clone().add(outward.clone().setLength(0.12));
      assert.ok(
        !lungs.contains(side, step),
        `the ${side} ${key} is still 0.12 inside the lung, so it is not at the surface`
      );
    }
  }
});

test('a lung that was not asked for a tree does not have one anywhere', () => {
  // Not "does not mount one". The intrapulmonary branches are parented to the
  // lungs so they breathe with them, so they are on screen the moment the lung
  // is — gating only the two top-level groups left every lobar and segmental
  // branch drawn. Three scenes build this lung and none of them wants a tree:
  // two of them build their own `buildAirway`, so a default-on tree gave them a
  // second trachea at a different position and colour, plus a pulmonary
  // vascular tree nothing in them models.
  const bare = buildLungs();
  assert.equal(bare.bronchi, null, 'a bare lung reports a bronchial tree');
  assert.equal(bare.arteries, null);
  assert.equal(bare.veins, null);

  const found = [];
  bare.object.traverse((object) => {
    if (object.isMesh && /trachea|bronchus|arter|vein/i.test(object.name)) found.push(object.name);
  });
  assert.deepEqual(found, [], `a bare lung drew ${found.length} airway or vessel meshes`);
  bare.dispose();

  // And one that asks for only the airways gets no vessels.
  const airwaysOnly = buildLungs({ bronchi: true });
  assert.ok(airwaysOnly.bronchi.branches.length > 20, 'the airways were asked for');
  const vessels = [];
  airwaysOnly.object.traverse((object) => {
    if (object.isMesh && /arter|vein/i.test(object.name)) vessels.push(object.name);
  });
  assert.deepEqual(vessels, [], `an airways-only lung drew ${vessels.length} vessels`);
  airwaysOnly.dispose();
});

test('no two venous tributaries are drawn in the same place', () => {
  // `(i + 1) % n` around a cycle gives one pair per segment for three or more,
  // and the *same* pair twice for two: the right middle lobe drew its single
  // tributary on top of itself. Two translucent tubes in one place composite to
  // something darker than either, which is how a duplicate reads on screen —
  // as a vessel of a different colour, not as a duplicate.
  const tributaries = lungs.veins.branches.filter((branch) => branch.name.includes('intersegmental'));
  for (let i = 0; i < tributaries.length; i++) {
    for (let j = i + 1; j < tributaries.length; j++) {
      const gap = worldPointAt(tributaries[i], 0).distanceTo(worldPointAt(tributaries[j], 0));
      assert.ok(gap > 1e-4, `${tributaries[i].name} and ${tributaries[j].name} start in the same place`);
    }
  }

  // And a lobe of n segments gets the n intersegmental planes it has — one when
  // there are only two segments, not two.
  for (const lobe of lungs.lobes) {
    const count = tributaries.filter((branch) => branch.name.startsWith(`${lobe.id}-`)).length;
    const segments = lungs.segments.filter((segment) => segment.lobe === lobe.id).length;
    assert.equal(count, segments === 2 ? 1 : segments, `${lobe.id} has ${segments} segments and ${count} tributaries`);
  }
});

/* --------------------------------------------------------------------------
   The two airway trees, and where they correspond
   -------------------------------------------------------------------------- */

test('the model tree and the anatomical tree agree about which lung is which', () => {
  // `docs/anatomy-specs.md` §1 A2 asks for this correspondence to live in one
  // place. The trap it exists for: the heap's `leftChild(0)` is index 1, and
  // index 1 supplies the patient's **right** lung. `leftChild` is heap
  // terminology and carries no anatomy, but the two files derived side
  // independently and nothing said so.
  //
  // Measured against the built tree rather than asserted, so flipping a spread
  // sign or swapping a rotation axis in `airwayTree.js` fails here instead of
  // quietly mirroring the lungs.
  const tree = buildAirwayTree({ generations: 8, drawnGenerations: 4 });
  const firstLeaf = 2 ** 7 - 1;
  const generationOf = (index) => Math.floor(Math.log2(index + 1));
  const leavesUnder = (root) => {
    const found = [];
    const stack = [root];
    while (stack.length) {
      const index = stack.pop();
      if (generationOf(index) === 7) {
        found.push(index);
        continue;
      }
      stack.push(2 * index + 1, 2 * index + 2);
    }
    return found;
  };

  for (const side of ['right', 'left']) {
    const root = MAIN_BRONCHUS_INDEX[side];
    const xs = leavesUnder(root).map((index) => tree.leafPositions[index - firstLeaf].x);
    const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length;
    const expected = lateralSignFor(side);
    assert.equal(
      Math.sign(mean),
      expected,
      `heap index ${root} is declared the ${side} lung but its leaves average x ${mean.toFixed(2)}`
    );
    // Entirely on that side, not merely on average: a subtree that straddled
    // the midline would average correctly and still be wrong.
    for (const x of xs) {
      assert.equal(Math.sign(x), expected, `a leaf under index ${root} sits at x ${x.toFixed(2)}`);
    }
  }
  tree.dispose?.();
});

test('the correspondence claims only the generations that can correspond', () => {
  // The declaration has to stop where the trees stop having the same shape,
  // and the numbers it stops on have to be the real ones.
  assert.deepEqual(Object.keys(NAMED_BRANCHES).map(Number), [0, 1, 2]);
  assert.equal(NAMED_BRANCHES[MAIN_BRONCHUS_INDEX.right], 'right-main-bronchus');
  assert.equal(NAMED_BRANCHES[MAIN_BRONCHUS_INDEX.left], 'left-main-bronchus');

  // Every name it claims is a branch the geometry actually builds.
  for (const name of Object.values(NAMED_BRANCHES)) {
    assert.ok(branchNamed(name), `the correspondence names "${name}", which the lung does not build`);
  }

  // And the counts it gives for where the mapping ends are the counts.
  const ends = WHERE_THE_CORRESPONDENCE_ENDS;
  assert.equal(ends.modelBranchesAtThatGeneration, 2 ** ends.generation);
  assert.equal(ends.anatomicalBranchesAtThatGeneration, LOBES.length);
  assert.equal(ends.atGenerationThree.model, 2 ** 3);
  assert.equal(ends.atGenerationThree.anatomical, SEGMENTS.length);
  assert.notEqual(
    ends.modelBranchesAtThatGeneration,
    ends.anatomicalBranchesAtThatGeneration,
    'if these ever match, the correspondence does not end here after all'
  );
});

test('every model branch has a side, and only the trachea has none', () => {
  const tracheaIndex = 0;
  assert.equal(sideOfModelBranch(tracheaIndex), null, 'the trachea belongs to neither lung');
  for (let index = 1; index < 2 ** 8 - 1; index++) {
    const side = sideOfModelBranch(index);
    assert.ok(side === 'right' || side === 'left', `index ${index} has no side`);
  }
  // A child is in the same lung as its parent, all the way down. This is the
  // half of the correspondence that does hold at every generation.
  for (let index = 1; index < 2 ** 7 - 1; index++) {
    const side = sideOfModelBranch(index);
    assert.equal(sideOfModelBranch(2 * index + 1), side, `index ${index}'s left child changed lung`);
    assert.equal(sideOfModelBranch(2 * index + 2), side, `index ${index}'s right child changed lung`);
  }
});

/* --------------------------------------------------------------------------
   The A1 relations `docs/anatomy-specs.md` §1 asks for by name
   -------------------------------------------------------------------------- */

test('the right lung is shorter, wider and larger than the left', () => {
  // Three relations the spec names, each asserted with a margin rather than as
  // an ordering. The height one was declared but only by 2.6%, which measured
  // 2.4% — the right direction by less than the noise in anything that touches
  // either lung. Real lungs differ by nearer 5–8%, the liver taking the room.
  const height = (side) => lungBox(side).getSize(new THREE.Vector3()).y;
  const width = (side) => lungBox(side).getSize(new THREE.Vector3()).x;

  const shorter = (height('left') - height('right')) / height('left');
  assert.ok(
    shorter > 0.04,
    `the right lung is only ${(shorter * 100).toFixed(1)}% shorter than the left`
  );
  assert.ok(width('right') > width('left') * 1.05, 'the right lung is not clearly the wider');

  const volumeOfSide = (side) =>
    lungs.lobes.filter((lobe) => lobe.side === side).reduce((sum, lobe) => sum + volumeOf(lobe.geometry), 0);
  assert.ok(volumeOfSide('right') > volumeOfSide('left') * 1.05, 'the right lung is not clearly the larger');
});

test('the right diaphragmatic surface sits higher than the left', () => {
  // Because the liver is under it. This had no number of its own: both lungs
  // were mounted at the same height, so the right base came out 0.028 above the
  // left — 1% — purely because the right lung was shorter. It is now `at.y`,
  // which is a fact about where the liver is rather than a by-product.
  const bases = { right: lungBox('right').min.y, left: lungBox('left').min.y };
  const lift = (bases.right - bases.left) / lungBox('right').getSize(new THREE.Vector3()).y;
  assert.ok(
    lift > 0.04,
    `the right base is only ${(lift * 100).toFixed(1)}% of a lung's height above the left`
  );

  // And the apices stay near enough level: the right lung is shorter *and*
  // higher, so it does not end up reaching further up the neck than the left.
  const apices = { right: lungBox('right').max.y, left: lungBox('left').max.y };
  assert.ok(
    Math.abs(apices.right - apices.left) < 0.12,
    `the apices are ${Math.abs(apices.right - apices.left).toFixed(2)} apart`
  );
});

test('the left hilum sits higher than the right', () => {
  // By roughly a vertebral level, which is the relation the spec names. Both
  // sides used to carry identical offsets, so the 0.032 that separated them was
  // arithmetic the claim did not depend on.
  const gap = lungs.hilum.left.bronchus.y - lungs.hilum.right.bronchus.y;
  const asFractionOfLung = gap / lungBox('left').getSize(new THREE.Vector3()).y;
  assert.ok(
    asFractionOfLung > 0.03,
    `the left hilum is only ${(asFractionOfLung * 100).toFixed(1)}% of a lung's height above the right`
  );

  // RALS is unaffected by the elevation, because the elevation moves the whole
  // hilum and RALS is written relative to it. Checked here as well as in its
  // own test, because that independence is the reason it is declared this way.
  assert.ok(lungs.hilum.left.artery.y > lungs.hilum.left.bronchus.y, 'left: artery superior to bronchus');
  assert.ok(lungs.hilum.right.artery.z > lungs.hilum.right.bronchus.z, 'right: artery anterior to bronchus');
});
