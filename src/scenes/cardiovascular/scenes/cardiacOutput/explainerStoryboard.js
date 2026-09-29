import { CONTROL_DOMAIN } from '../../../../models/cardiacOutput.js';
import { EXPLAINER_COPY } from '../../../../data/cardiacOutput.js';

/**
 * The explanation animation: "when contractility falls", from the cause to
 * the circulation, one stage at a time, played from a button.
 *
 * ## What it is, and what it is not
 *
 * It is the interactive model, driven. Each stage sets the same input a reader
 * can set (`contractilityEesMmHgPerMl`, through `setModelControl`), names the
 * framing to look from and the part to look at, and says one sentence. Every
 * number in a sentence is read from the solved beat at that moment
 * (`readMetrics`) — this file holds no haemodynamic figure — so the animation
 * cannot say something the model on screen does not.
 *
 * It is not a clinical time course. The seconds between two stages are how
 * long it takes to look, not how long anything takes in a body, and the last
 * stage says what the model leaves out (the reflexes that would, in a person,
 * raise the rate and tighten the vessels). It does not compute oxygen
 * delivery or organ perfusion, and does not say anything about them.
 *
 * ## Why the contractility moves in steps
 *
 * Each distinct value is a fresh solve of the whole circulation. Quantised to
 * five of the control's steps, the fall visits about fourteen conditions, each
 * one a value a reader could set by hand.
 */

/** Where contractility starts and where it is taken to. */
export const EXPLAINER_CONTRACTILITY = {
  from: CONTROL_DOMAIN.contractilityEesMmHgPerMl.default,
  to: 1.4,
};

/**
 * The stages, contiguous by construction.
 *
 * Each one **points, then shows, then waits** (owner's review, 2026-09-27:
 * 注目部位を示してから変化を見せ、理解する間を置く). For its first moments only
 * the part is pointed at (`highlight`) and its sentence is beside it
 * (`anchor`); then what it is about happens — contractility falls
 * (`fall`, seconds into the stage), the start's lines appear (`compareFrom`)
 * — and the rest of the stage is left to look at.
 *
 * `framing` names a scene framing whose box holds the **whole** heart (or the
 * whole circuit): a closer look never crops the thing it is looking at.
 * `hold` stops the drawing's beat at a moment (presentation only; the solved
 * rate is unchanged). `emphasis` tints blood and moves no value.
 */
export const EXPLAINER_STAGES = [
  { id: 'start', at: 0, until: 5, framing: 'overview', anchor: 'cavity', highlight: [], emphasis: {}, compare: false },
  { id: 'cause', at: 5, until: 13, framing: 'heart', anchor: 'myocardium', highlight: ['myocardium'], emphasis: {}, compare: false, fall: { from: 2.5, to: 6 } },
  { id: 'inside', at: 13, until: 21, framing: 'heart', anchor: 'residual', highlight: ['residual'], emphasis: { residual: 1 }, compare: true, compareFrom: 1.8, hold: 'end-systole', holdFrom: 0.4 },
  { id: 'ejection', at: 21, until: 28, framing: 'outflow', anchor: 'outflow', highlight: ['ejection'], emphasis: { ejection: 1 }, compare: false },
  { id: 'circulation', at: 28, until: 35, framing: 'overview', anchor: 'arterial', highlight: ['arterial'], emphasis: {}, compare: false },
  { id: 'limits', at: 35, until: 40, framing: 'overview', anchor: 'myocardium', highlight: [], emphasis: {}, compare: false },
];

export const EXPLAINER_DURATION = EXPLAINER_STAGES.at(-1).until;

/** The stage playing at `t` (the last one once it has ended). */
export function stageAt(t) {
  return EXPLAINER_STAGES.find((stage) => t < stage.until) ?? EXPLAINER_STAGES.at(-1);
}

/**
 * What is shown at `t` beyond the model's value: which parts are pointed at,
 * whether the start's lines are drawn, and whether the beat is held.
 * Presentation only.
 *
 * @returns {{ highlight: string[], compare: boolean, hold: string|null }}
 */
export function presentationAt(t) {
  const stage = stageAt(t);
  const into = t - stage.at;
  return {
    highlight: stage.highlight ?? [],
    compare: Boolean(stage.compare) && into >= (stage.compareFrom ?? 0),
    hold: stage.hold && into >= (stage.holdFrom ?? 0) ? stage.hold : null,
  };
}

/**
 * Contractility at `t`: held through the first stage and the pointing part
 * of the second, falling through the second's `fall` window, held low after
 * it. Rounded to the control's grid (×5).
 */
export function contractilityAt(t) {
  const cause = EXPLAINER_STAGES.find((stage) => stage.id === 'cause');
  const k = Math.min(1, Math.max(0, (t - cause.at - cause.fall.from) / (cause.fall.to - cause.fall.from)));
  // Exactly the start before the fall and exactly the target after it: the
  // grid would otherwise round 2.74 to 2.7, and the first stage would already
  // be a changed condition.
  if (k <= 0) return EXPLAINER_CONTRACTILITY.from;
  if (k >= 1) return EXPLAINER_CONTRACTILITY.to;
  const eased = k * k * (3 - 2 * k);
  const raw = EXPLAINER_CONTRACTILITY.from + (EXPLAINER_CONTRACTILITY.to - EXPLAINER_CONTRACTILITY.from) * eased;
  const grid = CONTROL_DOMAIN.contractilityEesMmHgPerMl.step * 5;
  return Number((Math.round(raw / grid) * grid).toFixed(2));
}

const whole = (value) => String(Math.round(value));
const tenth = (value) => Number(value).toFixed(1);

/**
 * The stage's sentence, with the solved numbers of this moment filled in.
 *
 * @param {string} stageId
 * @param {{ before: object, now: object, input: object }} metrics solved: the
 *   start and now, and the input the current beat was solved for
 * @returns {{ heading: {en: string, ja: string}, text: {en: string, ja: string} }}
 */
export function captionFor(stageId, { before, now, input = {} }) {
  const copy = EXPLAINER_COPY.stages[stageId];
  const values = {
    ees: Number.isFinite(input.contractilityEesMmHgPerMl) ? input.contractilityEesMmHgPerMl.toFixed(2) : '',
    eesBefore: EXPLAINER_CONTRACTILITY.from.toFixed(2),
    svBefore: whole(before.strokeVolumeMl),
    sv: whole(now.strokeVolumeMl),
    esvBefore: whole(before.esvMl),
    esv: whole(now.esvMl),
    edvBefore: whole(before.edvMl),
    edv: whole(now.edvMl),
    coBefore: tenth(before.cardiacOutputLMin),
    co: tenth(now.cardiacOutputLMin),
    mapBefore: whole(before.meanArterialPressureMmHg),
    map: whole(now.meanArterialPressureMmHg),
    hr: whole(now.heartRatePerMin),
  };
  const fill = (text) => (text ?? '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  // A stage that points before it shows says so until its value has moved,
  // rather than "2.74 → 2.74".
  const pending = Boolean(copy.pending) && values.ees === values.eesBefore;
  return {
    heading: { en: copy.heading, ja: copy.headingJa },
    text: pending ? { en: copy.pending, ja: copy.pendingJa } : { en: fill(copy.text), ja: fill(copy.textJa) },
    // The line said on the model where there is no room for the sentence.
    brief: pending
      ? { en: copy.briefPending, ja: copy.briefPendingJa }
      : { en: fill(copy.brief ?? copy.heading), ja: fill(copy.briefJa ?? copy.headingJa) },
  };
}
