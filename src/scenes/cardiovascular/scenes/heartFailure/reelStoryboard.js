import { REEL_COPY } from '../../../../data/heartFailure.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';
import { STAGES } from '../../../../data/heartFailure.js';
import { sampleHemodynamics } from './hemodynamics.js';
import { volumeAtPhase } from './circulation.js';

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/**
 * The six beats of the sequence. Contiguous by construction: each cue starts
 * where the previous one ends, and the last ends at REEL_DURATION.
 */
export const REEL_CUES = [
  { id: 'hook', at: 0.0, until: 1.8 },
  { id: 'compare', at: 1.8, until: 6.0 },
  { id: 'beat', at: 6.0, until: 9.5 },
  { id: 'ejection-fraction', at: 9.5, until: 11.5 },
  { id: 'congestion', at: 11.5, until: 13.5 },
  { id: 'take-home', at: 13.5, until: 15.0 },
];

/** Resting rate used for the sequence, in cycles per second (~69 bpm). */
const REEL_BEAT_RATE = 1.15;
/** The single slowed beat that carries the ED -> ES comparison. */
const SLOW_BEAT = { from: 6.0, until: 9.5, rate: 0.34 };

const frac = (v) => v - Math.floor(v);

/**
 * Anything meant to survive to the last frame gets a window ending here rather
 * than at REEL_DURATION, so nothing is mid-fade when the sequence stops.
 */
const HOLD_PAST_END = REEL_DURATION + 1.5;

/**
 * Cardiac phase as a pure function of elapsed time.
 *
 * SNS comparison visualization uses synchronized phase for side-by-side
 * interpretability: both hearts are driven from this single value, so they
 * reach end-diastole and end-systole at the same instant even though the model
 * gives them different heart rates. The interactive physiological model is
 * untouched — this only applies while the reel is running.
 *
 * Being a pure function of `t` also makes the sequence deterministic: the same
 * 15 seconds render identically regardless of frame rate.
 */
export function cardiacPhaseAt(t) {
  if (t < SLOW_BEAT.from) return frac(t * REEL_BEAT_RATE);
  // The slow beat starts exactly at end-diastole so the ED -> ES change reads.
  if (t < SLOW_BEAT.until) return frac((t - SLOW_BEAT.from) * SLOW_BEAT.rate);
  const atSlowEnd = frac((SLOW_BEAT.until - SLOW_BEAT.from) * SLOW_BEAT.rate);
  return frac(atSlowEnd + (t - SLOW_BEAT.until) * REEL_BEAT_RATE);
}

/** Camera distance multiplier over time — a slow dolly, never a zoom stunt. */
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.16 },
  { t: 1.8, value: 1.0 },
  { t: 6.0, value: 1.0 },
  { t: 7.2, value: 0.84 },
  { t: 9.5, value: 0.84 },
  { t: 10.4, value: 0.96 },
  { t: 11.5, value: 0.96 },
  { t: 12.4, value: 0.86 },
  { t: 13.5, value: 0.86 },
  { t: 14.3, value: 1.02 },
  { t: 15.0, value: 1.02 },
];

/** Horizontal target offset: only the congestion beat leans towards HFrEF. */
const TARGET_X_TRACK = [
  { t: 0.0, value: 0 },
  { t: 11.5, value: 0 },
  { t: 12.4, value: 2.4 },
  { t: 13.5, value: 2.4 },
  { t: 14.3, value: 0 },
  { t: 15.0, value: 0 },
];

/**
 * How far to swing off the head-on axis, 0..1.
 *
 * The comparison beats stay head-on so neither heart is closer to the camera
 * than the other. The congestion beat is not a comparison, so it swings to a
 * three-quarter view where the pulmonary veins are no longer hidden directly
 * behind the ventricle.
 */
const DIRECTION_BLEND_TRACK = [
  { t: 0.0, value: 0 },
  { t: 11.5, value: 0 },
  { t: 12.4, value: 1 },
  { t: 13.5, value: 1 },
  { t: 14.3, value: 0 },
  { t: 15.0, value: 0 },
];

