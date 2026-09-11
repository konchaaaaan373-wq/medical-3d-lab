import * as THREE from 'three';
import { nearestSite } from '../../shared/geometry/carve.js';

/**
 * The lung's surface, split into the eighteen bronchopulmonary segments.
 *
 * `buildLungs` already knows where every segment is: it paints each vertex of
 * a lobe with the colour of the segment it falls in, by the same rule the
 * definition uses — a segment is the lung nearer to its own segmental bronchus
 * than to any other, inside its own lobe. What it does not do is give a
 * segment a mesh, so a reader could see the eighteen and point at none of
 * them.
 *
 * This is that painting, taken one step further: the same nearest-bronchus
 * rule, applied to each triangle instead of each vertex, so every segment ends
 * up with the part of the lobe that belongs to it. Nothing new is asserted —
 * change the rule and the colours and these surfaces move together, because
 * they are the same rule.
 *
 * ## Why a triangle and not a vertex
 *
 * A vertex on a boundary belongs to two segments and a triangle belongs to
 * one. Splitting on vertices would leave every boundary triangle in both
 * segments, so the surfaces would overlap along every seam — and an overlap is
 * exactly what a reader clicking near a boundary would notice.
 *
 * ## What these are and are not
 *
 * They are **surfaces**, not solids: the part of the lobe's boundary that
 * belongs to a segment, which includes its share of the fissure faces. They
 * are not closed volumes, so nothing here measures a segment's volume, and a
 * segment shown alone is a shell rather than a wedge of lung.
 *
 * The seam between two of them follows the tessellation, because a triangle is
 * the smallest thing that can be assigned. At the detail the lungs ship at
 * that is finer than the boundary is knowable — the boundaries are a model of
 * a definition, and real ones are not surfaces at all.
 */

/**
 * @param {{id: string, side: string, mesh: THREE.Mesh, geometry: THREE.BufferGeometry}} lobe
 * @param {Array<{id: string, position: THREE.Vector3}>} segments the lobe's own
 * @param {(segment: object) => THREE.Material} material
 * @returns {Array<{id: string, lobe: string, side: string, mesh: THREE.Mesh, triangles: number}>}
 */
export function splitLobeIntoSegments(lobe, segments, material) {
  const source = lobe.geometry;
  const position = source.attributes.position;
  const index = source.index;
  const count = index ? index.count : position.count;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const buckets = segments.map(() => []);

  for (let i = 0; i < count; i += 3) {
    const i0 = index ? index.getX(i) : i;
    const i1 = index ? index.getX(i + 1) : i + 1;
    const i2 = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, i0);
    b.fromBufferAttribute(position, i1);
    c.fromBufferAttribute(position, i2);
    centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    buckets[nearestSite(centroid, segments)].push(i0, i1, i2);
  }

  return segments.map((segment, at) => {
    const geometry = new THREE.BufferGeometry();
    // The position and normal attributes are **shared** with the lobe rather
    // than copied. Eighteen copies of a lung's surface is eighteen times the
    // memory for one surface drawn a different way; what differs between the
    // segments is which triangles they claim, and that is the index.
    geometry.setAttribute('position', position);
    if (source.attributes.normal) geometry.setAttribute('normal', source.attributes.normal);
    geometry.setIndex(buckets[at]);
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, material(segment));
    mesh.name = `segment-${segment.id}`;
    return {
      id: segment.id,
      lobe: lobe.id,
      side: lobe.side ?? segment.side,
      mesh,
      geometry,
      triangles: buckets[at].length / 3,
    };
  });
}

/**
 * Every segment surface of a built lung.
 *
 * @param {ReturnType<import('./lungs.js').buildLungs>} lungs
 * @param {(segment: object) => THREE.Material} material
 */
export function buildLungSegmentSurfaces(lungs, material) {
  const built = [];
  for (const lobe of lungs.lobes) {
    const own = lungs.segments.filter((segment) => segment.lobe === lobe.id);
    if (!own.length) continue;
    const parts = splitLobeIntoSegments(lobe, own, material);
    for (const part of parts) {
      // Parented to the lobe's own parent, so a segment surface breathes and
      // moves with the lung it is part of rather than staying where the lung
      // used to be.
      lobe.mesh.parent?.add(part.mesh);
      built.push(part);
    }
  }
  return {
    parts: built,
    dispose() {
      // The shared attributes belong to the lobes; only the index and the
      // material are this file's to release.
      for (const part of built) {
        part.geometry.setIndex(null);
        part.geometry.dispose();
        part.mesh.material.dispose();
      }
    },
  };
}
