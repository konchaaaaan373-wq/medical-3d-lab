import * as THREE from 'three';
import { STAGES } from '../../data/heartFailure.js';
import { cueOpacity } from '../../utils/Timeline.js';
import { sampleHemodynamics } from './hemodynamics.js';

/**
 * The guided sequence: what the scene shows, in the order the physiology
 * happens.
 *
 * **The animation is the explanation.** Every step is a state of the
 * visualization — where the camera is, what the model is set to, which one
 * thing is called out — and the caption is a label on what is already moving,
 * never a substitute for it. That is the difference between this and a
 * slideshow with a 3D background.
 *
 * Two parts, because the scene has two time scales and running them together is
 * what made the original confusing:
 *
 *   Part A — Remodeling.  Minutes-to-years. Four states of one ventricle.
 *   Part B — One beat.    Under a second, slowed down. What that ventricle
 *                         does on every contraction, and what follows from it.
 *
 * Part B holds the remodelling axis completely still. Nothing about the
 * trajectory moves while the beat is being read, so the two clocks never look
 * like one.
 */

const HFREF = STAGES.find((stage) => stage.id === 'systolic-dysfunction').at;

/**
 * Where Part B sits on the remodelling axis.
 *
 * Far enough along that the congestion the chain ends in is actually present in
 * the solved state — the sequence reveals what the model has, and never invents
 * any of it (see `setCongestionReveal`).
 */
const BEAT_PROGRESS = 0.85;

/** Whole-subject framing, shared by the Part A steps. */
const wide = (x, y, z, distance) => ({
  target: new THREE.Vector3(x, y, z),
  distance,
});

export const STORY_DURATION = 42;

/**
 * @typedef {object} StoryStep
 * @property {string} id
 * @property {number} at seconds
 * @property {number} until seconds
 * @property {number} progress remodelling axis, held for the whole step
 * @property {boolean} [beat] slow the heartbeat down and drive it from the story
 * @property {string[]} focus annotation ids to point at
 * @property {{target: THREE.Vector3, distance: number}} camera
 * @property {string} caption
 * @property {string} captionJa
 */

