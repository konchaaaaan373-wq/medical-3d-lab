import * as THREE from 'three';
import { carveNamedParts } from '../../shared/anatomy/organParts.js';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The uterus and the tubes and ovaries beside it, cut into named parts.
 *
 * `uterus.js` draws a sectioned uterus whose lining thickens and sheds, because
 * that is what `uterine-cycle` needs. This is the other scale: the organ and its
 * neighbours as things a reader points at.
 *
 * ## The cavity is why this scene exists
 *
 * Fundus, body, isthmus and cervix are four names for four stretches of one
 * wall. What is worth a scene is what is *inside* them: the **cavity** is a
 * flattened triangle, not a bag — its two upper corners are where the tubes
 * open in and its lower corner is where the cervical canal starts, which is the
 * shape every intrauterine procedure and every hysterosalpingogram is read
 * against. It cannot be seen from outside, so the slider fades the wall.
 *
 * ## Drawn upright
 *
 * A uterus is normally anteverted and anteflexed — tipped forward on the
 * bladder and bent forward on itself. This one is drawn straight up, because
 * the scene is about which part is which and a tilted organ makes "above" and
 * "below" ambiguous. That is a departure and the copy says so.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Nothing here is measured.
 */

/** Where the wall stops being one named stretch and becomes the next. */
export const UTERUS_LEVELS = Object.freeze({
  /** Fundus above this — the part above where the tubes come in. */
  fundus: 0.52,
  /** The waist between body and cervix. */
  isthmus: -0.28,
  /** Cervix below this. */
  cervix: -0.46,
});

/** The corners of the cavity: two tubal openings and the internal os. */
export const CAVITY_CORNERS = Object.freeze({
  'right-tubal-ostium': [-0.42, 0.5, 0],
  'left-tubal-ostium': [0.42, 0.5, 0],
  'internal-os': [0, -0.3, 0],
});

/** A pear flattened front to back, with a waist above the cervix. */
function uterusWarp(v) {
  // Widest across the cornua, narrowing downwards.
  const down = smoothstep(0.45, -1, v.y);
  v.x *= 1 - 0.62 * down;
  v.z *= 1 - 0.55 * down;
  // The waist: a groove where the body becomes the cervix.
  const waist = Math.exp(-Math.pow((v.y + 0.42) / 0.16, 2));
  v.x *= 1 - 0.2 * waist;
  v.z *= 1 - 0.2 * waist;
  // The fundus is a broad dome between the two cornua, not a point. Lifting the
  // top instead — which is what this did first — made an egg balanced on an
  // organ, and a uterus is widest at the top rather than tallest there.
  v.y *= 1 - 0.16 * smoothstep(0.5, 1, v.y);
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, detail?: number }} [options]
 */
