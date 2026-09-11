import * as THREE from 'three';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The foot and ankle: an arch, a bowstring under it, and a bone in a socket.
 *
 * The one fact worth three dimensions here is that **a foot is not a plate**.
 * It is an arch — high on the inside, low on the outside — and what holds the
 * arch up is not bone but a band of fibrous tissue slung from the heel to the
 * heads of the metatarsals. Take the band away and the arch has nothing to
 * stop it spreading. A drawing of a footprint cannot show that; a side view can
 * show the arch but not that it is only on one side.
 *
 * The second is the ankle itself: the **talus sits in a socket** made by the
 * two bones of the leg gripping it from both sides, and it is the one bone in
 * the body with no muscle attached to it at all — everything that moves it does
 * so by moving something else.
 *
 * ## A right foot, from the outside and above
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right foot **medial** — the big-toe side, towards the other foot — is
 * `+x`. `+y` is up from the ground and `+z` is forwards, towards the toes.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No bone length, arch height or
 * joint angle here is a measurement**, and nothing moves: no joint bends, no
 * arch flattens, no tendon pulls and no weight is borne.
 */

/** Which way the big-toe side is, in a right foot. */
export const MEDIAL = 1;

/**
 * How many world units a centimetre is.
 *
 * The foot is laid out in **centimetres**, because that is the unit its
 * proportions are known in. The finished group is then scaled down, because a
 * foot seen from the side is nearly thirty units long and the shared viewer
 * clamps the camera to **55 units from its target**
 * (`src/controls/createControls.js`). On a phone the framing asks for more
 * distance than that, gets 55, and crops the toes — with no error anywhere.
 * See F-90 in `docs/follow-ups.md`.
 */
export const WORLD_SCALE = 0.7;

/** The ground the foot stands on, and the two ends of the arch. */
export const GROUND = 0;

/**
 * The five rays of the foot, each as its own base, direction and bone lengths.
 *
 * **One table, four uses**: the metatarsals and all three rows of phalanges are
 * built from it (`docs/architecture-rules.md` rule 1). `middle` is `null` on the
 * great toe, which has two bones where every other toe has three — the same
 * arrangement as the thumb, and for the same reason.
 */
export const RAYS = Object.freeze([
  Object.freeze({
    id: 'hallux',
    base: [MEDIAL * 2.5, 3.0, 8.4],
    direction: [MEDIAL * 0.09, -0.21, 1],
    metatarsal: 6.0,
    proximal: 3.1,
    middle: null,
    distal: 1.9,
    calibre: 0.72,
  }),
  Object.freeze({
    id: 'second',
    base: [MEDIAL * 1.15, 2.9, 8.9],
    direction: [MEDIAL * 0.03, -0.2, 1],
    metatarsal: 6.6,
    proximal: 2.6,
    middle: 1.6,
    distal: 1.0,
    calibre: 0.48,
  }),
  Object.freeze({
    id: 'third',
    base: [MEDIAL * -0.05, 2.7, 8.8],
    direction: [MEDIAL * -0.02, -0.19, 1],
    metatarsal: 6.3,
    proximal: 2.5,
    middle: 1.5,
    distal: 1.0,
    calibre: 0.46,
  }),
  Object.freeze({
    id: 'fourth',
    base: [MEDIAL * -1.25, 2.4, 8.4],
    direction: [MEDIAL * -0.07, -0.17, 1],
    metatarsal: 5.9,
    proximal: 2.2,
    middle: 1.4,
    distal: 0.9,
    calibre: 0.44,
  }),
  Object.freeze({
    id: 'fifth',
    base: [MEDIAL * -2.35, 2.0, 7.4],
    direction: [MEDIAL * -0.13, -0.13, 1],
    metatarsal: 5.4,
    proximal: 1.8,
    middle: 1.2,
    distal: 0.9,
    calibre: 0.46,
  }),
]);

/** Where one bone of one ray starts and ends, or null if the ray has none. */
export function raySegment(ray, bone) {
  const order = ['metatarsal', 'proximal', 'middle', 'distal'];
  if (ray[bone] == null) return null;
  const d = ray.direction;
  const length = Math.hypot(d[0], d[1], d[2]);
  const unit = [d[0] / length, d[1] / length, d[2] / length];
  let start = 0;
  for (const name of order) {
    if (name === bone) {
      return {
        from: ray.base.map((v, i) => v + unit[i] * start),
        to: ray.base.map((v, i) => v + unit[i] * (start + ray[name])),
      };
    }
    if (ray[name] != null) start += ray[name] + 0.22;
  }
  return null;
}

