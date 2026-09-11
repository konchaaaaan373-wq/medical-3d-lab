import * as THREE from 'three';
import { latheFromProfile, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The hip: a ball in a deep socket, and why that changes everything.
 *
 * The third joint here, and it sits between the other two. The shoulder gives
 * up stability for range; the knee gives up range for stability; the hip is the
 * one joint that gets a usable amount of both, and the reason is that its
 * socket is **deep** — the acetabulum wraps past the equator of the head, so
 * the head cannot leave without the socket breaking or the leg being levered.
 * Everything else about the hip follows from that and from one other fact: the
 * head is held out on a **neck**, at an angle, so body weight does not pass
 * down the middle of the bone that carries it.
 *
 * ## A right hip, from in front
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right hip **medial** — towards the midline, where the pubis is — is +x,
 * and the femur is at −x. Every side here comes from `MEDIAL`.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, angle, thickness or
 * attachment footprint is a measurement** — the neck-shaft angle here is drawn
 * to read, not measured — and nothing moves: the joint is drawn at one
 * position, standing.
 */

/** Which way medial is, in a right hip seen from in front. */
export const MEDIAL = 1;

/** The points everything in this file is placed from. */
export const SITES = Object.freeze({
  /** The centre of the socket, and of the ball in it — they are the same point,
   *  which is the difference between this joint and the shoulder. */
  acetabulum: [MEDIAL * 0.34, 0.36, 0.0],
  femoralHead: [MEDIAL * 0.34, 0.36, 0.0],
  /** Where the neck meets the shaft, out and down from the head. */
  greaterTrochanter: [-MEDIAL * 0.82, 0.12, -0.04],
  lesserTrochanter: [-MEDIAL * 0.42, -0.48, -0.24],
  /** The anterior inferior iliac spine: the top of the strongest ligament. */
  iliacSpine: [MEDIAL * 0.66, 0.94, 0.34],
  /** The line the front of the capsule ends on. */
  intertrochantericLine: [-MEDIAL * 0.62, -0.08, 0.22],
});

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildHipJoint({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'hip-joint';
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

  // --- the socket side ------------------------------------------------------
  //
  // The hip bone: ilium above, pubis in front and below, ischium behind and
  // below, drawn as one plate because they fuse into one and the acetabulum is
  // where all three meet.
  const hipBone = bone(
    'hip-bone',
    shapedSphere({
      detail: 5,
      scale: [0.3, 0.95, 0.66],
      warp: (v) => {
        // A blade, not an egg: the iliac wing fans out above and thins as it
        // goes, and the bone narrows below towards the pubis and the ischium.
        const up = smoothstep(-0.1, 1, v.y);
        v.z *= 1 + 0.85 * up;
        v.x *= 1 - 0.45 * up;
        // The crest is an edge, not a point: a sphere converges at its pole, so
        // the top has to be pushed down and out or the iliac wing is a cone.
        v.y *= 1 - 0.42 * smoothstep(0.45, 1, v.y);
        v.z *= 1 + 0.5 * smoothstep(0.5, 1, v.y);
        v.z *= 1 - 0.35 * smoothstep(-0.2, -1, v.y);
        // Thickened low down, where the three bones meet and the socket is cut
        // into them.
        v.x *= 1 + 0.9 * smoothstep(0.1, -0.7, v.y) * Math.exp(-Math.pow(v.z / 0.7, 2));
      },
    }),
    [MEDIAL * 0.95, 0.62, -0.2],
    '#e0d3b0'
  );
  // Turned so the socket faces out, down and a little forward, which is the
  // direction it faces and the reason the leg is levered out of it rather than
  // pulled out of it.
  hipBone.rotation.y = -MEDIAL * 0.3;

  /**
   * The socket, as its own cup.
   *
   * **A hemisphere and more.** The rim reaches past the equator of the head, so
   * what is drawn is a cup and not a dish — and the difference is the whole
   * difference between this joint and the shoulder. A sphere warped into a bowl
   * cannot say that: it has no rim and no inside. A lathe can, so the cup is a
   * swept shell, open laterally where the head goes in, with a wall of its own.
   */
  const HEAD_RADIUS = 0.4;
  const CUP_INNER = 0.48;
  const CUP_OUTER = 0.57;
  /** How far past the closed pole the rim reaches. Beyond 90° it grips. */
  const CUP_SWEEP = (116 * Math.PI) / 180;

  const cupGeometry = (inner, outer) => {
    const profile = [];
    const steps = 30;
    for (let i = 0; i <= steps; i += 1) {
      const angle = (CUP_SWEEP * i) / steps;
      profile.push([outer * Math.sin(angle), -outer * Math.cos(angle)]);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const angle = (CUP_SWEEP * i) / steps;
      profile.push([inner * Math.sin(angle), -inner * Math.cos(angle)]);
    }
    const geometry = latheFromProfile(profile, { segments: 72, radial: 44 });
    // Lathed about +y and opening that way; turned so it opens laterally,
    // which is the direction a hip socket faces.
    geometry.rotateZ((MEDIAL * Math.PI) / 2);
    return geometry;
  };
  bone('acetabulum', cupGeometry(CUP_INNER, CUP_OUTER), SITES.acetabulum, '#c78f5e');

  // The labrum: a rim round the mouth of the cup, placed from the same sweep
  // the cup was built with rather than from a number that happens to match.
  const rimX = MEDIAL * CUP_INNER * Math.cos(CUP_SWEEP);
  const rimRadius = CUP_INNER * Math.sin(CUP_SWEEP);
  const labrum = [];
  for (let i = 0; i <= 52; i += 1) {
    const t = (i / 52) * Math.PI * 2;
    labrum.push([
      SITES.acetabulum[0] + rimX,
      SITES.acetabulum[1] + Math.cos(t) * rimRadius,
      SITES.acetabulum[2] + Math.sin(t) * rimRadius,
    ]);
  }
  cord('acetabular-labrum', labrum, 0.075, '#c9a3d8', { material: tissueMaterial, radial: 10, steps: 64 });

  // --- the femur ------------------------------------------------------------
  const headGeometry = (radius) =>
    shapedSphere({
      detail: 6,
      scale: [radius, radius, radius],
      warp: (v) => {
        // The fovea: the dimple on the medial surface that the ligament of the
        // head comes out of, facing the floor of the socket.
        v.x -= MEDIAL * 0.16 * Math.exp(-Math.pow((v.x * MEDIAL - 1) / 0.35, 2));
      },
    });
  bone('femoral-head', headGeometry(HEAD_RADIUS), SITES.femoralHead, '#e2b06a');

  // The neck: the hip's weak point, and the reason it has one. Weight comes
  // down the pelvis into a ball held out sideways on a strut.
  const neck = new TubeSurface(
    smoothCurve([
      [MEDIAL * 0.16, 0.3, -0.01],
      [-MEDIAL * 0.24, 0.22, -0.02],
      [-MEDIAL * 0.6, 0.06, -0.03],
      [-MEDIAL * 0.84, -0.08, -0.04],
    ]),
    { radius: (u) => 0.23 + 0.12 * smoothstep(0.55, 1, u), steps: 30, radial: 18 }
  );
  const neckMaterial = mineralMaterial({ color: colors['femoral-neck'] ?? '#d8c8a0', roughness: 0.68 });
  disposables.push(neck, neckMaterial);
  add('femoral-neck', new THREE.Mesh(neck.geometry, neckMaterial));

  bone(
    'greater-trochanter',
    shapedSphere({
      detail: 4,
      scale: [0.26, 0.42, 0.3],
      warp: (v) => {
        v.y += 0.25 * smoothstep(0.1, 1, v.y);
      },
    }),
    SITES.greaterTrochanter,
    '#d69a54'
  );
  bone(
    'lesser-trochanter',
    shapedSphere({ detail: 4, scale: [0.17, 0.2, 0.16] }),
    SITES.lesserTrochanter,
    '#c4853f'
  );

  const shaft = new TubeSurface(
    smoothCurve([
      [-MEDIAL * 0.78, -0.26, -0.04],
      [-MEDIAL * 0.86, -0.9, 0.0],
      [-MEDIAL * 0.92, -1.6, 0.04],
      [-MEDIAL * 0.98, -2.3, 0.04],
    ]),
    { radius: (u) => 0.36 - 0.12 * smoothstep(0, 0.45, u), steps: 32, radial: 20 }
  );
  const shaftMaterial = mineralMaterial({ color: colors['femoral-shaft'] ?? '#ece7d8', roughness: 0.68 });
  disposables.push(shaft, shaftMaterial);
  add('femoral-shaft', new THREE.Mesh(shaft.geometry, shaftMaterial));

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
  // The head is articular nearly all over — it lives inside a cup — and the
  // cup is lined on the inside. The two layers meet where the two bones do.
  glaze('femoral-cartilage', headGeometry(HEAD_RADIUS + 0.04), SITES.femoralHead);
  // Neither surface of the lining may sit exactly on another: the cup's own
  // inner wall is at CUP_INNER and the head's glaze at HEAD_RADIUS + 0.04, and
  // two coincident surfaces fight for pixels along the whole rim.
  glaze('acetabular-cartilage', cupGeometry(HEAD_RADIUS + 0.055, CUP_INNER - 0.008), SITES.acetabulum);
  index.set('articular-cartilage', cartilage[0]);

  // --- inside the joint -----------------------------------------------------
  //
  // The ligament of the head runs from the floor of the socket to the dimple on
  // the head. It holds nothing; it carries a small vessel, and in a child that
  // vessel matters.
  cord(
    'ligament-of-the-head',
    [
      [SITES.acetabulum[0] + MEDIAL * (CUP_INNER - 0.02), 0.3, 0.0],
      [SITES.acetabulum[0] + MEDIAL * 0.46, 0.31, 0.0],
      [SITES.femoralHead[0] + MEDIAL * (HEAD_RADIUS - 0.13), 0.32, 0.0],
    ],
    0.055,
    '#9ec8e8',
    { steps: 24, radial: 10 }
  );

  // --- the capsular ligaments ----------------------------------------------
  //
  // Three thickenings of one capsule, named for where they come from, and drawn
  // as bands: the capsule itself is not drawn, because a bag round the joint
  // hides everything this scene exists to show.
  const ligament = (id, points, radius, color, flatten = 0.55, axis = 'z') =>
    cord(id, points, radius, color, { flatten, axis, steps: 40 });

  // The iliofemoral: the strongest ligament in the body, and the one that lets
  // a person stand without using the hip muscles — it tightens as the hip
  // straightens, so standing hangs on it.
  ligament(
    'iliofemoral-ligament',
    [
      site('iliacSpine').toArray(),
      [MEDIAL * 0.18, 0.52, 0.46],
      [-MEDIAL * 0.28, 0.18, 0.4],
      site('intertrochantericLine').toArray(),
    ],
    0.11,
    '#7fb98a'
  );
  ligament(
    'pubofemoral-ligament',
    [
      [MEDIAL * 0.9, -0.34, 0.3],
      [MEDIAL * 0.3, -0.3, 0.36],
      [-MEDIAL * 0.34, -0.22, 0.24],
    ],
    0.11,
    '#5ea06c'
  );
  ligament(
    'ischiofemoral-ligament',
    [
      [MEDIAL * 0.82, -0.16, -0.48],
      [MEDIAL * 0.2, 0.06, -0.44],
      [-MEDIAL * 0.5, 0.18, -0.3],
    ],
    0.11,
    '#4f8f60'
  );

  // --- the two tendons that explain the two trochanters --------------------
  cord(
    'gluteus-medius-tendon',
    [
      [MEDIAL * 0.62, 1.06, -0.4],
      [MEDIAL * 0.06, 0.72, -0.32],
      [-MEDIAL * 0.5, 0.42, -0.18],
      [-MEDIAL * 0.82, 0.3, -0.08],
    ],
    (u) => 0.16 - 0.05 * smoothstep(0.5, 1, u),
    '#d9705e',
    { material: tissueMaterial, flatten: 0.5, axis: 'y', radial: 14 }
  );
  cord(
    'iliopsoas-tendon',
    [
      [MEDIAL * 0.74, 1.18, 0.3],
      [MEDIAL * 0.6, 0.4, 0.42],
      [MEDIAL * 0.16, -0.22, 0.3],
      [-MEDIAL * 0.36, -0.46, -0.1],
      [...SITES.lesserTrochanter],
    ],
    (u) => 0.15 - 0.05 * smoothstep(0.5, 1, u),
    '#e08a6a',
    { material: tissueMaterial, flatten: 0.55, axis: 'z', radial: 14, steps: 48 }
  );

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    /** One structure, two meshes: the ball's surface and the cup's. */
    cartilageMeshes: cartilage,
    anchorPoints: Object.fromEntries(
      Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])
    ),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
