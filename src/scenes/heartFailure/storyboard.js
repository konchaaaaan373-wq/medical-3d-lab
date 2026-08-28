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

/**
 * Where the sequence looks from for most of its length: the same three-quarter
 * view the scene opens on, so nothing about the ventricle steps has to be
 * re-learned.
 */
const DEFAULT_VIEW = new THREE.Vector3(-0.4, 0.24, 0.88).normalize();

/**
 * Where it looks from once the subject is the pulmonary side.
 *
 * The pulmonary veins run backwards and away in a near-horizontal plane, so
 * from the opening view they recede almost straight into the screen and the
 * pressure front spreading along them cannot be seen at all. Rising above the
 * heart lays their whole course out across the frame — the same reason the
 * social sequence leaves the head-on axis for its congestion beat.
 */
const PULMONARY_VIEW = new THREE.Vector3(-0.05, 0.62, 0.78).normalize();

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
    camera: wide(-0.3, -1.7, 0.3, 27.5),
    caption: 'A normal left ventricle, filling and emptying',
    captionJa: '正常な左室。拡張期に充満し、収縮期に駆出する',
    // Said once, at the start: this is one representative course, not the
    // natural history of heart failure.
    note: 'This model shows one representative remodeling pathway from chronic pressure overload to systolic dysfunction.',
    noteJa: '慢性的な後負荷増大から収縮機能低下へ進む、代表的なリモデリング過程を示します。',
  },
  {
    id: 'hypertrophy',
    part: 'remodeling',
    at: 4,
    until: 8,
    progress: STAGES.find((s) => s.id === 'concentric-hypertrophy').at,
    focus: ['wall'],
    camera: wide(0.9, -1.0, 0.5, 23.5),
    caption: 'Against a higher load, the wall thickens',
    captionJa: '後負荷の増大に適応し、左室壁が肥厚する',
  },
  {
    id: 'dilation',
    part: 'remodeling',
    at: 8,
    until: 12,
    progress: STAGES.find((s) => s.id === 'dilation').at,
    focus: ['lv'],
    camera: wide(0.1, -1.5, 0.3, 26.5),
    caption: 'Later the chamber enlarges instead',
    captionJa: 'やがて左室腔が拡大し、より球形に近づく',
  },
  {
    id: 'hfref',
    part: 'remodeling',
    at: 12,
    until: 16,
    progress: HFREF,
    focus: ['lv'],
    camera: wide(-0.3, -1.6, 0.3, 28),
    caption: 'Now it ejects a smaller fraction of its blood',
    captionJa: '収縮力が低下し、1拍で駆出される血液の割合が減少する',
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
    camera: wide(-0.5, -2.1, 0.3, 23),
    caption: 'Watch one beat. First it fills',
    captionJa: '1 拍を追う。まず拡張期に左室が充満する',
  },
  {
    id: 'contraction',
    part: 'beat',
    at: 20.5,
    until: 24,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['lv'],
    camera: wide(-0.5, -2.1, 0.3, 22.5),
    caption: 'Contraction begins — pressure rises before anything leaves',
    captionJa: '収縮が始まる。等容性収縮期には、駆出されないまま左室圧が上昇する',
  },
  {
    id: 'ejection',
    part: 'beat',
    at: 24,
    until: 28.5,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: [],
    camera: wide(-0.3, -1.5, 0.4, 24),
    // Emphasis, not colour: the outflow is recognisable because it moves.
    emphasis: { ejection: 1 },
    // "Only part" is a claim about distance, so the end-diastolic mark comes up
    // and the wall is seen falling short of it.
    outline: 1,
    caption: 'The valve opens, but the weakened ventricle ejects less blood with each beat',
    captionJa: '大動脈弁が開く。しかし収縮力の低下した左室が送り出せる血液は少ない',
  },
  {
    id: 'residual',
    part: 'beat',
    at: 28.5,
    until: 33,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['residual'],
    camera: wide(-0.5, -2.4, 0.3, 21.5),
    emphasis: { residual: 1 },
    outline: 1,
    caption: 'Blood remains after systole',
    captionJa: '収縮の終わりにも、多くの血液が左室内に残る',
  },
  {
    id: 'filling-pressure',
    part: 'beat',
    at: 33,
    until: 36.5,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['pressure'],
    camera: wide(-0.7, -1.1, 0.3, 25.5),
    // Pressure only. Nothing has reached the pulmonary side yet.
    reveal: { front: 0.35, fluid: 0 },
    caption: 'As ventricular volumes rise, filling now occurs at a higher pressure',
    captionJa: '左室容積の増大に伴い、充満はより高い圧のもとで起こるようになる',
  },
  {
    id: 'transmission',
    part: 'beat',
    at: 36.5,
    until: 39.5,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['pressure', 'pulmonary-bed'],
    camera: wide(1.7, 1.4, -0.7, 27.5),
    view: PULMONARY_VIEW,
    // Brings the atrium and pulmonary veins up out of the dark, so the front is
    // seen spreading *inside* a pathway rather than through empty space.
    context: 1,
    // The front spreads outward along atrium -> veins -> bed. It is pressure
    // being transmitted backwards, which is what happens; blood is not, and
    // never moves that way in this scene.
    reveal: { front: 1, fluid: 0 },
    caption: 'That pressure is transmitted back to the atrium and pulmonary veins',
    captionJa: '上昇した左室充満圧は、左房から肺静脈へと後方に伝わる',
  },
  {
    id: 'congestion',
    part: 'beat',
    at: 39.5,
    until: STORY_DURATION,
    progress: BEAT_PROGRESS,
    beat: true,
    focus: ['fluid', 'pulmonary-bed'],
    camera: wide(2.0, 1.6, -0.8, 27),
    view: PULMONARY_VIEW,
    context: 1,
    reveal: { front: 1, fluid: 1 },
    caption: 'And fluid moves into the lung interstitium',
    captionJa: '肺毛細血管圧が上昇し、間質へ水分が移動する — 肺うっ血',
  },
];

