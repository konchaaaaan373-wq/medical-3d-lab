/**
 * The cardiac-output experiment: a thin boundary around the closed-loop
 * circulation solver.
 *
 * `cardiacMechanics.js` already knows how a seven-compartment circulation
 * behaves. It does not know which of its parameters a reader is allowed to
 * move, what the units on those parameters mean at the edge, or how to tell a
 * settled beat from an integration that merely ran out of beats. This module
 * is that boundary and nothing more — **there is no second circulation model
 * here**, and adding one would be the mistake it exists to prevent.
 *
 * ## What it adds to the solver
 *
 * 1. **A domain.** Four inputs, each with a clinical name, a unit, and a range
 *    that was swept rather than guessed (`scripts/sweep-cardiac-output.mjs`,
 *    and `tests/cardiac-output-physiology.test.js` walks the corners).
 * 2. **A verdict.** `valid`, `nonconverged` or `invalid`, and `metrics` is
 *    `null` for the last two. A caller cannot read numbers out of a solution
 *    that did not settle, because there are none to read — that is a structural
 *    guard rather than a convention, and the scene relies on it.
 * 3. **Diagnostics the solver's own termination test cannot give.** That test
 *    compares successive end-diastolic and end-systolic volumes of the left
 *    ventricle. It is a statement about one chamber. Over the range this
 *    experiment opens — resistance nearly doubled, contractility down by two
 *    thirds — the ventricle can repeat while the venous reservoir is still
 *    drifting, so this module walks one further beat at full resolution and
 *    checks that *every* compartment comes back to where it started, that the
 *    conserved volume is still conserved, that no valve ran backwards, and
 *    that what crossed the aortic valve over the beat is the stroke volume.
 *
 * ## What it is not
 *
 * Not a time course. Every result here is the beat a circulation settles into
 * once a condition is held, so the difference between two results is the
 * difference between two steady conditions — not a drug taking effect, not the
 * minutes after a fluid bolus. Nothing in this module has a clock.
 *
 * Not a patient. The reference parameters are a representative teaching heart.
 *
 * ## Units
 *
 * Volume mL, pressure mmHg, time s, flow mL/s, elastance mmHg/mL, resistance
 * mmHg·s/mL, compliance mL/mmHg, rate min⁻¹, cardiac output L/min. The one
 * conversion a reader sees — resistance in dyn·s·cm⁻⁵ — happens here, once,
 * through `units.js`, and never inside the solver.
 */
import {
  LV,
  SA,
  SV,
  RV,
  PA,
  PV,
  LA,
  COMPARTMENTS,
  solveSteadyState,
  walkBeat,
} from './cardiacMechanics.js';
import { mmHgSPerMlToDynSCm5 } from './units.js';

export const CARDIAC_OUTPUT_UNITS = Object.freeze({
  volume: 'mL',
  pressure: 'mmHg',
  time: 's',
  flow: 'mL/s',
  elastance: 'mmHg/mL',
  resistance: 'mmHg·s/mL',
  compliance: 'mL/mmHg',
  heartRate: '/min',
  cardiacOutput: 'L/min',
});

/**
 * The passive and right-sided properties the experiment holds fixed.
 *
 * These are the same numbers the heart-failure scene's circulation constants
 * carry at every point of its progression, and they are written out here
 * rather than imported because `src/data/heartFailure.js` is a copy module —
 * stage names, disclaimers, legend text — and a model that imports copy has
 * stopped being a model (`src/models/README.md`, rule 6).
 *
 * Duplication without a check is how two copies drift, so the check is a test:
 * `tests/cardiac-output-model.test.js` imports both and asserts they are
 * identical. If the heart-failure calibration moves, this file has to move with
 * it deliberately, and the build says so.
 *
 * They are calibration parameters of a lumped model. None of them is a
 * measurement, and the local slope of any of these relationships is not a
 * clinical compliance.
 */
export const FIXED_CIRCULATION = Object.freeze({
  rightVentricle: Object.freeze({ ees: 0.85, v0: 15, edpvrA: 0.35, edpvrB: 0.02 }),
  leftAtrium: Object.freeze({ ees: 0.25, v0: 15, edpvrA: 2.0, edpvrB: 0.035 }),
  lvEdpvrA: 0.4,
  systemicArterialCompliance: 1.1,
  systemicVenousCompliance: 120,
  pulmonaryArterialCompliance: 4.0,
  pulmonaryVenousCompliance: 5.0,
  pulmonaryResistance: 0.08,
  pulmonaryVenousResistance: 0.03,
  mitralResistance: 0.008,
  aorticResistance: 0.012,
  tricuspidResistance: 0.008,
  pulmonicResistance: 0.012,
});

