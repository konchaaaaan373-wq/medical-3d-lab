import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * The portal circulation as a set of named pathways.
 *
 * PROTOTYPE-GRADE ANATOMY, NAMED STRUCTURE. What is right is *which vessel
 * joins which* — superior mesenteric and splenic veins meeting to form the
 * portal vein, the portal vein entering at the porta hepatis, the hepatic
 * veins leaving the top of the liver for the inferior vena cava, and the
 * collateral routes leaving the portal system upwards towards the oesophagus
 * and forwards along the ligamentum teres. Calibres, courses and lengths are
 * illustrative.
 *
 * The builder knows nothing about cirrhosis. It produces vessels with
 * rewritable calibres and a path along each one; which of them carry blood,
 * how much, and how wide they are is the scene's business — and the scene
 * gets all of it from a model.
 */

/**
 * @param {{ portal?: string, splanchnic?: string, hepaticVein?: string,
 *           collateral?: string, tips?: string }} [colors]
 */
export function buildPortalVasculature(colors = {}) {
  const {
    portal = '#5f7fd6',
    splanchnic = '#c96a5a',
    hepaticVein = '#6f8fc4',
    collateral = '#c98adf',
    tips = '#7ee0a8',
  } = colors;

  const object = new THREE.Group();
  object.name = 'portal-vasculature';

  const vessels = {};

  /** One vessel: a tube whose calibre the scene can rewrite, and its path. */
  function vessel(name, points, { radius, color, radial = 12, opacity = 1 }) {
    const curve = smoothCurve(points);
    const surface = new TubeSurface(curve, { radius, steps: 30, radial });
    const material = tissueMaterial({ color, roughness: 0.42, opacity, emissiveIntensity: 0.06 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = name;
    object.add(mesh);
    vessels[name] = { name, curve, surface, mesh, material, baseRadius: radius };
    return vessels[name];
  }

  // --- inflow: the gut and the spleen ---------------------------------------
  vessel(
    'superiorMesenteric',
    [
      [0.3, -2.85, 0.85],
      [0.18, -2.35, 0.72],
      [0.05, -2.0, 0.6],
      [-0.05, -1.55, 0.5],
    ],
    { radius: () => 0.065, color: splanchnic }
  );
  vessel(
    'splenic',
    [
      [2.25, -1.75, 0.15],
      [1.5, -1.66, 0.3],
      [0.7, -1.6, 0.42],
      [-0.05, -1.55, 0.5],
    ],
    { radius: () => 0.06, color: splanchnic }
  );

  // --- the portal vein itself ----------------------------------------------
  const portalVein = vessel(
    'portal',
    [
      [-0.05, -1.55, 0.5],
      [-0.1, -1.25, 0.62],
      [-0.14, -0.98, 0.7],
      [-0.15, -0.75, 0.72],
    ],
    { radius: () => 0.095, color: portal, radial: 16 }
  );

  // --- intrahepatic: portal branches, then the hepatic veins out the top ----
  vessel(
    'portalBranches',
    [
      [-0.15, -0.75, 0.72],
      [-0.65, -0.5, 0.4],
      [-1.15, -0.28, 0.1],
      [-1.5, -0.15, -0.15],
    ],
    { radius: (u) => 0.072 - 0.03 * u, color: portal }
  );
  vessel(
    'hepaticVein',
    [
      [-1.35, -0.05, -0.1],
      [-0.9, 0.28, -0.2],
      [-0.4, 0.52, -0.28],
      [-0.08, 0.62, -0.34],
    ],
    { radius: (u) => 0.045 + 0.038 * u, color: hepaticVein }
  );
  vessel(
    'cava',
    [
      [-0.08, 0.62, -0.34],
      [-0.07, 1.05, -0.36],
      [-0.06, 1.5, -0.38],
    ],
    { radius: () => 0.1, color: hepaticVein, radial: 14 }
  );

  // --- the ways out that should not exist ----------------------------------
  // Up towards the oesophagus, along the left gastric route: the collateral
  // that matters clinically, and the reason this scene has a "collateral" at
  // all rather than a generic bypass.
  vessel(
    'collateralOesophageal',
    [
      [-0.05, -1.55, 0.5],
      [0.5, -1.05, 0.35],
      [0.8, -0.2, 0.1],
      [0.95, 0.75, -0.1],
      [0.92, 1.5, -0.2],
    ],
    { radius: () => 0.045, color: collateral, opacity: 0.95 }
  );
  // Forwards along the ligamentum teres, towards the abdominal wall.
  vessel(
    'collateralUmbilical',
    [
      [-0.1, -1.35, 0.6],
      [0.35, -1.5, 1.15],
      [0.66, -1.85, 1.5],
      [0.82, -2.3, 1.7],
    ],
    { radius: () => 0.038, color: collateral, opacity: 0.95 }
  );

  // --- and the one that is put there on purpose -----------------------------
  const shunt = vessel(
    'tips',
    [
      [-0.15, -0.75, 0.72],
      [-0.5, -0.4, 0.35],
      [-0.8, 0.0, 0.0],
      [-0.95, 0.35, -0.2],
      [-0.6, 0.55, -0.3],
      [-0.08, 0.62, -0.34],
    ],
    { radius: () => 0.062, color: tips, radial: 10 }
  );
  shunt.mesh.visible = false;

  return {
    object,
    vessels,
    /**
     * Where each inflow vessel begins — the organ end, not the confluence.
     *
     * A scene that draws the spleen beside the splenic vein reads this and
     * places the organ by its hilum, rather than typing a position next to the
     * one in this file and trusting the two to stay together (architecture
     * rule 1). They did not: the vein started half a unit off the notch.
     */
    origins: {
      splenic: vessels.splenic.curve.getPointAt(0).clone(),
      superiorMesenteric: vessels.superiorMesenteric.curve.getPointAt(0).clone(),
    },
    /** The paths blood travels, for particle streams. */
    paths: {
      inflow: [vessels.superiorMesenteric.curve, vessels.splenic.curve],
      throughLiver: [
        joinCurves(portalVein.curve, vessels.portalBranches.curve, vessels.hepaticVein.curve, vessels.cava.curve),
      ],
      collateral: [vessels.collateralOesophageal.curve, vessels.collateralUmbilical.curve],
      shunt: [joinCurves(shunt.curve, vessels.cava.curve)],
    },
    anchors: {
      liver: new THREE.Vector3(-2.3, 0.75, 0.7),
      portal: new THREE.Vector3(0.55, -1.05, 1.0),
      splanchnic: new THREE.Vector3(1.75, -2.5, 0.9),
      hepaticVein: new THREE.Vector3(-1.4, 1.15, -0.3),
      collateral: new THREE.Vector3(1.9, 1.1, -0.1),
    },
    /**
     * Redraws one vessel's calibre.
     *
     * A vein carrying more blood is a wider vein, and in portal hypertension
     * that is one of the things a scan is looking for. Every value here comes
     * from a flow the model computed.
     *
     * @param {string} name
     * @param {number} scale 1 = as built
     */
    setCalibre(name, scale) {
      const found = vessels[name];
      if (!found) throw new Error(`portal vasculature: no vessel "${name}"`);
      const factor = Math.max(0.15, scale);
      found.surface.refresh((u, base) => base * factor);
    },
    /** Whether a vessel is drawn at all — for a shunt that has not been placed. */
    setVisible(name, visible) {
      vessels[name].mesh.visible = visible;
    },
    dispose() {
      for (const found of Object.values(vessels)) {
        found.surface.dispose();
        found.material.dispose();
      }
    },
  };
}

/**
 * One continuous path along several vessels.
 *
 * A particle travelling from the portal vein to the vena cava passes through
 * four named vessels, and it should not stop and restart at each join.
 */
function joinCurves(...curves) {
  const points = [];
  curves.forEach((curve, index) => {
    const sampled = curve.getSpacedPoints(8).map((point) => [point.x, point.y, point.z]);
    points.push(...(index === 0 ? sampled : sampled.slice(1)));
  });
  return smoothCurve(points);
}
