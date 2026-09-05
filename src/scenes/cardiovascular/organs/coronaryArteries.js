import * as THREE from 'three';

import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';
import {
  CORONARY_BRANCHES,
  CORONARY_SINUSES,
  GROOVES,
  OSTIUM_OF,
  territoryWeightsAt,
} from './coronaryAnatomy.js';

/**
 * The coronary arteries, laid on a ventricle the caller supplies.
 *
 * ## Why this takes a surface instead of importing one
 *
 * `docs/anatomy-specs.md` §2 A3-a settles it: the organ layer owns coronary
 * anatomy, and the dependency runs scene → organ. So this builder is handed
 * `surfacePoint`, the epicardium of whatever heart is being drawn, and asks it
 * where the surface is. It does not import the ventricle geometry, does not
 * import a scene, and — the part that actually matters — has **no second
 * opinion about where the epicardium is**.
 *
 * That inversion is not ceremony. A vessel placed by its own idea of the
 * surface sinks into muscle at one point of the beat and floats off it at
 * another, and it does so silently: the picture still shows a heart with
 * arteries on it. The lung learned the same lesson the expensive way, when
 * twenty-one airway and vessel endpoints were sitting outside the pleura
 * because positions were multiplied by bounding-box extents instead of being
 * projected onto the surface.
 *
 * ## Where a vessel sits relative to the surface
 *
 * Epicardial arteries lie *on* the heart, in fat, not inside it. Each vessel's
 * centreline is lifted off the surface by its own radius, so the tube's near
 * wall grazes the epicardium and the whole vessel stands proud of it. That is
 * what `LIFT_IN_RADII` is, and the tests measure it: nothing sunk below the
 * surface, nothing floating, nothing crossing a chamber.
 */

/**
 * How far a vessel's centreline sits off the epicardium, in vessel radii.
 *
 * One radius puts the tube tangent to the surface. A little more leaves it
 * sitting in the epicardial fat the way a real artery does, and keeps the tube
 * from z-fighting with the myocardium it lies on — which is a rendering
 * problem, not an anatomical claim, and is why the excess is small and named.
 */
const LIFT_IN_RADII = 1.1;

/** Below this `t`, the lift fades to nothing so a vessel tip stays on the tip. */
const APICAL_LIFT_FADE_T = 0.13;

/**
 * How much of its proximal calibre a vessel keeps at its far end.
 *
 * Coronary arteries taper: the left anterior descending at the apex is a
 * fraction of the vessel that left the left main. Drawn at constant calibre the
 * tree reads as plumbing rather than as a circulation, and — the reason it is
 * here rather than in a material — every relation the spec measures is stated
 * in units of *the local* radius, so a vessel that does not taper would be
 * measured against the wrong yardstick along its whole length.
 */
const DISTAL_TAPER = 0.55;

/** A vessel's radius at a fraction `u` along its own centreline. */
export function radiusAlong(branch, u) {
  return branch.radius * (1 - (1 - DISTAL_TAPER) * Math.min(Math.max(u, 0), 1));
}

/**
 * How many points each vessel's centreline is sampled at before smoothing.
 *
 * Dense enough that the spline through them does not bulge off the surface
 * between samples. The circumflex sweeps most of the way round the base, and at
 * 26 samples the Catmull-Rom between them stood a third of a radius further out
 * mid-span than the samples themselves did — which is a vessel drifting off the
 * heart in the gaps, invisible at every point that was measured.
 */
const CENTRELINE_SAMPLES = 44;

/**
 * The outward normal of the epicardium at a point, by finite difference.
 *
 * Derived from the surface the caller gave rather than assumed radial: the
 * ventricle's apex drifts laterally and its long axis bows, so "away from the
 * axis" and "out of the surface" are not the same direction, and near the apex
 * they differ enough to bury a vessel.
 */
