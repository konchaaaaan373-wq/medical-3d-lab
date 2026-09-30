import { directionOf } from '../../../../models/cardiacOutputLesson.js';
import {
  LESSON_CONDITION_COPY,
  LESSON_GUIDE,
  LESSON_STEPS,
  LESSON_TAGS,
} from '../../../../data/cardiacOutputLesson.js';

/**
 * The introductory lesson's explanation: five scenes, played on the same
 * model the reader's buttons drive (`LessonSession`).
 *
 *   1. A — a heart that sends out little
 *   2. the vasoconstrictor action is added, where it acts (the small vessels)
 *   3. B — read the pressure, then the output
 *   4. C beside B, stopped at the same moment of the beat
 *   5. about the same pressure, different output
 *
 * Each scene **points, then shows, then leaves time to read** (the owner's rule
 * from the earlier explanation, 2026-09-27): its tags name the part first, the
 * change happens a moment later, and the rest of the scene is left to look at.
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
 * - `other`: whether C stands beside it, from `otherFrom` seconds in.
 * - `highlight`: parts brightened (presentation only).
 * - `tags`: short words on the model — at most two at once.
 * - `holdFrom`: from this many seconds in, the beat is held at the moment of
 *   comparison (the end of ejection), so what one beat sent out can be compared
 *   at the same instant. Presentation: the solved rate does not change.
 */
