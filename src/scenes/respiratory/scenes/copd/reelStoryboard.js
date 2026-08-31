import { REEL_COPY } from '../../../../data/copd.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';

/**
 * The COPD scene's fifteen-second social sequence.
 *
 * ## What it is about
 *
 * Two lungs are asked for the same ventilation, and they go opposite ways. The
 * obstructed one's resting volume **climbs, breath after breath**, until there
 * is barely room left to breathe in; the healthy one settles *lower* than it
 * started, because a healthy lung recruits its expiratory muscles during
 * exercise. Neither of those is visible in a still image, and the divergence is
 * invisible in a single lung.
 *
 * ## Why this one is different from the others
 *
 * Asthma's and portal hypertension's sequences drive a stateless equilibrium
 * solve: the same dose always gives the same answer, immediately. This model
 * integrates. Dynamic hyperinflation *is* a many-breath phenomenon — the climb
 * is the finding, not a transient on the way to it — so the sequence has to
 * play the model forward in model time rather than cut between settled states.
 *
 * `CopdScene.renderAtSeconds` does that, and it is reproducible because the
 * step size is fixed and the workload at each step is a pure function of model
 * time. The same fifteen seconds render identically on any machine and at any
 * frame rate, which is what a screen recording needs.
 *
 * No number is written down in this file.
 */

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/** Five beats, contiguous by construction. */
export const REEL_CUES = [
  { id: 'hook', at: 0.0, until: 2.2 },
  { id: 'demand', at: 2.2, until: 6.4 },
  { id: 'stacking', at: 6.4, until: 10.4 },
  { id: 'opposite', at: 10.4, until: 12.6 },
  { id: 'take-home', at: 12.6, until: 15.0 },
];

const HOLD_PAST_END = REEL_DURATION + 1.5;

/**
 * The ventilation being asked for, over model time.
 *
 * Rest, then a climb, then a long hold — and the hold is the sequence. The
 * workload stops moving at 6.4 s and the lung keeps climbing for another four
 * seconds, which is the whole point: what is on screen after that is not the
 * demand rising, it is gas that was not given back.
 */
const DEMAND_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 2.0, value: 0.0 },
  { t: 6.4, value: 0.7 },
  { t: 15.0, value: 0.7 },
];

/** @param {number} t seconds since the sequence started */
export function demandAt(t) {
  return sampleTrack(DEMAND_TRACK, t);
}

/** Camera distance multiplier over time — a slow dolly, never a zoom stunt. */
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.14 },
  { t: 2.2, value: 1.0 },
  { t: 6.4, value: 0.92 },
  { t: 10.4, value: 0.92 },
  { t: 11.6, value: 1.0 },
  { t: 12.6, value: 1.06 },
  { t: 15.0, value: 1.06 },
];

/** A gentle drift, so the lungs sit in the upper half of a 9:16 frame. */
const TARGET_Y_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 2.2, value: -0.3 },
  { t: 10.4, value: -0.3 },
  { t: 12.6, value: 0.0 },
  { t: 15.0, value: 0.0 },
];

/**
 * Camera for a moment in the sequence, relative to the symmetric base framing.
 *
 * @param {number} t
 * @param {{ distance: number, targetX: number, targetY: number, targetZ: number }} base
 */
export function cameraAt(t, base) {
  return {
    distance: base.distance * sampleTrack(DISTANCE_TRACK, t),
    targetX: base.targetX,
    targetY: base.targetY + sampleTrack(TARGET_Y_TRACK, t),
    targetZ: base.targetZ,
  };
}

/**
 * The complete overlay state for a moment in the sequence.
 *
 * @param {number} t
 * @param {{ language: string, metrics: { normal: object, copd: object } }} context
 */
export function overlayAt(t, { language, metrics }) {
  const hookOpacity = cueOpacity(t, 0.1, 2.3, 0.4);
  const takeHomeOpacity = cueOpacity(t, 12.7, HOLD_PAST_END, 0.4);

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
      opacity: cueOpacity(t, 0.5, 2.3, 0.4),
    },
    // The headline is inspiratory capacity — the room left to breathe in, which
    // is the clinical measure of dynamic hyperinflation and the number that
    // closes. The rows are the volume the lung rests at and how many time
    // constants expiration is being given, which is the mechanism.
    cards: {
      opacity: cueOpacity(t, 2.3, HOLD_PAST_END, 0.4),
      items: [
        card(pick(language, REEL_COPY.cards.normal.label, REEL_COPY.cards.normal.labelJa), metrics.normal, language),
        card(pick(language, REEL_COPY.cards.copd.label, REEL_COPY.cards.copd.labelJa), metrics.copd, language),
      ],
    },
    badge: {
      text: pick(language, REEL_COPY.badge.label, REEL_COPY.badge.labelJa),
      opacity: cueOpacity(t, 2.4, 12.4, 0.4),
    },
    marker: { text: '', sub: '', opacity: 0 },
    caption: captionAt(t, language),
    note: {
      text: pick(language, REEL_COPY.note.text, REEL_COPY.note.textJa),
      opacity: cueOpacity(t, 0.4, HOLD_PAST_END, 0.5),
    },
  };
}

/** One card. Every figure comes from the scene's own read-out rows. */
function card(label, rows, language) {
  return {
    label,
    headlineKey: pick(language, 'room to inhale', '吸う余地'),
    headline: rows.ic,
    headlineUnit: 'L',
    rows: [
      `${pick(language, 'resting at', '安静位')} ${rows.eelv} L`,
      `${pick(language, 'time constants', '呼気時間 ÷ τ')} ${rows.tauCount}`,
    ],
  };
}

function captionAt(t, language) {
  const demand = cueOpacity(t, 2.6, 6.3, 0.4);
  if (demand > 0) {
    return { text: pick(language, REEL_COPY.demand.caption, REEL_COPY.demand.captionJa), opacity: demand };
  }
  const stacking = cueOpacity(t, 6.7, 10.3, 0.4);
  if (stacking > 0) {
    return { text: pick(language, REEL_COPY.stacking.caption, REEL_COPY.stacking.captionJa), opacity: stacking };
  }
  const opposite = cueOpacity(t, 10.7, 12.5, 0.4);
  if (opposite > 0) {
    return { text: pick(language, REEL_COPY.opposite.caption, REEL_COPY.opposite.captionJa), opacity: opposite };
  }
  return { text: '', opacity: 0 };
}

function pick(language, en, ja) {
  return language === 'en' ? en : ja;
}