/**
 * Left-ventricular properties the experiment does not let a reader move.
 *
 * `v0` and `edpvrB` are held because this experiment is about four things and
 * they are not two of them: a reader who could also shift the unstressed
 * volume and the stiffness of the filling curve could produce almost any
 * relationship between filling and output, and would learn nothing about which
 * of the four did it. They are the heart-failure model's values at progress 0.
 */
export const FIXED_LEFT_VENTRICLE = Object.freeze({
  unstressedVolumeMl: 10,
  edpvrB: 0.0277,
});

/**
 * End-diastolic wall thickness and cavity shape of the reference heart.
 *
 * Structural properties of the drawing, not of the circulation — the solver
 * never reads them. They are here because the myocardial volume the scene
 * holds fixed through every acute manipulation is computed from them, and the
 * scene must not be free to pick its own.
 */
export const REFERENCE_GEOMETRY = Object.freeze({
  wallMm: 9.0,
  longToShortAxisRatio: 1.9,
});

/**
 * The four inputs, with the range each may take.
 *
 * `default` is the reference heart. The bounds are not the widest range the
 * solver survives: they are the range over which every corner and interior
 * sample settles, conserves its volume and closes its beat inside the
 * tolerances below, measured by the sweep and fixed by
 * `tests/cardiac-output-physiology.test.js`. Widening one means re-running the
 * sweep, not editing the number.
 *
 * `step` is the interaction granularity, and it is also the rounding the
 * session's cache key uses — see `normaliseInput`. A key rounded more coarsely
 * than the value handed to the solver is how two different conditions come to
 * share one answer.
 */
export const CONTROL_DOMAIN = Object.freeze({
  /**
   * Circulating *stressed* volume: the part of the blood volume above the
   * unstressed filling of the compartments, which is what generates pressure.
   * It is emphatically not total blood volume, and a change in it is not a
   * volume of fluid given to anybody.
   */
  fillingVolumeMl: Object.freeze({ min: 540, max: 980, step: 5, default: 710 }),
  /** Systemic vascular resistance. One component of afterload, not all of it. */
  systemicResistanceMmHgSPerMl: Object.freeze({ min: 0.7, max: 1.8, step: 0.01, default: 1.1 }),
  /** Left-ventricular end-systolic elastance. */
  contractilityEesMmHgPerMl: Object.freeze({ min: 0.8, max: 4.0, step: 0.02, default: 2.74 }),
  /**
   * Heart rate.
   *
   * The activation function is defined on normalised phase, so raising the rate
   * compresses systole and diastole in the same proportion — in a real heart
   * systole shortens proportionally less, and diastolic filling time is lost
   * faster than it is here. The range is bounded so that distortion stays
   * modest; the limitation itself is recorded as `phase-scaled-systole` in
   * `evidence.js` and stated on the scene's scope panel, and narrowing the
   * range further would not make either unnecessary.
   */
  heartRatePerMin: Object.freeze({ min: 50, max: 110, step: 1, default: 70 }),
});

export const CONTROL_IDS = Object.freeze(Object.keys(CONTROL_DOMAIN));

/** Defaults, as an input object. */
export function referenceInput() {
  return {
    fillingVolumeMl: CONTROL_DOMAIN.fillingVolumeMl.default,
    systemicResistanceMmHgSPerMl: CONTROL_DOMAIN.systemicResistanceMmHgSPerMl.default,
    contractilityEesMmHgPerMl: CONTROL_DOMAIN.contractilityEesMmHgPerMl.default,
    heartRatePerMin: CONTROL_DOMAIN.heartRatePerMin.default,
  };
}

/**
 * The two conditions the experiment starts from.
 *
 * `reduced-contractility` differs from the reference in **end-systolic
 * elastance and nothing else**. That is the whole point of it: a preset that
 * also moved the filling curve, the unstressed volume, the resistance and the
 * rate would show a reader four changes at once and teach them which one
 * mattered about as well as a coin would.
 *
 * It is a heart whose contractility is low. It is not HFrEF — the clinical
 * syndrome has remodelling, neurohormonal activation, fluid retention and a
 * changed vasculature, none of which is here — and it is not a diagnosis.
 */
export const PRESET_IDS = Object.freeze({
  REFERENCE: 'reference',
  REDUCED_CONTRACTILITY: 'reduced-contractility',
});

const PRESET_OVERRIDES = Object.freeze({
  [PRESET_IDS.REFERENCE]: Object.freeze({}),
  [PRESET_IDS.REDUCED_CONTRACTILITY]: Object.freeze({ contractilityEesMmHgPerMl: 1.2 }),
});

/** @param {string} presetId */
export function presetInput(presetId) {
  const overrides = PRESET_OVERRIDES[presetId];
  if (!overrides) throw new RangeError(`unknown preset: ${presetId}`);
  return { ...referenceInput(), ...overrides };
}

export const PRESET_LIST = Object.freeze(Object.values(PRESET_IDS));

