import { REEL_COPY } from '../../../../data/cardiacOutput.js';
import { CONTROL_DOMAIN } from '../../../../models/cardiacOutput.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';

/**
 * Fifteen seconds of one experiment.
 *
 * The whole sequence is: hold a heart, raise the resistance it pushes against,
 * watch the pressure rise while the output falls, put the resistance back, and
 * say what that means. Nothing else changes, and nothing is faded in for effect
 * that the model did not produce.
 *
 * ## What this file is and is not allowed to know
 *
 * It says **which input to set at which second** and **where to point the
 * camera**. It does not contain a single haemodynamic figure: every number on a
 * card comes from `scene.getMetrics()` through `readMetrics`, read fresh each
 * frame, so a recording cannot quote a value the interactive page would not
 * show. If it held its own numbers they would be a second source of truth with
 * no test behind it, and they would still be there after the model moved.
 *
 * ## It is a comparison of two settled states, and says so
 *
 * The caption on every frame says the sequence compares two settled conditions
 * rather than showing a treatment over time. The seconds between the two are
 * how long the camera takes, not how long anything takes in a person, and the
 * note is burned into the exported file by the existing recorder.
 *
 * ## Why the resistance moves in steps
 *
 * Each new condition is a fresh solve. Tweening it continuously would ask for
 * one every frame; quantising to the control's own step means the sequence
 * visits about ten conditions and the session's cache answers each of them once.
 * The reader sees the same thing either way, because a tenth of a unit of
 * resistance does not move a displayed digit.
 */

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/** Contiguous by construction: each cue starts where the last one ended. */
export const REEL_CUES = [
  { id: 'hook', at: 0.0, until: 2.6 },
  { id: 'raise', at: 2.6, until: 5.4 },
  { id: 'compare', at: 5.4, until: 9.4 },
  { id: 'residual', at: 9.4, until: 11.6 },
  { id: 'release', at: 11.6, until: 13.4 },
  { id: 'take-home', at: 13.4, until: 15.0 },
];

/** The two conditions the sequence moves between. */
const RESISTANCE = {
  from: CONTROL_DOMAIN.systemicResistanceMmHgSPerMl.default,
  to: 1.6,
};

/** Resting rate for the sequence, in cycles per second (~69/min). */
const BEAT_RATE = 1.15;
/** The one slowed beat, where the blood that stayed behind is the subject. */
const SLOW_BEAT = { from: 9.4, until: 11.6, rate: 0.34 };

const frac = (v) => v - Math.floor(v);

/**
 * Anything meant to survive to the final frame is given a window that ends past
 * the sequence, so a recording held at 15.0 s shows the take-home rather than
 * something mid-fade.
 */
const HOLD_PAST_END = REEL_DURATION + 1.5;

/**
 * Cardiac phase as a pure function of elapsed time.
 *
 * Both hearts are driven from this one value, so they reach end-diastole
 * together and the two chambers can be read against each other. Here that is
 * free of any claim: the sequence never changes the rate, so the two states
 * have the same rate anyway and synchronising them asserts nothing.
 *
 * Being a pure function of `t` also makes the sequence deterministic: the same
 * fifteen seconds render identically whatever the frame rate.
 */
export function cardiacPhaseAt(t) {
  if (t < SLOW_BEAT.from) return frac(t * BEAT_RATE);
  if (t < SLOW_BEAT.until) return frac((t - SLOW_BEAT.from) * SLOW_BEAT.rate);
  const atSlowEnd = frac((SLOW_BEAT.until - SLOW_BEAT.from) * SLOW_BEAT.rate);
  return frac(atSlowEnd + (t - SLOW_BEAT.until) * BEAT_RATE);
}

/** How far the resistance has moved, 0 at the starting condition and 1 at the raised one. */
const RESISTANCE_TRACK = [
  { t: 0.0, value: 0 },
  { t: 2.8, value: 0 },
  { t: 5.2, value: 1 },
  { t: 11.8, value: 1 },
  { t: 13.2, value: 0 },
  { t: 15.0, value: 0 },
];

/**
 * The systemic resistance at time `t`, rounded to the control's own step.
 *
 * Rounded because each distinct value is a fresh solve of the whole
 * circulation, and because the control itself only takes values on this grid —
 * a sequence that drove the model somewhere a reader cannot drive it would be
 * showing a condition the page cannot reproduce.
 */
export function resistanceAt(t) {
  const { step } = CONTROL_DOMAIN.systemicResistanceMmHgSPerMl;
  const raw = RESISTANCE.from + (RESISTANCE.to - RESISTANCE.from) * sampleTrack(RESISTANCE_TRACK, t);
  // Coarser than the slider on purpose: five times the step is about ten
  // conditions across the sequence, none of which differ by a displayed digit.
  const grid = step * 5;
  return Math.round(raw / grid) * grid;
}

