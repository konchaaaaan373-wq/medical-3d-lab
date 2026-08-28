import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';
import { createRandom } from '../../../utils/math.js';

/**
 * The thyroid: two lobes and the isthmus between them.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The shape that identifies this organ
 * is the butterfly wrapped around the front of the trachea, so that is what is
 * built: two lobes tapering upwards, concave where they meet the airway, joined
 * across the midline. Follicles are drawn as small spheres inside a translucent
 * gland — a schematic, not a histological section.
 */
export function buildThyroid({ color = '#b4565f', follicleColor = '#ffd9a0', follicles = 22, seed = 33 } = {}) {
  const object = new THREE.Group();
  object.name = 'thyroid';

  const material = tissueMaterial({ color, roughness: 0.42, opacity: 0.78, emissiveIntensity: 0.07 });

  const lobe = (sign) => {
    const mesh = new THREE.Mesh(
      shapedSphere({
        detail: 7,
        scale: [0.31, 0.62, 0.35],
        warp: (v) => {
          // Superior pole tapers, inferior pole is blunt.
          const up = smoothstep(-0.1, 1, v.y);
          v.x *= 1 - 0.5 * up;
          v.z *= 1 - 0.45 * up;
          // The medial face is hollowed where the trachea sits.
          if (v.x * sign < 0) v.x += sign * 0.34 * Math.exp(-Math.pow(v.y / 0.7, 2));
        },
      }),
      material
    );
    mesh.position.set(sign * 0.36, 0, 0.02);
    mesh.name = sign > 0 ? 'left-lobe' : 'right-lobe';
    return mesh;
  };

  const rightLobe = lobe(-1);
  const leftLobe = lobe(1);

  // Isthmus: a band across the front of the trachea, low.
  const isthmusCurve = smoothCurve([
    [-0.34, -0.24, 0.16],
    [0, -0.26, 0.24],
    [0.34, -0.24, 0.16],
  ]);
  const isthmusSurface = new TubeSurface(isthmusCurve, { radius: () => 0.13, steps: 24, radial: 12 });
  const isthmus = new THREE.Mesh(isthmusSurface.geometry, material);
  isthmus.name = 'isthmus';

  // Follicles, scattered through both lobes. Their count is decorative.
  const follicleGeometry = shapedSphere({ detail: 2, scale: [0.05, 0.05, 0.05] });
  const follicleMaterial = tissueMaterial({ color: follicleColor, roughness: 0.25, emissiveIntensity: 0.3 });
  const follicleGroup = new THREE.Group();
  follicleGroup.name = 'follicles';
  const random = createRandom(seed);
  const folliclePoints = [];
  for (let i = 0; i < follicles; i++) {
    const sign = i % 2 === 0 ? -1 : 1;
    const point = new THREE.Vector3(
      sign * (0.26 + (random() - 0.5) * 0.22),
      (random() - 0.5) * 0.82,
      0.02 + (random() - 0.5) * 0.24
    );
    const follicle = new THREE.Mesh(follicleGeometry, follicleMaterial);
    follicle.position.copy(point);
    follicleGroup.add(follicle);
    folliclePoints.push(point);
  }

  object.add(rightLobe, leftLobe, isthmus, follicleGroup);

  return {
    object,
    folliclePoints,
    anchors: {
      rightLobe: new THREE.Vector3(-0.95, 0.45, 0.45),
      leftLobe: new THREE.Vector3(0.95, 0.45, 0.45),
      isthmus: new THREE.Vector3(0, -0.75, 0.6),
      follicle: folliclePoints[0].clone().add(new THREE.Vector3(-0.35, 0.2, 0.35)),
    },
    dispose() {
      isthmusSurface.dispose();
      follicleGeometry.dispose();
    },
  };
}
