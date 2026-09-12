import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The pelvis: a funnel with a floor, and three things that go through it.
 *
 * The fourth **regional** model. The abdomen above it sorts by a membrane; the
 * pelvis sorts by a **muscle**. Above the levator sling everything is in the
 * abdomen's own terms — bowel, peritoneum, a pouch that fluid runs into.
 * Through the sling there are only three passages, and below it there is a
 * different country with a different nerve supply and a different lymphatic
 * drainage.
 *
 * ## What this scene is for
 *
 * - **One crossing, two names.** The ureter passes **under** the uterine artery
 *   in a woman and **under** the vas deferens in a man, at the same place and
 *   for the same reason. Both are drawn from one `bridgeAt(side)` point, so the
 *   model cannot say it of one and not the other.
 * - **The pouch is the lowest point of the peritoneal cavity.** Fluid anywhere
 *   in an abdomen ends up here, which is why it is the one place the cavity can
 *   be reached from below.
 * - **Three passages and no more.** Urethra, rectum, and in a woman a vagina
 *   between them, all through one gap in one muscle.
 *
 * ## One model, two sets of organs — and nobody has both
 *
 * Everything except the midline reproductive organs is the same in both sexes,
 * so it is drawn once. The **uterus, tubes and vagina** and the **prostate,
 * seminal vesicles and vas deferens** are both drawn, as two sets, and
 * `FEMALE_SET` / `MALE_SET` name them. **This is a display arrangement and not
 * an anatomy**: no body has both, the scene opens on the parts that are shared,
 * and each set has a viewpoint that shows it with the other put away. Nothing
 * about either set's position is changed to make them coexist.
 *
 * ## The frame
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is superior and `+z` anterior. Every
 * paired structure is built from the single `LEFT` constant below.
 *
 * **One world unit is one centimetre**, with `y = 0` at the **pelvic brim** —
 * the line from the sacral promontory round to the pubis that divides the false
 * pelvis above from the true pelvis below, and the level each ureter crosses to
 * enter this region.
 *
 * ## Not an atlas of any organ in it
 *
 * The bladder, uterus, prostate and pelvic floor here are **outlines in their
 * places**. Each has its own scene — `bladder-anatomy`, `uterus-anatomy`,
 * `prostate-anatomy`, `pelvic-floor-anatomy` — at its own scale, answering a
 * question about that structure; this one answers a question about where it is
 * (`CLAUDE.md`, "Organ と Disease を混ぜない").
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre, angle or volume
 * here is a measurement**, and nothing moves: nothing fills or empties, no
 * sphincter opens or closes, the floor does not contract, and no pressure
 * exists anywhere.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/**
 * Centimetres to world units. A viewer constraint, not an anatomical one
 * (`docs/follow-ups.md` F-90), applied once to the finished group.
 */
export const WORLD_SCALE = 0.42;

/** The heights everything in the pelvis is placed against. `y = 0` is the brim. */
export const LEVELS = Object.freeze({
  /** The top of what is drawn: the iliac crests and the last of the sigmoid. */
  crest: 4.6,
  /** **The pelvic brim.** False pelvis above, true pelvis below. */
  brim: 0,
  /** The top of an empty bladder, which does not reach the brim. */
  bladderTop: -2.2,
  /** The body of the uterus, lying forward over the bladder. */
  uterus: -3.0,
  /** **Where the ureter passes under the bridge**, on each side. */
  bridge: -3.6,
  /** The prostate, sitting on the floor under the bladder. */
  prostate: -6.0,
  /** The levator sling. */
  floorLevel: -6.6,
  /** The gap in it that everything passes through. */
  hiatus: -7.0,
  /** Below the floor: a different country. */
  perineum: -8.8,
  /** The bottom of what this scene draws. */
  floor: -9.8,
});

/** Which structures make up each of the two sets. **Nobody has both.** */
export const FEMALE_SET = Object.freeze(['uterus', 'ovaries-and-tubes', 'vagina', 'uterine-artery']);
export const MALE_SET = Object.freeze(['prostate', 'seminal-vesicles', 'vas-deferens']);

/**
 * The bony ring at a given height: a funnel, wide at the brim and narrow at the
 * outlet.
 *
 * **One function, three uses**: the ring is built from it, the floor is spanned
 * across it, and the peritoneum is held inside it.
 */
