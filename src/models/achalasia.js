/**
 * A swallow that does not get through, and what the oesophagus does about it.
 *
 * Two things have to happen for a swallow to arrive: a wave has to carry the
 * bolus down, and the ring of muscle at the bottom has to let go. Achalasia is
 * the loss of both — and the reason it is worth a 3D scene is that the two
 * failures are **visible and different**, one along the tube and one at a point,
 * and their consequence takes time to appear.
 *
 * ## What is solved
 *
 * A swallow delivers a bolus into the oesophagus. What leaves through the
 * sphincter during the window it is open is set by the pressure difference
 * across it:
 *
 * ```text
 * P(drive)  = P(column) + vigour · P(wave)
 * P(column) = height of what is already retained, as a pressure
 * P(les)    = restingTone · (1 − relaxation)
 * out       = conductance · window · max(0, P(drive) − P(les))
 * ```
 *
 * Run swallow after swallow and one of two things happens. Either what leaves
 * matches what arrives and nothing accumulates, or it does not — and then the
 * retained column grows until **its own weight** supplies the pressure the wave
 * no longer can. That balance point is the dilated oesophagus, and it is found
 * by running the swallows rather than being stated: the same shape the COPD
 * scene uses for dynamic hyperinflation, for the same reason.
 *
 * Where the column would have to be taller than the oesophagus is, no balance
 * exists inside it. The model says so rather than reporting a height it does
 * not have room for, and the scene shows it filled to capacity.
 *
 * ## What is not here
 *
 * No nerve and no ganglion cell: the model has a sphincter that does not let go
 * and a wave that does not propagate, not a reason for either. No manometry —
 * nothing here is an integrated relaxation pressure, a Chicago Classification
 * subtype or any measured tracing. No regurgitation, no aspiration, no chest
 * pain, no weight, no cancer risk, and no treatment of any kind. No anatomy
 * claim: the tube is the oesophagus atlas's, drawn to be legible.
 *
 * PROTOTYPE CALIBRATION. The pressures are textbook central values; the
 * conductance and the effective cross-section are numbers chosen so that a
 * normal swallow clears and a failed one balances inside a human oesophagus.
 * None is a measurement, and no figure here is a threshold.
 */

/**
 * Textbook central values, and the two numbers this repository chose.
 *
 * `restingTonemmHg` and `waveAmplitudeMmHg` are the ones with a source. The
 * conductance and the effective cross-section are calibration, and they are
 * named apart from the rest so that nothing reads them as measured.
 */
export const REFERENCE = Object.freeze({
  /** The sphincter's pressure between swallows. */
  restingToneMmHg: 25,
  /** What a vigorous peristaltic wave generates behind the bolus. */
  waveAmplitudeMmHg: 70,
  /** How long the sphincter is open for during a swallow. */
  relaxationWindowS: 8,
  /** How long the oesophagus is, which is the tallest column it can hold. */
  lengthCm: 22,
});

export const CALIBRATION = Object.freeze({
  /**
   * mL per second per mmHg across a **fully relaxed** sphincter.
   *
   * It has to be scaled by the relaxation, not held fixed. A sphincter that
   * lets go is an open tube and a bolus falls through it on a few millimetres
   * of mercury; a fixed conductance made a fully relaxed ring with no wave
   * behind it retain everything, which says that gravity does not empty an
   * oesophagus and is plainly wrong.
   */
  conductanceMlPerSMmHg: 0.21,
  /** What is left of that conductance when the ring does not let go at all. */
  closedConductanceFraction: 0.05,
  /** The cross-section a retained column stands in, once the tube has given. */
  columnAreaCm2: 6,
});

export const DEFAULT_CONTROLS = Object.freeze({
  /**
   * How completely the sphincter fails to let go. 0 is a normal swallow, 1 is
   * a sphincter that does not relax at all.
   *
   * This is the scene's axis because it is the defining abnormality, and
   * because it is genuinely continuous — the failure is graded, not a switch.
   */
  relaxationFailure: 0,
  /** How well the wave propagates and how hard it pushes. 1 normal, 0 none. */
  peristalticVigour: 1,
  /** What one swallow delivers. */
  swallowVolumeMl: 5,
});

/** 1 cmH2O in mmHg. */
const CMH2O_TO_MMHG = 0.7355;

const clamp01 = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/** The pressure a retained column of this volume puts on the sphincter. */
export function columnPressureMmHg(volumeMl) {
  const heightCm = Math.max(0, volumeMl) / CALIBRATION.columnAreaCm2;
  return heightCm * CMH2O_TO_MMHG;
}

/** How much the oesophagus can hold before the column is taller than it is. */
export const CAPACITY_ML = REFERENCE.lengthCm * CALIBRATION.columnAreaCm2;