const SCENES = [
  {
    id: 'start',
    duration: 8,
    rung: 'A',
    other: false,
    highlight: ['ejected'],
    tags: [
      { id: 'heart', unit: 'primary', part: 'heart', words: 'heart' },
      { id: 'ejected', unit: 'primary', part: 'ejected', words: 'ejected' },
    ],
  },
  {
    id: 'constrict',
    duration: 9,
    walk: { from: 1.6, to: 4.6 },
    other: false,
    highlight: ['bed'],
    tags: [{ id: 'bed', unit: 'primary', part: 'bed', words: 'bedNarrowing' }],
  },
  {
    id: 'result',
    duration: 11,
    rung: 'B',
    other: false,
    highlight: ['gauge', 'ejected'],
    holdFrom: 3,
    tags: [
      { id: 'gauge', unit: 'primary', part: 'gauge', words: 'gaugeUp' },
      { id: 'ejected', unit: 'primary', part: 'ejected', words: 'ejectedChange' },
    ],
  },
  {
    id: 'other',
    duration: 11,
    rung: 'B',
    other: true,
    highlight: ['ejected'],
    holdFrom: 3.5,
    // "Stopped at the same moment" is the scene's note. As a tag it stood over
    // both hearts on a phone, where there is least room for them.
    tags: [],
  },
  {
    // No tag: the words are in the caption, and a label stretched across two
    // circulations crossed the one it was not about. What is pointed at glows.
    id: 'conclusion',
    duration: 11,
    rung: 'B',
    other: true,
    highlight: ['gauge', 'ejected'],
    holdFrom: 0,
    tags: [],
  },
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

/** The scene playing at `t`. */
export const stepAt = (t) => LESSON_TIMELINE[stepIndexAt(t)];

const smooth = (k) => k * k * (3 - 2 * k);

/**
 * What the model and the drawing are at `t`.
 *
 * @param {number} t seconds into the explanation
 * @param {number} lastRung the index of B on the session's ladder
 * @returns {{ step: object, index: number, into: number, rung: number, showOther: boolean,
 *   highlight: string[], tags: object[], hold: boolean }}
 */
export function presentationAt(t, lastRung) {
  const index = stepIndexAt(t);
  const step = LESSON_TIMELINE[index];
  const into = Math.max(0, t - step.at);
  let rung = step.rung === 'B' ? lastRung : 0;
  if (step.walk) {
    const k = Math.min(1, Math.max(0, (into - step.walk.from) / (step.walk.to - step.walk.from)));
    rung = Math.round(smooth(k) * lastRung);
  }
  return {
    step,
    index,
    into,
    rung,
    showOther: Boolean(step.other),
    highlight: step.highlight ?? [],
    tags: step.tags ?? [],
    hold: step.holdFrom != null && into >= step.holdFrom,
  };
}

const whole = (value) => String(Math.round(value));
const tenth = (value) => Number(value).toFixed(1);

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

/**
 * The words of a tag, resolved against the solved beats where they depend on
 * them (which way one beat's output went).
 *
 * @param {string} words a key of `LESSON_TAGS`, or `ejectedChange`
 * @param {{ A: object, B: object }} solved
 */
export function tagWords(words, solved) {
  if (words === 'ejectedChange') {
    // The same direction the caption and the guide say, at the same
    // precision: read per beat and per minute at two resolutions, the tag
    // could say "less" beside a caption saying "about the same". A and B share
    // a heart rate (`lessonClaimProblems` holds it), so the two directions are
    // one.
    const direction = outputDirection(solved);
    return LESSON_TAGS[direction === 'down' ? 'ejectedLess' : direction === 'up' ? 'ejectedMore' : 'ejectedSame'];
  }
  return LESSON_TAGS[words];
}

/** "B（A＋血管収縮作用）" — a condition, said in full. */
export function conditionName(id) {
  const copy = LESSON_CONDITION_COPY[id];
  if (!copy) return null;
  return { en: `${copy.letter} (${copy.name.en})`, ja: `${copy.letter}（${copy.name.ja}）` };
}

/**
 * The one line under the question that says what to do next, from the state
 * the reader is in. `stopped` is set when the explanation was interrupted and
 * says what the reader now has and what it is compared with.
 *
 * @param {{ mode: 'idle'|'manual'|'playing', primaryId: 'A'|'B'|null, targetId: 'A'|'B',
 *   showOther: boolean, solved: object, stopped?: boolean }} state
 * @returns {{ en: string, ja: string }}
 */
export function guideFor({ mode, primaryId, targetId, showOther, solved, stopped = false }) {
  if (stopped) {
    // Two comparisons, two sentences: B beside C is "side by side", and only A
    // is ever "what it is compared with" (before the intervention).
    const id = primaryId ?? targetId;
    const now = conditionName(id);
    const template = showOther ? LESSON_GUIDE.stoppedPair : id === 'B' ? LESSON_GUIDE.stoppedAlone : LESSON_GUIDE.stoppedStart;
    return { en: template.en.replace('{now}', now.en), ja: template.ja.replace('{now}', now.ja) };
  }
  if (mode === 'idle') return LESSON_GUIDE.idle;
  if (primaryId === null) return targetId === 'B' ? LESSON_GUIDE.changing : LESSON_GUIDE.releasing;
  if (showOther) return primaryId === 'B' ? LESSON_GUIDE.pairBC : LESSON_GUIDE.pairAC;
  if (primaryId === 'A') return LESSON_GUIDE.manualStart;
  const direction = outputDirection(solved);
  return direction === 'down' ? LESSON_GUIDE.afterDown : direction === 'up' ? LESSON_GUIDE.afterUp : LESSON_GUIDE.afterSame;
}

/**
 * The read-out: one card for the main circulation and, while it is shown, one
 * for C. The main card carries its comparison — A, "before" — only while that
 * is the comparison on screen (`LessonSession.reference`).
 *
 * @param {import('./lessonSession.js').LessonSession} session
 */
export function readoutFor(session) {
  const card = (id, result, reference) => ({
    id,
    walking: id === null,
    map: whole(result.metrics.meanArterialPressureMmHg),
    co: tenth(result.metrics.cardiacOutputLMin),
    reference: reference
      ? {
          id: 'A',
          map: whole(reference.metrics.meanArterialPressureMmHg),
          co: tenth(reference.metrics.cardiacOutputLMin),
          mapDirection: directionOf(reference.metrics.meanArterialPressureMmHg, result.metrics.meanArterialPressureMmHg, 1),
          coDirection: directionOf(reference.metrics.cardiacOutputLMin, result.metrics.cardiacOutputLMin, 0.1),
        }
      : null,
  });
  return {
    primary: card(session.primaryId, session.primary, session.reference),
    other: session.showOther ? card('C', session.other, null) : null,
  };
}
