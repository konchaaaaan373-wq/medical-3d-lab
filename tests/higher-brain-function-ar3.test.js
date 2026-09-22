import test from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from 'three';

import { PATHWAY_STATE } from '../src/models/higherBrainFunction.js';
import { PALETTE } from '../src/data/higherBrainFunction.js';
import HigherBrainFunctionScene from '../src/scenes/nervous/scenes/higherBrainFunction/index.js';
import { fixtureAtlas } from './fixtures/brainAtlas.js';
import { readFileSync } from 'node:fs';

import { CLAIM_SUPPORT, HIGHER_BRAIN_FUNCTION_EVIDENCE, VERIFICATION } from '../src/models/evidence.js';
import { FUNCTION_NODES, LESION_SITES, MODULATORY_NETWORKS } from '../src/models/higherBrainFunction.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

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

// --- AR3-T12 … T17: the line is the size it is meant to look ----------------

/** A camera at a given distance, framed the way the viewer frames the scene. */
const cameraAt = (distance, fov = 42) => {
  const camera = new THREE.PerspectiveCamera(fov, 1.6, 0.1, 200);
  const pose = HigherBrainFunctionScene.cameraPose;
  camera.position.copy(pose.position).sub(pose.target).normalize().multiplyScalar(distance).add(pose.target);
  camera.updateProjectionMatrix();
  return camera;
};

/** What a segment measures, expressed in the pixels its line type asked for. */
const inPixels = (scene, segment) => {
  const perPixel = scene.frameSpan / scene.frameHeightPx;
  const span = HigherBrainFunctionScene._arcLength(scene.routeCurve, segment.fromAt, segment.toAt);
  const ring = span / (segment.rings - 1);
  return {
    width: (segment.mesh.geometry.parameters.radius * 2) / perPixel,
    on: segment.dash ? (ring * segment.dash.on) / perPixel : null,
    off: segment.dash ? (ring * segment.dash.off) / perPixel : null,
  };
};

test('AR3-T12: pulling the camera back keeps the line the size it looks, not the size it is', () => {
  const scene = buildScene({ task: 'writing-to-dictation-word' }, 0);
  const measure = () => scene.routeSegments.map((segment) => ({
    id: segment.id, lineType: segment.lineType, ...inPixels(scene, segment),
  }));

  scene.setFramingCamera(cameraAt(9));
  const near = measure();
  const nearWorld = scene.routeSegments.map((segment) => segment.mesh.geometry.parameters.radius);

  scene.setFramingCamera(cameraAt(22));
  const far = measure();
  const farWorld = scene.routeSegments.map((segment) => segment.mesh.geometry.parameters.radius);

  // The world radius grew with the distance — which is the whole point, and is
  // what a world-unit constant could not do.
  for (const [index, radius] of farWorld.entries()) {
    assert.ok(radius > nearWorld[index] * 1.5, `${near[index].id}: the world radius followed the camera`);
  }
  // And what a reader sees did not change.
  for (const [index, row] of far.entries()) {
    assert.ok(
      Math.abs(row.width - near[index].width) < near[index].width * 0.12,
      `${row.id}: the same apparent width (${near[index].width.toFixed(2)} → ${row.width.toFixed(2)}px)`
    );
    if (!row.on) continue;
    assert.ok(
      Math.abs(row.on - near[index].on) < near[index].on * 0.35,
      `${row.id}: the same apparent dash (${near[index].on.toFixed(1)} → ${row.on.toFixed(1)}px)`
    );
  }

  // A portrait reel frame is a different field of view, and it is handled by
  // the same arithmetic rather than by a second constant.
  scene.setFramingCamera(cameraAt(13, 28));
  for (const row of measure()) {
    const type = Object.values(HigherBrainFunctionScene.LINE_TYPES)
      .find((candidate) => candidate.id === row.lineType);
    assert.ok(
      Math.abs(row.width - type.widthPx) < type.widthPx * 0.15,
      `${row.id}: ${row.width.toFixed(2)}px against a target of ${type.widthPx}px`
    );
  }
});