/**
 * Solve a swallow, and then the swallow after it, until nothing changes.
 *
 * Iterated rather than inverted. The balance is a fixed point of a piecewise
 * relation — the sphincter passes nothing at all below its own pressure — and
 * running the swallows is both simpler to read and the thing the scene is
 * showing.
 *
 * **It converges slowly on purpose, and the count matters.** Each swallow
 * closes only a few per cent of the gap, because the column's contribution per
 * millilitre is small; sixty swallows leaves the answer a fifth of the way out,
 * which is the difference between "it clears every swallow" and "it clears
 * ninety-two per cent of one". So it runs to a tolerance rather than to a
 * round number, and `historySwallows` is the separate, short prefix anything
 * drawing the filling should use.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 * @param {{tolerance?: number, maxSwallows?: number, historySwallows?: number}} [options]
 */
export function solveAchalasia(
  controls = {},
  { tolerance = 1e-4, maxSwallows = 4000, historySwallows = 40 } = {}
) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const failure = clamp01(settings.relaxationFailure);
  const vigour = clamp01(settings.peristalticVigour);
  const bolus = Math.max(0, Number.isFinite(settings.swallowVolumeMl) ? settings.swallowVolumeMl : 0);

  const sphincterPressureMmHg = REFERENCE.restingToneMmHg * failure;
  const wavePressureMmHg = REFERENCE.waveAmplitudeMmHg * vigour;
  // A ring that lets go is both a lower pressure to beat **and** a wider way
  // through. Holding the second fixed is what made a relaxed sphincter with no
  // wave behind it retain everything.
  const conductance =
    CALIBRATION.conductanceMlPerSMmHg *
    (CALIBRATION.closedConductanceFraction + (1 - CALIBRATION.closedConductanceFraction) * (1 - failure));
  const perMmHg = conductance * REFERENCE.relaxationWindowS;

  /** One swallow: what arrives, what leaves, what is left. */
  const step = (retained) => {
    const held = retained + bolus;
    const drive = columnPressureMmHg(held) + wavePressureMmHg;
    const cleared = Math.min(held, perMmHg * Math.max(0, drive - sphincterPressureMmHg));
    return { left: Math.min(CAPACITY_ML, held - cleared), cleared, held, drive };
  };

  let retained = 0;
  let last = step(0);
  const history = [0];
  for (let swallow = 0; swallow < maxSwallows; swallow += 1) {
    last = step(retained);
    const moved = Math.abs(last.left - retained);
    retained = last.left;
    if (history.length <= historySwallows) history.push(retained);
    if (moved < tolerance) break;
  }

  const heightCm = retained / CALIBRATION.columnAreaCm2;
  return {
    controls: settings,
    /** What the sphincter lets through per mmHg, which relaxation also sets. */
    conductanceMlPerSMmHg: conductance,
    sphincterPressureMmHg,
    wavePressureMmHg,
    /** The pressure the sphincter sees from above during the window. */
    drivePressureMmHg: last.drive,
    /** What the last swallow got through, as a fraction of what it delivered. */
    clearedFraction: bolus > 0 ? Math.min(1, last.cleared / bolus) : 1,
    retainedVolumeMl: retained,
    columnHeightCm: heightCm,
    columnPressureMmHg: columnPressureMmHg(retained),
    /**
     * Whether a balance exists inside the oesophagus at all.
     *
     * False when the column would have to be taller than the oesophagus is to
     * supply the pressure the wave no longer does. The model will not report a
     * height it has no room for, and the scene shows a tube filled to capacity
     * instead of one that keeps growing.
     */
    balanced: retained < CAPACITY_ML - 1e-6,
    /** How full it is, for anything that draws it. */
    filledFraction: retained / CAPACITY_ML,
    /**
     * What the first few dozen swallows left behind, so the filling can be
     * watched rather than stated. A prefix, not the whole run: convergence can
     * take hundreds of swallows and a plot of them is a flat line with a corner.
     */
    history,
  };
}

/**
 * Where the wave is, and how deep, at a moment in the swallow cycle.
 *
 * Presentation reads this to draw the travelling narrowing. It is here rather
 * than in the scene because *how far the wave gets* is the model's claim: a
 * vigorous wave reaches the sphincter and a feeble one dies out partway, and
 * that is the difference a reader is being asked to see.
 *
 * @param {number} phase 0..1 through one swallow
 * @param {number} vigour
 * @returns {{at: number, depth: number, arrived: boolean}} position along the
 *   tube, 0 at the throat and 1 at the sphincter
 */
export function waveAt(phase, vigour) {
  const strength = clamp01(vigour);
  // A feeble wave does not simply push less — it stops propagating. The reach
  // is what the scene shows, and it is why aperistalsis looks like nothing
  // travelling rather than like something travelling gently.
  const reach = 0.18 + 0.82 * strength;
  const at = clamp01(phase) * reach;
  const fade = 1 - Math.pow(clamp01(phase), 2) * (1 - strength);
  return { at, depth: strength * fade, arrived: reach >= 0.99 };
}
