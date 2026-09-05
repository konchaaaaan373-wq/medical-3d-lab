import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildVentricleGeometry,
  updateVentricleGeometry,
  wallThicknessFactor,
  rvLobeMaxExtent,
  VENTRICLE_SHAPING,
} from '../src/scenes/cardiovascular/scenes/heartFailure/geometry/ventricleGeometry.js';
import { sampleHemodynamics } from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';
import { myocardialVolumeFor, ventricleShape } from '../src/models/cardiacMechanics.js';
import { COMPARISON_OFFSET } from '../src/scenes/cardiovascular/scenes/heartFailure/HeartFailureScene.js';
import { ANATOMY } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';

// ---------------------------------------------------------------------------
// The chamber mesh carries anatomical shaping (tapered profile, septal
// flattening, wall-thickness field, apex drift, surface noise) on top of the
// solved geometry. These tests pin down the contract that the shaping is
// *redistribution*, not resizing: the drawn cavity must track the solved
// cavity radius, the drawn wall must track the solved wall thickness, and the
// deliberate asymmetries must point the way the code claims they do.
// ---------------------------------------------------------------------------

function solvedShape(progress) {
  const state = sampleHemodynamics(progress);
  return ventricleShape({
    cavityVolumeMl: state.edvMl,
    myocardialVolumeMl: myocardialVolumeFor(state),
    longToShortAxisRatio: state.longToShortAxisRatio,
  });
}

function buildAt(progress) {
  const kit = buildVentricleGeometry({ profilePoints: 26, segments: 48 });
  const shape = solvedShape(progress);
  updateVentricleGeometry(kit, { ...shape, baseY: ANATOMY.baseY }, { torsion: 0 });
  return { kit, shape };
}

/** Position of lathe vertex (k, i) as {x, y, z}. */
function vertexAt(kit, k, i) {
  const idx = (k * kit.profileCount + i) * 3;
  const p = kit.geometry.attributes.position.array;
  return { x: p[idx], y: p[idx + 1], z: p[idx + 2] };
}

/** Radius about the (drifted, bowed) long axis for a lathe vertex at profile t. */
function axisOffset(shape, t) {
  const w = (1 - t) * (1 - t);
  return {
    dx:
      VENTRICLE_SHAPING.apexDriftX * shape.outerSemiLength * w +
      Math.sin(Math.PI * t) * VENTRICLE_SHAPING.longAxisBow * shape.outerSemiLength,
    dz: VENTRICLE_SHAPING.apexDriftZ * shape.outerSemiLength * w,
  };
}

function radiusAboutAxis(kit, shape, k, i, t) {
  const v = vertexAt(kit, k, i);
  const { dx, dz } = axisOffset(shape, t);
  return Math.hypot(v.x - dx, v.z - dz);
}

/**
 * Azimuth of a vertex about the ventricle's own long axis.
 *
 * The long axis is not the world axis: the apex drifts laterally and the body
 * bows, and both are translations applied after the azimuth is chosen. Measure
 * an angle about the world origin and it mixes that translation in with any
 * rotation, so a vertex near the apex — where the drift is largest — reports
 * less rotation than it actually has. Removing the offset first, the way
 * radiusAboutAxis already does for radius, measures the rotation itself.
 */
function angleAboutAxis(kit, shape, k, i, t) {
  const v = vertexAt(kit, k, i);
  const { dx, dz } = axisOffset(shape, t);
  return Math.atan2(v.x - dx, v.z - dz);
}

test('the drawn cavity tracks the solved cavity radius', () => {
  const { kit, shape } = buildAt(0);
  const { N, S, profileCount } = kit;
  const innerMax = Math.acos(-ANATOMY.baseY / shape.cavitySemiLength);

  let sum = 0;
  let count = 0;
  for (let k = 0; k <= S; k += 4) {
    for (let i = 6; i < N - 1; i += 3) {
      const t = i / (N - 1);
      const analytic =
        shape.cavityRadius *
        Math.pow(Math.sin(t * innerMax), VENTRICLE_SHAPING.cavityProfileExponent);
      const measured = radiusAboutAxis(kit, shape, k, profileCount - 1 - i, t);
      const ratio = measured / analytic;
      // Lower bound allows the trabecular relief, which protrudes into the
      // cavity by up to trabecularDepth of the local radius.
      assert.ok(
        ratio > 0.88 - VENTRICLE_SHAPING.trabecularDepth && ratio < 1.1,
        `cavity vertex strays from the solved surface: ratio ${ratio.toFixed(3)} at t=${t.toFixed(2)}`
      );
      sum += ratio;
      count++;
    }
  }
  const mean = sum / count;
  assert.ok(
    mean > 0.95 && mean < 1.06,
    `mean cavity radius must track the model: ${mean.toFixed(3)}`
  );
});

