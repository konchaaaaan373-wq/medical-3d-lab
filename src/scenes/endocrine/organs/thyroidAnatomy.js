import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The thyroid gland and what surrounds it, as separately named solids.
 *
 * `organs/thyroid.js` draws one gland with follicles inside it, which is what
 * `thyroid-hormone` needs: there the subject is what the follicles make, and
 * the lobes are scenery. This is the other scale — the gland as a thing a
 * reader points at — so every part is its own closed mesh with its own
 * material, and the structures that make thyroid anatomy *matter* are here:
 * the parathyroids behind it, the recurrent laryngeal nerves in the groove
 * beside it, and the trachea it is wrapped around.
 *
 * The two files are not two thyroids. They are one organ at two scales, and
 * the lobe shape below is deliberately the same warp, so a reader who has seen
 * one recognises the other.
 *
 * ## What is schematic, and it is most of it
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED, and nothing here is measured. What
 * the model does claim is **arrangement**: two lobes joined across the front of
 * the trachea by an isthmus; four parathyroid glands on the posterior surface,
 * two upper and two lower; a recurrent laryngeal nerve on each side running up
 * in the groove between the trachea and the oesophagus, behind the gland,
 * where it is at risk in a thyroidectomy. The pyramidal lobe is drawn because
 * it is present in roughly half of people — which the copy says, because a
 * model that always draws it is claiming it is always there.
 */

/** Which way the patient's left is (`docs/architecture-rules.md` rule 5). */
const LEFT = 1;

/**
 * Half the distance between the two lobes' centres.
 *
 * Set against the trachea's radius rather than chosen: at 0.36 the two lobes
 * stood beside the airway with daylight between them and it, which is the one
 * thing the shape of this gland is not.
 */
const LOBE_OFFSET = 0.29;

/**
 * One lobe of the gland, hollowed where the trachea presses on it.
 *
 * @param {number} sign `+1` for the patient's left lobe
 */
export function thyroidLobeGeometry(sign) {
  return shapedSphere({
    detail: 7,
    scale: [0.31, 0.62, 0.42],
    warp: (v) => {
      // Superior pole tapers, inferior pole is blunt.
      const up = smoothstep(-0.1, 1, v.y);
      v.x *= 1 - 0.5 * up;
      v.z *= 1 - 0.45 * up;
      // The medial face is hollowed where the trachea sits.
      if (v.x * sign < 0) v.x += sign * 0.34 * Math.exp(-Math.pow(v.y / 0.7, 2));
    },
  });
}

/**
 * Where each parathyroid gland sits, on the back of its lobe.
 *
 * Posterior (−z, since the gland faces the reader at +z), the superior pair
 * high on the lobe and the inferior pair low. Their positions vary more than
 * almost anything else in the neck — which is the reason a surgeon looks for
 * them rather than knowing where they are — so these are four plausible
 * places, not four addresses.
 */