const TARGET_Y_TRACK = [
  // The opening headline sits centre-frame, so the hearts drop into the lower
  // half for the hook and rise back to centre once the cards take over.
  { t: 0.0, value: 3.6 },
  { t: 1.9, value: 0 },
  { t: 11.5, value: 0 },
  { t: 12.4, value: 3.6 },
  { t: 13.5, value: 3.6 },
  { t: 14.3, value: 0 },
  { t: 15.0, value: 0 },
];

/**
 * Camera for a moment in the sequence, relative to the symmetric base framing.
 * @param {number} t
 * @param {{ distance: number, targetX: number, targetY: number, targetZ: number }} base
 */
export function cameraAt(t, base) {
  return {
    distance: base.distance * sampleTrack(DISTANCE_TRACK, t),
    targetX: base.targetX + sampleTrack(TARGET_X_TRACK, t),
    targetY: base.targetY + sampleTrack(TARGET_Y_TRACK, t),
    targetZ: base.targetZ,
    directionBlend: sampleTrack(DIRECTION_BLEND_TRACK, t),
  };
}

/** Whether the congestion overlay should be showing at this moment. */
export function congestionVisibleAt(t) {
  return t >= 11.3 && t < 14.0;
}

/**
 * Visualization-only emphasis on the congestion story, 0..1.
 *
 * Ramps up for the congestion beat and back down for the take-home. It drives
 * legibility only — brightness, the outward wave, vessel visibility and how far
 * the healthy heart steps back. No physiological value depends on it.
 */
export function congestionEmphasisAt(t) {
  return sampleTrack(EMPHASIS_TRACK, t);
}

const EMPHASIS_TRACK = [
  { t: 0.0, value: 0 },
  { t: 11.4, value: 0 },
  { t: 12.2, value: 1 },
  { t: 13.4, value: 1 },
  { t: 14.1, value: 0 },
  { t: 15.0, value: 0 },
];

/** Picks one language. The video never shows both — social viewers read little. */
function pick(language, en, ja) {
  return language === 'en' ? en : ja;
}

const format = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) => (values[key] == null ? '' : String(values[key])));

/**
 * The beat the sequence is showing, solved once and kept.
 *
 * Memoised because the storyboard is evaluated every frame and solving is not
 * free.
 */
let cachedBeat = null;
function beat() {
  if (cachedBeat === null) {
    const progress = STAGES.find((stage) => stage.id === 'systolic-dysfunction').at;
    cachedBeat = sampleHemodynamics(progress);
  }
  return cachedBeat;
}

/**
 * How strongly an ED or ES marker should show, from where the ventricle on
 * screen actually is in its volume range.
 *
 * Volume rather than phase, because a ventricle sits at each of those volumes
 * for a stretch of the cycle rather than passing through an instant: it holds
 * end-diastolic volume through isovolumic contraction and end-systolic volume
 * through isovolumic relaxation. A fixed phase would put the tag beside a heart
 * that had already moved on, and would need re-tuning every time the model
 * changed. This does not.
 *
 * @param {number} phase 0..1
 * @param {'ed'|'es'} which
 */
function volumeMarker(phase, which) {
  const state = beat();
  const span = state.edvMl - state.esvMl;
  if (!(span > 0)) return 0;
  const target = which === 'ed' ? state.edvMl : state.esvMl;
  const volume = volumeAtPhase(state.cycle, phase);
  // Within a sixth of the stroke volume counts as "at" that end of the beat.
  const closeness = 1 - Math.abs(volume - target) / (span * 0.17);
  if (closeness <= 0) return 0;
  return closeness * closeness * (3 - 2 * closeness);
}

/**
 * The complete overlay state for a moment in the sequence.
 *
 * Every number comes from `metrics`, which the scene derives from its own
 * state — the sequence never carries its own copy of EF, EDV or ESV.
 *
 * @param {number} t seconds since the sequence started
 * @param {{ language: string, metrics: {ef: {normal: number, hfref: number},
 *   edv: {normal: number, hfref: number}, esv: {normal: number, hfref: number}} }} context
 */