export const STORY_CUES = STORY_STEPS.map(({ id, at, until }) => ({ id, at, until }));

/**
 * Four chapters over the continuous timeline — the granularity a viewer
 * actually navigates by. Individual steps stay addressable as small ticks.
 */
export const STORY_CHAPTERS = [
  { id: 'normal', label: 'Normal', labelJa: '正常', labelJaShort: '正常', at: 0 },
  { id: 'remodeling', label: 'Remodeling', labelJa: 'リモデリング', labelJaShort: '肥厚', at: 4 },
  { id: 'pump-failure', label: 'Pump failure', labelJa: '収縮機能低下', labelJaShort: '収縮低下', at: 16 },
  { id: 'congestion', label: 'Congestion', labelJa: '肺うっ血', labelJaShort: 'うっ血', at: 33 },
];

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

/**
 * Camera for a moment, interpolated across the step boundary.
 *
 * The direction is carried here too, not only the target and distance: a step
 * whose subject is somewhere else in the anatomy needs to be looked at from
 * somewhere else, and swinging round is itself part of the explanation. Most
 * steps share one direction so the move happens rarely and means something when
 * it does.
 */
export function cameraAt(t) {
  const index = STORY_STEPS.findIndex((entry) => t >= entry.at && t < entry.until);
  const step = STORY_STEPS[index] ?? STORY_STEPS[STORY_STEPS.length - 1];
  const previous = STORY_STEPS[Math.max(0, index - 1)] ?? step;
  // Long enough to read as a move, short enough that the viewer never loses
  // where they are. The swing round to the pulmonary side is given more room
  // than the small adjustments between ventricle steps.
  const from = previous.view ?? DEFAULT_VIEW;
  const to = step.view ?? DEFAULT_VIEW;
  const swings = !from.equals(to);
  const blend = swings ? 2.2 : 1.1;
  const mix = Math.min(1, Math.max(0, (t - step.at) / blend));
  const eased = mix * mix * (3 - 2 * mix);
  // When the view swings to another part of the anatomy, the move is staged:
  // the camera dollies out through the middle of the orbit and settles back
  // in as it arrives, so orientation is never lost in a flat pan.
  const dollyOut = swings ? Math.sin(Math.PI * eased) * 4.2 : 0;
  return {
    target: previous.camera.target.clone().lerp(step.camera.target, eased),
    distance: previous.camera.distance + (step.camera.distance - previous.camera.distance) * eased + dollyOut,
    view: from.clone().lerp(to, eased).normalize(),
  };
}

/** Caption, with a short fade at each end so text never snaps. */
export function captionAt(t) {
  const { step } = stepAt(t);
  // The fade-out is there to make room for the next caption. The last step has
  // no next, and the sequence deliberately holds on its final frame rather than
  // snapping away — so its caption stays up with the picture it belongs to.
  const last = step === STORY_STEPS[STORY_STEPS.length - 1];
  const rise = Math.min(1, Math.max(0, (t - step.at) / 0.3));
  return {
    text: step.caption,
    textJa: step.captionJa,
    // Shown under the first caption only, and only while that step is on
    // screen: the course this model draws is one pattern, not the natural
    // history of heart failure, and that has to be said before it is drawn.
    note: step.note ?? '',
    noteJa: step.noteJa ?? '',
    part: step.part,
    opacity: last ? rise * rise * (3 - 2 * rise) : cueOpacity(t, step.at, step.until, 0.3),
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
 * How much the surrounding pathway — atrium, pulmonary veins, vascular bed —
 * should be brought forward. Presentation only; the same control the reel uses.
 */
export function contextAt(t) {
  const { step, local } = stepAt(t);
  const previous = STORY_STEPS[Math.max(0, STORY_STEPS.indexOf(step) - 1)];
  const from = previous?.context ?? 0;
  const to = step.context ?? 0;
  const eased = local * local * (3 - 2 * local);
  return from + (to - from) * eased;
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
