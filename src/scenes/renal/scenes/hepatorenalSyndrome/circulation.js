import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';

/**
 * The circulation between the two organs, as a set of named pathways.
 *
 * PROTOTYPE-GRADE ANATOMY, NAMED STRUCTURE. What is right is *which vessel
 * joins which*: the aorta giving off a splanchnic trunk and the renal
 * arteries, splanchnic blood reaching the liver by the portal vein, the
 * hepatic veins and the renal veins both reaching the inferior vena cava.
 * Calibres, courses and lengths are illustrative, and the two beds are drawn
 * far further apart than they are.
 *
 * The fourth pathway — `systemic` — is everything that is neither splanchnic
 * nor renal, drawn as one vessel because that is exactly how the model treats
 * it. Drawing it as a named organ would be claiming a resolution the model
 * does not have.
 *
 * This builder knows nothing about cirrhosis or about kidneys. It produces
 * vessels with rewritable calibres and a path along each; which of them carry
 * blood and how much is a reading of a model.
 */
export function buildSystemicCirculation(colors = {}) {
  const {
    artery = '#c8524b',
    portal = '#5f7fd6',
    vein = '#6f8fc4',
    splanchnic = '#c96a5a',
    renal = '#d2564f',
  } = colors;

  const object = new THREE.Group();
  object.name = 'systemic-circulation';

  const vessels = {};

  function vessel(name, points, { radius, color, radial = 12, opacity = 1 }) {
    const curve = smoothCurve(points);
    const surface = new TubeSurface(curve, { radius, steps: 34, radial });
    const material = tissueMaterial({ color, roughness: 0.42, opacity, emissiveIntensity: 0.06 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = name;
    object.add(mesh);
    vessels[name] = { name, curve, surface, mesh, material };
    return vessels[name];
  }

  // --- the two trunks -------------------------------------------------------
  // The aorta on the midline, the cava behind and to its left. Neither one's
  // calibre is ever rewritten: what this scene is about is the distribution
  // between the beds, not the size of the trunks.
  vessel(
    'aorta',
    [
      [0, 3.1, 0],
      [0, 1.4, 0.04],
      [0.04, -0.4, 0.06],
      [0.06, -1.8, 0.04],
      [0.05, -2.6, 0],
    ],
    { radius: () => 0.15, color: artery, radial: 16 }
  );
  vessel(
    'cava',
    [
      [-0.82, -2.6, -0.6],
      [-0.8, -1.4, -0.6],
      [-0.8, 0.6, -0.6],
      [-0.8, 2.2, -0.6],
      [-0.8, 3.1, -0.6],
    ],
    { radius: () => 0.17, color: vein, radial: 16 }
  );

  // --- the splanchnic bed and the liver ------------------------------------
  vessel(
    'splanchnicArtery',
    [
      [0, -0.75, 0.06],
      [-1.2, -1.2, 0.2],
      [-2.5, -1.55, 0.3],
      [-3.4, -1.7, 0.3],
    ],
    { radius: () => 0.085, color: splanchnic, radial: 14 }
  );
  vessel(
    'portalVein',
    [
      [-3.4, -1.7, 0.3],
      [-3.45, -0.9, 0.34],
      [-3.5, -0.05, 0.36],
      [-3.5, 1.15, 0.3],
    ],
    { radius: () => 0.11, color: portal, radial: 14 }
  );
  vessel(
    'hepaticVein',
    [
      [-3.05, 1.95, -0.05],
      [-2.4, 2.3, -0.2],
      [-1.5, 2.55, -0.45],
      [-0.8, 2.6, -0.6],
    ],
    { radius: () => 0.1, color: vein, radial: 14 }
  );

  // --- the kidney -----------------------------------------------------------
  vessel(
    'renalArtery',
    [
      [0.06, -0.5, 0.06],
      [1.1, -0.72, 0.14],
      [2.1, -0.95, 0.18],
      [2.9, -1.05, 0.16],
    ],
    { radius: () => 0.085, color: renal, radial: 14 }
  );
  vessel(
    'renalVein',
    [
      [2.9, -1.5, 0.12],
      [1.9, -1.66, 0.0],
      [0.6, -1.8, -0.35],
      [-0.8, -1.9, -0.6],
    ],
    { radius: () => 0.095, color: vein, radial: 14 }
  );

  // --- everything else ------------------------------------------------------
  // One vessel for every bed the model does not resolve: muscle, skin, brain,
  // the coronary circulation. It is drawn low and behind so that it reads as
  // the remainder rather than as a third organ.
  vessel(
    'systemic',
    [
      [0.05, -2.5, 0.0],
      [-0.05, -3.15, -0.15],
      [-0.55, -3.3, -0.4],
      [-0.82, -2.7, -0.6],
    ],
    { radius: () => 0.11, color: artery, radial: 12, opacity: 0.55 }
  );

  return {
    object,
    vessels,
    paths: {
      splanchnic: [joinCurves(vessels.splanchnicArtery.curve, vessels.portalVein.curve)],
      throughLiver: [vessels.hepaticVein.curve],
      renal: [vessels.renalArtery.curve],
      renalOut: [vessels.renalVein.curve],
      systemic: [vessels.systemic.curve],
    },
    anchors: {
      liver: new THREE.Vector3(-4.8, 2.15, 0.5),
      splanchnic: new THREE.Vector3(-3.5, -2.25, 0.5),
      aorta: new THREE.Vector3(0.6, 0.55, 0.4),
      kidney: new THREE.Vector3(4.1, -2.3, 0.4),
      systemic: new THREE.Vector3(-0.4, -3.75, 0.1),
    },

    /**
     * Redraws one vessel's calibre from the flow it is carrying.
     *
     * A vessel carrying more blood is a wider vessel. The mapping is a
     * presentation curve — the fourth root of the flow ratio, so a fourfold
     * flow is a 1.4× calibre — and it is applied here rather than in the
     * model, which knows nothing about how wide anything is drawn.
     *
     * @param {string} name
     * @param {number} scale 1 = as built
     */
    setCalibre(name, scale) {
      const found = vessels[name];
      if (!found) throw new Error(`systemic circulation: no vessel "${name}"`);
      const factor = Math.min(2.2, Math.max(0.28, scale));
      found.surface.refresh((u, base) => base * factor);
    },

    dispose() {
      for (const found of Object.values(vessels)) {
        found.surface.dispose();
        found.material.dispose();
      }
    },
  };
}

/** One continuous path along several vessels, so a particle does not restart at a join. */
function joinCurves(...curves) {
  const points = [];
  curves.forEach((curve, index) => {
    const sampled = curve.getSpacedPoints(8).map((point) => [point.x, point.y, point.z]);
    points.push(...(index === 0 ? sampled : sampled.slice(1)));
  });
  return smoothCurve(points);
}
