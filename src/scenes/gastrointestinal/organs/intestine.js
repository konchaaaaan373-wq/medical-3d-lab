import * as THREE from 'three';
import { TubeSurface, coilCurve, smoothCurve } from '../../shared/geometry/tube.js';
import { wallMaterial } from '../../shared/materials.js';
import { travellingWave } from '../../shared/motion/rhythm.js';

/**
 * Small bowel and colon.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The small bowel is a folded coil of
 * narrow tube; the colon is a wider tube on a fixed frame — caecum, ascending,
 * transverse, descending, sigmoid — with haustral sacculations modelled as a
 * periodic change in calibre. Lengths, loop counts and positions are
 * illustrative. Screen-left is the patient's right, so the ascending colon is
 * on the left of the frame.
 */
export function buildSmallIntestine({ color = '#d99a7c', seed = 12, radius = 0.21 } = {}) {
  // Loops radiating from the middle of the abdomen, overlapping each other.
  const curve = coilCurve({ loops: 8, inner: 0.5, outer: 1.62, depth: 1.1, height: 0.95, seed, jitter: 0.4 });
  const surface = new TubeSurface(curve, { radius: () => radius, steps: 300, radial: 16 });
  const mesh = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.96 }));
  mesh.name = 'small-intestine';
  // A little off-axis, so the rosette is not seen dead on, and sitting where
  // the loops actually lie — below the transverse colon, not centred on it.
  mesh.rotation.set(0.06, 0.24, 0.1);
  mesh.position.y = -0.18;

  return {
    object: mesh,
    surface,
    curve,
    anchors: { small: new THREE.Vector3(0, 1.5, 1.2) },
    /**
     * Segmentation and propulsion are the same machinery at different
     * settings: many shallow standing constrictions, or few deep travelling
     * ones. `propulsion` (0..1) moves between them.
     */
    setMotility(phase, propulsion) {
      const count = Math.round(9 - 7 * propulsion);
      const depth = 0.16 + 0.3 * propulsion;
      surface.refresh((u, base) => base * (1 - depth * travellingWave(u, phase, { width: 0.02, count })));
    },
    dispose() {
      surface.dispose();
    },
  };
}

export function buildColon({ color = '#c58a72', sacculations = 22 } = {}) {
  const curve = smoothCurve([
    [-1.75, -2.05, 0.35], // caecum
    [-1.95, -1.2, 0.25],
    [-1.98, 0.35, 0.1], // ascending
    [-1.6, 1.35, 0.05],
    [-0.4, 1.62, -0.05], // transverse
    [1.0, 1.5, -0.05],
    [1.85, 0.9, 0.05],
    [1.95, -0.6, 0.15], // descending
    [1.5, -1.7, 0.25],
    [0.5, -2.1, 0.3], // sigmoid
    [0.05, -2.65, 0.15],
  ]);

  // Haustra: the calibre rises and falls along the tube, which is what gives
  // the colon its segmented outline at a glance.
  const surface = new TubeSurface(curve, {
    radius: (u) => (0.34 - 0.12 * Math.pow(u, 1.6)) * (1 + 0.15 * Math.cos(u * sacculations * Math.PI * 2)),
    steps: 320,
    radial: 16,
  });
  const mesh = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.96 }));
  mesh.name = 'colon';

  return {
    object: mesh,
    surface,
    curve,
    anchors: {
      ileocecal: new THREE.Vector3(-2.4, -2.0, 0.6),
      ascending: new THREE.Vector3(-2.7, 0.3, 0.4),
      transverse: new THREE.Vector3(0.2, 2.15, 0.3),
      sigmoid: new THREE.Vector3(0.9, -2.5, 0.5),
    },
    /** Slow, intermittent mass movements rather than a continuous train. */
    setMotility(phase, strength) {
      surface.refresh((u, base) => base * (1 - 0.22 * strength * travellingWave(u, phase, { width: 0.05, count: 2 })));
    },
    dispose() {
      surface.dispose();
    },
  };
}

/**
 * The duodenal C-loop.
 *
 * PROTOTYPE. It exists mostly as context: the pancreatic head sits inside this
 * curve and the bile duct ends in it, so the neighbouring scenes borrow it
 * rather than each drawing their own approximation of "somewhere over there".
 */
export function buildDuodenum({ color = '#d99a7c' } = {}) {
  const curve = smoothCurve([
    [-1.05, 0.95, 0.1],
    [-1.62, 0.55, 0.05],
    [-1.78, -0.15, 0],
    [-1.52, -0.78, 0.02],
    [-0.85, -0.95, 0.05],
    [-0.2, -0.72, 0.08],
  ]);
  const surface = new TubeSurface(curve, { radius: () => 0.2, steps: 90, radial: 16 });
  const mesh = new THREE.Mesh(surface.geometry, wallMaterial({ color, opacity: 0.9 }));
  mesh.name = 'duodenum';
  return {
    object: mesh,
    surface,
    curve,
    anchors: { duodenum: new THREE.Vector3(-2.3, -0.35, 0.4) },
    dispose() {
      surface.dispose();
    },
  };
}
