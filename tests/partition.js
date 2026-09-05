import * as THREE from 'three';

import { carvePart } from '../src/scenes/shared/geometry/carve.js';

/**
 * Checking that a set of parts really partitions the organ it was cut from.
 *
 * Both organs here are carved the same way: an organ is a star-shaped solid
 * described by a radial distance field, and a part is that solid intersected
 * with a few half-spaces. Nothing in that construction guarantees the parts
 * *tile* the organ. Get one `positive` flag backwards and two segments claim
 * the same wedge; leave a bound off and a sliver belongs to nobody. Neither
 * shows up as an error, and neither shows up in a picture either — the meshes
 * still look like an organ, and the volume shares still sum to 1 because they
 * are shares of the parts rather than of the organ.
 *
 * That last point is why this file exists. Dividing each part by the sum of the
 * parts can never detect any of it: the answer is 1 whatever the parts are. The
 * only checks with teeth measure the parts against **the organ**, which is what
 * both functions below do.
 *
 * This is not hypothetical in this repository. The liver's caudate is a slab
 * rather than the box it should be precisely because bounding it sideways left
 * unclaimed slivers behind segments II and VII; the note on `caudateFront` in
 * `liverAnatomy.js` records that. The lobes of the lung once summed to 182% of
 * the lung they were cut from, because a fixed-point iteration for the surface
 * crossing silently failed to converge for an off-centre part.
 */

/** Whether a point lies inside a part, by the rule the carve itself cuts with. */
const insidePlanes = (point, planes) =>
  planes.every((plane) => plane.normal.dot(point) - plane.constant <= 0);

/**
 * A deterministic uniform generator.
 *
 * mulberry32. Seeded so a failure is reproducible: a partition defect that
 * shows up only for one in ten thousand points is exactly the kind that a
 * different random stream each run turns into an intermittent failure nobody
 * can reproduce.
 */
function generator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * How cleanly a set of parts covers the solid they were cut from.
 *
 * Rejection-samples the organ's interior and asks each point how many parts
 * claim it. The answer should be exactly one every time.
 *
 * @param {object} options
 * @param {THREE.Box3} options.bounds a box containing the organ
 * @param {(point: THREE.Vector3) => boolean} options.contains whether a point is in the organ
 * @param {Array<{ id: string, planes: Array<{normal: THREE.Vector3, constant: number}> }>} options.parts
 * @param {number} [options.samples] interior points to evaluate, not points tried
 * @param {number} [options.seed]
 * @returns {{ samples: number, unassigned: number, multiple: number,
 *   unassignedRate: number, multipleRate: number, worst: string | null }}
 */
export function partitionQuality({ bounds, contains, parts, samples = 50000, seed = 1 }) {
  const random = generator(seed);
  const min = bounds.min;
  const size = bounds.getSize(new THREE.Vector3());
  const point = new THREE.Vector3();

  let inside = 0;
  let unassigned = 0;
  let multiple = 0;
  let worst = null;
  // A bound on tries rather than a `while (true)`: an organ that stopped
  // containing anything would otherwise hang the suite instead of failing it.
  const limit = samples * 50;

  for (let tries = 0; inside < samples && tries < limit; tries++) {
    point.set(
      min.x + random() * size.x,
      min.y + random() * size.y,
      min.z + random() * size.z
    );
    if (!contains(point)) continue;
    inside++;

    let claims = 0;
    let claimant = null;
    for (const part of parts) {
      if (!insidePlanes(point, part.planes)) continue;
      claims++;
      claimant = part.id;
    }
    if (claims === 0) {
      unassigned++;
      if (worst === null) worst = `no part claims (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`;
    } else if (claims > 1) {
      multiple++;
      if (worst === null) worst = `${claims} parts claim (${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)}), one of them ${claimant}`;
    }
  }

  return {
    samples: inside,
    unassigned,
    multiple,
    unassignedRate: inside === 0 ? 1 : unassigned / inside,
    multipleRate: inside === 0 ? 1 : multiple / inside,
    worst,
  };
}

/**
 * The volume of the uncut solid a set of parts came from.
 *
 * Carved from the same field at the same detail with no cutting planes at all,
 * so the comparison is like for like: any difference from the sum of the parts
 * is the carve's own error at the cuts, not a difference of method. Carving the
 * organ at a finer detail than the parts would make the parts look as though
 * they had lost volume they never had.
 *
 * @param {object} options
 * @param {ReturnType<import('../src/scenes/shared/geometry/carve.js').radialField>} options.field
 * @param {number} options.detail the detail the parts were carved at
 * @param {(geometry: THREE.BufferGeometry) => number} options.volumeOf
 * @returns {number}
 */
export function wholeVolume({ field, detail, volumeOf }) {
  const geometry = carvePart({ field, centre: field.centre.clone(), planes: [], detail });
  const volume = volumeOf(geometry);
  geometry.dispose();
  return volume;
}
