import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * An adrenal gland: a cap on top of the kidney, cortex outside, medulla inside.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Two nested shapes, because the one
 * fact worth carrying is that this is two glands in one capsule with two
 * different outputs. The cortical zones are not drawn, and the thickness ratio
 * here is chosen to be visible, not to be right.
 */
export function buildAdrenal({ cortexColor = '#e8c88a', medullaColor = '#8f4fd6', opacity = 0.42 } = {}) {
  const object = new THREE.Group();
  object.name = 'adrenal';

  const capWarp = (v) => {
    // A flattened triangular cap: a ridge along the top, spreading below.
    const up = smoothstep(-0.2, 1, v.y);
    v.x *= 1 - 0.55 * up;
    v.z *= 1 - 0.55 * up;
    v.y = v.y * 0.72 + 0.12;
  };

  const cortex = new THREE.Mesh(
    shapedSphere({ detail: 6, scale: [0.58, 0.44, 0.48], warp: capWarp }),
    tissueMaterial({ color: cortexColor, roughness: 0.5, opacity })
  );
  cortex.name = 'cortex';

  const medulla = new THREE.Mesh(
    shapedSphere({ detail: 5, scale: [0.31, 0.22, 0.25], warp: capWarp }),
    tissueMaterial({ color: medullaColor, roughness: 0.4, emissiveIntensity: 0.34 })
  );
  medulla.name = 'medulla';

  object.add(cortex, medulla);

  return {
    object,
    /** Release points: just inside the cortex, and at the centre of the medulla. */
    cortexPoints: [
      new THREE.Vector3(-0.38, 0.07, 0.2),
      new THREE.Vector3(0.38, 0.07, 0.2),
      new THREE.Vector3(0, 0.12, -0.3),
    ],
    medullaPoint: new THREE.Vector3(0, 0.06, 0),
    anchors: {
      cortex: new THREE.Vector3(-0.95, 0.55, 0.4),
      medulla: new THREE.Vector3(0.85, -0.08, 0.5),
    },
  };
}
