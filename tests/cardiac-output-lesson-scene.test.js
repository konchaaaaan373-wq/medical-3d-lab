import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { solveLessonConditions } from '../src/models/cardiacOutputLesson.js';
import {
  BLOOD_UNITS_PER_ML,
  LESSON_VIEW_DIRECTION,
  gaugeAngle,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonCirculation.js';
import { LESSON_TIMELINE } from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonStoryboard.js';

/**
 * The introductory lesson's 3D, against what it is for: that a reader who
 * does not read the numbers can still see **where** the intervention acts and
 * **how much** each heart sends out — and that two circulations put side by
 * side differ on screen only by what the model solved.
 *
 * Every figure the drawing is checked against comes from the solver here, not
 * from the drawing.
 */

const solved = solveLessonConditions();
const m = (id) => solved[id].metrics;

function withBrowserGlobals(run) {
  const previousWindow = globalThis.window;
  const previousNavigator = globalThis.navigator;
  globalThis.window = { innerWidth: 1280, innerHeight: 900 };
  if (previousNavigator === undefined) globalThis.navigator = { hardwareConcurrency: 8 };
  try {
    return run();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousNavigator === undefined) delete globalThis.navigator;
  }
}

async function buildScene() {
  const module = await import('../src/scenes/cardiovascular/scenes/cardiacOutput/index.js');
  const camera = new THREE.PerspectiveCamera(42, 1.6, 0.1, 200);
  const viewer = { camera, onResize: () => () => {} };
  const scene = withBrowserGlobals(() => {
    const built = new module.default({ viewer });
    built.build();
    return built;
  });
  /** The camera where the shell would put it: on the view axis through the subject's middle. */
  const frame = () => {
    const { centre } = scene.getSubjectBounds();
    camera.position.copy(centre).addScaledVector(LESSON_VIEW_DIRECTION, 40);
    camera.lookAt(centre);
    camera.updateMatrixWorld();
  };
  frame();
  return { module, scene, camera, frame };
}

/** Run the beat until the hold has landed (or give up after a few seconds). */
function settle(scene, seconds = 4) {
  for (let t = 0; t < seconds; t += 1 / 30) {
    scene.update(1 / 30);
    if (scene.holding) break;
  }
}

test('the route opens the lesson; the full model is one view away, unchanged', async () => {
  const { module } = await buildScene();
  assert.equal(module.default.meta.layout, 'lesson');
  assert.equal(module.default.meta.id, 'cardiac-output');
  const { CardiacOutputScene } = await import('../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js');
  assert.equal(module.views.detail, CardiacOutputScene, 'the detailed model is the same class it always was');
  assert.equal(CardiacOutputScene.meta.layout, 'experiment');
});

test('where it acts: the small vessels narrow from A to B, and the heart is not what changes', async () => {
  const { scene } = await buildScene();
  scene.update(1 / 30);
  const before = scene.presentationState().primary;
  scene.session.setPrimary('B', { immediate: true });
  scene.update(1 / 30);
  const after = scene.presentationState().primary;
  assert.ok(after.calibre < before.calibre * 0.75, `the vessels are drawn narrower (${before.calibre} → ${after.calibre})`);
  assert.equal(after.bedVessels, before.bedVessels, 'the same vessels, all of them — never one ring');
  // The contractility the chamber is drawn from is the same in A and B.
  assert.equal(scene.session.primary.input.contractilityEesMmHgPerMl, solved.A.input.contractilityEesMmHgPerMl);
});

test('how much: at the moment of comparison each stroke is as long as its stroke volume', async () => {
  const { scene, frame } = await buildScene();
  scene.session.setPrimary('B', { immediate: true });
  scene.setPresentation({ hold: true });
  settle(scene);
  assert.ok(scene.holding, 'the beat stops at the moment of comparison');
  const alone = scene.presentationState().primary;
  const artery = scene.primary.arteryLength;
  const expect = (id) => (BLOOD_UNITS_PER_ML * m(id).strokeVolumeMl) / artery;
  assert.ok(Math.abs(alone.strokeLength - expect('B')) < 0.01, `B's stroke (${alone.strokeLength}) is B's volume`);
  assert.ok(Math.abs(alone.beforeStrokeLength - expect('A')) < 0.01, 'A is drawn round it at the same moment');

  scene.session.setShowOther(true);
  frame();
  scene.setPresentation({ hold: false });
  scene.update(1 / 30);
  scene.setPresentation({ hold: true });
  settle(scene, 6);
  const pair = scene.presentationState();
  assert.ok(pair.holding);
  assert.equal(pair.primary.beforeStrokeLength, null, 'beside C, A’s marks are gone');
  const ratio = pair.primary.strokeLength / pair.other.strokeLength;
  const svRatio = m('B').strokeVolumeMl / m('C').strokeVolumeMl;
  assert.ok(Math.abs(ratio - svRatio) < 0.02, `the two strokes are in the ratio of the two volumes (${ratio} vs ${svRatio})`);
});

