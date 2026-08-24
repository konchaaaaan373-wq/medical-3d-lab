import { HEMODYNAMICS } from '../../data/heartFailure.js';
import { clamp, lerp, smoothstep } from '../../utils/math.js';

/** Fraction of the cardiac cycle spent ejecting. */
export const SYSTOLE_FRACTION = 0.34;

/** Scene units are centimetres, so 1 mL of blood is 1 cubic scene unit. */
const ML_PER_CUBIC_UNIT = 1;

/**
 * Myocardial density, g/mL. Used only to express the model's myocardial volume
 * as a mass for reference; it is NOT shown in the UI, because the chamber is a
 * truncated-ellipsoid approximation rather than an integrated ventricular
 * shape and would imply a precision the model does not have.
 */
export const MYOCARDIAL_DENSITY_G_PER_ML = 1.05;

/**
 * Interpolates the keyframes at a progression value.
 *
 * Because both EDV and ESV are interpolated with the same weight, stroke volume
 * interpolates linearly between the keyframe stroke volumes — so a monotonically
 * falling SV in the keyframes stays monotonic everywhere in between.
 *
 * @param {number} progress 0..1
 */
export function sampleHemodynamics(progress) {
  const p = clamp(progress);
  let lower = HEMODYNAMICS[0];
  let upper = HEMODYNAMICS[HEMODYNAMICS.length - 1];
  for (let i = 0; i < HEMODYNAMICS.length - 1; i++) {
    if (p >= HEMODYNAMICS[i].at && p <= HEMODYNAMICS[i + 1].at) {
      lower = HEMODYNAMICS[i];
      upper = HEMODYNAMICS[i + 1];
      break;
    }
  }
  // Smoothstep rather than linear, so the geometry shows no kink when the
  // slider passes a keyframe.
  const span = upper.at - lower.at;
  const t = span > 0 ? smoothstep(0, 1, (p - lower.at) / span) : 0;

  const edvMl = lerp(lower.edvMl, upper.edvMl, t);
  const esvMl = lerp(lower.esvMl, upper.esvMl, t);
  const strokeVolumeMl = edvMl - esvMl;
  const hr = lerp(lower.hr, upper.hr, t);

  return {
    edvMl,
    esvMl,
    strokeVolumeMl,
    ejectionFraction: strokeVolumeMl / edvMl,
    cardiacOutputLMin: (strokeVolumeMl * hr) / 1000,
    wallMm: lerp(lower.wallMm, upper.wallMm, t),
    hr,
    /** 0..1 model index of LV filling pressure. Not a pressure in mmHg. */
    fillingPressureIndex: lerp(lower.fillingPressureIndex, upper.fillingPressureIndex, t),
    /**
     * Cavity long-axis to short-axis ratio used to build the geometry. It moves
     * in the same direction as the clinical sphericity index (a ventricle that
     * becomes rounder as it remodels) but it is a shape parameter of this model,
     * not a clinical measurement.
     */
    longToShortAxisRatio: lerp(lower.longToShortAxisRatio, upper.longToShortAxisRatio, t),
  };
}

/**
 * Instantaneous cavity volume across one cardiac cycle.
 *
 * Ejection is a single smooth sweep; filling is deliberately biphasic — a rapid
 * early phase followed by a slower one — which is what makes the animation read
 * as a heartbeat rather than a sine wave.
 *
 * @param {number} phase 0..1 through the cycle
 */
export function cavityVolumeAt(phase, { edvMl, esvMl }) {
  if (phase < SYSTOLE_FRACTION) {
    const local = phase / SYSTOLE_FRACTION;
    return lerp(edvMl, esvMl, smoothstep(0, 1, local));
  }
  const local = (phase - SYSTOLE_FRACTION) / (1 - SYSTOLE_FRACTION);
  const rapid = smoothstep(0, 0.45, local) * 0.78;
  const slow = smoothstep(0.55, 1, local) * 0.22;
  return lerp(esvMl, edvMl, Math.min(1, rapid + slow));
}

