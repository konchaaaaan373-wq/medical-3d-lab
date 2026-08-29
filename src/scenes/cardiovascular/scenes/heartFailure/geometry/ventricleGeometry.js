import * as THREE from 'three';
import { lerp, smoothstep as smooth } from '../../../../../utils/math.js';

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
/**
 * How many of the lathe's three texture wraps survive at the apex. Low enough
 * that a texel there is roughly as wide as it is tall, which is what stops the
 * map from streaking radially off the pole.
 */
const APEX_UV_WRAP = 0.22;

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
  /**
   * Lateral drift of the apex, as a fraction of the outer semi-length. The
   * ventricle's long axis is oblique — the apex points to the anatomical left,
   * anteriorly and inferiorly — and this is what carries that.
   *
   * Raised from 0.13 for a reason worth recording, because the obvious fix was
   * the wrong one. Seen straight on, the ventricle read as a bucket: measured
   * off a render, its silhouette moved 30 pixels over the top 125 of its
   * height, which is two near-parallel sides under a flat basal rim. The
   * apparent remedy is to taper the body — widest at the base, narrowing to
   * the apex — and that was tried. It cannot be done here. The profile's
   * radius is set by the volume the circulation model solved, so a taper large
   * enough to change the silhouette walks the drawn cavity away from the
   * solved surface (21% at the magnitude that mattered), and a taper small
   * enough to be safe moved the edge by two pixels.
   *
   * Obliquity costs nothing, because a shear preserves volume exactly. It also
   * happens to be what actually distinguishes a ventricle from a bucket: not
   * how it tapers, but that its axis is not vertical.
   */
  apexDriftX: 0.22,
  apexDriftZ: 0.05,

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
  apexSealEnd: 0.3,

  /**
   * Trabeculae carneae: ridged muscle bundles protruding into the cavity,
   * concentrated apical-to-mid, irregular, and sparing the smooth outflow
   * tract — depth as a fraction of the local cavity radius.
   */
  trabecularDepth: 0.07,
  /** Azimuth of the (smooth) outflow tract region, radians. */
  lvotPhi: 1.27,

  /** A gentle bow of the long axis, so no meridian is a straight line. */
  longAxisBow: 0.032,

  /**
   * Basal shoulder: instead of ending on a flat plane, the epicardium rounds
   * over past the valve plane and closes toward a basal opening that follows
   * the cavity rim. shoulderStartT is where (in profile fraction) the outer
   * run leaves the ventricular body; the arc rises shoulderHeight (fraction
   * of the outer semi-length) from slightly below the plane (shoulderDip).
   */
  shoulderStartT: 0.78,
  shoulderHeight: 0.095,
  shoulderDip: 0.02,
  /** Radial gap between the basal opening and the cavity rim, scene units. */
  collarMargin: 0.16,

  /**
   * Organic cut boundary: each cut edge bows with a gentle, side-specific
   * S-curve instead of lying in a flat radial plane. Amplitudes in radians;
   * the warp fades into the surface over cutCurveFalloff of the columns.
   */
  cutCurveA: 0.1,
  cutCurveB: 0.045,
  cutCurveA2: 0.075,
  cutCurveB2: 0.03,
  cutCurveFalloff: 0.16,
};

/**
 * How firmly the apex is pinned in space across the beat, 0..1.
 *
 * A real ventricle contracts base-toward-apex: the apex barely moves while the
 * mitral annulus descends. The solved geometry gives the *amount* of long-axis
 * shortening; this constant only chooses where that shortening is anchored —
 * 1 would fix the apex exactly, 0 would fix the base.
 */
export const APEX_PINNING = 0.85;

/**
 * Peak apical torsion at a normal ejection fraction, radians (~12°).
 *
 * Torsion is real ventricular mechanics (the apex rotates against the base
 * through systole, and twist falls as systolic function falls), but the model
 * does not solve for it — it is presented at an illustrative amplitude scaled
 * by the solved beat: it rises with how far the stroke has emptied and shrinks
 * with the state's ejection fraction. See docs/medical-notes.md.
 */
export const TORSION_ILLUSTRATIVE_MAX = 0.21;

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

/** Smooth, deterministic surface irregularity. Centred on 0, range ~±1. */
function surfaceNoise(t, phi) {
  return (
    0.55 * Math.sin(3.0 * phi + 1.7 + 2.1 * t) * Math.sin(2.4 * t * Math.PI + 0.6) +
    0.3 * Math.sin(5.3 * phi + 4.1 * t + 2.0) +
    0.15 * Math.sin(8.1 * phi - 3.1 * t + 0.9) * (1 - t)
  );
}