/**
 * The tarsal bones, as a table of where each one sits.
 *
 * The `y` values are the arch: the navicular and the medial cuneiform ride high
 * on the inside, the cuboid sits low on the outside, and **that difference is
 * the medial longitudinal arch**. It is written here rather than derived,
 * because it is the claim.
 */
export const TARSALS = Object.freeze({
  calcaneus: { at: [MEDIAL * -0.25, 1.85, -1.9], size: [1.9, 1.85, 3.6] },
  talus: { at: [MEDIAL * 0.1, 4.95, 1.9], size: [1.7, 1.25, 2.0] },
  navicular: { at: [MEDIAL * 0.85, 4.3, 5.0], size: [1.5, 1.1, 0.7] },
  cuboid: { at: [MEDIAL * -1.9, 2.3, 4.6], size: [1.1, 1.3, 1.5] },
  cuneiforms: { at: [MEDIAL * 0.7, 3.5, 7.1], size: [1.9, 1.2, 1.1] },
});

/** The two ends of the bowstring under the arch. */
export const ARCH = Object.freeze({
  /** The tuberosity of the calcaneus, where the band starts. */
  heel: [MEDIAL * -0.2, 0.8, -4.4],
  /** The heads of the metatarsals, where it ends. */
  forefoot: [MEDIAL * 0.2, 1.2, 14.6],
  /** The highest point of the medial arch, which the band is slung under. */
  summit: [MEDIAL * 1.0, 3.6, 4.6],
});

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The top of the arch on the inside of the foot. */
  archSummit: ARCH.summit,
  /** Where the band pulls on the heel — the sore spot. */
  heelInsertion: ARCH.heel,
  /** The ankle joint proper, between the leg and the talus. */
  ankle: [MEDIAL * 0.1, 6.4, 1.9],
  /** The joint under it, where a foot turns in and out. */
  subtalar: [MEDIAL * -0.1, 3.7, 0.9],
  /** The tip of the lateral malleolus, and the ligaments that tear off it. */
  lateralMalleolus: [MEDIAL * -2.1, 4.0, 1.3],
  /** The tip of the medial malleolus. */
  medialMalleolus: [MEDIAL * 1.9, 4.8, 1.6],
  /** The tip of the great toe. */
  halluxTip: [MEDIAL * 3.6, -0.3, 19.6],
});