/**
 * How close the checks have to come before a solution counts as settled.
 *
 * Chosen against what the read-out shows, not against what the integrator can
 * reach: volumes are displayed to the nearest millilitre and pressures to the
 * nearest mmHg, so a residual of a tenth of a millilitre cannot move a digit.
 * They are absolute where the quantity has a natural scale in millilitres and
 * relative where it does not.
 *
 * Loosening one of these to make a failing case pass is the move this comment
 * exists to make visible.
 */
export const DIAGNOSTIC_TOLERANCES = Object.freeze({
  /** Largest allowed drift, in mL, of any one compartment over a closing beat. */
  periodicResidualMl: 0.5,
  /** Largest allowed departure of the conserved total from the requested volume. */
  conservedVolumeMl: 0.5,
  /** Largest allowed mismatch between EDV − ESV and what crossed the aortic valve. */
  strokeVolumeMismatchMl: 0.5,
  /**
   * Largest allowed mismatch, for **any** compartment, between what crossed
   * its two boundaries over the beat and what its volume actually did.
   *
   * The independent one. `strokeVolumeMismatchMl` asks it of the left
   * ventricle and the aortic valve; this asks it of all seven compartments and
   * all seven flows, so an error in the pulmonary side or in the venous
   * reservoir — neither of which the left ventricle's own numbers can see —
   * has to show up here. Measured 2026-09-22 over the declared domain: worst
   * 0.0162 mL (left ventricle, Ees 0.8 / filling 980 / SVR 1.1 / 50 min⁻¹),
   * thirty times inside this — small, and not the zero an identity returns.
   */
  compartmentBalanceMl: 0.5,
  /**
   * The same, asked of a twenty-fourth of the beat at a time.
   *
   * This is the **wiring** check. The whole-beat balance cannot be one — see
   * `measureBeat` — because in a series loop at steady state every flow
   * integrates to the same stroke volume. Inside a window they do not.
   *
   * The number is set from the separation, not from a wish: with the loop
   * wired correctly the residual is the first-order quadrature error inside a
   * window, measured 2026-09-22 at 0.29 mL for the reference and 0.54 mL worst
   * over the domain. Connecting the systemic veins to the pulmonic valve
   * instead of the tricuspid puts it at 18.3 mL and the solve is refused.
   * Three sits between them with room on both sides.
   */
  compartmentWindowMl: 3,
  /** Any backward flow through an ideal one-way valve at all, in mL/s. */
  valveBackflowMlPerS: 0,
  /**
   * Relative agreement between the pressure gradient across the systemic bed
   * and the mean flow through it times its resistance.
   */
  systemicOhmRelative: 0.02,
});

/** Integration settings. `stepsPerBeat` is the solver step, not a plot density. */
export const SOLVER_DEFAULTS = Object.freeze({
  stepsPerBeat: 240,
  samples: 120,
  maxBeats: 320,
  tolerance: 0.02,
  /** Resolution of the closing beat the diagnostics are measured on. */
  diagnosticSteps: 960,
  /**
   * How many times the boundary may continue an integration that settled the
   * ventricle but not the whole loop. Bounded, so a condition that never closes
   * reports that rather than spinning.
   */
  maxRefinements: 6,
});

export const RESULT_STATUS = Object.freeze({
  VALID: 'valid',
  INVALID: 'invalid',
  NONCONVERGED: 'nonconverged',
});

/**
 * Rounds an input to its control's step.
 *
 * Both the cache key and the value handed to the solver go through this, which
 * is the point: rounding only the key means two conditions that round together
 * are solved separately and answered with whichever arrived first.
 *
 * @param {object} input
 */
export function normaliseInput(input) {
  const out = {};
  for (const id of CONTROL_IDS) {
    const value = input?.[id];
    const { step } = CONTROL_DOMAIN[id];
    // Deliberately not `Number(value)`. Coercing here would let `'70'`, `[70]`
    // and `null` through the type check below as numbers, and `''` and `[]`
    // arrive as a silent zero — a heart rate of nothing, refused only because
    // zero happens to be out of range. Converting a control's value to a number
    // is the UI's job, at the edge where the string comes from.
    out[id] =
      typeof value === 'number' && Number.isFinite(value) ? Math.round(value / step) * step : value;
  }
  return out;
}

/**
 * A key that separates two conditions exactly when the solver would.
 *
 * Every input is in it. A key that omitted one — rate, say, or contractility —
 * would hand a reader the answer to a different question with no sign that it
 * had, which is the failure this is written to be unable to have: the ids come
 * from `CONTROL_IDS`, so an input added later is in the key by construction
 * rather than by somebody remembering.
 *
 * @param {object} input
 * @param {object} [options] solver settings, which change the answer too
 */
