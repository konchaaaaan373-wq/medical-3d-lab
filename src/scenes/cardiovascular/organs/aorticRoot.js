import * as THREE from 'three';

import { tissueMaterial } from '../../shared/materials.js';
import { AORTIC_SINUSES } from './coronaryAnatomy.js';

/**
 * The aortic root — the three sinuses of Valsalva and the stub above them.
 *
 * ## Why it is drawn at all
 *
 * `buildCoronaryArteries` takes a root as `{ centre, radius }` and puts each
 * ostium on it. Nothing drew that root, so in every render the two coronary
 * trunks began in mid-air above the ventricle: a reader could see where the
 * arteries went and not where they came from, and the scene's own subject is a
 * narrowing *in* one of those arteries. It also left the base of the heart as a
 * bare shoulder, which reads as a lid on a pot rather than as the plane a
 * ventricle has been cut at.
 *
 * ## Where the ostia are, and why they land on the wall
 *
 * `centre` is the **sinotubular junction** — the ring where the sinuses stop
 * bulging and the ascending aorta begins — because that is the level the ostia
 * are placed from. The sinuses swell *below* it and the wall is back at its
 * nominal radius by `BULGE_ENDS_AT`, so an ostium at `centre + direction ×
 * radius` sits on the drawn surface by construction rather than by a second
 * coordinate that agrees until someone edits one of them. Real coronary ostia
 * sit at or just below the sinotubular junction, so this is not a convenience:
 * it is where they are.
 *
 * The sinus directions are not written here. They belong to
 * `coronaryAnatomy.js`, which owns which way round the root each cusp sits, and
 * a root drawn from its own idea of that would put a bulge where no artery
 * leaves.
 */

/**
 * The root's proportions, in units of its own radius.
 *
 * A root described in scene units stops meaning anything the moment the heart
 * is drawn at another size; described in radii it keeps its shape.
 */
export const ROOT_PROPORTIONS = Object.freeze({
  /** Annulus to sinotubular junction. */
  height: 1.05,
  /** How far a sinus bulges past the nominal radius. */
  sinusBulge: 0.3,
  /** Where the bulge is widest: 0 at the annulus, 1 at the junction. */
  bulgeAt: 0.42,
  /**
   * Where the bulge has returned to nothing, below the junction. The wall is
   * cylindrical above this, which is what lets an ostium placed at the nominal
   * radius sit on it.
   */
  bulgeEndsAt: 0.86,
  /** How far the ascending aorta is stubbed in above the junction. */
  stub: 0.75,
  /** How far the annulus is drawn in from the nominal radius. */
  annulusTaper: 0.12,
});

/** Half-width of one sinus lobe, radians: three lobes meeting at the commissures. */
const SINUS_HALF_WIDTH = Math.PI / 3;

/** Smoothstep, 0 below `a` and 1 above `b`. */
function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The azimuth each sinus faces, in the transverse plane. */
function sinusAzimuths() {
  return AORTIC_SINUSES.map((sinus) => Math.atan2(sinus.direction[0], sinus.direction[2]));
}

/**
 * How far the wall stands proud of the nominal radius at this azimuth, 0..1.
 *
 * A raised cosine per sinus, taken as the maximum rather than the sum: summed,
 * the lobes overlap at the commissures and the root swells there too, which is
 * exactly where a real root is pinched in.
 */
function sinusLobe(phi, azimuths) {
  let most = 0;
  for (const centre of azimuths) {
    let d = Math.abs(phi - centre) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    if (d >= SINUS_HALF_WIDTH) continue;
    most = Math.max(most, 0.5 * (1 + Math.cos((d / SINUS_HALF_WIDTH) * Math.PI)));
  }
  return most;
}

/**
 * How much of the bulge is in force at height `u`, 0 at the annulus and 1 at
 * the junction.
 */
function bulgeProfile(u) {
  const P = ROOT_PROPORTIONS;
  if (u <= 0) return 0;
  if (u >= P.bulgeEndsAt) return 0;
  // Up to the widest point, then back to nothing by `bulgeEndsAt`.
  return u <= P.bulgeAt
    ? smooth(0, P.bulgeAt, u)
    : 1 - smooth(P.bulgeAt, P.bulgeEndsAt, u);
}

/**
 * Build the aortic root a set of coronary arteries leaves from.
 *
 * @param {object} options
 * @param {THREE.Vector3} options.centre the sinotubular junction
 * @param {number} options.radius the root's nominal radius, at that junction
 * @param {string} [options.color]
 * @param {number} [options.radial] azimuthal resolution
 * @param {number} [options.rings] resolution along the root's own axis
 */
export function buildAorticRoot({ centre, radius, color = '#c88f86', radial = 48, rings = 26 } = {}) {
  if (!centre || !(radius > 0)) {
    throw new TypeError('buildAorticRoot needs the junction it is built around and a radius');
  }
  const P = ROOT_PROPORTIONS;
  const azimuths = sinusAzimuths();

  // `v` runs 0 at the annulus to 1 at the top of the stub; the junction sits
  // where the sinuses end, so the stub is the last slice of it.
  const spanBelow = P.height;
  const spanAbove = P.stub;
  const total = spanBelow + spanAbove;

  const positions = new Float32Array((rings + 1) * (radial + 1) * 3);
  const uvs = new Float32Array((rings + 1) * (radial + 1) * 2);
  const indices = [];

  for (let i = 0; i <= rings; i++) {
    const v = i / rings;
    const heightInRadii = -spanBelow + v * total;
    // `u` along the sinus part only; above the junction there is no bulge.
    const u = (heightInRadii + spanBelow) / spanBelow;
    const swell = bulgeProfile(u);
    // The annulus is drawn slightly in, so the root sits into the valve plane
    // instead of ending on a flat rim the same width as the sinuses.
    const waist = 1 - P.annulusTaper * (1 - smooth(0, 0.22, u));
    for (let k = 0; k <= radial; k++) {
      const phi = (k / radial) * Math.PI * 2;
      const r = radius * waist * (1 + P.sinusBulge * swell * sinusLobe(phi, azimuths));
      const at = (i * (radial + 1) + k) * 3;
      positions[at] = centre.x + r * Math.sin(phi);
      positions[at + 1] = centre.y + heightInRadii * radius;
      positions[at + 2] = centre.z + r * Math.cos(phi);
      const uvAt = (i * (radial + 1) + k) * 2;
      uvs[uvAt] = k / radial;
      uvs[uvAt + 1] = v;
      if (i < rings && k < radial) {
        const a = i * (radial + 1) + k;
        const b = (i + 1) * (radial + 1) + k;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = tissueMaterial({ color, roughness: 0.6, emissiveIntensity: 0.02 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'aortic-root';

  const object = new THREE.Group();
  object.name = 'aortic-root-group';
  object.add(mesh);

  return {
    object,
    mesh,
    /**
     * The root's drawn radius at an azimuth and a height, in the root's own
     * frame — so a test can ask where the wall is rather than re-deriving it.
     *
     * @param {number} phi azimuth
     * @param {number} u 0 at the annulus, 1 at the sinotubular junction
     */
    radiusAt(phi, u) {
      const waist = 1 - P.annulusTaper * (1 - smooth(0, 0.22, u));
      return radius * waist * (1 + P.sinusBulge * bulgeProfile(u) * sinusLobe(phi, azimuths));
    },
    /** Where the annulus and the junction sit, for anything placing the root. */
    annulusY: centre.y - P.height * radius,
    junctionY: centre.y,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