const scratch = {
  here: new THREE.Vector3(),
  alongT: new THREE.Vector3(),
  alongPhi: new THREE.Vector3(),
  outward: new THREE.Vector3(),
};

function surfaceNormal(surfacePoint, shape, t, phi, out) {
  const eps = 1e-3;
  // Reused rather than allocated: the arteries are relaid on the wall every
  // frame, and three vectors per sample per vessel is a few thousand short-
  // lived objects a second for nothing.
  const here = surfacePoint(shape, t, phi, scratch.here);
  const alongT = surfacePoint(shape, Math.min(t + eps, 1), phi, scratch.alongT).sub(here);
  const alongPhi = surfacePoint(shape, t, phi + eps, scratch.alongPhi).sub(here);
  out.copy(alongPhi).cross(alongT);
  // Near the apex the surface's radius goes to zero and the two tangents become
  // parallel, so their cross product is noise rather than a direction. Fall
  // back to the radial direction there instead of normalising a vector that
  // means nothing — the alternative is a vessel laid along a random direction
  // for its last few samples, which reads as a kink in the picture and as
  // "sunk into myocardium" in a measurement.
  if (out.lengthSq() < 1e-12) {
    out.set(here.x, 0, here.z);
    if (out.lengthSq() < 1e-12) out.set(0, -1, 0);
  }
  out.normalize();
  // The cross product's sign depends on the winding of the two tangents, which
  // is a property of the caller's surface rather than something this file gets
  // to assume. Point it away from the long axis and let that settle it.
  const outward = scratch.outward.set(here.x, 0, here.z);
  if (outward.lengthSq() > 1e-9 && out.dot(outward.normalize()) < 0) out.negate();
  return out;
}

/**
 * The centreline of one vessel, as points on (and lifted off) the epicardium.
 *
 * An interventricular groove is a run down the long axis at fixed azimuth; an
 * atrioventricular groove is a run around the base at fixed height. Both are
 * declared in `coronaryAnatomy.js` and neither is written here, so a vessel
 * cannot end up in a groove nothing named.
 */
function centrelineFor(branch, { surfacePoint, shape, displace }, where = []) {
  const groove = GROOVES[branch.groove];
  if (!groove) throw new Error(`Branch "${branch.id}" names no groove`);

  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const points = [];

  for (let i = 0; i < CENTRELINE_SAMPLES; i++) {
    const u = i / (CENTRELINE_SAMPLES - 1);
    const t = groove.t !== undefined ? groove.t : groove.from + (groove.to - groove.from) * u;
    const phi =
      groove.phi !== undefined
        ? groove.phi
        : groove.phiFrom + (groove.phiTo - groove.phiFrom) * u;
    // The lift tapers with the vessel. Held at the proximal calibre instead, a
    // vessel that narrows to 55% of itself ends up standing 2.4 of its own
    // radii off the surface at its far end while sitting 1.35 off it at the
    // near end — the same absolute gap, and a distal half that looks detached.
    //
    // It also fades to nothing at the apex. Down there the outward normal has
    // turned to point along the axis rather than away from it, so the same lift
    // carries the tube *past* the tip instead of off the surface: in a render
    // the two descending arteries ended in mid-air below the heart, while every
    // measurement of them said they were sitting correctly on the epicardium a
    // radius and a bit out. The falloff is presentation, and it is named as
    // such — nothing anatomical says a coronary artery thins into the wall.
    const apical = Math.min(1, Math.max(0, (t - APICAL_LIFT_FADE_T) / APICAL_LIFT_FADE_T));
    const lift = radiusAlong(branch, u) * LIFT_IN_RADII * apical;
    // Where on the ventricle this sample sits, carried rather than searched
    // for later. A test that has to invert the surface to find out is measuring
    // its own search as much as the vessel — and near the apex, where the mesh
    // rows are furthest apart, the search's error is larger than the vessel.
    //
    // Reused across relays rather than rebuilt. `u`, `t` and `phi` are fixed by
    // the groove and the sample count, so only the lift can change — and the
    // territory weights, which are anatomy and so belong to this layer, are
    // then computed once for the life of the vessel instead of once a frame.
    let here = where[i];
    if (here) here.lift = lift;
    else where.push((here = { u, t, phi, lift, weights: territoryWeightsAt(t, phi) }));

    surfacePoint(shape, t, phi, point);
    surfaceNormal(surfacePoint, shape, t, phi, normal);
    point.addScaledVector(normal, lift);
    // The caller may move the sample once it is placed — that is how a scene
    // whose wall does not move uniformly (a hypokinetic segment, say) keeps the
    // artery over that segment moving with it. The organ layer stays out of
    // *why* it moves: it hands over where on the ventricle the sample sits and
    // takes back a point.
    if (displace) displace(point, here);
    points.push(point.clone());
  }
  return points;
}

