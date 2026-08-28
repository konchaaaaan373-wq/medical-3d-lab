import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { lerp } from '../../../utils/math.js';
import { mucosaMaterial, tissueMaterial } from '../../shared/materials.js';

/**
 * The prostate, with the urethra running through it.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The one relationship that matters is
 * built in: the gland surrounds the urethra, so gland volume and urethral
 * calibre are not independent. Zonal anatomy is not modelled, and neither the
 * volume nor the calibre here is in real units.
 */
export function buildProstate({ color = '#c08a7a', urethraColor = '#8fd6c4', opacity = 0.72 } = {}) {
  const object = new THREE.Group();
  object.name = 'prostate';

  const gland = new THREE.Mesh(
    shapedSphere({
      detail: 7,
      scale: [0.56, 0.56, 0.53],
      warp: (v) => {
        // Chestnut: broader above, tapering to the apex below.
        const down = smoothstep(0.1, -1, v.y);
        v.x *= 1 - 0.34 * down;
        v.z *= 1 - 0.34 * down;
        // A shallow midline groove behind — the sulcus felt on examination.
        if (v.z < -0.3) v.z += 0.12 * Math.exp(-Math.pow(v.x / 0.18, 2));
      },
    }),
    tissueMaterial({ color, roughness: 0.5, opacity })
  );
  gland.name = 'gland';

  const urethraCurve = smoothCurve([
    [0, 0.95, 0],
    [0, 0.42, 0.02],
    [0, -0.05, 0.03],
    [0, -0.5, 0.02],
    [0, -1.1, 0],
  ]);
  const urethra = new TubeSurface(urethraCurve, { radius: () => 0.085, steps: 60, radial: 14 });
  const urethraMesh = new THREE.Mesh(urethra.geometry, mucosaMaterial({ color: urethraColor }));
  urethraMesh.name = 'urethra';

  object.add(urethraMesh, gland);

  return {
    object,
    urethraCurve,
    anchors: {
      gland: new THREE.Vector3(-1.15, 0.15, 0.5),
      urethra: new THREE.Vector3(0.7, -0.75, 0.55),
      apex: new THREE.Vector3(0.55, -1.15, 0.4),
    },
    /**
     * 0 = as built, 1 = enlarged.
     *
     * Growth is inwards as well as outwards, so the prostatic segment of the
     * urethra narrows — that is the mechanism, and it is why the size of the
     * gland alone does not predict the symptoms.
     */
    setEnlargement(value) {
      const v = Math.max(0, Math.min(1, value));
      const grow = lerp(1, 1.45, v);
      gland.scale.set(grow, lerp(1, 1.25, v), grow);
      urethra.refresh((u, base) => {
        // Only the segment inside the gland is squeezed.
        const inside = Math.exp(-Math.pow((u - 0.5) / 0.26, 2));
        return base * (1 - 0.72 * v * inside);
      });
    },
    /** How open the prostatic urethra is, 0..1 — for driving the flow stream. */
    calibre(value) {
      return 1 - 0.72 * Math.max(0, Math.min(1, value));
    },
    dispose() {
      urethra.dispose();
    },
  };
}
