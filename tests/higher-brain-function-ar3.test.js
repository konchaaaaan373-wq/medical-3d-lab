import test from 'node:test';
import assert from 'node:assert/strict';

import { PATHWAY_STATE } from '../src/models/higherBrainFunction.js';
import { PALETTE } from '../src/data/higherBrainFunction.js';
import HigherBrainFunctionScene from '../src/scenes/nervous/scenes/higherBrainFunction/index.js';
import { fixtureAtlas } from './fixtures/brainAtlas.js';

/**
 * The third audit's counter-examples: what the *animation* was still saying.
 *
 * Both are the same shape of mistake as the read-out row that stayed on screen
 * after a reset — state that belongs to the previous moment, left behind
 * because the code that would have cleared it returned early. The picture is
 * the one place a caveat cannot reach, so these assert the meshes after
 * `_applyCycle` rather than the view model that feeds it: a `routeDisplay()`
 * that returns the right thing and a scene that draws the wrong thing is
 * exactly the failure this file exists for.
 */

const ATLAS = fixtureAtlas();
const scenes = [];

function buildScene(controls = {}, progress = 1) {
  const scene = new HigherBrainFunctionScene({ atlas: ATLAS.clone(true) });
  scene.build();
  for (const [id, value] of Object.entries(controls)) scene.setModelControl(id, value);
  scene.setProgress(progress);
  scenes.push(scene);
  return scene;
}

test.after(() => {
  for (const scene of scenes) scene.dispose?.();
});

const CYCLE = HigherBrainFunctionScene.CYCLE_SECONDS;
const { askedUntil, travelUntil } = HigherBrainFunctionScene.CYCLE_PHASES;
/** The middle of each part of a run, so a flash is at its brightest. */
const ASKED = CYCLE * askedUntil * 0.5;
const TRAVELLING = CYCLE * (askedUntil + travelUntil) * 0.5;
const ANSWERED = CYCLE * (travelUntil + 1) * 0.5;

/**
 * A task this model has no route for.
 *
 * Set through `setModelControl`, which is the scene's own public method, and
 * **not** through the task control a reader sees: `TRACEABLE_TASKS` offers only
 * tasks with routes, so a reader cannot reach this state by pressing anything.
 * That is worth having anyway — the scene's contract says a task without a
 * route reports `not_modeled` rather than crashing or drawing a stopped signal,
 * and a guard that only covers what today's controls offer stops guarding the
 * moment a control is added.
 */
const UNROUTED = 'reading-aloud';

const litness = (scene) => ({
  stimulus: [scene.stimulus.mesh.visible, scene.stimulus.material.opacity],
  answer: [scene.answer.mesh.visible, scene.answer.material.opacity],
  pulse: scene.pulse.visible,
});

const nothingLit = (scene, where) => {
  const state = litness(scene);
  assert.deepEqual(state.stimulus, [false, 0], `${where}: the word being asked is not still lit`);
  assert.deepEqual(state.answer, [false, 0], `${where}: the answer is not still lit`);
  assert.equal(state.pulse, false, `${where}: the signal marker is not still shown`);
};

// --- AR3-T07, T08: switching away mid-flash ---------------------------------

test('AR3-T07: switching to a task with no route while the word is being asked clears it', () => {
  const scene = buildScene({ task: 'repetition-nonword' }, 0);
  scene.renderAtSeconds(ASKED);
  assert.equal(scene.stimulus.mesh.visible, true, 'the word is being asked');
  assert.ok(scene.stimulus.material.opacity > 0);

  scene.setModelControl('task', UNROUTED);
  assert.equal(scene.routePoints().length, 0, 'there is nothing to draw');
  nothingLit(scene, 'straight after the switch');

  // And the next frame does not bring it back.
  scene.renderAtSeconds(ASKED + 0.05);
  nothingLit(scene, 'on the next frame');
});

test('AR3-T08: switching to a task with no route while the answer is coming back clears it', () => {
  const scene = buildScene({ task: 'repetition-nonword' }, 0);
  scene.renderAtSeconds(ANSWERED);
  assert.equal(scene.answer.mesh.visible, true, 'an answer is coming back');
  assert.ok(scene.answer.material.opacity > 0);

  scene.setModelControl('task', UNROUTED);
  nothingLit(scene, 'straight after the switch');
  scene.renderAtSeconds(ANSWERED + 0.05);
  nothingLit(scene, 'on the next frame');
});