export function inputKey(input, options = {}) {
  const normalised = normaliseInput(input);
  const parts = CONTROL_IDS.map((id) => `${id}=${normalised[id]}`);
  const stepsPerBeat = options.stepsPerBeat ?? SOLVER_DEFAULTS.stepsPerBeat;
  const maxBeats = options.maxBeats ?? SOLVER_DEFAULTS.maxBeats;
  const tolerance = options.tolerance ?? SOLVER_DEFAULTS.tolerance;
  const samples = options.samples ?? SOLVER_DEFAULTS.samples;
  parts.push(`steps=${stepsPerBeat}`, `beats=${maxBeats}`, `tol=${tolerance}`, `samples=${samples}`);
  return parts.join('|');
}

/**
 * Why an input is not usable, as a list of sentences. Empty means usable.
 *
 * `domain` exists for one caller — `scripts/sweep-cardiac-output.mjs`, which
 * has to reach *outside* the verified range to find where the numerics
 * actually give way, and would otherwise only be able to confirm that the
 * range it is trying to measure is the range that is declared. It is not a
 * bypass: every path inside the product leaves it out and gets
 * `CONTROL_DOMAIN`, which is what `tests/cardiac-output-model.test.js` fixes.
 * Interventions, lessons and the reel go through this same check as the
 * sliders do, because an input nobody validated is an input nobody validated
 * however it was produced.
 *
 * @param {object} input
 * @param {object} [domain]
 */
export function inputProblems(input, domain = CONTROL_DOMAIN) {
  const problems = [];
  if (!input || typeof input !== 'object') return ['no input object was supplied'];
  for (const id of CONTROL_IDS) {
    const value = input[id];
    const range = domain[id] ?? CONTROL_DOMAIN[id];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      problems.push(`${id} must be a finite number (got ${String(value)})`);
      continue;
    }
    if (value < range.min || value > range.max) {
      problems.push(`${id} is outside the verified range ${range.min}..${range.max} (got ${value})`);
    }
  }
  return problems;
}

/**
 * The solver's parameter object for a set of inputs.
 *
 * Pure: the input is read and never written to, so a caller's stored condition
 * cannot be changed by asking what it would produce.
 *
 * @param {object} input
 */
export function modelParameters(input) {
  const { fillingVolumeMl, systemicResistanceMmHgSPerMl, contractilityEesMmHgPerMl, heartRatePerMin } =
    input;
  return {
    heartRate: heartRatePerMin,
    circulatingVolume: fillingVolumeMl,
    systemicResistance: systemicResistanceMmHgSPerMl,
    lv: {
      ees: contractilityEesMmHgPerMl,
      v0: FIXED_LEFT_VENTRICLE.unstressedVolumeMl,
      edpvrA: FIXED_CIRCULATION.lvEdpvrA,
      edpvrB: FIXED_LEFT_VENTRICLE.edpvrB,
    },
    rv: FIXED_CIRCULATION.rightVentricle,
    la: FIXED_CIRCULATION.leftAtrium,
    systemicArterialCompliance: FIXED_CIRCULATION.systemicArterialCompliance,
    systemicVenousCompliance: FIXED_CIRCULATION.systemicVenousCompliance,
    pulmonaryArterialCompliance: FIXED_CIRCULATION.pulmonaryArterialCompliance,
    pulmonaryVenousCompliance: FIXED_CIRCULATION.pulmonaryVenousCompliance,
    pulmonaryResistance: FIXED_CIRCULATION.pulmonaryResistance,
    pulmonaryVenousResistance: FIXED_CIRCULATION.pulmonaryVenousResistance,
    mitralResistance: FIXED_CIRCULATION.mitralResistance,
    aorticResistance: FIXED_CIRCULATION.aorticResistance,
    tricuspidResistance: FIXED_CIRCULATION.tricuspidResistance,
    pulmonicResistance: FIXED_CIRCULATION.pulmonicResistance,
  };
}

const COMPARTMENT_NAMES = Object.freeze([
  'leftVentricle',
  'systemicArteries',
  'systemicVeins',
  'rightVentricle',
  'pulmonaryArteries',
  'pulmonaryVeins',
  'leftAtrium',
]);
const COMPARTMENT_ORDER = Object.freeze([LV, SA, SV, RV, PA, PV, LA]);

/**
 * What flows into and out of each compartment, in the same order.
 *
 * Written down so the balance below is a statement about the **loop** rather
 * than about one equation evaluated twice. The check it enables — integrated
 * inflow minus integrated outflow equals the compartment's own volume change
 * over the beat — couples seven integrals and seven volume differences that
 * were produced by different parts of the integration, so an error in any one
 * of them has nowhere to hide.
 *
 * Contrast `systemicOhmRelative`, which is an identity: the systemic flow *is*
 * defined as (P_sa − P_sv) / R, so multiplying its mean by R and comparing it
 * with the mean gradient can only ever return zero to machine precision. It is
 * kept as a wiring check — it would catch a resistance read from the wrong
 * parameter — and it is not evidence of numerical accuracy. Measured
 * 2026-09-22: 5×10⁻¹⁶ at the reference, 1.5×10⁻¹⁵ at the corners.
 */
