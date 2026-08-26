import * as THREE from 'three';

/**
 * Anatomically-shaped left-ventricle shell geometry.
 *
 * The haemodynamic model still owns the *scale* of everything drawn: the four
 * inputs to `updateVentricleGeometry` (cavity radius/semi-length, outer
 * radius/semi-length) come straight out of `ventricleShape()` and are never
 * touched here. What this module adds is the *form* a real ventricle has and a
 * spheroid does not, as fixed fields in normalised coordinates:
 *
 *   - a profile that stays full near the base and tapers toward the apex,
 *     rather than a mathematically perfect ellipse
 *   - a flattened septal aspect (the wall the right ventricle sits against)
 *     and a slightly fuller lateral free wall
 *   - a wall-thickness field: thin at the apex, thickest at the septum and
 *     mid free wall — redistributing the myocardium the model solved for,
 *     not adding to it
 *   - a long axis that leans a few degrees, with the apex drifting laterally
 *   - low-amplitude surface irregularity, so no cross-section is a circle
 *   - an optional right-ventricular context lobe on the epicardial surface
 *   - systolic torsion (apex rotating against the base), applied per-vertex
 *
 * All shaping is deterministic and centred on 1, so the drawn cavity tracks
 * the solved cavity volume and the drawn wall tracks the solved wall
 * thickness within a few percent — asserted by tests/chamber-geometry.test.js.
 */

/** Shaping constants, in normalised units unless noted. */
export const VENTRICLE_SHAPING = {
  /** Exponent < 1 keeps the outer profile full near the base. */
  outerProfileExponent: 0.93,
  /** The cavity stays closer to the analytic spheroid than the outer wall. */
  cavityProfileExponent: 0.97,

  /** Direction of the septal / right-ventricular aspect, radians. -x side. */
  septalPhi: 4.75,
  /** Direction of the lateral free wall, radians. Roughly opposite. */
  lateralPhi: 1.75,

  /**
   * Radius multipliers: the septal aspect flattens mostly on the *cavity*
   * side (the D-shaped short-axis cross-section), leaving the outer wall
   * nearly round — which is exactly what makes the septum thick.
   */
  outerSeptalFlattening: 0.02,
  outerLateralFullness: 0.03,
  cavitySeptalFlattening: 0.05,
  cavityLateralFullness: 0.02,

  /** Wall thickness multipliers (mean stays near 1 — redistribution only). */
  apexThicknessFactor: 0.6,
  septalThicknessBoost: 0.22,
  lateralThicknessTrim: 0.05,

  /** Apex lateral drift as a fraction of the outer semi-length. */
  apexDriftX: 0.1,
  apexDriftZ: 0.035,

  /** Amplitude of the smooth surface irregularity, as a radius fraction. */
  epicardialNoise: 0.013,
  endocardialNoise: 0.008,

  /**
   * Right-ventricular context lobe: an epicardial bulge beside the septum.
   * Purely contextual — it has no cavity and no haemodynamics. Amplitude is a
   * fraction of the outer semi-length so both hearts keep their proportions.
   */
  rvLobeAmplitude: 0.085,
  rvLobePhiWidth: 1.05,

  /** Torsion falls off from apex (full) to base (none) with this exponent. */
  torsionFalloffExponent: 1.4,

  /**
   * The cut wedge closes toward the apex (fully sealed below this profile
   * fraction), so the cutaway ends above the tip instead of splitting it —
   * the way an illustrator's cutaway leaves the apex whole.
   */
  apexSealEnd: 0.34,

  /** The base shoulder rounds off slightly toward the atrioventricular groove. */
  rimTaper: 0.055,
  rimTaperStart: 0.75,
};

/** Largest lateral extent the RV lobe can add, in scene units, for tests. */
export function rvLobeMaxExtent(outerSemiLength) {
  return VENTRICLE_SHAPING.rvLobeAmplitude * outerSemiLength;
}

