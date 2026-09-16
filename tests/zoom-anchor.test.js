/**
 * What a zoom holds still.
 *
 * A device pass found the brain sliding to a corner and under the header as it
 * was zoomed. The cause was not a bug in the zoom: it was that the zoom's one
 * fixed point — the orbit centre — is deliberately *not* where the subject is.
 * `fitPoseToSafeArea` pans the camera and the target together so the subject
 * sits in the band the panels leave, which puts the target back in the middle
 * of the canvas and the subject off to one side of it. Dollying toward the
 * target then magnifies that offset in exact proportion to the zoom.
 *
 * These pin the arithmetic of the fix: a zoom anchored on a point on screen
 * leaves that point where it is, changes nothing about where the camera is
 * looking, and is exactly undone by the opposite zoom.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { bandCentreNdc, dollyAboutNdc, fitPoseToSafeArea, shiftIntoBand } from '../src/app/framing.js';

const FOV = 42;
const ASPECT = 1280 / 800;

/** A subject roughly the size and place of the brain atlas. */
const BOUNDS = {
  centre: new Vector3(0, 0, 0),
  corners: [
    new Vector3(-1.1, -0.9, -1.4), new Vector3(1.1, -0.9, -1.4),
    new Vector3(-1.1, 0.9, -1.4), new Vector3(1.1, 0.9, -1.4),
    new Vector3(-1.1, -0.9, 1.4), new Vector3(1.1, -0.9, 1.4),
    new Vector3(-1.1, 0.9, 1.4), new Vector3(1.1, 0.9, 1.4),
  ],
};
const POSE = { target: new Vector3(0, 0, 0), position: new Vector3(0, 0, 6) };
/** A header across the top and a panel down the right — a desktop scene. */
const INSETS = { top: 0.14, right: 0.28, bottom: 0.13, left: 0 };