const COMPARTMENT_FLOWS = Object.freeze([
  Object.freeze({ in: 'mitral', out: 'aortic' }),
  Object.freeze({ in: 'aortic', out: 'systemic' }),
  Object.freeze({ in: 'systemic', out: 'tricuspid' }),
  Object.freeze({ in: 'tricuspid', out: 'pulmonic' }),
  Object.freeze({ in: 'pulmonic', out: 'pulmonary' }),
  Object.freeze({ in: 'pulmonary', out: 'pulmonaryVenous' }),
  Object.freeze({ in: 'pulmonaryVenous', out: 'mitral' }),
]);

/**
 * Walks one further beat at full resolution and reports what it found.
 *
 * Everything here has to follow the real trajectory: evaluating flows at one
 * frozen set of volumes answers a different question, and integrating a
 * subsampled trace answers a coarser one. This is why the solver's `walkBeat`
 * is used rather than the recorded trace, and why it hands back the closing
 * volumes — the periodic residual is the whole reason the extra beat is run.
 */
function measureBeat(solution, parameters, steps) {
  const start = Float64Array.from(solution.volumes);
  const integrals = {
    mitral: 0,
    aortic: 0,
    tricuspid: 0,
    pulmonic: 0,
    systemic: 0,
    pulmonary: 0,
    pulmonaryVenous: 0,
  };
  let valveBackflow = 0;
  let finite = true;
  let arterialPressureIntegral = 0;
  let venousPressureIntegral = 0;
  let elapsed = 0;

  /**
   * The same balance, asked of short windows instead of the whole beat.
   *
   * This is the one that catches **wiring**, which the whole-beat balance
   * cannot: at periodic steady state every through-flow in a series loop
   * integrates to the same stroke volume, so connecting a compartment to the
   * wrong neighbour changes its beat total by a few thousandths of a
   * millilitre and passes. Over a twenty-fourth of a cycle the flows are
   * nothing like equal — the aortic valve is shut for two thirds of it — so
   * the same mistake leaves tens of millilitres unaccounted for.
   *
   * An instantaneous form was tried first and does not work: `flows` is
   * evaluated at the step boundary while ΔV is the average over the step, and
   * at a valve opening the flow slews by a hundred millilitres a second
   * inside one step. The finite-difference error was 85 mL/s with the loop
   * wired correctly, which leaves nothing to detect a mistake against.
   * Integrating over a window removes it.
   */
  const WINDOWS = 24;
  const windowSteps = Math.max(1, Math.round(steps / WINDOWS));
  let windowStart = Float64Array.from(solution.volumes);
  const windowIntegrals = Object.fromEntries(Object.keys(integrals).map((key) => [key, 0]));
  let stepsInWindow = 0;
  let windowResidualMl = 0;
  let worstWindowCompartment = COMPARTMENT_NAMES[0];

  const closeWindow = (volumes) => {
    for (let slot = 0; slot < COMPARTMENT_ORDER.length; slot++) {
      const index = COMPARTMENT_ORDER[slot];
      const { in: inflow, out: outflow } = COMPARTMENT_FLOWS[slot];
      const imbalance = Math.abs(
        windowIntegrals[inflow] - windowIntegrals[outflow] - (volumes[index] - windowStart[index])
      );
      if (imbalance > windowResidualMl) {
        windowResidualMl = imbalance;
        worstWindowCompartment = COMPARTMENT_NAMES[slot];
      }
    }
    for (const key of Object.keys(windowIntegrals)) windowIntegrals[key] = 0;
    windowStart = Float64Array.from(volumes);
    stepsInWindow = 0;
  };

  const end = walkBeat(solution, parameters, steps, ({ dt, pressures, flows, volumes }) => {
    for (const key of Object.keys(integrals)) {
      integrals[key] += flows[key] * dt;
      windowIntegrals[key] += flows[key] * dt;
    }
    stepsInWindow += 1;
    if (stepsInWindow >= windowSteps) closeWindow(volumes);
    for (const valve of ['mitral', 'aortic', 'tricuspid', 'pulmonic']) {
      valveBackflow = Math.min(valveBackflow, flows[valve]);
    }
    arterialPressureIntegral += pressures.sa * dt;
    venousPressureIntegral += pressures.sv * dt;
    elapsed += dt;
    for (let i = 0; i < COMPARTMENTS; i++) if (!Number.isFinite(volumes[i])) finite = false;
    for (const value of Object.values(pressures)) if (!Number.isFinite(value)) finite = false;
  });

  let periodicResidualMl = 0;
  let worstCompartment = COMPARTMENT_NAMES[0];
  let balanceResidualMl = 0;
  let worstBalanceCompartment = COMPARTMENT_NAMES[0];
  let total = 0;
  for (let slot = 0; slot < COMPARTMENT_ORDER.length; slot++) {
    const index = COMPARTMENT_ORDER[slot];
    const drift = Math.abs(end[index] - start[index]);
    if (drift > periodicResidualMl) {
      periodicResidualMl = drift;
      worstCompartment = COMPARTMENT_NAMES[slot];
    }
    // What crossed this compartment's two boundaries over the beat, against
    // what its volume actually did. Independent of the periodic residual: a
    // compartment can return to where it started while the flows either side
    // of it disagree about how it got there.
    const { in: inflow, out: outflow } = COMPARTMENT_FLOWS[slot];
    const imbalance = Math.abs(
      integrals[inflow] - integrals[outflow] - (end[index] - start[index])
    );
    if (imbalance > balanceResidualMl) {
      balanceResidualMl = imbalance;
      worstBalanceCompartment = COMPARTMENT_NAMES[slot];
    }
    total += end[index];
    if (!Number.isFinite(end[index])) finite = false;
  }

  const meanArterial = arterialPressureIntegral / elapsed;
  const meanVenous = venousPressureIntegral / elapsed;
  const meanSystemicFlow = integrals.systemic / elapsed;
  const ohmPredicted = meanSystemicFlow * parameters.systemicResistance;
  const ohmMeasured = meanArterial - meanVenous;

  return {
    finite,
    periodicResidualMl,
    worstCompartment,
    balanceResidualMl,
    worstBalanceCompartment,
    windowResidualMl,
    worstWindowCompartment,
    conservedVolumeMl: total,
    integrals,
    valveBackflowMlPerS: valveBackflow,
    meanArterialPressureMmHg: meanArterial,
    meanSystemicVenousPressureMmHg: meanVenous,
    meanSystemicFlowMlPerS: meanSystemicFlow,
    systemicOhmRelative:
      Math.abs(ohmMeasured) > 0 ? Math.abs(ohmPredicted - ohmMeasured) / Math.abs(ohmMeasured) : 0,
    beatSeconds: elapsed,
  };
}