/** Raised-cosine bump centred on `centre` with the given half-width, radians. */
function angularBump(phi, centre, halfWidth) {
  let d = Math.abs(phi - centre) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  if (d >= halfWidth) return 0;
  return 0.5 * (1 + Math.cos((d / halfWidth) * Math.PI));
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Smooth, deterministic surface irregularity. Centred on 0, range ~±1. */
function surfaceNoise(t, phi) {
  return (
    0.55 * Math.sin(3.0 * phi + 1.7 + 2.1 * t) * Math.sin(2.4 * t * Math.PI + 0.6) +
    0.3 * Math.sin(5.3 * phi + 4.1 * t + 2.0) +
    0.15 * Math.sin(8.1 * phi - 3.1 * t + 0.9) * (1 - t)
  );
}

/** Wall-thickness multiplier field w(t, phi); t = 0 apex, 1 base. */
export function wallThicknessFactor(t, phi) {
  const S = VENTRICLE_SHAPING;
  const longitudinal = S.apexThicknessFactor + (1 - S.apexThicknessFactor) * smooth(0, 0.5, t);
  const angular =
    1 +
    S.septalThicknessBoost * angularBump(phi, S.septalPhi, 1.25) -
    S.lateralThicknessTrim * angularBump(phi, S.lateralPhi, 1.35);
  return longitudinal * angular;
}

/** Radius multiplier for the outer (epicardial) surface. */
function outerAngularShape(phi) {
  const S = VENTRICLE_SHAPING;
  return (
    1 -
    S.outerSeptalFlattening * angularBump(phi, S.septalPhi, 1.3) +
    S.outerLateralFullness * angularBump(phi, S.lateralPhi, 1.5)
  );
}

/** Radius multiplier for the cavity (endocardial) surface. */
function cavityAngularShape(phi) {
  const S = VENTRICLE_SHAPING;
  return (
    1 -
    S.cavitySeptalFlattening * angularBump(phi, S.septalPhi, 1.3) +
    S.cavityLateralFullness * angularBump(phi, S.lateralPhi, 1.5)
  );
}

/** RV context lobe height at (t, phi), as a fraction of outer semi-length. */
function rvLobe(t, phi) {
  const S = VENTRICLE_SHAPING;
  const alongAxis = smooth(0.1, 0.42, t) * (1 - smooth(0.7, 0.97, t));
  return S.rvLobeAmplitude * alongAxis * angularBump(phi, S.septalPhi, S.rvLobePhiWidth);
}

/**
 * Builds the ventricle shell: epicardial surface, endocardial surface, the
 * annulus at the valve plane, and two cut faces bounding the wedge — as one
 * indexed BufferGeometry with four groups:
 *
 *   0 epicardium   (material 0)
 *   1 annulus      (material 1 — cut myocardium)
 *   2 endocardium  (material 2)
 *   3 cut faces    (material 1 — cut myocardium)
 *
 * Positions are rewritten every frame by `updateVentricleGeometry`; index,
 * uv and color attributes are static.
 *
 * @param {{ profilePoints?: number, segments?: number, cutAngle?: number,
 *   flip?: boolean, contextLobe?: boolean }} options
 */
export function buildVentricleGeometry({
  profilePoints = 26,
  segments = 48,
  cutAngle = Math.PI * 0.55,
  flip = false,
  contextLobe = true,
} = {}) {
  const N = profilePoints;
  const S = segments;
  const profileCount = N * 2; // outer run apex->rim, inner run rim->apex
  const surfaceVerts = (S + 1) * profileCount;
  const capVerts = profileCount;
  const total = surfaceVerts + capVerts * 2;

  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);

  // Base azimuth of each lathe column: the wedge (±cutAngle/2 around +z) is
  // left out, so the surface runs from one cut plane around to the other.
  const phiStart = cutAngle / 2;
  const phiStep = (Math.PI * 2 - cutAngle) / S;
  const basePhi = new Float32Array(S + 1);
  for (let k = 0; k <= S; k++) basePhi[k] = phiStart + k * phiStep;

  // --- indices, ordered into contiguous material groups
  const epi = [];
  const annulus = [];
  const endo = [];
  const caps = [];
  for (let k = 0; k < S; k++) {
    for (let i = 0; i < profileCount - 1; i++) {
      const a = k * profileCount + i;
      const b = (k + 1) * profileCount + i;
      const quad = [a, b, a + 1, b, b + 1, a + 1];
      if (i < N - 1) epi.push(...quad);
      else if (i === N - 1) annulus.push(...quad);
      else endo.push(...quad);
    }
  }
  for (let c = 0; c < 2; c++) {
    const base = surfaceVerts + c * capVerts;
    for (let i = 0; i < N - 1; i++) {
      const outerA = base + i;
      const outerB = base + i + 1;
      const innerA = base + profileCount - 1 - i;
      const innerB = base + profileCount - 2 - i;
      // Wind the two faces opposite ways so both point out of the wedge.
      if (c === 0) caps.push(outerA, innerA, outerB, innerA, innerB, outerB);
      else caps.push(outerA, outerB, innerA, innerA, outerB, innerB);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([...epi, ...annulus, ...endo, ...caps]);
  let offset = 0;
  geometry.addGroup(offset, epi.length, 0);
  offset += epi.length;
  geometry.addGroup(offset, annulus.length, 1);
  offset += annulus.length;
  geometry.addGroup(offset, endo.length, 2);
  offset += endo.length;
  geometry.addGroup(offset, caps.length, 1);

  // --- static uvs
  // Lathe surface: u wraps with azimuth (three repeats keep texel density
  // reasonable), v runs apex (0) -> base (1) on both surfaces.
  for (let k = 0; k <= S; k++) {
    for (let i = 0; i < profileCount; i++) {
      const v = i < N ? i / (N - 1) : 1 - (i - N) / (N - 1);
      const idx = (k * profileCount + i) * 2;
      uvs[idx] = (basePhi[k] / (Math.PI * 2)) * 3;
      uvs[idx + 1] = v;
    }
  }
  // Cut faces: u runs apex -> base (so fibre striations drawn along u lie
  // parallel to the wall surfaces), v crosses the wall outer (0) -> inner (1).
  for (let c = 0; c < 2; c++) {
    const base = surfaceVerts + c * capVerts;
    for (let i = 0; i < profileCount; i++) {
      const idx = (base + i) * 2;
      uvs[idx] = i < N ? i / (N - 1) : 1 - (i - N) / (N - 1);
      uvs[idx + 1] = i < N ? 0 : 1;
    }
  }

  // --- static vertex tints
  // White nearly everywhere; the RV lobe cools and desaturates slightly so it
  // reads as a neighbouring chamber rather than more left ventricle, and the
  // cavity darkens toward the apex as cheap ambient occlusion.
  const rvTint = { r: 0.84, g: 0.87, b: 0.94 };
  for (let k = 0; k <= S; k++) {
    const phi = basePhi[k];
    for (let i = 0; i < profileCount; i++) {
      const idx = (k * profileCount + i) * 3;
      if (i < N) {
        const t = i / (N - 1);
        const lobe = contextLobe ? rvLobe(t, phi) / VENTRICLE_SHAPING.rvLobeAmplitude : 0;
        colors[idx] = 1 + (rvTint.r - 1) * lobe;
        colors[idx + 1] = 1 + (rvTint.g - 1) * lobe;
        colors[idx + 2] = 1 + (rvTint.b - 1) * lobe;
      } else {
        const t = 1 - (i - N) / (N - 1);
        const ao = 1 - 0.28 * (1 - smooth(0, 0.85, t));
        colors[idx] = ao;
        colors[idx + 1] = ao * 0.97;
        colors[idx + 2] = ao * 0.97;
      }
    }
  }
  for (let c = 0; c < 2; c++) {
    const base = surfaceVerts + c * capVerts;
    for (let i = 0; i < profileCount; i++) {
      const idx = (base + i) * 3;
      // Slightly darker toward the endocardial edge of the cut.
      const inner = i >= N ? 1 : 0;
      const shade = 1 - 0.12 * inner;
      colors[idx] = shade;
      colors[idx + 1] = shade;
      colors[idx + 2] = shade;
    }
  }

  return {
    geometry,
    N,
    S,
    profileCount,
    surfaceVerts,
    capVerts,
    basePhi,
    flip: flip ? -1 : 1,
    contextLobe,
  };
}

/**
 * Rewrites vertex positions for the current solved shape and motion state.
 *
 * @param {ReturnType<typeof buildVentricleGeometry>} kit
 * @param {{ cavityRadius: number, cavitySemiLength: number,
 *   outerRadius: number, outerSemiLength: number, baseY: number }} shape
 *   straight out of `ventricleShape()` — the model's scale, untouched
 * @param {{ torsion?: number }} [motion] systolic torsion at the apex, radians.
 *   Derived by the scene from the solved beat; 0 at end-diastole.
 */
export function updateVentricleGeometry(kit, shape, motion = {}) {
  const { cavityRadius, cavitySemiLength, outerRadius, outerSemiLength, baseY } = shape;
  const torsion = motion.torsion ?? 0;
  const { N, S, profileCount, basePhi, flip, contextLobe } = kit;
  const SH = VENTRICLE_SHAPING;

  const positions = kit.geometry.attributes.position.array;

  // Truncation angles: where each surface meets the valve plane.
  const outerMax = Math.acos(THREE.MathUtils.clamp(-baseY / outerSemiLength, -1, 1));
  const innerMax = Math.acos(THREE.MathUtils.clamp(-baseY / cavitySemiLength, -1, 1));

  // Per-profile-sample scalars that do not depend on azimuth.
  const tArr = new Float32Array(N);
  const rO = new Float32Array(N);
  const yO = new Float32Array(N);
  const rC = new Float32Array(N);
  const yC = new Float32Array(N);
  const driftW = new Float32Array(N);
  const twistW = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    tArr[i] = t;
    const aO = t * outerMax;
    const aC = t * innerMax;
    rO[i] = outerRadius * Math.pow(Math.sin(aO), SH.outerProfileExponent);
    yO[i] = -outerSemiLength * Math.cos(aO) * flip;
    rC[i] = cavityRadius * Math.pow(Math.sin(aC), SH.cavityProfileExponent);
    yC[i] = -cavitySemiLength * Math.cos(aC) * flip;
    const apexness = 1 - t;
    driftW[i] = apexness * apexness;
    twistW[i] = Math.pow(apexness, SH.torsionFalloffExponent);
  }
  const driftX = SH.apexDriftX * outerSemiLength;
  const driftZ = SH.apexDriftZ * outerSemiLength;

  // How far the wedge is open at each profile sample: sealed at the apex,
  // fully open by apexSealEnd. Azimuths are remapped about the far side (π)
  // so the two cut boundaries converge and close the tip.
  const spanScale = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const open = smooth(0.06, SH.apexSealEnd, tArr[i]);
    spanScale[i] = (Math.PI - basePhi[0] * open) / (Math.PI - basePhi[0]);
  }

  /**
   * Computes one paired sample of the wall at (t index i, azimuth phi):
   * cavity point and outer point, with the thickness field blended between
   * them so the myocardium is redistributed rather than resized.
   */
  const writePair = (i, phiBase, outIndex, inIndex) => {
    const t = tArr[i];
    const phi0 = Math.PI + (phiBase - Math.PI) * spanScale[i];
    const phi = phi0 + torsion * twistW[i];
    const sin = Math.sin(phi);
    const cos = Math.cos(phi);

    const cavR = rC[i] * cavityAngularShape(phi0) * (1 + SH.endocardialNoise * surfaceNoise(t, phi0 + 2.4));
    const cavY = yC[i];

    const w = wallThicknessFactor(t, phi0);
    const outAnalyticR = rO[i] * outerAngularShape(phi0);
    let outR = cavR + (outAnalyticR - cavR) * w;
    const outY = cavY + (yO[i] - cavY) * w;
    outR *= 1 + SH.epicardialNoise * surfaceNoise(t, phi0);
    // The shoulder rounds off toward the atrioventricular groove.
    outR *= 1 - SH.rimTaper * smooth(SH.rimTaperStart, 1, t);
    if (contextLobe) outR += rvLobe(t, phi0) * outerSemiLength;

    const dx = driftX * driftW[i];
    const dz = driftZ * driftW[i];

    if (outIndex >= 0) {
      positions[outIndex] = outR * sin + dx;
      positions[outIndex + 1] = outY;
      positions[outIndex + 2] = outR * cos + dz;
    }
    if (inIndex >= 0) {
      positions[inIndex] = cavR * sin + dx;
      positions[inIndex + 1] = cavY;
      positions[inIndex + 2] = cavR * cos + dz;
    }
  };

  // --- lathe surface
  for (let k = 0; k <= S; k++) {
    const phi0 = basePhi[k];
    const offset = k * profileCount * 3;
    for (let i = 0; i < N; i++) {
      writePair(i, phi0, offset + i * 3, offset + (profileCount - 1 - i) * 3);
    }
  }
  // --- cut faces, same math at the two bounding azimuths
  for (let c = 0; c < 2; c++) {
    const phi0 = c === 0 ? basePhi[0] : basePhi[S];
    const base = (kit.surfaceVerts + c * kit.capVerts) * 3;
    for (let i = 0; i < N; i++) {
      writePair(i, phi0, base + i * 3, base + (profileCount - 1 - i) * 3);
    }
  }

  kit.geometry.attributes.position.needsUpdate = true;
  kit.geometry.computeVertexNormals();
  kit.geometry.computeBoundingSphere();
}
