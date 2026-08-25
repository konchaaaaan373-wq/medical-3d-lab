import { CIRCULATION_KEYFRAMES, CIRCULATION_CONSTANTS, CONGESTION_PRESSURE } from '../../data/heartFailure.js';
import { clamp, lerp, smoothstep } from '../../utils/math.js';
import { solveSteadyState, volumeAtPhase } from './circulation.js';

/**
 * The bridge between the disease state and everything the scene draws.
 *
 * Its job used to be interpolating a table of volumes. It now interpolates
 * *mechanical* parameters, hands them to the circulation model, and reports the
 * beat that model settles into. Nothing here chooses an end-diastolic volume or
 * an ejection fraction; both are results.
 */

/** Scene units are centimetres, so 1 mL of blood is 1 cubic scene unit. */
const ML_PER_CUBIC_UNIT = 1;

/**
 * Myocardial density, g/mL. Used only to express the model's myocardial volume
 * as a mass for reference; it is NOT shown in the UI, because the chamber is a
 * truncated-ellipsoid approximation rather than an integrated ventricular
 * shape and would imply a precision the model does not have.
 */
export const MYOCARDIAL_DENSITY_G_PER_ML = 1.05;

/** Interpolates the mechanical keyframes. */
function sampleParameters(progress) {
  const p = clamp(progress);
  let lower = CIRCULATION_KEYFRAMES[0];
  let upper = CIRCULATION_KEYFRAMES[CIRCULATION_KEYFRAMES.length - 1];
  for (let i = 0; i < CIRCULATION_KEYFRAMES.length - 1; i++) {
    if (p >= CIRCULATION_KEYFRAMES[i].at && p <= CIRCULATION_KEYFRAMES[i + 1].at) {
      lower = CIRCULATION_KEYFRAMES[i];
      upper = CIRCULATION_KEYFRAMES[i + 1];
      break;
    }
  }
  const span = upper.at - lower.at;
  // Smoothstep rather than linear, so nothing shows a kink at a keyframe.
  const t = span > 0 ? smoothstep(0, 1, (p - lower.at) / span) : 0;
  const at = (key) => lerp(lower[key], upper[key], t);
  return {
    ees: at('ees'),
    v0: at('v0'),
    edpvrB: at('edpvrB'),
    systemicResistance: at('systemicResistance'),
    circulatingVolume: at('circulatingVolume'),
    hr: at('hr'),
    wallMm: at('wallMm'),
    longToShortAxisRatio: at('longToShortAxisRatio'),
  };
}

/**
 * Builds the full model input, applying the two exploratory multipliers.
 *
 * `preload` scales circulating volume and `afterload` scales systemic
 * resistance. They exist so the Frank-Starling and afterload relationships can
 * be felt directly; at 1 they change nothing.
 */
export function circulationParameters(progress, { preload = 1, afterload = 1 } = {}) {
  const s = sampleParameters(progress);
  return {
    heartRate: s.hr,
    circulatingVolume: s.circulatingVolume * preload,
    systemicResistance: s.systemicResistance * afterload,
    lv: { ees: s.ees, v0: s.v0, edpvrA: CIRCULATION_CONSTANTS.lvEdpvrA, edpvrB: s.edpvrB },
    rv: CIRCULATION_CONSTANTS.rightVentricle,
    la: CIRCULATION_CONSTANTS.leftAtrium,
    systemicArterialCompliance: CIRCULATION_CONSTANTS.systemicArterialCompliance,
    systemicVenousCompliance: CIRCULATION_CONSTANTS.systemicVenousCompliance,
    pulmonaryArterialCompliance: CIRCULATION_CONSTANTS.pulmonaryArterialCompliance,
    pulmonaryVenousCompliance: CIRCULATION_CONSTANTS.pulmonaryVenousCompliance,
    pulmonaryResistance: CIRCULATION_CONSTANTS.pulmonaryResistance,
    pulmonaryVenousResistance: CIRCULATION_CONSTANTS.pulmonaryVenousResistance,
    mitralResistance: CIRCULATION_CONSTANTS.mitralResistance,
    aorticResistance: CIRCULATION_CONSTANTS.aorticResistance,
    tricuspidResistance: CIRCULATION_CONSTANTS.tricuspidResistance,
    pulmonicResistance: CIRCULATION_CONSTANTS.pulmonicResistance,
    /** Carried through for the geometry, which the circulation does not touch. */
    wallMm: s.wallMm,
    longToShortAxisRatio: s.longToShortAxisRatio,
  };
}