export function pelvisSection(y) {
  const down = clamp((LEVELS.brim - y) / (LEVELS.brim - LEVELS.perineum), 0, 1);
  const flare = smoothstep(0.1, -0.9, down);
  return {
    halfWidth: 8.2 - 3.0 * down + 4.4 * flare,
    halfDepth: 6.6 - 2.4 * down + 2.6 * flare,
    centreZ: 0.4 + 1.0 * down,
  };
}

/**
 * The height of the levator sling under a point on the floor of the pelvis.
 *
 * **One function, four uses**: the floor is built from it, the hiatus is cut in
 * it, each organ in the true pelvis rests above it, and the perineum below is
 * measured down from it. A pelvic floor is a funnel, not a shelf — which is why
 * what fails in it descends rather than tears.
 */
export function floorAt(x, z) {
  const at = pelvisSection(LEVELS.floorLevel);
  const across = clamp(Math.abs(x) / at.halfWidth, 0, 1);
  const fore = clamp(Math.abs(z - at.centreZ) / at.halfDepth, 0, 1);
  const out = Math.min(1, Math.hypot(across, fore));
  return LEVELS.hiatus + (LEVELS.floorLevel + 2.4 - LEVELS.hiatus) * out ** 1.4;
}

/**
 * The gap in the floor. **Three things go through it and nothing else does.**
 *
 * `halfWidth` and the two ends are the sling's free borders; a structure that
 * passes the floor has to be inside them.
 */
export const HIATUS = Object.freeze({
  halfWidth: 1.9,
  front: 3.4,
  back: -1.8,
});

/** Whether a point is inside the gap rather than in the sheet around it. */
export function inHiatus(x, z) {
  return Math.abs(x) < HIATUS.halfWidth && z < HIATUS.front && z > HIATUS.back;
}

/**
 * How far along a ray from the centre of the floor the gap ends.
 *
 * Returned as a fraction of the way to the pelvic wall, so the sheet can be
 * built as a ring from here outwards and the gap is an opening rather than a
 * dimple.
 */
export function edgeOfHiatus(angle, at, steps = 48) {
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = Math.cos(angle) * t * at.halfWidth * 0.94;
    const z = at.centreZ + Math.sin(angle) * t * at.halfDepth * 0.94;
    if (!inHiatus(x, z)) return t;
  }
  return 1;
}

/**
 * **The crossing this scene is for.** Where the ureter passes under the
 * structure that crosses it, on one side.
 *
 * In a woman that structure is the uterine artery and in a man it is the vas
 * deferens. They are different tubes with different jobs and they cross at the
 * same place, so the model takes both from here — and cannot end up making the
 * claim about one and not the other (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} side `LEFT` or `-LEFT`
 * @returns {[number, number, number]}
 */
export function bridgeAt(side) {
  return [side * 3.4, LEVELS.bridge, 0.8];
}

/**
 * A point along one ureter, from where it crosses the brim to the bladder.
 *
 * It passes **below** `bridgeAt` — by `UNDER_THE_BRIDGE` — and that offset is
 * the whole claim.
 *
 * @param {number} side `LEFT` or `-LEFT`
 * @param {number} t 0 at the brim, 1 at the bladder
 * @returns {[number, number, number]}
 */
export const UNDER_THE_BRIDGE = 0.9;
export function ureterPath(side, t) {
  const bridge = bridgeAt(side);
  if (t < 0.5) {
    const u = t / 0.5;
    return [
      lerp(side * 5.4, bridge[0] + side * 0.2, u),
      lerp(LEVELS.brim + 1.6, bridge[1] - UNDER_THE_BRIDGE, u),
      lerp(-1.6, bridge[2] - 0.4, u),
    ];
  }
  const u = (t - 0.5) / 0.5;
  return [
    lerp(bridge[0] + side * 0.2, side * 1.6, u),
    lerp(bridge[1] - UNDER_THE_BRIDGE, LEVELS.bladderTop - 1.8, u),
    lerp(bridge[2] - 0.4, 1.8, u),
  ];
}

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The brim, in the midline behind: the sacral promontory. */
  promontory: [0, LEVELS.brim, -4.4],
  /** The joint in front, and the landmark everything below is felt from. */
  symphysis: [0, LEVELS.floorLevel + 1.6, pelvisSection(LEVELS.floorLevel + 1.6).centreZ + 5.2],
  /** Where the ureter goes under the bridge, on the patient's left. */
  bridge: bridgeAt(LEFT),
  /** The gap in the floor. */
  hiatus: [0, LEVELS.hiatus, 0.6],
  /** The lowest point of the peritoneal cavity, behind the bladder. */
  pouch: [0, LEVELS.uterus - 1.6, -1.4],
  /** Where the bladder's outlet is, on the floor. */
  bladderNeck: [0, LEVELS.bladderTop - 3.4, 1.8],
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

