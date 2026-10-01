import { directionOf } from '../../../../models/cardiacOutputLesson.js';
import { INTERVENTION_IDS, INTERVENTION_PROFILES } from '../../../../models/cardiacInterventions.js';
import {
  LESSON_CHANGING,
  LESSON_CONDITION_COPY,
  LESSON_GUIDE,
  LESSON_STEPS,
  LESSON_TERMS,
} from '../../../../data/cardiacOutputLesson.js';
import { circulationDrawing } from './lessonFigureGeometry.js';

/**
 * The introductory lesson's explanation: five scenes, played on the same
 * figure and the same session the reader's buttons drive (`LessonSession`).
 *
 *   1. start (A) — how the heart, the small vessels and the pressure connect
 *   2. the vessel-narrowing action is added: all the small vessels narrow
 *   3. after (B) — the pressure went up; what the heart sends out per minute
 *   4. C beside B — a different circulation, not B after treatment
 *   5. about the same pressure, different output
 *
 * One thing per scene (owner's review, 2026-10-01). Each **points, then
 * shows, then leaves time to read**: what a scene is about lights up first, its
 * change happens a moment later, and the rest of the scene is for reading.
 *
 * Everything here is a function of the explanation's own clock `t`, so
 * seeking — back a scene, forward a scene, from the start — lands on exactly
 * the same condition every time. **This file holds no haemodynamic figure**:
 * a sentence's numbers are read from the solved beats when it is shown.
 */

/**
 * The scenes, contiguous by construction (`at` is derived below).
 *
 * - `rung`: where the main circulation is — 'A' or 'B' — or `walk`, the window
 *   (seconds into the scene) over which it walks from A to B.
 * - `other`: whether C stands beside it.
 * - `refill`: the window over which both tubes fill from empty together, so
 *   "in the same minute" is something seen (presentation; the solved outputs
 *   do not change).
 * - `highlight`: the parts the scene is about (presentation only).
 */
const SCENES = [
  { id: 'start', duration: 5.5, rung: 'A', other: false, highlight: ['heart', 'bed', 'dial', 'tube'] },
  { id: 'constrict', duration: 6.5, walk: { from: 1.0, to: 3.4 }, other: false, highlight: ['bed'] },
  { id: 'result', duration: 7.5, rung: 'B', other: false, highlight: ['dial', 'tube'] },
  { id: 'other', duration: 6.5, rung: 'B', other: true, refill: { from: 0.6, to: 2.8 }, highlight: ['tube'] },
  { id: 'conclusion', duration: 6.5, rung: 'B', other: true, highlight: ['dial', 'tube'] },
];

export const LESSON_TIMELINE = Object.freeze(
  SCENES.reduce((list, scene) => {
    const at = list.length ? list.at(-1).until : 0;
    list.push(Object.freeze({ ...scene, at, until: at + scene.duration }));
    return list;
  }, [])
);

export const LESSON_DURATION = LESSON_TIMELINE.at(-1).until;

/** The index of the scene playing at `t` (the last once it has ended). */
export function stepIndexAt(t) {
  const index = LESSON_TIMELINE.findIndex((scene) => t < scene.until);
  return index < 0 ? LESSON_TIMELINE.length - 1 : index;
}


const smooth = (k) => k * k * (3 - 2 * k);
const progress = (into, window) => Math.min(1, Math.max(0, (into - window.from) / (window.to - window.from)));

/**
 * What the model and the figure are at `t`.
 *
 * @param {number} t seconds into the explanation
 * @param {number} lastRung the index of B on the session's ladder
 * @returns {{ step: object, index: number, into: number, rung: number, showOther: boolean,
 *   highlight: string[], refill: number }}
 */
