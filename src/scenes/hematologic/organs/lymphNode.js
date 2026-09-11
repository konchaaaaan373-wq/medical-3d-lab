import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * One lymph node, at node scale.
 *
 * Deliberately its **own scene**, separate from the drainage routes: a node is
 * a few millimetres and the thoracic duct is forty centimetres, and a model
 * that draws both at once has to lie about one of them. What is drawn here is
 * one node, filling the frame, at a scale where its inside can be named.
 *
 * ## Many in, one out
 *
 * That is the whole shape of a node. Several **afferent** vessels arrive
 * anywhere on the convex surface; a single **efferent** leaves at the **hilum**,
 * the dent on the concave side, together with the artery and vein. Lymph
 * therefore has to pass *through* the node — it cannot go round it — and that
 * is why a node is where anything travelling in lymph gets stopped, and why
 * a node downstream of a tumour is the one that is sampled.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No dimension here is a
 * measurement**, and nothing moves: no flow, no cells, no swelling.
 */

/** Where the vessels and the regions are placed from. */
export const SITES = Object.freeze({
  /** The dent on the concave side: one way out, for everything. */
  hilum: [0.56, -0.1, 0],
  /** The convex side, where lymph arrives. */
  convexPole: [-1.06, 0.05, 0],
});

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildLymphNode({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'lymph-node';
  const disposables = [];
  const index = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    return add(id, new THREE.Mesh(geometry, built));
  };

  /**
   * The node's outline: a bean, dented on one side.
   *
   * `scale` picks how far in this copy of the outline sits, so the capsule, the
   * cortex and the medulla are the same shape at three depths rather than three
   * shapes that happen to nest.
   */
  const bean = (fraction, detail = 6) =>
    shapedSphere({
      detail,
      scale: [1.1 * fraction, 0.72 * fraction, 0.7 * fraction],
      warp: (v) => {
        // The hilum: a dent pushed into one end.
        const dent = Math.exp(-Math.pow((v.x - 1) / 0.55, 2) - Math.pow(v.y / 0.7, 2) - Math.pow(v.z / 0.7, 2));
        v.x -= 0.55 * dent;
        // Fuller on the convex side than the concave one.
        v.y += 0.08 * smoothstep(0, -1, v.x);
      },
    });

  // Outside in. Three depths of one outline, so the reader is looking at one
  // organ in section rather than three beans in a bag.
  solid('capsule', bean(1), '#cfc3b0', tissueMaterial, { roughness: 0.5 });
  solid('cortex', bean(0.9), '#8f6bbd', mucosaMaterial);
  solid('medulla', bean(0.58), '#d8a8c8', mucosaMaterial);

  // The follicles: rounded nests just inside the cortex, and the part of a node
  // that gets bigger when it is working. One structure, several meshes.
  const follicleMeshes = [];
  const follicleMaterial = mucosaMaterial({ color: colors['lymphoid-follicle'] ?? '#5c3f8c' });
  disposables.push(follicleMaterial);
  let seed = 11;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + 0.4;
    const lift = (random() - 0.5) * 0.5;
    const geometry = shapedSphere({ detail: 3, scale: [0.16, 0.15, 0.15] });
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, follicleMaterial);
    mesh.position.set(-0.35 + Math.cos(angle) * 0.42, Math.sin(angle) * 0.42 + lift * 0.2, lift);
    mesh.name = `lymphoid-follicle-${i}`;
    object.add(mesh);
    follicleMeshes.push(mesh);
  }
  index.set('lymphoid-follicle', follicleMeshes[0]);

  const vessel = (id, points, radius, color) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps: 24, radial: 12 });
    const built = wallMaterial({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };

  // Many in, anywhere on the convex surface. One structure, because which of
  // them a given lymphatic is is not a question anybody asks.
  const afferentMeshes = [];
  const afferentMaterial = wallMaterial({ color: colors['afferent-vessels'] ?? '#8fc4a8' });
  disposables.push(afferentMaterial);
  for (const [dy, dz] of [
    [0.62, 0.2],
    [0.1, 0.52],
    [-0.5, 0.12],
    [-0.18, -0.48],
    [0.42, -0.34],
  ]) {
    const surface = new TubeSurface(
      smoothCurve([
        [-2.0, dy * 1.5, dz * 1.5],
        [-1.5, dy * 1.2, dz * 1.2],
        [-1.0, dy * 0.95, dz * 0.95],
      ]),
      { radius: () => 0.075, steps: 16, radial: 10 }
    );
    disposables.push(surface);
    const mesh = new THREE.Mesh(surface.geometry, afferentMaterial);
    mesh.name = `afferent-vessel-${afferentMeshes.length}`;
    object.add(mesh);
    afferentMeshes.push(mesh);
  }
  index.set('afferent-vessels', afferentMeshes[0]);

  // One out, at the hilum.
  vessel(
    'efferent-vessel',
    [[...SITES.hilum], [1.1, -0.16, 0], [1.9, -0.22, 0]],
    0.105,
    '#5c9c7c'
  );

  // The hilum itself, as the place it is: a marker at the dent, so that "where
  // everything leaves" can be pointed at without pointing at a vessel.
  solid(
    'hilum',
    shapedSphere({ detail: 4, scale: [0.13, 0.22, 0.22] }),
    '#c46a5a',
    tissueMaterial
  ).position.set(...SITES.hilum);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    follicleMeshes,
    afferentMeshes,
    anchorPoints: Object.fromEntries(Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