/** Where a world point lands, in pixels, for a camera at this pose. */
function screenOf(pose, world, { width = 1280, height = 800 } = {}) {
  const camera = new PerspectiveCamera(FOV, width / height, 0.1, 1000);
  camera.position.copy(pose.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld(true);
  const ndc = world.clone().project(camera);
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
}

const distanceOf = (pose) => pose.position.distanceTo(pose.target);

test('band centre: with nothing covering the frame it is the middle of the frame', () => {
  assert.deepEqual(bandCentreNdc({}), { x: 0, y: 0 });
  assert.deepEqual(bandCentreNdc({ left: 0, right: 0, top: 0, bottom: 0 }), { x: 0, y: 0 });
});

test('band centre: a panel on the right moves it left, a header moves it down', () => {
  const centre = bandCentreNdc(INSETS);
  assert.ok(centre.x < 0, 'a right-hand panel puts the usable middle left of the frame middle');
  assert.ok(centre.y < 0, 'a header taller than the console puts it below the frame middle');
});

test('the defect: dollying toward the orbit centre magnifies the subject\'s offset', () => {
  // The framed shot, exactly as the app produces it.
  const framed = fitPoseToSafeArea(POSE, {
    bounds: BOUNDS, aspect: ASPECT, fovDegrees: FOV, insets: INSETS, coverage: 0.78,
  });
  const before = screenOf(framed, BOUNDS.centre);
  const centreOfFrame = { x: 640, y: 400 };
  const offsetBefore = Math.hypot(before.x - centreOfFrame.x, before.y - centreOfFrame.y);
  assert.ok(offsetBefore > 40, 'the framing is supposed to put the subject off the frame centre');

  // What OrbitControls does without an anchor: scale the distance, keep the
  // target. This is the shipped behaviour, reproduced so the test fails if
  // somebody "fixes" it by re-centring instead.
  const halved = {
    target: framed.target.clone(),
    position: framed.target.clone().add(framed.position.clone().sub(framed.target).multiplyScalar(0.5)),
  };
  const after = screenOf(halved, BOUNDS.centre);
  const offsetAfter = Math.hypot(after.x - centreOfFrame.x, after.y - centreOfFrame.y);
  assert.ok(
    offsetAfter > offsetBefore * 1.9,
    `halving the distance should roughly double the offset — ${offsetBefore.toFixed(0)}px to ${offsetAfter.toFixed(0)}px`,
  );
});

test('1. zooming about the subject leaves it where it is on screen', () => {
  const framed = fitPoseToSafeArea(POSE, {
    bounds: BOUNDS, aspect: ASPECT, fovDegrees: FOV, insets: INSETS, coverage: 0.78,
  });
  const before = screenOf(framed, BOUNDS.centre);
  // The band centre is where the framing just put the subject, so this is the
  // anchor a button zoom uses.
  const zoomed = dollyAboutNdc(framed, {
    ndc: bandCentreNdc(INSETS), factor: 0.5, aspect: ASPECT, fovDegrees: FOV,
  });
  const after = screenOf(zoomed, BOUNDS.centre);
  assert.ok(
    Math.hypot(after.x - before.x, after.y - before.y) < 6,
    `the subject moved ${Math.hypot(after.x - before.x, after.y - before.y).toFixed(1)}px; it should not have`,
  );
  assert.ok(Math.abs(distanceOf(zoomed) / distanceOf(framed) - 0.5) < 1e-6, 'and the zoom still happened');
});

test('2. a point under the anchor stays under the anchor', () => {
  // Not the subject's centre: a structure off to one side, the case "zoom into
  // this gyrus" actually is.
  const structure = new Vector3(0.8, 0.5, 0.9);
  const anchor = { x: 0.35, y: -0.2 };
  const pose = {
    target: POSE.target.clone(),
    position: POSE.position.clone(),
  };
  // Put the structure under the anchor first, the way a pointer would be.
  const camera = new PerspectiveCamera(FOV, ASPECT, 0.1, 1000);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld(true);
  const at = structure.clone().project(camera);
  const before = screenOf(pose, structure);
  const zoomed = dollyAboutNdc(pose, {
    ndc: { x: at.x, y: at.y }, factor: 0.4, aspect: ASPECT, fovDegrees: FOV,
  });
  const after = screenOf(zoomed, structure);
  assert.ok(
    Math.hypot(after.x - before.x, after.y - before.y) < 2,
    `the structure under the pointer moved ${Math.hypot(after.x - before.x, after.y - before.y).toFixed(2)}px`,
  );
});

test('3. zooming in and back out returns the same shot', () => {
  const framed = fitPoseToSafeArea(POSE, {
    bounds: BOUNDS, aspect: ASPECT, fovDegrees: FOV, insets: INSETS, coverage: 0.78,
  });
  const ndc = bandCentreNdc(INSETS);
  let pose = framed;
  for (let step = 0; step < 5; step += 1) {
    pose = dollyAboutNdc(pose, { ndc, factor: 0.87, aspect: ASPECT, fovDegrees: FOV });
  }
  for (let step = 0; step < 5; step += 1) {
    pose = dollyAboutNdc(pose, { ndc, factor: 1 / 0.87, aspect: ASPECT, fovDegrees: FOV });
  }
  assert.ok(pose.position.distanceTo(framed.position) < 1e-6, 'the camera came back');
  assert.ok(pose.target.distanceTo(framed.target) < 1e-6, 'and so did the orbit centre');
});

test('4. a zoom does not move the orbit centre toward the subject', () => {
  // The fix must not be "put the target on the model": that is the forced
  // re-centring this is explicitly not, and it would drag a reader who has
  // zoomed into one gyrus back to the middle of the brain.
  const framed = fitPoseToSafeArea(POSE, {
    bounds: BOUNDS, aspect: ASPECT, fovDegrees: FOV, insets: INSETS, coverage: 0.78,
  });
  const offsetBefore = framed.target.distanceTo(BOUNDS.centre);
  const zoomed = dollyAboutNdc(framed, {
    ndc: bandCentreNdc(INSETS), factor: 0.5, aspect: ASPECT, fovDegrees: FOV,
  });
  const offsetAfter = zoomed.target.distanceTo(BOUNDS.centre);
  // It shrinks with the shot, in proportion — it is not snapped to the model.
  assert.ok(offsetAfter > 0, 'the orbit centre was moved onto the subject');
  assert.ok(Math.abs(offsetAfter / offsetBefore - 0.5) < 1e-6, 'it should scale with the zoom, nothing more');
});

test('the view direction is untouched, so a zoom cannot rotate the model', () => {
  const framed = fitPoseToSafeArea(POSE, {
    bounds: BOUNDS, aspect: ASPECT, fovDegrees: FOV, insets: INSETS, coverage: 0.78,
  });
  const before = framed.target.clone().sub(framed.position).normalize();
  const zoomed = dollyAboutNdc(framed, {
    ndc: { x: -0.6, y: 0.4 }, factor: 0.3, aspect: ASPECT, fovDegrees: FOV,
  });
  const after = zoomed.target.clone().sub(zoomed.position).normalize();
  assert.ok(before.distanceTo(after) < 1e-9, 'the camera is looking somewhere else after a zoom');
});

test('a degenerate pose is left alone rather than turned into NaN', () => {
  const nowhere = { position: new Vector3(1, 2, 3), target: new Vector3(1, 2, 3) };
  const out = dollyAboutNdc(nowhere, { ndc: { x: 0, y: 0 }, factor: 0.5, aspect: ASPECT, fovDegrees: FOV });
  assert.ok(out.position.equals(nowhere.position) && out.target.equals(nowhere.target));
  for (const bad of [{ factor: 0 }, { aspect: 0 }, { fovDegrees: 0 }]) {
    const result = dollyAboutNdc(POSE, {
      ndc: { x: 0, y: 0 }, factor: 0.5, aspect: ASPECT, fovDegrees: FOV, ...bad,
    });
    assert.ok(result.position.equals(POSE.position), `${Object.keys(bad)[0]} should be refused, not divided by`);
  }
});

/**
 * The rescue, and how hard it is not to trip.
 *
 * Zooming about the pointer lets a reader take the subject off the edge, which
 * is the point of it. These pin the line between "they meant that" and "they
 * have lost it": nothing happens until the subject is almost entirely gone, and
 * then the move is the smallest one that helps.
 */

const BAND = { x0: -1, x1: 0.44, y0: -0.74, y1: 0.72 };

test('rescue: a subject inside the band is left alone', () => {
  assert.equal(shiftIntoBand({ x0: -0.4, x1: 0.2, y0: -0.3, y1: 0.35 }, BAND), null);
});

test('rescue: a subject mostly outside but still readable is left alone', () => {
  // Half of it past the right edge of the band. That is a reader looking at the
  // left half of something, not a reader who has lost it.
  const half = shiftIntoBand({ x0: 0.14, x1: 0.74, y0: -0.3, y1: 0.35 }, BAND);
  assert.equal(half, null, 'a subject half in view was moved; it should not have been');
});

test('rescue: a subject almost entirely gone is brought back, minimally', () => {
  const subject = { x0: 0.92, x1: 1.52, y0: -0.3, y1: 0.35 };
  const shift = shiftIntoBand(subject, BAND);
  assert.ok(shift, 'a subject off the right edge was left off it');
  assert.ok(shift.x < 0, 'it should come back leftward');
  assert.equal(shift.y, 0, 'nothing was wrong on the vertical axis, so nothing should move on it');
  // Minimal, measured against the thing it must not be. Putting the subject's
  // centre on the band's centre — the forced re-centring this is explicitly
  // not — would move it by 1.50; this moves it by about half that, which is
  // what "back into view" costs and no more.
  const toRecentre = Math.abs((BAND.x0 + BAND.x1) / 2 - (subject.x0 + subject.x1) / 2);
  assert.ok(
    Math.abs(shift.x) < toRecentre * 0.6,
    `moved ${shift.x.toFixed(2)} where a re-centring is ${toRecentre.toFixed(2)} — too close to one`,
  );
  const moved = { ...subject, x0: subject.x0 + shift.x, x1: subject.x1 + shift.x };
  assert.ok(moved.x0 < BAND.x1 && moved.x1 > BAND.x0, 'and it is actually inside afterwards');
});

test('rescue: a subject off the top comes down, and only down', () => {
  const shift = shiftIntoBand({ x0: -0.3, x1: 0.2, y0: 0.66, y1: 1.3 }, BAND);
  assert.ok(shift && shift.y < 0, 'a subject above the band was not brought down');
  assert.equal(shift.x, 0);
});

test('rescue: a degenerate box or band is refused rather than divided by', () => {
  assert.equal(shiftIntoBand({ x0: 0, x1: 0, y0: 0, y1: 1 }, BAND), null);
  assert.equal(shiftIntoBand({ x0: -0.3, x1: 0.2, y0: -0.3, y1: 0.35 }, { x0: 1, x1: 1, y0: 0, y1: 1 }), null);
});
