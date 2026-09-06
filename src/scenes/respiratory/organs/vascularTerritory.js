import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';

/**
 * One parallel pulmonary vascular territory: a single branch from the hilum to
 * a regional site in the lung, with the places on it that a scene refers to
 * given anatomical names.
 *
 * This is **not** a segmental artery. `lungs.js` already carries the named
 * segmental arteries that accompany the bronchi; a territory here is one of
 * the equal parallel paths a network model reasons about, drawn so that a clot,
 * a flow marker and the ventilated bed it feeds can be pointed at. A scene that
 * uses these asks for `anchors.proximalOcclusionSite`, never for "24% along
 * the curve" — the fraction is stated once, here, with its reason.
 */

/**
 * Where an embolus is drawn on a branch, as a fraction of its length from the
 * hilum. Just past the first quarter: proximal enough to read as a branch clot
 * rather than a peripheral one, distal enough to sit clear of the hilum where
 * twelve branches converge and nothing individual can be seen.
 */
export const PROXIMAL_OCCLUSION_SITE = 0.24;

/**
 * @param {{
 *   hilum: import('three').Vector3,
 *   target: import('three').Vector3,
 *   bow?: { z?: number, y?: number },
 *   radius?: (u: number) => number,
 *   steps?: number,
 *   radial?: number,
 * }} options
 */
export function buildVascularTerritory({
  hilum,
  target,
  bow = { z: 0.12, y: 0 },
  radius = (u) => 0.064 - 0.026 * u,
  steps = 28,
  radial = 9,
}) {
  // A gentle bow between the hilum and the bed keeps twelve branches from
  // lying in one plane and reading as spokes.
  const middle = hilum.clone().lerp(target, 0.55);
  middle.z += bow.z ?? 0;
  middle.y += bow.y ?? 0;
  const curve = smoothCurve([
    [hilum.x, hilum.y, hilum.z],
    [middle.x, middle.y, middle.z],
    [target.x, target.y, target.z],
  ]);
  const surface = new TubeSurface(curve, { radius, steps, radial });

  return {
    curve,
    surface,
    geometry: surface.geometry,
    anchors: {
      /** The hilar origin of the branch. */
      origin: surface.pointAt(0),
      /** Where a branch embolus is drawn. */
      proximalOcclusionSite: surface.pointAt(PROXIMAL_OCCLUSION_SITE),
      /** The regional bed this branch perfuses. */
      distalBed: surface.pointAt(1),
    },
    /** A point along the branch for a moving marker, `0` at the hilum. */
    pointAt: (u) => surface.pointAt(u),
    dispose: () => surface.dispose(),
  };
}