export function buildUterusParts({ colors = {}, opacity = 0.95, detail = 7 } = {}) {
  const object = new THREE.Group();
  object.name = 'uterus-parts';
  const disposables = [];

  const SCALE = [0.62, 1.05, 0.4];

  const wall = carveNamedParts({
    warp: uterusWarp,
    scale: [...SCALE],
    cacheKey: 'uterus',
    detail,
    opacity,
    parts: [
      {
        id: 'fundus',
        color: colors.fundus ?? '#d193a6',
        planes: [{ through: [0, UTERUS_LEVELS.fundus, 0], normal: [0, -1, 0] }],
      },
      {
        id: 'body',
        color: colors.body ?? '#c07f95',
        planes: [
          { through: [0, UTERUS_LEVELS.fundus, 0], normal: [0, 1, 0] },
          { through: [0, UTERUS_LEVELS.isthmus, 0], normal: [0, -1, 0] },
        ],
      },
      {
        id: 'isthmus',
        color: colors.isthmus ?? '#a96b81',
        planes: [
          { through: [0, UTERUS_LEVELS.isthmus, 0], normal: [0, 1, 0] },
          { through: [0, UTERUS_LEVELS.cervix, 0], normal: [0, -1, 0] },
        ],
      },
      {
        id: 'cervix',
        color: colors.cervix ?? '#8f566c',
        planes: [{ through: [0, UTERUS_LEVELS.cervix, 0], normal: [0, 1, 0] }],
      },
    ],
  });
  object.add(wall.object);

  // The cavity: a flattened triangle between the two tubal openings and the
  // internal os. Like the bladder's trigone it is a *region*, not a solid, and
  // it has no thickness here.
  const corner = (id) => new THREE.Vector3(...CAVITY_CORNERS[id]);
  const cavityGeometry = new THREE.BufferGeometry();
  cavityGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [corner('right-tubal-ostium'), corner('left-tubal-ostium'), corner('internal-os')].flatMap((point) =>
        point.toArray()
      ),
      3
    )
  );
  cavityGeometry.computeVertexNormals();
  const cavityMaterial = mucosaMaterial({ color: colors['uterine-cavity'] ?? '#e8b06a' });
  cavityMaterial.side = THREE.DoubleSide;
  const cavity = new THREE.Mesh(cavityGeometry, cavityMaterial);
  cavity.name = 'uterine-cavity';
  disposables.push(cavityGeometry, cavityMaterial);
  object.add(cavity);

  // The canal that continues from its lower corner, through the cervix.
  const canalSurface = new TubeSurface(
    smoothCurve([corner('internal-os').toArray(), [0, -0.62, 0], [0, -0.95, 0]]),
    { radius: () => 0.055, steps: 24, radial: 12 }
  );
  const canalMaterial = mucosaMaterial({ color: colors['cervical-canal'] ?? '#e8b06a' });
  const canal = new THREE.Mesh(canalSurface.geometry, canalMaterial);
  canal.name = 'cervical-canal';
  disposables.push(canalSurface, canalMaterial);
  object.add(canal);

  // A tube on each side: narrow at the uterus, wide in the ampulla, open at the
  // fimbriated end. The narrow-then-wide-then-open shape is the whole point —
  // it is where fertilisation happens and where an ectopic pregnancy sits.
  const tubes = [];
  const ovaries = [];
  for (const [id, sign] of [
    ['right-fallopian-tube', -1],
    ['left-fallopian-tube', 1],
  ]) {
    const ostium = corner(sign > 0 ? 'left-tubal-ostium' : 'right-tubal-ostium');
    const curve = smoothCurve([
      ostium.toArray(),
      [sign * 0.78, 0.72, 0.04],
      [sign * 1.18, 0.86, 0.02],
      [sign * 1.46, 0.6, -0.04],
      [sign * 1.5, 0.24, -0.06],
    ]);
    const surface = new TubeSurface(curve, {
      // Isthmus narrow, ampulla wide, infundibulum flaring open.
      radius: (u) => 0.035 + 0.055 * Math.exp(-Math.pow((u - 0.55) / 0.28, 2)) + 0.075 * Math.pow(Math.max(0, u - 0.86) / 0.14, 2),
      steps: 60,
      radial: 14,
    });
    const material = wallMaterial({ color: colors[id] ?? '#d9a0ad', opacity });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = id;
    disposables.push(surface, material);
    object.add(mesh);
    tubes.push([id, mesh]);

    // The ovary the fimbriated end reaches towards. It is not attached to the
    // tube, and that gap is a real feature of this anatomy.
    const ovaryId = sign > 0 ? 'left-ovary' : 'right-ovary';
    const geometry = shapedSphere({ detail: 4, scale: [0.2, 0.3, 0.17] });
    const ovaryMaterial = tissueMaterial({ color: colors[ovaryId] ?? '#e0cdb4', roughness: 0.45 });
    const ovary = new THREE.Mesh(geometry, ovaryMaterial);
    // Clear of the tube's flared end. They read as close and they do not touch,
    // which is the relation: an ovum crosses a gap to get into the tube.
    ovary.position.set(sign * 1.8, -0.06, -0.1);
    ovary.name = ovaryId;
    disposables.push(geometry, ovaryMaterial);
    object.add(ovary);
    ovaries.push([ovaryId, ovary]);
  }

  // The vagina as a short cuff around the cervix. Context, and it is what makes
  // the cervix's lower end an opening into somewhere rather than a stump.
  const vaginaSurface = new TubeSurface(
    // Starting above the end of the cervix, so it sleeves it rather than
    // standing below it as a separate cylinder.
    smoothCurve([
      [0, -0.58, 0],
      [0, -1.0, 0.02],
      [0, -1.45, 0.04],
    ]),
    { radius: (u) => 0.32 - 0.09 * u, steps: 24, radial: 18 }
  );
  const vaginaMaterial = wallMaterial({ color: colors.vagina ?? '#c9909b', opacity: 0.6 });
  const vagina = new THREE.Mesh(vaginaSurface.geometry, vaginaMaterial);
  vagina.name = 'vagina';
  disposables.push(vaginaSurface, vaginaMaterial);
  object.add(vagina);

  const index = new Map([
    ...wall.parts.map((part) => [part.id, part.mesh]),
    ['uterine-cavity', cavity],
    ['cervical-canal', canal],
    ...tubes,
    ...ovaries,
    ['vagina', vagina],
  ]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    wall,
    anchors: {
      fundus: new THREE.Vector3(0, 1.5, 0.4),
      cervix: new THREE.Vector3(-0.75, -0.7, 0.4),
      cavity: new THREE.Vector3(0, 0.3, -1.1),
    },
    dispose() {
      wall.dispose();
      for (const item of disposables) item.dispose?.();
    },
  };
}
