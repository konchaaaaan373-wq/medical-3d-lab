import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The hand and wrist: eight small bones in an arch, with a roof over them.
 *
 * Two things here are worth three dimensions. The first is that **the carpal
 * bones are not flat** — they make an arch, concave towards the palm, and a
 * band of fibrous tissue roofs it. The space that leaves is the carpal tunnel,
 * and nine tendons and a nerve go through it with nowhere to move: an arch with
 * a lid is exactly the shape a flat drawing cannot show. The second is that
 * **the five rays are not five copies of the same thing** — the thumb is
 * shorter, set at an angle to the others, and has two phalanges rather than
 * three, and that is what makes a hand a hand rather than a paddle.
 *
 * ## A right hand, in anatomical position
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right hand held with the palm forward, **radial** — the thumb side — is
 * `−x`. `+y` runs from the wrist towards the fingertips and `+z` is palmar.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No bone length, joint angle or
 * tendon calibre here is a measurement**, and nothing moves: no joint bends,
 * no tendon slides and no grip is represented.
 */

/** Which way the thumb side is, in a right hand with the palm forward. */
export const RADIAL = -1;

/**
 * The five rays of the hand, each as its own base, direction and bone lengths.
 *
 * **One table, four uses**: the metacarpals and all three rows of phalanges are
 * built from it, so a ray cannot have its bones in different places in
 * different rows (`docs/architecture-rules.md` rule 1). `middle` is `null` on
 * the thumb, which is the difference that makes a thumb a thumb.
 */
export const RAYS = Object.freeze([
  Object.freeze({
    id: 'thumb',
    base: [RADIAL * 1.4, 0.9, 0.5],
    direction: [RADIAL * 0.46, 0.84, 0.2],
    metacarpal: 4.5,
    proximal: 3.1,
    middle: null,
    distal: 2.2,
    calibre: 0.64,
  }),
  Object.freeze({
    id: 'index',
    base: [RADIAL * 0.72, 1.7, 0.05],
    direction: [RADIAL * 0.17, 0.985, 0.02],
    metacarpal: 6.7,
    proximal: 4.0,
    middle: 2.5,
    distal: 1.8,
    calibre: 0.58,
  }),
  Object.freeze({
    id: 'middle',
    base: [RADIAL * -0.08, 1.82, 0],
    direction: [RADIAL * -0.02, 1, 0],
    metacarpal: 6.9,
    proximal: 4.4,
    middle: 2.8,
    distal: 1.9,
    calibre: 0.6,
  }),
  Object.freeze({
    id: 'ring',
    base: [RADIAL * -0.78, 1.74, 0.05],
    direction: [RADIAL * -0.1, 0.99, 0.02],
    metacarpal: 6.3,
    proximal: 4.0,
    middle: 2.6,
    distal: 1.8,
    calibre: 0.55,
  }),
  Object.freeze({
    id: 'little',
    base: [RADIAL * -1.34, 1.6, 0.12],
    direction: [RADIAL * -0.17, 0.985, 0.03],
    metacarpal: 5.3,
    proximal: 3.2,
    middle: 2.0,
    distal: 1.6,
    calibre: 0.48,
  }),
]);

/**
 * Where one bone of one ray starts and ends.
 *
 * @param {typeof RAYS[number]} ray
 * @param {'metacarpal'|'proximal'|'middle'|'distal'} bone
 * @returns {{ from: number[], to: number[] } | null} null if the ray has no
 *          such bone, which is true of the thumb's middle phalanx.
 */
export function raySegment(ray, bone) {
  const order = ['metacarpal', 'proximal', 'middle', 'distal'];
  if (ray[bone] == null) return null;
  const dir = ray.direction;
  const length = Math.hypot(dir[0], dir[1], dir[2]);
  const unit = [dir[0] / length, dir[1] / length, dir[2] / length];
  let start = 0;
  for (const name of order) {
    // Joints are drawn with a small gap between the bones, which is where the
    // cartilage and the capsule would be.
    if (name === bone) {
      const from = ray.base.map((v, i) => v + unit[i] * start);
      const to = ray.base.map((v, i) => v + unit[i] * (start + ray[name]));
      return { from, to };
    }
    if (ray[name] != null) start += ray[name] + 0.22;
  }
  return null;
}

