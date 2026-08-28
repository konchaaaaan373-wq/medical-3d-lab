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
    const low = smoothstep(-0.4, -1, seedY);
    const rho = Math.min(1, Math.hypot(v.x, v.z));
    v.y += 0.46 * low * (1 - rho * rho);

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
 * Both lungs, side by side, with the inflation state exposed.
 *
 * @param {{ color?: string, detail?: number, opacity?: number }} [options]
 */
export function buildLungs({ color = '#d98d95', detail = 9, opacity = 1 } = {}) {
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

  return {
    object,
    material,
    anchors: {
      rightLung: new THREE.Vector3(-1.95, 0.9, 0.7),
      leftLung: new THREE.Vector3(1.95, 0.9, 0.7),
      base: new THREE.Vector3(0, -1.5, 0.9),
      hilum: new THREE.Vector3(-0.62, 0.45, -0.2),
    },
    /**
     * Inflation, 0 at end-expiration and 1 at the top of the modelled breath.
     *
     * The lungs expand outwards and, mostly, downwards — the base moves further
     * than the apex, which is the visible half of what the diaphragm does. The
     * diaphragm itself is not drawn, and this is a shape change, not a volume
     * measurement.
     */
    setInflation(value) {
      const v = Math.max(0, Math.min(1, value));
      // Larger than life. At a true tidal excursion the lungs barely move on
      // screen and the scene reads as a still picture of two lungs; the shape
      // change is exaggerated so that inspiration and expiration are legible,
      // which is the whole subject. It is a presentation value, and no volume
      // is being claimed.
      const sx = 1 + 0.07 * v;
      const sy = 1 + 0.13 * v;
      const sz = 1 + 0.09 * v;
      for (const [mesh, home] of [
        [right, rest.right],
        [left, rest.left],
      ]) {
        mesh.scale.set(sx, sy, sz);
        // Anchored at the apex: the top of the lung is held by the airway and
        // barely moves, so the growth has to go downwards.
        mesh.position.set(home.x, home.y - 0.24 * v, home.z);
      }
    },
  };
}
