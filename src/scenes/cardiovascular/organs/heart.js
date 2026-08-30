import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { lerp } from '../../../utils/math.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * A whole heart, in outline, with the great vessels.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. This is the heart as a landmark: a
 * blunt cone with its apex pointing down and to the patient's left, two atrial
 * bulges on top, and an aortic arch leaving it. It exists for the whole-body
 * view and for scenes that need a heart in the frame.
 *
 * It is NOT the heart-failure scene's ventricle. That one is generated from a
 * haemodynamic model — wall thickness, cavity size and motion all come from
 * solved values — and nothing here should be mistaken for it.
 * See `src/scenes/cardiovascular/scenes/heartFailure/`.
 */
export function buildHeart({ color = '#b8444c', vesselColor = '#d8737b', atriumColor = '#9e3c48' } = {}) {
  const object = new THREE.Group();
  object.name = 'heart';

  const ventricles = new THREE.Mesh(
    shapedSphere({
      detail: 8,
      scale: [0.82, 1.0, 0.72],
      warp: (v) => {
        // Cone towards the apex, broad at the base.
        const down = smoothstep(0.2, -1, v.y);
        v.x *= 1 - 0.62 * down * down;
        v.z *= 1 - 0.62 * down * down;
        // The apex leans to the patient's left (screen right) and forwards.
        v.x += 0.34 * down * down;
        v.z += 0.12 * down * down;
        // Interventricular groove, front and back.
        v.multiplyScalar(1 - 0.05 * Math.exp(-Math.pow((v.x - 0.1) / 0.12, 2)));
      },
    }),
    tissueMaterial({ color, roughness: 0.48, emissiveIntensity: 0.06 })
  );
  ventricles.name = 'ventricles';

  const atria = new THREE.Group();
  atria.name = 'atria';
  for (const sign of [-1, 1]) {
    const atrium = new THREE.Mesh(
      shapedSphere({ detail: 5, scale: [0.34, 0.26, 0.3] }),
      tissueMaterial({ color: atriumColor, roughness: 0.5 })
    );
    atrium.position.set(sign * 0.42, 0.78, -0.06);
    atria.add(atrium);
  }

  // The arch sweeps over the patient's left, which in this scene's axes — the
  // ones bodyOverview places every organ by, liver right of midline and
  // stomach left of it — is +x. It used to run the other way, over the right,
  // disagreeing both with the apex displacement a few lines up and with the
  // heart-failure scene's own aorta.
  const arch = new TubeSurface(
    smoothCurve([
      [0.05, 0.7, 0.05],
      [0.1, 1.25, 0],
      [0.34, 1.6, -0.12],
      [0.72, 1.42, -0.24],
      [0.82, 0.9, -0.3],
    ]),
    { radius: () => 0.17, steps: 44, radial: 16 }
  );
  const archMesh = new THREE.Mesh(arch.geometry, tissueMaterial({ color: vesselColor, roughness: 0.42 }));
  archMesh.name = 'aortic-arch';

  object.add(ventricles, atria, archMesh);

  return {
    object,
    anchors: {
      heart: new THREE.Vector3(0.95, 0.2, 0.5),
      aorta: new THREE.Vector3(-1.15, 1.75, 0.2),
    },
    /**
     * One beat, as a shape change: 0 is filled, 1 is at end of ejection.
     * A silhouette animation only — no volumes, no pressures, no timing that
     * should be read as a cardiac cycle.
     */
    setBeat(value) {
      const v = Math.max(0, Math.min(1, value));
      ventricles.scale.set(lerp(1, 0.9, v), lerp(1, 0.94, v), lerp(1, 0.9, v));
      atria.scale.setScalar(lerp(0.94, 1.06, v));
    },
    dispose() {
      arch.dispose();
    },
  };
}