/**
 * Where a coronary ostium sits on the aortic root.
 *
 * The direction belongs to the sinus and the radius belongs to the aorta, so
 * neither is written here. Typed as a coordinate instead, an ostium drifts off
 * its own sinus the moment the root moves — which is the mistake the middle
 * hepatic vein made against Cantlie's line, recorded in `liverAnatomy.js`.
 */
function ostiumPoint(sinus, root) {
  const direction = new THREE.Vector3(...sinus.direction).normalize();
  return new THREE.Vector3().copy(root.centre).addScaledVector(direction, root.radius);
}

/**
 * Build the coronary arteries for one heart.
 *
 * @param {object} options
 * @param {(shape: object, t: number, phi: number, out: THREE.Vector3) => THREE.Vector3}
 *   options.surfacePoint the epicardium, supplied by the caller
 * @param {{ outerRadius: number, outerSemiLength: number, baseY: number }} options.shape
 * @param {{ centre: THREE.Vector3, radius: number }} options.root the aortic root
 * @param {string} [options.color]
 * @param {number} [options.radial] tube cross-section resolution
 */
export function buildCoronaryArteries({
  surfacePoint,
  shape,
  root,
  color = '#c0424b',
  radial = 10,
} = {}) {
  if (typeof surfacePoint !== 'function') {
    throw new TypeError('buildCoronaryArteries needs the epicardial surface it is drawing on');
  }
  if (!root?.centre || !(root.radius > 0)) {
    throw new TypeError('buildCoronaryArteries needs the aortic root its vessels start from');
  }

  const object = new THREE.Group();
  object.name = 'coronary-arteries';
  const disposables = [];
  const branches = [];
  const byId = new Map();

  /**
   * The control points of one vessel, on the epicardium as it is right now.
   *
   * Shared by the first build and by every `layOn` after it, because a vessel
   * relaid by different code from the one that placed it is a vessel that
   * drifts off the heart the moment the heart moves — which is the failure this
   * whole file is written against.
   */
  const controlPointsFor = (branch, context, where) => {
    let points;
    if (branch.ostium) {
      // A trunk: it starts at its own sinus and reaches the groove it runs in.
      const start = ostiumPoint(CORONARY_SINUSES[OSTIUM_OF[branch.id === 'rca' ? 'rca' : 'leftMain']], context.root);
      points = branch.groove ? [start, ...centrelineFor(branch, context, where)] : [start];
      if (!branch.groove) {
        // The left main is a short trunk with no groove of its own. It ends
        // where its two branches begin, which is where the anterior
        // interventricular groove starts — derived, not typed, so the trunk
        // and its branches cannot come apart.
        const lad = CORONARY_BRANCHES.find((b) => b.id === 'lad');
        const [first] = centrelineFor(lad, context);
        points = [start, start.clone().lerp(first, 0.55), first];
      }
    } else {
      const parent = byId.get(branch.parent);
      if (!parent) throw new Error(`Branch "${branch.id}" names a parent that is not built yet`);
      const own = centrelineFor(branch, context, where);
      // Joined to the parent's nearest point rather than to its end, because
      // the posterior descending leaves the right coronary at the crux, which
      // is where the right atrioventricular groove turns down — a place along
      // the parent, not its tip.
      let nearest = parent.points[0];
      let best = Infinity;
      for (const candidate of parent.points) {
        const d = candidate.distanceTo(own[0]);
        if (d < best) {
          best = d;
          nearest = candidate;
        }
      }
      points = [nearest, ...own];
    }
    return points;
  };

  for (const branch of CORONARY_BRANCHES) {
    const where = [];
    const points = controlPointsFor(branch, { surfacePoint, shape, root }, where);

    const curve = smoothCurve(points.map((p) => [p.x, p.y, p.z]));
    // The arc-length table is rebuilt every time the vessel is relaid on a
    // moving wall, and Three's default of 200 divisions is more than a
    // 44-point spline sampled at 48 steps can use. 64 is worth about 6% of the
    // relay — small, but it is 200 curve evaluations per vessel per frame that
    // buy nothing.
    curve.arcLengthDivisions = 64;
    const surface = new TubeSurface(curve, {
      radius: (u) => radiusAlong(branch, u),
      steps: 48,
      radial,
    });
    const material = tissueMaterial({ color, roughness: 0.45, emissiveIntensity: 0.04 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = branch.id;
    object.add(mesh);

    const record = {
      ...branch,
      mesh,
      material,
      curve,
      points,
      surface,
      /**
       * Where each centreline sample sits on the ventricle, and how far it was
       * lifted off it. Carried so anything checking this vessel against the
       * drawn mesh can look at the same place rather than searching for it.
       */
      where,
      /** This vessel's calibre a fraction `u` along itself. */
      radiusAt: (u) => radiusAlong(branch, u),
    };
    branches.push(record);
    byId.set(branch.id, record);
    disposables.push(surface.geometry, material);
  }

  return {
    object,
    /**
     * Lay the arteries back down on the wall, wherever the wall is now.
     *
     * Built once and left alone, these vessels sit where the *end-diastolic*
     * epicardium was. Measured against the mesh that is actually drawn, the
     * furthest an artery stood off the wall went from 0.35 scene units at end
     * diastole to 0.64 at mid-systole — at the apex, where the vessels are
     * thinnest — and in a render the two descending arteries left the
     * silhouette and hung in space below the heart. A beating ventricle moves
     * away from anything that does not beat with it.
     *
     * `displace` is the caller's chance to move each sample after it is placed
     * on the surface; the scene uses it to hold an artery back over myocardium
     * that is not contracting, so a vessel travels as far as the wall under it
     * and no further.
     *
     * @param {object} shape the epicardium as it is now
     * @param {{ displace?: (point: THREE.Vector3,
     *   where: { u: number, t: number, phi: number, lift: number }) => void }} [options]
     */
    layOn(shape, { displace } = {}) {
      for (const record of branches) {
        const points = controlPointsFor(record, { surfacePoint, shape, root, displace }, record.where);
        record.points = points;
        if (record.curve.points.length !== points.length) {
          record.curve.points = points.map((p) => p.clone());
        } else {
          for (let i = 0; i < points.length; i++) record.curve.points[i].copy(points[i]);
        }
        record.curve.updateArcLengths();
        record.surface.resample();
      }
    },
    /** Five named epicardial arteries. */
    branches,
    branchById: (id) => byId.get(id) ?? null,
    /** Where each artery leaves the aorta, for a test or a label to check. */
    ostiumOf: (id) => {
      const branch = byId.get(id);
      if (!branch?.ostium) return null;
      return ostiumPoint(CORONARY_SINUSES[branch.ostium], root);
    },
    /** @param {string} id @param {boolean} visible */
    setBranchVisible(id, visible) {
      const branch = byId.get(id);
      if (branch) branch.mesh.visible = visible;
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
