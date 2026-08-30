import * as THREE from 'three';
import { bump, flattenSide, ripple, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * The lungs, as reusable geometry.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The silhouette is deliberately built
 * from the features that make a lung recognisable rather than from a scan:
 * a narrow apex, a wide concave base, a flattened mediastinal surface with a
 * hilum, the cardiac notch on the left, and the fissures. Lobe volumes,
 * fissure planes and hilar structures are not accurate.
 *
 * This file knows nothing about breathing, asthma or oedema — a disease scene
 * builds the same lungs and changes what it does with them. That is the whole
 * reason the organ and the scene are separate files.
 */

/**
 * @param {{ medial?: 1|-1, cardiacNotch?: boolean, fissures?: {ny:number, nz:number, offset:number}[] }} options
 * @returns {(v: THREE.Vector3) => void}
 */
function lungWarp({ medial = 1, cardiacNotch = false, fissures = [] }) {
  return (v) => {
    const seedX = v.x;
    const seedY = v.y;
    const seedZ = v.z;

    // Apex narrows to a rounded point; the lower half spreads instead, so the
    // lung ends in a broad base rather than in a second point.
    const taper = 1 - 0.62 * Math.pow(Math.max(0, seedY), 1.5) + 0.26 * Math.pow(Math.max(0, -seedY), 1.4);
    v.x *= taper;
    v.z *= taper;

    // Diaphragmatic surface: scooped upwards in the middle, not a round bottom.
    // Deep enough that the sweep of the lower border shows in a frontal
    // silhouette — the concavity itself faces the floor and is never seen.
    const low = smoothstep(-0.35, -1, seedY);
    const rho = Math.min(1, Math.hypot(v.x, v.z));
    v.y += 0.62 * low * (1 - rho * rho * 0.85);

    // Mediastinal surface: flat where the lung meets the middle of the chest.
    flattenSide(v, { sign: medial, edge: 0.3, strength: 0.55 });

    // Hilum: where the bronchus and vessels enter, pressed into that flat face.
    if (v.x * medial < 0) {
      v.x += medial * 0.24 * bump(seedY, seedZ, { atY: 0.08, atZ: -0.18, spreadY: 0.3, spreadZ: 0.36 });
    }

    // Cardiac notch: the left lung gives way to the heart, anteriorly and low.
    if (cardiacNotch && v.x * medial < 0.15) {
      v.x += medial * 0.58 * bump(seedY, seedZ, { atY: -0.3, atZ: 0.52, spreadY: 0.46, spreadZ: 0.46 });
    }

    // Fissures: shallow grooves, so the lobes read as lobes.
    for (const fissure of fissures) {
      const d = seedY * fissure.ny + seedZ * fissure.nz - fissure.offset;
      v.multiplyScalar(1 - 0.1 * Math.exp(-(d * d) / 0.005));
    }

    // Enough surface irregularity that it does not look injection-moulded.
    v.multiplyScalar(1 + 0.018 * ripple(seedX, seedY, seedZ, 3.1, 1.4));
  };
}

/**
 * Where the sample regions sit inside one lung, in the lung mesh's own
 * coordinates (the unit sphere the warp is applied to, so ±1 in each axis).
 *
 * Six per lung, spread through the height and the depth. A scene with a
 * multi-compartment lung model needs somewhere to *put* those compartments,
 * and where a point is inside a lung is the organ's business — a scene that
 * typed these coordinates itself would be re-deriving the shape of the lung
 * from the outside and would drift the moment the shape changed.
 */
const REGION_SITES = [
  [0.0, 0.62, 0.1],
  [0.34, 0.2, 0.3],
  [-0.3, 0.16, -0.28],
  [0.18, -0.26, -0.1],
  [-0.24, -0.5, 0.24],
  [0.1, -0.78, -0.06],
];

/**
 * Both lungs, side by side, with the inflation state exposed.
 *
 * `excursion` scales how much the drawn shape changes between `setInflation(0)`
 * and `setInflation(1)`. The default is sized for a tidal breath and is already
 * larger than life; a scene whose axis runs from residual volume to total lung
 * capacity needs much more of it, and says so rather than quietly redefining
 * what the default means.
 *
 * @param {{ color?: string, detail?: number, opacity?: number, excursion?: number }} [options]
 */
export function buildLungs({ color = '#d98d95', detail = 9, opacity = 1, excursion = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'lungs';

  const material = tissueMaterial({ color, roughness: 0.62, emissiveIntensity: 0.06, opacity });

  // Screen left is the patient's right, as in every frontal projection.
  const right = new THREE.Mesh(
    shapedSphere({
      detail,
      scale: [0.92, 1.85, 1.0],
      warp: lungWarp({
        medial: -1,
        fissures: [
          { ny: 0.82, nz: 0.57, offset: 0.12 }, // oblique
          { ny: 0.98, nz: 0.2, offset: 0.34 }, // horizontal: three lobes on the right
        ],
      }),
    }),
    material
  );
  right.name = 'right-lung';
  // Close to the midline and high enough that the apices are above the carina:
  // set wider or lower, the bronchi appear to stop in mid-air beside the lungs
  // instead of entering them.
  right.position.set(-1.24, 0.3, 0);

  const left = new THREE.Mesh(
    shapedSphere({
      detail,
      scale: [0.86, 1.9, 0.98],
      warp: lungWarp({ medial: 1, cardiacNotch: true, fissures: [{ ny: 0.82, nz: 0.57, offset: 0.1 }] }),
    }),
    material
  );
  left.name = 'left-lung';
  left.position.set(1.24, 0.3, 0);

  object.add(right, left);

  const rest = { right: right.position.clone(), left: left.position.clone() };
  // Measured once from the finished geometry rather than guessed: whatever the
  // warp did to the base of the lung, this is where it actually ends, and
  // anything that has to sit under the lungs needs the real number.
  right.geometry.computeBoundingBox();
  const baseOfGeometry = right.geometry.boundingBox.min.y;
  let lowestPoint = rest.right.y + baseOfGeometry;

  // Mounts for a scene that models the lung as several regions. Parented to
  // the lung meshes, so they travel with the inflation instead of having to be
  // moved in step with it by whoever hung something on them.
  const regions = [];
  for (const [side, mesh, scale] of [
    ['right', right, [0.92, 1.85, 1.0]],
    ['left', left, [0.86, 1.9, 0.98]],
  ]) {
    REGION_SITES.forEach(([x, y, z], index) => {
      const mount = new THREE.Group();
      mount.name = `region-${side}-${index}`;
      // The warp is applied to the sphere before the scale, so a point at the
      // same normalised coordinate lands inside the finished lung once the
      // scale is applied. Kept well inside: these are regions of lung, not
      // points on its surface.
      mount.position.set(x * scale[0] * 0.72, y * scale[1] * 0.72, z * scale[2] * 0.72);
      mesh.add(mount);
      regions.push({ side, index, object: mount });
    });
  }

  return {
    object,
    material,
    /** Twelve mounts inside the two lungs, right lung first. */
    regions,
    anchors: {
      rightLung: new THREE.Vector3(-1.95, 0.9, 0.7),
      leftLung: new THREE.Vector3(1.95, 0.9, 0.7),
      base: new THREE.Vector3(0, -1.5, 0.9),
      hilum: new THREE.Vector3(-0.62, 0.45, -0.2),
    },
    /**
     * Inflation, 0 at the shape the lung was modelled at and 1 at the top of
     * the modelled breath. Values below 0 are allowed, down to −0.4, so that a
     * scene whose axis includes volumes *below* an ordinary resting one can
     * draw a lung that is smaller than the one built here rather than clamping
     * every such volume to the same picture.
     *
     * The lungs expand outwards and, mostly, downwards — the base moves further
     * than the apex, which is the visible half of what the diaphragm does. The
     * diaphragm itself is not drawn, and this is a shape change, not a volume
     * measurement.
     */
    /** How low the lung bases currently reach, for whatever sits under them. */
    baseY: () => lowestPoint,
    setInflation(value) {
      const v = Math.max(-0.4, Math.min(1, value));
      // Larger than life. At a true tidal excursion the lungs barely move on
      // screen and the scene reads as a still picture of two lungs; the shape
      // change is exaggerated so that inspiration and expiration are legible,
      // which is the whole subject. It is a presentation value, and no volume
      // is being claimed.
      const sx = 1 + 0.07 * excursion * v;
      const sy = 1 + 0.13 * excursion * v;
      const sz = 1 + 0.09 * excursion * v;
      for (const [mesh, home] of [
        [right, rest.right],
        [left, rest.left],
      ]) {
        mesh.scale.set(sx, sy, sz);
        // Anchored at the apex: the top of the lung is held by the airway and
        // barely moves, so the growth has to go downwards.
        mesh.position.set(home.x, home.y - 0.24 * excursion * v, home.z);
        // The regions ride the lung, so undo the anisotropic squash for
        // anything mounted on them — a marker should not become an ellipse
        // because the lung it sits in got taller.
        for (const region of regions) region.object.scale.set(1 / sx, 1 / sy, 1 / sz);
      }
      // Where the bases have got to, in the group's coordinates. The diaphragm
      // sits under them and has to arrive at the same place.
      lowestPoint = rest.right.y - 0.24 * excursion * v + baseOfGeometry * sy;
    },
  };
}
