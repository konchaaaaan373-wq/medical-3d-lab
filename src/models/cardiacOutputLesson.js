/**
 * The introductory lesson's three circulations, and what the lesson may say
 * about them.
 *
 * The lesson has one point: **two circulations can have about the same blood
 * pressure and send out clearly different amounts of blood, so the pressure
 * alone does not tell you whether the circulation is keeping up.** It makes
 * that point with three conditions, and they are two different kinds of
 * comparison that must never be read as one:
 *
 * - **A → B is a before-and-after.** B is A with one thing added — the
 *   vasoconstrictor action of a vasopressor, as a change to the systemic
 *   resistance and nothing else (`INTERVENTION_IDS.VASOCONSTRICTION`).
 * - **B ↔ C is two different circulations side by side.** C is not B treated,
 *   not B later, and not another effect of the same drug. It is the model's
 *   reference circulation — a heart whose contractility is preserved, with
 *   vessels that were never constricted.
 *
 * Every condition is an input to the one solver (`solveCardiacOutput`), inside
 * its verified domain. **This file holds no haemodynamic figure.** What the
 * lesson claims about the three — that the pressure rose from A to B, that B
 * and C land at about the same pressure, that their outputs differ clearly —
 * is checked here against the solved beats (`lessonClaimProblems`), and
 * `tests/cardiac-output-lesson.test.js` fails if a change anywhere in the
 * model stops making it true. Which way the output moved from A to B is **not**
 * a claim: it is read from the solution and said as found.
 *
 * Pure: no `three`, no DOM.
 */
import {
  CONTROL_DOMAIN,
  PRESET_IDS,
  RESULT_STATUS,
  normaliseInput,
  presetInput,
  solveCardiacOutput,
} from './cardiacOutput.js';
import { INTERVENTION_IDS, applyIntervention } from './cardiacInterventions.js';

/** The three conditions, by the letter the lesson calls them. */
export const LESSON_CONDITION_IDS = Object.freeze({
  /** The starting circulation: a heart that sends out little. */
  START: 'A',
  /** A with the vasoconstrictor action added. */
  CONSTRICTED: 'B',
  /** A different circulation, for comparison with B. Not B after anything. */
  OTHER: 'C',
});

/**
 * How each condition is made, and what it is to the others.
 *
 * `relation` is what the screen has to keep apart: `after` means "the same
 * circulation, after an intervention"; `separate` means "a different
 * circulation".
 */
export const LESSON_CONDITIONS = Object.freeze({
  A: Object.freeze({
    id: 'A',
    presetId: PRESET_IDS.REDUCED_CONTRACTILITY,
    interventionId: INTERVENTION_IDS.NONE,
    relation: 'start',
    of: null,
  }),
  B: Object.freeze({
    id: 'B',
    presetId: PRESET_IDS.REDUCED_CONTRACTILITY,
    interventionId: INTERVENTION_IDS.VASOCONSTRICTION,
    relation: 'after',
    of: 'A',
  }),
  C: Object.freeze({
    id: 'C',
    presetId: PRESET_IDS.REFERENCE,
    interventionId: INTERVENTION_IDS.NONE,
    relation: 'separate',
    of: null,
  }),
});

/**
 * The input a condition is solved for. Built from a preset and an
 * intervention — never written out as numbers here, so the lesson cannot drift
 * away from the presets and the intervention the rest of the model uses.
 *
 * @param {'A'|'B'|'C'} id
 */
export function lessonInput(id) {
  const condition = LESSON_CONDITIONS[id];
  if (!condition) throw new RangeError(`unknown lesson condition: ${id}`);
  const applied = applyIntervention(presetInput(condition.presetId), condition.interventionId);
  if (!applied.input) {
    throw new RangeError(`lesson condition ${id} is outside the verified domain: ${applied.problems.join('; ')}`);
  }
  return applied.input;
}

/**
 * The inputs between A and B, one control step of five at a time, ends
 * included.
 *
 * What the lesson walks through when the vasoconstrictor action is added or
 * taken away, so that **every frame of the change is a solved condition** a
 * reader could set by hand in the detailed model — not a drawing interpolated
 * between two answers. The walk is a way of showing the change, not a time
 * course: nothing in this model has a clock (see `cardiacOutput.js`).
 *
 * Only the resistance moves. Every other input is A's, exactly.
 */