/**
 * Solves one condition and reports the beat it settles into.
 *
 * @param {object} input the four controls
 * @param {object} [options]
 * @param {Float64Array} [options.warmStart] a nearby solution's compartment volumes
 * @param {number} [options.stepsPerBeat]
 * @param {number} [options.maxBeats]
 * @param {number} [options.tolerance]
 * @param {number} [options.samples]
 * @param {number} [options.diagnosticSteps]
 * @param {number|string} [options.revision] carried through onto the result untouched
 * @returns {{status: string, revision: (number|string|null), input: object, key: string,
 *   problems: string[], parameters: object|null, metrics: object|null, cycle: object|null,
 *   diagnostics: object, volumes: Float64Array|null}}
 */
export function solveCardiacOutput(input, options = {}) {
  const normalised = normaliseInput(input);
  const revision = options.revision ?? null;
  const key = inputKey(normalised, options);
  const problems = inputProblems(normalised, options.domain);
  if (problems.length > 0) {
    return {
      status: RESULT_STATUS.INVALID,
      revision,
      input: Object.freeze(normalised),
      key,
      problems,
      parameters: null,
      metrics: null,
      cycle: null,
      diagnostics: Object.freeze({ reason: 'input rejected', problems }),
      volumes: null,
    };
  }

  const parameters = modelParameters(normalised);
  const stepsPerBeat = options.stepsPerBeat ?? SOLVER_DEFAULTS.stepsPerBeat;
  const diagnosticSteps = options.diagnosticSteps ?? SOLVER_DEFAULTS.diagnosticSteps;
  const solverOptions = {
    stepsPerBeat,
    samples: options.samples ?? SOLVER_DEFAULTS.samples,
    maxBeats: options.maxBeats ?? SOLVER_DEFAULTS.maxBeats,
    tolerance: options.tolerance ?? SOLVER_DEFAULTS.tolerance,
  };

  /**
   * Keep integrating until *every* compartment repeats, not just the ventricle.
   *
   * The solver stops when successive end-diastolic and end-systolic volumes of
   * the left ventricle agree. Over this range that is not always enough: the
   * systemic venous reservoir has a compliance of 120 mL/mmHg, so a drift far
   * too small to register as pressure is still a millilitre of volume, and at
   * the high-rate corner the ventricle settled with the reservoir still
   * filling. Each round here restarts from where the last one finished, so the
   * extra beats are a continuation rather than a second attempt.
   *
   * This is why the boundary refines instead of relaxing `periodicResidualMl`:
   * loosening the tolerance would not make the beat periodic, it would make the
   * check unable to say that it was not.
   */
  let solution = solveSteadyState(parameters, { ...solverOptions, warmStart: options.warmStart });
  let measured = measureBeat(solution, parameters, diagnosticSteps);
  let refinements = 0;
  while (
    refinements < SOLVER_DEFAULTS.maxRefinements &&
    measured.finite &&
    measured.periodicResidualMl > DIAGNOSTIC_TOLERANCES.periodicResidualMl
  ) {
    refinements += 1;
    solution = solveSteadyState(parameters, { ...solverOptions, warmStart: solution.volumes });
    measured = measureBeat(solution, parameters, diagnosticSteps);
  }

  const { cycle } = solution;

  const strokeVolumeMismatchMl = Math.abs(cycle.strokeVolume - measured.integrals.aortic);
  const cycleFinite = [
    cycle.edv,
    cycle.esv,
    cycle.strokeVolume,
    cycle.cardiacOutput,
    cycle.meanArterialPressure,
    cycle.endDiastolicPressure,
    cycle.meanPulmonaryVenousPressure,
  ].every(Number.isFinite);

  const failures = [];
  if (!solution.converged) failures.push(`the beat had not settled after ${solution.beats} beats`);
  if (!measured.finite || !cycleFinite) failures.push('the solution contains a value that is not finite');
  if (measured.periodicResidualMl > DIAGNOSTIC_TOLERANCES.periodicResidualMl) {
    failures.push(
      `${measured.worstCompartment} drifted ${measured.periodicResidualMl.toFixed(3)} mL over the closing beat`
    );
  }
  if (
    Math.abs(measured.conservedVolumeMl - normalised.fillingVolumeMl) >
    DIAGNOSTIC_TOLERANCES.conservedVolumeMl
  ) {
    failures.push(
      `the conserved volume closed at ${measured.conservedVolumeMl.toFixed(2)} mL, not ${normalised.fillingVolumeMl} mL`
    );
  }
  if (strokeVolumeMismatchMl > DIAGNOSTIC_TOLERANCES.strokeVolumeMismatchMl) {
    failures.push(
      `stroke volume and aortic throughput differ by ${strokeVolumeMismatchMl.toFixed(3)} mL`
    );
  }
  if (measured.windowResidualMl > DIAGNOSTIC_TOLERANCES.compartmentWindowMl) {
    failures.push(
      `${measured.worstWindowCompartment}'s flows and its volume change differ by ` +
        `${measured.windowResidualMl.toFixed(3)} mL within a single window of the beat`
    );
  }
  if (measured.balanceResidualMl > DIAGNOSTIC_TOLERANCES.compartmentBalanceMl) {
    failures.push(
      `${measured.worstBalanceCompartment}'s flows and its volume change differ by ` +
        `${measured.balanceResidualMl.toFixed(4)} mL over the beat`
    );
  }
  if (measured.valveBackflowMlPerS < -DIAGNOSTIC_TOLERANCES.valveBackflowMlPerS) {
    failures.push(`a valve carried ${measured.valveBackflowMlPerS.toFixed(4)} mL/s backwards`);
  }
  if (measured.systemicOhmRelative > DIAGNOSTIC_TOLERANCES.systemicOhmRelative) {
    failures.push(
      `mean flow times resistance is ${(measured.systemicOhmRelative * 100).toFixed(2)}% away from the mean systemic gradient`
    );
  }

  const diagnostics = Object.freeze({
    beats: solution.beats,
    refinements,
    maxBeats: solution.maxBeats,
    converged: solution.converged,
    finite: measured.finite && cycleFinite,
    periodicResidualMl: measured.periodicResidualMl,
    worstCompartment: measured.worstCompartment,
    conservedVolumeMl: measured.conservedVolumeMl,
    requestedVolumeMl: normalised.fillingVolumeMl,
    strokeVolumeMismatchMl,
    valveBackflowMlPerS: measured.valveBackflowMlPerS,
    systemicOhmRelative: measured.systemicOhmRelative,
    balanceResidualMl: measured.balanceResidualMl,
    worstBalanceCompartment: measured.worstBalanceCompartment,
    windowResidualMl: measured.windowResidualMl,
    worstWindowCompartment: measured.worstWindowCompartment,
    beatFlowsMl: Object.freeze({ ...measured.integrals }),
    stepsPerBeat,
    diagnosticSteps,
    tolerances: DIAGNOSTIC_TOLERANCES,
    failures: Object.freeze(failures),
  });

  if (failures.length > 0) {
    return {
      status: RESULT_STATUS.NONCONVERGED,
      revision,
      input: Object.freeze(normalised),
      key,
      problems: failures,
      parameters,
      // No metrics. A solution that did not close its beat has no numbers worth
      // showing, and handing them back "for information" is how one reaches a
      // panel: somebody reads the field because it is there.
      metrics: null,
      cycle: null,
      diagnostics,
      volumes: null,
    };
  }

  return {
    status: RESULT_STATUS.VALID,
    revision,
    input: Object.freeze(normalised),
    key,
    problems: [],
    parameters,
    metrics: metricsFrom(cycle, parameters, measured),
    cycle,
    diagnostics,
    volumes: solution.volumes,
  };
}

