import * as THREE from 'three';
import { carveNamedParts } from '../../shared/anatomy/organParts.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';
import { SPLEEN_HILUM, SPLEEN_SCALE, spleenWarp } from './spleen.js';

/**
 * The same spleen, cut into the parts a splenic artery makes of it.
 *
 * `spleen.js` owns the shape; this reads it from there and cuts it, so the two
 * are one organ (`docs/architecture-rules.md` rule 1). What is cut is not a
 * decoration: the splenic artery divides into **superior and inferior terminal
 * branches** before it reaches the hilum, and each supplies its own territory
 * with little crossing between them. That is the whole basis of partial
 * splenectomy, and it is the one division of the spleen that is a *solid*
 * rather than a stain — red and white pulp are histology, and this model does
 * not claim to show them.
 *
 * ## What the plane is, and what it is not
 *
 * A single transverse plane through the hilum. Real segments are separated by
 * an avascular plane that is neither flat nor in the same place in two people;
 * two segments is the usual number and three or four occur. The plane here is
 * the simplest thing that expresses "two territories, divided at the hilum",
 * and the copy says that is all it expresses.
 */

/** Where the artery's two terminal branches divide the parenchyma. */
export const SEGMENT_PLANE_Y = 0.05;

export const SPLEEN_PART_IDS = Object.freeze(['superior-segment', 'inferior-segment']);

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, detail?: number }} [options]
 */
export function buildSpleenParts({ colors = {}, opacity = 0.94, detail = 7 } = {}) {
  const object = new THREE.Group();
  object.name = 'spleen-parts';
  const disposables = [];

  const parenchyma = carveNamedParts({
    warp: spleenWarp,
    scale: [...SPLEEN_SCALE],
    cacheKey: 'spleen',
    detail,
    opacity,
    parts: [
      {
        id: 'superior-segment',
        color: colors['superior-segment'] ?? '#9c4a60',
        // Keeps everything above the plane: the normal points down, at what is
        // discarded.
        planes: [{ through: [0, SEGMENT_PLANE_Y, 0], normal: [0, -1, 0] }],
      },
      {
        id: 'inferior-segment',
        color: colors['inferior-segment'] ?? '#6f3247',
        planes: [{ through: [0, SEGMENT_PLANE_Y, 0], normal: [0, 1, 0] }],
      },
    ],
  });
  object.add(parenchyma.object);

  // The vessels, meeting the organ at the hilum it declares rather than at a
  // position typed here a second time.
  const hilum = new THREE.Vector3(...SPLEEN_HILUM);
  const medial = Math.sign(hilum.x) || -1;

  const vessel = (id, points, radius, color) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps: 40, radial: 12 });
    const material = tissueMaterial({ color: colors[id] ?? color, roughness: 0.3, emissiveIntensity: 0.16 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = id;
    disposables.push(surface, material);
    object.add(mesh);
    return mesh;
  };

  // The artery arrives along the top of the pancreas — from the patient's
  // right, which is away from the spleen's medial face — and divides *before*
  // the hilum. Where it divides is the point of the whole file.
  const division = new THREE.Vector3(hilum.x + medial * 0.34, hilum.y + 0.02, 0.02);
  const splenicArtery = vessel(
    'splenic-artery',
    [
      [hilum.x + medial * 1.02, hilum.y - 0.18, 0.06],
      [hilum.x + medial * 0.72, hilum.y - 0.05, 0.04],
      division.toArray(),
    ],
    0.062,
    '#c0453f'
  );
  const superiorBranch = vessel(
    'superior-terminal-branch',
    [division.toArray(), [hilum.x + medial * 0.18, 0.34, 0.02], [hilum.x - medial * 0.05, 0.6, 0]],
    0.04,
    '#d05a4a'
  );
  const inferiorBranch = vessel(
    'inferior-terminal-branch',
    [division.toArray(), [hilum.x + medial * 0.18, -0.28, 0.02], [hilum.x - medial * 0.05, -0.58, 0]],
    0.04,
    '#d05a4a'
  );
  const splenicVein = vessel(
    'splenic-vein',
    [
      [hilum.x - medial * 0.02, hilum.y - 0.12, -0.18],
      [hilum.x + medial * 0.5, hilum.y - 0.28, -0.14],
      [hilum.x + medial * 1.05, hilum.y - 0.36, -0.08],
    ],
    0.075,
    '#4a6fc0'
  );

  // The tail of the pancreas reaches the hilum. It is context, and it is the
  // reason a splenectomy can injure a pancreas.
  const tailSurface = new TubeSurface(
    smoothCurve([
      [hilum.x + medial * 1.45, hilum.y - 0.44, -0.02],
      [hilum.x + medial * 0.98, hilum.y - 0.33, 0.0],
      [hilum.x + medial * 0.6, hilum.y - 0.24, 0.02],
    ]),
    { radius: (u) => 0.16 * (1 - 0.55 * u), steps: 30, radial: 14 }
  );
  const tailMaterial = tissueMaterial({ color: colors['pancreatic-tail'] ?? '#deb18c', roughness: 0.5, opacity: 0.92 });
  const pancreaticTail = new THREE.Mesh(tailSurface.geometry, tailMaterial);
  pancreaticTail.name = 'pancreatic-tail';
  disposables.push(tailSurface, tailMaterial);
  object.add(pancreaticTail);

  const index = new Map([
    ...parenchyma.parts.map((part) => [part.id, part.mesh]),
    ['splenic-artery', splenicArtery],
    ['superior-terminal-branch', superiorBranch],
    ['inferior-terminal-branch', inferiorBranch],
    ['splenic-vein', splenicVein],
    ['pancreatic-tail', pancreaticTail],
  ]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    parenchyma,
    hilum,
    anchors: {
      spleen: new THREE.Vector3(-1.35 * medial, 1.05, 0.5),
      hilum: new THREE.Vector3(1.05 * medial, 0.1, 0.62),
    },
    dispose() {
      parenchyma.dispose();
      for (const item of disposables) item.dispose?.();
    },
  };
}
