import * as THREE from 'three';
import { ripple, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * A brain, at the level of detail an overview needs.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Cerebral hemispheres separated by the
 * longitudinal fissure, a folded surface, the cerebellum below and behind, and
 * the brainstem continuing down. Lobes, sulci and every internal structure are
 * absent — the amyloid-β scene is where the nervous system is looked at
 * properly, and this is the shape that says "brain" from across the room.
 */
export function buildBrain({ color = '#c8b3d8', stemColor = '#a893c4', cerebellum = '#b09ac9' } = {}) {
  const object = new THREE.Group();
  object.name = 'brain';

  const cerebrum = new THREE.Mesh(
    shapedSphere({
      detail: 9,
      scale: [0.78, 0.68, 0.92],
      warp: (v) => {
        const { x, y, z } = v;
        // Longitudinal fissure: the deep midline groove between hemispheres.
        v.multiplyScalar(1 - 0.11 * Math.exp(-Math.pow(x / 0.09, 2)) * smoothstep(-0.4, 0.4, y));
        // Frontal pole a little narrower than the occipital.
        v.x *= 1 - 0.14 * smoothstep(0, 1, z);
        // Gyri: high-frequency folding, shallow enough to stay readable.
        v.multiplyScalar(1 + 0.035 * ripple(x, y, z, 8.5, 0.4));
        // Flatter underneath, where the brain sits on the skull base.
        if (v.y < -0.35) v.y = v.y * 0.72 - 0.1;
      },
    }),
    tissueMaterial({ color, roughness: 0.62, emissiveIntensity: 0.05 })
  );
  cerebrum.name = 'cerebrum';

  const cerebellumMesh = new THREE.Mesh(
    shapedSphere({
      detail: 6,
      scale: [0.42, 0.24, 0.32],
      warp: (v) => v.multiplyScalar(1 + 0.06 * ripple(v.x, v.y, v.z, 16, 2.2)),
    }),
    tissueMaterial({ color: cerebellum, roughness: 0.68 })
  );
  cerebellumMesh.position.set(0, -0.44, -0.52);
  cerebellumMesh.name = 'cerebellum';

  const stemCurve = smoothCurve([
    [0, -0.2, -0.12],
    [0, -0.5, -0.16],
    [0, -0.85, -0.2],
    [0, -1.2, -0.22],
  ]);
  const stem = new TubeSurface(stemCurve, { radius: (u) => 0.14 - 0.03 * u, steps: 30, radial: 14 });
  const stemMesh = new THREE.Mesh(stem.geometry, tissueMaterial({ color: stemColor, roughness: 0.55 }));
  stemMesh.name = 'brainstem';

  object.add(cerebrum, cerebellumMesh, stemMesh);

  return {
    object,
    anchors: {
      cerebrum: new THREE.Vector3(0.95, 0.55, 0.4),
      cerebellum: new THREE.Vector3(-0.75, -0.55, -0.7),
      brainstem: new THREE.Vector3(0.45, -0.95, 0.2),
    },
    dispose() {
      stem.dispose();
    },
  };
}