/** How far the cut wedge is open at profile fraction t: 0 sealed, 1 fully. */
function sealOpenFraction(t) {
  return smooth(0.08, VENTRICLE_SHAPING.apexSealEnd, t);
}

/**
 * Azimuth remap that closes the wedge toward the apex: lathe columns are
 * spread about the far side (π) so the two cut boundaries converge at the
 * tip. Shared by the position update and the static uv layout, so the
 * texture never compresses where the surface closes.
 */
function sealSpanScale(t, halfCut) {
  const open = sealOpenFraction(t);
  return (Math.PI - halfCut * open) / (Math.PI - halfCut);
}

/**
 * Trabeculae carneae as an endocardial relief field, 0..1. Irregular ridges
 * running roughly along the long axis, strongest apical-to-mid, absent at
 * the base and over the smooth outflow tract.
 */
export function trabecularField(t, phi) {
  const S = VENTRICLE_SHAPING;
  // Started further from the apex than it was. Every azimuth converges on the
  // apex, so relief that is still at full strength close to it fans out into
  // radial streaks — the cavity read as combed hair rather than as muscle.
  const along = smooth(0.11, 0.27, t) * (1 - smooth(0.42, 0.7, t));
  if (along <= 0) return 0;
  const ridges = Math.pow(
    0.5 + 0.5 * Math.sin(9 * phi + 5.4 * t + 1.4 * Math.sin(2.3 * phi + 6.2 * t)),
    1.6
  );
  // Patchy coverage: bundles come and go around the circumference.
  const patchy = Math.max(0, 0.45 + 0.55 * Math.sin(3.7 * phi - 2.0 * t + 1.0));
  // And along the axis, so a bundle starts and stops instead of running the
  // whole apical half. Continuous bands are what made the fan read as combed;
  // real trabeculae are short, overlapping and staggered.
  const segmented = 0.34 + 0.66 * Math.max(0, Math.sin(13.5 * t + 2.6 * phi + 0.7 * Math.sin(5 * phi)));
  const lvot = 1 - angularBump(phi, S.lvotPhi, 1.0) * smooth(0.28, 0.5, t);
  return along * ridges * patchy * segmented * lvot;
}

/**
 * A point on the (analytic) endocardial surface, in chamber-local space —
 * shared with the valve apparatus so papillary muscles rise from the same
 * wall the mesh draws. Skips the noise and trabecular relief.
 *
 * @param {{ cavityRadius: number, cavitySemiLength: number,
 *   outerSemiLength: number, baseY: number }} shape
 * @param {number} t 0 apex .. 1 base
 * @param {number} phi azimuth
 * @param {THREE.Vector3} out
 */