test('the wall-thickness field redistributes rather than resizes', () => {
  // The multiplier field must average close to 1 over the wall (excluding the
  // deliberately thinned apical tip), so myocardial volume stays the model's.
  let sum = 0;
  let count = 0;
  for (let ti = 0; ti <= 20; ti++) {
    const t = 0.12 + (ti / 20) * 0.88;
    for (let pi = 0; pi < 24; pi++) {
      sum += wallThicknessFactor(t, (pi / 24) * Math.PI * 2);
      count++;
    }
  }
  const mean = sum / count;
  assert.ok(mean > 0.85 && mean < 1.08, `thickness factor mean drifted: ${mean.toFixed(3)}`);
});

test('the wall is thickest at the septum and thinnest at the apex', () => {
  const { kit, shape } = buildAt(0);
  const { N, S, basePhi, profileCount } = kit;

  // Radial thickness: the gap between outer and cavity surfaces measured
  // about the long axis, which is what "wall thickness" means to the model.
  const radialWallAt = (k, i) => {
    const t = i / (N - 1);
    return (
      radiusAboutAxis(kit, shape, k, i, t) -
      radiusAboutAxis(kit, shape, k, profileCount - 1 - i, t)
    );
  };
  // Full separation of the paired surface points, for the apex where the
  // wall is mostly longitudinal.
  const wallAt = (k, i) => {
    const outer = vertexAt(kit, k, i);
    const inner = vertexAt(kit, k, profileCount - 1 - i);
    return Math.hypot(outer.x - inner.x, outer.y - inner.y, outer.z - inner.z);
  };

  const nearestColumn = (phi) => {
    let best = 0;
    for (let k = 0; k <= S; k++) {
      if (Math.abs(basePhi[k] - phi) < Math.abs(basePhi[best] - phi)) best = k;
    }
    return best;
  };

  const mid = Math.round(0.62 * (N - 1));
  const septalK = nearestColumn(VENTRICLE_SHAPING.septalPhi);
  const lateralK = nearestColumn(VENTRICLE_SHAPING.lateralPhi);

  const septal = radialWallAt(septalK, mid);
  const lateral = radialWallAt(lateralK, mid);
  assert.ok(
    septal > lateral * 1.1,
    `septal wall (${septal.toFixed(2)}) must be clearly thicker than lateral (${lateral.toFixed(2)})`
  );

  // Apical thinning: the wall near the apex is thinner than at mid-cavity.
  const apexI = Math.round(0.12 * (N - 1));
  const apex = wallAt(lateralK, apexI);
  const midFull = wallAt(lateralK, mid);
  assert.ok(
    apex < midFull * 0.95,
    `apical wall (${apex.toFixed(2)}) must be thinner than mid-wall (${midFull.toFixed(2)})`
  );

  // And the mid-wall itself must stay close to the solved thickness.
  const ratio = lateral / shape.wallThickness;
  assert.ok(
    ratio > 0.7 && ratio < 1.2,
    `mid free-wall thickness must track the model: ratio ${ratio.toFixed(2)}`
  );
});

test('the cavity rim stays on the valve plane and the shoulder closes above it', () => {
  const { kit, shape } = buildAt(0.64);
  const { N, S, profileCount } = kit;
  const shoulderTop =
    ANATOMY.baseY -
    VENTRICLE_SHAPING.shoulderDip * shape.outerSemiLength +
    VENTRICLE_SHAPING.shoulderHeight * shape.outerSemiLength;
  for (let k = 0; k <= S; k += 6) {
    const outerRim = vertexAt(kit, k, N - 1);
    const innerRim = vertexAt(kit, k, N);
    // The endocardial rim is the valve plane — where the annulus lives.
    assert.ok(Math.abs(innerRim.y - ANATOMY.baseY) < 1e-3, `inner rim off plane: ${innerRim.y}`);
    // The epicardium no longer stops on that plane: it rounds over it into
    // the basal shoulder, ending at the basal opening above.
    assert.ok(
      Math.abs(outerRim.y - shoulderTop) < 0.02,
      `basal opening off the shoulder top: ${outerRim.y} vs ${shoulderTop}`
    );
    // And the opening must clear the cavity rim, so the collar never overhangs
    // into the chamber.
    const rimR = Math.hypot(outerRim.x, outerRim.z);
    const cavR = Math.hypot(innerRim.x, innerRim.z);
    assert.ok(rimR > cavR, `basal opening (${rimR.toFixed(2)}) inside cavity rim (${cavR.toFixed(2)})`);
  }
  assert.ok(profileCount === N * 2);
});

