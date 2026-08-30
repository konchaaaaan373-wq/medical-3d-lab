import { REEL_COPY } from '../../../../data/portalHypertension.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';

/**
 * The portal hypertension scene's fifteen-second social sequence.
 *
 * ## What it is about
 *
 * The one thing the interactive scene keeps having to say in prose: **the
 * collaterals work, and the pressure stays up anyway.** More than half the
 * portal blood ends up bypassing the liver, the gradient does come down, and it
 * is still nowhere near normal — because a bypass removes neither the
 * intrahepatic resistance behind it nor the splanchnic inflow in front of it.
 *
 * That is a hard thing to believe from a number and an easy thing to see from
 * a picture, which is exactly the test the product principles set for whether
 * something is worth 3D at all.
 *
 * The sequence is therefore one climb along the scene's own axis — intrahepatic
 * resistance — with a pause where the collateral network is carrying a great
 * deal of blood, and a caption naming the reason rather than the observation.
 *
 * ## Why it is deterministic
 *
 * Every function here is a pure function of elapsed seconds, and the model
 * behind the scene is a stateless equilibrium solve: the same resistance always
 * gives the same liver. Fifteen seconds render identically on any machine and
 * at any frame rate, which is what a screen recording needs.
 *
 * No number is written down in this file.
 */

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/** Five beats, contiguous by construction. */
export const REEL_CUES = [
  { id: 'hook', at: 0.0, until: 2.2 },
  { id: 'resistance', at: 2.2, until: 6.0 },
  { id: 'collaterals', at: 6.0, until: 9.6 },
  { id: 'why', at: 9.6, until: 12.6 },
  { id: 'take-home', at: 12.6, until: 15.0 },
];

const HOLD_PAST_END = REEL_DURATION + 1.5;

/**
 * Where on the scene's axis the sequence sits, over time.
 *
 * One climb and one hold. The hold is at established cirrhosis, where the
 * collateral network is carrying most of the flow — the state the argument is
 * about — and it lasts long enough to read the two cards rather than glimpse
 * them.
 */
const PROGRESS_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 1.8, value: 0.0 },
  { t: 6.0, value: 0.82 },
  { t: 9.6, value: 0.82 },
  { t: 12.0, value: 1.0 },
  { t: 15.0, value: 1.0 },
];

/** @param {number} t seconds since the sequence started */
export function progressAt(t) {
  return sampleTrack(PROGRESS_TRACK, t);
}

/** Camera distance multiplier over time — a slow dolly, never a zoom stunt. */
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.15 },
  { t: 2.2, value: 1.0 },
  { t: 6.0, value: 0.88 },
  { t: 9.6, value: 0.88 },
  { t: 10.8, value: 0.98 },
  { t: 12.6, value: 1.06 },
  { t: 15.0, value: 1.06 },
];

/** A gentle drift, so the liver sits in the upper half of a 9:16 frame. */
const TARGET_Y_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 2.2, value: -0.25 },
  { t: 9.6, value: -0.25 },
  { t: 12.6, value: 0.0 },
  { t: 15.0, value: 0.0 },
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
    targetX: base.targetX,
    targetY: base.targetY + sampleTrack(TARGET_Y_TRACK, t),
    targetZ: base.targetZ,
  };
}

/**
 * The complete overlay state for a moment in the sequence.
 *
 * @param {number} t
 * @param {{ language: string, metrics: { healthy: object, cirrhotic: object } }} context
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
    // The healthy liver on the left as a fixed anchor, the current one on the
    // right. The headline is the gradient, because that is what the video
    // claims does not come down; the rows are where the blood is going.
    cards: {
      opacity: cueOpacity(t, 2.3, HOLD_PAST_END, 0.4),
      items: [
        card(pick(language, REEL_COPY.cards.healthy.label, REEL_COPY.cards.healthy.labelJa), metrics.healthy, language),
        card(pick(language, REEL_COPY.cards.cirrhotic.label, REEL_COPY.cards.cirrhotic.labelJa), metrics.cirrhotic, language),
      ],
    },
    badge: {
      text: pick(language, REEL_COPY.badge.label, REEL_COPY.badge.labelJa),
      opacity: cueOpacity(t, 2.4, 9.4, 0.4),
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
    headlineKey: pick(language, 'gradient', '圧較差'),
    headline: rows.ppg,
    headlineUnit: 'mmHg',
    rows: [
      `${pick(language, 'through the liver', '肝臓を通る')} ${rows.liverFlow}`,
      `${pick(language, 'bypassing it', '迂回する')} ${rows.shunt}%`,
    ],
  };
}

function captionAt(t, language) {
  const resistance = cueOpacity(t, 2.6, 5.9, 0.4);
  if (resistance > 0) {
    return { text: pick(language, REEL_COPY.resistance.caption, REEL_COPY.resistance.captionJa), opacity: resistance };
  }
  const collaterals = cueOpacity(t, 6.3, 9.5, 0.4);
  if (collaterals > 0) {
    return {
      text: pick(language, REEL_COPY.collaterals.caption, REEL_COPY.collaterals.captionJa),
      opacity: collaterals,
    };
  }
  const why = cueOpacity(t, 9.9, 12.5, 0.4);
  if (why > 0) {
    return { text: pick(language, REEL_COPY.why.caption, REEL_COPY.why.captionJa), opacity: why };
  }
  return { text: '', opacity: 0 };
}

function pick(language, en, ja) {
  return language === 'en' ? en : ja;
}
