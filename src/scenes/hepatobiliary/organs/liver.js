import * as THREE from 'three';
import { bump, ripple, shapedSphere, lerp, smoothstep } from '../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * Liver and gallbladder.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The liver is drawn as the wedge it
 * is: bulky right lobe, thin tapering left lobe, domed superior surface, flat
 * visceral surface underneath, with the falciform groove between the lobes and
 * a fossa where the gallbladder sits. Segments, vasculature and the real
 * lobar proportions are not modelled.
 *
 * The parenchyma is drawn slightly translucent so that flow inside it can be
 * seen. That is a visualisation choice, not a property of liver.
 */
export function buildLiver({ color = '#8f3f43', opacity = 0.82, detail = 9 } = {}) {
  const geometry = shapedSphere({
    detail,
    scale: [1.85, 0.92, 0.95],
    warp: (v) => {
      const { x, y, z } = v;

      // The left lobe thins to an edge towards the patient's left (screen
      // right). Without this the liver is a dome, and a dome is a mushroom.
      const left = smoothstep(-0.25, 1, x);
      v.y *= 1 - 0.56 * left;
      v.z *= 1 - 0.6 * left;
      v.x += 0.16 * left;

      // The superior surface is domed on the right and falls away to the left,
      // which is what gives a liver its wedge profile from the front.
      if (v.y > 0) v.y *= 1 - 0.3 * left;

      // Visceral (inferior) surface: flat, not round.
      if (v.y < -0.24) v.y = lerp(v.y, -0.3, 0.78);

      // Falciform ligament: the groove that divides the two lobes.
      const groove = Math.exp(-Math.pow((x - 0.24) / 0.11, 2)) * smoothstep(-0.15, 0.45, y);
      v.multiplyScalar(1 - 0.17 * groove);

      // Gallbladder fossa, on the underside of the right lobe.
      if (v.y < -0.1) v.y += 0.16 * bump(x, z, { atY: -0.5, atZ: 0.42, spreadY: 0.3, spreadZ: 0.34 });

      v.multiplyScalar(1 + 0.016 * ripple(x, y, z, 2.7, 0.9));
    },
  });

  const mesh = new THREE.Mesh(geometry, tissueMaterial({ color, roughness: 0.5, opacity, emissiveIntensity: 0.05 }));
  mesh.name = 'liver';

  return {
    object: mesh,
    anchors: {
      rightLobe: new THREE.Vector3(-1.8, 0.8, 0.6),
      leftLobe: new THREE.Vector3(1.5, 0.35, 0.5),
      porta: new THREE.Vector3(-0.15, -0.75, 0.7),
    },
  };
}

/**
 * The gallbladder, hanging off the underside of the right lobe.
 *
 * PROTOTYPE. Pear-shaped: rounded fundus, tapering neck towards the cystic
 * duct. `setFill` is a shape change only — it is not a volume in millilitres.
 */
export function buildGallbladder({ color = '#c9b23c' } = {}) {
  const geometry = shapedSphere({
    detail: 7,
    scale: [0.42, 0.56, 0.4],
    warp: (v) => {
      // Taper towards the neck (+y), round at the fundus (-y).
      // Rounded fundus, narrowing to the neck — but not to a blade: tapered
      // this hard from a flat shape it read as a leaf hanging off the liver.
      const t = smoothstep(-0.15, 1, v.y);
      v.x *= 1 - 0.5 * t;
      v.z *= 1 - 0.5 * t;
      v.y += 0.14 * t;
    },
  });
  const mesh = new THREE.Mesh(geometry, tissueMaterial({ color, roughness: 0.36, emissiveIntensity: 0.08 }));
  mesh.name = 'gallbladder';
  // Hanging off the underside of the right lobe, fundus pointing down and
  // forwards — the direction it is felt from in life.
  mesh.position.set(-0.62, -0.66, 0.6);
  mesh.rotation.z = -0.22;
  mesh.rotation.x = -0.42;

  return {
    object: mesh,
    anchors: { gallbladder: new THREE.Vector3(-1.15, -1.25, 0.9) },
    /** 1 = distended (fasting), 0 = contracted after a meal. */
    setFill(value) {
      const v = Math.max(0, Math.min(1, value));
      mesh.scale.set(lerp(0.62, 1.06, v), lerp(0.82, 1.02, v), lerp(0.62, 1.06, v));
    },
  };
}
