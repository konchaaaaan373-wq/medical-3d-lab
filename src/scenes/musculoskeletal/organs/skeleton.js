import * as THREE from 'three';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, tissueMaterial } from '../../shared/materials.js';

/**
 * The whole skeleton, at the scale where the question is how it is put
 * together rather than what any one bone looks like.
 *
 * The thing this scene is for is the **join**. A skeleton is two skeletons: an
 * axial one — skull, spine, ribs, sternum — that is one continuous column, and
 * an appendicular one hung off it. And the two limbs are not hung off it the
 * same way at all.
 *
 * **The arm has one bone touching the trunk**: the clavicle, at a joint the
 * size of a fingertip on the top of the sternum. The scapula behind it touches
 * nothing — it rides on muscle. **The leg has no such freedom**: the hip bone
 * is locked to the sacrum, and the sacrum is part of the spine. One girdle is
 * built to move and one is built to carry, and that difference is the whole
 * reason a shoulder dislocates and a hip does not.
 *
 * ## Standing, facing the viewer
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is up from the ground and `+z` is
 * forwards. One unit is about a centimetre and the figure is about 170 of them.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No bone length, proportion or
 * joint angle here is a measurement**, and nothing moves. This is an overview:
 * **no bone in it is a model of that bone**, and the scenes that do model one —
 * the spine, the hand, the foot, the knee, the shoulder, the hip, the pelvic
 * floor — are separate and are where any detail belongs.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/**
 * How many world units a centimetre is.
 *
 * The figure is laid out in **centimetres**, because that is how a body's
 * proportions are written down and a table of heights in some other unit is a
 * table nobody can check. The finished group is then scaled down, because the
 * shared viewer has two limits a whole-body subject runs into and nothing else
 * in this repository does: the camera's far plane is at 200 units, and the
 * orbit controls clamp the camera to **55 units from its target**. Whatever a
 * scene authors, it is looked at from no further away than that — so a subject
 * has to be small enough to be seen whole from 55, which at this field of view
 * is about twenty-six units tall. A hundred-and-seventy-unit figure is not, and
 * at 0.14 a centimetre it is.
 */
export const WORLD_SCALE = 0.14;

/**
 * The heights the whole figure is laid out against, in centimetres from the
 * ground for a figure about 170 tall.
 *
 * **One table, every bone**: nothing in this file places itself at a number
 * that is not derived from these, so the figure cannot end up with an elbow
 * above its shoulder (`docs/architecture-rules.md` rule 1).
 */
export const LEVELS = Object.freeze({
  ground: 0,
  ankle: 8,
  knee: 48,
  hip: 90,
  fingertips: 66,
  wrist: 86,
  sacrumTop: 96,
  waist: 108,
  elbow: 108,
  shoulder: 140,
  jaw: 150,
  chin: 152,
  crown: 172,
});

/** How far out to the side each part of the figure reaches. */
export const SPAN = Object.freeze({
  head: 8,
  shoulder: 19,
  ribcage: 15,
  hip: 15,
  knee: 7,
  ankle: 6,
});

/**
 * The one joint that attaches an arm to the trunk.
 *
 * It is written down because it is the claim: the medial end of the clavicle,
 * on the top corner of the sternum. Everything else about a shoulder girdle
 * hangs off muscle.
 */
export const STERNOCLAVICULAR = [LEFT * 1.9, 137.5, 8.6];

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  sternoclavicular: STERNOCLAVICULAR,
  /** The joint that locks the hip bone to the spine. */
  sacroiliac: [LEFT * 3.6, 95.0, -6.5],
  /** The hip joint itself. */
  hip: [LEFT * 8.6, LEVELS.hip, 0],
  /** The shoulder joint, which is a long way from the one that attaches it. */
  shoulder: [LEFT * 16.5, LEVELS.shoulder - 2, 0],
  /** The top of the head. */
  crown: [0, LEVELS.crown, 0],
});

/**
 * The curve of the spine, front to back, at a given height.
 *
 * One function, used by the three named lengths of spine, the sacrum and every
 * rib, so the column cannot come apart from the cage hanging off it.
 */
