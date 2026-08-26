import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import {
  distanceScaleForAspect,
  distanceScaleForView,
  verticalOffsetForView,
  framePose,
} from '../src/app/framing.js';
import { beatPhaseAt, sampleHemodynamics } from '../src/scenes/heartFailure/hemodynamics.js';
import { STAGES } from '../src/data/heartFailure.js';
import { stageIndexFor } from '../src/components/StageReadout.js';
import { ZOOM_RANGE, steppedZoom, zoomedDistance } from '../src/app/zoom.js';

const POSE = { target: new Vector3(0, -1.8, 0.3), position: new Vector3(0, -1.8, 28.3) };
const WIDE = 1440 / 900;
const PHONE = 390 / 844;

test('learning view frames the subject closer than data view, at every aspect', () => {
  for (const aspect of [WIDE, 1280 / 800, 1024 / 768, PHONE]) {
    const learning = framePose(POSE, aspect, 'learning');
    const data = framePose(POSE, aspect, 'data');
    assert.ok(
      learning.position.distanceTo(learning.target) < data.position.distanceTo(data.target),
      `learning view is closer at aspect ${aspect.toFixed(2)}`
    );
  }
});

test('data view is exactly the scene\'s authored framing, scaled only for aspect', () => {
  assert.equal(distanceScaleForView('data'), 1);
  assert.equal(verticalOffsetForView('data', 0.3), 0);
  const framed = framePose(POSE, WIDE, 'data');
  assert.equal(framed.target.y, POSE.target.y, 'nothing is shifted vertically');
  assert.ok(
    Math.abs(framed.position.distanceTo(framed.target) - POSE.position.distanceTo(POSE.target) * distanceScaleForAspect(WIDE)) < 1e-6
  );
});

test('a narrow frame still backs the camera off, learning view included', () => {
  // The subject is wider than it is tall in projection, so a portrait frame
  // needs more distance, not less — the learning-view allowance must not
  // cancel that out.
  const phone = framePose(POSE, PHONE, 'learning').position.distanceTo(POSE.target);
  const wide = framePose(POSE, WIDE, 'learning').position.distanceTo(POSE.target);
  assert.ok(phone > wide, 'a phone frames from further back than a desktop');
});

test('the bottom inset lifts the subject clear of the console, and only in learning view', () => {
  const withConsole = framePose(POSE, WIDE, 'learning', 42, 0.25);
  const without = framePose(POSE, WIDE, 'learning', 42, 0);
  assert.ok(withConsole.target.y < without.target.y, 'the framing shifts down, putting the subject higher');
  assert.equal(framePose(POSE, WIDE, 'data', 42, 0.25).target.y, POSE.target.y);
});

test('framing is finite for every aspect a browser can produce', () => {
  for (const aspect of [0.3, 0.5, 0.75, 1, 1.6, 2.4, 3.5]) {
    for (const view of ['learning', 'data']) {
      const framed = framePose(POSE, aspect, view, 42, 0.25);
      for (const axis of ['x', 'y', 'z']) {
        assert.ok(Number.isFinite(framed.position[axis]), `position.${axis} at ${aspect} ${view}`);
        assert.ok(Number.isFinite(framed.target[axis]), `target.${axis} at ${aspect} ${view}`);
      }
      assert.ok(framed.position.distanceTo(framed.target) > 1, `usable distance at ${aspect} ${view}`);
    }
  }
});

test('the beat is partitioned into four named parts that tile the whole cycle', () => {
  for (const progress of [0, 0.18, 0.42, 0.64, 0.85, 1]) {
    const state = sampleHemodynamics(progress);
    const seen = [];
    for (let i = 0; i < 1000; i++) {
      const named = beatPhaseAt(i / 1000, state);
      assert.ok(named.from <= i / 1000 && i / 1000 < named.to, `phase ${i / 1000} is inside its own window at ${progress}`);
      if (seen[seen.length - 1] !== named.id) seen.push(named.id);
    }
    assert.deepEqual(seen, ['isovolumic', 'ejection', 'end-systole', 'filling'], `order at progress ${progress}`);
  }
});

test('the partition boundaries are the solved valve times, not fixed fractions', () => {
  const normal = sampleHemodynamics(0);
  const failing = sampleHemodynamics(0.85);
  assert.equal(beatPhaseAt(0, normal).to, normal.ejectionStartPhase);
  assert.equal(beatPhaseAt(0.2, normal).from, normal.ejectionStartPhase);
  assert.notEqual(normal.ejectionStartPhase, failing.ejectionStartPhase);
  assert.equal(beatPhaseAt(0, failing).to, failing.ejectionStartPhase);
});

test('the name is stable under a phase that has wrapped past 1', () => {
  const state = sampleHemodynamics(0.5);
  for (const phase of [0.05, 0.3, 0.45, 0.8]) {
    assert.equal(beatPhaseAt(phase, state).id, beatPhaseAt(phase + 3, state).id, `phase ${phase} wraps`);
    assert.equal(beatPhaseAt(phase, state).id, beatPhaseAt(phase - 2, state).id, `phase ${phase} wraps backwards`);
  }
});

test('every stage on the track is reachable and selects itself', () => {
  STAGES.forEach((stage, index) => {
    assert.equal(stageIndexFor(stage.at, STAGES), index, `clicking ${stage.id} selects ${stage.id}`);
    // And just inside the next stage, the next one takes over.
    const next = STAGES[index + 1];
    if (next) assert.equal(stageIndexFor(next.at - 1e-6, STAGES), index, `${stage.id} holds up to ${next.id}`);
  });
  assert.equal(stageIndexFor(0, STAGES), 0);
  assert.equal(stageIndexFor(1, STAGES), STAGES.length - 1);
});

test('a zoom step in and back out returns to where it started', () => {
  for (const start of [1, 0.8, 1.6]) {
    const there = steppedZoom(start, 1);
    assert.ok(Math.abs(steppedZoom(there, -1) - start) < 1e-9, `round trip from ${start}`);
  }
});

test('the zoom cannot be stepped past its range, however many presses', () => {
  let zoom = 1;
  for (let i = 0; i < 50; i++) zoom = steppedZoom(zoom, 1);
  assert.equal(zoom, ZOOM_RANGE[0], 'stops at the near limit');
  for (let i = 0; i < 50; i++) zoom = steppedZoom(zoom, -1);
  assert.equal(zoom, ZOOM_RANGE[1], 'stops at the far limit');
});

test('the range reaches past the framing in both directions', () => {
  assert.ok(ZOOM_RANGE[0] < 1, 'closer than the authored framing is reachable');
  assert.ok(ZOOM_RANGE[1] > 1, 'further back than the authored framing is reachable');
  // Far enough out that the whole subject, aortic arch included, comes into a
  // frame the authored distance deliberately crops.
  assert.ok(ZOOM_RANGE[1] >= 1.3, 'far enough to recover the cropped arch');
});

test('the zoomed distance stays inside the orbit controls own limits', () => {
  const limits = { minDistance: 5, maxDistance: 55 };
  for (const distance of [8, 24, 40]) {
    for (const zoom of [ZOOM_RANGE[0], 1, ZOOM_RANGE[1]]) {
      const result = zoomedDistance(distance, zoom, limits);
      assert.ok(result >= limits.minDistance, `${distance}x${zoom} not inside the minimum`);
      assert.ok(result <= limits.maxDistance, `${distance}x${zoom} not past the maximum`);
    }
  }
  assert.equal(zoomedDistance(24, 1, limits), 24, 'no zoom leaves the framing alone');
});
