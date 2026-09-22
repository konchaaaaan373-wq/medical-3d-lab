/**
 * Interventions as changes to the model's *inputs*.
 *
 * The rule this module exists to hold:
 *
 *     not this:  choose dobutamine → multiply cardiac output by 1.4
 *     this:      choose dobutamine → change elastance and resistance
 *                → the same solver → whatever cardiac output that gives
 *
 * A multiplier on an output is a claim with nothing behind it, and it cannot be
 * wrong in an interesting way: it produces the number it was told to produce
 * and the picture has to be arranged afterwards to match. A change to an input
 * can be wrong, which is what makes it worth testing — and
 * `tests/cardiac-output-interventions.test.js` does test it, by re-deriving the
 * directions from the solver rather than from anything written here.
 *
 * Pure functions and numbers. No display names, no explanations, no scene ids;
 * the copy lives in `src/data/cardiacOutputInterventions.js`.
 *
 * ## Applying one is not accumulating one
 *
 * `applyIntervention` always starts from the base condition it is handed. There
 * is no state here, so choosing the same intervention twice produces the same
 * input twice — a drug effect cannot pile up because a button was pressed
 * again, and there is no internal accumulator that could.
 *
 * ## An effect that does not fit is refused
 *
 * If the effective input falls outside the verified domain, the result carries
 * the problem and no input. It is **never clamped back into range**: a clamped
 * dobutamine is a different intervention wearing the name of the one that was
 * asked for, and it would look like success.
 */
import { CONTROL_IDS, PRESET_IDS, inputProblems, normaliseInput } from './cardiacOutput.js';

export const INTERVENTION_IDS = Object.freeze({
  NONE: 'none',
  VOLUME_LOADING: 'volume-loading',
  DOBUTAMINE: 'dobutamine',
});

/**
 * What each intervention does to the inputs, and what it deliberately leaves
 * alone.
 *
 * `unchanged` is listed rather than inferred. An effect that is absent because
 * somebody decided it should be absent and an effect that is absent because
 * somebody forgot look identical in code; writing the list makes the first one
 * a statement and lets a test check that the second did not happen.
 */
export const INTERVENTION_PROFILES = Object.freeze({
  /**
   * A schematic increase in the circulating stressed volume.
   *
   * **Not a fluid bolus.** The model has no compartment fluid can leave to —
   * no interstitium, no lymphatics, no venous capacitance that could absorb
   * it — so this is a step in the pressure-generating volume of a closed loop
   * and nothing else. It is not a millilitre figure, not a rate, and not a
   * statement that anyone should be given anything.
   *
   * The step size is illustrative, chosen so the contrast with dobutamine is
   * legible at the reference filling: both raise output, and they charge very
   * different amounts of filling pressure for it.
   */
  [INTERVENTION_IDS.VOLUME_LOADING]: Object.freeze({
    id: INTERVENTION_IDS.VOLUME_LOADING,
    requiresPreset: null,
    effects: Object.freeze({ fillingVolumeMl: Object.freeze({ add: 120 }) }),
    unchanged: Object.freeze([
      'systemicResistanceMmHgSPerMl',
      'contractilityEesMmHgPerMl',
      'heartRatePerMin',
    ]),
  }),

  /**
   * A representative dobutamine response, in the population it was observed in.
   *
   * Direction, not dose. What is implemented is what the cited study reports at
   * 2.5–10 µg/kg/min in thirteen patients with cardiomyopathic heart failure:
   * cardiac output rises **because stroke volume rises**, systemic vascular
   * resistance falls, and filling pressure falls with them.
   *
   * **Heart rate is held, and that is the finding rather than a simplification.**
   * The obvious thing to implement for a β-agonist is a rise in rate; the one
   * source this repository has read reports no change in heart rate over that
   * dose range in that cohort. At higher doses, and in other populations,
   * dobutamine is chronotropic and arrhythmogenic — neither of which is here,
   * and neither of which this model could support a claim about.
   *
   * `requiresPreset` ties the intervention to the condition its evidence comes
   * from. Offering it on the reference heart would be extrapolating a
   * heart-failure cohort's response onto a normal circulation, which is exactly
   * the move the evidence does not license — and it would also push elastance
   * past the verified range, where the answer would be refused anyway.
   *
   * The two multipliers are illustrative. The study's own effect sizes are not
   * transferable to this model's parameters, and nothing here claims them.
   */
  [INTERVENTION_IDS.DOBUTAMINE]: Object.freeze({
    id: INTERVENTION_IDS.DOBUTAMINE,
    requiresPreset: PRESET_IDS.REDUCED_CONTRACTILITY,
    effects: Object.freeze({
      contractilityEesMmHgPerMl: Object.freeze({ multiply: 1.5 }),
      systemicResistanceMmHgSPerMl: Object.freeze({ multiply: 0.85 }),
    }),
    unchanged: Object.freeze(['heartRatePerMin', 'fillingVolumeMl']),
  }),
});

export const INTERVENTION_LIST = Object.freeze([
  INTERVENTION_IDS.NONE,
  INTERVENTION_IDS.VOLUME_LOADING,
  INTERVENTION_IDS.DOBUTAMINE,
]);

/**
 * The input an intervention produces from a base condition.
 *
 * @param {object} baseInput the condition the intervention acts on — never modified
 * @param {string} interventionId one of `INTERVENTION_IDS`
 * @returns {{ id: string, input: object|null, problems: string[], changed: string[] }}
 */
export function applyIntervention(baseInput, interventionId) {
  if (interventionId === INTERVENTION_IDS.NONE) {
    return { id: INTERVENTION_IDS.NONE, input: { ...baseInput }, problems: [], changed: [] };
  }
  const profile = INTERVENTION_PROFILES[interventionId];
  if (!profile) {
    return { id: interventionId, input: null, problems: [`unknown intervention: ${interventionId}`], changed: [] };
  }

  const input = { ...baseInput };
  const changed = [];
  for (const [id, effect] of Object.entries(profile.effects)) {
    const before = input[id];
    let value = before;
    if (typeof effect.multiply === 'number') value *= effect.multiply;
    if (typeof effect.add === 'number') value += effect.add;
    input[id] = value;
    if (value !== before) changed.push(id);
  }

  const normalised = normaliseInput(input);
  const problems = inputProblems(normalised);
  return {
    id: interventionId,
    // Refused rather than clamped. A dobutamine squeezed back inside the range
    // is a different intervention with the same name on it.
    input: problems.length ? null : normalised,
    problems,
    changed,
  };
}

/**
 * Which inputs an intervention leaves exactly as it found them.
 *
 * Derived from the profile rather than from the difference between two solved
 * inputs, so it states the intention and a test can hold the code to it.
 *
 * @param {string} interventionId
 */
export function unchangedInputs(interventionId) {
  if (interventionId === INTERVENTION_IDS.NONE) return [...CONTROL_IDS];
  return [...(INTERVENTION_PROFILES[interventionId]?.unchanged ?? [])];
}

/** The preset an intervention's evidence comes from, or null if it has none. */
export function interventionPreset(interventionId) {
  return INTERVENTION_PROFILES[interventionId]?.requiresPreset ?? null;
}