/**
 * The carpal bones, as a table of where each one sits.
 *
 * The two rows and the arch across them are the whole point, so the positions
 * are written here rather than being derived: `z` is how far towards the palm
 * each one sits, and the four that stick out furthest — the tubercles and hooks
 * at the corners — are what the roof is stretched between.
 */
export const CARPALS = Object.freeze({
  scaphoid: { at: [RADIAL * 1.15, -0.05, 0.34], size: [0.7, 0.58, 0.5] },
  lunate: { at: [RADIAL * 0.28, 0.08, 0.1], size: [0.54, 0.5, 0.48] },
  triquetrum: { at: [RADIAL * -0.66, -0.06, 0.16], size: [0.5, 0.46, 0.44] },
  pisiform: { at: [RADIAL * -0.86, -0.16, 0.82], size: [0.3, 0.3, 0.28] },
  trapezium: { at: [RADIAL * 1.32, 1.05, 0.44], size: [0.56, 0.5, 0.5] },
  trapezoid: { at: [RADIAL * 0.58, 1.12, 0.12], size: [0.46, 0.44, 0.42] },
  capitate: { at: [RADIAL * -0.12, 1.0, 0.06], size: [0.58, 0.72, 0.5] },
  hamate: { at: [RADIAL * -0.92, 0.92, 0.22], size: [0.56, 0.56, 0.5] },
});

/**
 * The two corners of the carpal arch the roof is stretched between, and the
 * height the roof sits at.
 *
 * **One pair of points, three uses**: the retinaculum is built across them, the
 * tunnel is the space under it, and the test measures against them.
 */
