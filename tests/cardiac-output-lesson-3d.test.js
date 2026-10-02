import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { solveLessonConditions } from '../src/models/cardiacOutputLesson.js';
import {
  DIAL_MAX_MMHG,
  JUG_MAX_LITRES,
  UNIT_LAYOUT,
  buildLessonUnit,
  calibreFor,
  dialAngleFor,
  jugLevelFor,
  squeezeFor,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonModel3D.js';
import { PLACES, SCREEN_RIGHT, VIEW_DIRECTION } from '../src/scenes/cardiovascular/scenes/cardiacOutput/LessonStage3D.js';

/**
 * The introductory lesson's 3D figure (`lessonModel3D.js`, `LessonStage3D.js`),
 * against what the owner asked of it (2026-10-02): one clear model of the heart
 * and the small vessels of the whole body; the change made **on the model**;
 * A, B and C compared **from one viewpoint at one scale**; nothing that zooms
 * out or grows again from zero.
 *
 * What these can see is the drawing's arithmetic and the unit's state. What
 * they cannot — a part drawn at another size on a phone, a word standing on
 * another, the level as a reader sees it — `scripts/lib/lesson-drive.mjs`
 * measures on screen in a browser.
 */

const solved = solveLessonConditions();
const m = (id) => solved[id].metrics;
const stateOf = (id) => ({
  mapMmHg: m(id).meanArterialPressureMmHg,
  outputLMin: m(id).cardiacOutputLMin,
  strokeVolumeMl: m(id).strokeVolumeMl,
  resistance: m(id).systemicResistanceMmHgSPerMl,
});
const rest = { squeeze: 0, ejecting: 0 };

test('one scale for every circulation: the dial and the jug read the same for A, B and C', () => {
  assert.equal(dialAngleFor(0), Math.PI);
  assert.equal(dialAngleFor(DIAL_MAX_MMHG), 0);
  assert.equal(jugLevelFor(0), 0);
  assert.equal(jugLevelFor(JUG_MAX_LITRES), UNIT_LAYOUT.jugHeight);
  // Every solved value inside the range it is drawn on, so none is cut off.
  for (const id of ['A', 'B', 'C']) {
    assert.ok(m(id).meanArterialPressureMmHg < DIAL_MAX_MMHG, `${id}'s pressure is on the dial`);
    assert.ok(m(id).cardiacOutputLMin < JUG_MAX_LITRES, `${id}'s output is in the jug`);
  }
  // In proportion: twice the output, twice the level.
  assert.ok(Math.abs(jugLevelFor(4) - 2 * jugLevelFor(2)) < 1e-12);
});

test('what a reader is meant to see: B narrower, the pressures near, C’s output higher', () => {
  // The vessels: B's narrower than A's; C's never narrowed.
  assert.ok(calibreFor(m('B').systemicResistanceMmHgSPerMl) < calibreFor(m('A').systemicResistanceMmHgSPerMl) * 0.7);
  assert.equal(calibreFor(m('C').systemicResistanceMmHgSPerMl), calibreFor(m('A').systemicResistanceMmHgSPerMl));
  // The needles: B and C within a couple of degrees; A's clearly short of B's.
  const degrees = (mmHg) => (dialAngleFor(mmHg) * 180) / Math.PI;
  assert.ok(Math.abs(degrees(m('B').meanArterialPressureMmHg) - degrees(m('C').meanArterialPressureMmHg)) < 3);
  assert.ok(degrees(m('A').meanArterialPressureMmHg) - degrees(m('B').meanArterialPressureMmHg) > 15);
  // The jugs: C's level clearly over B's.
  assert.ok(jugLevelFor(m('C').cardiacOutputLMin) - jugLevelFor(m('B').cardiacOutputLMin) > 0.25 * UNIT_LAYOUT.jugHeight);
  // The squeeze is the stroke volume: C's heart pushes out more each beat, B's
  // less than A's — not because it was changed (it was not), but because it
  // pushes against narrower vessels. The words say so (scene 2).
  assert.ok(squeezeFor(m('C').strokeVolumeMl) > squeezeFor(m('A').strokeVolumeMl));
  assert.ok(squeezeFor(m('A').strokeVolumeMl) > squeezeFor(m('B').strokeVolumeMl));
  assert.equal(solved.B.input.contractilityEesMmHgPerMl, solved.A.input.contractilityEesMmHgPerMl);
});

test('the unit draws what it was given, and says when it has arrived there', () => {
  const unit = buildLessonUnit();
  unit.setState(stateOf('A'));
  unit.update(0, { ...rest, instant: true });
  const now = unit.drawnNow();
  assert.equal(now.level, jugLevelFor(m('A').cardiacOutputLMin));
  assert.equal(now.angle, dialAngleFor(m('A').meanArterialPressureMmHg));
  assert.equal(now.calibre, calibreFor(m('A').systemicResistanceMmHgSPerMl));
  assert.equal(now.calm, true);
  // A change is not arrived the moment it is set.
  unit.setState(stateOf('B'));
  unit.update(1 / 60, rest);
  assert.equal(unit.drawnNow().calm, false);
  // …and it does arrive: the ease ends, it does not approach for ever.
  for (let i = 0; i < 600; i++) unit.update(1 / 60, rest);
  assert.equal(unit.drawnNow().calm, true);
  assert.equal(unit.drawnNow().level, jugLevelFor(m('B').cardiacOutputLMin));
  unit.dispose();
});

test('nothing grows again from zero: the level and the vessels move from where they are to where they go', () => {
  const unit = buildLessonUnit();
  unit.setState(stateOf('A'));
  unit.update(0, { ...rest, instant: true });
  const between = (value, a, b) => value >= Math.min(a, b) - 1e-9 && value <= Math.max(a, b) + 1e-9;
  for (const [from, to] of [
    ['A', 'B'],
    ['B', 'A'],
  ]) {
    unit.setState(stateOf(to));
    for (let i = 0; i < 300; i++) {
      unit.update(1 / 60, rest);
      const now = unit.drawnNow();
      assert.ok(between(now.level, jugLevelFor(m(from).cardiacOutputLMin), jugLevelFor(m(to).cardiacOutputLMin)), `${from}→${to}: the level left the range between them (${now.level})`);
      assert.ok(
        between(now.calibre, calibreFor(m(from).systemicResistanceMmHgSPerMl), calibreFor(m(to).systemicResistanceMmHgSPerMl)),
        `${from}→${to}: the vessels left the range between them`
      );
    }
  }
  // A circulation drawn for the first time is drawn as it is — C arrives at its level.
  const other = buildLessonUnit();
  other.setState(stateOf('C'));
  other.update(1 / 60, rest);
  assert.equal(other.drawnNow().level, jugLevelFor(m('C').cardiacOutputLMin));
  unit.dispose();
  other.dispose();
});

test('the small vessels are twelve, always: the action changes their width, never their number', () => {
  const unit = buildLessonUnit();
  const count = () => unit.object.getObjectByName('small-vessels').children.length;
  const before = count();
  unit.setState(stateOf('B'));
  unit.update(0, { ...rest, instant: true });
  assert.equal(count(), before);
  assert.equal(before, 12 + 2, 'twelve small vessels and the two they run between');
  unit.dispose();
});

test('A is drawn in B as cream marks while they are compared, and only then', () => {
  const unit = buildLessonUnit();
  unit.setState(stateOf('B'));
  unit.update(0, { ...rest, instant: true });
  const marks = () => unit.marks();
  unit.object.updateMatrixWorld(true);
  assert.equal(marks().before, null);
  assert.equal(marks().beforeTip, null);
  assert.equal(marks().beforeCalibre, null);
  unit.setBefore({ mapMmHg: m('A').meanArterialPressureMmHg, outputLMin: m('A').cardiacOutputLMin, resistance: m('A').systemicResistanceMmHgSPerMl });
  unit.object.updateMatrixWorld(true);
  const shown = marks();
  assert.ok(Math.abs(shown.before.y - shown.jugFloor.y - jugLevelFor(m('A').cardiacOutputLMin)) < 1e-9, 'the cream line at A’s level');
  assert.equal(shown.beforeCalibre, calibreFor(m('A').systemicResistanceMmHgSPerMl));
  // Built facing +z, so the dial lies in the unit's x–y plane.
  const angle = Math.atan2(shown.beforeTip.y - shown.hub.y, shown.beforeTip.x - shown.hub.x);
  assert.ok(Math.abs(angle - dialAngleFor(m('A').meanArterialPressureMmHg)) < 0.02, 'the cream needle at A’s pressure');
  unit.setBefore(null);
  unit.object.updateMatrixWorld(true);
  assert.equal(marks().before, null);
  unit.dispose();
});

test('with motion reduced the heart rests and the cells stand; the needle, the level and the vessels still say it all', () => {
  const unit = buildLessonUnit();
  unit.setState(stateOf('B'));
  unit.update(0, { ...rest, instant: true });
  const cells = [];
  unit.object.traverse((node) => node.isInstancedMesh && cells.push(node));
  assert.equal(cells.length, 3, 'arterial, small-vessel and venous cells');
  const snapshot = () => cells.map((mesh) => Array.from(mesh.instanceMatrix.array));
  const heart = unit.object.getObjectByName('ventricles');
  const before = snapshot();
  for (let i = 0; i < 30; i++) unit.update(1 / 30, { squeeze: 1, ejecting: 1, still: true });
  assert.deepEqual(snapshot(), before, 'the cells stood');
  assert.equal(heart.scale.x, 1, 'the heart rested');
  // Not still: they move, and the heart squeezes.
  unit.update(1 / 30, { squeeze: 1, ejecting: 1 });
  assert.notDeepEqual(snapshot(), before);
  assert.ok(heart.scale.x < 1);
  unit.dispose();
});

test('one viewpoint: the two places stand side by side on the screen, at one height, one step from the middle', () => {
  assert.ok(Math.abs(SCREEN_RIGHT.dot(VIEW_DIRECTION)) < 1e-12, 'across the view, not into it');
  assert.equal(SCREEN_RIGHT.y, 0, 'level: neither place stands higher');
  assert.ok(PLACES.primary.clone().add(PLACES.other).length() < 1e-12, 'one step either side of the middle');
  // Through the lesson's camera, the two places' centres are at one height on screen.
  const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 200);
  camera.position.copy(VIEW_DIRECTION).multiplyScalar(60);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const [p, o] = [PLACES.primary.clone().project(camera), PLACES.other.clone().project(camera)];
  assert.ok(Math.abs(p.y - o.y) < 1e-9, `the compared circulation stands at the main one's height (${p.y} vs ${o.y})`);
  assert.ok(p.x < 0 && o.x > 0, 'the main circulation on the left, the compared one on the right');
  // An orthographic camera: no nearer-is-bigger between them.
  assert.ok(camera.isOrthographicCamera);
});

