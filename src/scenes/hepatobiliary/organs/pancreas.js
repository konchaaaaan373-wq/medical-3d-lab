import * as THREE from 'three';
import { TubeSurface, smoothCurve, smoothProfile } from '../../shared/geometry/tube.js';
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
/**
 * The pancreas's axis: head (screen left, inside the duodenal C) → neck → body
 * → tail.
 *
 * Exported with the calibre profile because a second builder cuts this same
 * gland into those named parts; the comment beside each calibre is what that
 * stretch is, and `pancreasParts.js` reads the divisions from here.
 */
export const PANCREAS_PATH = Object.freeze([
  [-1.42, -0.42, 0.12],
  [-1.0, -0.12, 0.06],
  [-0.4, 0.08, 0],
  [0.35, 0.24, -0.08],
  [1.1, 0.38, -0.18],
  [1.72, 0.52, -0.3],
]);

/**
 * The head is much the bulkiest part; the tail thins to a point. Drawn thin
 * and translucent the whole organ read as a ramp rather than as a gland.
 */
export const PANCREAS_CALIBRE = Object.freeze([
  [0, 0.56], // head
  [0.2, 0.4],
  [0.34, 0.3], // neck
  [0.55, 0.34], // body
  [0.78, 0.26],
  [1, 0.08], // tail
]);

export const pancreasPath = () => smoothCurve(PANCREAS_PATH.map((point) => [...point]));
export const pancreasCalibre = () => smoothProfile(PANCREAS_CALIBRE.map((point) => [...point]));

export function buildPancreas({
  color = '#e0b088',
  ductColor = '#8fd6c4',
  isletColor = '#7fb2ff',
  islets = 14,
  seed = 23,
} = {}) {
  const object = new THREE.Group();
  object.name = 'pancreas';

  const curve = pancreasPath();
  const radius = pancreasCalibre();

  const gland = new TubeSurface(curve, { radius, steps: 120, radial: 22 });
  // 0.84 let 16% of the duct through, which is not translucent — it was a
  // number calibrated against a bug. Every tube in the product used to be wound
  // inside out, so under a front-side material the gland's near wall was culled
  // and nothing stood between the viewer and the duct at all. Correcting the
  // winding put a wall back, and at 0.84 the duct this organ exists to show
  // disappeared. This is what the comment above has always claimed.
  const glandMesh = new THREE.Mesh(gland.geometry, tissueMaterial({ color, roughness: 0.6, opacity: 0.42 }));
  glandMesh.name = 'gland';

  // Main duct: thin, central, draining towards the head.
  const duct = new TubeSurface(curve, { radius: () => 0.055, steps: 120, radial: 10 });
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