export const PARATHYROID_SITES = Object.freeze([
  { id: 'right-superior-parathyroid', at: [-LOBE_OFFSET - 0.1, 0.3, -0.22] },
  { id: 'left-superior-parathyroid', at: [LOBE_OFFSET + 0.1, 0.3, -0.22] },
  { id: 'right-inferior-parathyroid', at: [-LOBE_OFFSET - 0.06, -0.22, -0.26] },
  { id: 'left-inferior-parathyroid', at: [LOBE_OFFSET + 0.06, -0.22, -0.26] },
]);

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildThyroidParts({ colors = {}, opacity = 0.92 } = {}) {
  const object = new THREE.Group();
  object.name = 'thyroid-parts';
  const disposables = [];

  const glandMaterial = (id) =>
    tissueMaterial({
      color: colors[id] ?? '#b4565f',
      roughness: 0.42,
      opacity,
      emissiveIntensity: 0.07,
    });

  const lobe = (id, sign) => {
    const geometry = thyroidLobeGeometry(sign);
    const material = glandMaterial(id);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(sign * LOBE_OFFSET, 0, 0.02);
    mesh.name = id;
    disposables.push(geometry, material);
    return mesh;
  };

  const rightLobe = lobe('right-lobe', -LEFT);
  const leftLobe = lobe('left-lobe', LEFT);

  // Isthmus: a band across the front of the trachea, low. It is what makes the
  // gland one organ rather than two, and it is the part a tracheostomy has to
  // get past.
  const isthmusSurface = new TubeSurface(
    smoothCurve([
      [-0.34, -0.24, 0.16],
      [0, -0.26, 0.24],
      [0.34, -0.24, 0.16],
    ]),
    { radius: () => 0.13, steps: 24, radial: 14 }
  );
  const isthmusMaterial = glandMaterial('isthmus');
  const isthmus = new THREE.Mesh(isthmusSurface.geometry, isthmusMaterial);
  isthmus.name = 'isthmus';
  disposables.push(isthmusSurface, isthmusMaterial);

  // Pyramidal lobe: a finger running up from the isthmus, usually a little to
  // the patient's left, and present in about half of people.
  const pyramidalSurface = new TubeSurface(
    smoothCurve([
      [0.06, -0.2, 0.22],
      [0.08, 0.12, 0.2],
      [0.1, 0.46, 0.16],
    ]),
    { radius: (u) => 0.075 * (1 - 0.75 * u * u), steps: 24, radial: 12 }
  );
  const pyramidalMaterial = glandMaterial('pyramidal-lobe');
  const pyramidal = new THREE.Mesh(pyramidalSurface.geometry, pyramidalMaterial);
  pyramidal.name = 'pyramidal-lobe';
  disposables.push(pyramidalSurface, pyramidalMaterial);

  // Parathyroids: four, on the back of the gland.
  const parathyroids = [];
  for (const site of PARATHYROID_SITES) {
    const geometry = shapedSphere({ detail: 3, scale: [0.075, 0.06, 0.055] });
    const material = tissueMaterial({
      color: colors[site.id] ?? colors.parathyroid ?? '#d8a14a',
      roughness: 0.35,
      emissiveIntensity: 0.16,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...site.at);
    mesh.name = site.id;
    disposables.push(geometry, material);
    parathyroids.push({ id: site.id, mesh });
  }

  // The trachea the gland is wrapped around, and the oesophagus behind it. Both
  // are context, and both earn their place: without them the lobes' hollowed
  // medial faces are a dent in a shape, and the groove the nerves run in is
  // nothing at all.
  const tracheaSurface = new TubeSurface(
    smoothCurve([
      [0, -1.05, 0],
      [0, 0, 0.02],
      [0, 1.05, 0],
    ]),
    { radius: () => 0.24, steps: 40, radial: 22 }
  );
  const tracheaMaterial = wallMaterial({ color: colors.trachea ?? '#cfd6dd', opacity: 0.85 });
  const trachea = new THREE.Mesh(tracheaSurface.geometry, tracheaMaterial);
  trachea.name = 'trachea';
  disposables.push(tracheaSurface, tracheaMaterial);

  const oesophagusSurface = new TubeSurface(
    smoothCurve([
      [-0.02, -1.05, -0.38],
      [-0.02, 0, -0.4],
      [-0.02, 1.05, -0.4],
    ]),
    { radius: () => 0.19, steps: 40, radial: 18 }
  );
  const oesophagusMaterial = wallMaterial({ color: colors.oesophagus ?? '#c9a2a6', opacity: 0.8 });
  const oesophagus = new THREE.Mesh(oesophagusSurface.geometry, oesophagusMaterial);
  oesophagus.name = 'oesophagus';
  disposables.push(oesophagusSurface, oesophagusMaterial);

  // The recurrent laryngeal nerves, in the groove between those two — which is
  // why the oesophagus is drawn at all. Each runs up behind its own lobe.
  const nerve = (id, sign) => {
    const surface = new TubeSurface(
      smoothCurve([
        [sign * 0.2, -1.0, -0.26],
        [sign * 0.22, -0.4, -0.24],
        [sign * 0.21, 0.2, -0.22],
        [sign * 0.19, 0.8, -0.18],
      ]),
      { radius: () => 0.035, steps: 40, radial: 10 }
    );
    const material = tissueMaterial({
      color: colors[id] ?? colors.nerve ?? '#e8e08a',
      roughness: 0.3,
      emissiveIntensity: 0.2,
    });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = id;
    disposables.push(surface, material);
    return mesh;
  };
  const rightNerve = nerve('right-recurrent-laryngeal-nerve', -LEFT);
  const leftNerve = nerve('left-recurrent-laryngeal-nerve', LEFT);

  object.add(trachea, oesophagus, rightNerve, leftNerve, rightLobe, leftLobe, isthmus, pyramidal);
  for (const gland of parathyroids) object.add(gland.mesh);

  const index = new Map([
    ['right-lobe', rightLobe],
    ['left-lobe', leftLobe],
    ['isthmus', isthmus],
    ['pyramidal-lobe', pyramidal],
    ['trachea', trachea],
    ['oesophagus', oesophagus],
    ['right-recurrent-laryngeal-nerve', rightNerve],
    ['left-recurrent-laryngeal-nerve', leftNerve],
    ...parathyroids.map((gland) => [gland.id, gland.mesh]),
  ]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    anchors: {
      rightLobe: new THREE.Vector3(-0.95, 0.45, 0.45),
      leftLobe: new THREE.Vector3(0.95, 0.45, 0.45),
      isthmus: new THREE.Vector3(0, -0.75, 0.6),
      trachea: new THREE.Vector3(0, 1.35, 0.35),
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
