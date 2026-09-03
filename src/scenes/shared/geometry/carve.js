import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Cutting a solid organ into the parts anatomy names.
 *
 * An organ modelled as a warped sphere is **star-shaped** about a point inside
 * it: every direction from that point leaves the surface exactly once. That is
 * not a coincidence of the modelling, it is a property of a body built by
 * displacing a sphere, and it is worth stating because everything here depends
 * on it — the lung, the liver and the kidney all satisfy it, and a check for it
 * is exported so a caller can find out rather than assume.
 *
 * A star-shaped solid intersected with half-spaces is still star-shaped, so a
 * lobe — the lung on one side of a fissure — can be built by asking, for each
 * direction, which comes first: the organ's own surface, or the cut. That gives
 * lobes that are **separate closed meshes whose union is the organ**, rather
 * than grooves scratched into one surface, and it is what lets a lobe be
 * hidden, moved, coloured or measured on its own.
 *
 * The alternative — constructive solid geometry — would handle organs that are
 * not star-shaped, at the cost of a library, a great deal of numerical care,
 * and meshes whose topology nobody controls. This is a hundred lines and its
 * failure mode is visible: if the organ is not star-shaped, `starShaped()` says
 * so and says where.
 */

/**
 * The organ's surface as a radius per direction, from one interior point.
 *
 * Built as a longitude/latitude table rather than by ray-casting the mesh:
 * casting 1500 rays per part against the finished geometry took 80 ms a lobe
 * and would have put half a second into building one scene. This is one pass
 * over the vertices and a constant-time lookup afterwards.
 *
 * The grid has to be matched to the surface it is sampling. Against a lung
 * sampled at 17k vertices this default reproduces a ray-cast of the same
 * surface to a mean of 0.003 and a worst case of 0.10 in units where the organ
 * is 2.9 long — 0.09% and 3%, the worst of it at the cardiac notch, where the
 * surface turns fastest. Given a coarser reference it will smooth those
 * features away instead, so the caller passes a dense one.
 *
 * @param {THREE.BufferGeometry | ArrayLike<number>} source the whole organ, as
 *   geometry or as a flat xyz array. The array form exists because welding a
 *   dense reference mesh costs more than everything else here put together and
 *   the field has no use for the welding.
 * @param {THREE.Vector3} centre a point inside it
 * @param {{ rings?: number, sectors?: number }} [options]
 */
export function radialField(source, centre, { rings = 64, sectors = 128 } = {}) {
  const radius = new Float64Array(rings * sectors);
  const weight = new Float64Array(rings * sectors);
  const array = source?.attributes?.position?.array ?? source;
  const count = array.length / 3;
  const point = new THREE.Vector3();

  const index = (ring, sector) => ring * sectors + ((sector % sectors) + sectors) % sectors;

  for (let i = 0; i < count; i++) {
    point.set(array[i * 3], array[i * 3 + 1], array[i * 3 + 2]).sub(centre);
    const r = point.length();
    if (r === 0) continue;
    // Polar from +y so that the poles land on the organ's long axis, where the
    // surface is smoothest and the grid's crowding costs least.
    const theta = Math.acos(Math.min(1, Math.max(-1, point.y / r)));
    const phi = Math.atan2(point.z, point.x);
    // Scattered bilinearly into the four cells the vertex falls between — the
    // exact adjoint of the bilinear read below, so what is put in is what comes
    // back out. An earlier version splatted over a 3×3 neighbourhood with
    // distance weights, which is a blur: it rounded the cardiac notch and the
    // hilum off the surface and left a 14% error at the extremes.
    const ringF = (theta / Math.PI) * rings - 0.5;
    const sectorF = ((phi + Math.PI) / (Math.PI * 2)) * sectors - 0.5;
    const r0 = Math.floor(ringF);
    const s0 = Math.floor(sectorF);
    const tr = ringF - r0;
    const ts = sectorF - s0;
    for (const [dr, dsr] of [
      [0, 1 - tr],
      [1, tr],
    ]) {
      const ring = r0 + dr;
      if (ring < 0 || ring >= rings) continue;
      for (const [ds, dss] of [
        [0, 1 - ts],
        [1, ts],
      ]) {
        const w = dsr * dss;
        if (w <= 0) continue;
        const at = index(ring, s0 + ds);
        radius[at] += r * w;
        weight[at] += w;
      }
    }
  }

  // Any cell no vertex reached takes the mean of its ring, so a query never
  // returns zero and collapses a part to its centre.
  for (let ring = 0; ring < rings; ring++) {
    let sum = 0;
    let seen = 0;
    for (let sector = 0; sector < sectors; sector++) {
      const at = index(ring, sector);
      if (weight[at] > 0) {
        sum += radius[at] / weight[at];
        seen += 1;
      }
    }
    const fallback = seen > 0 ? sum / seen : 0;
    for (let sector = 0; sector < sectors; sector++) {
      const at = index(ring, sector);
      radius[at] = weight[at] > 0 ? radius[at] / weight[at] : fallback;
      weight[at] = 1;
    }
  }

  return {
    centre: centre.clone(),
    /**
     * How far the surface is in this direction, from the centre the field was
     * built about. `direction` need not be normalised.
     *
     * @param {THREE.Vector3} direction
     */
    radiusAt(direction) {
      const length = direction.length();
      if (length === 0) return 0;
      const theta = Math.acos(Math.min(1, Math.max(-1, direction.y / length)));
      const phi = Math.atan2(direction.z, direction.x);
      const ringF = (theta / Math.PI) * rings - 0.5;
      const sectorF = ((phi + Math.PI) / (Math.PI * 2)) * sectors - 0.5;
      const r0 = Math.floor(ringF);
      const s0 = Math.floor(sectorF);
      const tr = ringF - r0;
      const ts = sectorF - s0;
      const clampRing = (r) => Math.min(rings - 1, Math.max(0, r));
      // Bilinear, so a carved surface is as smooth as the organ is rather than
      // stepping from one grid cell to the next.
      const a = radius[index(clampRing(r0), s0)];
      const b = radius[index(clampRing(r0), s0 + 1)];
      const c = radius[index(clampRing(r0 + 1), s0)];
      const d = radius[index(clampRing(r0 + 1), s0 + 1)];
      return (a * (1 - ts) + b * ts) * (1 - tr) + (c * (1 - ts) + d * ts) * tr;
    },
  };
}

