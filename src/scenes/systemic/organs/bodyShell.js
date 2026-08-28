import * as THREE from 'three';
import { latheFromProfile, shapedSphere } from '../../shared/geometry/shapes.js';
import { ghostMaterial } from '../../shared/materials.js';

/**
 * The outline of a body, to put organs inside.
 *
 * PROTOTYPE — a silhouette, nothing more: head, neck and trunk as a surface of
 * revolution, drawn almost transparent so that it reads as "where we are" and
 * never competes with the organs. Limbs are left off deliberately — they would
 * take up half the frame and carry nothing.
 */
export function buildBodyShell({ color = '#5f7bb5', opacity = 0.075 } = {}) {
  const object = new THREE.Group();
  object.name = 'body-shell';

  const material = ghostMaterial({ color, opacity });

  // radius, height — shoulders, waist, hips.
  const trunk = new THREE.Mesh(
    latheFromProfile(
      [
        [0.05, -3.5],
        [1.05, -3.35],
        [1.18, -2.7],
        [1.0, -1.9],
        [0.92, -1.0],
        [1.0, 0.1],
        [1.24, 1.15],
        [1.3, 1.95],
        [0.9, 2.5],
        [0.42, 2.75],
        [0.34, 3.0],
      ],
      { segments: 60, radial: 44 }
    ),
    material
  );
  trunk.name = 'trunk';
  // Bodies are deeper front-to-back than they are round.
  trunk.scale.set(1, 1, 0.62);

  const head = new THREE.Mesh(shapedSphere({ detail: 6, scale: [0.62, 0.78, 0.7] }), material);
  head.position.set(0, 3.62, 0);
  head.name = 'head';

  object.add(trunk, head);

  return { object, material };
}
