import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { anatomicalSide, ANATOMY, ANATOMICAL_AXES } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import {
  buildVentricleGeometry,
  cavitySurfacePoint,
  epicardialSurfacePoint,
  updateVentricleGeometry,
  VENTRICLE_SHAPING,
} from '../src/scenes/cardiovascular/scenes/heartFailure/geometry/ventricleGeometry.js';
import { sampleHemodynamics } from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';
import { myocardialVolumeFor, ventricleShape } from '../src/models/cardiacMechanics.js';
import { buildCoronaryArteries, radiusAlong } from '../src/scenes/cardiovascular/organs/coronaryArteries.js';
import { ROOT_PROPORTIONS, buildAorticRoot } from '../src/scenes/cardiovascular/organs/aorticRoot.js';
import { MyocardialIschemiaScene } from '../src/scenes/cardiovascular/scenes/myocardialIschemia/MyocardialIschemiaScene.js';
import {
  AHA_SEGMENTS,
  AORTIC_SINUSES,
  CORONARY_BRANCHES,
  CORONARY_SINUSES,
  DOMINANCE,
  GROOVES,
  LATERAL_PHI,
  OSTIUM_OF,
  SEGMENTS_OF_TERRITORY,
  SEPTAL_PHI,
  TERRITORIES,
  dominantTerritoryAt,
  segmentAt,
  territoryWeightsAt,
} from '../src/scenes/cardiovascular/organs/coronaryAnatomy.js';

/**
 * The coronary arteries, checked as anatomy.
 *
 * Every assertion here is a fact about a heart, not about this repository's
 * numbers, and every one is stated in the units `docs/anatomy-specs.md` §2 A3-a
 * states it in: aortic root diameters for the origins, cardiac lengths for the
 * courses, and the vessel's own local radius for how it sits on the surface.
 * Those units are the point. A tolerance in scene units means nothing once the
 * ventricle dilates, and this ventricle dilates by design — it is a
 * heart-failure model.
 */

const ROOT = {
  centre: new THREE.Vector3(-1.13, 1.56, 0.32),
  radius: 0.95,
};
/** The aortic root diameter, which every origin tolerance is stated in. */
const D = ROOT.radius * 2;

function shapeAt(progress) {
  const state = sampleHemodynamics(progress);
  const shape = ventricleShape({
    cavityVolumeMl: state.edvMl,
    myocardialVolumeMl: myocardialVolumeFor({
      edvMl: state.edvMl,
      wallMm: state.wallMm,
      longToShortAxisRatio: state.longToShortAxisRatio,
    }),
    longToShortAxisRatio: state.longToShortAxisRatio,
  });
  shape.baseY = ANATOMY.baseY;
  return shape;
}

const shape = shapeAt(0);
/** The cardiac long axis, which every course tolerance is stated in. */
const L = shape.outerSemiLength + shape.baseY;

const tree = buildCoronaryArteries({ surfacePoint: epicardialSurfacePoint, shape, root: ROOT });
const branch = (id) => tree.branchById(id);

/** Points along a vessel, as fractions of its own length. */
function along(id, count = 40) {
  const curve = branch(id).curve;
  return Array.from({ length: count }, (_, i) => {
    const u = i / (count - 1);
    return { u, point: curve.getPoint(u) };
  });
}

/**
 * Where a point sits relative to the epicardium: which `(t, phi)` it is over,
 * and how far outside the surface it is.
 *
 * Searched rather than solved, because the surface is not analytically
 * invertible — it drifts, bows and is angularly shaped. A coarse grid followed
 * by two refinements gets well inside the tolerances below, and the residual is
 * reported so a test cannot mistake a bad search for a bad vessel.
 */
function projectToSurface(point) {
  const probe = new THREE.Vector3();
  let best = { t: 0, phi: 0, distance: Infinity };
  const scan = (t0, t1, p0, p1, steps) => {
    for (let i = 0; i <= steps; i++) {
      const t = t0 + ((t1 - t0) * i) / steps;
      for (let j = 0; j <= steps; j++) {
        const phi = p0 + ((p1 - p0) * j) / steps;
        epicardialSurfacePoint(shape, t, phi, probe);
        const d = probe.distanceTo(point);
        if (d < best.distance) best = { t, phi, distance: d };
      }
    }
  };
  scan(0, 1, 0, Math.PI * 2, 48);
  scan(Math.max(0, best.t - 0.03), Math.min(1, best.t + 0.03), best.phi - 0.14, best.phi + 0.14, 16);
  scan(Math.max(0, best.t - 0.004), Math.min(1, best.t + 0.004), best.phi - 0.02, best.phi + 0.02, 12);

  // Signed: positive outside the surface, negative sunk into muscle. The sign
  // comes from comparing against the long axis rather than from the search,
  // which only ever returns a magnitude.
  const surface = epicardialSurfacePoint(shape, best.t, best.phi, new THREE.Vector3());
  const axisAt = new THREE.Vector3(surface.x, point.y, surface.z);
  const outward = new THREE.Vector3(surface.x, 0, surface.z);
  const sign =
    outward.lengthSq() > 1e-9 &&
    new THREE.Vector3().subVectors(point, surface).dot(outward.normalize()) < 0
      ? -1
      : 1;
  return { ...best, signed: best.distance * sign, surface, axisAt };
}

