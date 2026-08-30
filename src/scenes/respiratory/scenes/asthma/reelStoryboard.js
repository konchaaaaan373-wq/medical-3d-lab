import { REEL_COPY } from '../../../../data/asthma.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';

/**
 * The asthma scene's fifteen-second social sequence.
 *
 * ## What it is about
 *
 * One proposition, and it is the one the interactive scene keeps having to
 * explain in words: **airway hyperresponsiveness is not "the lung reacts and a
 * normal one does not". It is that the knee of the dose-response curve sits at
 * a lower dose.** A normal lung tips too, given enough. The video earns its
 * fifteen seconds by showing both halves of that, which no single tree and no
 * still image can.
 *
 * So the dose climbs once, pauses at the asthmatic knee where exactly one tree
 * has gone patchy, and then climbs again to where both have. The pause is the
 * whole video; everything before it is setup and everything after it is the
 * honesty.
 *
 * ## Why it is deterministic
 *
 * Every function here is a pure function of elapsed seconds, and the model
 * behind the scene is a stateless equilibrium solve — the same dose gives the
 * same lung however the frames fall. So fifteen seconds render identically on
 * any machine and at any frame rate, which is what a screen recording needs.
 *
 * No number is written down in this file. The captions and cards interpolate
 * whatever the scene's own read-out says at that instant, so a frame cannot
 * quote a figure the interactive scene would not.
 */

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/**
 * Five beats. Contiguous by construction: each starts where the last ended.
 */
export const REEL_CUES = [
  { id: 'hook', at: 0.0, until: 2.2 },
  { id: 'climb', at: 2.2, until: 5.6 },
  { id: 'knee', at: 5.6, until: 9.4 },
  { id: 'full', at: 9.4, until: 12.6 },
  { id: 'take-home', at: 12.6, until: 15.0 },
];

/**
 * Anything meant to survive to the last frame gets a window ending here rather
 * than at REEL_DURATION, so nothing is mid-fade when the sequence stops.
 */
const HOLD_PAST_END = REEL_DURATION + 1.5;

/**
 * The dose, over time.
 *
 * Two climbs with a hold between them, and the hold is the point: it sits at
 * the dose where the asthmatic tree has tipped and the normal one has not, and
 * it lasts long enough to be read rather than glimpsed. The second climb goes
 * to full, where both tip.
 *
 * The values are positions on the scene's own axis, not doses of anything.
 */
const STIMULUS_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 1.6, value: 0.0 },
  { t: 5.6, value: 0.62 },
  { t: 9.4, value: 0.62 },
  { t: 12.2, value: 1.0 },
  { t: 15.0, value: 1.0 },
];

/** @param {number} t seconds since the sequence started */
export function stimulusAt(t) {
  return sampleTrack(STIMULUS_TRACK, t);
}

/**
 * Camera distance multiplier over time — a slow dolly, never a zoom stunt.
 *
 * In for the hold, because that is where the difference between the two crowns
 * has to be legible; back out for the take-home so the pair reads as a pair.
 */
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.14 },
  { t: 2.2, value: 1.0 },
  { t: 5.6, value: 0.9 },
  { t: 9.4, value: 0.9 },
  { t: 10.6, value: 1.0 },
  { t: 12.6, value: 1.06 },
  { t: 15.0, value: 1.06 },
];

/** A gentle drift downwards, so the crowns sit in the upper half of a 9:16 frame. */
const TARGET_Y_TRACK = [
  { t: 0.0, value: 0.2 },
  { t: 2.2, value: -0.1 },
  { t: 9.4, value: -0.1 },
  { t: 12.6, value: 0.15 },
  { t: 15.0, value: 0.15 },
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
 * @param {number} t seconds since the sequence started
 * @param {{ language: string, metrics: { normal: object, asthma: object } }} context
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
    // Two cards in the order they sit on screen: the normal tree on the left,
    // the asthmatic one on the right. The headline is the share of the lung
    // barely being ventilated, because that is the number the picture is
    // showing; the rows are the resistance and the air still arriving.
    cards: {
      opacity: cueOpacity(t, 2.3, HOLD_PAST_END, 0.4),
      items: [
        card(pick(language, REEL_COPY.cards.normal.label, REEL_COPY.cards.normal.labelJa), metrics.normal, language),
        card(pick(language, REEL_COPY.cards.asthma.label, REEL_COPY.cards.asthma.labelJa), metrics.asthma, language),
      ],
    },
    // The badge exists to forestall the obvious objection — that the two trees
    // are being treated differently — so it is up for the whole comparison.
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

/**
 * One card. Every figure comes from the scene's own read-out rows, so a card
 * cannot show a number the interactive panel would not.
 */
function card(label, rows, language) {
  return {
    label,
    headlineKey: pick(language, 'dark', '低換気'),
    headline: rows.defects,
    headlineUnit: '%',
    rows: [
      `${pick(language, 'resistance', '気道抵抗')} ×${rows.resistance}`,
      `${pick(language, 'air reaching', '届く空気')} ${rows.ventilation}%`,
    ],
  };
}

function captionAt(t, language) {
  const knee = cueOpacity(t, 5.9, 9.3, 0.4);
  if (knee > 0) {
    return { text: pick(language, REEL_COPY.knee.caption, REEL_COPY.knee.captionJa), opacity: knee };
  }
  const full = cueOpacity(t, 10.4, 12.5, 0.4);
  if (full > 0) {
    return { text: pick(language, REEL_COPY.full.caption, REEL_COPY.full.captionJa), opacity: full };
  }
  return { text: '', opacity: 0 };
}

function pick(language, en, ja) {
  return language === 'en' ? en : ja;
}