/**
 * The organ's surface as a point cloud, straight from its warp.
 *
 * A Fibonacci sphere rather than a subdivided icosahedron, and no geometry at
 * all: the radial field wants positions and nothing else, and building a mesh
 * to hand it — allocating the icosahedron, welding it, computing normals —
 * cost more than every other step of carving an organ put together. Welding a
 * 100k-vertex reference alone took 116 ms, for a table that never looks at
 * which vertices were shared.
 *
 * Deterministic, and uniform enough that the field's cells fill evenly.
 *
 * @param {(v: THREE.Vector3) => void} warp the organ's own warp, on the unit sphere
 * @param {[number, number, number]} scale
 * @param {number} [count]
 */
export function surfaceSamples(warp, scale, count = 24000) {
  const points = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * i) / (count - 1);
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = golden * i;
    v.set(Math.cos(angle) * ring, y, Math.sin(angle) * ring);
    warp(v);
    points[i * 3] = v.x * scale[0];
    points[i * 3 + 1] = v.y * scale[1];
    points[i * 3 + 2] = v.z * scale[2];
  }
  return points;
}

/**
 * Is this organ star-shaped about `centre`?
 *
 * Exported so that a builder can find out rather than assume, and so the answer
 * is a measurement in a test rather than a claim in a comment. Returns the
 * directions that leave the surface anything other than exactly once.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {THREE.Vector3} centre
 * @param {{ detail?: number }} [options]
 */
export function starShaped(geometry, centre, { detail = 4 } = {}) {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const probe = new THREE.IcosahedronGeometry(1, detail);
  const position = probe.attributes.position;
  const direction = new THREE.Vector3();
  const failures = [];
  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize();
    raycaster.set(centre, direction);
    const hits = raycaster.intersectObject(mesh, false);
    if (hits.length !== 1) failures.push({ direction: direction.clone(), hits: hits.length });
  }
  probe.dispose();
  return { ok: failures.length === 0, failures };
}

/**
 * A half-space to cut with: keep the side where `normal · p <= constant`.
 *
 * @param {THREE.Vector3} normal pointing towards the part being cut *away*
 * @param {number} constant
 */
export const cutPlane = (normal, constant) => ({ normal: normal.clone().normalize(), constant });

/**
 * A plane through a point, with a normal pointing at what to discard.
 *
 * The form anatomy is written in: a fissure is described by where it runs and
 * which way it faces, never by a scalar offset from an origin nobody names.
 *
 * @param {THREE.Vector3} through
 * @param {THREE.Vector3} normal
 */
export function planeThrough(through, normal) {
  const n = normal.clone().normalize();
  return { normal: n, constant: n.dot(through) };
}

/**
 * One part of the organ: the solid inside the surface and inside every plane.
 *
 * @param {{ field: ReturnType<typeof radialField>, centre: THREE.Vector3,
 *           planes?: {normal: THREE.Vector3, constant: number}[], detail?: number,
 *           inset?: number }} options
 *   `centre` must be inside the part — not merely inside the organ. `inset`
 *   pulls the cut faces back by a little so that two parts sharing a fissure do
 *   not z-fight along it.
 */
