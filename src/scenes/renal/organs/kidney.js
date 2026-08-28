import * as THREE from 'three';
import { bump, ripple, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial } from '../../shared/materials.js';
import { createRandom } from '../../../utils/math.js';

/**
 * A kidney, with its hilum and collecting system.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The bean is the point: convex
 * laterally, concave at the medial hilum where the vessels and the ureter
 * enter. Cortex and medulla are drawn as two nested shapes so that "filtration
 * happens at the outside and drains inwards" is visible; pyramids, calyces and
 * nephrons are not modelled, and nothing here is to scale.
 *
 * @param {{ side?: 'left'|'right', color?: string, medullaColor?: string }} [options]
 */
export function buildKidney({ side = 'left', color = '#a0555c', medullaColor = '#c9757c', opacity = 0.82 } = {}) {
  // `medial` is the sign of the side the hilum faces: the left kidney (screen
  // right) has its hilum towards screen-left, and vice versa.
  const medial = side === 'left' ? 1 : -1;

  const warp = (v) => {
    const { x, y, z } = v;
    // Poles taper: a kidney is not an ellipsoid, it is narrower top and bottom.
    const taper = 1 - 0.3 * Math.pow(Math.abs(y), 3);
    v.x *= taper;
    v.z *= taper;

    // Medial concavity, deepest at mid height: this is what makes it a bean
    // rather than an egg, so it is worth overdoing slightly.
    if (v.x * medial < 0) {
      const depth = bump(y, z, { atY: 0, atZ: 0, spreadY: 0.58, spreadZ: 0.9 });
      v.x += medial * 0.78 * depth * Math.min(1, -v.x * medial);
    }

    v.multiplyScalar(1 + 0.012 * ripple(x, y, z, 3.6, 2.1));
  };

  const object = new THREE.Group();
  object.name = `kidney-${side}`;

  const cortex = new THREE.Mesh(
    shapedSphere({ detail: 8, scale: [0.62, 0.98, 0.6], warp }),
    tissueMaterial({ color, roughness: 0.5, opacity })
  );
  cortex.name = 'cortex';

  const medulla = new THREE.Mesh(
    shapedSphere({ detail: 6, scale: [0.42, 0.66, 0.4], warp }),
    tissueMaterial({ color: medullaColor, roughness: 0.55, emissiveIntensity: 0.08 })
  );
  medulla.name = 'medulla';

  // Renal pelvis: the funnel in the hilum that the ureter leaves from.
  const pelvis = new THREE.Mesh(
    shapedSphere({ detail: 5, scale: [0.2, 0.26, 0.16] }),
    mucosaMaterial({ color: '#8fd6c4', opacity: 0.9 })
  );
  pelvis.position.set(-medial * 0.24, -0.05, 0);
  pelvis.name = 'pelvis';

  object.add(cortex, medulla, pelvis);

  /**
   * Paths from the cortex inwards to the pelvis.
   *
   * A stand-in for "filtrate forms at the outside and drains towards the
   * middle". It is not a nephron, and the number of paths means nothing.
   */
  const random = createRandom(side === 'left' ? 71 : 72);
  const filtrationPaths = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + random() * 0.4;
    const outer = new THREE.Vector3(
      Math.cos(angle) * 0.5 * (medial > 0 ? 1 : -1) + medial * 0.12,
      Math.sin(angle) * 0.72,
      Math.cos(angle * 1.7) * 0.36
    );
    filtrationPaths.push(
      smoothCurve([
        [outer.x, outer.y, outer.z],
        [outer.x * 0.6, outer.y * 0.6, outer.z * 0.5],
        [-medial * 0.24, -0.05, 0],
      ])
    );
  }

  return {
    object,
    filtrationPaths,
    /** Where the ureter leaves, in the kidney's own coordinates. */
    hilum: new THREE.Vector3(-medial * 0.32, -0.12, 0),
    anchors: {
      cortex: new THREE.Vector3(medial * 0.9, 0.85, 0.5),
      hilum: new THREE.Vector3(-medial * 0.95, -0.1, 0.4),
    },
  };
}

/**
 * A ureter: a narrow muscular tube that moves urine by peristalsis, not by
 * gravity. PROTOTYPE — calibre and course are illustrative.
 */
export function buildUreter(points, { color = '#8fd6c4' } = {}) {
  const curve = smoothCurve(points);
  const surface = new TubeSurface(curve, { radius: () => 0.055, steps: 80, radial: 10 });
  const mesh = new THREE.Mesh(surface.geometry, mucosaMaterial({ color, opacity: 0.9 }));
  mesh.name = 'ureter';
  return { object: mesh, curve, surface, dispose: () => surface.dispose() };
}

/**
 * The bladder: a hollow organ whose shape changes with what is in it.
 *
 * PROTOTYPE. Empty it sits low and flattened in the pelvis; as it fills it
 * becomes rounder and rises. The wall is drawn translucent with the contents
 * inside it, so "filling" is something you can see rather than infer.
 * `setFill` is a shape, not a volume in millilitres.
 */
export function buildBladder({ color = '#c8a6b8', fluidColor = '#e8d75f' } = {}) {
  const object = new THREE.Group();
  object.name = 'bladder';

  const wall = new THREE.Mesh(
    shapedSphere({
      detail: 7,
      scale: [0.7, 0.68, 0.64],
      warp: (v) => {
        // Domed above, tapering to the neck below. Flattened much further than
        // this it stops reading as a container and starts reading as a disc.
        v.y -= 0.06 * smoothstep(0.35, 1, v.y);
        // Only the last of it narrows towards the neck: taper the whole lower
        // half and the organ reads as a bowl with a lip.
        const low = smoothstep(-0.55, -1, v.y);
        v.x *= 1 - 0.4 * low;
        v.z *= 1 - 0.4 * low;
      },
    }),
    tissueMaterial({ color, roughness: 0.45, opacity: 0.5 })
  );
  wall.name = 'bladder-wall';

  const fluid = new THREE.Mesh(
    shapedSphere({ detail: 6, scale: [0.62, 0.5, 0.53] }),
    tissueMaterial({ color: fluidColor, roughness: 0.25, emissiveIntensity: 0.22, opacity: 0.7 })
  );
  fluid.name = 'bladder-contents';

  object.add(wall, fluid);

  return {
    object,
    anchors: { bladder: new THREE.Vector3(0.95, -0.35, 0.6) },
    /** 0 = empty and flattened, 1 = full and round. */
    setFill(value) {
      const v = Math.max(0, Math.min(1, value));
      wall.scale.set(0.84 + 0.26 * v, 0.7 + 0.42 * v, 0.84 + 0.26 * v);
      wall.position.y = -0.1 + 0.18 * v;
      // The contents grow faster than the wall early on: the bladder becomes
      // round before it becomes big.
      const fill = Math.pow(v, 0.7);
      // Kept inside the wall: the contents must never reach it, or the organ
      // stops reading as a container and starts reading as a solid.
      fluid.scale.set(0.44 + 0.44 * fill, 0.36 + 0.56 * fill, 0.44 + 0.44 * fill);
      fluid.position.y = -0.2 + 0.24 * fill;
      fluid.visible = v > 0.02;
    },
  };
}
