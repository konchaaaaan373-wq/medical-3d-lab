import { REEL_COPY, TASK_READOUT_LABELS } from '../../../../data/higherBrainFunction.js';
import { lesionSiteById } from '../../../../models/higherBrainFunction.js';
import { cueOpacity, sampleTrack } from '../../../../utils/Timeline.js';

/**
 * The higher-function scene's fifteen-second sequence.
 *
 * ## What it is about
 *
 * One word is asked for four times over, of the same brain: once with nothing
 * in the way, and then with a lesion at the front, at the back, and in between.
 * The word gets a different distance each time, and where it stops is what the
 * three aphasias are named after.
 *
 * The first version of this showed one lesion — the arcuate fasciculus, cut —
 * which is the most surprising of the three and the least useful on its own: a
 * viewer who has not watched the other two has nothing to compare it with, and
 * "conduction aphasia" stays a name rather than a place. Three of them in one
 * run is the same fifteen seconds and a different claim: **the name is where it
 * stopped.**
 *
 * ## What the seconds are, and are not
 *
 * The model has no time in it. Each segment plays exactly one run of the
 * examination — asked, carried, answered or not — and the run is stretched to
 * the segment's length so every lesion gets the same rhythm and can be compared
 * by *where* it stopped rather than by how long it took. Nothing here is a
 * latency, and the copy says so on screen for the whole fifteen seconds.
 *
 * No number is written down in this file, and no medical claim is either: the
 * rows come from the scene's own read-out, and which lesion produces which
 * picture is the model's business.
 */

/** Total length of the sequence, in seconds. */
export const REEL_DURATION = 15.0;

/**
 * The four runs and the closing beat, contiguous by construction.
 *
 * `lesion` is an id in the model's own site list; `null` is an intact brain.
 * The last beat holds the third lesion on screen while the name arrives, so
 * the closing frame still shows a brain rather than a title card.
 */
export const REEL_SEGMENTS = Object.freeze([
  { id: 'intact', at: 0.0, until: 3.0, lesion: null, copy: 'intact' },
  { id: 'broca', at: 3.0, until: 6.4, lesion: 'dominant-inferior-frontal', copy: 'broca' },
  { id: 'wernicke', at: 6.4, until: 9.8, lesion: 'dominant-posterior-superior-temporal', copy: 'wernicke' },
  { id: 'conduction', at: 9.8, until: 13.0, lesion: 'dominant-arcuate', copy: 'conduction' },
  { id: 'take-home', at: 13.0, until: REEL_DURATION, lesion: 'dominant-arcuate', copy: null },
]);

/** The same beats, in the shape the player reads. */
export const REEL_CUES = REEL_SEGMENTS.map(({ id, at, until }) => ({ id, at, until }));

/**
 * The task the sequence asks for, by its id in the model.
 *
 * A **nonword**, and that is the point. Repeating a known word has a way round
 * through its meaning, so a dorsal cut leaves it partly available and the
 * sequence would show two stopping places and one partial. A nonsense word has
 * no lexical entry and therefore no way round, so each of the three cuts stops
 * it somewhere different — which is the claim the fifteen seconds make.
 */
export const REEL_TASK = 'repetition-nonword';

/**
 * The rows the overlay prints, by task id.
 *
 * The third row used to be clinical fluency, which this model does not compute.
 * It is the self-initiation *route* now, under the name it deserves, and the
 * caption no longer claims anything about how fluent the speech is.
 */
export const REEL_ROWS = Object.freeze([
  'repetition-nonword',
  'auditory-comprehension',
  'speech-initiation-route',
]);

const HOLD_PAST_END = REEL_DURATION + 1.5;

/** Which beat a moment belongs to. Never null: the last one holds past the end. */
export function segmentAt(t) {
  return REEL_SEGMENTS.find((segment) => t < segment.until) ?? REEL_SEGMENTS.at(-1);
}

/**
 * How far the lesion of this beat has been taken.
 *
 * It arrives over the first part of its own segment rather than between two
 * frames, because a viewer has to see *where* it is before the run reaches it.
 */
export function extentAt(t) {
  const segment = segmentAt(t);
  if (!segment.lesion) return 0;
  const arriving = Math.min(1, Math.max(0, (t - segment.at) / 0.6));
  return arriving;
}

/**
 * Where the run of the examination is, in the scene's own cycle time.
 *
 * One run per segment, stretched to the segment: every lesion is asked the same
 * question at the same pace, so the only thing that differs between them is how
 * far the word gets.
 *
 * @param {number} t sequence time
 * @param {number} cycleSeconds the scene's own run length
 */
export function runTimeAt(t, cycleSeconds) {
  const segment = segmentAt(t);
  const span = Math.max(0.01, segment.until - segment.at);
  const through = Math.min(0.999, Math.max(0, (t - segment.at) / span));
  return through * cycleSeconds;
}

/** A slow push in, and nothing else. The subject does not move. */
const DISTANCE_TRACK = [
  { t: 0.0, value: 1.06 },
  { t: 6.4, value: 0.99 },
  { t: 13.0, value: 0.94 },
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
  const takeHome = cueOpacity(t, 13.1, HOLD_PAST_END, 0.4);
  const hook = cueOpacity(t, 0.1, 2.9, 0.4);
  const segment = segmentAt(t);
  const copy = segment.copy ? REEL_COPY.segments[segment.copy] : null;
  const site = segment.lesion ? lesionSiteById(segment.lesion) : null;

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
        opacity: cueOpacity(t, 0.5, 2.9, 0.4),
      },
    // One card for the lesion of this beat, one for what the same brain can
    // still do. Both are read from the scene's own read-out every frame, so
    // what the video says and what the panel says are the same sentence.
    cards: {
      opacity: cueOpacity(t, 2.9, HOLD_PAST_END, 0.4),
      items: [
        {
          label: site
            ? pick(language, site.label, site.labelJa)
            : pick(language, REEL_COPY.cards.task.label, REEL_COPY.cards.task.labelJa),
          rows: [row(language, 'repetition-nonword', metrics['repetition-nonword'])],
        },
        {
          label: pick(language, REEL_COPY.cards.spared.label, REEL_COPY.cards.spared.labelJa),
          rows: [
            row(language, 'auditory-comprehension', metrics['auditory-comprehension']),
            row(language, 'speech-initiation-route', metrics['speech-initiation-route']),
          ],
        },
      ],
    },
    badge: {
      text: pick(language, REEL_COPY.badge.label, REEL_COPY.badge.labelJa),
      opacity: cueOpacity(t, 2.9, 12.8, 0.4),
    },
    caption: copy
      ? {
        text: pick(language, copy.caption, copy.captionJa),
        opacity: cueOpacity(t, segment.at + 0.4, segment.until - 0.1, 0.3),
      }
      : { text: '', opacity: 0 },
    note: {
      text: pick(language, REEL_COPY.note.text, REEL_COPY.note.textJa),
      opacity: cueOpacity(t, 0.6, HOLD_PAST_END, 0.4),
    },
    marker: { text: '', sub: '', opacity: 0 },
  };
}