/**
 * Solving takes a few milliseconds, and dragging the slider asks for a new
 * solution on every input event. Results are cached on a fine grid, and each
 * solve warm-starts from the last one, which cuts it to about two.
 */
const cache = new Map();
const CACHE_LIMIT = 512;
let lastVolumes = null;

function solutionFor(progress, options) {
  const key = `${Math.round(clamp(progress) * 400)}:${Math.round((options.preload ?? 1) * 100)}:${Math.round((options.afterload ?? 1) * 100)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const parameters = circulationParameters(progress, options);
  const solution = solveSteadyState(parameters, { warmStart: lastVolumes });
  lastVolumes = solution.volumes;

  const entry = { parameters, cycle: solution.cycle, beats: solution.beats };
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, entry);
  return entry;
}

/** Clears the solution cache. Only needed by tests. */
export function resetCirculationCache() {
  cache.clear();
  lastVolumes = null;
}

/**
 * The state of the circulation at a point on the progression.
 *
 * @param {number} progress 0..1
 * @param {{ preload?: number, afterload?: number }} [options]
 */
export function sampleHemodynamics(progress, options = {}) {
  const { parameters, cycle } = solutionFor(progress, options);
  const congestion = congestionFromPressure(cycle.meanPulmonaryVenousPressure);

  return {
    // --- solved haemodynamics
    edvMl: cycle.edv,
    esvMl: cycle.esv,
    strokeVolumeMl: cycle.strokeVolume,
    ejectionFraction: cycle.ejectionFraction,
    cardiacOutputLMin: cycle.cardiacOutput,
    hr: parameters.heartRate,
    endDiastolicPressureMmHg: cycle.endDiastolicPressure,
    meanArterialPressureMmHg: cycle.meanArterialPressure,
    systolicPressureMmHg: cycle.systolicArterialPressure,
    diastolicPressureMmHg: cycle.diastolicArterialPressure,
    meanAtrialPressureMmHg: cycle.meanAtrialPressure,
    meanPulmonaryVenousPressureMmHg: cycle.meanPulmonaryVenousPressure,
    meanPulmonaryArterialPressureMmHg: cycle.meanPulmonaryArterialPressure,
    ejectionStartPhase: cycle.ejectionStartPhase,
    ejectionEndPhase: cycle.ejectionEndPhase,
    endDiastolePhase: cycle.edvPhase,
    endSystolePhase: cycle.esvPhase,

    // --- mechanical parameters, for the read-out and the pressure-volume plot
    contractilityEes: parameters.lv.ees,
    unstressedVolumeMl: parameters.lv.v0,
    systemicResistance: parameters.systemicResistance,
    circulatingVolumeMl: parameters.circulatingVolume,

    // --- geometry inputs, which the circulation does not determine
    wallMm: parameters.wallMm,
    /**
     * Cavity long-axis to short-axis ratio used to build the geometry. It moves
     * in the same direction as the clinical sphericity index (a ventricle that
     * becomes rounder as it remodels) but it is a shape parameter of this model,
     * not a clinical measurement.
     */
    longToShortAxisRatio: parameters.longToShortAxisRatio,

    /**
     * How far the congestion overlay has spread, 0..1. Derived from the solved
     * mean pulmonary venous pressure against clinical landmarks — it is a
     * rendering quantity, not a physiological one.
     */
    congestionLevel: congestion.front,
    interstitialFluidLevel: congestion.fluid,

    /** The settled beat itself, for the pressure-volume loop and the animation. */
    cycle,
  };
}

/** Overlay spread and interstitial fluid from a mean pulmonary venous pressure. */
export function congestionFromPressure(meanPulmonaryVenousPressure) {
  const { frontFrom, frontTo, interstitialFluidFrom, interstitialFluidTo } = CONGESTION_PRESSURE;
  return {
    front: clamp((meanPulmonaryVenousPressure - frontFrom) / (frontTo - frontFrom)),
    fluid: smoothstep(interstitialFluidFrom, interstitialFluidTo, meanPulmonaryVenousPressure),
  };
}

/**
 * The pressure-volume loop for a state, together with the two relationships
 * that generate it.
 *
 * Nothing here is drawn to look like a textbook figure. The loop is the solved
 * beat plotted as LV pressure against LV volume; the end-systolic line is
 * P = Ees·(V - V0) and the end-diastolic curve is P = A·(exp(B·(V - V0)) - 1),
 * which are the same two equations the solver integrated. The loop touches them
 * because of that, not because it was fitted.
 *
 * @param {number} progress 0..1
 * @param {{ preload?: number, afterload?: number }} [options]
 */
export function pressureVolumeCurves(progress, options = {}) {
  const solution = solutionFor(progress, options);
  // The panel redraws every frame to move the marker around the loop, and the
  // curves do not change between those frames — so they are built once and kept
  // with the solution they came from.
  if (solution.curves) return solution.curves;
  const { parameters, cycle } = solution;
  const { trace } = cycle;

  const loop = trace.phase.map((phase, i) => ({
    phase,
    volume: trace.lvVolume[i],
    pressure: trace.lvPressure[i],
  }));

  const { ees, v0, edpvrA, edpvrB } = parameters.lv;
  const maxVolume = Math.max(...trace.lvVolume) * 1.08;
  const SAMPLES = 48;
  const endSystolic = [];
  const endDiastolic = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const volume = v0 + ((maxVolume - v0) * i) / SAMPLES;
    endSystolic.push({ volume, pressure: ees * (volume - v0) });
    endDiastolic.push({ volume, pressure: edpvrA * (Math.exp(edpvrB * (volume - v0)) - 1) });
  }

  solution.curves = {
    loop,
    endSystolic,
    endDiastolic,
    /** The corners the loop is usually read by. */
    markers: {
      endDiastole: { volume: cycle.edv, pressure: cycle.endDiastolicPressure },
      endSystole: { volume: cycle.esv, pressure: ees * (cycle.esv - v0) },
    },
    /** Pressure waveforms over the same beat, for the strip below the loop. */
    waveform: {
      phase: trace.phase.slice(),
      ventricular: trace.lvPressure.slice(),
      arterial: trace.aorticPressure.slice(),
      atrial: trace.atrialPressure.slice(),
    },
    contractilityEes: ees,
    unstressedVolumeMl: v0,
  };
  return solution.curves;
}

/**
 * Cavity volume at a point in the cardiac cycle.
 *
 * Read from the beat the circulation model settled into, so isovolumic periods,
 * the shape of ejection and the two phases of filling are all whatever the
 * mechanics produced rather than a curve chosen to look like a heartbeat.
 *
 * @param {number} phase 0..1 through the cycle
 */
export function cavityVolumeAt(phase, state) {
  return volumeAtPhase(state.cycle, phase);
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
 *   disease state -> ED cavity volume (solved) + ED wall thickness
 *                 -> myocardial volume FOR THAT STATE        <- changes between states
 *                 -> held constant through one cardiac cycle <- incompressibility
 *                 -> systolic wall thickening emerges geometrically
 *
 * Treating myocardium as incompressible is a reasonable assumption *within* a
 * beat. It would be wrong across disease states, where hypertrophy means real
 * growth of muscle — so myocardial volume is recomputed whenever the state
 * changes and only held fixed inside a cycle.
 *
 * Multiplying it by MYOCARDIAL_DENSITY_G_PER_ML gives a mass figure, but that
 * figure is a property of this ellipsoid approximation and must not be read as
 * a clinical echocardiographic LV mass measurement — which is why it is never
 * displayed.
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
    /** Wall thickness relative to cavity radius — rises with concentric hypertrophy. */
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