/** @type {StoryStep[]} */
export const STORY_STEPS = [
  // --- Part A: four states of one ventricle -------------------------------
  {
    id: 'normal',
    part: 'remodeling',
    at: 0,
    until: 4,
    progress: 0,
    focus: ['lv'],
    camera: wide(-0.3, -1.8, 0.3, 26),
    caption: 'A normal left ventricle, filling and emptying',
    captionJa: '正常な左室 — 充満と駆出',
  },
  {
    id: 'hypertrophy',
    part: 'remodeling',
    at: 4,
    until: 8,
    progress: STAGES.find((s) => s.id === 'concentric-hypertrophy').at,
    focus: ['wall'],
    camera: wide(1.2, -0.9, 0.5, 21),
    caption: 'Against a higher load, the wall thickens',
    captionJa: '負荷が高いと、壁が厚くなる',
  },
  {
    id: 'dilation',
    part: 'remodeling',
    at: 8,
    until: 12,
    progress: STAGES.find((s) => s.id === 'dilation').at,
    focus: ['lv'],
    camera: wide(0.1, -1.4, 0.3, 25),
    caption: 'Later the chamber enlarges instead',
    captionJa: 'その後、内腔が拡大する',
  },
  {
    id: 'hfref',
    part: 'remodeling',
    at: 12,
    until: 16,
    progress: HFREF,
    focus: ['lv'],
    camera: wide(-0.3, -1.6, 0.3, 27),
    caption: 'And it no longer empties completely',
    captionJa: 'そして、完全には空にならなくなる',
  },

  // --- Part B: inside one failing beat ------------------------------------
  // The remodelling axis is frozen at BEAT_PROGRESS from here on.
  {
    id: 'filling',
    part: 'beat',
    at: 16,
    until: 20.5,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['lv'],
    camera: wide(-0.6, -2.4, 0.3, 21),
    caption: 'Watch one beat. First it fills',
    captionJa: '1 拍を見てみます。まず充満します',
  },
  {
    id: 'contraction',
    part: 'beat',
    at: 20.5,
    until: 24,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['lv'],
    camera: wide(-0.6, -2.4, 0.3, 20),
    caption: 'Contraction begins — pressure rises before anything leaves',
    captionJa: '収縮開始 — 何も出ないまま圧が上がる',
  },
  {
    id: 'ejection',
    part: 'beat',
    at: 24,
    until: 28.5,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: [],
    camera: wide(-0.4, -1.6, 0.4, 22),
    // Emphasis, not colour: the outflow is recognisable because it moves.
    emphasis: { ejection: 1 },
    // "Only part" is a claim about distance, so the end-diastolic mark comes up
    // and the wall is seen falling short of it.
    outline: 1,
    caption: 'The valve opens — but only part of the blood leaves',
    captionJa: '弁が開く — しかし出ていくのは一部だけ',
  },
  {
    id: 'residual',
    part: 'beat',
    at: 28.5,
    until: 33,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['residual'],
    camera: wide(-0.6, -2.6, 0.3, 19),
    emphasis: { residual: 1 },
    outline: 1,
    caption: 'Blood remains after systole',
    captionJa: '収縮が終わっても、血液が残る',
  },
  {
    id: 'filling-pressure',
    part: 'beat',
    at: 33,
    until: 36.5,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['pressure'],
    camera: wide(-0.8, -1.2, 0.3, 24),
    // Pressure only. Nothing has reached the pulmonary side yet.
    reveal: { front: 0.35, fluid: 0 },
    caption: 'More blood left behind means a higher filling pressure',
    captionJa: '残る血液が多いほど、充満圧が高くなる',
  },
  {
    id: 'transmission',
    part: 'beat',
    at: 36.5,
    until: 39.5,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['pressure'],
    camera: wide(-1.2, 0.4, 0.3, 29),
    // The front spreads outward along atrium -> veins -> bed. It is pressure
    // being transmitted backwards, which is what happens; blood is not, and
    // never moves that way in this scene.
    reveal: { front: 1, fluid: 0 },
    caption: 'That pressure is transmitted back to the atrium and pulmonary veins',
    captionJa: 'その圧が左房・肺静脈へ伝わる',
  },
  {
    id: 'congestion',
    part: 'beat',
    at: 39.5,
    until: STORY_DURATION,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['fluid'],
    camera: wide(-1.0, 0.2, 0.3, 30),
    reveal: { front: 1, fluid: 1 },
    caption: 'And fluid moves into the lung interstitium',
    captionJa: 'そして肺の間質へ水分が移動する',
  },
];

export const STORY_CUES = STORY_STEPS.map(({ id, at, until }) => ({ id, at, until }));

/** The step covering a moment, and how far through it that moment is. */
export function stepAt(t) {
  const step = STORY_STEPS.find((entry) => t >= entry.at && t < entry.until) ?? STORY_STEPS[STORY_STEPS.length - 1];
  const local = (t - step.at) / Math.max(0.001, step.until - step.at);
  return { step, local: Math.min(1, Math.max(0, local)) };
}

/**
 * Cardiac phase during Part B.
 *
 * Slowed to roughly a fifth of real time so a single beat can be read, and —
 * the reason this exists rather than just letting the heart run — anchored so
 * that each step lands on the part of the cycle it is talking about. The phase
 * is still one number driving everything downstream, exactly as when the scene
 * runs itself; only its rate changes.
 */
const BEAT_ANCHORS = {
  // step id -> [phase at the start of the step, phase at the end]
  filling: [0.5, 1.0],
  contraction: [0.0, 0.11],
  ejection: [0.11, 0.39],
  residual: [0.39, 0.52],
};

const wrap = (phase) => phase - Math.floor(phase);

