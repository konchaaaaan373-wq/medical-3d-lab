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
 * `partitionReport` does.
 *
 * ## Everything here is measured against the uncut organ, deliberately
 *
 * The organ is carved once from the same field at the same detail with no
 * cutting planes, and that solid supplies both the sampling box and the volume
 * the parts are compared to. It is not a convenience — deriving either from the
 * parts reintroduces the same blindness in a subtler place.
 *
 * Sampling inside a box unioned from the *parts'* bounding boxes cannot see a
 * region that no part claims **and** that lies outside every part's box: an
 * unclaimed cap at one end of the organ is exactly that shape, and it removes
 * itself from the sample. Measured on this liver with a cap lopped off every
 * segment, the part-derived box reported 0.78% of points unassigned where the
 * organ's own box reported 4.80% — the same defect, six times smaller. A defect
 * one-sixth of that size passes the first and fails the second. So the caller
 * does not get to supply bounds at all.
 *
 * ## Prior art in this repository
 *
 * The liver's caudate is a slab rather than the box it should be precisely
 * because bounding it sideways left unclaimed slivers behind segments II and
 * VII; the note on `caudateFront` in `liverAnatomy.js` records that. The lobes
 * of the lung once summed to 182% of the lung they were cut from, because a
 * fixed-point iteration for the surface crossing silently failed to converge
 * for an off-centre part.
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
 * How cleanly a set of parts covers the organ they were cut from, and whether
 * they add up to it.
 *
 * Rejection-samples the organ's interior — the *organ's*, not the parts' — and
 * asks each point how many parts claim it. The answer should be exactly one
 * every time. Then compares the summed part volumes against the uncut organ,
 * which sampling cannot see: a carve is a polyhedron inscribed in the surface,
 * so cutting one solid into several loses a little at every new facet.
 *
 * @param {object} options
 * @param {ReturnType<import('../src/scenes/shared/geometry/carve.js').radialField>} options.field
 *   the distance field the parts were cut out of, taken from a part so that the
 *   solid measured against is the one that was actually cut
 * @param {number} options.detail the detail the parts were carved at — the
 *   organ is carved at the same one, so any difference is the cuts and not the
 *   method
 * @param {(point: THREE.Vector3) => boolean} options.contains whether a point is in the organ
 * @param {Array<{ id: string, planes: Array<{normal: THREE.Vector3, constant: number}>,
 *   geometry: THREE.BufferGeometry }>} options.parts
 * @param {(geometry: THREE.BufferGeometry) => number} options.volumeOf
 * @param {number} [options.samples] interior points to evaluate, not points tried
 * @param {number} [options.seed]
 * @returns {{ samples: number, unassigned: number, multiple: number,
 *   unassignedRate: number, multipleRate: number, worst: string | null,
 *   wholeVolume: number, partVolume: number, shortfall: number }}
 */
export function partitionReport({ field, detail, contains, parts, volumeOf, samples = 50000, seed = 1 }) {
  const whole = carvePart({ field, centre: field.centre.clone(), planes: [], detail });
  whole.computeBoundingBox();
  // A margin, so that a defect touching the surface is sampled from both sides
  // rather than clipped by the box that is supposed to contain it.
  const bounds = whole.boundingBox.clone().expandByScalar(0.02);
  const wholeVolume = volumeOf(whole);
  whole.dispose();

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
    const where = `(${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)})`;
    if (claims === 0) {
      unassigned++;
      if (worst === null) worst = `no part claims ${where}`;
    } else if (claims > 1) {
      multiple++;
      if (worst === null) worst = `${claims} parts claim ${where}, one of them ${claimant}`;
    }
  }

  const partVolume = parts.reduce((total, part) => total + volumeOf(part.geometry), 0);

  return {
    samples: inside,
    unassigned,
    multiple,
    unassignedRate: inside === 0 ? 1 : unassigned / inside,
    multipleRate: inside === 0 ? 1 : multiple / inside,
    worst,
    wholeVolume,
    partVolume,
    /** How far short of the organ the parts fall, as a fraction. Positive is short. */
    shortfall: 1 - partVolume / wholeVolume,
  };
}