export const TUNNEL = Object.freeze({
  radialPillar: [RADIAL * 1.36, 0.5, 0.94],
  ulnarPillar: [RADIAL * -0.98, 0.44, 0.96],
  /** How far along the wrist the tunnel runs. */
  from: -0.2,
  to: 1.5,
});

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The middle of the carpal tunnel. */
  tunnel: [RADIAL * 0.2, 0.66, 0.62],
  /** The scaphoid, which is the one that is broken and the one that does not heal. */
  scaphoid: CARPALS.scaphoid.at,
  /** Where the pulse is felt, in front of the radius. */
  radialPulse: [RADIAL * 1.1, -1.6, 0.7],
  /** The tip of the thumb. */
  thumbTip: [RADIAL * 3.9, 6.2, 2.4],
  /** The tip of the middle finger. */
  middleTip: [RADIAL * -0.4, 16.1, 0],
  /** The head of the third metacarpal — the knuckle. */
  knuckle: [RADIAL * -0.22, 8.7, 0],
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
export function buildHand({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'hand';
  const disposables = [];
  const index = new Map();
  const groups = new Map();

  const shaft = (from, to, calibre) => {
    const surface = new TubeSurface(
      smoothCurve([from, lerp3(from, to, 0.5), to]),
      {
        // Waisted in the middle and swollen at each end: that is what makes a
        // long bone read as a bone rather than as a pipe.
        radius: (t) => calibre * (0.56 + 0.44 * (1 - Math.sin(Math.PI * t) ** 0.62)),
        steps: 26,
        radial: 16,
      }
    );
    disposables.push(surface);
    return surface.geometry;
  };

  const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

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

  /** One structure made of several meshes — a row of bones, a bundle of cords. */
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

  // --- the two bones of the forearm ----------------------------------------
  solid(
    'radius',
    shaft([RADIAL * 0.8, -6.0, 0.1], [RADIAL * 1.16, -0.62, 0.16], 0.95),
    null,
    '#ece4d0',
    mineralMaterial
  );
  solid(
    'ulna',
    shaft([RADIAL * -1.0, -6.0, 0.1], [RADIAL * -0.92, -1.24, 0.14], 0.78),
    null,
    '#e6ddc6',
    mineralMaterial
  );

  // --- the eight carpal bones ----------------------------------------------
  //
  // Each one named, because being able to say which one is the whole value of
  // this part of the scene — and because the one that is broken, the scaphoid,
  // is not distinguishable from its neighbours by anything except position.
  for (const [id, spec] of Object.entries(CARPALS)) {
    solid(
      id,
      shapedSphere({
        detail: 4,
        scale: spec.size,
        warp: (v) => {
          // Flattened where they meet each other: carpal bones are blocks with
          // facets, not pebbles.
          v.x *= 1 - 0.14 * smoothstep(0.5, 1, Math.abs(v.x));
          v.y *= 1 - 0.16 * smoothstep(0.5, 1, Math.abs(v.y));
        },
      }),
      spec.at,
      id === 'scaphoid' ? '#f0e6cc' : '#e8e0c8',
      mineralMaterial
    );
  }

  // The hook of the hamate: a post standing towards the palm, and one of the
  // two pillars the roof is stretched between.
  solid(
    'hamate-hook',
    shapedSphere({ detail: 3, scale: [0.16, 0.3, 0.34] }),
    [RADIAL * -0.98, 0.72, 0.7],
    '#e8e0c8',
    mineralMaterial
  );

  // --- the rays -------------------------------------------------------------
  const boneRow = (bone) =>
    RAYS.map((ray) => {
      const segment = raySegment(ray, bone);
      if (!segment) return null;
      const taper = bone === 'metacarpal' ? 1 : bone === 'proximal' ? 0.82 : bone === 'middle' ? 0.74 : 0.64;
      return shaft(segment.from, segment.to, ray.calibre * taper);
    }).filter(Boolean);

  group('metacarpals', boneRow('metacarpal'), '#ece4d0', mineralMaterial);
  group('proximal-phalanges', boneRow('proximal'), '#e9e1cb', mineralMaterial);
  // Four, not five: the thumb has no middle phalanx, and `RAYS` is where that
  // is written down.
  group('middle-phalanges', boneRow('middle'), '#e6ddc6', mineralMaterial);
  group('distal-phalanges', boneRow('distal'), '#e4dac2', mineralMaterial);

  // --- the roof, and the space under it -------------------------------------
  //
  // A band across the two pillars of the arch. It is short, it does not
  // stretch, and everything in the tunnel is underneath it.
  solid(
    'flexor-retinaculum',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 22, 1, 18), (v) => {
      const across = v.x + 0.5;
      const along = v.z + 0.5;
      const y = lerp(TUNNEL.from, TUNNEL.to, along);
      const x = lerp(TUNNEL.radialPillar[0], TUNNEL.ulnarPillar[0], across);
      // Bowed towards the palm in the middle, and narrower at both ends.
      const bow = 0.2 * Math.sin(Math.PI * across) * Math.sin(Math.PI * along) ** 0.4;
      v.x = x;
      v.y = y;
      v.z = lerp(TUNNEL.radialPillar[2], TUNNEL.ulnarPillar[2], across) + bow + (v.y > 0 ? 0.05 : -0.05);
    }),
    null,
    '#ded0ac',
    wallMaterial
  );

  // The space between the arch and its roof, drawn as the space it is. **This
  // is what the scene is about**: nine tendons and a nerve share it and none of
  // them can move sideways.
  solid(
    'carpal-tunnel',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 20, 12, 18), (v) => {
      const across = v.x + 0.5;
      const along = v.z + 0.5;
      // Read before anything is overwritten: `v.y` becomes a world height two
      // lines down, and using it afterwards put the roof of the tunnel a
      // centimetre above the band that is supposed to be the roof.
      const up = v.y + 0.5;
      const y = lerp(TUNNEL.from + 0.08, TUNNEL.to - 0.08, along);
      const x = lerp(TUNNEL.radialPillar[0] * 0.88, TUNNEL.ulnarPillar[0] * 0.88, across);
      const roof = lerp(TUNNEL.radialPillar[2], TUNNEL.ulnarPillar[2], across) + 0.14 * Math.sin(Math.PI * across);
      // The floor is the palmar surface of the carpal arch: close under the
      // roof at the two pillars, and falling away between them. That is what
      // makes the tunnel a tunnel rather than a slot.
      const floor = 0.85 - 0.62 * Math.sin(Math.PI * across);
      v.x = x;
      v.y = y;
      v.z = lerp(floor, roof - 0.1, up);
    }),
    null,
    '#8fc0d8',
    wallMaterial
  );

  // --- what goes through it -------------------------------------------------
  //
  // Nine tendons, drawn as a bundle: what matters is that they fill the tunnel,
  // not which is which.
  group(
    'flexor-tendons',
    [
      [-0.62, 0.34],
      [-0.2, 0.3],
      [0.22, 0.32],
      [0.62, 0.36],
      [-0.42, 0.62],
      [0.0, 0.6],
      [0.42, 0.62],
    ].map(([offset, depth]) =>
      cord(
        [
          [RADIAL * offset, -2.6, depth + 0.12],
          [RADIAL * offset, -0.2, depth],
          [RADIAL * offset, 1.4, depth],
          [RADIAL * (offset * 1.5), 4.0, depth * 0.8],
          [RADIAL * (offset * 2.1), 7.6, depth * 0.6],
        ],
        0.15
      )
    ),
    '#e5dcc4',
    mucosaMaterial
  );

  // The nerve: **the most palmar thing in the tunnel**, right under the band,
  // which is why it is the one that gives way when the space is reduced.
  solid(
    'median-nerve',
    cord(
      [
        [RADIAL * 0.35, -2.8, 0.6],
        [RADIAL * 0.4, -0.4, 0.64],
        [RADIAL * 0.45, 0.7, 0.66],
        [RADIAL * 0.5, 1.6, 0.68],
        [RADIAL * 0.7, 3.0, 0.82],
      ],
      0.18
    ),
    null,
    '#efe7c0',
    mucosaMaterial
  );

  // On the other side of the bones, with nothing over them but skin.
  group(
    'extensor-tendons',
    RAYS.slice(1).map((ray) => {
      const segment = raySegment(ray, 'metacarpal');
      const distal = raySegment(ray, 'proximal');
      return cord(
        [
          [segment.from[0] * 0.8, -2.4, -0.95],
          [segment.from[0], 0.6, -1.0],
          [segment.from[0], segment.from[1], -1.02],
          [segment.to[0], segment.to[1], -0.85],
          [distal.to[0], distal.to[1], -0.65],
        ],
        0.13
      );
    }),
    '#e0d6bc',
    mucosaMaterial
  );

  // The mound at the base of the thumb. It is here because it is what wastes
  // when the nerve under the band stops working.
  solid(
    'thenar-muscles',
    shapedSphere({
      detail: 4,
      scale: [0.72, 1.5, 0.62],
      warp: (v) => {
        v.y *= 1 - 0.2 * smoothstep(0, 1, Math.abs(v.x));
        v.z *= 1 - 0.3 * smoothstep(0.2, -1, v.z);
      },
    }),
    [RADIAL * 1.9, 2.4, 0.86],
    '#c4816f',
    tissueMaterial
  );

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    meshesFor: (id) => groups.get(id) ?? (index.has(id) ? [index.get(id)] : []),
    anchorPoints: Object.fromEntries(
      Object.entries(SITES).map(([key, point]) => [key, new THREE.Vector3(...point)])
    ),
    dispose: () => {
      for (const item of disposables) item.dispose?.();
    },
  };
}