/**
 * The read-out, derived from the solved beat and from nothing else.
 *
 * Every figure the scene, the plots, the lesson and the video subtitles show
 * comes from here, so there is one place where a quantity is defined and no
 * second approximation anywhere downstream. Mean arterial pressure is the time
 * average of the arterial trace over the beat — not a diastolic-plus-a-third
 * estimate, which would be a different quantity wearing the same name.
 */
function metricsFrom(cycle, parameters, measured) {
  const strokeVolumeMl = cycle.strokeVolume;
  return Object.freeze({
    edvMl: cycle.edv,
    esvMl: cycle.esv,
    strokeVolumeMl,
    ejectionFraction: cycle.ejectionFraction,
    cardiacOutputLMin: cycle.cardiacOutput,
    heartRatePerMin: parameters.heartRate,
    meanArterialPressureMmHg: cycle.meanArterialPressure,
    systolicPressureMmHg: cycle.systolicArterialPressure,
    diastolicPressureMmHg: cycle.diastolicArterialPressure,
    peakVentricularPressureMmHg: cycle.peakSystolicPressure,
    endDiastolicPressureMmHg: cycle.endDiastolicPressure,
    meanLeftAtrialPressureMmHg: cycle.meanAtrialPressure,
    meanPulmonaryVenousPressureMmHg: cycle.meanPulmonaryVenousPressure,
    /**
     * Mean pressure in the lumped systemic venous reservoir. There is no right
     * atrium in this model, so this is **not** a central venous pressure and
     * must never be labelled as one.
     */
    meanSystemicVenousPressureMmHg: cycle.meanSystemicVenousPressure,
    contractilityEesMmHgPerMl: parameters.lv.ees,
    unstressedVolumeMl: parameters.lv.v0,
    fillingVolumeMl: parameters.circulatingVolume,
    systemicResistanceMmHgSPerMl: parameters.systemicResistance,
    systemicResistanceDynSCm5: mmHgSPerMlToDynSCm5(parameters.systemicResistance),
    meanSystemicFlowMlPerS: measured.meanSystemicFlowMlPerS,
    ejectionStartPhase: cycle.ejectionStartPhase,
    ejectionEndPhase: cycle.ejectionEndPhase,
    endDiastolePhase: cycle.edvPhase,
    endSystolePhase: cycle.esvPhase,
    cycleLengthSeconds: cycle.cycleLength,
    /** Geometry inputs, which the circulation does not determine. */
    wallMm: REFERENCE_GEOMETRY.wallMm,
    longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
  });
}