export function interventionLadder() {
  const from = lessonInput('A');
  const to = lessonInput('B');
  const grid = CONTROL_DOMAIN.systemicResistanceMmHgSPerMl.step * 5;
  const start = from.systemicResistanceMmHgSPerMl;
  const end = to.systemicResistanceMmHgSPerMl;
  // Evenly spaced, about one grid step apart, each rounded onto the control's
  // own step by `normaliseInput` — the same rounding a slider's value gets.
  const count = Math.max(1, Math.round(Math.abs(end - start) / grid));
  const rungs = [from];
  for (let i = 1; i < count; i++) {
    rungs.push(normaliseInput({ ...from, systemicResistanceMmHgSPerMl: start + ((end - start) * i) / count }));
  }
  rungs.push(to);
  return rungs;
}

/**
 * What the lesson says, as numbers it has to come within — and why each is
 * the size it is.
 *
 * - `similarPressureMmHg`: "about the same pressure". The screen shows mean
 *   pressure to the whole mmHg; three is a few percent of a pressure near 90,
 *   and well inside what anyone would call the same reading.
 * - `distinctOutputLMin` and `distinctOutputRelative`: "clearly different
 *   output". Shown to a tenth of a litre, a litre a minute and a quarter of
 *   the smaller output are both far outside anything a reader could put down
 *   to rounding.
 * - `pressureRiseMmHg`: "the pressure went up" from A to B, by an amount a
 *   reader sees rather than one that rounds away.
 *
 * Loosening one of these to keep a failing lesson passing is the move this
 * comment exists to make visible: if the solver stops supporting the lesson,
 * the lesson has to change, not the check.
 */
export const LESSON_CLAIM_TOLERANCES = Object.freeze({
  similarPressureMmHg: 3,
  distinctOutputLMin: 1,
  distinctOutputRelative: 0.25,
  pressureRiseMmHg: 10,
});

/**
 * Solves the three conditions.
 *
 * @returns {{ A: object, B: object, C: object }} the solver's results, keyed by letter
 */
export function solveLessonConditions() {
  return {
    A: solveCardiacOutput(lessonInput('A')),
    B: solveCardiacOutput(lessonInput('B')),
    C: solveCardiacOutput(lessonInput('C')),
  };
}

/**
 * Which way a solved quantity moved, at the precision the screen shows it.
 * The lesson says "went up", "went down" or "did not change" from this, never
 * from an expectation about the drug.
 *
 * @param {number} before
 * @param {number} after
 * @param {number} resolution the smallest step the screen shows
 * @returns {'up'|'down'|'same'}
 */
export function directionOf(before, after, resolution) {
  const shown = (value) => Math.round(value / resolution);
  const difference = shown(after) - shown(before);
  if (difference > 0) return 'up';
  if (difference < 0) return 'down';
  return 'same';
}

/**
 * Everything about the solved conditions that would make the lesson untrue,
 * as sentences. Empty means the lesson may be shown as written.
 *
 * @param {{ A: object, B: object, C: object }} solved
 */
export function lessonClaimProblems(solved) {
  const problems = [];
  for (const id of ['A', 'B', 'C']) {
    if (solved?.[id]?.status !== RESULT_STATUS.VALID) {
      problems.push(`condition ${id} did not solve to a valid beat (${solved?.[id]?.status ?? 'missing'})`);
    }
  }
  if (problems.length) return problems;
  const { A, B, C } = { A: solved.A.metrics, B: solved.B.metrics, C: solved.C.metrics };
  const t = LESSON_CLAIM_TOLERANCES;

  const pressureGap = Math.abs(B.meanArterialPressureMmHg - C.meanArterialPressureMmHg);
  if (pressureGap > t.similarPressureMmHg) {
    problems.push(`B and C are ${pressureGap.toFixed(1)} mmHg apart in mean pressure, not "about the same"`);
  }
  const outputGap = Math.abs(C.cardiacOutputLMin - B.cardiacOutputLMin);
  const smaller = Math.min(B.cardiacOutputLMin, C.cardiacOutputLMin);
  if (outputGap < t.distinctOutputLMin || outputGap / smaller < t.distinctOutputRelative) {
    problems.push(`B and C differ by ${outputGap.toFixed(2)} L/min in output, which is not "clearly different"`);
  }
  const rise = B.meanArterialPressureMmHg - A.meanArterialPressureMmHg;
  if (rise < t.pressureRiseMmHg) {
    problems.push(`the vasoconstrictor action raised mean pressure by ${rise.toFixed(1)} mmHg, not visibly`);
  }
  // One beat per beat: the lesson compares what one beat sends out, and that
  // is the same comparison as per minute only while the rates are equal.
  if (A.heartRatePerMin !== B.heartRatePerMin || B.heartRatePerMin !== C.heartRatePerMin) {
    problems.push('the three conditions do not share a heart rate, so one beat is not a fair comparison of output');
  }
  return problems;
}