test('about the same pressure reads as the same needle; A’s needle is apart from B’s', async () => {
  const { scene, frame } = await buildScene();
  scene.session.setPrimary('B', { immediate: true });
  scene.update(1 / 30);
  const alone = scene.presentationState().primary;
  assert.ok(Math.abs(alone.needleAngle - gaugeAngle(m('B').meanArterialPressureMmHg)) < 1e-9);
  const degrees = (radians) => (Math.abs(radians) * 180) / Math.PI;
  assert.ok(degrees(alone.beforeNeedleAngle - alone.needleAngle) > 15, 'A → B is a needle that visibly moved');

  scene.session.setShowOther(true);
  frame();
  scene.update(1 / 30);
  const pair = scene.presentationState();
  assert.ok(degrees(pair.primary.needleAngle - pair.other.needleAngle) < 3, 'B and C point the same way');
  assert.equal(pair.primary.beforeNeedleAngle, null);
});

test('output moves the blood faster; C’s vessels are not narrowed', async () => {
  const { scene, frame } = await buildScene();
  scene.session.setPrimary('B', { immediate: true });
  scene.session.setShowOther(true);
  frame();
  scene.update(1 / 30);
  const { primary, other } = scene.presentationState();
  assert.ok(other.flowRate > primary.flowRate, 'C moves more blood a minute, and it is drawn moving faster');
  assert.ok(other.calibre > primary.calibre, 'B’s vessels are the narrowed ones');
});

test('the same view of both: equidistant from the camera, and seen from the same angle', async () => {
  // Guard for a failure that passed every other check: set out along world x,
  // the right-hand circulation stood nearer a camera that looks from the right
  // and was drawn larger and lower than the left one — a difference in the
  // picture that no figure had (docs/organ-3d-playbook.md).
  for (const arrangement of ['row', 'column']) {
    const { scene, camera, frame } = await buildScene();
    scene.setArrangement(arrangement);
    scene.session.setShowOther(true);
    frame();
    scene.update(1 / 30);
    const centreOf = (unit) => {
      const box = new THREE.Box3().setFromPoints(unit.worldCorners());
      return box.getCenter(new THREE.Vector3());
    };
    const d1 = camera.position.distanceTo(centreOf(scene.primary));
    const d2 = camera.position.distanceTo(centreOf(scene.other));
    assert.ok(Math.abs(d1 - d2) < 0.01, `${arrangement}: ${d1.toFixed(3)} and ${d2.toFixed(3)} from the camera`);
    for (const unit of [scene.primary, scene.other]) {
      const local = camera.position.clone().sub(centreOf(unit)).normalize().applyQuaternion(unit.quaternion.clone().invert());
      assert.ok(local.angleTo(LESSON_VIEW_DIRECTION) < 1e-3, `${arrangement}: ${unit.name} is seen along the lesson's view`);
    }
  }
});

test('the hold is only a pause: the model is the same while the beat stands still', async () => {
  const { scene } = await buildScene();
  scene.session.setPrimary('B', { immediate: true });
  const input = { ...scene.session.primary.input };
  const map = scene.session.primary.metrics.meanArterialPressureMmHg;
  scene.setPresentation({ hold: true });
  settle(scene);
  const phase = scene.phase;
  for (let i = 0; i < 10; i++) scene.update(1 / 30);
  assert.equal(scene.phase, phase, 'the beat does not move while held');
  assert.deepEqual({ ...scene.session.primary.input }, input);
  assert.equal(scene.session.primary.metrics.meanArterialPressureMmHg, map);
  assert.ok(Math.abs(scene.phase - scene.comparisonPhase()) < 1e-9);
});

test('the lesson API: the explanation drives the one session, and hands it over whole', async () => {
  const { scene } = await buildScene();
  const lesson = scene.getLesson();
  for (const step of LESSON_TIMELINE) {
    const shown = lesson.explainAt(step.until - 0.01);
    assert.equal(LESSON_TIMELINE[shown.index].id, step.id);
    assert.ok(shown.tags.length <= 2);
    assert.ok(shown.caption.heading.ja && shown.caption.text.ja);
    const expected = step.id === 'start' ? 'A' : 'B';
    assert.equal(scene.session.primaryId, expected, `${step.id} ends on ${expected}`);
    assert.equal(scene.session.showOther, ['other', 'conclusion'].includes(step.id));
    assert.equal(lesson.chips().length, scene.session.showOther ? 2 : 1);
  }
  // Stopped half way through the walk: the buttons know A and B, so it finishes at B.
  const constrict = LESSON_TIMELINE.find((step) => step.id === 'constrict');
  lesson.explainAt(constrict.at + (constrict.walk.from + constrict.walk.to) / 2);
  assert.equal(scene.session.primaryId, null, 'between A and B');
  lesson.handOver();
  for (let i = 0; i < 120 && scene.session.walking; i++) scene.update(1 / 30);
  assert.equal(scene.session.primaryId, 'B');
  // Every part a tag names has somewhere to hang.
  for (const part of ['heart', 'ejected', 'bed', 'gauge', 'chip']) {
    assert.ok(scene.getLessonAnchor('primary', part) instanceof THREE.Vector3, part);
  }
  lesson.reset();
  assert.equal(scene.getLessonAnchor('other', 'heart'), null, 'C has no anchors while it is not drawn');
  assert.equal(lesson.tags().length, 4, 'a first look names every part');
});
