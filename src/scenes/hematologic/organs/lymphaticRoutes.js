import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * Where lymph goes, at body scale.
 *
 * The companion to `lymphNode.js`, and separate from it on purpose: a node is a
 * few millimetres and the thoracic duct is most of a person, so one scene
 * cannot draw both honestly. This one draws **routes and groups**, and every
 * node here is a marker for a group rather than a model of a node — the model
 * of a node is the other scene.
 *
 * ## The one asymmetry
 *
 * Lymph does not drain symmetrically. The **right lymphatic duct** takes the
 * right arm, the right side of the head and the right chest; the **thoracic
 * duct** takes *everything else* — both legs, the abdomen, the left arm and the
 * left side of the head. Both empty into the veins at the root of the neck.
 * That imbalance is the single most useful fact in this scene, and the geometry
 * is built to make it visible rather than to mention it.
 *
 * ## Sides
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * `+x` is the patient's **left** — the side the thoracic duct runs up.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre or node count
 * here is a measurement**, and nothing flows.
 */

/** `+x` is the patient's left. Every side below is derived from this. */
export const LEFT = 1;

/**
 * How big a node marker is drawn.
 *
 * **A display size.** A node group is a dozen nodes of a few millimetres
 * against a trunk of half a metre; drawn to scale they are invisible. Each
 * group is drawn as a handful of beads large enough to see and click — and
 * "and click" is the part that set this number: at a sixth of a unit the beads
 * were about ten pixels across and a click landed on one only sometimes.
 * **No node size or count may be read off this model.**
 */
export const NODE_DISPLAY_SIZE = 0.26;

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The sac in the abdomen the thoracic duct starts from. */
  cisternaChyli: [LEFT * 0.12, -1.62, -0.34],
  /** Where the thoracic duct ends: the vein angle on the left. */
  leftVenousAngle: [LEFT * 0.66, 1.72, 0.2],
  /** Where the right lymphatic duct ends, on the other side. */
  rightVenousAngle: [-LEFT * 0.66, 1.72, 0.2],
});

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildLymphaticRoutes({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'lymphatic-routes';
  const disposables = [];
  const index = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const duct = (id, points, radius, color) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps: 60,
      radial: 12,
    });
    const built = wallMaterial({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };

  /**
   * One group of nodes, as a handful of beads on a short chain.
   *
   * Each group is one structure: "the axillary nodes" is what a reader asks
   * about and what a report names, not the fourth node from the top.
   */
  const group = (id, centre, spread, color, count = 5) => {
    const material = mucosaMaterial({ color: colors[id] ?? color });
    disposables.push(material);
    const meshes = [];
    let seed = centre[0] * 977 + centre[1] * 131 + 17;
    const random = () => {
      seed = (Math.abs(seed) * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < count; i += 1) {
      const geometry = shapedSphere({
        detail: 3,
        scale: [NODE_DISPLAY_SIZE, NODE_DISPLAY_SIZE * 0.72, NODE_DISPLAY_SIZE * 0.72],
        warp: (v) => {
          v.x -= 0.3 * Math.exp(-Math.pow((v.x - 1) / 0.6, 2) - Math.pow(v.y / 0.8, 2));
        },
      });
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        centre[0] + (random() - 0.5) * spread[0],
        centre[1] + (random() - 0.5) * spread[1],
        centre[2] + (random() - 0.5) * spread[2]
      );
      mesh.rotation.set(random(), random() * 3, random());
      mesh.name = `${id}-${i}`;
      object.add(mesh);
      meshes.push(mesh);
    }
    index.set(id, meshes[0]);
    return meshes;
  };

  // --- the two ducts --------------------------------------------------------
  //
  // The thoracic duct: from a sac in the abdomen, up the back of the chest,
  // crossing to the left, to the vein angle on that side. It drains three
  // quarters of the body, and the route is why.
  duct(
    'thoracic-duct',
    [
      [...SITES.cisternaChyli],
      [LEFT * 0.08, -1.0, -0.42],
      [LEFT * 0.06, -0.2, -0.46],
      [LEFT * 0.16, 0.6, -0.44],
      [LEFT * 0.42, 1.18, -0.28],
      [LEFT * 0.62, 1.56, -0.02],
      [...SITES.leftVenousAngle],
    ],
    (u) => 0.09 - 0.02 * smoothstep(0.2, 1, u),
    '#6fa8c4'
  );
  // The right lymphatic duct: a short vessel for a quarter of the body.
  duct(
    'right-lymphatic-duct',
    [
      [-LEFT * 0.36, 1.32, -0.12],
      [-LEFT * 0.52, 1.56, 0.04],
      [...SITES.rightVenousAngle],
    ],
    0.075,
    '#8fbfd8'
  );

  // The sac the thoracic duct begins at, where the drainage from both legs and
  // the gut arrives.
  const cistern = shapedSphere({ detail: 4, scale: [0.16, 0.26, 0.15] });
  const cisternMaterial = mucosaMaterial({ color: colors['cisterna-chyli'] ?? '#4f8ea8' });
  disposables.push(cistern, cisternMaterial);
  add('cisterna-chyli', new THREE.Mesh(cistern, cisternMaterial)).position.set(...SITES.cisternaChyli);

  // --- the three groups a reader is asked about ----------------------------
  const cervical = [
    ...group('cervical-nodes', [LEFT * 0.4, 2.45, 0.16], [0.3, 0.8, 0.3], '#c2884e'),
    ...group('cervical-nodes', [-LEFT * 0.4, 2.45, 0.16], [0.3, 0.8, 0.3], '#c2884e'),
  ];
  index.set('cervical-nodes', cervical[0]);

  const axillary = [
    ...group('axillary-nodes', [LEFT * 1.16, 1.28, 0.02], [0.34, 0.44, 0.34], '#c46a5a'),
    ...group('axillary-nodes', [-LEFT * 1.16, 1.28, 0.02], [0.34, 0.44, 0.34], '#c46a5a'),
  ];
  index.set('axillary-nodes', axillary[0]);

  const inguinal = [
    ...group('inguinal-nodes', [LEFT * 0.7, -2.72, 0.3], [0.4, 0.36, 0.24], '#b0803c'),
    ...group('inguinal-nodes', [-LEFT * 0.7, -2.72, 0.3], [0.4, 0.36, 0.24], '#b0803c'),
  ];
  index.set('inguinal-nodes', inguinal[0]);

  // --- the collecting vessels that say which way things go -----------------
  //
  // Not a map of the lymphatics — a handful of routes, drawn so that the
  // asymmetry between the two ducts is something a reader can see rather than
  // something the caption claims.
  const route = (id, points, color) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => 0.05, steps: 40, radial: 8 });
    const built = tissueMaterial({ color: colors[id] ?? color, roughness: 0.5 });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };
  route(
    'left-drainage-route',
    [
      [LEFT * 0.7, -2.6, 0.3],
      [LEFT * 0.4, -2.0, -0.1],
      [LEFT * 0.16, -1.7, -0.3],
      [...SITES.cisternaChyli],
    ],
    '#8fb8c8'
  );
  route(
    'right-drainage-route',
    [
      [-LEFT * 1.1, 1.3, 0.02],
      [-LEFT * 0.8, 1.32, -0.06],
      [-LEFT * 0.4, 1.3, -0.12],
    ],
    '#a8cddc'
  );

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    groupMeshes: { cervical, axillary, inguinal },
    anchorPoints: Object.fromEntries(Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
