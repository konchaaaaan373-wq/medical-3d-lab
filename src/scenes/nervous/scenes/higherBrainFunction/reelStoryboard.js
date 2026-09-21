import { REEL_COPY, TASK_READOUT_LABELS } from '../../../../data/higherBrainFunction.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';

/**
 * The higher-function scene's fifteen-second sequence.
 *
 * ## What it is about
 *
 * A word is said, and the person repeats it. Then one bundle of fibres between
 * the ear end and the mouth end is cut, and the same word is asked again: it
 * arrives, it is understood, and it stops on the way out. Comprehension and
 * fluency never used that bundle and do not change.
 *
 * That is the one finding in this whole model that a still picture cannot
 * carry. "Fluent speech, intact comprehension, and repetition gone" is a list
 * until you watch the signal get partway and stop; then it is obvious, and the
 * name for it stops being something to memorise.
 *
 * ## What the seconds are, and are not
 *
 * The model has no time in it. The sequence's rhythm — a word asked, a run, an
 * answer — is a **reading order**, not a set of latencies, and the copy says so
 * on screen. What is claimed is the order and where the run stops; how long it
 * took is this file's, and this file is not a model.
 *
 * The lesion arrives over a couple of seconds rather than appearing between two
 * frames, because a viewer has to see *where* it is, and because the extent is
 * the scene's own input: what the sequence does with it is what a reader can do
 * with the slider.
 *
 * No number is written down in this file, and no medical claim is either.
 */

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/** Five beats, contiguous by construction. */
export const REEL_CUES = [
  { id: 'intact', at: 0.0, until: 3.2 },
  { id: 'lesion', at: 3.2, until: 5.4 },
  { id: 'blocked', at: 5.4, until: 10.2 },
  { id: 'spared', at: 10.2, until: 12.6 },
  { id: 'take-home', at: 12.6, until: 15.0 },
];

/** The lesion this sequence is about, by its id in the model. */
export const REEL_LESION = 'dominant-arcuate';

/** The task the sequence asks for, by its id in the model. */
export const REEL_TASK = 'repetition';

const HOLD_PAST_END = REEL_DURATION + 1.5;

/**
 * How far the lesion has been taken, over sequence time.
 *
 * Nothing, then a two-second arrival, then held. The hold is not a pause: the
 * runs after it are the sequence, and they are the same runs as the first one
 * with one step of the route gone.
 */
const EXTENT_TRACK = [
  { t: 0.0, value: 0.0 },
  { t: 3.2, value: 0.0 },
  { t: 5.4, value: 1.0 },
  { t: REEL_DURATION, value: 1.0 },
];

/** @param {number} t seconds since the sequence started */
export function extentAt(t) {
  return sampleTrack(EXTENT_TRACK, t);
}

/** A slow push in, and nothing else. The subject does not move. */
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.06 },
  { t: 5.4, value: 0.98 },
  { t: 12.6, value: 0.94 },
  { t: REEL_DURATION, value: 0.94 },
];

export function cameraAt(t, base) {
  return {
    distance: base.distance * sampleTrack(DISTANCE_TRACK, t),
    targetX: base.targetX,
    targetY: base.targetY,
    targetZ: base.targetZ,
  };
}

const pick = (language, en, ja) => (language === 'ja' ? ja : en);

const row = (language, id, value) => {
  const label = TASK_READOUT_LABELS[id];
  return `${pick(language, label.label, label.labelJa)}: ${pick(language, value.en, value.ja)}`;
};

/**
 * The complete overlay state for a moment in the sequence.
 *
 * @param {number} t
 * @param {{language: string, metrics: Record<string, {en: string, ja: string}>}} context
 */
export function overlayAt(t, { language, metrics }) {
  const takeHome = cueOpacity(t, 12.7, HOLD_PAST_END, 0.4);
  const hook = cueOpacity(t, 0.1, 3.0, 0.4);

  const caption = (() => {
    const lesion = cueOpacity(t, 3.4, 5.3, 0.3);
    if (lesion > 0) return { copy: REEL_COPY.lesion, opacity: lesion };
    const blocked = cueOpacity(t, 5.6, 10.1, 0.3);
    if (blocked > 0) return { copy: REEL_COPY.blocked, opacity: blocked };
    const spared = cueOpacity(t, 10.3, 12.5, 0.3);
    if (spared > 0) return { copy: REEL_COPY.spared, opacity: spared };
    return null;
  })();

  return {
    title: takeHome > 0
      ? {
        text: pick(language, REEL_COPY.takeHome.title, REEL_COPY.takeHome.titleJa),
        opacity: takeHome,
        variant: 'take-home',
      }
      : {
        text: pick(language, REEL_COPY.hook.title, REEL_COPY.hook.titleJa),
        opacity: hook,
        variant: 'hook',
      },
    subtitle: takeHome > 0
      ? {
        text: pick(language, REEL_COPY.takeHome.subtitle, REEL_COPY.takeHome.subtitleJa),
        opacity: takeHome,
      }
      : {
        text: pick(language, REEL_COPY.hook.subtitle, REEL_COPY.hook.subtitleJa),
        opacity: cueOpacity(t, 0.5, 3.0, 0.4),
      },
    // One card for the task being asked, one for the two that never used the
    // bundle. The rows are read from the scene's own read-out every frame, so
    // what the video says and what the panel says are the same sentence.
    cards: {
      opacity: cueOpacity(t, 3.0, HOLD_PAST_END, 0.4),
      items: [
        {
          label: pick(language, REEL_COPY.cards.task.label, REEL_COPY.cards.task.labelJa),
          rows: [row(language, 'repetition', metrics.repetition)],
        },
        {
          label: pick(language, REEL_COPY.cards.spared.label, REEL_COPY.cards.spared.labelJa),
          rows: [
            row(language, 'auditory-comprehension', metrics['auditory-comprehension']),
            row(language, 'speech-fluency', metrics['speech-fluency']),
          ],
        },
      ],
    },
    badge: {
      text: pick(language, REEL_COPY.badge.label, REEL_COPY.badge.labelJa),
      opacity: cueOpacity(t, 3.0, 12.4, 0.4),
    },
    caption: caption
      ? { text: pick(language, caption.copy.caption, caption.copy.captionJa), opacity: caption.opacity }
      : { text: '', opacity: 0 },
    note: {
      text: pick(language, REEL_COPY.note.text, REEL_COPY.note.textJa),
      opacity: cueOpacity(t, 0.6, HOLD_PAST_END, 0.4),
    },
    marker: { text: '', sub: '', opacity: 0 },
  };
}
