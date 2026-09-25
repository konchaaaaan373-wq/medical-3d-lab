import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { fitPoseToSafeArea, framePose, orbitLimitsForSubject, verticalOffsetForView } from '../src/app/framing.js';

/**
 * The scene's authored framing, and the extremes of what it has to hold.
 *
 * These are the world-space limits of the *subject* — the ventricle at its most
 * dilated, the atrium, the pulmonary veins and the congestion overlay's bed.
 * The ascending aorta rises above all of it and is allowed to crop: it is
 * context, and framing for it costs the subject a fifth of the frame.
 */
const POSE = { target: new Vector3(-0.3, -1.8, 0.3), position: new Vector3(-0.3, -1.8, 28.3) };
/**
 * Measured from the built scene, over the progression and the whole beat.
 * Re-measure when the anatomy changes: this grew from 5.6 at the top when the
 * ventricle geometry was rebuilt, which is what made the old vertical offset
 * clip the frame.
 */
const SUBJECT = { top: 6.4, bottom: -6.4 };
const FOV = 42;

/** Where a world y lands in the frame, 0 at the top and 1 at the bottom. */
function screenFraction(framed, worldY) {
  const distance = framed.position.distanceTo(framed.target);
  const halfHeight = distance * Math.tan((FOV * Math.PI) / 180 / 2);
  return 0.5 - (worldY - framed.target.y) / (2 * halfHeight);
}

test('learning view holds the whole subject above the console', () => {
  // Insets are the *tallest* the console gets at each size — measured with the
  // longest stage description, because the camera does not re-frame when the
  // stage changes.
  for (const [aspect, inset] of [[1440 / 900, 0.26], [1280 / 800, 0.30], [1024 / 768, 0.31], [390 / 844, 0.26]]) {
    const framed = framePose(POSE, aspect, 'learning', FOV, inset);
    const top = screenFraction(framed, SUBJECT.top);
    const bottom = screenFraction(framed, SUBJECT.bottom);
    assert.ok(top > 0.01, `subject's top edge is inside the frame at aspect ${aspect.toFixed(2)} (got ${top.toFixed(3)})`);
    assert.ok(
      bottom < 1 - inset,
      `subject's apex clears the console at aspect ${aspect.toFixed(2)} (got ${bottom.toFixed(3)}, console starts at ${(1 - inset).toFixed(3)})`
    );
  }
});

test('the offset gives back part of the console inset, never more than it', () => {
  for (const inset of [0, 0.1, 0.26, 0.4]) {
    const offset = verticalOffsetForView('learning', inset);
    assert.ok(offset >= 0 && offset <= inset, `offset ${offset} is between zero and the inset ${inset}`);
  }
});

test('learning view still uses more of the frame than data view does', () => {
  const aspect = 1440 / 900;
  const learning = framePose(POSE, aspect, 'learning', FOV, 0.26);
  const data = framePose(POSE, aspect, 'data', FOV, 0.26);
  const height = (framed) => screenFraction(framed, SUBJECT.bottom) - screenFraction(framed, SUBJECT.top);
  assert.ok(height(learning) > height(data) * 1.1, 'the subject is at least a tenth taller in learning view');
});

// --- fitting a subject into the band the panels leave --------------------

/**
 * The anatomy viewer's framing question is not "does the subject fit the
 * canvas" but "does it fit the part of the canvas nothing is covering". These
 * check the answer where it can be seen: by building the camera the fit
 * produces, projecting the subject's own corners through it, and asking where
 * on the screen they land.
 */
const BRAIN_SUBJECT = (() => {
  // Roughly a brain: wider front-to-back than it is tall, and not a sphere.
  const min = new Vector3(-1.1, -1.5, -2.2);
  const max = new Vector3(1.1, 1.4, 2.2);
  const corners = [];
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) corners.push(new Vector3(x, y, z));
    }
  }
  return { centre: min.clone().add(max).multiplyScalar(0.5), corners };
})();
const BRAIN_LATERAL = { position: new Vector3(-5.25, 0.23, 0.25), target: new Vector3(0, -0.35, 0) };
const BRAIN_ASPECT = 1280 / 720;
const BRAIN_FOV = 42;