export function cardiacPhaseAt(t) {
  const { step, local } = stepAt(t);
  const anchor = BEAT_ANCHORS[step.id];
  if (anchor) {
    const [from, to] = anchor;
    // Ease out, so each step settles on the moment it is about rather than
    // sailing past it.
    const eased = 1 - (1 - local) * (1 - local);
    return wrap(from + (to - from) * eased);
  }
  // The later steps are about what follows the beat, not the beat itself, so
  // the heart keeps turning over slowly from where the beat was left. Part A is
  // not driven at all, but this still has to return a usable phase for every t.
  return wrap(0.52 + (t - 33) * 0.06);
}

/**
 * Whether the beat is the subject right now.
 *
 * Only the steps that hold the heart at a named part of the cycle get to put a
 * name on screen. During the pressure and congestion steps the beat is still
 * running, but it is no longer what is being pointed at, and labelling it would
 * just be another thing to read.
 */
export function beatNamedAt(t) {
  return BEAT_ANCHORS[stepAt(t).step.id] !== undefined;
}

/** Camera for a moment, interpolated across the step boundary. */
export function cameraAt(t) {
  const index = STORY_STEPS.findIndex((entry) => t >= entry.at && t < entry.until);
  const step = STORY_STEPS[index] ?? STORY_STEPS[STORY_STEPS.length - 1];
  const previous = STORY_STEPS[Math.max(0, index - 1)] ?? step;
  const BLEND = 1.1;
  const since = t - step.at;
  // A short cross-fade at each boundary. Long enough to read as a move, short
  // enough that the viewer never loses where they are in the scene.
  const mix = Math.min(1, Math.max(0, since / BLEND));
  const eased = mix * mix * (3 - 2 * mix);
  return {
    target: previous.camera.target.clone().lerp(step.camera.target, eased),
    distance: previous.camera.distance + (step.camera.distance - previous.camera.distance) * eased,
  };
}

/** Caption, with a short fade at each end so text never snaps. */
export function captionAt(t) {
  const { step } = stepAt(t);
  return {
    text: step.caption,
    textJa: step.captionJa,
    part: step.part,
    opacity: cueOpacity(t, step.at, step.until, 0.3),
  };
}

/** Presentation emphasis for a moment: zero unless the current step asks. */
export function emphasisAt(t) {
  const { step, local } = stepAt(t);
  const ramp = Math.min(1, local / 0.25);
  return {
    ejection: (step.emphasis?.ejection ?? 0) * ramp,
    residual: (step.emphasis?.residual ?? 0) * ramp,
  };
}

/**
 * How much of the congestion the overlay may draw at a moment.
 *
 * Ramped within the step, so the pressure front visibly spreads and the fluid
 * visibly appears rather than switching on. Before the pressure steps it is
 * zero: the chain has not reached the pulmonary side yet.
 */
export function revealAt(t) {
  const { step, local } = stepAt(t);
  const previous = STORY_STEPS[Math.max(0, STORY_STEPS.indexOf(step) - 1)];
  const from = previous?.reveal ?? { front: 0, fluid: 0 };
  const to = step.reveal ?? { front: 0, fluid: 0 };
  const eased = local * local * (3 - 2 * local);
  return {
    front: from.front + (to.front - from.front) * eased,
    fluid: from.fluid + (to.fluid - from.fluid) * eased,
  };
}

/**
 * How much of the end-diastolic mark to draw. Ramped in and out with the step
 * so it arrives with the point it is making.
 */
export function outlineAt(t) {
  const { step, local } = stepAt(t);
  const target = step.outline ?? 0;
  const ramp = Math.min(1, local / 0.2) * Math.min(1, (1 - local) / 0.12 + 0.001);
  return target * Math.min(1, Math.max(0, ramp));
}

/**
 * Whether the heartbeat is being driven by the sequence at this moment.
 * Part A lets the heart run at its own rate; Part B takes it over.
 */
export function beatDrivenAt(t) {
  return Boolean(stepAt(t).step.beat);
}

/** Sanity value used by the tests: the state Part B is read at. */
export const BEAT_STATE = () => sampleHemodynamics(BEAT_PROGRESS);
export { BEAT_PROGRESS };