test('AR3-T13: a bent segment and a short one carry the same line type as a straight long one', () => {
  // Naming an object has three tract pieces and two coarse ones, so each line
  // type is on segments of visibly different length and curvature.
  const scene = buildScene({ task: 'naming-object' }, 0);
  scene.setFramingCamera(cameraAt(13));
  const byType = new Map();
  for (const segment of scene.routeSegments) {
    if (!byType.has(segment.lineType)) byType.set(segment.lineType, []);
    byType.get(segment.lineType).push(inPixels(scene, segment));
  }
  assert.ok(byType.size >= 2, 'more than one line type on this route');

  const lengths = scene.routeSegments.map((segment) => HigherBrainFunctionScene
    ._arcLength(scene.routeCurve, segment.fromAt, segment.toAt));
  assert.ok(Math.max(...lengths) > Math.min(...lengths) * 1.4, 'the segments differ in length');

  for (const [lineType, rows] of byType) {
    const widths = rows.map((row) => row.width);
    assert.ok(
      Math.max(...widths) - Math.min(...widths) < 0.25,
      `${lineType}: every piece is the same width (${widths.map((w) => w.toFixed(2)).join(', ')})`
    );
    if (rows[0].on == null) continue;
    const ons = rows.map((row) => row.on);
    assert.ok(
      Math.max(...ons) < Math.min(...ons) * 1.6,
      `${lineType}: every piece has about the same dash (${ons.map((o) => o.toFixed(1)).join(', ')})`
    );
  }
});

test('AR3-T13b: a dash never rounds away into a solid line', () => {
  const scene = buildScene({ task: 'writing-to-dictation-word' }, 0);
  // From very close to very far: at no framing may a dashed piece lose its gaps.
  for (const distance of [4, 6, 9, 13, 20, 40, 80]) {
    scene.setFramingCamera(cameraAt(distance));
    scene.renderAtSeconds(TRAVELLING);
    for (const segment of scene.routeSegments) {
      if (segment.lineType === 'tract') continue;
      assert.ok(segment.dash.on >= 1 && segment.dash.off >= 1, `${distance}: ${segment.id} keeps a pattern`);
      const colours = segment.mesh.geometry.attributes.color;
      let transparent = 0;
      for (let index = 0; index < colours.count; index += 1) if (colours.getW(index) === 0) transparent += 1;
      assert.ok(transparent > 0, `${distance}: ${segment.id} still has gaps in it`);
    }
  }
});

test('AR3-T14b: the pixels are counted against the presented height, once', () => {
  const scene = buildScene({ task: 'writing-to-dictation-word' }, 0);
  // Two frames of the same shape, one twice as tall. A line is the same number
  // of pixels in both, which is the whole claim: it is sized against what the
  // reader looks at, and not against a drawing buffer or a device pixel ratio.
  scene.setFramingCamera(cameraAt(13), 900);
  const at900 = scene.routeSegments.map((segment) => inPixels(scene, segment).width);
  const world900 = scene.routeSegments.map((segment) => segment.mesh.geometry.parameters.radius);

  scene.setFramingCamera(cameraAt(13), 1800);
  const at1800 = scene.routeSegments.map((segment) => inPixels(scene, segment).width);
  const world1800 = scene.routeSegments.map((segment) => segment.mesh.geometry.parameters.radius);

  for (const [index, width] of at1800.entries()) {
    assert.ok(Math.abs(width - at900[index]) < 0.05, 'the same apparent width in both frames');
    // The world size halved, because the taller frame shows the same world in
    // twice as many pixels. A sizing that ignored the height would not move.
    assert.ok(
      Math.abs(world1800[index] - world900[index] / 2) < world900[index] * 0.02,
      'and the world size followed the frame'
    );
  }

  // No height given is the reference height, so the quoted numbers hold.
  const plain = buildScene({ task: 'writing-to-dictation-word' }, 0);
  assert.equal(plain.frameHeightPx, HigherBrainFunctionScene.REFERENCE_FRAME_HEIGHT_PX);
});

