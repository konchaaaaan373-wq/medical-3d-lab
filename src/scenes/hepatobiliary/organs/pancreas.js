import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { shapedSphere } from '../../shared/geometry/shapes.js';
import { mucosaMaterial, tissueMaterial } from '../../shared/materials.js';
import { createRandom } from '../../../utils/math.js';

/**
 * The pancreas, with its duct and a scatter of islets.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Head, neck, body and tail as one
 * tapering organ lying across the back of the abdomen, with the main duct
 * running the length of it. The gland is drawn translucent so the duct and the
 * islets inside it are visible — again a visualisation choice.
 *
 * The islets are placed by a seeded generator: their number and positions are
 * decorative, and no proportion of the gland is being claimed.
 */
export function buildPancreas({
  color = '#e0b088',
  ductColor = '#8fd6c4',
  isletColor = '#7fb2ff',
  islets = 14,
  seed = 23,
} = {}) {
  const object = new THREE.Group();
  object.name = 'pancreas';

  // Head (screen left, inside the duodenal C) → neck → body → tail.
  const curve = smoothCurve([
    [-1.42, -0.42, 0.12],
    [-1.0, -0.12, 0.06],
    [-0.4, 0.08, 0],
    [0.35, 0.24, -0.08],
    [1.1, 0.38, -0.18],
    [1.72, 0.52, -0.3],
  ]);

  const radius = (u) => {
    if (u < 0.2) return 0.46 - 0.16 * (u / 0.2); // head
    if (u < 0.34) return 0.3 - 0.06 * ((u - 0.2) / 0.14); // neck
    if (u < 0.72) return 0.24 + 0.06 * Math.sin(((u - 0.34) / 0.38) * Math.PI); // body
    return 0.24 - 0.15 * ((u - 0.72) / 0.28); // tail
  };

  const gland = new TubeSurface(curve, { radius, steps: 120, radial: 22 });
  const glandMesh = new THREE.Mesh(gland.geometry, tissueMaterial({ color, roughness: 0.6, opacity: 0.72 }));
  glandMesh.name = 'gland';

  // Main duct: thin, central, draining towards the head.
  const duct = new TubeSurface(curve, { radius: () => 0.045, steps: 120, radial: 10 });
  const ductMesh = new THREE.Mesh(duct.geometry, mucosaMaterial({ color: ductColor }));
  ductMesh.name = 'pancreatic-duct';

  const isletGeometry = shapedSphere({ detail: 3, scale: [0.055, 0.055, 0.055] });
  const isletMaterial = tissueMaterial({ color: isletColor, roughness: 0.3, emissiveIntensity: 0.25 });
  const isletGroup = new THREE.Group();
  isletGroup.name = 'islets';
  const random = createRandom(seed);
  const isletPoints = [];
  for (let i = 0; i < islets; i++) {
    const u = 0.12 + random() * 0.82;
    const centre = curve.getPointAt(u);
    const r = radius(u) * 0.55;
    const point = centre.clone().add(
      new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(r)
    );
    const islet = new THREE.Mesh(isletGeometry, isletMaterial);
    islet.position.copy(point);
    isletGroup.add(islet);
    isletPoints.push(point);
  }

  object.add(glandMesh, ductMesh, isletGroup);

  return {
    object,
    curve,
    isletPoints,
    /** Where the duct leaves the head, for a stream heading into the duodenum. */
    ductOutlet: curve.getPointAt(0).clone(),
    anchors: {
      head: new THREE.Vector3(-1.9, -0.95, 0.5),
      body: new THREE.Vector3(0.3, 0.95, 0.4),
      tail: new THREE.Vector3(2.2, 0.95, 0.2),
      islet: isletPoints[0].clone().add(new THREE.Vector3(0.3, 0.45, 0.3)),
    },
    dispose() {
      gland.dispose();
      duct.dispose();
      isletGeometry.dispose();
    },
  };
}
