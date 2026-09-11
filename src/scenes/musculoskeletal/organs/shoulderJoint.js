import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The shoulder: a ball on a saucer, and the sleeve of tendon that holds it on.
 *
 * The second joint here, and the opposite problem from the knee. A knee is a
 * hinge held by ligaments; a shoulder is the least constrained joint in the
 * body, and almost nothing about it is bone. The glenoid takes about a third of
 * the humeral head, the capsule is loose, and what keeps the head centred is
 * four tendons wrapped round it. So this scene draws the **cuff** as carefully
 * as it draws the bones, and the arch over the top of it — because the space
 * between the cuff and that arch is the one every shoulder complaint is about.
 *
 * ## A right shoulder, from in front
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right shoulder **medial** — towards the midline, where the scapula and
 * the sternal end of the clavicle are — is +x, and the humerus is at −x. Every
 * side here comes from `MEDIAL`.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, angle, thickness or
 * attachment footprint is a measurement**, and nothing here moves: the joint is
 * drawn at one position, with the arm at the side.
 */

/** Which way medial is, in a right shoulder seen from in front. */
export const MEDIAL = 1;

/**
 * How much room is drawn between the cuff and the acromion above it.
 *
 * **A display value, not an anatomical one.** In life the subacromial space is
 * a few millimetres against a humeral head of several centimetres — draw it to
 * scale here and the tendon under the arch is a line nobody can see or click.
 * It is opened up until the tendon reads, and every place this model is
 * described says so. Nothing is computed from it; it is what the acromion's
 * height was chosen to leave.
 */
export const SUBACROMIAL_DISPLAY_GAP = 0.1;