/**
 * The pressure-volume loop and the two relationships that generate it.
 *
 * Built from the solved beat and from the same two equations the solver
 * integrated — `P = Ees·(V − V0)` and `P = A·(exp(B·(V − V0)) − 1)` — so the
 * loop meets them because of the mechanics rather than because a curve was
 * fitted to it. There is no second approximation for the plot.
 *
 * The end-systolic marker is the *recorded* end-systolic pressure at the
 * recorded end-systolic volume, not the elastance line's value there. They are
 * close and they are not the same thing, and quietly plotting the theoretical
 * one would make the loop look tangent to a line it only approaches.
 *
 * @param {ReturnType<typeof solveCardiacOutput>} result
 */
export function pressureVolumeCurves(result) {
  if (result.status !== RESULT_STATUS.VALID) return null;
  const { cycle, parameters } = result;
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

  const endSystolicPressure = sampleAtPhase(trace.phase, trace.lvPressure, cycle.esvPhase);

  return {
    loop,
    endSystolic,
    endDiastolic,
    markers: {
      endDiastole: { volume: cycle.edv, pressure: cycle.endDiastolicPressure },
      endSystole: { volume: cycle.esv, pressure: endSystolicPressure },
    },
    waveform: {
      phase: trace.phase.slice(),
      ventricular: trace.lvPressure.slice(),
      arterial: trace.aorticPressure.slice(),
      atrial: trace.atrialPressure.slice(),
      cycleLengthSeconds: cycle.cycleLength,
      /** Where the aortic valve is open, from the solved flows. */
      ejection: { from: cycle.ejectionStartPhase, to: cycle.ejectionEndPhase },
    },
    contractilityEes: ees,
    unstressedVolumeMl: v0,
  };
}

/** Nearest-sample read of a recorded trace. Presentation-free. */
function sampleAtPhase(phases, values, phase) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < phases.length; i++) {
    const distance = Math.abs(phases[i] - phase);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return values[best];
}
