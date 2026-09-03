import * as THREE from 'three';
import { bump, ripple, shapedSphere } from '../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * Which way the visceral surface — and with it the hilum — faces.
 *
 * The spleen is a left-sided organ, and this project draws the patient's left
 * at +x (`docs/architecture-rules.md` rule 5), so the concave face turned
 * towards the stomach and the left kidney looks **medially**, at −x. Built the
 * other way round the organ still reads as a spleen on its own; it only goes
 * wrong once something places it in a body, and then it presents its hilum to
 * the ribs and the splenic vein leaves from the diaphragmatic surface. That is
 * what it did, and the portal-hypertension scene drew the vein starting half a
 * unit away from the notch it was supposed to come out of.
 *
 * Derived from the axis rather than typed into each line below, so there is
 * one sign to get right instead of five.
 */
const MEDIAL = -1;

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

      // How far into the visceral (medial) half of the organ this vertex is.
      const inward = v.x * MEDIAL;

      // Visceral surface: concave, facing the stomach and the left kidney.
      if (inward > 0) {
        v.x -= MEDIAL * 0.34 * bump(y, z, { atY: 0, atZ: 0, spreadY: 0.85, spreadZ: 0.9 }) * Math.min(1, inward);
      }

      // Hilum: a groove along that concave face.
      v.x -=
        MEDIAL *
        0.16 *
        Math.exp(-Math.pow((y - 0.05) / 0.28, 2)) *
        Math.exp(-Math.pow(z / 0.5, 2)) *
        Math.max(0, inward);

      // Notches on the superior border, cut into the convex diaphragmatic
      // aspect — the side away from the hilum. They are the feature an
      // enlarged spleen is recognised by on examination, so they are cut deep
      // enough to survive being seen from the front — shallower, the organ was
      // an ovoid that could have been anything.
      for (const at of [0.3, 0.58]) {
        const d = y - at;
        v.multiplyScalar(
          1 - 0.17 * Math.exp(-(d * d) / 0.006) * Math.exp(-Math.pow((x + 0.4 * MEDIAL) / 0.7, 2))
        );
      }

      v.multiplyScalar(1 + 0.014 * ripple(x, y, z, 3.2, 1.1));
    },
  });

  const mesh = new THREE.Mesh(geometry, tissueMaterial({ color, roughness: 0.5, opacity }));
  mesh.name = 'spleen';

  return {
    object: mesh,
    /**
     * Where the splenic artery and vein meet the organ, in its own
     * coordinates. A scene that draws those vessels reads this rather than
     * retyping the position (architecture rule 1); one that placed the spleen
     * and the vessels independently is how they came apart.
     */
    hilum: new THREE.Vector3(0.55 * MEDIAL, 0.05, 0),
    anchors: {
      // Off the convex diaphragmatic side, where there is clear space.
      spleen: new THREE.Vector3(-1.35 * MEDIAL, 1.05, 0.5),
      // Just off the notch and in front of it. The hilum is a recess, so its
      // label has to stand outside the organ — but out at 1.55 it floated a
      // full unit clear of any surface, twice as far as every other label
      // here, and now that the splenic vessels run medially it would have sat
      // on them. Forward of them instead.
      hilum: new THREE.Vector3(1.05 * MEDIAL, 0.1, 0.62),
      pulp: new THREE.Vector3(-0.7 * MEDIAL, -0.85, 0.6),
    },
  };
}
