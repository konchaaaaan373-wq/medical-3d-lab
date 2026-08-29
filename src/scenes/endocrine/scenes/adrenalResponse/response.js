/**
 * Adrenal response to a single acute stressor, as a function of time.
 *
 * PROTOTYPE-GRADE KINETICS. The two limbs of the response are modelled as
 * first-order compartments, in minutes. The point of the model is the *shape*
 * — one limb already falling before the other has begun to rise — and that
 * shape is a consequence of the structure below, not of curves drawn by hand.
 * The time constants are order-of-magnitude values, chosen to put the
 * landmarks roughly where the literature puts them (catecholamines peaking
 * within a couple of minutes, cortisol around fifteen to twenty, back near
 * rest by the hour). They are not fitted to measured data, and this is not a
 * pharmacokinetic model.
 *
 * The two limbs are separate on purpose, because they are separate:
 *
 * - **SAM** — sympathetic preganglionic fibres synapse directly on the
 *   chromaffin cells of the medulla. No intervening gland, so secretion
 *   follows the neural drive with no delay worth drawing, and the plasma
 *   level is governed by how fast catecholamines are cleared.
 * - **HPA** — hypothalamus, then pituitary, then cortex: three secretory
 *   steps in series. The lag in the cortisol curve is not written down
 *   anywhere below. It is what a chain of first-order steps does.
 *
 * No Three.js here, and nothing about how any of it is drawn: this file is
 * the medical statement and the scene is one reading of it.
 */

/** An acute stressor: present from t = 0, over by two minutes. */
export const STRESSOR_MINUTES = 2;

/** Resting drive, as a fraction of the stressor's. Neither limb is ever off. */
const BASAL_DRIVE = 0.06;

/** Clearance time constant for circulating catecholamines (minutes). */
const TAU_CATECHOLAMINE = 2;
/** Hypothalamic step (minutes). */
const TAU_CRH = 1.5;
/** Pituitary step (minutes). */
const TAU_ACTH = 6;
/** Cortical step, including cortisol's slower clearance (minutes). */
const TAU_CORTISOL = 22;

/** Total span of the scene's timeline, in minutes. */
export const TIMELINE_MINUTES = 90;

const SAMPLE_STEP = 1 / 240; // minutes; halving it moves no curve visibly

const drive = (minutes) => BASAL_DRIVE + (minutes >= 0 && minutes < STRESSOR_MINUTES ? 1 : 0);

/**
 * One integration from resting equilibrium across the whole timeline, done
 * once at load. The scene's control is a position on a timeline the learner
 * can drag in either direction, so the state has to be a function of the time
 * asked for and of nothing else; a stored trace gives that without
 * re-integrating on every frame.
 */
const TRACE = (() => {
  // Resting equilibrium: at t = 0 the gland is not starting from empty.
  let catecholamine = BASAL_DRIVE * TAU_CATECHOLAMINE;
  let crh = BASAL_DRIVE * TAU_CRH;
  let acth = BASAL_DRIVE * TAU_ACTH;
  let cortisol = BASAL_DRIVE * TAU_CORTISOL;

  const samples = [];
  const count = Math.round(TIMELINE_MINUTES / SAMPLE_STEP) + 1;
  for (let i = 0; i < count; i++) {
    samples.push({ catecholamine, acth, cortisol });
    const input = drive(i * SAMPLE_STEP);
    // Written out rather than looped: four lines that each name which gland is
    // handing to which are worth more here than a generic cascade solver.
    const dCatecholamine = input - catecholamine / TAU_CATECHOLAMINE;
    const dCrh = input - crh / TAU_CRH;
    const dActh = crh / TAU_CRH - acth / TAU_ACTH;
    const dCortisol = acth / TAU_ACTH - cortisol / TAU_CORTISOL;
    catecholamine += dCatecholamine * SAMPLE_STEP;
    crh += dCrh * SAMPLE_STEP;
    acth += dActh * SAMPLE_STEP;
    cortisol += dCortisol * SAMPLE_STEP;
  }
  return samples;
})();

/**
 * Each limb is scaled to its own peak in this response, because catecholamines
 * and cortisol are not in the same units and a shared axis would invite a
 * comparison the model cannot support. Taken from the trace rather than
 * written down, so that changing a time constant above cannot silently push a
 * curve off the top.
 *
 * The *resting* fraction of each peak is likewise an output, not a target: it
 * is what the same resting drive produces in compartments cleared at different
 * rates. It lands in a plausible place — a large fold rise in catecholamines
 * against a roughly two-fold rise in cortisol — but it is not calibrated, and
 * the scene does not put a number on it.
 */
const PEAK = TRACE.reduce(
  (best, sample) => ({
    catecholamine: Math.max(best.catecholamine, sample.catecholamine),
    acth: Math.max(best.acth, sample.acth),
    cortisol: Math.max(best.cortisol, sample.cortisol),
  }),
  { catecholamine: 0, acth: 0, cortisol: 0 }
);

/**
 * The response at a given time.
 *
 * @param {number} minutes time since the stressor began
 * @returns {{ minutes: number, catecholamine: number, acth: number, cortisol: number,
 *             neuralDrive: number, stressorPresent: boolean }}
 *   each level as a fraction of its own peak in this response — the three are
 *   *not* comparable with each other, and none of them is a concentration
 */
export function adrenalResponseAt(minutes) {
  const t = Math.min(TIMELINE_MINUTES, Math.max(0, minutes)) / SAMPLE_STEP;
  const index = Math.min(TRACE.length - 2, Math.floor(t));
  const f = t - index;
  const a = TRACE[index];
  const b = TRACE[index + 1];
  const at = (key) => (a[key] + (b[key] - a[key]) * f) / PEAK[key];
  return {
    minutes,
    catecholamine: at('catecholamine'),
    acth: at('acth'),
    cortisol: at('cortisol'),
    // The neural limb has no plasma step to smooth it: the drive itself is
    // what the medulla sees, and it stops when the stressor stops.
    neuralDrive: drive(minutes) / (1 + BASAL_DRIVE),
    stressorPresent: minutes >= 0 && minutes < STRESSOR_MINUTES,
  };
}

/**
 * Slider position to time. Cubic, so that the first minute — where the whole
 * point of the scene happens — gets a fifth of the track instead of a
 * hundredth, without cutting the timeline short of the hour cortisol takes to
 * come back down.
 *
 * @param {number} progress 0..1
 */
export const minutesAtProgress = (progress) => TIMELINE_MINUTES * progress ** 3;

/** The inverse, for placing stage markers at a chosen number of minutes. */
export const progressAtMinutes = (minutes) => (minutes / TIMELINE_MINUTES) ** (1 / 3);
