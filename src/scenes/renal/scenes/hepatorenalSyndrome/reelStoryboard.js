import { REEL_COPY } from '../../../../data/hepatorenal.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';

/**
 * The hepatorenal syndrome scene's fifteen-second social sequence.
 *
 * ## What it is about
 *
 * The one thing the interactive scene keeps having to say in prose: **give the
 * kidney no injury at all, and the circulation alone still takes filtration a
 * long way down.** The two cards at the end are that sentence as a pair of
 * numbers — the same kidney, at the same arterial pressure, with and without
 * the vasoconstrictor signal.
 *
 * The last caption before the take-home is the boundary, and it is not
 * optional: this sequence shows the circulation's share, and a viewer who
 * stopped a beat earlier could take it for a claim that HRS-AKI never involves
 * kidney injury. It does not, and the caption says so.
 *
 * The middle of the sequence is the part that makes it believable rather than
 * surprising: the arteries open, the pressure falls despite a rising cardiac
 * output, the body constricts everything that will respond — and the kidney
 * responds. The same response that defends arterial pressure progressively
 * consumes the kidney's autoregulatory reserve.
 *
 * An earlier version of this paragraph called the compensation and the damage
 * one and the same event. This model has no damage in it, and that phrasing
 * invited exactly the reading the sequence spends its last caption disowning.
 *
 * That is a hard thing to believe from a number and an easy thing to see from
 * a picture, which is the test the product principles set for whether
 * something is worth 3D at all.
 *
 * ## Why it is deterministic
 *
 * Every function here is a pure function of elapsed seconds, and the model
 * behind the scene is a stateless equilibrium solve: the same axis position
 * always gives the same circulation. Fifteen seconds render identically on any
 * machine and at any frame rate, which is what a screen recording needs.
 *
 * No number is written down in this file.
 */

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/** Five beats, contiguous by construction. */
export const REEL_CUES = [
  { id: 'hook', at: 0.0, until: 2.4 },
  { id: 'dilate', at: 2.4, until: 6.2 },
  { id: 'defend', at: 6.2, until: 9.8 },
  { id: 'fail', at: 9.8, until: 12.8 },
  { id: 'take-home', at: 12.8, until: 15.0 },
];

const HOLD_PAST_END = REEL_DURATION + 1.5;

/**
 * Where on the scene's axis the sequence sits, over time.
 *
 * One climb with two holds. The first hold is where the vasoconstrictor systems
 * have come on and filtration is still being defended — the state that makes
 * the ending surprising. The second is past the failure of autoregulation,
 * where the two cards diverge.
 */
const PROGRESS_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 2.0, value: 0.0 },
  { t: 6.2, value: 0.5 },
  { t: 8.4, value: 0.5 },
  { t: 12.0, value: 1.0 },
  { t: 15.0, value: 1.0 },
];

/** @param {number} t seconds since the sequence started */
export function progressAt(t) {
  return sampleTrack(PROGRESS_TRACK, t);
}

/**
 * When the sequence stops showing the circulation and starts comparing two
 * kidneys. Declared above the camera tracks, which step at the same moment.
 *
 * The first three beats are about what the circulation does — the arteries
 * opening, the pressure falling, the body constricting what it can — and they
 * need the liver and the aorta on screen. The last two are the pay-off, and
 * the pay-off is two kidneys at the same arterial pressure differing only in
 * the signal. Showing the pair from the start would give the ending away and
 * leave three beats narrating something not on screen.
 */
export const COMPARISON_FROM = 9.8;

/** @param {number} t */
export function comparisonAt(t) {
  return t >= COMPARISON_FROM;
}

/** Camera distance multiplier over time — a slow dolly, never a zoom stunt. */
// The two layouts are not the same size, so the tracks step at the moment the
// picture changes rather than easing across it: easing would frame neither.
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.16 },
  { t: 2.4, value: 1.02 },
  { t: 6.2, value: 0.9 },
  { t: COMPARISON_FROM - 0.01, value: 0.9 },
  { t: COMPARISON_FROM, value: 0.78 },
  { t: 12.8, value: 0.82 },
  { t: 15.0, value: 0.82 },
];

/**
 * A drift towards the kidney and back.
 *
 * The sequence opens on the whole circulation, moves right and up onto the
 * glomerulus for the middle three beats, and pulls back for the ending — which
 * has to be read against both organs, because the point is that the kidney's
 * problem is not in the kidney.
 */
const TARGET_X_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 2.4, value: 0.4 },
  { t: 6.2, value: 1.5 },
  { t: COMPARISON_FROM - 0.01, value: 1.5 },
  { t: COMPARISON_FROM, value: 0.0 },
  { t: 15.0, value: 0.0 },
];