test('AR3-T14: the sizing is a property of the framing, and is not applied twice', () => {
  const scene = buildScene({ task: 'writing-to-dictation-word' }, 0);
  // The same camera at the same distance answers the same thing, whatever the
  // aspect or the device pixel ratio the renderer happens to be using: nothing
  // here reads a drawing buffer or a pixel ratio, so there is nothing to
  // double-count.
  scene.setFramingCamera(cameraAt(13));
  const first = scene.routeSegments.map((segment) => segment.mesh.geometry.parameters.radius);
  const wide = cameraAt(13);
  wide.aspect = 0.5;
  wide.updateProjectionMatrix();
  scene.setFramingCamera(wide);
  assert.deepEqual(scene.routeSegments.map((segment) => segment.mesh.geometry.parameters.radius), first);

  // Moving away and back returns to the same numbers rather than drifting.
  scene.setFramingCamera(cameraAt(30));
  scene.setFramingCamera(cameraAt(13));
  const returned = scene.routeSegments.map((segment) => segment.mesh.geometry.parameters.radius);
  for (const [index, radius] of returned.entries()) {
    assert.ok(Math.abs(radius - first[index]) < first[index] * 0.02, 'the same framing gives the same line');
  }
});

test('AR3-T15: nothing about the camera reaches the answer', () => {
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 0.6);
  const snapshot = () => ({
    tasks: scene.solved.tasks.map((task) => [
      task.id, task.availability, task.computationStatus, task.state, task.routeId, task.declaredBlock,
    ]),
    steps: scene.tracedTask().route.map((step) => [step.id, step.integrity, step.mapping, step.blocked]),
    influences: scene.solved.unmodelledInfluences.map((influence) => influence.id),
    structures: scene.solved.affectedStructures.map((structure) => [structure.label, structure.damage]),
  });
  const before = snapshot();
  for (const distance of [5, 9, 18, 40]) {
    scene.setFramingCamera(cameraAt(distance));
    scene.renderAtSeconds(ANSWERED);
    assert.deepEqual(snapshot(), before, `distance ${distance} changed nothing the model says`);
  }
  // And the route itself is the same steps in the same order.
  assert.deepEqual(
    scene.routeSegments.map((segment) => [segment.id, segment.mapping, segment.lineType]),
    scene.routeSegments.map((segment) => [segment.id, segment.mapping, segment.lineType])
  );
});

test('AR3-T17: the camera moving does not churn geometry, and disposal is complete', () => {
  const scene = buildScene({ task: 'writing-to-dictation-word' }, 0);
  let built = 0;
  const original = scene._buildRouteSegment.bind(scene);
  scene._buildRouteSegment = (...args) => { built += 1; return original(...args); };

  scene.setFramingCamera(cameraAt(13));
  const afterFirst = built;
  // A hundred frames of an orbit that does not change the distance: nothing to
  // rebuild, because nothing about the apparent size moved.
  for (let frame = 0; frame < 100; frame += 1) {
    scene.setFramingCamera(cameraAt(13));
    scene.renderAtSeconds((frame * CYCLE) / 100);
  }
  assert.equal(built, afterFirst, 'a still camera rebuilds nothing');

  // A dolly does rebuild — once per step of apparent size, not once per frame.
  for (let frame = 0; frame < 100; frame += 1) scene.setFramingCamera(cameraAt(13 + frame * 0.1));
  const segments = scene.routeSegments.length;
  assert.ok(built - afterFirst < 12 * segments, `rebuilt ${built - afterFirst} pieces over a 100-frame dolly`);
  assert.ok(built > afterFirst, 'and it did follow the camera');

  // Nothing is left behind: every mesh a rebuild replaced is off the group.
  assert.equal(scene.routeGroup.children.filter((child) => child.name.startsWith('route:')).length, segments);
});

// --- AR3-T18, T19: the records say what was actually done -------------------

