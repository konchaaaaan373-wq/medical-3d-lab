import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../geometry/tube.js';

/**
 * Cut a tubular organ into the named lengths anatomy divides it into.
 *
 * Several organs in this repository are drawn as one tube of varying calibre
 * along a path — the stomach, the colon, the pancreas — because that is what
 * makes peristalsis and flow expressible. It is also why none of them could be
 * pointed at: fundus, body and antrum were three names for three stretches of
 * one mesh, and a click on any of them selects the same thing.
 *
 * This gives each stretch a mesh of its own, built from the organ's own path
 * and its own calibre profile rather than from a second description of them.
 * A part is a real solid with its own ends, so the boundary between two parts
 * is somewhere a reader can see, and the union is the organ that was there
 * before.
 *
 * **The division is the caller's claim, not this file's.** What is passed in is
 * where along the organ each named part starts and stops, and that belongs
 * beside the path it refers to — where a change to one is a change to the other.
 *
 * @param {THREE.Curve<THREE.Vector3>} curve the organ's path
 * @param {(u: number) => number} radiusAt its calibre, 0..1 along that path
 * @param {Array<{id: string, from: number, to: number}>} parts in path order
 * @param {{radial?: number, steps?: number, material: (part: object) => THREE.Material}} options
 * @returns {{parts: Array<object>, dispose: () => void}}
 */
export function tubeParts(curve, radiusAt, parts, { radial = 24, steps = 180, material }) {
  const built = [];
  const disposables = [];

  for (const part of parts) {
    const span = part.to - part.from;
    if (!(span > 0)) throw new Error(`tubeParts: "${part.id}" spans nothing`);
    // Enough samples that a part's own curve follows the organ's rather than
    // cutting the corner: proportional to how much of it this part is, and
    // never so few that a short part becomes a straight cylinder.
    const count = Math.max(6, Math.round(steps * span));
    const points = [];
    for (let i = 0; i <= count; i += 1) {
      const point = curve.getPointAt(part.from + span * (i / count));
      points.push([point.x, point.y, point.z]);
    }
    const surface = new TubeSurface(smoothCurve(points), {
      radius: (u) => radiusAt(part.from + span * u),
      steps: count,
      radial,
    });
    const mesh = new THREE.Mesh(surface.geometry, material(part));
    mesh.name = part.id;
    disposables.push(surface, mesh.material);

    const centre = curve.getPointAt(part.from + span * 0.5);
    built.push({ ...part, mesh, surface, centre });
  }

  return {
    parts: built,
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}

/**
 * Where along a path a point lies, as a fraction of it.
 *
 * For deriving a boundary from something else in the scene rather than typing
 * it: the cardia is where the oesophagus opens into the stomach, so it is found
 * from the oesophagus rather than written down beside it and left to drift.
 *
 * @param {THREE.Curve<THREE.Vector3>} curve
 * @param {THREE.Vector3} point
 * @param {number} [samples]
 */
export function nearestU(curve, point, samples = 200) {
  let best = 0;
  let bestDistance = Infinity;
  const probe = new THREE.Vector3();
  for (let i = 0; i <= samples; i += 1) {
    const u = i / samples;
    curve.getPointAt(u, probe);
    const distance = probe.distanceToSquared(point);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = u;
    }
  }
  return best;
}