test('the RV context lobe never closes the comparison gap', () => {
  // The analytic clearance test in hemodynamics.test.js knows nothing about
  // the epicardial lobe, so its margin is re-checked here with the lobe's
  // worst-case extent added on the side that faces the other heart.
  const SWEEP = Array.from({ length: 21 }, (_, i) => i / 20);
  const outerAt = (p) => {
    const shape = solvedShape(p);
    return (
      shape.outerRadius +
      rvLobeMaxExtent(shape.outerSemiLength) +
      // The septal thickness boost pushes the outer wall out under the lobe.
      VENTRICLE_SHAPING.septalThicknessBoost * shape.wallThickness
    );
  };
  const reference = outerAt(0);
  let widest = 0;
  for (const p of SWEEP) widest = Math.max(widest, outerAt(p));
  assert.ok(
    reference + widest < 2 * COMPARISON_OFFSET,
    `hearts would touch with the RV lobe: ${(reference + widest).toFixed(2)} >= ${2 * COMPARISON_OFFSET}`
  );
});

test('systolic torsion rotates the apex and leaves the base alone', () => {
  const kit = buildVentricleGeometry({ profilePoints: 26, segments: 48 });
  const shape = { ...solvedShape(0), baseY: ANATOMY.baseY };

  updateVentricleGeometry(kit, shape, { torsion: 0 });
  const positions = kit.geometry.attributes.position;
  const lowI = 3; // near the apex
  const k = Math.round(kit.S / 2);
  const lowT = lowI / (kit.N - 1);
  const rimT = 1;
  const before = angleAboutAxis(kit, shape, k, lowI, lowT);
  const rimBefore = angleAboutAxis(kit, shape, k, kit.N - 1, rimT);

  updateVentricleGeometry(kit, shape, { torsion: 0.2 });
  const after = angleAboutAxis(kit, shape, k, lowI, lowT);
  const rimAfter = angleAboutAxis(kit, shape, k, kit.N - 1, rimT);

  const apexDelta = Math.abs(after - before);
  const rimDelta = Math.abs(rimAfter - rimBefore);
  assert.ok(apexDelta > 0.1, `apex must rotate under torsion (got ${apexDelta.toFixed(3)})`);
  assert.ok(rimDelta < 0.01, `base must not rotate under torsion (got ${rimDelta.toFixed(3)})`);
  assert.ok(positions.count > 0);
});

test('a lathe with no wedge closes: its first and last columns meet', () => {
  // The cut boundaries bow with side-specific S-curves instead of lying in flat
  // radial planes, and the bow pulls both edges *away* from the wedge. Applied
  // to a lathe built with no wedge at all, it prised the two ends apart: on the
  // ischemia scene, which closes the wedge because it looks at the outside of
  // the heart, that was a 13-19 px slit straight down the middle of the
  // anterior wall with the background showing through it — widest at
  // mid-height, closing at the apex where the seal already damped the warp.
  //
  // The bow is capped by the wedge it shapes, so at `cutAngle` 0 there is none.
  const shape = { ...solvedShape(0.2), baseY: ANATOMY.baseY };
  const kit = buildVentricleGeometry({ profilePoints: 26, segments: 48, cutAngle: 0 });
  updateVentricleGeometry(kit, shape, { torsion: 0.05 });

  let worst = 0;
  let worstAt = null;
  for (let i = 0; i < kit.profileCount; i++) {
    const a = vertexAt(kit, 0, i);
    const b = vertexAt(kit, kit.S, i);
    const gap = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    if (gap > worst) {
      worst = gap;
      worstAt = `profile row ${i}`;
    }
  }
  // A tenth of the wall thickness. What is left is the azimuthal surface noise,
  // whose frequencies are not whole numbers and so do not repeat over 2π.
  assert.ok(
    worst < 0.1 * shape.wallThickness,
    `the seam closes: worst ${worst.toFixed(4)} at ${worstAt}, wall ${shape.wallThickness.toFixed(3)}`
  );
});

test('the wedge the heart-failure scene cuts keeps its bowed cut boundary', () => {
  // The cap on the bow must not quietly flatten the cut edges of the scene the
  // bow was written for: 99° of wedge against 0.25 rad of bow at its very
  // widest, so the cap is 1 and the boundary is untouched.
  const shape = { ...solvedShape(0.2), baseY: ANATOMY.baseY };
  const kit = buildVentricleGeometry({ profilePoints: 26, segments: 48, cutAngle: ANATOMY.cutAngle });
  updateVentricleGeometry(kit, shape, { torsion: 0 });

  // The first column's azimuth should wander with height rather than sitting at
  // one angle, which is what "not a flat radial plane" means.
  const angles = [];
  for (let i = 2; i < 26; i++) {
    const p = vertexAt(kit, 0, i);
    angles.push(Math.atan2(p.x, p.z));
  }
  const spread = Math.max(...angles) - Math.min(...angles);
  assert.ok(spread > 0.05, `the cut edge still bows: azimuth spread ${spread.toFixed(3)} rad`);
});