test('the parts a check measures are boxed from what is drawn: the heart’s hidden arch is not in its box', () => {
  const unit = buildLessonUnit();
  const box = unit.restBoxes.heart;
  const height = box.max.y - box.min.y;
  // The heart is about two and a half units tall at its scale; the builder's arch would have made it three and a half.
  assert.ok(height > 2 && height < 3, `the heart's box is ${height.toFixed(2)} tall`);
  assert.ok(box.max.y < UNIT_LAYOUT.artery[0][1] + 0.5, 'its top is the heart’s, under where the artery leaves it');
  unit.dispose();
});

test('the blood is drawn in the model’s own units: cells as small solids, never as points sized by distance', () => {
  // The shared particle shader sizes a point by 1/depth for a perspective
  // camera; under this lesson's orthographic camera, sixty units away, that drew
  // every cell about two pixels wide (first prototype, 2026-10-02;
  // `docs/organ-3d-playbook.md`, V).
  const unit = buildLessonUnit();
  const points = [];
  const cells = [];
  unit.object.traverse((node) => {
    if (node.isPoints) points.push(node.name || node.type);
    if (node.isInstancedMesh) cells.push(node);
  });
  assert.deepEqual(points, []);
  for (const mesh of cells) {
    mesh.geometry.computeBoundingSphere();
    assert.ok(mesh.geometry.boundingSphere.radius >= 0.04, 'a cell is a solid in the unit’s units, big enough to see on a phone');
  }
  unit.dispose();
});