/** Hold a vertex above the pelvic floor, unless it is in the gap. */
function keepAboveFloor(v, clearance = 0.2) {
  if (inHiatus(v.x, v.z)) return;
  const sling = floorAt(v.x, v.z) + clearance;
  if (v.y < sling) v.y = sling;
}

/** A closed shell whose cross-section at every height is given by `section`. */
function shellGeometry({ y0, y1, section, detail = 5 }) {
  return shapedSphere({
    detail,
    warp: (v) => {
      const down = (1 - v.y) / 2;
      const y = lerp(y0, y1, down);
      const at = section(y);
      const ring = Math.hypot(v.x, v.z);
      const girth = Math.min(1, ring * 2.6);
      const unitX = ring > 1e-5 ? v.x / ring : 0;
      const unitZ = ring > 1e-5 ? v.z / ring : 1;
      v.x = (at.centreX ?? 0) + unitX * girth * at.halfWidth;
      v.y = y;
      v.z = at.centreZ + unitZ * girth * at.halfDepth;
    },
  });
}

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildPelvis({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'pelvis';
  const disposables = [];
  const index = new Map();
  const groups = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    return add(id, new THREE.Mesh(geometry, built));
  };

  const several = (id, geometries, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(built);
    const meshes = geometries.map((geometry, i) => {
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, built);
      mesh.name = `${id}-${i + 1}`;
      object.add(mesh);
      return mesh;
    });
    groups.set(id, meshes);
    index.set(id, meshes[0]);
    return meshes;
  };

  const cord = (points, radius, { steps = 44, radial = 12, flatten = null } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    if (flatten) flattenTube(surface, flatten[0], flatten[1]);
    disposables.push(surface);
    return surface.geometry;
  };

  // --- the ring -------------------------------------------------------------
  //
  // Two hip bones and a sacrum, drawn as a ring rather than as a bowl: a shell
  // of revolution at these proportions reads as a plastic tub, and the shape
  // that says "pelvis" is the brim with a wing flaring off it and an outlet
  // below.
  solid(
    'pelvic-ring',
    (() => {
      const parts = [];
      const brim = [
        [0, 0.6, 5.6],
        [3.6, 0.4, 4.8],
        [7.2, 0.2, 1.6],
        [7.6, 0, -1.6],
        [4.2, -0.2, -4.4],
        [0, -0.4, -5.2],
      ];
      const tube = (points, radius) => {
        const surface = new TubeSurface(smoothCurve(points), {
          radius: () => radius,
          steps: 40,
          radial: 12,
        });
        disposables.push(surface);
        const geometry = surface.geometry.clone();
        return geometry;
      };
      for (const side of [LEFT, -LEFT]) {
        const mirrored = brim.map(([x, y, z]) => [side * x, y, z]);
        // The wing flaring up and out above the brim. Without it the frame is
        // two hoops, and two hoops read as a gyroscope rather than a pelvis.
        parts.push(
          warpGeometry(new THREE.BoxGeometry(1, 1, 1, 30, 1, 18), (v) => {
            const along = clamp((v.z + 0.5) * 0.9 + 0.05, 0, 1);
            const up = v.x + 0.5;
            const i = clamp(along * (brim.length - 1), 0, brim.length - 1.0001);
            const a = brim[Math.floor(i)];
            const b = brim[Math.floor(i) + 1];
            const f = i - Math.floor(i);
            const point = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
            const height = 3.6 * Math.sin(Math.PI * along) ** 0.38;
            v.x = side * (point[0] * (1 + 0.28 * up) + 0.3 * up * height) + (v.y > 0 ? 0.22 : -0.22);
            v.y = point[1] + up * height;
            v.z = point[2] * (1 - 0.14 * up);
          })
        );
        parts.push(tube(mirrored, 0.5));
        // The outlet: down the side wall to the ischial tuberosity, then
        // forward along the ramus to the symphysis.
        parts.push(
          tube(
            [
              [side * 7.4, -0.6, 0.4],
              [side * 7.2, -3.6, -1.0],
              [side * 6.4, LEVELS.perineum + 0.6, -1.2],
              [side * 3.6, LEVELS.perineum + 1.0, 2.8],
              [0, LEVELS.floorLevel + 1.4, 5.9],
            ],
            0.55
          )
        );
      }
      // The sacrum, closing the ring behind and hollow in front, which is the
      // curve the rectum follows.
      parts.push(
        warpGeometry(new THREE.BoxGeometry(1, 1, 1, 10, 22, 3), (v) => {
          const down = 0.5 - v.y;
          const y = lerp(LEVELS.brim + 0.4, LEVELS.perineum + 1.4, down);
          v.x *= 5.4 - 3.0 * down;
          v.y = y;
          v.z = -5.2 + 1.6 * down ** 1.4 + v.z * 1.4;
        })
      );
      for (const part of parts) {
        part.deleteAttribute('uv');
        part.deleteAttribute('normal');
      }
      const merged = mergeGeometries(parts);
      merged.computeVertexNormals();
      for (const part of parts) part.dispose();
      return merged;
    })(),
    '#e4dbc6',
    mineralMaterial,
    { roughness: 0.7 }
  );

  solid(
    'pubic-symphysis',
    (() => {
      const y = LEVELS.floorLevel + 1.6;
      const at = pelvisSection(y);
      const geometry = shapedSphere({ detail: 4, scale: [0.7, 1.5, 1.1] });
      geometry.translate(0, y, at.centreZ + at.halfDepth - 0.6);
      return geometry;
    })(),
    '#dfe6dd',
    tissueMaterial,
    { roughness: 0.3 }
  );

  // --- the floor ------------------------------------------------------------
  //
  // One sheet with a gap in it. `pelvic-floor-anatomy` separates the three
  // parts of the sling and the sphincters; here it is the boundary between two
  // countries.
  solid(
    'levator-ani',
    (() => {
      const at = pelvisSection(LEVELS.floorLevel);
      const rings = 24;
      const radial = 56;
      const positions = [];
      const indices = [];
      for (let i = 0; i <= rings; i += 1) {
        const r = i / rings;
        for (let j = 0; j <= radial; j += 1) {
          const a = (2 * Math.PI * j) / radial;
          // **A real hole, not a dimple.** Each ray starts where it leaves the
          // gap rather than at the centre: displacing the vertices inside the
          // gap instead drew a funnel hanging through it, which is a spike and
          // not an opening.
          const from = edgeOfHiatus(a, at);
          const t = lerp(from, 1, r);
          const x = Math.cos(a) * t * at.halfWidth * 0.94;
          const z = at.centreZ + Math.sin(a) * t * at.halfDepth * 0.94;
          positions.push(x, floorAt(x, z), z);
        }
      }
      for (let i = 0; i < rings; i += 1) {
        for (let j = 0; j < radial; j += 1) {
          const p = i * (radial + 1) + j;
          const q = p + radial + 1;
          indices.push(p, q, p + 1, p + 1, q, q + 1);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    })(),
    '#b8565a'
  );

  // The gap itself, as a body, because a gap is what the scene is about and a
  // gap cannot otherwise be pointed at.
  solid(
    'levator-hiatus',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 8, 8, 16), (v) => {
      v.x *= 2 * HIATUS.halfWidth * 0.96;
      v.z = (HIATUS.front + HIATUS.back) / 2 + v.z * (HIATUS.front - HIATUS.back) * 0.96;
      v.y = LEVELS.hiatus + v.y * 1.4;
    }),
    '#8fb6cc',
    wallMaterial,
    { opacity: 0.3 }
  );

  // --- the peritoneum, and its lowest point --------------------------------
  solid(
    'pelvic-peritoneum',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 52, 1, 44), (v) => {
      const x = v.x * 2 * 7.4;
      const z = v.z * 2 * 6.0;
      const up = v.y + 0.5;
      // Draped over the top of the organs and dipping behind the bladder.
      const dip = Math.exp(-Math.pow((z + 1.2) / 2.4, 2)) * Math.exp(-Math.pow(x / 5.4, 2));
      v.x = x;
      v.z = z + 0.4;
      v.y = LEVELS.brim - 1.2 - 3.4 * dip + up * 0.2;
    }),
    '#a8c4d8',
    wallMaterial,
    { opacity: 0.3 }
  );

  solid(
    'peritoneal-pouch',
    (() => {
      const geometry = shapedSphere({ detail: 4, scale: [3.0, 1.5, 1.4] });
      geometry.translate(...SITES.pouch);
      return geometry;
    })(),
    '#7fa8c4',
    wallMaterial,
    { opacity: 0.42 }
  );

  // --- the three passages and what feeds them ------------------------------
  solid(
    'bladder',
    warpGeometry(
      shapedSphere({
        detail: 5,
        scale: [3.4, 2.6, 3.0],
        warp: (v) => {
          // Empty: a flattened bowl sitting on the floor behind the pubis, not
          // the sphere a full one becomes.
          const down = smoothstep(0.2, -1, v.y);
          v.x *= 1 - 0.42 * down;
          v.z *= 1 - 0.36 * down;
        },
      }),
      (v) => {
        v.y += LEVELS.bladderTop - 2.0;
        v.z += 2.4;
        keepAboveFloor(v, 0.6);
      }
    ),
    '#c8a0b4'
  );

  several(
    'ureters',
    [LEFT, -LEFT].map((side) => {
      const points = [];
      for (let s = 0; s <= 10; s += 1) points.push(ureterPath(side, s / 10));
      return cord(points, 0.3, { radial: 10, steps: 34 });
    }),
    '#c9b4a0'
  );

  solid(
    'urethra',
    cord(
      [
        [0, LEVELS.bladderTop - 3.4, 2.0],
        [0, LEVELS.hiatus + 0.6, 1.8],
        [0, LEVELS.perineum + 0.6, 2.2],
      ],
      0.34,
      { radial: 10, steps: 20 }
    ),
    '#b49ac0'
  );

  solid(
    'rectum',
    cord(
      [
        [0, LEVELS.brim + 1.0, -3.8],
        [0, LEVELS.uterus, -3.4],
        [0, LEVELS.floorLevel + 1.2, -2.2],
        [0, LEVELS.hiatus - 0.2, -1.0],
      ],
      (u) => 1.7 - 0.5 * smoothstep(0.6, 1, u),
      { radial: 14, steps: 28 }
    ),
    '#c9a06e'
  );

  solid(
    'anal-canal',
    cord(
      [
        [0, LEVELS.hiatus - 0.2, -1.0],
        [0, LEVELS.perineum + 0.4, -0.6],
      ],
      0.95,
      { radial: 12, steps: 14 }
    ),
    '#b0855c'
  );

  solid(
    'sigmoid-colon',
    cord(
      [
        [LEFT * 6.4, LEVELS.crest - 0.6, 0.6],
        [LEFT * 4.0, LEVELS.brim + 0.4, -1.6],
        [LEFT * 0.6, LEVELS.brim + 1.6, -3.2],
        [0, LEVELS.brim + 1.0, -3.8],
      ],
      1.5,
      { radial: 14, steps: 24 }
    ),
    '#c9a06e'
  );

  // --- the vessels ----------------------------------------------------------
  several(
    'common-iliac-arteries',
    [LEFT, -LEFT].map((side) =>
      cord(
        [
          [side * 0.9, LEVELS.crest, -3.6],
          [side * 3.2, LEVELS.brim + 0.8, -3.0],
          [side * 5.0, LEVELS.brim - 0.4, -2.2],
        ],
        0.62,
        { radial: 12, steps: 20 }
      )
    ),
    '#b53a39'
  );

  several(
    'internal-iliac-artery',
    [LEFT, -LEFT].map((side) =>
      cord(
        [
          [side * 5.0, LEVELS.brim - 0.4, -2.2],
          [side * 5.0, LEVELS.bridge + 0.8, -1.4],
          [side * 4.2, LEVELS.floorLevel + 1.6, -0.4],
        ],
        0.42,
        { radial: 10, steps: 20 }
      )
    ),
    '#c0403e'
  );

  several(
    'external-iliac-vessels',
    [LEFT, -LEFT].map((side) => {
      const at = pelvisSection(LEVELS.floorLevel + 2.4);
      return cord(
        [
          [side * 5.0, LEVELS.brim - 0.4, -2.2],
          [side * 6.0, LEVELS.bridge, 1.0],
          [side * 5.6, LEVELS.floorLevel + 2.4, at.centreZ + at.halfDepth - 1.0],
        ],
        0.56,
        { radial: 12, steps: 20 }
      );
    }),
    '#8f5e8f'
  );

  // --- one set, and the other ----------------------------------------------
  //
  // **Nobody has both.** See `FEMALE_SET` and `MALE_SET`.
  solid(
    'uterus',
    warpGeometry(
      shapedSphere({
        detail: 5,
        scale: [2.0, 3.0, 1.3],
        warp: (v) => {
          // A pear, narrowing downwards into the cervix.
          const down = smoothstep(0.1, -1, v.y);
          v.x *= 1 - 0.62 * down;
          v.z *= 1 - 0.52 * down;
        },
      }),
      (v) => {
        // Lying forward over the bladder, which is what "anteverted" means and
        // is why the pouch behind it is the lowest point rather than in front.
        const lean = 0.5;
        const y = v.y;
        v.y = y * Math.cos(lean) - v.z * Math.sin(lean) + LEVELS.uterus;
        v.z = y * Math.sin(lean) + v.z * Math.cos(lean) + 0.4;
        keepAboveFloor(v, 1.2);
      }
    ),
    '#c06a80'
  );

  several(
    'ovaries-and-tubes',
    [LEFT, -LEFT].flatMap((side) => {
      const ovary = shapedSphere({ detail: 4, scale: [1.0, 0.7, 0.7] });
      ovary.translate(side * 4.6, LEVELS.uterus + 1.0, -0.8);
      const tube = cord(
        [
          [side * 1.5, LEVELS.uterus + 2.4, 0.8],
          [side * 3.4, LEVELS.uterus + 2.6, 0.2],
          [side * 4.6, LEVELS.uterus + 1.5, -0.6],
        ],
        0.26,
        { radial: 8, steps: 16 }
      );
      return [ovary, tube];
    }),
    '#d9a2a8'
  );

  solid(
    'vagina',
    cord(
      [
        [0, LEVELS.uterus - 2.2, 0.2],
        [0, LEVELS.hiatus + 0.4, 0.6],
        [0, LEVELS.perineum + 0.6, 0.8],
      ],
      0.8,
      { radial: 12, steps: 18, flatten: ['z', 0.36] }
    ),
    '#c48e9e'
  );

  // **The same crossing, drawn from the same point as the male one.**
  several(
    'uterine-artery',
    [LEFT, -LEFT].map((side) => {
      const bridge = bridgeAt(side);
      return cord(
        [
          [side * 5.0, LEVELS.bridge + 0.6, -1.6],
          bridge,
          [side * 1.8, LEVELS.uterus - 1.6, 0.6],
        ],
        0.24,
        { radial: 8, steps: 18 }
      );
    }),
    '#c0403e'
  );

  solid(
    'prostate',
    warpGeometry(
      shapedSphere({
        detail: 5,
        scale: [2.1, 1.8, 1.9],
        warp: (v) => {
          const down = smoothstep(0.2, -1, v.y);
          v.x *= 1 - 0.34 * down;
        },
      }),
      (v) => {
        v.y += LEVELS.prostate;
        v.z += 1.8;
        keepAboveFloor(v, 0.4);
      }
    ),
    '#a8707f'
  );

  several(
    'seminal-vesicles',
    [LEFT, -LEFT].map((side) => {
      const geometry = shapedSphere({ detail: 4, scale: [0.8, 1.4, 0.7] });
      geometry.translate(side * 1.9, LEVELS.prostate + 2.2, -0.4);
      return geometry;
    }),
    '#b08a9a'
  );

  // **The same crossing, from the same point.**
  several(
    'vas-deferens',
    [LEFT, -LEFT].map((side) => {
      const bridge = bridgeAt(side);
      return cord(
        [
          [side * 6.2, LEVELS.bridge + 2.4, 3.2],
          [side * 5.2, LEVELS.bridge + 0.6, 1.4],
          bridge,
          [side * 2.2, LEVELS.prostate + 2.6, -0.6],
        ],
        0.24,
        { radial: 8, steps: 22 }
      );
    }),
    '#e0d2a8'
  );

  // Centimetres to world units, in one place. See `WORLD_SCALE`.
  object.scale.setScalar(WORLD_SCALE);

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    meshesFor: (id) => groups.get(id) ?? (index.has(id) ? [index.get(id)] : []),
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