/** Move every vertex of a finished geometry, then fix the normals. */
function warpGeometry(geometry, fn) {
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    fn(v);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildFoot({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'foot';
  const disposables = [];
  const index = new Map();
  const groups = new Map();

  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  const shaft = (from, to, calibre) => {
    const surface = new TubeSurface(smoothCurve([from, lerp3(from, to, 0.5), to]), {
      radius: (t) => calibre * (0.56 + 0.44 * (1 - Math.sin(Math.PI * t) ** 0.62)),
      steps: 26,
      radial: 16,
    });
    disposables.push(surface);
    return surface.geometry;
  };

  const cord = (points, radius, { steps = 40, radial = 12 } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    disposables.push(surface);
    return surface.geometry;
  };

  const solid = (id, geometry, position, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    const mesh = new THREE.Mesh(geometry, built);
    mesh.name = id;
    if (position) mesh.position.set(...position);
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const group = (id, geometries, color, material = tissueMaterial) => {
    const built = material({ color: colors[id] ?? color });
    disposables.push(built);
    const meshes = geometries.map((geometry, i) => {
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, built);
      mesh.name = `${id}-${i}`;
      object.add(mesh);
      return mesh;
    });
    groups.set(id, meshes);
    index.set(id, meshes[0]);
    return meshes;
  };

  // --- the leg, and the socket it makes -------------------------------------
  //
  // The two bones come down on either side of the talus and grip it. The
  // medial malleolus is the end of the tibia; the lateral one is the end of the
  // fibula, and it reaches **further down**, which is why a foot turns in more
  // easily than it turns out.
  solid(
    'tibia',
    warpGeometry(shaft([MEDIAL * 0.4, 14.0, 1.4], [MEDIAL * 0.6, 6.5, 1.7], 1.15), (v) => {
      // The medial malleolus: a spur running down the inside of the ankle.
      const low = smoothstep(8.8, 6.5, v.y);
      v.x += MEDIAL * 1.1 * low;
      v.y -= 1.5 * low * smoothstep(0.2, 1.4, MEDIAL * v.x);
    }),
    null,
    '#ece4d0',
    mineralMaterial
  );
  solid(
    'fibula',
    warpGeometry(shaft([MEDIAL * -1.4, 14.0, 1.3], [MEDIAL * -2.0, 5.9, 1.4], 0.62), (v) => {
      const low = smoothstep(8.2, 5.9, v.y);
      v.y -= 1.9 * low;
    }),
    null,
    '#e6ddc6',
    mineralMaterial
  );

  // --- the tarsus -----------------------------------------------------------
  for (const [id, spec] of Object.entries(TARSALS)) {
    solid(
      id,
      shapedSphere({
        detail: 4,
        scale: spec.size,
        warp: (v) => {
          // Blocks with facets, not pebbles.
          v.x *= 1 - 0.14 * smoothstep(0.5, 1, Math.abs(v.x));
          v.y *= 1 - 0.16 * smoothstep(0.5, 1, Math.abs(v.y));
          v.z *= 1 - 0.12 * smoothstep(0.5, 1, Math.abs(v.z));
          if (id === 'calcaneus') {
            // Drawn out backwards and down into the heel, and flat underneath.
            v.z -= 0.45 * smoothstep(0, -1, v.z);
            v.y = Math.max(v.y, -0.86);
          }
        },
      }),
      spec.at,
      '#e9e1cb',
      mineralMaterial
    );
  }

  // --- the rays -------------------------------------------------------------
  const boneRow = (bone) =>
    RAYS.map((ray) => {
      const segment = raySegment(ray, bone);
      if (!segment) return null;
      const taper = bone === 'metatarsal' ? 1 : bone === 'proximal' ? 0.78 : bone === 'middle' ? 0.68 : 0.62;
      return shaft(segment.from, segment.to, ray.calibre * taper);
    }).filter(Boolean);

  group('metatarsals', boneRow('metatarsal'), '#ece4d0', mineralMaterial);
  group('proximal-phalanges', boneRow('proximal'), '#e9e1cb', mineralMaterial);
  // Four, not five: the great toe has no middle phalanx.
  group('middle-phalanges', boneRow('middle'), '#e6ddc6', mineralMaterial);
  group('distal-phalanges', boneRow('distal'), '#e4dac2', mineralMaterial);

  // --- what holds the arch up -----------------------------------------------
  //
  // The bowstring: from the heel, under the whole arch, to the heads of the
  // metatarsals. **This is what stops the arch spreading**, and it is the
  // reason the sore heel of a flattened arch is sore where the band pulls.
  solid(
    'plantar-fascia',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 10, 1, 40), (v) => {
      const along = v.z + 0.5;
      const across = v.x + 0.5;
      const z = lerp(ARCH.heel[2], ARCH.forefoot[2], along);
      // Narrow at the heel and fanning out to the five heads.
      const half = 0.7 + 2.0 * smoothstep(0.25, 1, along);
      v.x = lerp(ARCH.heel[0], ARCH.forefoot[0], along) + (across - 0.5) * 2 * half;
      v.z = z;
      // A straight chord under a curved arch: the band is the string, and the
      // gap above it is the arch it holds.
      v.y = lerp(ARCH.heel[1], ARCH.forefoot[1], along) + (v.y > 0 ? 0.12 : -0.12);
    }),
    null,
    '#ded0ac',
    wallMaterial
  );

  // The short ligament that holds the head of the talus up from below. It is
  // the other half of the answer: the band is the long one, this is the one at
  // the top of the arch.
  solid(
    'spring-ligament',
    cord(
      [
        [MEDIAL * 0.4, 3.0, 0.7],
        [MEDIAL * 0.8, 3.2, 2.6],
        [MEDIAL * 1.0, 3.8, 4.3],
      ],
      0.32
    ),
    null,
    '#d8c8a0',
    tissueMaterial
  );

  // --- the tendons ----------------------------------------------------------
  solid(
    'achilles-tendon',
    cord(
      [
        [MEDIAL * -0.2, 13.6, -2.4],
        [MEDIAL * -0.2, 10.0, -2.9],
        [MEDIAL * -0.2, 7.0, -3.3],
        [MEDIAL * -0.25, 3.4, -4.2],
      ],
      (t) => 0.5 + 0.42 * smoothstep(0.6, 1, t)
    ),
    null,
    '#e8dfc6',
    mucosaMaterial
  );

  // Down behind the medial malleolus and forward under the arch to the
  // navicular: the muscle that holds the arch up while a foot is moving.
  solid(
    'tibialis-posterior-tendon',
    cord(
      [
        [MEDIAL * 1.0, 10.6, -0.6],
        [MEDIAL * 1.7, 6.4, -0.4],
        [MEDIAL * 2.1, 4.4, 1.2],
        [MEDIAL * 1.7, 3.6, 3.6],
        [MEDIAL * 1.0, 3.4, 5.2],
      ],
      0.26
    ),
    null,
    '#e0d6b4',
    mucosaMaterial
  );

  // And the pair behind the lateral malleolus, which do the opposite.
  group(
    'peroneal-tendons',
    [0, 1].map((i) =>
      cord(
        [
          [MEDIAL * (-1.7 - i * 0.2), 10.6, -0.8],
          [MEDIAL * (-2.3 - i * 0.2), 6.0, -1.0],
          [MEDIAL * (-2.5 - i * 0.1), 3.4, 0.6],
          [MEDIAL * (-2.3 + i * 0.6), 2.2, 3.4],
          [MEDIAL * (-1.8 + i * 1.6), 1.6, 6.4],
        ],
        0.24
      )
    ),
    '#ddd2b0',
    mucosaMaterial
  );

  // --- the ligaments of the ankle -------------------------------------------
  //
  // On the inside, one strong fan. On the outside, three separate bands — and
  // **it is the outside that tears**, because turning in is the movement the
  // shorter medial side allows.
  solid(
    'deltoid-ligament',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 14, 1, 14), (v) => {
      const down = v.z + 0.5;
      const across = v.x + 0.5;
      const spread = lerp(-1.0, 2.6, across);
      v.x = MEDIAL * (2.0 + 0.12 * down);
      v.y = lerp(4.7, 2.5, down);
      v.z = lerp(1.6, 1.6 + spread, down) + (v.y > 0 ? 0.06 : -0.06);
    }),
    null,
    '#cfc08e',
    wallMaterial
  );

  group(
    'lateral-ligaments',
    [
      [
        [MEDIAL * -2.2, 3.9, 1.6],
        [MEDIAL * -1.9, 3.6, 3.0],
      ],
      [
        [MEDIAL * -2.2, 3.8, 1.2],
        [MEDIAL * -1.6, 2.3, 0.2],
      ],
      [
        [MEDIAL * -2.2, 3.9, 0.6],
        [MEDIAL * -2.0, 3.4, -1.2],
      ],
    ].map((points) => cord(points, 0.19, { steps: 18 })),
    '#c8b884',
    tissueMaterial
  );

  // --- the two joints, drawn as the spaces they are -------------------------
  solid(
    'ankle-joint',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 16, 1, 14), (v) => {
      const across = v.x + 0.5;
      const along = v.z + 0.5;
      v.x = lerp(MEDIAL * 1.5, MEDIAL * -1.5, across);
      v.z = lerp(0.2, 3.6, along);
      // A curved gap: the top of the talus is a dome and the leg sits on it.
      v.y = 6.32 - 0.24 * Math.sin(Math.PI * along) + (v.y > 0 ? 0.08 : -0.08);
    }),
    null,
    '#8fc0d8',
    wallMaterial
  );

  solid(
    'subtalar-joint',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 16, 1, 14), (v) => {
      const across = v.x + 0.5;
      const along = v.z + 0.5;
      v.x = lerp(MEDIAL * 1.3, MEDIAL * -1.5, across);
      v.z = lerp(-1.0, 3.0, along);
      v.y = 3.66 + 0.2 * along + (v.y > 0 ? 0.07 : -0.07);
    }),
    null,
    '#a9cfe0',
    wallMaterial
  );

  object.scale.setScalar(WORLD_SCALE);

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    meshesFor: (id) => groups.get(id) ?? (index.has(id) ? [index.get(id)] : []),
    /** In world units, so they line up with the meshes rather than with the
     *  centimetre table the meshes were laid out from. */
    anchorPoints: Object.fromEntries(
      Object.entries(SITES).map(([key, point]) => [
        key,
        new THREE.Vector3(...point).multiplyScalar(WORLD_SCALE),
      ])
    ),
    dispose: () => {
      for (const item of disposables) item.dispose?.();
    },
  };
}
