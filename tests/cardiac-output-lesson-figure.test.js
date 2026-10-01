import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTROL_DOMAIN, RESULT_STATUS, solveCardiacOutput } from '../src/models/cardiacOutput.js';
import { lessonInput, solveLessonConditions } from '../src/models/cardiacOutputLesson.js';
import { bedCalibreFor } from '../src/scenes/cardiovascular/scenes/cardiacOutput/drawingScales.js';
import {
  BED,
  DIAL,
  FIGURE,
  HEART,
  LEGEND,
  STRIP,
  STRIP_TOPS,
  TUBE,
  circulationDrawing,
  heartPath,
  lumenWidth,
  needleAngle,
  squeezeAt,
  tubeLength,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonFigureGeometry.js';
import { LessonSession } from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonSession.js';
import { stripsFor } from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonStoryboard.js';

/**
 * The introductory lesson's figure, against what it is for: that a reader who
 * does not read the numbers can still see **where** the action works (all the
 * small vessels, narrower) and **how much** each heart sends out in a minute —
 * and that two circulations, one above the other, differ on screen only by
 * what the model solved.
 *
 * Every figure the drawing is checked against comes from the solver here, not
 * from the drawing. What these cannot see — a word standing on another, a part
 * drawn at a different size on a phone — `scripts/lib/lesson-drive.mjs`
 * measures in a browser.
 */

const solved = solveLessonConditions();
const m = (id) => solved[id].metrics;
const degrees = (radians) => (radians * 180) / Math.PI;

test('the route opens the lesson; the full model is one view away, unchanged', async () => {
  const module = await import('../src/scenes/cardiovascular/scenes/cardiacOutput/index.js');
  assert.equal(module.default.meta.layout, 'lesson');
  assert.equal(module.default.meta.id, 'cardiac-output');
  const { CardiacOutputScene } = await import('../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js');
  assert.equal(await module.views.detail(), CardiacOutputScene, 'the detailed model is the same class it always was');
  assert.equal(CardiacOutputScene.meta.layout, 'experiment');
});

test('how much: one tube scale for every circulation, so the filled lengths compare as the outputs do', () => {
  const lengths = Object.fromEntries(['A', 'B', 'C'].map((id) => [id, tubeLength(m(id).cardiacOutputLMin)]));
  for (const id of ['A', 'B', 'C']) {
    assert.ok(lengths[id] > 0 && lengths[id] < TUBE.right - TUBE.left, `${id} fits its tube`);
  }
  // Proportional from one zero: twice the output is twice the length.
  const ratio = lengths.C / lengths.B;
  const outputs = m('C').cardiacOutputLMin / m('B').cardiacOutputLMin;
  assert.ok(Math.abs(ratio - outputs) < 1e-9, `C/B drawn ${ratio.toFixed(3)}, solved ${outputs.toFixed(3)}`);
  // The difference a reader is asked to see is many units, not a few.
  assert.ok(lengths.C - lengths.B > 40, `C's tube is ${(lengths.C - lengths.B).toFixed(1)} units longer than B's`);
  // A → B is drawn in the direction the solver went.
  assert.equal(Math.sign(lengths.B - lengths.A), Math.sign(m('B').cardiacOutputLMin - m('A').cardiacOutputLMin));
});

test('about the same pressure reads as the same needle; the action’s rise as a clear turn', () => {
  const turn = (from, to) => degrees(needleAngle(m(from).meanArterialPressureMmHg) - needleAngle(m(to).meanArterialPressureMmHg));
  assert.ok(Math.abs(turn('B', 'C')) < 4, `B and C differ by ${turn('B', 'C').toFixed(1)}°`);
  assert.ok(turn('A', 'B') > 15, `A → B turns the needle ${turn('A', 'B').toFixed(1)}°`);
  // One dial for every circulation, from 0: higher pressure, further round.
  assert.equal(needleAngle(0), Math.PI);
  assert.equal(needleAngle(DIAL.maxMmHg), 0);
  assert.ok(needleAngle(90) < needleAngle(70));
});

test('where it acts: every small vessel narrows alike from A to B; C’s are as A’s', () => {
  const lumen = (id) => lumenWidth(m(id).systemicResistanceMmHgSPerMl);
  assert.ok(lumen('B') < lumen('A') * 0.7, `the vessels are drawn narrower (${lumen('A').toFixed(2)} → ${lumen('B').toFixed(2)})`);
  assert.equal(lumen('C'), lumen('A'), 'C’s vessels were never narrowed');
  // A lumen inside its wall, never closed: narrower, not shut.
  for (const id of ['A', 'B', 'C']) {
    assert.ok(lumen(id) > 2 && lumen(id) < BED.outer, `${id}: lumen ${lumen(id).toFixed(2)} inside a wall of ${BED.outer}`);
  }
  // The full model's drawing scale, so the two screens draw one resistance at one width.
  const resistance = m('B').systemicResistanceMmHgSPerMl;
  assert.equal(lumenWidth(resistance), bedCalibreFor(resistance, CONTROL_DOMAIN.systemicResistanceMmHgSPerMl) * BED.lumenPerCalibre);
  // Six channels, always: the action changes their width, never their number.
  assert.equal(BED.channels, 6);
});

test('the heart does not change from A to B: the action is on the vessels', () => {
  assert.equal(solved.B.input.contractilityEesMmHgPerMl, solved.A.input.contractilityEesMmHgPerMl);
  assert.equal(solved.B.input.heartRatePerMin, solved.A.input.heartRatePerMin);
  // The glyph is one shape at one size: a beat squeezes it, nothing else does.
  assert.equal(heartPath(1), heartPath(1));
  assert.notEqual(heartPath(0.93), heartPath(1));
  assert.equal(squeezeAt(0.6), 0, 'at rest between beats');
  assert.ok(squeezeAt(0.17) > 0.9, 'tightest mid-ejection');
});

test('one size, fixed places: the main circulation never moves, and C takes the legend’s place', () => {
  assert.equal(STRIP_TOPS.length, 2);
  assert.equal(STRIP_TOPS[0], 0, 'the main circulation stands in the upper place, always');
  assert.equal(STRIP_TOPS[1], LEGEND.top, 'C stands where the legend was');
  assert.ok(STRIP_TOPS[1] + STRIP.height <= FIGURE.height, 'both fit the one box the page scales');
  assert.ok(STRIP_TOPS[1] >= STRIP.height, 'the two never overlap');
  // Every part of a strip inside the strip.
  assert.ok(TUBE.top + TUBE.height <= STRIP.height);
  assert.ok(HEART.bottom <= STRIP.height && BED.right <= STRIP.width && TUBE.right <= STRIP.width);
  assert.ok(DIAL.x + DIAL.radius < BED.left, 'the dial stands clear of the vessels');
});

test('what is drawn is what was solved: the figure’s data is the solver’s, through the scales', () => {
  const session = new LessonSession();
  session.setPrimary('B', { immediate: true });
  session.setShowOther(true);
  const [b, c] = stripsFor(session);
  assert.deepEqual(b.drawing, circulationDrawing(solved.B, null));
  assert.deepEqual(c.drawing, circulationDrawing(solved.C, null));
  assert.equal(b.solved.cardiacOutputLMin, m('B').cardiacOutputLMin);
  assert.equal(c.solved.meanArterialPressureMmHg, m('C').meanArterialPressureMmHg);
  // Same heart rate on both, so "in the same minute" is a fair comparison.
  assert.equal(b.solved.heartRatePerMin, c.solved.heartRatePerMin);

  // B alone: A's marks are A's solved values through the same scales.
  session.setShowOther(false);
  const [alone] = stripsFor(session);
  assert.equal(alone.drawing.before.tube, tubeLength(m('A').cardiacOutputLMin));
  assert.equal(alone.drawing.before.needleAngle, needleAngle(m('A').meanArterialPressureMmHg));
});

test('fail closed: a solver that no longer supports the lesson’s claims, or does not solve, is not shown saying them', async () => {
  const { CardiacOutputLessonScene } = await import('../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputLessonScene.js');
  const isC = (input) => JSON.stringify(input) === JSON.stringify(lessonInput('C'));
  // Today's solver: the lesson builds.
  assert.doesNotThrow(() => new CardiacOutputLessonScene());
  // C 20 mmHg above B: "about the same pressure" no longer holds.
  const apart = (input) => {
    const result = solveCardiacOutput(input);
    if (!isC(input)) return result;
    return { ...result, metrics: { ...result.metrics, meanArterialPressureMmHg: result.metrics.meanArterialPressureMmHg + 20 } };
  };
  assert.throws(() => new CardiacOutputLessonScene({ solve: apart }), /claims do not hold.*about the same/);
  // C does not converge: no metrics to draw or to say anything about.
  const stuck = (input) => (isC(input) ? { status: RESULT_STATUS.NONCONVERGED, input, metrics: null } : solveCardiacOutput(input));
  assert.throws(() => new CardiacOutputLessonScene({ solve: stuck }), /claims do not hold.*condition C did not solve/);
});
