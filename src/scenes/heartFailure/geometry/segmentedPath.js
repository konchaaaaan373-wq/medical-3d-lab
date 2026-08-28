import * as THREE from 'three';
import { clamp, lerp } from '../../../utils/math.js';

/**
 * A curve that knows what its parts are called.
 *
 * The problem this solves is specific and has bitten this scene twice. A
 * vessel is one long curve, and everything that attaches to it — a swelling in
 * the geometry, a particle destination, a label anchor, a camera target — used
 * to say *where* by quoting a fraction of the curve's arc length. Those
 * fractions are silent: extend the aorta past the arch and `t = 0.11` stops
 * meaning "the sinuses of Valsalva" and starts meaning "somewhere in the
 * mid-ascending aorta", with nothing to fail and nothing to notice.
 *
 * So a path is built from *named segments*, and anything attached to it is
 * placed by naming an anatomical landmark or a fraction along one segment.
 * Arc-length coordinates still exist — a curve has to be sampled somehow — but
 * they are computed here, from the shape, every time the shape is built. Change
 * the control points and the landmarks move with the anatomy.
 *
 * This is not heart-specific: any organ built along a vessel or a tract can use
 * it. See the Semantic Geometry rule in CLAUDE.md.
 *
 * @typedef {object} PathLandmark
 * @property {THREE.Vector3} position where it is, in scene units
 * @property {THREE.Vector3} tangent unit vector along the path there
 * @property {string} segment which segment it belongs to
 * @property {number} localU 0..1 along that segment
 * @property {number} pathT 0..1 along the whole path, by arc length. Internal
 *   detail: it exists so the geometry builder can sample the curve, and is not
 *   how consumers should refer to a place.
 *
 * @typedef {object} PathSegment
 * @property {string} id
 * @property {number} startT 0..1 along the whole path, by arc length
 * @property {number} endT
 * @property {(u: number) => number} localToPathT
 * @property {(pathT: number) => number} pathTToLocal
 * @property {(pathT: number) => boolean} contains
 */

/**
 * @param {{id: string, points: THREE.Vector3[]}[]} segments in order along the
 *   path. Each segment repeats the previous segment's last point as its own
 *   first point, so the boundary between two named parts is stated once and
 *   belongs to both of them.
 * @param {Record<string, {segment: string, u: number}>} landmarkSpecs named
 *   places, each given as a fraction along the segment it belongs to. A
 *   substructure is described in its own local coordinates: the sinuses of
 *   Valsalva sit a third of the way along the aortic root, and that stays true
 *   however long the arch becomes.
 */
export function buildSegmentedPath(segments, landmarkSpecs = {}) {
  const points = [];
  /** Index into `points` of each segment's first and last control point. */
  const bounds = [];
  for (const segment of segments) {
    const first = points.length === 0 ? 0 : points.length - 1;
    for (let i = 0; i < segment.points.length; i++) {
      // The shared boundary point is listed by both segments; keep one copy.
      if (points.length > 0 && i === 0) continue;
      points.push(segment.points[i]);
    }
    bounds.push({ id: segment.id, first, last: points.length - 1 });
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const arcAt = arcLengthMapper(curve, points.length);

  /** @type {Record<string, PathSegment>} */
  const byId = {};
  const ordered = bounds.map(({ id, first, last }) => {
    const startT = arcAt(first);
    const endT = arcAt(last);
    const span = endT - startT;
    const segment = {
      id,
      startT,
      endT,
      localToPathT: (u) => startT + clamp(u, 0, 1) * span,
      pathTToLocal: (pathT) => (span === 0 ? 0 : clamp((pathT - startT) / span, 0, 1)),
      contains: (pathT) => pathT >= startT - 1e-6 && pathT <= endT + 1e-6,
    };
    byId[id] = segment;
    return segment;
  });

  /** @type {Record<string, PathLandmark>} */
  const landmarks = {};
  for (const [name, spec] of Object.entries(landmarkSpecs)) {
    const segment = byId[spec.segment];
    if (!segment) throw new Error(`Landmark "${name}" names unknown segment "${spec.segment}"`);
    const pathT = segment.localToPathT(spec.u);
    landmarks[name] = {
      position: curve.getPointAt(pathT),
      tangent: curve.getTangentAt(pathT),
      segment: spec.segment,
      localU: spec.u,
      pathT,
    };
  }

  return {
    curve,
    segments: byId,
    orderedSegments: ordered,
    landmarks,

    /** Which named part of the path a given arc-length coordinate falls in. */
    segmentAt(pathT) {
      for (const segment of ordered) if (segment.contains(pathT)) return segment.id;
      return ordered[ordered.length - 1].id;
    },

    /**
     * The arc-length range covering a run of consecutive named segments —
     * "the root through the arch" rather than "0.16 to 0.44".
     *
     * @param {string} fromId
     * @param {string} toId
     */
    span(fromId, toId) {
      const from = byId[fromId];
      const to = byId[toId];
      if (!from || !to) throw new Error(`span(): unknown segment ${fromId} or ${toId}`);
      return { startT: from.startT, endT: to.endT };
    },
  };
}

/**
 * Maps a control point's index to its position along the curve by arc length.
 *
 * CatmullRomCurve3 places control point `i` of `n` at parametric `i / (n - 1)`,
 * and `getLengths()` gives cumulative arc length sampled uniformly in the same
 * parametric coordinate — so this is a table lookup, not an approximation of
 * the shape.
 */
function arcLengthMapper(curve, pointCount) {
  const lengths = curve.getLengths(curve.arcLengthDivisions);
  const total = lengths[lengths.length - 1];
  return (index) => {
    if (total === 0) return 0;
    const parametric = pointCount > 1 ? index / (pointCount - 1) : 0;
    const scaled = parametric * (lengths.length - 1);
    const low = Math.floor(scaled);
    const high = Math.min(low + 1, lengths.length - 1);
    return lerp(lengths[low], lengths[high], scaled - low) / total;
  };
}