export function overlayAt(t, { language, metrics }) {
  const values = {
    normalEf: metrics.ef.normal,
    hfrefEf: metrics.ef.hfref,
  };
  const phase = cardiacPhaseAt(t);
  const beatWindow = t >= 6.0 && t < 9.5;

  const hookOpacity = cueOpacity(t, 0.1, 1.95, 0.4);
  // Elements that must still be on screen at the final frame are given windows
  // that run past the end of the sequence: a recording held on 15.0 s should
  // show the take-home, not a frame that has faded to nothing.
  const takeHomeOpacity = cueOpacity(t, 13.6, HOLD_PAST_END, 0.4);

  return {
    title: takeHomeOpacity > 0
      ? {
          text: pick(language, REEL_COPY.takeHome.title, REEL_COPY.takeHome.titleJa),
          opacity: takeHomeOpacity,
          variant: 'take-home',
        }
      : {
          text: format(pick(language, REEL_COPY.hook.title, REEL_COPY.hook.titleJa), values),
          opacity: hookOpacity,
          variant: 'hook',
        },
    subtitle: {
      text: pick(language, REEL_COPY.hook.subtitle, REEL_COPY.hook.subtitleJa),
      opacity: cueOpacity(t, 0.45, 1.95, 0.4),
    },
    cards: {
      opacity: cueOpacity(t, 1.95, HOLD_PAST_END, 0.4),
      normal: {
        label: pick(language, REEL_COPY.cards.normal.label, REEL_COPY.cards.normal.labelJa),
        ef: metrics.ef.normal,
        edv: metrics.edv.normal,
        esv: metrics.esv.normal,
      },
      hfref: {
        label: pick(language, REEL_COPY.cards.hfref.label, REEL_COPY.cards.hfref.labelJa),
        ef: metrics.ef.hfref,
        edv: metrics.edv.hfref,
        esv: metrics.esv.hfref,
      },
    },
    residual: {
      text: pick(language, REEL_COPY.residual.label, REEL_COPY.residual.labelJa),
      opacity: cueOpacity(t, 3.5, 6.0, 0.4),
    },
    endDiastole: {
      text: REEL_COPY.beat.endDiastole.tag,
      sub: pick(language, REEL_COPY.beat.endDiastole.label, REEL_COPY.beat.endDiastole.labelJa),
      opacity: beatWindow ? volumeMarker(phase, 'ed') * cueOpacity(t, 5.75, 9.5, 0.25) : 0,
    },
    endSystole: {
      text: REEL_COPY.beat.endSystole.tag,
      sub: pick(language, REEL_COPY.beat.endSystole.label, REEL_COPY.beat.endSystole.labelJa),
      opacity: beatWindow ? volumeMarker(phase, 'es') * cueOpacity(t, 5.75, 9.5, 0.25) : 0,
    },
    caption: captionAt(t, language),
    note: {
      text: congestionVisibleAt(t)
        ? pick(language, REEL_COPY.congestion.note, REEL_COPY.congestion.noteJa)
        : pick(language, REEL_COPY.note.text, REEL_COPY.note.textJa),
      opacity: cueOpacity(t, 0.4, HOLD_PAST_END, 0.5),
    },
  };
}

function captionAt(t, language) {
  const beat = cueOpacity(t, 6.3, 9.4, 0.4);
  if (beat > 0) {
    return { text: pick(language, REEL_COPY.beat.caption, REEL_COPY.beat.captionJa), opacity: beat };
  }
  const ef = cueOpacity(t, 9.6, 11.5, 0.4);
  if (ef > 0) {
    return {
      text: pick(language, REEL_COPY.ejectionFraction.caption, REEL_COPY.ejectionFraction.captionJa),
      opacity: ef,
    };
  }
  const congestion = cueOpacity(t, 11.6, 13.5, 0.4);
  if (congestion > 0) {
    return {
      text: pick(language, REEL_COPY.congestion.caption, REEL_COPY.congestion.captionJa),
      opacity: congestion,
    };
  }
  return { text: '', opacity: 0 };
}