/**
 * Cavity radius for a volume, treating the chamber as a prolate spheroid with
 * semi-axes (r, ratio·r, r): V = 4/3·π·ratio·r³.
 */
export function radiusForVolume(volumeMl, longToShortAxisRatio) {
  return Math.cbrt(volumeMl / ML_PER_CUBIC_UNIT / ((4 / 3) * Math.PI * longToShortAxisRatio));
}

/**
 * Myocardial volume implied by a disease state's end-diastolic geometry.
 *
 * This is the OUTER half of a deliberately two-layer model:
 *
 *   disease state -> ED cavity geometry + ED wall thickness
 *                 -> myocardial volume FOR THAT STATE        <- changes between states
 *                 -> held constant through one cardiac cycle <- incompressibility
 *                 -> systolic wall thickening emerges geometrically
 *
 * Treating myocardium as incompressible is a reasonable assumption *within* a
 * beat. It would be wrong across disease states, where hypertrophy means real
 * growth of muscle — so myocardial volume is recomputed whenever the state
 * changes and only held fixed inside a cycle.
 */
export function myocardialVolumeFor({ edvMl, wallMm, longToShortAxisRatio }) {
  const inner = radiusForVolume(edvMl, longToShortAxisRatio);
  const outer = inner + wallMm / 10; // mm -> cm (scene units)
  return (4 / 3) * Math.PI * longToShortAxisRatio * (outer ** 3 - inner ** 3);
}

/**
 * Chamber geometry for the current instant, with myocardial volume held fixed
 * across the beat (see `myocardialVolumeFor`).
 */
export function ventricleShape({ cavityVolumeMl, myocardialVolumeMl, longToShortAxisRatio }) {
  const cavityRadius = radiusForVolume(cavityVolumeMl, longToShortAxisRatio);
  const outerRadius = radiusForVolume(cavityVolumeMl + myocardialVolumeMl, longToShortAxisRatio);
  return {
    cavityRadius,
    outerRadius,
    cavitySemiLength: cavityRadius * longToShortAxisRatio,
    outerSemiLength: outerRadius * longToShortAxisRatio,
    wallThickness: outerRadius - cavityRadius,
    /** Wall thickness relative to cavity radius — rises with concentric remodelling. */
    relativeWallThickness: (outerRadius - cavityRadius) / cavityRadius,
  };
}

/**
 * Advances the position in the cardiac cycle.
 *
 * Kept here rather than inline in the scene so that it is covered by tests:
 * reading the wrong field off the state object silently produced NaN geometry
 * once, and a NaN that only shows up as a warning in the console is exactly the
 * kind of failure that reaches users.
 *
 * @param {number} phase current position, 0..1
 * @param {number} dt seconds elapsed
 * @param {number} hr heart rate, beats per minute
 */
export function advanceCardiacPhase(phase, dt, hr) {
  if (!Number.isFinite(phase) || !Number.isFinite(dt) || !Number.isFinite(hr) || hr <= 0) {
    throw new RangeError(`advanceCardiacPhase: bad input (phase=${phase}, dt=${dt}, hr=${hr})`);
  }
  const next = (phase + (dt * hr) / 60) % 1;
  return next < 0 ? next + 1 : next;
}

/**
 * Qualitative filling-pressure read-out.
 *
 * Shown as arrows rather than a number on purpose: the model has no way to
 * produce a defensible pressure in mmHg, and inventing one would be worse than
 * saying "raised".
 */
export function fillingPressureLabel(index) {
  if (index < 0.2) return { value: 'normal', valueJa: '正常範囲' };
  if (index < 0.5) return { value: 'slightly ↑', valueJa: 'やや上昇' };
  if (index < 0.8) return { value: '↑', valueJa: '上昇' };
  return { value: '↑↑', valueJa: '高度上昇' };
}