export function cavitySurfacePoint(shape, t, phi, out) {
  const S = VENTRICLE_SHAPING;
  const innerMax = Math.acos(
    THREE.MathUtils.clamp(-shape.baseY / shape.cavitySemiLength, -1, 1)
  );
  const a = t * innerMax;
  const r = shape.cavityRadius * Math.pow(Math.sin(a), S.cavityProfileExponent) * cavityAngularShape(phi);
  const w = (1 - t) * (1 - t);
  const bow = Math.sin(Math.PI * t) * S.longAxisBow * shape.outerSemiLength;
  out.set(
    r * Math.sin(phi) + S.apexDriftX * shape.outerSemiLength * w + bow,
    -shape.cavitySemiLength * Math.cos(a),
    r * Math.cos(phi) + S.apexDriftZ * shape.outerSemiLength * w
  );
  return out;
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
  const alongAxis = smooth(0.1, 0.42, t) * (1 - smooth(0.58, 0.78, t));
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
  // reasonable), v runs apex (0) -> base (1) on both surfaces. u follows the
  // same apex-seal remap the positions use, so the texture stays uniform
  // where the wedge closes instead of compressing into stripes.
  //
  // The wrap count also falls off toward the apex, and that is not cosmetic.
  // The apex is a pole: circumference goes to zero while u still spans three
  // full repeats, so every texel there is squeezed azimuthally by a large
  // factor and stretched radially by the same. Any detail in the map — mottle,
  // grain, trabecular strokes alike — is drawn out into radial streaks, and
  // the cavity reads as combed hair converging on a point. Scaling the wrap
  // with the local circumference keeps texel density roughly even instead.
  // The lathe is an open strip (the cut wedge breaks the loop), so a
  // height-dependent wrap count introduces no seam.
  for (let k = 0; k <= S; k++) {
    for (let i = 0; i < profileCount; i++) {
      const v = i < N ? i / (N - 1) : 1 - (i - N) / (N - 1);
      const idx = (k * profileCount + i) * 2;
      const phiSealed = Math.PI + (basePhi[k] - Math.PI) * sealSpanScale(v, basePhi[0]);
      const wrap = 3 * lerp(APEX_UV_WRAP, 1, smooth(0, 0.42, v));
      uvs[idx] = (phiSealed / (Math.PI * 2)) * wrap;
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
    // Per-profile scratch, reused every frame instead of reallocated.
    scratch: {
      tArr: new Float32Array(N),
      rO: new Float32Array(N),
      yO: new Float32Array(N),
      rC: new Float32Array(N),
      yC: new Float32Array(N),
      driftW: new Float32Array(N),
      twistW: new Float32Array(N),
      spanScale: new Float32Array(N),
      shoulderArc: new Float32Array(N),
    },
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

  // Truncation angles. The cavity meets the valve plane; the epicardium runs
  // to just below it and then rounds over into the basal shoulder.
  const dip = SH.shoulderDip * outerSemiLength;
  const outerMax = Math.acos(THREE.MathUtils.clamp(-(baseY - dip) / outerSemiLength, -1, 1));
  const innerMax = Math.acos(THREE.MathUtils.clamp(-baseY / cavitySemiLength, -1, 1));
  const shoulderH = SH.shoulderHeight * outerSemiLength;
  const ts = SH.shoulderStartT;

  // Per-profile-sample scalars that do not depend on azimuth. For the
  // shoulder rows (t > ts), rO/yO hold the arc blend factors instead of a
  // radius: the final radius depends on the cavity rim at that azimuth.
  const { tArr, rO, yO, rC, yC, driftW, twistW, spanScale, shoulderArc } = kit.scratch;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    tArr[i] = t;
    const aC = t * innerMax;
    rC[i] = cavityRadius * Math.pow(Math.sin(aC), SH.cavityProfileExponent);
    yC[i] = -cavitySemiLength * Math.cos(aC) * flip;
    if (t <= ts) {
      shoulderArc[i] = -1;
      const aO = (t / ts) * outerMax;
      rO[i] = outerRadius * Math.pow(Math.sin(aO), SH.outerProfileExponent);
      yO[i] = -outerSemiLength * Math.cos(aO) * flip;
    } else {
      // Quarter-arc over the base: 0 at the groove, 1 at the basal opening.
      const arc = ((t - ts) / (1 - ts)) * (Math.PI / 2);
      shoulderArc[i] = 1 - Math.cos(arc); // radial closure, 0 -> 1
      rO[i] = outerRadius * Math.pow(Math.sin(outerMax), SH.outerProfileExponent);
      yO[i] = ((baseY - dip) + shoulderH * Math.sin(arc)) * flip;
    }
    const apexness = 1 - t;
    driftW[i] = apexness * apexness;
    twistW[i] = Math.pow(apexness, SH.torsionFalloffExponent);
  }
  const driftX = SH.apexDriftX * outerSemiLength;
  const driftZ = SH.apexDriftZ * outerSemiLength;
  const cavRim = cavityRadius * Math.sin(innerMax);

  // How far the wedge is open at each profile sample: sealed at the apex,
  // fully open by apexSealEnd. Azimuths are remapped about the far side (π)
  // so the two cut boundaries converge and close the tip.
  for (let i = 0; i < N; i++) {
    spanScale[i] = sealSpanScale(tArr[i], basePhi[0]);
  }

  /**
   * Computes one paired sample of the wall at (t index i, azimuth phi):
   * cavity point and outer point, with the thickness field blended between
   * them so the myocardium is redistributed rather than resized.
   */
  const writePair = (i, phiBase, edge0, edge1, outIndex, inIndex) => {
    const t = tArr[i];
    // The cut boundaries bow with side-specific S-curves rather than lying
    // in flat radial planes; the warp fades into the surface columns.
    const cutWarp =
      edge0 > 0
        ? edge0 * (SH.cutCurveA * Math.sin(Math.PI * t + 0.25) + SH.cutCurveB * Math.sin(2.2 * Math.PI * t + 1.1))
        : 0;
    const cutWarp1 =
      edge1 > 0
        ? -edge1 * (SH.cutCurveA2 * Math.sin(Math.PI * t + 0.55) + SH.cutCurveB2 * Math.sin(1.7 * Math.PI * t + 0.3))
        : 0;
    const phi0 = Math.PI + (phiBase - Math.PI) * spanScale[i] + (cutWarp + cutWarp1) * sealOpenFraction(t);
    const phi = phi0 + torsion * twistW[i];
    const sin = Math.sin(phi);
    const cos = Math.cos(phi);

    let cavR = rC[i] * cavityAngularShape(phi0) * (1 + SH.endocardialNoise * surfaceNoise(t, phi0 + 2.4));
    // Trabeculae protrude into the cavity: local inward relief, never a
    // change of the chamber's overall size.
    cavR *= 1 - SH.trabecularDepth * trabecularField(t, phi0);
    const cavY = yC[i];

    const w = wallThicknessFactor(t, phi0);
    let outR;
    let outY;
    if (shoulderArc[i] < 0) {
      const outAnalyticR = rO[i] * outerAngularShape(phi0);
      outR = cavR + (outAnalyticR - cavR) * w;
      outY = cavY + (yO[i] - cavY) * w;
    } else {
      // Basal shoulder: the epicardium arcs from the groove radius over and
      // inward toward the basal opening, which follows the cavity rim at
      // this azimuth. Height is analytic; the thickness field only modulates
      // the radial fullness of the shoulder, gently.
      const rTop = cavRim * cavityAngularShape(phi0) + SH.collarMargin;
      const rDip = rO[i] * outerAngularShape(phi0);
      const wSoft = 1 + (w - 1) * 0.45;
      outR = (rDip - (rDip - rTop) * shoulderArc[i]) * wSoft;
      outY = yO[i];
    }
    outR *= 1 + SH.epicardialNoise * surfaceNoise(t, phi0);
    if (contextLobe) outR += rvLobe(t, phi0) * outerSemiLength;

    // Lateral offset of the long axis: apex drift plus a gentle bow, so no
    // meridian is a mathematically straight line.
    const bow = Math.sin(Math.PI * Math.min(t, 1)) * SH.longAxisBow * outerSemiLength;
    const dx = driftX * driftW[i] + bow;
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
  const falloff = Math.max(1, S * SH.cutCurveFalloff);
  for (let k = 0; k <= S; k++) {
    const phi0 = basePhi[k];
    const e0 = Math.max(0, 1 - k / falloff) ** 2;
    const e1 = Math.max(0, 1 - (S - k) / falloff) ** 2;
    const offset = k * profileCount * 3;
    for (let i = 0; i < N; i++) {
      writePair(i, phi0, e0, e1, offset + i * 3, offset + (profileCount - 1 - i) * 3);
    }
  }
  // --- cut faces, same math at the two bounding azimuths
  for (let c = 0; c < 2; c++) {
    const phi0 = c === 0 ? basePhi[0] : basePhi[S];
    const base = (kit.surfaceVerts + c * kit.capVerts) * 3;
    for (let i = 0; i < N; i++) {
      const outIdx = base + i * 3;
      const inIdx = base + (profileCount - 1 - i) * 3;
      writePair(i, phi0, c === 0 ? 1 : 0, c === 1 ? 1 : 0, outIdx, inIdx);
      // Below the seal the two cap planes coincide; collapsing each sliver
      // to its outer edge removes the z-fighting seam up the closed apex.
      if (sealOpenFraction(tArr[i]) < 0.04) {
        positions[inIdx] = positions[outIdx];
        positions[inIdx + 1] = positions[outIdx + 1];
        positions[inIdx + 2] = positions[outIdx + 2];
      }
    }
  }

  kit.geometry.attributes.position.needsUpdate = true;
  kit.geometry.computeVertexNormals();

  // Where the wedge has closed, the first and last lathe columns coincide;
  // averaging their normals welds the shading across the seam so the sealed
  // apex reads as one continuous surface instead of a crease.
  const normals = kit.geometry.attributes.normal.array;
  for (let i = 0; i < N; i++) {
    if (sealOpenFraction(tArr[i]) > 0.45) continue;
    for (const idx of [i, profileCount - 1 - i]) {
      const a = idx * 3;
      const b = (S * profileCount + idx) * 3;
      const nx = normals[a] + normals[b];
      const ny = normals[a + 1] + normals[b + 1];
      const nz = normals[a + 2] + normals[b + 2];
      const len = Math.hypot(nx, ny, nz) || 1;
      normals[a] = normals[b] = nx / len;
      normals[a + 1] = normals[b + 1] = ny / len;
      normals[a + 2] = normals[b + 2] = nz / len;
    }
  }
  kit.geometry.attributes.normal.needsUpdate = true;
  kit.geometry.computeBoundingSphere();
}