test('AR3-T09: a route, then none, then another route, and the picture is the new one', () => {
  const scene = buildScene({ task: 'repetition-nonword' }, 0);
  scene.renderAtSeconds(TRAVELLING);
  const first = scene.pulse.position.clone();
  assert.equal(scene.pulse.visible, true);

  scene.setModelControl('task', UNROUTED);
  scene.renderAtSeconds(TRAVELLING);
  nothingLit(scene, 'with no route');

  scene.setModelControl('task', 'reading-comprehension-word');
  scene.renderAtSeconds(TRAVELLING);
  assert.equal(scene.pulse.visible, true, 'the signal is back');
  assert.ok(scene.routePoints().length > 1, 'on a route of its own');
  // On the route the reader is now tracing, not where the old one left it.
  const onCurve = scene.routeCurve.getPoint(0.5);
  assert.ok(
    scene.pulse.position.distanceTo(first) > 0.3,
    'and not parked where the previous task stopped'
  );
  assert.ok(Number.isFinite(onCurve.x));
  assert.equal(scene.pulseMaterial.color.getHex(), Number.parseInt(PALETTE.carrying.slice(1), 16));
});

// --- AR3-T10: a signal stopped at the door does not step through it ---------

test('AR3-T10: a true zero on the first step keeps the signal at the entrance', () => {
  // Both auditory cortices gone: the first process of the repetition route is
  // at a true zero, so nothing enters at all.
  const scene = buildScene({ lesion: 'bilateral-auditory-cortex', task: 'repetition-nonword' }, 1);
  const display = scene.routeDisplay();
  assert.equal(display.kind, HigherBrainFunctionScene.DISPLAY.BLOCKED);
  assert.equal(display.reach, 0, 'it gets nowhere');
  assert.equal(display.stop.id, 'auditory-input');

  const entrance = scene.routePositions[0].position.clone();
  for (const [when, at] of [['asked', ASKED], ['travelling', TRAVELLING], ['answered', ANSWERED]]) {
    scene.renderAtSeconds(at);
    assert.ok(
      scene.pulse.position.distanceTo(entrance) < 1e-6,
      `${when}: the signal is at the entrance, not past it (${scene.pulse.position.distanceTo(entrance).toFixed(4)})`
    );
    assert.equal(scene.answer.mesh.visible, false, `${when}: and nothing comes back`);
  }
  assert.equal(scene.answerStrength(), 0);
});

test('AR3-T10b: a route stopped further along stops there, and not at the end', () => {
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  const display = scene.routeDisplay();
  assert.equal(display.kind, HigherBrainFunctionScene.DISPLAY.BLOCKED);
  assert.ok(display.reach > 0 && display.reach < 1, `stopped part of the way (${display.reach})`);
  scene.renderAtSeconds(ANSWERED);
  const stopped = scene.routeCurve.getPoint(display.reach);
  assert.ok(scene.pulse.position.distanceTo(stopped) < 1e-6, 'the marker is where the route stops');
});

// --- AR3-T11: a positive route still answers --------------------------------

test('AR3-T11: a weak positive route reaches the end, and the brightness floor changes no value', () => {
  const { DISPLAY } = HigherBrainFunctionScene;
  // Three-quarters of the arcuate: positive, and in the bottom band.
  const weak = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 0.8);
  const weakTask = weak.tracedTask();
  assert.equal(weakTask.state, PATHWAY_STATE.LOW);
  assert.ok(weakTask.availability > 0);
  assert.equal(weak.routeDisplay().kind, DISPLAY.WEAK);
  assert.equal(weak.routeDisplay().reach, 1, 'it gets to the far end');
  weak.renderAtSeconds(ANSWERED);
  assert.equal(weak.answer.mesh.visible, true, 'and something comes back');
  assert.ok(weak.answer.material.opacity > 0);
  const far = weak.routePositions.at(-1).position;
  assert.ok(weak.pulse.position.distanceTo(far) < 1e-6, 'the signal is at the end of the route');

  // A value far below the brightness floor is drawn at the floor and is still
  // the model's own number: the floor is a property of the dot. Driven through
  // the scene's own controls rather than by assigning a solved state, so that
  // what is being tested is the scene a reader operates.
  const tiny = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 0.99996);
  const tinyTask = tiny.tracedTask();
  assert.ok(tinyTask.availability > 0 && tinyTask.availability < 1e-3, `${tinyTask.availability}`);
  assert.equal(tiny.routeDisplay().reach, 1);
  assert.equal(tiny.answerStrength(), HigherBrainFunctionScene.ANSWER_VISIBILITY_FLOOR);
  assert.notEqual(tinyTask.availability, HigherBrainFunctionScene.ANSWER_VISIBILITY_FLOOR);
  assert.equal(tiny.routeDisplay().kind, DISPLAY.WEAK, 'and it is not a blockade');
});
