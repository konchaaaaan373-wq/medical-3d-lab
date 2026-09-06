import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { TubeSurface, smoothCurve, smoothProfile } from '../src/scenes/shared/geometry/tube.js';

/**
 * `TubeSurface` is the swept surface every hollow organ in this repo is drawn
 * with — bronchi, ureter, bowel, the coronary arteries. Two things move on it
 * independently: the *path* (`resample`, once the curve's control points have
 * been edited) and the *calibre* (`refresh(modifier)`, a constriction or a
 * dilation). They were separate calls with no relation between them, so a tube
 * that was constricted and then resampled came back at its base calibre with
 * nothing to say it had.
 */

const CURVE = smoothCurve([
  [0, 0, 0],
  [0, 1, 0.2],
  [0, 2, 0],
  [0, 3, -0.2],
]);

/** The widest cross-section radius the surface actually draws at step `i`. */
function drawnRadius(surface, i) {
  const position = surface.geometry.attributes.position;
  const centre = surface.points[i];
  let widest = 0;
  for (let j = 0; j <= surface.radial; j++) {
    const k = i * (surface.radial + 1) + j;
    widest = Math.max(
      widest,
      new THREE.Vector3(position.getX(k), position.getY(k), position.getZ(k)).distanceTo(centre)
    );
  }
  return widest;
}

test('a tube resampled onto a moved path keeps the calibre it was given', () => {
  const radius = smoothProfile([
    [0, 0.3],
    [1, 0.3],
  ]);
  const surface = new TubeSurface(CURVE.clone(), { radius, steps: 24, radial: 8 });
  const base = drawnRadius(surface, 12);
  assert.ok(Math.abs(base - 0.3) < 1e-6, `it starts at its base calibre: ${base.toFixed(4)}`);

  // A constriction — the thing a moving hollow organ is for.
  surface.refresh((u, r) => r * 0.4);
  const constricted = drawnRadius(surface, 12);
  assert.ok(
    Math.abs(constricted - 0.12) < 1e-6,
    `the constriction reaches the drawn surface: ${constricted.toFixed(4)}`
  );

  // Now the path moves under it, as it does when a vessel is relaid on a
  // beating wall. The constriction is the tube's current *shape*, not a
  // one-off instruction, so it has to survive.
  for (const point of surface.curve.points) point.x += 0.5;
  surface.curve.updateArcLengths();
  surface.resample();
  const after = drawnRadius(surface, 12);
  assert.ok(
    Math.abs(after - constricted) < 1e-6,
    `resampling keeps the constriction: ${after.toFixed(4)}, expected ${constricted.toFixed(4)} (base is ${base.toFixed(4)})`
  );

  // And the path really did move, so the check above is not passing on a
  // surface that simply did nothing.
  assert.ok(
    Math.abs(surface.points[12].x - 0.5) < 1e-6,
    `the path moved: centre now at x=${surface.points[12].x.toFixed(3)}`
  );

  // Dropping the modifier is still how a caller says "back to base calibre".
  surface.refresh();
  surface.resample();
  assert.ok(
    Math.abs(drawnRadius(surface, 12) - 0.3) < 1e-6,
    'a bare refresh clears the modifier for good'
  );
});