/** The points everything in this file is placed from. */
export const SITES = Object.freeze({
  /** The centre of the glenoid face — the socket the head sits on. */
  glenoid: [MEDIAL * 0.3, 0.12, -0.02],
  /** The centre of the humeral head. */
  humeralHead: [-MEDIAL * 0.18, 0.2, 0.02],
  /** The lateral bump the three posterior cuff tendons end on. */
  greaterTubercle: [-MEDIAL * 0.6, 0.34, 0.04],
  /** The anterior bump subscapularis ends on. */
  lesserTubercle: [-MEDIAL * 0.22, 0.32, 0.44],
  /** Between the two, where the long head of biceps runs. */
  bicipitalGroove: [-MEDIAL * 0.38, 0.3, 0.48],
  /** The tip of the coracoid, and the undersurface of the acromion: the two
   *  ends of the arch the cuff passes under. */
  coracoidTip: [MEDIAL * 0.16, 0.7, 0.54],
  acromionUnder: [-MEDIAL * 0.14, 1.02, 0.08],
  /** Where the clavicle meets the acromion. */
  acromioclavicular: [-MEDIAL * 0.12, 1.18, 0.06],
});

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildShoulderJoint({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'shoulder-joint';
  const disposables = [];
  const index = new Map();
  const site = (id) => new THREE.Vector3(...SITES[id]);

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const bone = (id, geometry, position, color = '#ece7d8') => {
    const material = mineralMaterial({ color: colors[id] ?? color, roughness: 0.68 });
    disposables.push(geometry, material);
    const mesh = add(id, new THREE.Mesh(geometry, material));
    if (position) mesh.position.set(...position);
    return mesh;
  };

  /** A cord between points, optionally flattened across its run. */
  const cord = (
    id,
    points,
    radius,
    color,
    { material = wallMaterial, flatten = 1, axis = 'x', radial = 12, steps = 44, cordOpacity = opacity } = {}
  ) => {
    const curve = smoothCurve(points);
    const surface = new TubeSurface(curve, {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    if (flatten !== 1) flattenTube(surface, axis, flatten);
    const built = material({ color: colors[id] ?? color, opacity: cordOpacity });
    disposables.push(surface, built);
    const mesh = add(id, new THREE.Mesh(surface.geometry, built));
    return { mesh, curve };
  };

  // --- the bones ------------------------------------------------------------

  // The scapula: a thin triangular plate on the back of the chest wall, drawn
  // with its long axis running down and towards the midline. It is a plate, not
  // a block — almost everything attached to the shoulder is attached to it.
  const scapula = bone(
    'scapula',
    shapedSphere({
      detail: 5,
      scale: [0.92, 1.05, 0.1],
      warp: (v) => {
        // Wide above, drawn down to the inferior angle below.
        v.x *= 1 - 0.62 * smoothstep(0.1, -1, v.y);
        // Thickened along the lateral border, which is the one that carries the
        // glenoid and takes the load.
        v.z *= 1 + 0.9 * smoothstep(0.3, -1, v.x * MEDIAL);
      },
    }),
    [MEDIAL * 1.06, -0.5, -0.56],
    '#e0d3b0'
  );
  // Turned so its lateral border comes forward, the way a scapula lies on a
  // curved chest wall. Drawn flat it stands behind the socket with a gap in
  // between, and the glenoid looks like a dish somebody left there.
  scapula.rotation.y = MEDIAL * 0.45;

  // The spine of the scapula running out to the acromion, and the acromion
  // itself: the shelf that stands over the head of the humerus.
  cord(
    'acromion',
    [
      [MEDIAL * 1.9, 0.3, -0.6],
      [MEDIAL * 1.2, 0.56, -0.6],
      [MEDIAL * 0.62, 0.9, -0.5],
      [MEDIAL * 0.18, 1.12, -0.2],
      [-MEDIAL * 0.2, 1.16, 0.1],
    ],
    (u) => 0.11 + 0.1 * smoothstep(0.45, 1, u),
    '#ded7c0',
    { material: mineralMaterial, flatten: 0.55, axis: 'y', radial: 16, steps: 36 }
  );

  // The coracoid: a hook off the front of the scapula, pointing forward and out.
  // The other end of the arch, and the anchor for three of the ligaments here.
  const coracoid = new TubeSurface(
    smoothCurve([
      [MEDIAL * 0.72, 0.3, -0.24],
      [MEDIAL * 0.66, 0.64, 0.04],
      [MEDIAL * 0.44, 0.72, 0.34],
      [...SITES.coracoidTip],
    ]),
    { radius: (u) => 0.14 - 0.04 * u, steps: 28, radial: 14 }
  );
  const coracoidMaterial = mineralMaterial({ color: colors['coracoid-process'] ?? '#ded7c0', roughness: 0.68 });
  disposables.push(coracoid, coracoidMaterial);
  add('coracoid-process', new THREE.Mesh(coracoid.geometry, coracoidMaterial));

  // The clavicle: the only bone joining the whole shoulder to the trunk. Its
  // S-curve is the reason it is drawn as a curve rather than a strut.
  const clavicle = new TubeSurface(
    smoothCurve([
      [MEDIAL * 2.15, 0.96, 0.6],
      [MEDIAL * 1.5, 1.12, 0.72],
      [MEDIAL * 0.75, 1.2, 0.42],
      [MEDIAL * 0.28, 1.21, 0.16],
      [...SITES.acromioclavicular],
    ]),
    { radius: (u) => 0.16 - 0.05 * smoothstep(0.4, 1, u), steps: 36, radial: 16 }
  );
  const clavicleMaterial = mineralMaterial({ color: colors.clavicle ?? '#e6e0cd', roughness: 0.68 });
  disposables.push(clavicle, clavicleMaterial);
  add('clavicle', new THREE.Mesh(clavicle.geometry, clavicleMaterial));

  /** The head: a ball, and about a third of it is ever on the socket. */
  const headGeometry = (inflate = 0) =>
    shapedSphere({
      detail: 6,
      scale: [0.48, 0.5, 0.48],
      warp: (v) => {
        // Cut away below and laterally, where the head becomes the neck.
        const down = smoothstep(-0.25, -1, v.y);
        v.y += 0.3 * down;
        // The articular surface faces medially and upwards — towards the
        // glenoid — and that is the only part the cartilage covers.
        if (inflate) {
          const facing = Math.max(smoothstep(0.35, 0.95, v.x * MEDIAL), smoothstep(0.5, 1, v.y));
          v.multiplyScalar(1 + inflate * facing - 0.04 * (1 - facing));
        }
      },
    });
  bone('humeral-head', headGeometry(), SITES.humeralHead, '#e2b06a');

  bone(
    'greater-tubercle',
    shapedSphere({ detail: 4, scale: [0.2, 0.26, 0.3] }),
    SITES.greaterTubercle,
    '#d69a54'
  );
  bone(
    'lesser-tubercle',
    shapedSphere({ detail: 4, scale: [0.15, 0.2, 0.17] }),
    SITES.lesserTubercle,
    '#d69a54'
  );

  const shaft = new TubeSurface(
    smoothCurve([
      [-MEDIAL * 0.32, -0.12, 0.06],
      [-MEDIAL * 0.42, -0.9, 0.06],
      [-MEDIAL * 0.5, -1.8, 0.06],
      [-MEDIAL * 0.54, -2.6, 0.06],
    ]),
    { radius: (u) => 0.34 - 0.12 * smoothstep(0, 0.5, u), steps: 32, radial: 20 }
  );
  const shaftMaterial = mineralMaterial({ color: colors['humeral-shaft'] ?? '#ece7d8', roughness: 0.68 });
  disposables.push(shaft, shaftMaterial);
  add('humeral-shaft', new THREE.Mesh(shaft.geometry, shaftMaterial));

  // --- the socket, and what deepens it -------------------------------------
  //
  // The glenoid is drawn as its own dish rather than as a face of the scapula,
  // because "how much of the head is ever on it" is the question this scene is
  // asked, and a face of a plate cannot be pointed at.
  const glenoidGeometry = (inflate = 0) =>
    shapedSphere({
      detail: 5,
      scale: [0.1, 0.36, 0.27],
      warp: (v) => {
        // Pear-shaped: narrower above than below.
        v.z *= 1 - 0.3 * smoothstep(0, 1, v.y);
        if (inflate) v.x -= MEDIAL * inflate * smoothstep(0.1, -0.9, v.x * MEDIAL);
      },
    });
  bone('glenoid', glenoidGeometry(), SITES.glenoid, '#c78f5e');

  // The labrum: a rim of fibrocartilage round the socket, deepening it. The
  // shoulder's answer to a meniscus, and the biceps tendon grows out of it.
  const labrum = [];
  for (let i = 0; i <= 48; i += 1) {
    const t = (i / 48) * Math.PI * 2;
    labrum.push([
      SITES.glenoid[0] - MEDIAL * 0.04,
      SITES.glenoid[1] + Math.cos(t) * 0.38,
      SITES.glenoid[2] + Math.sin(t) * 0.29 * (1 - 0.18 * smoothstep(-1, 1, Math.cos(t))),
    ]);
  }
  cord('glenoid-labrum', labrum, 0.07, '#c9a3d8', { material: tissueMaterial, radial: 10, steps: 60 });

  // --- what covers the two surfaces ----------------------------------------
  const cartilageMaterial = tissueMaterial({
    color: colors['articular-cartilage'] ?? '#cfe6ea',
    roughness: 0.25,
    opacity: 0.26,
    emissiveIntensity: 0.1,
  });
  disposables.push(cartilageMaterial);
  const cartilage = [];
  const glaze = (name, geometry, position) => {
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, cartilageMaterial);
    mesh.position.set(...position);
    mesh.name = name;
    object.add(mesh);
    cartilage.push(mesh);
  };
  glaze('humeral-cartilage', headGeometry(0.05), SITES.humeralHead);
  glaze('glenoid-cartilage', glenoidGeometry(0.05), SITES.glenoid);
  index.set('articular-cartilage', cartilage[0]);

  // --- the rotator cuff -----------------------------------------------------
  //
  // Four tendons from four faces of the scapula, wrapping round the head and
  // ending on the two tubercles. Drawn as straps rather than cords: the cuff is
  // a sleeve, and what it does — hold the head on the socket while the big
  // muscles move the arm — only reads if it looks like one.
  // `flatten` squeezes, it does not widen: a cuff tendon is a sheet lying on
  // the head, so it is wide across its run and thin through it. Squeezing the
  // wrong way round — which the first version did — gives a tendon taller than
  // the acromion it is supposed to pass under.
  const cuff = (id, points, color, flatten = 0.5, axis = 'y') =>
    cord(id, points, (u) => 0.15 - 0.05 * smoothstep(0.55, 1, u), color, {
      material: tissueMaterial,
      flatten,
      axis,
      radial: 14,
    });

  cuff(
    'supraspinatus-tendon',
    [
      [MEDIAL * 1.1, 0.5, -0.44],
      [MEDIAL * 0.55, 0.68, -0.26],
      [MEDIAL * 0.02, 0.74, -0.06],
      [-MEDIAL * 0.42, 0.58, 0.02],
    ],
    '#d9705e'
  );
  cuff(
    'infraspinatus-tendon',
    [
      [MEDIAL * 1.05, 0.02, -0.66],
      [MEDIAL * 0.5, 0.24, -0.58],
      [-MEDIAL * 0.02, 0.38, -0.42],
      [-MEDIAL * 0.48, 0.4, -0.22],
    ],
    '#c25a4e'
  );
  cuff(
    'teres-minor-tendon',
    [
      [MEDIAL * 0.95, -0.5, -0.62],
      [MEDIAL * 0.45, -0.28, -0.56],
      [-MEDIAL * 0.05, 0.02, -0.44],
      [-MEDIAL * 0.46, 0.12, -0.26],
    ],
    '#a8483e'
  );
  cuff(
    'subscapularis-tendon',
    [
      [MEDIAL * 1.1, -0.12, -0.18],
      [MEDIAL * 0.62, 0.14, 0.16],
      [MEDIAL * 0.18, 0.32, 0.42],
      [-MEDIAL * 0.18, 0.36, 0.52],
    ],
    '#e08a6a'
  );

  // The long head of biceps: it begins *inside* the joint, on the rim of the
  // socket, crosses the head and turns down the groove between the two
  // tubercles. Nothing else in the body takes that route.
  cord(
    'long-head-of-biceps-tendon',
    [
      [MEDIAL * 0.24, 0.48, -0.06],
      [MEDIAL * 0.02, 0.62, 0.22],
      [-MEDIAL * 0.22, 0.5, 0.46],
      [...SITES.bicipitalGroove],
      [-MEDIAL * 0.44, -0.5, 0.42],
      [-MEDIAL * 0.5, -1.2, 0.36],
    ],
    0.075,
    '#e8c04a',
    { material: wallMaterial, steps: 56 }
  );

  // --- the ligaments --------------------------------------------------------
  const ligament = (id, points, radius, color, flatten = 1, axis = 'x') =>
    cord(id, points, radius, color, { material: wallMaterial, flatten, axis });

  // The arch: coracoid to acromion, over the top of the cuff. The gap under it
  // is the subacromial space, and it is a gap rather than a structure.
  ligament(
    'coracoacromial-ligament',
    [site('coracoidTip').toArray(), [MEDIAL * 0.02, 0.82, 0.3], site('acromionUnder').toArray()],
    0.12,
    '#8fbf96',
    0.6,
    'y'
  );
  ligament(
    'acromioclavicular-ligament',
    [
      [MEDIAL * 0.14, 1.22, 0.08],
      [MEDIAL * 0.02, 1.26, 0.06],
      [-MEDIAL * 0.16, 1.23, 0.06],
    ],
    0.1,
    '#6ea87a',
    0.65,
    'y'
  );
  // Coracoid to clavicle: the pair that actually carries the weight of the arm
  // across to the clavicle, which is why an acromioclavicular injury is graded
  // by whether these two are torn.
  ligament(
    'coracoclavicular-ligament',
    [
      [MEDIAL * 0.66, 0.5, 0.0],
      [MEDIAL * 0.72, 0.84, 0.2],
      [MEDIAL * 0.78, 1.16, 0.36],
    ],
    0.12,
    '#6ea87a',
    0.6,
    'z'
  );
  // The sling under the head: slack with the arm down, tight overhead, and the
  // structure an anterior dislocation strips off the rim.
  ligament(
    'inferior-glenohumeral-ligament',
    [
      [MEDIAL * 0.26, -0.26, 0.06],
      [MEDIAL * 0.05, -0.46, 0.26],
      [-MEDIAL * 0.24, -0.3, 0.3],
    ],
    0.12,
    '#9ec8e8',
    0.6,
    'y'
  );

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    /** One structure, two meshes: the head's surface and the socket's. */
    cartilageMeshes: cartilage,
    anchorPoints: Object.fromEntries(
      Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])
    ),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
