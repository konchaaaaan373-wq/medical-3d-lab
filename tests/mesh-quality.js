/**
 * Is a mesh actually a solid?
 *
 * A2 is defined as "the parts anatomy names, addressable by name, as separate
 * **closed** meshes" (`src/catalog/anatomy.js`), and until this file nothing
 * measured the closed part. What that cost is in
 * [`docs/organ-3d-playbook.md`](../docs/organ-3d-playbook.md): every tube in
 * the product was open at both ends and wound inside out, and neither showed
 * up in a silhouette, which is all anyone was looking at.
 *
 * Two questions, and they are different:
 *
 * - **Closed.** Every edge is shared by exactly two triangles. An edge with one
 *   is a hole; an edge with three or more is two surfaces welded down a seam.
 * - **Outward.** The signed volume is positive. A mesh can be perfectly closed
 *   and inside out, and under a front-side material that draws the far wall
 *   with its normal pointing back at the viewer — the shape survives, the
 *   shading does not.
 *
 * Edges are counted by welded position rather than by vertex index. A surface
 * assembled from patches has matching positions with different indices, and
 * counting by index calls every one of those seams a hole.
 */
import * as THREE from 'three';

const WELD = 1e-5;

/** @param {THREE.BufferGeometry} geometry */
export function meshQuality(geometry, { weld = WELD } = {}) {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const at = (i) => (index ? index.getX(i) : i);

  const welded = new Map();
  const idOf = (i) => {
    const q = (v) => Math.round(v / weld);
    const key = `${q(position.getX(i))},${q(position.getY(i))},${q(position.getZ(i))}`;
    if (!welded.has(key)) welded.set(key, welded.size);
    return welded.get(key);
  };

  const edges = new Map();
  let degenerate = 0;
  for (let t = 0; t < count; t += 3) {
    const a = idOf(at(t));
    const b = idOf(at(t + 1));
    const c = idOf(at(t + 2));
    if (a === b || b === c || a === c) {
      degenerate += 1;
      continue;
    }
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const edge = u < v ? `${u}|${v}` : `${v}|${u}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const shared of edges.values()) {
    if (shared === 1) boundaryEdges += 1;
    else if (shared > 2) nonManifoldEdges += 1;
  }

  return {
    triangles: count / 3,
    degenerate,
    boundaryEdges,
    nonManifoldEdges,
    closed: boundaryEdges === 0 && nonManifoldEdges === 0,
    signedVolume: signedVolume(geometry),
  };
}

/**
 * Positive when the surface is wound outwards.
 *
 * Meaningful for a closed mesh; for an open one it is the volume of the cone
 * the surface makes with the origin, which still has the right sign for the
 * lathed and swept shapes here but is not a claim worth making on its own.
 */
export function signedVolume(geometry) {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const at = (i) => (index ? index.getX(i) : i);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < count; t += 3) {
    a.fromBufferAttribute(position, at(t));
    b.fromBufferAttribute(position, at(t + 1));
    c.fromBufferAttribute(position, at(t + 2));
    total += a.dot(b.clone().cross(c)) / 6;
  }
  return total;
}

/** Every mesh under `object`, as `[name, quality]`, for reporting all at once. */
export function qualityOfEach(object) {
  const rows = [];
  object.traverse((node) => {
    if (!node.isMesh || !node.geometry?.getAttribute?.('position')) return;
    rows.push([node.name || '(unnamed)', meshQuality(node.geometry)]);
  });
  return rows;
}