export function presentationAt(t, lastRung) {
  const index = stepIndexAt(t);
  const step = LESSON_TIMELINE[index];
  const into = Math.max(0, t - step.at);
  let rung = step.rung === 'B' ? lastRung : 0;
  if (step.walk) rung = Math.round(smooth(progress(into, step.walk)) * lastRung);
  return {
    step,
    index,
    into,
    rung,
    showOther: Boolean(step.other),
    // The first moment of a scene points; the change comes after.
    highlight: step.highlight ?? [],
    refill: step.refill ? smooth(progress(into, step.refill)) : 1,
  };
}

const whole = (value) => String(Math.round(value));
const tenth = (value) => Number(value).toFixed(1);

/** The vessel-narrowing action's own factor, read from the model. */
export function interventionFactor() {
  return String(INTERVENTION_PROFILES[INTERVENTION_IDS.VASOCONSTRICTION].effects.systemicResistanceMmHgSPerMl.multiply);
}

/**
 * The figures a sentence may carry, at the precision the screen shows them.
 *
 * @param {{ A: object, B: object, C: object }} solved the solver's results
 */
export function lessonValues(solved) {
  const m = (id) => solved[id].metrics;
  return {
    mapA: whole(m('A').meanArterialPressureMmHg),
    mapB: whole(m('B').meanArterialPressureMmHg),
    mapC: whole(m('C').meanArterialPressureMmHg),
    coA: tenth(m('A').cardiacOutputLMin),
    coB: tenth(m('B').cardiacOutputLMin),
    coC: tenth(m('C').cardiacOutputLMin),
    hr: whole(m('B').heartRatePerMin),
    factor: interventionFactor(),
  };
}

/**
 * Which way the output went from A to B, at the tenth of a litre it is shown
 * to. The lesson's sentences are chosen from this — never from an expectation.
 *
 * @param {{ A: object, B: object }} solved
 * @returns {'up'|'down'|'same'}
 */
export function outputDirection(solved) {
  return directionOf(solved.A.metrics.cardiacOutputLMin, solved.B.metrics.cardiacOutputLMin, 0.1);
}