/** Where a world point lands on screen, in normalised device coordinates. */
function projectPoint(pose, point) {
  const camera = new PerspectiveCamera(BRAIN_FOV, BRAIN_ASPECT, 0.1, 200);
  camera.position.copy(pose.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const projected = point.clone().project(camera);
  return { x: projected.x, y: projected.y };
}

test('framing: the subject lands inside the band the panels leave, and centred in it', () => {
  const insets = { right: 0.27, top: 0.09, bottom: 0.29 };
  const fitted = fitPoseToSafeArea(BRAIN_LATERAL, { bounds: BRAIN_SUBJECT, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets });

  // The band, in normalised device coordinates: x runs left(-1) to right(+1),
  // y runs bottom(-1) to top(+1).
  const band = {
    left: -1 + 2 * insets.left ?? -1,
    right: 1 - 2 * insets.right,
    bottom: -1 + 2 * insets.bottom,
    top: 1 - 2 * insets.top,
  };
  band.left = -1;

  for (const corner of BRAIN_SUBJECT.corners) {
    const { x, y } = projectPoint(fitted, corner);
    assert.ok(x > band.left && x < band.right, `a corner is inside the band horizontally (${x.toFixed(2)})`);
    assert.ok(y > band.bottom && y < band.top, `a corner is inside the band vertically (${y.toFixed(2)})`);
  }

  const centre = projectPoint(fitted, BRAIN_SUBJECT.centre);
  assert.ok(Math.abs(centre.x - (band.left + band.right) / 2) < 0.02, 'and the subject sits at the band centre');
  assert.ok(Math.abs(centre.y - (band.bottom + band.top) / 2) < 0.02);
});

/**
 * A cube, which is the shape that catches an orthographic fit on a perspective
 * camera: its near face is as far in front of the centre as it is wide.
 *
 * The skin block is one — 3.2 across and 2.1 deep, framed from under four units
 * away — and "the cut face" put the whole subcutaneous layer off the bottom of
 * a frame the fit had just reported as fitting. Nothing in the app could see
 * it: `tests/organ-anatomy-scenes.test.js` measures the *width* a scene needs,
 * and this one overflowed downwards.
 */
const DEEP_SUBJECT = (() => {
  const corners = [];
  for (const x of [-1.6, 1.6]) {
    for (const y of [-1.05, 1.05]) {
      for (const z of [-1.6, 1.6]) corners.push(new Vector3(x, y, z));
    }
  }
  return { centre: new Vector3(0, 0, 0), corners };
})();

test('framing: a subject as deep as it is wide still lands inside the band', () => {
  // Including the inset sets that pan it: the pan moves a near corner further
  // across the frame than it moves the centre, which is the second half of the
  // same approximation and shows up on exactly these subjects.
  for (const insets of [{ right: 0.275, top: 0.1 }, { right: 0.27, top: 0.09, bottom: 0.29 }, { left: 0.2, bottom: 0.3 }, {}]) {
    const fitted = fitPoseToSafeArea(
      { position: new Vector3(0.2, 0.4, 5.6), target: new Vector3(0.1, -0.05, 0) },
      { bounds: DEEP_SUBJECT, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets }
    );
    const band = {
      left: -1 + 2 * (insets.left ?? 0),
      right: 1 - 2 * (insets.right ?? 0),
      bottom: -1 + 2 * (insets.bottom ?? 0),
      top: 1 - 2 * (insets.top ?? 0),
    };
    for (const corner of DEEP_SUBJECT.corners) {
      const { x, y } = projectPoint(fitted, corner);
      assert.ok(x >= band.left && x <= band.right, `a near corner is inside the band horizontally (${x.toFixed(2)})`);
      assert.ok(y >= band.bottom && y <= band.top, `a near corner is inside the band vertically (${y.toFixed(2)})`);
    }
  }
});

test('framing: fitting a deep subject does not throw the frame away', () => {
  // The other half of the fix: pulling back far enough is easy, and pulling
  // back too far is the "dashboard with a small model" this exists to stop.
  const fitted = fitPoseToSafeArea(
    { position: new Vector3(0.2, 0.4, 5.6), target: new Vector3(0.1, -0.05, 0) },
    { bounds: DEEP_SUBJECT, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets: {} }
  );
  let widest = 0;
  for (const corner of DEEP_SUBJECT.corners) {
    const { x, y } = projectPoint(fitted, corner);
    widest = Math.max(widest, Math.abs(x), Math.abs(y));
  }
  assert.ok(widest > 0.6, `the subject still fills the frame it is given (${widest.toFixed(2)})`);
});

test('framing: fitting is a pan and a distance, never a rotation', () => {
  const fitted = fitPoseToSafeArea(BRAIN_LATERAL, {
    bounds: BRAIN_SUBJECT, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets: { right: 0.27, bottom: 0.29 },
  });
  const before = BRAIN_LATERAL.target.clone().sub(BRAIN_LATERAL.position).normalize();
  const after = fitted.target.clone().sub(fitted.position).normalize();
  assert.ok(before.distanceTo(after) < 1e-6, 'the direction the camera looks is untouched');
});

test('framing: with nothing covering the frame the subject is simply centred', () => {
  const fitted = fitPoseToSafeArea(BRAIN_LATERAL, { bounds: BRAIN_SUBJECT, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets: {} });
  const centre = projectPoint(fitted, BRAIN_SUBJECT.centre);
  assert.ok(Math.abs(centre.x) < 0.02 && Math.abs(centre.y) < 0.02);
  // Filling the frame is the point: a subject at a fifth of the height is the
  // "dashboard with a small model" this is meant to stop.
  const top = projectPoint(fitted, new Vector3(BRAIN_SUBJECT.centre.x, 1.4, BRAIN_SUBJECT.centre.z));
  assert.ok(top.y > 0.55, `the subject fills the frame it is given (${top.y.toFixed(2)})`);
});

test('framing: a band with no room in it leaves the camera where it was', () => {
  const fitted = fitPoseToSafeArea(BRAIN_LATERAL, {
    bounds: BRAIN_SUBJECT, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets: { top: 0.45, bottom: 0.45 },
  });
  assert.ok(fitted.position.equals(BRAIN_LATERAL.position), 'moving it would be inventing a composition');
  assert.ok(fitted.target.equals(BRAIN_LATERAL.target));
});

test('framing: a scene that cannot say what it is drawing is not re-framed', () => {
  const fitted = fitPoseToSafeArea(BRAIN_LATERAL, {
    bounds: null, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets: { right: 0.27 },
  });
  assert.ok(fitted.position.equals(BRAIN_LATERAL.position));
});

// --- the limits the camera runs between ----------------------------------

/** What `src/controls/createControls.js` hands every scene. */
const SHARED_LIMITS = { minDistance: 5, maxDistance: 55 };

test('limits: a scene that cannot say what it is drawing keeps the shared limits', () => {
  assert.deepEqual(orbitLimitsForSubject(null, SHARED_LIMITS), SHARED_LIMITS);
  assert.deepEqual(orbitLimitsForSubject({ centre: new Vector3(), corners: [] }, SHARED_LIMITS), SHARED_LIMITS);
  // A subject with no size is not a subject.
  const flat = { centre: new Vector3(), corners: [new Vector3()] };
  assert.deepEqual(orbitLimitsForSubject(flat, SHARED_LIMITS), SHARED_LIMITS);
});

test('limits: the limits only ever widen, never tighten', () => {
  // A subject larger than the shared limits were written for keeps them: this
  // is here to stop a scene from being fenced in by its own size.
  const huge = (() => {
    const corners = [];
    for (const x of [-40, 40]) for (const y of [-40, 40]) for (const z of [-40, 40]) corners.push(new Vector3(x, y, z));
    return { centre: new Vector3(), corners };
  })();
  const limits = orbitLimitsForSubject(huge, SHARED_LIMITS);
  assert.equal(limits.minDistance, SHARED_LIMITS.minDistance, 'the floor is not raised');
  assert.ok(limits.maxDistance > SHARED_LIMITS.maxDistance, 'the ceiling follows the subject up');
});

test('limits: the floor clears the framing the same subject asks for', () => {
  // The two have to agree, or the framing is worked out and then overruled —
  // which is exactly what a fixed floor did to the heart.
  const insets = { right: 0.27, top: 0.09, bottom: 0.29 };
  const fitted = fitPoseToSafeArea(BRAIN_LATERAL, {
    bounds: BRAIN_SUBJECT, aspect: BRAIN_ASPECT, fovDegrees: BRAIN_FOV, insets,
  });
  const wanted = fitted.position.distanceTo(fitted.target);
  const limits = orbitLimitsForSubject(BRAIN_SUBJECT, SHARED_LIMITS);
  assert.ok(limits.minDistance < wanted, `${limits.minDistance.toFixed(2)} < ${wanted.toFixed(2)}`);
  // And it clears the closest the app itself ever goes: the zoom-in end of the
  // range the buttons offer, applied to that framing.
  assert.ok(limits.minDistance < wanted * 0.5, 'the zoom buttons can reach their own end of the range');
});

test('a band under the fit floor is widened to it, not answered with the unfitted close-up', async () => {
  const { insetsAboveFloor, fitPoseToSafeArea } = await import('../src/app/framing.js');
  // Measured on an iPhone in Safari: the read-out covered the top 40% and the
  // console the bottom 48%, leaving 12% — under the fit's floor, so the fit
  // returned the authored pose and the heart was drawn at twice its size
  // behind both panels.
  const measured = { top: 0.405, bottom: 0.473, left: 0, right: 0 };
  const widened = insetsAboveFloor(measured);
  const band = 1 - widened.top - widened.bottom;
  assert.ok(band >= 0.2, `the band reaches the floor (${band.toFixed(3)})`);
  assert.ok(Math.abs(widened.top / widened.bottom - measured.top / measured.bottom) < 1e-9,
    'taken back from each side in proportion, so the band stays where the free space is');
  assert.deepEqual(insetsAboveFloor({ top: 0.1, bottom: 0.3, left: 0.2, right: 0 }),
    { top: 0.1, bottom: 0.3, left: 0.2, right: 0 }, 'a band above the floor is untouched');

  // And the fit then actually fits, where before it handed the pose back.
  const THREE = await import('three');
  const pose = { position: new THREE.Vector3(0, 0, 30), target: new THREE.Vector3(0, 0, 0) };
  const corners = [];
  for (const x of [-7, 7]) for (const y of [-5, 5]) for (const z of [-3, 3]) corners.push(new THREE.Vector3(x, y, z));
  const bounds = { centre: new THREE.Vector3(), corners };
  const options = { bounds, aspect: 390 / 664, fovDegrees: 42, coverage: 1.1 };
  const before = fitPoseToSafeArea(pose, { ...options, insets: measured });
  assert.equal(before.position.z, 30, 'under the floor the fit leaves the close-up alone');
  const after = fitPoseToSafeArea(pose, { ...options, insets: widened });
  assert.ok(after.position.distanceTo(after.target) > 30, 'widened, it backs the camera off to fit');
});