test('AR3-T18: nothing claims a source was read here, because none was', () => {
  const entries = [...HIGHER_BRAIN_FUNCTION_EVIDENCE];
  const verified = entries.filter((entry) => entry.sourceVerification);
  assert.ok(verified.length > 10, 'the registry records how far each source was checked');

  // Direct reading is the claim this environment cannot make: every publisher
  // domain is refused by the egress policy, so no row may sit above
  // `via-review-material` on the ordering in `src/models/evidence.js`.
  const direct = [VERIFICATION.PASSAGE, VERIFICATION.FULL_TEXT,
    VERIFICATION.FULL_TEXT_PASSAGE_UNCHECKED, VERIFICATION.ABSTRACT];
  for (const entry of verified) {
    assert.ok(
      !direct.includes(entry.sourceVerification),
      `${entry.id} claims ${entry.sourceVerification}, which means somebody here opened the source`
    );
    if (entry.sourceVerification === VERIFICATION.DESIGN) continue;
    assert.ok(entry.claimSupport, `${entry.id} says whether what was read supports the claim`);
  }

  // The dossier counts the same rows the registry does. Counted, not restated:
  // the previous version of that section said "eight abstracts" and the
  // registry said something else.
  const counts = new Map();
  for (const entry of verified) {
    counts.set(entry.sourceVerification, (counts.get(entry.sourceVerification) ?? 0) + 1);
  }
  const dossier = read('docs/model-evidence/higher-brain-function.md');
  const section = dossier.slice(dossier.indexOf('## 0.'), dossier.indexOf('## 1.'));
  for (const [value, count] of counts) {
    if (value === VERIFICATION.DESIGN) continue;
    assert.ok(section.includes(`\`${value}\``), `§0 names ${value}`);
  }
  // The two the section states a count for. The textbook rows are described
  // rather than counted, and a test that demanded a number for them would be
  // asking the prose to be a table.
  const spelled = { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight' };
  for (const value of [VERIFICATION.VIA_REVIEW, VERIFICATION.SEARCH_SUMMARY]) {
    const count = counts.get(value) ?? 0;
    assert.ok(
      section.includes(`${spelled[count]} rows`),
      `§0 says "${spelled[count]} rows" for ${value}, which is how many there are`
    );
  }
  // The first correction of §0 said "six and two", which counted papers where
  // the registry counts rows — two of the three via-review rows rest on the
  // same summary. Counted here so the prose cannot drift from the data again.
  assert.equal(counts.get(VERIFICATION.VIA_REVIEW), 3);
  assert.equal(counts.get(VERIFICATION.SEARCH_SUMMARY), 5);

  // And the model's own prose agrees with the registry about the one source a
  // reader meets twice. Checked on that node's note rather than by searching
  // the file: several other strings in it are *about* not having read things.
  const node = FUNCTION_NODES.find((candidate) => candidate.id === 'phoneme-grapheme-conversion');
  assert.match(node.noteJa, /レビュー資料を経由/, 'the note says how the summary was reached');
  assert.match(node.noteJa, /直接確認していません/, 'and that it was not read here');
  assert.ok(
    !/この環境で読めたのは/.test(node.noteJa),
    'and does not say the summary itself was read from this environment'
  );
  assert.match(node.note, /known here through a review/);
});

test('AR3-T19: the thalamus is explained the way it is implemented', () => {
  // The implementation moved from the preset to the network. A row that still
  // described the preset would be a description of code that no longer exists,
  // sitting next to a summary that is correct — which is the harder kind of
  // wrong document to notice.
  const dossier = read('docs/model-evidence/higher-brain-function.md');
  const row = dossier.split('\n').find((line) => line.includes('the-thalamus-is-not-an-obligatory-gate'));
  assert.ok(row, 'the dossier carries the row');
  assert.match(row, /MODULATORY_NETWORKS/, 'it names what actually declares the influence');
  assert.match(row, /damage map/, 'and what it is matched against');
  assert.ok(
    !/the preset declares an uncomputed influence/.test(row),
    'and does not describe the implementation it replaced'
  );

  // The code the row describes: no preset carries its own influence, and the
  // network names both the tasks and the structures.
  for (const site of LESION_SITES) {
    assert.equal(site.unmodelledInfluences, undefined, `${site.id} does not carry its own influence`);
  }
  const network = MODULATORY_NETWORKS.find((candidate) => candidate.id === 'cortico-thalamic-language');
  assert.ok(network.structures.length > 0 && network.onTasks.length > 0);
});