/** Camera distance multiplier over time — a slow dolly, never a zoom stunt. */
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.14 },
  { t: 2.6, value: 1.0 },
  { t: 9.4, value: 1.0 },
  { t: 10.4, value: 0.86 },
  { t: 11.6, value: 0.86 },
  { t: 12.6, value: 1.0 },
  { t: 15.0, value: 1.04 },
];

/**
 * The camera for this instant.
 *
 * Returns the *description* `ReelMode` reads — a distance and a target in
 * components — not a pose. The shell owns the vector maths, because it also
 * owns the view direction and the controls' target and has to keep the three in
 * step. Returning `{ position, target }` from here type-checked fine, threw
 * `Cannot read properties of undefined` on every frame of the sequence, and
 * showed up as a recording that never finished rather than as an error anybody
 * would see.
 *
 * @param {number} t
 * @param {{ distance: number, targetX: number, targetY: number, targetZ: number }} base
 * @returns {{ distance: number, targetX: number, targetY: number, targetZ: number }}
 */
export function cameraAt(t, base) {
  return {
    distance: base.distance * sampleTrack(DISTANCE_TRACK, t),
    targetX: base.targetX,
    targetY: base.targetY,
    targetZ: base.targetZ,
  };
}

const pick = (language, en, ja) => (language === 'ja' ? ja : en);

/**
 * What the overlay shows at time `t`.
 *
 * `metrics` is whatever `readMetrics` returned this frame — the scene's own
 * read-out, before and after, already rounded the way the panel rounds it.
 */
export function overlayAt(t, { language, metrics }) {
  const hookOpacity = cueOpacity(t, 0.15, 2.7, 0.4);
  const takeHomeOpacity = cueOpacity(t, 13.5, HOLD_PAST_END, 0.4);

  return {
    title: takeHomeOpacity > 0
      ? {
          text: pick(language, REEL_COPY.takeHome.title, REEL_COPY.takeHome.titleJa),
          opacity: takeHomeOpacity,
          variant: 'take-home',
        }
      : {
          text: pick(language, REEL_COPY.hook.title, REEL_COPY.hook.titleJa),
          opacity: hookOpacity,
          variant: 'hook',
        },
    subtitle: {
      text: pick(language, REEL_COPY.hook.subtitle, REEL_COPY.hook.subtitleJa),
      opacity: cueOpacity(t, 0.6, 2.7, 0.4),
    },
    // Two cards, in the order they sit on screen: the starting condition on the
    // left, the current one on the right. Mean arterial pressure is the
    // headline because it is the figure a reader would take as reassurance, and
    // cardiac output is the row underneath it that says otherwise.
    cards: {
      opacity: cueOpacity(t, 2.7, HOLD_PAST_END, 0.4),
      items: metrics
        ? [
            {
              label: pick(language, REEL_COPY.cards.before.label, REEL_COPY.cards.before.labelJa),
              headlineKey: 'MAP',
              headline: metrics.map.before,
              headlineUnit: 'mmHg',
              rows: [`CO ${metrics.co.before} L/min`, `SV ${metrics.sv.before} mL`],
            },
            {
              label: pick(language, REEL_COPY.cards.after.label, REEL_COPY.cards.after.labelJa),
              headlineKey: 'MAP',
              headline: metrics.map.now,
              headlineUnit: 'mmHg',
              rows: [`CO ${metrics.co.now} L/min`, `SV ${metrics.sv.now} mL`],
            },
          ]
        : [],
    },
    badge: {
      text: pick(language, REEL_COPY.residual.label, REEL_COPY.residual.labelJa),
      opacity: cueOpacity(t, 9.6, 11.6, 0.4),
    },
    caption: captionAt(t, language),
    note: {
      text: pick(language, REEL_COPY.note.text, REEL_COPY.note.textJa),
      // Up from the very first frame, which is why the window opens before the
      // sequence does. Any one second of this will travel on its own as a
      // screenshot, and a frame that does not say "two settled conditions, not
      // a treatment over time" is a frame that says the opposite by omission.
      opacity: cueOpacity(t, -0.5, HOLD_PAST_END, 0.35),
    },
  };
}

function captionAt(t, language) {
  for (const [from, to, copy] of [
    [2.7, 5.4, REEL_COPY.raise],
    [5.5, 9.4, REEL_COPY.compare],
    [11.7, 13.4, REEL_COPY.release],
  ]) {
    const opacity = cueOpacity(t, from, to, 0.35);
    if (opacity > 0) return { text: pick(language, copy.caption, copy.captionJa), opacity };
  }
  return { text: '', opacity: 0 };
}

/** Emphasis on the blood that did not leave, 0..1. Presentation only. */
export function residualEmphasisAt(t) {
  return cueOpacity(t, 9.5, 11.7, 0.5);
}
