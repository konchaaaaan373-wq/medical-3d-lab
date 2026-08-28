import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, smoothstep } from '../../../utils/math.js';

/**
 * Generic shape tools for stylised organs.
 *
 * Nothing here knows about any particular organ — an organ is a *warp* of one
 * of these, and those warps live with the organ, in
 * `src/scenes/<system>/organs/`. That split is what lets a disease scene reuse
 * the same organ geometry with different parameters instead of copying it.
 *
 * All of it is deterministic: the same arguments give the same vertices on
 * every reload, so a screenshot can be re-shot.
 */

/**
 * A sphere pushed into a shape.
 *
 * `warp` is called once per vertex with a point on the unit sphere and may move
 * it anywhere; the result is then multiplied by `scale`. Working on the unit
 * sphere first means a warp reads as anatomy ("flatten the medial surface",
 * "scoop the base") rather than as arithmetic on an ellipsoid.
 *
 * The geometry is welded before warping, so the normals that come out are
 * smooth rather than faceted.
 *
 * @param {{ detail?: number, scale?: [number, number, number],
 *           warp?: (v: THREE.Vector3, index: number) => void }} [options]
 */
export function shapedSphere({ detail = 6, scale = [1, 1, 1], warp } = {}) {
  const geometry = mergeVertices(new THREE.IcosahedronGeometry(1, detail));
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    if (warp) warp(v, i);
    position.setXYZ(i, v.x * scale[0], v.y * scale[1], v.z * scale[2]);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * A surface of revolution from a `[radius, y]` profile, resampled smoothly.
 *
 * `arc` under 2π leaves the shape open — that is how the sectioned organs
 * (uterus, long bone) are cut without a clipping plane.
 *
 * @param {[number, number][]} profile control points, bottom to top
 * @param {{ segments?: number, radial?: number, arc?: number, arcStart?: number }} [options]
 */
export function latheFromProfile(profile, { segments = 48, radial = 40, arc = Math.PI * 2, arcStart = 0 } = {}) {
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)));
  const points = curve.getPoints(segments).map((p) => new THREE.Vector2(Math.max(0.0001, p.x), p.y));
  const geometry = new THREE.LatheGeometry(points, radial, arcStart, arc);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Deterministic, allocation-free surface wobble.
 *
 * Sines rather than a noise lattice: it is three multiplications, it repeats
 * predictably, and for "this lump should not look injection-moulded" that is
 * all a prototype needs.
 */
export function ripple(x, y, z, frequency = 3.4, seed = 0.7) {
  return (
    Math.sin(x * frequency + seed) * Math.sin(y * frequency * 1.27 + seed * 1.7) * Math.sin(z * frequency * 0.93 + seed * 2.3)
  );
}

/**
 * A smooth dimple/bulge factor: 1 at (`atY`, `atZ`), falling off around it.
 * Used for hila, notches and the places one organ presses on another.
 */
export function bump(y, z, { atY = 0, atZ = 0, spreadY = 0.45, spreadZ = 0.45 } = {}) {
  const dy = (y - atY) / spreadY;
  const dz = (z - atZ) / spreadZ;
  return Math.exp(-(dy * dy + dz * dz));
}

/** Flattens everything beyond `edge` on one side of the x axis onto a plane. */
export function flattenSide(v, { sign = 1, edge = 0.25, strength = 0.6 } = {}) {
  const inside = v.x * sign;
  if (inside > -edge) return;
  v.x = lerp(v.x, -edge * sign, strength);
}

export { clamp, lerp, smoothstep };