const TARGET_Y_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 2.4, value: 0.2 },
  { t: 6.2, value: 0.9 },
  { t: COMPARISON_FROM - 0.01, value: 0.9 },
  { t: COMPARISON_FROM, value: 0.2 },
  { t: 15.0, value: 0.2 },
];

/**
 * Camera for a moment in the sequence, relative to the base framing.
 *
 * @param {number} t
 * @param {{ distance: number, targetX: number, targetY: number, targetZ: number }} base
 */
export function cameraAt(t, base) {
  return {
    distance: base.distance * sampleTrack(DISTANCE_TRACK, t),
    targetX: base.targetX + sampleTrack(TARGET_X_TRACK, t),
    targetY: base.targetY + sampleTrack(TARGET_Y_TRACK, t),
    targetZ: base.targetZ,
  };
}

/**
 * The complete overlay state for a moment in the sequence.
 *
 * @param {number} t
 * @param {{ language: string, metrics: { kidney: object, released: object,
 *           map: string, activation: string } }} context
 */
export function overlayAt(t, { language, metrics }) {
  const hookOpacity = cueOpacity(t, 0.1, 2.5, 0.4);
  const takeHomeOpacity = cueOpacity(t, 12.9, HOLD_PAST_END, 0.4);

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
      opacity: cueOpacity(t, 0.6, 2.5, 0.4),
    },
    // This kidney throughout; the same kidney without the signal only once the
    // picture is showing both.
    //
    // Not a pacing choice. Early in the course the signal is *holding
    // filtration up* — the efferent arteriole is constricting while the
    // afferent one is still shielded — so a pair of cards at four seconds
    // reads "this kidney 121, without the signal 103" and argues the opposite
    // of what the sequence is for. The comparison is only worth showing once
    // it means what the ending says it means.
    cards: {
      opacity: cueOpacity(t, 2.5, HOLD_PAST_END, 0.4),
      // Slot order is screen order: the overlay's first slot is the left card
      // (styled as the reference) and the second the right (styled as the
      // subject). In comparison the released kidney stands on the left and
      // this kidney on the right, so the released card takes the first slot;
      // before the comparison that slot is empty rather than borrowed, so
      // this kidney's card keeps its side and its styling throughout.
      items: [
        comparisonAt(t)
          ? card(
              pick(language, REEL_COPY.cards.released.label, REEL_COPY.cards.released.labelJa),
              metrics.released,
              language
            )
          : undefined,
        card(pick(language, REEL_COPY.cards.kidney.label, REEL_COPY.cards.kidney.labelJa), metrics.kidney, language),
      ],
    },
    badge: {
      text: pick(language, REEL_COPY.badge.label, REEL_COPY.badge.labelJa),
      opacity: cueOpacity(t, 2.6, 9.6, 0.4),
    },
    // The two circulating quantities that explain the cards, held through the
    // middle of the sequence where the argument is being made.
    marker: {
      text: `${pick(language, 'arterial pressure', '動脈圧')} ${metrics.map}`,
      sub: `${pick(language, 'vasoconstrictor activation', '血管収縮系の活性化')} ${metrics.activation}`,
      opacity: cueOpacity(t, 4.0, 12.6, 0.4),
    },
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
    headlineKey: pick(language, 'filtration', '濾過量'),
    headline: rows.gfr,
    headlineUnit: 'mL/min',
    rows: [
      `${pick(language, 'renal blood flow', '腎血流量')} ${rows.flow}`,
      `${pick(language, 'filtration fraction', '濾過率')} ${rows.fraction}%`,
    ],
  };
}

function captionAt(t, language) {
  const dilate = cueOpacity(t, 2.8, 6.1, 0.4);
  if (dilate > 0) {
    return { text: pick(language, REEL_COPY.dilate.caption, REEL_COPY.dilate.captionJa), opacity: dilate };
  }
  const defend = cueOpacity(t, 6.5, 9.7, 0.4);
  if (defend > 0) {
    return { text: pick(language, REEL_COPY.defend.caption, REEL_COPY.defend.captionJa), opacity: defend };
  }
  const fail = cueOpacity(t, 10.1, 11.9, 0.4);
  if (fail > 0) {
    return { text: pick(language, REEL_COPY.fail.caption, REEL_COPY.fail.captionJa), opacity: fail };
  }
  // The last caption before the take-home, and the one the sequence must not
  // be seen without: the ending says what the circulation alone did, and a
  // viewer who stops there could take it for a claim about the syndrome.
  const boundary = cueOpacity(t, 12.1, HOLD_PAST_END, 0.4);
  if (boundary > 0) {
    return {
      text: pick(language, REEL_COPY.boundary.caption, REEL_COPY.boundary.captionJa),
      opacity: boundary,
    };
  }
  return { text: '', opacity: 0 };
}

function pick(language, en, ja) {
  return language === 'en' ? en : ja;
}
