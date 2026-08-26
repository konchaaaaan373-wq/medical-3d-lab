import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildVentricleGeometry,
  updateVentricleGeometry,
  wallThicknessFactor,
  rvLobeMaxExtent,
  VENTRICLE_SHAPING,
} from '../src/scenes/heartFailure/geometry/ventricleGeometry.js';
import {
  sampleHemodynamics,
  myocardialVolumeFor,
  ventricleShape,
} from '../src/scenes/heartFailure/hemodynamics.js';
import { COMPARISON_OFFSET } from '../src/scenes/heartFailure/HeartFailureScene.js';
import { ANATOMY } from '../src/scenes/heartFailure/anatomy.js';

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

/** Radius about the (drifted) long axis for a lathe vertex at profile t. */
function radiusAboutAxis(kit, shape, k, i, t) {
  const v = vertexAt(kit, k, i);
  const w = (1 - t) * (1 - t);
  const dx = VENTRICLE_SHAPING.apexDriftX * shape.outerSemiLength * w;
  const dz = VENTRICLE_SHAPING.apexDriftZ * shape.outerSemiLength * w;
  return Math.hypot(v.x - dx, v.z - dz);
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
      assert.ok(
        ratio > 0.9 && ratio < 1.1,
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

test('the annulus stays on the valve plane', () => {
  const { kit } = buildAt(0.64);
  const { N, S, profileCount } = kit;
  for (let k = 0; k <= S; k += 6) {
    const outerRim = vertexAt(kit, k, N - 1);
    const innerRim = vertexAt(kit, k, N);
    assert.ok(Math.abs(outerRim.y - ANATOMY.baseY) < 1e-3, `outer rim off plane: ${outerRim.y}`);
    assert.ok(Math.abs(innerRim.y - ANATOMY.baseY) < 1e-3, `inner rim off plane: ${innerRim.y}`);
  }
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
  const before = vertexAt(kit, k, lowI);
  const rimBefore = vertexAt(kit, k, kit.N - 1);

  updateVentricleGeometry(kit, shape, { torsion: 0.2 });
  const after = vertexAt(kit, k, lowI);
  const rimAfter = vertexAt(kit, k, kit.N - 1);

  const angle = (v) => Math.atan2(v.x, v.z);
  const apexDelta = Math.abs(angle(after) - angle(before));
  const rimDelta = Math.abs(angle(rimAfter) - angle(rimBefore));
  assert.ok(apexDelta > 0.1, `apex must rotate under torsion (got ${apexDelta.toFixed(3)})`);
  assert.ok(rimDelta < 0.01, `base must not rotate under torsion (got ${rimDelta.toFixed(3)})`);
  assert.ok(positions.count > 0);
});