const fillWith = (values) => (text) => String(text ?? '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const both = (pair, fill) => ({ en: fill(pair?.en), ja: fill(pair?.ja) });

/**
 * A scene's words, with the solved figures in.
 *
 * @param {string} stepId
 * @param {{ A: object, B: object, C: object }} solved
 * @returns {{ heading: {en:string, ja:string}, text: {en:string, ja:string}, note: {en:string, ja:string}|null }}
 */
export function captionFor(stepId, solved) {
  const copy = LESSON_STEPS[stepId];
  const fill = fillWith(lessonValues(solved));
  const text = stepId === 'result' ? copy.text[outputDirection(solved)] : copy.text;
  return {
    heading: both(copy.heading, fill),
    text: both(text, fill),
    note: copy.note ? both(copy.note, fill) : null,
  };
}

/** "血管を縮めた後（B）" — a condition, said in full. */
export function conditionName(id) {
  const copy = LESSON_CONDITION_COPY[id];
  if (!copy) return null;
  return { en: `${copy.role.en} (${copy.letter})`, ja: `${copy.role.ja}（${copy.letter}）` };
}

/**
 * The one line under the figure that says what to do next, from the state the
 * reader is in. `stopped` is set when the explanation was interrupted and says
 * what the reader now has and what it is compared with.
 *
 * @param {{ primaryId: 'A'|'B'|null, targetId: 'A'|'B', showOther: boolean, solved: object, stopped?: boolean }} state
 * @returns {{ en: string, ja: string }}
 */
export function guideFor({ primaryId, targetId, showOther, solved, stopped = false }) {
  if (stopped) {
    const id = primaryId ?? targetId;
    const now = conditionName(id);
    const template = showOther ? LESSON_GUIDE.stoppedPair : id === 'B' ? LESSON_GUIDE.stoppedAlone : LESSON_GUIDE.stoppedStart;
    return { en: template.en.replace('{now}', now.en), ja: template.ja.replace('{now}', now.ja) };
  }
  if (primaryId === null) return targetId === 'B' ? LESSON_GUIDE.changing : LESSON_GUIDE.releasing;
  if (showOther) return LESSON_GUIDE.pair;
  if (primaryId === 'A') return LESSON_GUIDE.start;
  const direction = outputDirection(solved);
  return direction === 'down' ? LESSON_GUIDE.afterDown : direction === 'up' ? LESSON_GUIDE.afterUp : LESSON_GUIDE.afterSame;
}

/**
 * Every line the guide can say for these solved beats — for the page to keep
 * the guide's place the height of the longest, so the figure above it never
 * changes size when the line does.
 *
 * @param {{ A: object, B: object, C: object }} solved
 */
export function allGuides(solved) {
  const states = [
    { primaryId: 'A', targetId: 'A', showOther: false },
    { primaryId: null, targetId: 'B', showOther: false },
    { primaryId: null, targetId: 'A', showOther: false },
    { primaryId: 'B', targetId: 'B', showOther: false },
    { primaryId: 'B', targetId: 'B', showOther: true },
  ];
  return [
    ...states.map((state) => guideFor({ ...state, solved })),
    ...states
      .filter((state) => state.primaryId)
      .map((state) => guideFor({ ...state, solved, stopped: true })),
  ];
}

/**
 * What the figure draws: one strip for the main circulation and, while it is
 * shown, one for C. The main strip carries its comparison — A, as cream "start"
 * marks — only while that is the comparison on screen
 * (`LessonSession.reference`).
 *
 * @param {import('./lessonSession.js').LessonSession} session
 */
export function stripsFor(session) {
  const strip = (slot, id, result, reference) => {
    const m = result.metrics;
    return {
      slot,
      id: id ?? 'changing',
      copy: id ? LESSON_CONDITION_COPY[id] : LESSON_CHANGING,
      drawing: circulationDrawing(result, reference),
      values: {
        map: whole(m.meanArterialPressureMmHg),
        co: tenth(m.cardiacOutputLMin),
        mapDirection: reference ? directionOf(reference.metrics.meanArterialPressureMmHg, m.meanArterialPressureMmHg, 1) : null,
        coDirection: reference ? directionOf(reference.metrics.cardiacOutputLMin, m.cardiacOutputLMin, 0.1) : null,
      },
      // For a check: what this strip was drawn from, unrounded.
      solved: {
        meanArterialPressureMmHg: m.meanArterialPressureMmHg,
        cardiacOutputLMin: m.cardiacOutputLMin,
        systemicResistanceMmHgSPerMl: m.systemicResistanceMmHgSPerMl,
        heartRatePerMin: m.heartRatePerMin,
      },
      narrowed: (result.metrics.systemicResistanceMmHgSPerMl ?? 0) > session.ladder[0].metrics.systemicResistanceMmHgSPerMl,
    };
  };
  const strips = [strip('primary', session.primaryId, session.primary, session.reference)];
  if (session.showOther) strips.push(strip('other', 'C', session.other, null));
  return strips;
}

/**
 * The figure, said in words for a screen reader: the strips in order, each
 * with its two results — the plain name first, the term after.
 *
 * @param {ReturnType<typeof stripsFor>} strips
 * @returns {{ en: string, ja: string }}
 */
export function figureSummary(strips) {
  const say = (strip, language) => {
    const copy = strip.copy;
    const name = copy.letter === '…' ? copy.role[language] : `${copy.role[language]}（${copy.letter}）`;
    const pressure = LESSON_TERMS.pressure.full[language];
    const output = LESSON_TERMS.output.full[language];
    return language === 'ja'
      ? `${name}：${pressure} ${strip.values.map} mmHg、${output} ${strip.values.co} L。`
      : `${name.replace('（', ' (').replace('）', ')')}: ${pressure} ${strip.values.map} mmHg; ${output} ${strip.values.co} L.`;
  };
  return { en: strips.map((strip) => say(strip, 'en')).join(' '), ja: strips.map((strip) => say(strip, 'ja')).join('') };
}
