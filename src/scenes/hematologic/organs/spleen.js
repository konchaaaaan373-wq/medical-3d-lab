import * as THREE from 'three';
import { bump, ripple, shapedSphere } from '../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * The spleen.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. An elongated organ, convex against
 * the diaphragm and concave on the visceral surface, with the notched superior
 * border that makes an enlarged spleen recognisable on examination. The hilum
 * is where the vessels enter. Red and white pulp are not drawn as structures;
 * the parenchyma is translucent so that flow through it can be seen.
 */
export function buildSpleen({ color = '#7c3f52', opacity = 0.78, detail = 8 } = {}) {
  const geometry = shapedSphere({
    detail,
    scale: [0.86, 1.5, 0.7],
    warp: (v) => {
      const { x, y, z } = v;

      // Visceral surface: concave, facing the stomach and the kidney.
      if (v.x > 0) v.x -= 0.34 * bump(y, z, { atY: 0, atZ: 0, spreadY: 0.85, spreadZ: 0.9 }) * Math.min(1, v.x);

      // Hilum: a groove along that concave face.
      v.x -= 0.16 * Math.exp(-Math.pow((y - 0.05) / 0.28, 2)) * Math.exp(-Math.pow(z / 0.5, 2)) * Math.max(0, v.x);

      // Notches on the superior border. They are the feature an enlarged
      // spleen is recognised by on examination, so they are cut deep enough to
      // survive being seen from the front — shallower, the organ was an ovoid
      // that could have been anything.
      for (const at of [0.3, 0.58]) {
        const d = y - at;
        v.multiplyScalar(1 - 0.17 * Math.exp(-(d * d) / 0.006) * Math.exp(-Math.pow((x + 0.4) / 0.7, 2)));
      }

      v.multiplyScalar(1 + 0.014 * ripple(x, y, z, 3.2, 1.1));
    },
  });

  const mesh = new THREE.Mesh(geometry, tissueMaterial({ color, roughness: 0.5, opacity }));
  mesh.name = 'spleen';

  return {
    object: mesh,
    /** Where the splenic artery and vein meet the organ. */
    hilum: new THREE.Vector3(0.55, 0.05, 0),
    anchors: {
      spleen: new THREE.Vector3(-1.35, 1.05, 0.5),
      hilum: new THREE.Vector3(1.55, 0.1, 0.5),
      pulp: new THREE.Vector3(-0.7, -0.85, 0.6),
    },
  };
}
