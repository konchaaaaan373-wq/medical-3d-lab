import * as THREE from 'three';
import { TubeSurface } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial } from '../../shared/materials.js';
import { shapedSphere } from '../../shared/geometry/shapes.js';
import { createRandom } from '../../../utils/math.js';
import { tubeParts } from '../../shared/anatomy/tubeParts.js';
import { pancreasCalibre, pancreasPath } from './pancreas.js';

/**
 * The same pancreas, cut into head, neck, body and tail.
 *
 * `pancreas.js` owns the axis and the calibre along it, and this reads both
 * from there. What is different is the purpose: `buildPancreas` returns one
 * translucent gland with a duct running through it, because a secretion scene
 * needs to see the duct through the gland; this returns a solid per named part,
 * because a reader pointing at the tail has to hit the tail.
 *
 * ## Where the boundaries come from
 *
 * From the calibre profile in `pancreas.js`, which is written with the parts
 * named against it: head at 0, neck at 0.34, body at 0.55, tail at 1. The
 * divisions are the midpoints between those, so the stretch a part covers and
 * the calibre it is drawn at cannot come apart.
 *
 * ## What this does not claim
 *
 * There is no uncinate process, no accessory duct, no common bile duct running
 * through the head, and no acini. The islets are placed pseudo-randomly along
 * the gland from a fixed seed: they say *that* endocrine tissue is scattered
 * through an exocrine organ, and nothing about how many there are or how big
 * they are — a million islets are about 1–2% of the gland's mass, and fourteen
 * spheres are not a count.
 */

export const PANCREAS_PART_IDS = Object.freeze(['head', 'neck', 'body', 'tail']);

export const PANCREAS_PART_COLORS = Object.freeze({
  head: '#e0b088',
  neck: '#d6a37c',
  body: '#e5b891',
  tail: '#d9a97f',
  duct: '#8fd6c4',
  islets: '#7fb2ff',
});

/**
 * @param {{colors?: Record<string, string>, opacity?: number, islets?: number, seed?: number}} [options]
 */
export function buildPancreasParts({
  colors = PANCREAS_PART_COLORS,
  opacity = 0.95,
  islets = 14,
  seed = 23,
} = {}) {
  const object = new THREE.Group();
  object.name = 'pancreas-parts';

  const curve = pancreasPath();
  const radiusAt = pancreasCalibre();

  /**
   * Where one part stops and the next starts, along the gland's own axis.
   *
   * Read off the calibre profile in `pancreas.js`, which names its stops: the
   * head is the bulk from 0 while the calibre falls from 0.56 to 0.4, the neck
   * is the waist around its minimum at 0.34, the body is the stretch through
   * the bulge at 0.55, and the tail is the thinning that starts at 0.78. Taking
   * plain midpoints between those stops instead — the obvious rule — gave the
   * head a sixth of the gland, when the head is the bulkiest part of it.
   */
  const regions = [
    { id: 'head', from: 0, to: 0.25 },
    { id: 'neck', from: 0.25, to: 0.44 },
    { id: 'body', from: 0.44, to: 0.8 },
    { id: 'tail', from: 0.8, to: 1 },
  ];

  const built = tubeParts(curve, radiusAt, regions, {
    radial: 22,
    steps: 150,
    material: (part) => tissueMaterial({ color: colors[part.id], roughness: 0.6, opacity }),
  });
  for (const part of built.parts) object.add(part.mesh);

  // The main duct, running the length of the gland to the head.
  const ductSurface = new TubeSurface(curve, { radius: () => 0.055, steps: 130, radial: 12 });
  const duct = new THREE.Mesh(ductSurface.geometry, mucosaMaterial({ color: colors.duct }));
  duct.name = 'pancreatic-duct';
  object.add(duct);

  // The islets. Same seed and same rule as `buildPancreas`, so the two builders
  // scatter them the same way rather than each having its own opinion.
  const isletGeometry = shapedSphere({ detail: 3, scale: [0.055, 0.055, 0.055] });
  const isletMaterial = tissueMaterial({ color: colors.islets, roughness: 0.3, emissiveIntensity: 0.25 });
  const isletGroup = new THREE.Group();
  isletGroup.name = 'islets';
  const random = createRandom(seed);
  for (let i = 0; i < islets; i += 1) {
    const u = 0.12 + random() * 0.82;
    const centre = curve.getPointAt(u);
    const r = radiusAt(u) * 0.55;
    const islet = new THREE.Mesh(isletGeometry, isletMaterial);
    islet.position.copy(
      centre.add(
        new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(r)
      )
    );
    isletGroup.add(islet);
  }
  object.add(isletGroup);

  const index = new Map(built.parts.map((part) => [part.id, part]));

  return {
    object,
    curve,
    parts: built.parts,
    part: (id) => index.get(id) ?? null,
    duct,
    islets: isletGroup,
    anchors: {
      head: curve.getPointAt(0.08),
      body: curve.getPointAt(0.62),
      tail: curve.getPointAt(0.95),
    },
    dispose() {
      built.dispose();
      ductSurface.dispose();
      duct.material.dispose();
      isletGeometry.dispose();
      isletMaterial.dispose();
    },
  };
}
