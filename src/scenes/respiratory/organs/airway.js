import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, tissueMaterial } from '../../shared/materials.js';

/**
 * Trachea, carina and the main bronchi.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Two things are encoded on purpose
 * because they are the ones that matter for teaching: the trachea is held open
 * by cartilage rings, and the right main bronchus leaves the carina at a
 * steeper angle than the left. Calibres, ring counts and branching beyond the
 * lobar bronchi are illustrative.
 */
export function buildAirway({
  color = '#b9c6db',
  cartilage = '#e6ecf5',
  rings = 9,
  bronchi: withBronchi = true,
  /**
   * Lobar and segmental branches running on into the lungs. Off by default,
   * because most scenes only need the airway as a landmark; a scene about
   * where in the tree the flow is limited needs somewhere for that to happen.
   */
  branches: withBranches = false,
} = {}) {
  const object = new THREE.Group();
  object.name = 'airway';

  const wall = tissueMaterial({ color, roughness: 0.45, emissiveIntensity: 0.05 });
  const ringMaterial = mineralMaterial({ color: cartilage, roughness: 0.55 });

  const tracheaCurve = smoothCurve([
    [0, 3.5, -0.1],
    [0, 2.8, -0.12],
    [0, 2.1, -0.12],
    [0, 1.55, -0.1],
  ]);
  const trachea = new TubeSurface(tracheaCurve, { radius: () => 0.19, steps: 40, radial: 20 });
  const tracheaMesh = new THREE.Mesh(trachea.geometry, wall);
  tracheaMesh.name = 'trachea';

  // The right main bronchus is wider, shorter and closer to vertical — which is
  // why inhaled material tends to end up on the right.
  const rightCurve = smoothCurve([
    [0, 1.6, -0.1],
    [-0.42, 1.24, -0.08],
    [-0.86, 0.92, -0.02],
    [-1.25, 0.66, 0.04],
  ]);
  const leftCurve = smoothCurve([
    [0, 1.6, -0.1],
    [0.46, 1.34, -0.08],
    [0.96, 1.12, -0.02],
    [1.42, 0.92, 0.04],
  ]);

  const rightBronchus = new TubeSurface(rightCurve, { radius: (u) => 0.14 - 0.04 * u, steps: 32, radial: 16 });
  const leftBronchus = new TubeSurface(leftCurve, { radius: (u) => 0.12 - 0.035 * u, steps: 32, radial: 16 });

  const bronchi = new THREE.Group();
  bronchi.name = 'main-bronchi';
  bronchi.add(new THREE.Mesh(rightBronchus.geometry, wall), new THREE.Mesh(leftBronchus.geometry, wall));

  /**
   * Branches beyond the main bronchi.
   *
   * Three off each side, into the upper, middle and lower parts of the lung.
   * The tree is not accurate beyond "it divides and the branches get smaller
   * and run into the lung"; that is enough to carry the one thing a scene
   * about airflow obstruction needs it to carry, which is that the airways
   * that narrow are the small ones, deep in.
   */
  const branchCurves = withBranches
    ? [
        smoothCurve([[-1.25, 0.66, 0.04], [-1.44, 0.96, 0.16], [-1.58, 1.2, 0.26]]),
        smoothCurve([[-1.25, 0.66, 0.04], [-1.5, 0.48, 0.22], [-1.7, 0.3, 0.34]]),
        smoothCurve([[-1.25, 0.66, 0.04], [-1.4, 0.16, -0.06], [-1.52, -0.34, -0.14]]),
        smoothCurve([[1.42, 0.92, 0.04], [1.6, 1.2, 0.16], [1.72, 1.42, 0.24]]),
        smoothCurve([[1.42, 0.92, 0.04], [1.64, 0.66, 0.24], [1.82, 0.48, 0.36]]),
        smoothCurve([[1.42, 0.92, 0.04], [1.56, 0.34, -0.04], [1.66, -0.14, -0.12]]),
      ]
    : [];
  const branchSurfaces = branchCurves.map((curve) => {
    const surface = new TubeSurface(curve, { radius: (u) => 0.05 - 0.024 * u, steps: 26, radial: 10 });
    bronchi.add(new THREE.Mesh(surface.geometry, wall));
    return surface;
  });

  // Cartilage rings, spaced along the trachea and oriented to it.
  const ringGeometry = new THREE.TorusGeometry(0.2, 0.033, 8, 26);
  const ringGroup = new THREE.Group();
  ringGroup.name = 'cartilage';
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < rings; i++) {
    const u = 0.06 + (i / (rings - 1)) * 0.86;
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(tracheaCurve.getPointAt(u));
    ring.quaternion.setFromUnitVectors(up, tracheaCurve.getTangentAt(u).normalize());
    ringGroup.add(ring);
  }

  // The endocrine scenes want the trachea alone, as the landmark the thyroid
  // wraps around; the respiratory ones want the whole tree.
  object.add(tracheaMesh, ringGroup);
  if (withBronchi) object.add(bronchi);

  return {
    object,
    /**
     * Narrows the airways the way expiration does when they are not held open.
     *
     * Cartilage keeps the trachea's calibre whatever the pressure around it,
     * so nothing here touches it. The main bronchi give a little and the
     * branches beyond them give most — the peripheral-to-central gradient that
     * makes small airways the site of obstruction. Purely a shape: no flow, no
     * pressure and no resistance is being computed here, and the scene that
     * calls this has already computed all three.
     *
     * @param {number} value 0 = held open, 1 = fully compressed
     */
    setCompression(value) {
      const v = Math.max(0, Math.min(1, value));
      rightBronchus.refresh((u, base) => base * (1 - 0.3 * v * (0.4 + 0.6 * u)));
      leftBronchus.refresh((u, base) => base * (1 - 0.3 * v * (0.4 + 0.6 * u)));
      for (const surface of branchSurfaces) {
        surface.refresh((u, base) => base * (1 - 0.62 * v * (0.5 + 0.5 * u)));
      }
    },
    /** Paths air travels, for a flow stream: nose-end of the trachea to each lung. */
    airPaths: [
      smoothCurve([...pointsOf(tracheaCurve, 6), ...pointsOf(rightCurve, 6).slice(1)]),
      smoothCurve([...pointsOf(tracheaCurve, 6), ...pointsOf(leftCurve, 6).slice(1)]),
    ],
    anchors: {
      trachea: new THREE.Vector3(0.34, 2.9, 0.15),
      carina: new THREE.Vector3(0, 1.5, 0.35),
      rightBronchus: new THREE.Vector3(-1.1, 0.62, 0.3),
    },
    dispose() {
      trachea.dispose();
      rightBronchus.dispose();
      leftBronchus.dispose();
      for (const surface of branchSurfaces) surface.dispose();
      ringGeometry.dispose();
    },
  };
}

/** Samples a curve into `[x, y, z]` triples, so two curves can be joined into one path. */
function pointsOf(curve, count) {
  return curve.getSpacedPoints(count).map((p) => [p.x, p.y, p.z]);
}