/** The shortest angle between two azimuths. */
const angleGap = (a, b) =>
  Math.abs((((a - b + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI);

/**
 * How far a point is from a groove, in scene units.
 *
 * A groove is a path on the surface, so distance to it means distance to the
 * nearest point of that path — not to its midpoint, and not the angular gap,
 * which would be meaningless near the apex where the whole ring is small.
 */
function distanceToGroove(point, groove) {
  let best = Infinity;
  const probe = new THREE.Vector3();
  for (let i = 0; i <= 200; i++) {
    const u = i / 200;
    const t = groove.t !== undefined ? groove.t : groove.from + (groove.to - groove.from) * u;
    const phi =
      groove.phi !== undefined ? groove.phi : groove.phiFrom + (groove.phiTo - groove.phiFrom) * u;
    epicardialSurfacePoint(shape, t, phi, probe);
    best = Math.min(best, probe.distanceTo(point));
  }
  return best;
}

/* --------------------------------------------------------------------------
   The surface the vessels are laid on
   -------------------------------------------------------------------------- */

/** The ventricle's own mesh, and a way to read it at an exact place on it. */
function builtMesh() {
  const kit = buildVentricleGeometry({ cutAngle: 0.001 });
  updateVentricleGeometry(kit, shape, {});
  const position = kit.geometry.attributes.position;
  const TAU = Math.PI * 2;
  const wrap = (angle) => ((angle % TAU) + TAU) % TAU;
  const at = (column, row) =>
    new THREE.Vector3().fromBufferAttribute(position, column * kit.profileCount + row);

  // Bilinear over the lathe's own grid, so a point can be compared at the exact
  // `(t, phi)` it was placed at rather than at whichever vertex happens to be
  // nearest. Nearest-vertex was tried and measures the vertex spacing: it
  // reported vessels swinging between three radii inside the wall and three
  // outside it, sample to sample, on a tree that never left the surface.
  const surfaceAt = (t, phi) => {
    const row = Math.min(kit.N - 1, Math.max(0, t * (kit.N - 1)));
    const r0 = Math.floor(row);
    const r1 = Math.min(kit.N - 1, r0 + 1);
    const step = kit.basePhi[1] - kit.basePhi[0];
    const column = wrap(phi - kit.basePhi[0]) / step;
    const c0 = Math.min(kit.S, Math.floor(column));
    const c1 = Math.min(kit.S, c0 + 1);
    const a = at(c0, r0).lerp(at(c0, r1), row - r0);
    const b = at(c1, r0).lerp(at(c1, r1), row - r0);
    return a.lerp(b, column - c0);
  };
  return { kit, surfaceAt, dispose: () => kit.geometry.dispose() };
}

test('the analytic epicardium is the surface the mesh actually draws', () => {
  // This test has been wrong twice, in two different ways, and both are worth
  // recording because both passed while something was visibly broken.
  //
  // It was first named for the mesh and never touched it: it compared the
  // analytic epicardium against the analytic *cavity*. It passed while vessel
  // tips hung below the heart.
  //
  // It then read the mesh — along **one lathe column**. That cannot see an
  // angular effect, and the thing it could not see was the largest term out
  // here: the lathe puts the epicardium at the cavity plus the wall, with the
  // wall scaled by `wallThicknessFactor`, and adds the right ventricle on top
  // as a bulge about the septal aspect. Both are functions of azimuth. The
  // right coronary crosses the septum, so it was placed half a wall inside the
  // surface that gets drawn, and the single-column test agreed it was fine.
  //
  // So: every column, every row, below the shoulder.
  const { kit, dispose } = builtMesh();
  const position = kit.geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const analytic = new THREE.Vector3();

  let worst = 0;
  let worstAt = null;
  let worstAwayFromCut = 0;
  for (let column = 0; column <= kit.S; column++) {
    const phi = kit.basePhi[column];
    for (let row = 0; row < kit.N; row++) {
      const t = row / (kit.N - 1);
      if (t > VENTRICLE_SHAPING.shoulderStartT) continue; // the shoulder is out of range by design
      vertex.fromBufferAttribute(position, column * kit.profileCount + row);
      epicardialSurfacePoint(shape, t, phi, analytic);
      const gap = vertex.distanceTo(analytic);
      if (gap > worst) {
        worst = gap;
        worstAt = `t=${t.toFixed(2)}, phi=${phi.toFixed(2)}`;
      }
      // The two lathe columns either side of the cut are remapped to close the
      // apex, which this form does not carry; they are reported separately
      // rather than quietly excluded.
      const nearCut = column <= 1 || column >= kit.S - 1;
      if (!nearCut) worstAwayFromCut = Math.max(worstAwayFromCut, gap);
    }
  }

  assert.ok(
    worstAwayFromCut < 0.2 * shape.wallThickness,
    `analytic and mesh agree to a fifth of the wall away from the cut: worst ${worstAwayFromCut.toFixed(4)} ` +
      `against a wall of ${shape.wallThickness.toFixed(3)}`
  );
  assert.ok(
    worst < 0.35 * shape.wallThickness,
    `and to a third of it including the cut columns: worst ${worst.toFixed(4)} at ${worstAt}`
  );
  dispose();
});

test('no artery is buried in the mesh that is drawn', () => {
  // Measured at each sample's own place on the ventricle — the builder carries
  // it — so this is the vessel against the surface, not the vessel against a
  // search for the surface.
  const { surfaceAt, dispose } = builtMesh();
  let worst = Infinity;
  let worstAt = null;

  for (const spec of CORONARY_BRANCHES) {
    if (!spec.groove) continue; // the left main runs in none; it is not on the ventricle
    const record = branch(spec.id);
    const offset = record.points.length - record.where.length;
    record.where.forEach(({ u, t, phi }, i) => {
      const placed = record.points[offset + i];
      const radial = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
      const clearance =
        new THREE.Vector3().subVectors(placed, surfaceAt(t, phi)).dot(radial) / radiusAlong(spec, u);
      if (clearance < worst) {
        worst = clearance;
        worstAt = `${spec.id} at u=${u.toFixed(2)}`;
      }
    });
  }

  // The spec allows nothing sunk a whole radius. Measured, the worst is a
  // graze at the apical end of the anterior descending, where the vessel stops.
  assert.ok(worst > -0.25, `no artery is buried: worst clearance ${worst.toFixed(2)}r at ${worstAt}`);
  dispose();
});

test('the epicardium is outside the cavity everywhere', () => {
  const probe = new THREE.Vector3();
  const cavity = new THREE.Vector3();
  for (const t of [0.05, 0.2, 0.4, 0.6, 0.78]) {
    for (const phi of [0, 1.05, LATERAL_PHI, 2.6, Math.PI, 4.2, SEPTAL_PHI, 5.8]) {
      epicardialSurfacePoint(shape, t, phi, probe);
      cavitySurfacePoint(shape, t, phi, cavity);
      assert.ok(
        Number.isFinite(probe.x) && Number.isFinite(probe.y) && Number.isFinite(probe.z),
        `the epicardium is a real point at (t=${t}, phi=${phi})`
      );
      // Measured along the radial direction of that azimuth. The two surfaces
      // carry the same apex drift and long-axis bow, so those cancel exactly in
      // the difference — whereas near the apex, where both radii are small, the
      // shared drift is larger than either and a distance-from-the-axis
      // comparison is decided by it rather than by the wall.
      const radial = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
      const wall = new THREE.Vector3().subVectors(probe, cavity).dot(radial);
      assert.ok(wall > 0, `the epicardium is outside the cavity at (t=${t}, phi=${phi}): wall ${wall.toFixed(4)}`);
    }
  }
});

test('the azimuth means what the file says it means', () => {
  // Architecture rule 5: the axes are declared once and every direction is read
  // from them. This is that declaration, measured — phi 0 anterior, phi π/2 the
  // patient's left — because everything below is stated in phi and a convention
  // nobody checked is a convention that is wrong half the time.
  const probe = new THREE.Vector3();
  const centre = epicardialSurfacePoint(shape, 0.5, 0, new THREE.Vector3());
  const axis = new THREE.Vector3(0, centre.y, 0);

  epicardialSurfacePoint(shape, 0.5, 0, probe);
  assert.ok(probe.z - axis.z > 1, `phi 0 is anterior, got z=${probe.z.toFixed(2)}`);

  epicardialSurfacePoint(shape, 0.5, Math.PI / 2, probe);
  assert.equal(anatomicalSide(probe), 'left', 'phi π/2 is the patient’s left');

  epicardialSurfacePoint(shape, 0.5, SEPTAL_PHI, probe);
  assert.equal(anatomicalSide(probe), 'right', 'the septal aspect is the patient’s right');

  epicardialSurfacePoint(shape, 0.5, LATERAL_PHI, probe);
  assert.equal(anatomicalSide(probe), 'left', 'the lateral free wall is the patient’s left');

  // And the anterior axis really is +z, which the two above are stated against.
  assert.equal(ANATOMICAL_AXES.anterior.z, 1);
});

/* --------------------------------------------------------------------------
   Origins
   -------------------------------------------------------------------------- */

test('each artery starts from its own aortic sinus', () => {
  const rightSinus = new THREE.Vector3()
    .copy(ROOT.centre)
    .addScaledVector(new THREE.Vector3(...CORONARY_SINUSES.right.direction).normalize(), ROOT.radius);
  const leftSinus = new THREE.Vector3()
    .copy(ROOT.centre)
    .addScaledVector(new THREE.Vector3(...CORONARY_SINUSES.left.direction).normalize(), ROOT.radius);

  const rcaStart = branch('rca').curve.getPoint(0);
  const lmStart = branch('left-main').curve.getPoint(0);

  assert.ok(
    rcaStart.distanceTo(rightSinus) <= 0.15 * D,
    `the right coronary starts at the right sinus: ${(rcaStart.distanceTo(rightSinus) / D).toFixed(3)}D away`
  );
  assert.ok(
    lmStart.distanceTo(leftSinus) <= 0.15 * D,
    `the left main starts at the left sinus: ${(lmStart.distanceTo(leftSinus) / D).toFixed(3)}D away`
  );

  // And nearer its own sinus than the other's by a real margin, so the claim
  // survives a swap rather than holding by a rounding. This is the relation the
  // right main bronchus taught: a direction that is right by 0.7% is not being
  // asserted, it is being landed on.
  const rcaMargin = (rcaStart.distanceTo(leftSinus) - rcaStart.distanceTo(rightSinus)) / D;
  const lmMargin = (lmStart.distanceTo(rightSinus) - lmStart.distanceTo(leftSinus)) / D;
  assert.ok(rcaMargin >= 0.35, `the right coronary is nearer its own sinus by ${rcaMargin.toFixed(2)}D`);
  assert.ok(lmMargin >= 0.35, `the left main is nearer its own sinus by ${lmMargin.toFixed(2)}D`);

  // The sinuses sit either side of the aortic root — which is itself to the
  // right of the midline, so this is stated against the root and not against
  // the body. Written the other way first, and the left coronary sinus failed
  // for being at x < 0: true, and not what "left coronary sinus" means.
  assert.ok(
    leftSinus.x - rightSinus.x > 0.6 * D,
    `the left sinus is to the left of the right one by ${((leftSinus.x - rightSinus.x) / D).toFixed(2)}D`
  );
  assert.ok(leftSinus.x > ROOT.centre.x, 'the left sinus is left of the root’s centre');
  assert.ok(rightSinus.x < ROOT.centre.x, 'the right sinus is right of the root’s centre');
  assert.equal(OSTIUM_OF.rca, 'right');
  assert.equal(OSTIUM_OF.leftMain, 'left');
});

/* --------------------------------------------------------------------------
   Course
   -------------------------------------------------------------------------- */

test('each artery runs in the groove it is named for', () => {
  const cases = [
    ['lad', GROOVES.anteriorInterventricular, 0.08, 0.15],
    ['lcx', GROOVES.leftAtrioventricular, 0.08, 0.15],
    ['rca', GROOVES.rightAtrioventricular, 0.08, 0.15],
    ['pda', GROOVES.posteriorInterventricular, 0.1, 0.18],
  ];
  for (const [id, groove, typical, worst] of cases) {
    // The first samples of a trunk are still crossing from the aortic root to
    // its groove, which is a real part of the vessel and not part of the claim.
    const samples = along(id, 40).filter(({ u }) => (branch(id).ostium ? u > 0.2 : true));
    const distances = samples.map(({ point }) => distanceToGroove(point, groove) / L);
    const within = distances.filter((d) => d <= typical).length / distances.length;
    const furthest = Math.max(...distances);
    assert.ok(
      within >= 0.9,
      `${id}: ${(within * 100).toFixed(0)}% of samples are within ${typical}L of the ${groove.id} groove`
    );
    assert.ok(furthest <= worst, `${id}: furthest sample is ${furthest.toFixed(3)}L from its groove`);
  }
});

test('each artery is on the side of the heart it is named for', () => {
  // The failure this exists for was real and was invisible from both ends: the
  // right atrioventricular groove was written with its far azimuth a full turn
  // ahead, which lands on the same crux and sweeps the whole way round the
  // patient's LEFT. Start and end were both exactly right; the right coronary
  // ran along the circumflex. Only the middle of the vessel showed it.
  const midOf = (id) => branch(id).curve.getPoint(0.5);
  assert.equal(anatomicalSide(midOf('rca')), 'right', 'the right coronary runs on the right');
  assert.equal(anatomicalSide(midOf('lcx')), 'left', 'the circumflex runs on the left');
  assert.ok(midOf('lad').z > 1, `the anterior descending runs anteriorly, got z=${midOf('lad').z.toFixed(2)}`);
  assert.ok(midOf('pda').z < -1, `the posterior descending runs posteriorly, got z=${midOf('pda').z.toFixed(2)}`);

  // The two descending arteries are on opposite faces of the same heart, and
  // both reach the apex. Stated as a relation because either one alone can be
  // right while the pair is nonsense.
  assert.ok(
    midOf('lad').z - midOf('pda').z > 3,
    'the anterior and posterior descending arteries are on opposite faces'
  );
  for (const id of ['lad', 'pda']) {
    const end = branch(id).curve.getPoint(1);
    assert.ok(end.y < -0.5 * L, `${id} reaches the apical half, ending at y=${end.y.toFixed(2)}`);
  }
});

test('this is a right-dominant heart, and the posterior descending says so', () => {
  // Dominance *is* this one relation: which vessel gives rise to the posterior
  // descending. Everything else about a right-dominant and a left-dominant
  // heart looks the same at this level of detail.
  assert.equal(DOMINANCE, 'right');
  const pda = CORONARY_BRANCHES.find((b) => b.id === 'pda');
  assert.equal(pda.parent, 'rca', 'the posterior descending comes off the right coronary');

  // And it joins the parent it names, at the crux rather than anywhere else:
  // the join is nearer the right coronary's far end than its origin.
  const join = branch('pda').curve.getPoint(0);
  const rcaCurve = branch('rca').curve;
  assert.ok(
    join.distanceTo(rcaCurve.getPoint(1)) < join.distanceTo(rcaCurve.getPoint(0)),
    'the posterior descending leaves the right coronary near the crux'
  );
  assert.ok(join.z < 0, `the crux is posterior, got z=${join.z.toFixed(2)}`);
});

/* --------------------------------------------------------------------------
   How the vessels sit on the heart
   -------------------------------------------------------------------------- */

test('the arteries lie on the epicardium: not sunk, not floating, not through a chamber', () => {
  // The whole reason the builder takes a surface instead of owning one. Stated
  // in each vessel's own local radius, because a vessel that tapers to half its
  // calibre would otherwise be measured against the wrong yardstick along its
  // whole distal half.
  let inside = 0;
  let floating = 0;
  let onSurface = 0;
  let total = 0;
  let crossings = 0;
  const cavity = new THREE.Vector3();
  let worst = null;

  for (const spec of CORONARY_BRANCHES) {
    // The claim is about vessels that run in a groove, and the left main runs
    // in none — it crosses the space between the aortic root and the top of the
    // ventricle, behind the pulmonary trunk, and never lies on the ventricle at
    // all. Its own record says so (`groove: null`), so the exclusion is read
    // from the anatomy rather than from a list of exceptions here.
    if (!spec.groove) continue;
    const record = branch(spec.id);
    for (const { u, point } of along(spec.id, 30)) {
      // The proximal run of a trunk is still crossing from the aortic root and
      // is not on the ventricle yet — excluded by the spec, and named here
      // rather than silently skipped.
      if (record.ostium && u < 0.25) continue;
      const r = radiusAlong(spec, u);
      const projected = projectToSurface(point);
      total += 1;

      if (projected.signed < -r) {
        inside += 1;
        if (!worst) worst = `${spec.id} at u=${u.toFixed(2)} is ${(projected.signed / r).toFixed(2)}r inside`;
      } else if (projected.signed > 4 * r) {
        floating += 1;
        if (!worst) worst = `${spec.id} at u=${u.toFixed(2)} floats ${(projected.signed / r).toFixed(2)}r out`;
      }
      if (projected.signed >= 0 && projected.signed <= 2 * r) onSurface += 1;

      // Never through a chamber: at the same place on the ventricle, the
      // endocardium is nearer the axis than the vessel is.
      cavitySurfacePoint(shape, projected.t, projected.phi, cavity);
      const cavityRadius = Math.hypot(cavity.x, cavity.z);
      const vesselRadius = Math.hypot(point.x - 0, point.z - 0);
      if (vesselRadius + r < cavityRadius) crossings += 1;
    }
  }

  assert.ok(total > 100, `enough samples to mean something, got ${total}`);
  assert.equal(inside, 0, `no sample is sunk into myocardium — ${worst}`);
  assert.equal(floating, 0, `no sample floats off the heart — ${worst}`);
  assert.equal(crossings, 0, 'no sample lies inside a chamber');
  assert.ok(
    onSurface / total >= 0.95,
    `${((onSurface / total) * 100).toFixed(0)}% of samples sit within two radii of the surface`
  );
});

test('the vessels taper, and the taper is what the tolerances are measured in', () => {
  for (const spec of CORONARY_BRANCHES) {
    assert.ok(radiusAlong(spec, 0) > radiusAlong(spec, 1), `${spec.id} narrows distally`);
    assert.ok(radiusAlong(spec, 1) > 0, `${spec.id} has a real calibre at its far end`);
  }
  // The left main is the widest vessel and the posterior descending the
  // narrowest, which is the ordering a coronary tree has.
  const widest = [...CORONARY_BRANCHES].sort((a, b) => b.radius - a.radius)[0];
  const narrowest = [...CORONARY_BRANCHES].sort((a, b) => a.radius - b.radius)[0];
  assert.equal(widest.id, 'left-main');
  assert.equal(narrowest.id, 'pda');
});

test('the arteries stay on the heart as it dilates', () => {
  // The tolerances are stated in root diameters and cardiac lengths precisely so
  // that they survive the ventricle changing size — and this is a heart-failure
  // model, so it does. Checked at the far end of the progression, where the
  // chamber is largest and the wall thinnest.
  const dilated = shapeAt(1);
  const late = buildCoronaryArteries({
    surfacePoint: epicardialSurfacePoint,
    shape: dilated,
    root: ROOT,
  });
  const midRca = late.branchById('rca').curve.getPoint(0.5);
  const midLcx = late.branchById('lcx').curve.getPoint(0.5);
  assert.equal(anatomicalSide(midRca), 'right', 'the right coronary is still on the right');
  assert.equal(anatomicalSide(midLcx), 'left', 'the circumflex is still on the left');
  assert.ok(
    late.branchById('lad').curve.getPoint(1).y < dilated.baseY - dilated.outerSemiLength * 0.6,
    'the anterior descending still reaches the apex of the bigger heart'
  );
  late.dispose();
});

/* --------------------------------------------------------------------------
   Territories
   -------------------------------------------------------------------------- */

test('the AHA model has seventeen segments, numbered and named once', () => {
  assert.equal(AHA_SEGMENTS.length, 17);
  assert.deepEqual(
    AHA_SEGMENTS.map((s) => s.number),
    Array.from({ length: 17 }, (_, i) => i + 1)
  );
  for (const segment of AHA_SEGMENTS) {
    assert.ok(segment.label && segment.labelJa, `segment ${segment.number} is named in both languages`);
    assert.ok(TERRITORIES.includes(segment.territory), `segment ${segment.number} has a real territory`);
  }
  // The assignment the spec writes out, held here so a silent edit to the table
  // fails rather than quietly re-drawing every territory in the scene.
  assert.deepEqual(SEGMENTS_OF_TERRITORY.lad, [1, 2, 7, 8, 13, 14, 17]);
  assert.deepEqual(SEGMENTS_OF_TERRITORY.rca, [3, 4, 9, 10, 15]);
  assert.deepEqual(SEGMENTS_OF_TERRITORY.lcx, [5, 6, 11, 12, 16]);
});

test('the short-axis ring is the right way round', () => {
  // The six basal walls are laid out from the anterior axis, and the check that
  // they are laid out the right way is anatomical rather than arithmetic: the
  // two septal walls have to straddle the septum and the two lateral walls the
  // free wall. Off by one place in the ring, every territory would be rotated
  // sixty degrees and each segment would still have a plausible name.
  const wallPhi = (name) => AHA_SEGMENTS.find((s) => s.level === 'basal' && s.wall === name).phi;
  for (const wall of ['anteroseptal', 'inferoseptal']) {
    assert.ok(
      angleGap(wallPhi(wall), SEPTAL_PHI) < Math.PI / 3 + 1e-9,
      `the ${wall} wall is beside the septum`
    );
  }
  for (const wall of ['anterolateral', 'inferolateral']) {
    assert.ok(
      angleGap(wallPhi(wall), LATERAL_PHI) < Math.PI / 3 + 1e-9,
      `the ${wall} wall is beside the free wall`
    );
  }
  const probe = new THREE.Vector3();
  epicardialSurfacePoint(shape, 0.83, wallPhi('anterior'), probe);
  assert.ok(probe.z > 0, 'the anterior wall faces forward');
  epicardialSurfacePoint(shape, 0.83, wallPhi('inferior'), probe);
  assert.ok(probe.z < 0, 'the inferior wall faces back');
});

test('every point of myocardium belongs to exactly one territory, by weights that sum to one', () => {
  // Two claims the ischemia model depends on absolutely. The weights multiply
  // each territory's contractility, so weights that summed to anything else
  // would silently scale the whole ventricle's contraction — a bug that would
  // read as a physiological finding.
  let worstSum = 0;
  let checked = 0;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    for (let j = 0; j < 24; j++) {
      const phi = (j / 24) * Math.PI * 2;
      const w = territoryWeightsAt(t, phi);
      const sum = TERRITORIES.reduce((total, key) => total + w[key], 0);
      worstSum = Math.max(worstSum, Math.abs(sum - 1));
      const dominant = dominantTerritoryAt(t, phi);
      const ties = TERRITORIES.filter((key) => w[key] === w[dominant]).length;
      assert.equal(ties, 1, `exactly one territory dominates at (t=${t}, phi=${phi.toFixed(2)})`);
      checked += 1;
    }
  }
  assert.ok(checked > 400, `enough of the myocardium was checked, got ${checked}`);
  assert.ok(worstSum <= 1e-6, `weights sum to 1 within 1e-6, worst was ${worstSum}`);
});

test('each segment centre is supplied by the artery the chart assigns it to', () => {
  // The map, read at the seventeen places it is written for. If this and the
  // table above ever disagree, the scene will colour one thing and label
  // another — and both will look deliberate.
  for (const segment of AHA_SEGMENTS) {
    assert.equal(
      dominantTerritoryAt(segment.t, segment.phi),
      segment.territory,
      `segment ${segment.number} (${segment.label}) is ${segment.territory} territory`
    );
    assert.equal(segmentAt(segment.t, segment.phi).number, segment.number, `and is its own nearest segment`);
  }
});

test('the anterior descending supplies the front and the septum, not the inferior wall', () => {
  // The relation an ischemia scene lives or dies by: an anterior-descending
  // occlusion has to discolour the anterior wall and the septum. Getting the
  // ring rotated would put the discolouration on the inferior wall and every
  // other test here would still pass.
  const anterior = AHA_SEGMENTS.find((s) => s.number === 7);
  const inferior = AHA_SEGMENTS.find((s) => s.number === 10);
  const lateral = AHA_SEGMENTS.find((s) => s.number === 11);

  assert.equal(dominantTerritoryAt(anterior.t, anterior.phi), 'lad');
  assert.equal(dominantTerritoryAt(inferior.t, inferior.phi), 'rca');
  assert.equal(dominantTerritoryAt(lateral.t, lateral.phi), 'lcx');

  // And the anterior descending's own share is far higher over the anterior
  // wall than over the inferior one — a margin, not an ordering that holds by a
  // rounding.
  const overAnterior = territoryWeightsAt(anterior.t, anterior.phi).lad;
  const overInferior = territoryWeightsAt(inferior.t, inferior.phi).lad;
  assert.ok(
    overAnterior - overInferior > 0.5,
    `the anterior descending supplies the front (${overAnterior.toFixed(2)}) far more than the inferior wall (${overInferior.toFixed(2)})`
  );

  // The vessel is where its territory is: the anterior descending runs over the
  // segments it supplies, which is the link between the geometry and the map.
  for (const { point } of along('lad', 12).slice(3)) {
    const projected = projectToSurface(point);
    const weights = territoryWeightsAt(projected.t, projected.phi);
    assert.ok(
      weights.lad >= weights.rca && weights.lad >= weights.lcx,
      `the anterior descending runs over its own territory at t=${projected.t.toFixed(2)}`
    );
  }
});

test('the territory map is a convention, and the file says where it is wrong', () => {
  // Required by the spec and by product-principles §7. A fixed territory
  // assignment disagrees with measurement — segment 3 is charted to the right
  // coronary and measures as anterior-descending territory — and a model that
  // shows one without recording the other is claiming more than it has.
  const source = new URL('../src/scenes/cardiovascular/organs/coronaryAnatomy.js', import.meta.url);
  const text = readFileSync(source, 'utf8');
  assert.match(text, /segment 3/i, 'the file names the segment the chart gets wrong');
  assert.match(text, /Cerqueira/, 'and cites where the chart comes from');
  assert.match(text, /vari(es|ation)/i, 'and says the anatomy varies between people');
});

// ---------------------------------------------------------------------------
// The aortic root the arteries leave from.
//
// It was not drawn at all. `buildCoronaryArteries` took a root as
// `{ centre, radius }` and put each ostium on it, and nothing rendered that
// root — so in every frame the two coronary trunks began in mid-air above the
// ventricle. The scene's subject is a narrowing *in* one of those arteries, and
// a reader could see where they went but not where they came from.
// ---------------------------------------------------------------------------

test('each coronary ostium sits on the root that is actually drawn', () => {
  // The relation the whole file is written around, one level up: the ostium is
  // derived from the sinus and the root, and the root is drawn from the same
  // two, so they cannot come apart. Measured against the built mesh rather than
  // against the formula, because agreeing with itself is not the claim.
  const centre = new THREE.Vector3(-1.13, 2.6, 0.32);
  const radius = 0.95;
  const root = buildAorticRoot({ centre, radius });
  const arteries = buildCoronaryArteries({
    surfacePoint: epicardialSurfacePoint,
    shape: shapeAt(0.2),
    root: { centre, radius },
  });

  const position = root.mesh.geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const nearestVertex = (point) => {
    let best = Infinity;
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      best = Math.min(best, vertex.distanceTo(point));
    }
    return best;
  };

  for (const id of ['rca', 'left-main']) {
    const ostium = arteries.branchById(id).points[0];
    const gap = nearestVertex(ostium);
    assert.ok(
      gap < 0.06 * radius,
      `the ${id} ostium is on the root's wall: ${gap.toFixed(3)} from the nearest drawn vertex`
    );
  }
  root.dispose();
  arteries.dispose();
});

test('the root bulges at its sinuses and is pinched at the commissures', () => {
  // A root drawn as a plain cylinder is a tube, not a root. What makes it one
  // is three swellings with the ostia in two of them — and the pinch between
  // them, which a sum of three lobes would fill in instead of leaving.
  const root = buildAorticRoot({ centre: new THREE.Vector3(0, 0, 0), radius: 1 });
  const azimuthOf = (sinus) => Math.atan2(sinus.direction[0], sinus.direction[2]);

  for (const sinus of AORTIC_SINUSES) {
    const phi = azimuthOf(sinus);
    const widest = root.radiusAt(phi, ROOT_PROPORTIONS.bulgeAt);
    assert.ok(widest > 1.15, `${sinus.id} swells past the nominal radius: ${widest.toFixed(3)}`);
    assert.ok(
      Math.abs(root.radiusAt(phi, 1) - 1) < 1e-9,
      `${sinus.id} is back at the nominal radius by the sinotubular junction`
    );
  }

  const [a, b] = AORTIC_SINUSES.map(azimuthOf);
  const commissure = (a + b) / 2;
  assert.ok(
    Math.abs(root.radiusAt(commissure, ROOT_PROPORTIONS.bulgeAt) - 1) < 1e-9,
    'the commissure between two sinuses does not swell'
  );
  root.dispose();
});

test('the root stands on the valve plane and rises out of the ventricle', () => {
  // The centre was a typed triple that put the sinotubular junction *below* the
  // ventricle's own shoulder. Nothing noticed, because nothing drew the root —
  // the coordinate stayed perfectly valid while its meaning had moved.
  const scene = new MyocardialIschemiaScene({});
  scene.build();
  scene.setProgress(0.05);
  scene.phase = 0.999;
  scene.applyModelToScene();

  const ventricle = new THREE.Box3().setFromObject(scene.myocardium);
  const drawn = new THREE.Box3().setFromObject(scene.aorticRoot.object);

  assert.ok(
    Math.abs(scene.aorticRoot.annulusY - ANATOMY.baseY) < 1e-6,
    `the annulus sits on the valve plane: ${scene.aorticRoot.annulusY} against ${ANATOMY.baseY}`
  );
  assert.ok(
    scene.aorticRoot.junctionY > scene.aorticRoot.annulusY,
    'and the sinotubular junction is above it'
  );
  assert.ok(
    drawn.max.y > ventricle.max.y + 0.5,
    `the root clears the ventricle's shoulder: ${drawn.max.y.toFixed(2)} against ${ventricle.max.y.toFixed(2)}`
  );
  scene.dispose();
});
