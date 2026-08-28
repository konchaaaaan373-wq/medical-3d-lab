import test from 'node:test';
import assert from 'node:assert/strict';
import { ANNOTATIONS, STAGES } from '../src/data/heartFailure.js';
import { stageIndexFor } from '../src/components/StageReadout.js';
import {
  STORY_STEPS,
  STORY_CUES,
  STORY_DURATION,
  BEAT_PROGRESS,
  stepAt,
  cardiacPhaseAt,
  beatNamedAt,
  beatDrivenAt,
  cameraAt,
  captionAt,
  emphasisAt,
  revealAt,
  outlineAt,
  contextAt,
} from '../src/scenes/cardiovascular/scenes/heartFailure/storyboard.js';
import { sampleHemodynamics } from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';

/** Every tenth of a second of the sequence, plus a little either side. */
const TIMES = [];
for (let t = -1; t <= STORY_DURATION + 2; t += 0.1) TIMES.push(+t.toFixed(2));

const finite = (value) => Number.isFinite(value);

test('the steps tile the whole duration without gaps or overlaps', () => {
  assert.equal(STORY_STEPS[0].at, 0);
  assert.equal(STORY_STEPS[STORY_STEPS.length - 1].until, STORY_DURATION);
  for (let i = 1; i < STORY_STEPS.length; i++) {
    assert.equal(STORY_STEPS[i].at, STORY_STEPS[i - 1].until, `step ${STORY_STEPS[i].id} starts where the previous ends`);
    assert.ok(STORY_STEPS[i].until > STORY_STEPS[i].at, `step ${STORY_STEPS[i].id} has positive length`);
  }
  assert.deepEqual(
    STORY_CUES.map((cue) => cue.id),
    STORY_STEPS.map((step) => step.id)
  );
});

test('the sequence is in two parts, and the second one holds the remodelling axis still', () => {
  const parts = STORY_STEPS.map((step) => step.part);
  assert.equal(parts.indexOf('beat'), parts.lastIndexOf('remodeling') + 1, 'Part A runs first, then Part B');
  for (const step of STORY_STEPS.filter((entry) => entry.part === 'beat')) {
    assert.equal(step.progress, BEAT_PROGRESS, `${step.id} sits at the one progression value Part B is read at`);
  }
});

test('Part A visits the four stages in order', () => {
  const remodeling = STORY_STEPS.filter((step) => step.part === 'remodeling');
  assert.equal(remodeling.length, STAGES.length);
  remodeling.forEach((step, i) => {
    assert.equal(stageIndexFor(step.progress, STAGES), i, `step ${step.id} lands in stage ${STAGES[i].id}`);
  });
});

test('the cardiac phase stays a usable 0..1 for every moment, inside the sequence and outside it', () => {
  for (const t of TIMES) {
    const phase = cardiacPhaseAt(t);
    assert.ok(finite(phase), `phase is a number at t=${t}`);
    assert.ok(phase >= 0 && phase < 1, `phase in [0,1) at t=${t}, got ${phase}`);
  }
});

test('only the steps that hold the beat at a named moment put a name on screen', () => {
  for (const t of TIMES) {
    const { step } = stepAt(t);
    if (!beatNamedAt(t)) continue;
    assert.equal(step.part, 'beat', `t=${t} names the beat only inside Part B`);
    assert.ok(beatDrivenAt(t), `t=${t} names the beat only while the sequence is driving it`);
  }
  // The steps after the beat are about what follows it, so they stop naming it.
  assert.equal(beatNamedAt(35), false);
  assert.equal(beatNamedAt(41), false);
});

test('the causal chain is revealed in order: residual, then pressure, then fluid', () => {
  const at = (id) => STORY_STEPS.find((step) => step.id === id);
  assert.ok(at('residual').at < at('filling-pressure').at);
  assert.ok(at('filling-pressure').at < at('transmission').at);
  assert.ok(at('transmission').at < at('congestion').at);

  // Pressure spreads before any fluid appears — the point of separating the two.
  const pressureStep = revealAt(at('filling-pressure').until - 0.05);
  assert.ok(pressureStep.front > 0, 'the pressure front has started');
  assert.equal(pressureStep.fluid, 0, 'no interstitial fluid yet');

  const transmitted = revealAt(at('transmission').until - 0.05);
  assert.ok(transmitted.front > pressureStep.front, 'the front spreads further');
  assert.equal(transmitted.fluid, 0, 'still no fluid');

  assert.ok(revealAt(STORY_DURATION - 0.05).fluid > 0.5, 'fluid has appeared by the end');
});

test('the reveal never asks for more than the solved state produces', () => {
  for (const t of TIMES) {
    const { front, fluid } = revealAt(t);
    assert.ok(front >= 0 && front <= 1, `front is a fraction at t=${t}, got ${front}`);
    assert.ok(fluid >= 0 && fluid <= 1, `fluid is a fraction at t=${t}, got ${fluid}`);
  }
});

test('the state Part B is read at actually has the congestion the chain ends in', () => {
  const state = sampleHemodynamics(BEAT_PROGRESS);
  assert.ok(state.congestionLevel > 0.5, 'the pressure front has something to draw');
  assert.ok(state.interstitialFluidLevel > 0.2, 'there is interstitial fluid to reveal');
});

test('every presentation track stays in range for every moment', () => {
  for (const t of TIMES) {
    for (const [name, value] of [
      ['ejection', emphasisAt(t).ejection],
      ['residual', emphasisAt(t).residual],
      ['outline', outlineAt(t)],
      ['context', contextAt(t)],
      ['caption', captionAt(t).opacity],
    ]) {
      assert.ok(finite(value), `${name} is a number at t=${t}`);
      assert.ok(value >= 0 && value <= 1, `${name} in [0,1] at t=${t}, got ${value}`);
    }
  }
});

test('the camera is finite everywhere and its direction stays a unit vector', () => {
  for (const t of TIMES) {
    const shot = cameraAt(t);
    assert.ok(finite(shot.distance) && shot.distance > 0, `distance at t=${t}`);
    for (const axis of ['x', 'y', 'z']) assert.ok(finite(shot.target[axis]), `target.${axis} at t=${t}`);
    assert.ok(Math.abs(shot.view.length() - 1) < 1e-6, `view direction normalised at t=${t}`);
  }
});

test('the final caption holds while the sequence holds on its last frame', () => {
  const last = STORY_STEPS[STORY_STEPS.length - 1];
  assert.equal(captionAt(STORY_DURATION).text, last.caption);
  assert.equal(captionAt(STORY_DURATION).opacity, 1);
  assert.equal(captionAt(STORY_DURATION + 5).opacity, 1);
});

test('every label a step asks for exists, and its window is open where the step sits', () => {
  const byId = new Map(ANNOTATIONS.map((annotation) => [annotation.id, annotation]));
  for (const step of STORY_STEPS) {
    for (const id of step.focus) {
      const annotation = byId.get(id);
      assert.ok(annotation, `step ${step.id} points at a real annotation (${id})`);
      const [from, to] = annotation.range;
      assert.ok(
        step.progress >= from && step.progress <= to,
        `${id} is inside its own window at ${step.progress} (window ${from}..${to}), or the step would point at nothing`
      );
    }
  }
});
