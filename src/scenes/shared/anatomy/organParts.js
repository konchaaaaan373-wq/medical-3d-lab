import * as THREE from 'three';
import { carvePart, partCentroid, planeThrough, radialField, surfaceSamples } from '../geometry/carve.js';
import { tissueMaterial } from '../materials.js';

/**
 * Cut a solid organ into the named parts anatomy divides it into.
 *
 * `tubeParts.js` does this for the organs that are a tube on a path — stomach,
 * colon, pancreas, bile duct. This does it for the organs that are a *lump*:
 * a warp of the unit sphere, cut by planes. The liver and the kidney each grew
 * their own copy of this loop before it was written down; nothing here is new
 * machinery, it is the loop those two already run, in one place, so that an
 * organ can be divided without a new file of carving code every time.
 *
 * **The division is the caller's claim, not this file's.** What is passed in is
 * where each plane runs and which side of it each part keeps, and that belongs
 * beside the organ it refers to.
 *
 * ## Planes point at what is discarded
 *
 * Same convention as `planeThrough`: a part keeps everything *behind* its
 * planes. `{ through, normal }` are in the organ's own coordinates — the ones
 * the finished mesh is in, after `scale` — so a plane reads as "through the
 * hilum, facing up" rather than as a fraction of a bounding box.
 */

/**
 * @param {{
 *   warp: (v: THREE.Vector3) => void,
 *   scale: [number, number, number],
 *   parts: Array<{
 *     id: string,
 *     color?: string,
 *     opacity?: number,
 *     planes?: Array<{ through: [number, number, number], normal: [number, number, number] }>,
 *     at?: [number, number, number],
 *   }>,
 *   detail?: number,
 *   inset?: number,
 *   samples?: number,
 *   cacheKey?: string,
 *   color?: string,
 *   opacity?: number,
 *   roughness?: number,
 *   material?: (part: object) => THREE.Material,
 * }} options
 * @returns {{ parts: Array<object>, part: (id: string) => object, field: object,
 *             bounds: THREE.Box3, object: THREE.Group, dispose: () => void }}
 */
export function carveNamedParts({
  warp,
  scale,
  parts,
  detail = 7,
  inset = 0.004,
  samples = 16000,
  cacheKey,
  color = '#b3565c',
  opacity = 1,
  roughness = 0.5,
  material,
}) {
  const points = surfaceSamples(warp, scale, samples);
  const bounds = new THREE.Box3();
  const probe = new THREE.Vector3();
  for (let i = 0; i < points.length; i += 3) {
    bounds.expandByPoint(probe.set(points[i], points[i + 1], points[i + 2]));
  }
  const field = radialField(points, bounds.getCenter(new THREE.Vector3()));

  const object = new THREE.Group();
  const disposables = [];
  const built = [];

  for (const part of parts) {
    const planes = (part.planes ?? []).map(({ through, normal }) =>
      planeThrough(new THREE.Vector3(...through), new THREE.Vector3(...normal))
    );
    // Found, not written down. A carve is star-shaped about its centre, and a
    // centre that is outside its own part produces a different solid rather
    // than a smaller one — which is the failure that looks like a modelling
    // mistake and is not one.
    const found = partCentroid({ field, bounds, planes, samples: 7000, seed: 11 });
    const centre = found ? found.centroid : new THREE.Vector3(...(part.at ?? [0, 0, 0]));
    const geometry = carvePart({
      field,
      centre,
      planes,
      detail,
      // Two parts that share a cut would otherwise z-fight along it.
      inset: planes.length ? inset : 0,
      cacheKey: cacheKey ? `${cacheKey}:${samples}` : null,
    });
    const partMaterial =
      material?.(part) ??
      tissueMaterial({
        color: part.color ?? color,
        roughness,
        opacity: part.opacity ?? opacity,
        emissiveIntensity: 0.05,
      });
    const mesh = new THREE.Mesh(geometry, partMaterial);
    mesh.name = part.id;
    object.add(mesh);
    disposables.push(geometry, partMaterial);
    built.push({ ...part, mesh, geometry, material: partMaterial, centre, planes });
  }

  const index = new Map(built.map((part) => [part.id, part]));
  return {
    object,
    parts: built,
    part: (id) => index.get(id),
    field,
    bounds,
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