export function carvePart({ field, centre, planes = [], detail = 5, inset = 0 }) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const position = geometry.attributes.position;
  const direction = new THREE.Vector3();
  const probe = new THREE.Vector3();
  const offset = centre.clone().sub(field.centre);

  for (let i = 0; i < position.count; i++) {
    direction.fromBufferAttribute(position, i).normalize();

    // Where the organ's own surface is, along this ray from this part's centre.
    //
    // Bisected on "how far outside the surface is this point", which is
    // negative inside and positive outside. The field is anchored at the
    // organ's centre and this ray starts somewhere else, so the two do not
    // share a parameterisation and the crossing has to be searched for.
    //
    // A fixed-point iteration was tried first and is what an earlier version
    // shipped: three passes of solving a quadratic for the radius. It converges
    // when the part's centre is near the organ's and **silently does not** when
    // it is not, which is exactly the case a lobe is. The upper lobe came out at
    // twice its own volume and the five lobes summed to 182% of the lung they
    // were cut from. Bisection cannot do that; it is a few more field lookups
    // and the field lookup is a table read.
    const outside = (t) => {
      probe.copy(direction).multiplyScalar(t).add(offset);
      return probe.length() - field.radiusAt(probe);
    };
    let low = 0;
    let high = Math.max(1e-6, field.radiusAt(direction) + offset.length()) * 2;
    // The centre has to be inside for the bracket to be a bracket. `carveInside`
    // says whether it is, and the builders check rather than assume.
    for (let grow = 0; grow < 8 && outside(high) < 0; grow++) high *= 1.6;
    // Twenty-four halvings take the bracket to a millionth of the organ, which
    // is two orders finer than the field it is searching and therefore as far
    // as it is worth going.
    for (let step = 0; step < 24; step++) {
      const mid = (low + high) / 2;
      if (outside(mid) < 0) low = mid;
      else high = mid;
    }
    let t = (low + high) / 2;

    // And where each cut comes, if it comes first.
    for (const plane of planes) {
      const denominator = plane.normal.dot(direction);
      if (denominator <= 1e-9) continue; // this ray never reaches that plane
      const distance = (plane.constant - inset - plane.normal.dot(centre)) / denominator;
      if (distance > 0 && distance < t) t = distance;
    }

    position.setXYZ(i, centre.x + direction.x * t, centre.y + direction.y * t, centre.z + direction.z * t);
  }

  position.needsUpdate = true;
  // Welded before the normals are computed, so a cut face shades as one flat
  // face rather than as a fan of facets radiating from the part's centre.
  const welded = mergeVertices(geometry, 1e-4);
  welded.computeVertexNormals();
  welded.computeBoundingBox();
  welded.computeBoundingSphere();
  geometry.dispose();
  return welded;
}

/**
 * Is `point` inside the organ, and inside every one of these planes?
 *
 * The precondition every carve depends on: a part is built star-shaped about
 * its centre, so a centre outside its own part does not produce a smaller part,
 * it produces a different solid. The right middle lobe's hand-written centre
 * sat on the wrong side of its own horizontal fissure and the lobe came out
 * four times its size, so builders check this rather than trusting a literal.
 *
 * @param {THREE.Vector3} point
 * @param {{ field: ReturnType<typeof radialField>,
 *           planes?: {normal: THREE.Vector3, constant: number}[] }} options
 */
export function carveInside(point, { field, planes = [] }) {
  const direction = point.clone().sub(field.centre);
  if (direction.length() >= field.radiusAt(direction)) return false;
  return planes.every((plane) => plane.normal.dot(point) - plane.constant <= 0);
}

/**
 * The centroid of the part, found by sampling rather than written down.
 *
 * Deterministic — the sampler is seeded — so the same organ gives the same
 * centres on every reload. A centroid is always inside a part that is roughly
 * convex, and unlike a literal it moves when the fissure moves.
 *
 * @param {{ field: ReturnType<typeof radialField>, bounds: THREE.Box3,
 *           planes?: {normal: THREE.Vector3, constant: number}[],
 *           samples?: number, seed?: number }} options
 */
export function partCentroid({ field, bounds, planes = [], samples = 20000, seed = 1 }) {
  const min = bounds.min;
  const size = bounds.getSize(new THREE.Vector3());
  const point = new THREE.Vector3();
  const sum = new THREE.Vector3();
  let state = seed >>> 0;
  const random = () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
  let found = 0;
  for (let i = 0; i < samples; i++) {
    point.set(min.x + random() * size.x, min.y + random() * size.y, min.z + random() * size.z);
    if (!carveInside(point, { field, planes })) continue;
    sum.add(point);
    found += 1;
  }
  return found > 0 ? { centroid: sum.divideScalar(found), fraction: found / samples } : null;
}

/**
 * Which of `sites` a point belongs to — the territory model.
 *
 * A bronchopulmonary segment is not bounded by planes: it is *the lung a
 * segmental bronchus ventilates*. So the honest way to divide a lobe into
 * segments is to divide it by which segmental bronchus is nearest, which is
 * what this does. It is a model of the definition rather than a tracing of a
 * specimen, and the model card has to say so.
 *
 * @param {THREE.Vector3} point
 * @param {{ position: THREE.Vector3 }[]} sites
 */
export function nearestSite(point, sites) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < sites.length; i++) {
    const distance = point.distanceToSquared(sites[i].position);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
