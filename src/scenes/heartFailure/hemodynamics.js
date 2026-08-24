import { HEMODYNAMICS } from '../../data/heartFailure.js';
import { clamp, lerp, smoothstep } from '../../utils/math.js';

/** Fraction of the cardiac cycle spent ejecting. */
export const SYSTOLE_FRACTION = 0.34;

/** Scene units are centimetres, so 1 mL of blood is 1 cubic unit. */
const VOLUME_PER_UNIT = 1;

/**
 * Interpolates the keyframes at a progression value.
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
  // Smoothstep rather than linear: the transitions between stages should not
  // show a visible kink when the slider passes a keyframe.
  const span = upper.at - lower.at;
  const t = span > 0 ? smoothstep(0, 1, (p - lower.at) / span) : 0;

  const edv = lerp(lower.edv, upper.edv, t);
  const esv = lerp(lower.esv, upper.esv, t);
  return {
    edv,
    esv,
    strokeVolume: edv - esv,
    ejectionFraction: (edv - esv) / edv,
    wall: lerp(lower.wall, upper.wall, t),
    heartRate: lerp(lower.hr, upper.hr, t),
    congestion: lerp(lower.congestion, upper.congestion, t),
    sphericity: lerp(lower.sphericity, upper.sphericity, t),
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
export function cavityVolumeAt(phase, { edv, esv }) {
  if (phase < SYSTOLE_FRACTION) {
    const local = phase / SYSTOLE_FRACTION;
    return lerp(edv, esv, smoothstep(0, 1, local));
  }
  const local = (phase - SYSTOLE_FRACTION) / (1 - SYSTOLE_FRACTION);
  const rapid = smoothstep(0, 0.45, local) * 0.78;
  const slow = smoothstep(0.55, 1, local) * 0.22;
  return lerp(esv, edv, Math.min(1, rapid + slow));
}

/**
 * Cavity radius for a volume, treating the chamber as a prolate spheroid with
 * semi-axes (r, sphericity·r, r): V = 4/3·π·sphericity·r³.
 */
export function radiusForVolume(volume, sphericity) {
  return Math.cbrt((volume / VOLUME_PER_UNIT) / ((4 / 3) * Math.PI * sphericity));
}

/**
 * Wall geometry for the current instant.
 *
 * Myocardium is close to incompressible, so muscle volume is held constant
 * across the cycle and the outer radius is solved from it. Wall thickening
 * during systole therefore falls out of the model instead of being animated by
 * hand — and hypertrophy vs. dilation reads correctly for free.
 */
export function ventricleShape({ cavityVolume, muscleVolume, sphericity }) {
  const cavityRadius = radiusForVolume(cavityVolume, sphericity);
  const outerRadius = radiusForVolume(cavityVolume + muscleVolume, sphericity);
  return {
    cavityRadius,
    outerRadius,
    cavitySemiLength: cavityRadius * sphericity,
    outerSemiLength: outerRadius * sphericity,
    wallThickness: outerRadius - cavityRadius,
  };
}

/** Muscle volume implied by an end-diastolic cavity and a wall thickness in mm. */
export function muscleVolumeFor({ edv, wall, sphericity }) {
  const inner = radiusForVolume(edv, sphericity);
  const outer = inner + wall / 10; // mm -> cm
  return (4 / 3) * Math.PI * sphericity * (outer ** 3 - inner ** 3);
}