export function spineAt(y) {
  const neck = smoothstep(LEVELS.waist + 14, LEVELS.chin, y);
  const chest = smoothstep(LEVELS.shoulder, LEVELS.waist + 2, y);
  const loin = smoothstep(LEVELS.waist + 6, LEVELS.sacrumTop - 4, y);
  return -5.5 + 2.6 * neck - 2.2 * chest + 3.4 * loin - 2.6 * smoothstep(LEVELS.sacrumTop, LEVELS.hip - 8, y);
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildSkeleton({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'skeleton';
  const disposables = [];
  const index = new Map();
  const groups = new Map();

  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  /** A long bone: waisted in the middle, swollen at both ends. */
  const shaft = (from, to, calibre) => {
    const surface = new TubeSurface(smoothCurve([from, lerp3(from, to, 0.5), to]), {
      radius: (t) => calibre * (0.56 + 0.44 * (1 - Math.sin(Math.PI * t) ** 0.62)),
      steps: 22,
      radial: 14,
    });
    disposables.push(surface);
    return surface.geometry;
  };

  const cord = (points, radius, { steps = 36, radial = 12 } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    disposables.push(surface);
    return surface.geometry;
  };

  const solid = (id, geometry, position, color, material = mineralMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    const mesh = new THREE.Mesh(geometry, built);
    mesh.name = id;
    if (position) mesh.position.set(...position);
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const group = (id, geometries, color, material = mineralMaterial) => {
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

  /** One structure, both sides. */
  const mirrored = (id, build, color, material = mineralMaterial) =>
    group(id, [LEFT, -LEFT].flatMap((side) => [].concat(build(side))), color, material);

  // --- the axial skeleton: one column from the head to the pelvis ----------
  solid(
    'skull',
    shapedSphere({
      detail: 5,
      scale: [SPAN.head, 10.5, 9.5],
      warp: (v) => {
        // A vault above and a face in front of it, narrowing below.
        v.x *= 1 - 0.3 * smoothstep(0, -1, v.y);
        v.z += 0.35 * smoothstep(0.3, -1, v.y);
        v.y *= 1 - 0.12 * smoothstep(0.2, 1, Math.abs(v.z));
      },
    }),
    [0, LEVELS.crown - 10.5, -0.5],
    '#ece4d0'
  );

  solid(
    'mandible',
    (() => {
      const points = [];
      for (let i = 0; i <= 26; i += 1) {
        const a = lerp(-1.25, 1.25, i / 26);
        points.push([LEFT * Math.sin(a) * 6.4, LEVELS.jaw + 0.6 - 1.4 * Math.cos(a), 6.0 * Math.cos(a) - 1.2]);
      }
      return cord(points, 1.1);
    })(),
    null,
    '#e6ddc6'
  );

  const spineRun = (id, y0, y1, calibre) =>
    solid(
      id,
      cord(
        [0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = lerp(y0, y1, t);
          return [0, y, spineAt(y)];
        }),
        calibre
      ),
      null,
      '#eae2cc'
    );

  spineRun('cervical-spine', LEVELS.chin - 2, LEVELS.shoulder - 2, 1.9);
  spineRun('thoracic-spine', LEVELS.shoulder - 2, LEVELS.waist, 2.5);
  spineRun('lumbar-spine', LEVELS.waist, LEVELS.sacrumTop, 3.1);

  solid(
    'sacrum-and-coccyx',
    shapedSphere({
      detail: 4,
      scale: [4.6, 7.5, 1.9],
      warp: (v) => {
        v.x *= 1 - 0.66 * smoothstep(0.2, -1, v.y);
        v.z += 0.9 * smoothstep(0.3, -1, v.y);
      },
    }),
    [0, LEVELS.sacrumTop - 7.0, spineAt(LEVELS.sacrumTop) - 1.2],
    '#e8e0c8'
  );

  // Twelve pairs of ribs, each from the column round to the front. The lower
  // ones are shorter and do not reach the sternum, which is why the cage is
  // open below.
  mirrored(
    'ribs',
    (side) => {
      const bones = [];
      for (let i = 0; i < 12; i += 1) {
        const t = i / 11;
        const y = lerp(LEVELS.shoulder - 4, LEVELS.waist + 2, t);
        const back = spineAt(y);
        const reach = SPAN.ribcage * (0.62 + 0.5 * Math.sin(Math.PI * (0.18 + 0.72 * t)));
        // The front end: high ribs reach the sternum, low ones stop short.
        const front = t < 0.62 ? 8.5 - 2.0 * t : 6.0 - 7.0 * (t - 0.62);
        const drop = 3.5 + 7.0 * t;
        bones.push(
          cord(
            [
              [side * 1.4, y, back],
              [side * reach * 0.8, y - drop * 0.2, back + 3.0],
              [side * reach, y - drop * 0.6, back + reach * 0.55],
              [side * (reach * 0.55), y - drop, front],
              [side * (t < 0.62 ? 2.2 : reach * 0.34), y - drop * 1.12, front],
            ],
            0.72,
            { steps: 30, radial: 10 }
          )
        );
      }
      return bones;
    },
    '#e9e1cb'
  );

  solid(
    'sternum',
    shapedSphere({
      detail: 4,
      scale: [3.2, 9.5, 0.9],
      warp: (v) => {
        v.x *= 1 - 0.5 * smoothstep(0.1, -1, v.y) - 0.2 * smoothstep(0.4, 1, v.y);
      },
    }),
    [0, LEVELS.shoulder - 12.5, 9.0],
    '#ece4d0'
  );

  // --- the shoulder girdle: one bone touching, one floating -----------------
  //
  // The clavicle runs from the top corner of the sternum out to the point of
  // the shoulder. **It is the only bone in the arm that touches the trunk.**
  mirrored(
    'clavicle',
    (side) =>
      cord(
        [
          [side * STERNOCLAVICULAR[0], STERNOCLAVICULAR[1], STERNOCLAVICULAR[2]],
          [side * 8.0, LEVELS.shoulder - 1.2, 6.4],
          [side * 14.0, LEVELS.shoulder - 1.6, 3.4],
          [side * SPAN.shoulder - side * 2.0, LEVELS.shoulder - 1.4, 1.2],
        ],
        0.85
      ),
    '#ece4d0'
  );

  // And the scapula, which touches nothing: it lies on the back of the cage
  // and is held there by muscle alone.
  mirrored(
    'scapula',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [5.6, 9.0, 1.0],
        warp: (v) => {
          // A triangle: wide above, drawn down to a point below.
          v.x *= 1 - 0.78 * smoothstep(0.3, -1, v.y);
          v.z += 0.6 * smoothstep(0.2, 1, v.x * side);
        },
      });
      geometry.translate(side * 11.0, LEVELS.shoulder - 9.5, -7.0);
      return geometry;
    },
    '#e9e1cb'
  );

  // --- the arm --------------------------------------------------------------
  mirrored(
    'humerus',
    (side) => shaft([side * (SPAN.shoulder - 2.5), LEVELS.shoulder - 2, 0.6], [side * 17.5, LEVELS.elbow, 1.4], 1.9),
    '#ece4d0'
  );
  mirrored(
    'radius-and-ulna',
    (side) => [
      shaft([side * 16.2, LEVELS.elbow - 0.6, 2.0], [side * 18.6, LEVELS.wrist, 2.0], 1.05),
      shaft([side * 18.6, LEVELS.elbow - 0.6, 0.6], [side * 16.6, LEVELS.wrist, 1.0], 0.95),
    ],
    '#e6ddc6'
  );
  mirrored(
    'hand-bones',
    (side) => {
      const bones = [];
      for (let i = 0; i < 5; i += 1) {
        const spread = (i / 4 - 0.5) * 5.4;
        bones.push(
          shaft(
            [side * (17.6 + spread * 0.4), LEVELS.wrist - 2.0, 1.6],
            [side * (17.6 + spread), LEVELS.fingertips, 1.8],
            0.42
          )
        );
      }
      return bones;
    },
    '#e4dac2'
  );

  // --- the pelvic girdle: locked to the spine -------------------------------
  mirrored(
    'pelvis',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [7.0, 9.5, 4.6],
        warp: (v) => {
          // A blade above and a ring below, hollow towards the midline.
          v.x *= 1 - 0.5 * smoothstep(0.2, -1, v.y);
          v.x -= 0.45 * smoothstep(0.1, 1, v.y) * side * 0;
          v.z *= 1 - 0.3 * smoothstep(0.3, 1, v.y);
          v.y *= 1 - 0.1 * smoothstep(0.5, 1, Math.abs(v.x));
        },
      });
      geometry.translate(side * 8.4, LEVELS.hip + 5.0, -2.0);
      return geometry;
    },
    '#eae2cc'
  );

  // --- the leg --------------------------------------------------------------
  mirrored('femur', (side) => shaft([side * 8.6, LEVELS.hip, 0], [side * 6.4, LEVELS.knee, 0.6], 2.3), '#ece4d0');
  mirrored(
    'patella',
    (side) => {
      const geometry = shapedSphere({ detail: 3, scale: [1.9, 2.1, 0.9] });
      geometry.translate(side * 6.2, LEVELS.knee + 1.6, 4.4);
      return geometry;
    },
    '#e8e0c8'
  );
  mirrored(
    'tibia-and-fibula',
    (side) => [
      shaft([side * 5.4, LEVELS.knee - 1.0, 0.4], [side * 5.0, LEVELS.ankle, 0.8], 1.75),
      shaft([side * 8.0, LEVELS.knee - 3.0, 0.2], [side * 7.6, LEVELS.ankle - 1.2, 0.6], 0.85),
    ],
    '#e6ddc6'
  );
  mirrored(
    'foot-bones',
    (side) => {
      const bones = [];
      for (let i = 0; i < 5; i += 1) {
        const spread = (i / 4 - 0.5) * 5.0;
        bones.push(
          shaft(
            [side * (6.0 + spread * 0.3), LEVELS.ankle - 3.4, -2.6],
            [side * (6.0 + spread), LEVELS.ground + 1.4, 12.0],
            0.55
          )
        );
      }
      bones.push(
        shapedSphere({ detail: 3, scale: [2.4, 3.0, 4.2] }).translate(side * 6.0, LEVELS.ankle - 3.2, -4.2)
      );
      return bones;
    },
    '#e4dac2'
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
