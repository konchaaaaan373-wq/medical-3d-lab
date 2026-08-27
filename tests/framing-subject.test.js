import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { framePose, verticalOffsetForView } from '../src/app/framing.js';

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
