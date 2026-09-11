import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The pelvic floor: a funnel of muscle with holes in it, slung across a ring.
 *
 * The bones are a frame here, not the subject. What matters is that **the floor
 * is a sheet with a gap at the front** — the urogenital hiatus, which the
 * urethra and the vagina pass through and which nothing closes off — and that
 * the one part of the sheet that is not a sheet, the **puborectalis**, is a
 * sling that passes *behind* the bowel and pulls it forward. The angle that
 * sling makes is the thing that holds continence, and it is a three-dimensional
 * fact: a flat drawing can show the hole or the sling but not both.
 *
 * ## A female pelvis, from in front and above
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is superior and `+z` anterior. The
 * paired structures are drawn on both sides from a single `LEFT` constant.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, angle, thickness or
 * bone dimension here is a measurement**, and nothing moves: nothing contracts,
 * nothing descends, and no pressure is represented.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/** The landmarks on the bony ring that the floor is slung between. */
export const FRAME = Object.freeze({
  /** The back of the pubic symphysis, in the midline. */
  symphysis: [0, 0.1, 3.5],
  /** Where the levator starts on the back of the pubis, on one side. */
  pubicOrigin: [LEFT * 1.0, 0.4, 3.24],
  /** The ischial spine: the back end of the tendinous arch. */
  ischialSpine: [LEFT * 3.3, -0.2, -0.85],
  /** The top of the sacrum, at the back of the brim. */
  sacralPromontory: [0, 2.4, -3.2],
  /** The tip of the coccyx, where the floor's back end attaches. */
  coccyxTip: [0, -1.0, -3.1],
});

/**
 * The two lines the pelvic floor is stretched between, as functions of one
 * parameter that runs front to back.
 *
 * **One pair of functions, five uses**: every part of the levator, and the
 * tendinous arch it hangs from, is a slice of the sheet between them. Written
 * separately per muscle they would drift the first time the floor changed shape
 * (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} t 0 at the pubis, 1 at the coccyx
 * @param {number} side `LEFT` or `-LEFT`
 */
export function levatorOrigin(t, side) {
  // Along the back of the pubis, then the tendinous arch on the side wall,
  // then the ischial spine, then onto the sacrum.
  const spine = [
    [1.0, 0.5, 3.24],
    [2.5, 0.36, 1.9],
    [3.2, 0.1, 0.4],
    [3.3, -0.2, -0.85],
    [2.2, 0.2, -2.4],
  ];
  const point = alongPolyline(spine, t);
  return [side * point[0], point[1], point[2]];
}

/**
 * Where the sheet ends medially. In front it stops short of the midline: that
 * gap **is** the urogenital hiatus. Behind it reaches the midline raphe and
 * then the coccyx.
 */
export function levatorInsertion(t, side) {
  const spine = [
    [0.92, -1.06, 2.35],
    [0.86, -1.44, 0.55],
    [0.52, -1.46, -0.62],
    [0.12, -1.24, -1.9],
    [0.1, -1.0, -3.05],
  ];
  const point = alongPolyline(spine, t);
  return [side * point[0], point[1], point[2]];
}

/** Walk a polyline of control points with a single 0–1 parameter. */
function alongPolyline(points, t) {
  const span = clamp(t, 0, 1) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(span));
  const f = span - i;
  return [
    lerp(points[i][0], points[i + 1][0], f),
    lerp(points[i][1], points[i + 1][1], f),
    lerp(points[i][2], points[i + 1][2], f),
  ];
}

/**
 * How far the hiatus reaches back.
 *
 * The gap in the front of the sheet is a real gap, not a display one: the
 * urethra and the vagina go through it. Past this the two sides meet.
 */
export const HIATUS_BACK_T = 0.34;

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The middle of the urogenital hiatus, between the two sides of the sheet. */
  hiatus: [0, -1.2, 1.9],
  /** The anorectal junction, where the sling passes behind the bowel. */
  anorectalJunction: [0, -1.5, -0.35],
  /** The perineal body: the knot everything in the perineum is tied into. */
  perinealBody: [0, -1.72, 0.66],
  /** Where the urethra crosses the floor. */
  urethraThroughFloor: [0, -1.5, 2.5],
  /** Where the vagina crosses it. */
  vaginaThroughFloor: [0, -1.4, 1.6],
  /** The ischial spine, which is the landmark for everything lateral. */
  ischialSpine: FRAME.ischialSpine,
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
 * One slice of the levator sheet, from `t0` to `t1` along the two lines.
 *
 * Every named part of the levator is one of these. The sheet sags between its
 * two edges rather than running straight, because that is what makes it a
 * funnel rather than a shelf.
 */
function levatorSheet(t0, t1, side, { thickness = 0.12, sag = 0.3 } = {}) {
  return warpGeometry(new THREE.BoxGeometry(1, 1, 1, 24, 1, 24), (v) => {
    const along = v.z + 0.5;
    const across = v.x + 0.5;
    const t = lerp(t0, t1, along);
    const origin = levatorOrigin(t, side);
    const insertion = levatorInsertion(t, side);
    const x = lerp(origin[0], insertion[0], across);
    const y = lerp(origin[1], insertion[1], across) - sag * Math.sin(Math.PI * across);
    const z = lerp(origin[2], insertion[2], across);
    v.x = x;
    v.y = y + (v.y > 0 ? thickness : -thickness);
    v.z = z;
  });
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildPelvicFloor({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'pelvic-floor';
  const disposables = [];
  const index = new Map();
  const pairs = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, position, color, material = tissueMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    const mesh = add(id, new THREE.Mesh(geometry, built));
    if (position) mesh.position.set(...position);
    return mesh;
  };

  const mirrored = (id, build, color, material = tissueMaterial) => {
    const built = material({ color: colors[id] ?? color });
    disposables.push(built);
    const meshes = [];
    for (const side of [LEFT, -LEFT]) {
      const geometry = build(side);
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, built);
      mesh.name = `${id}-${side === LEFT ? 'left' : 'right'}`;
      object.add(mesh);
      meshes.push(mesh);
    }
    pairs.set(id, meshes);
    index.set(id, meshes[0]);
    return meshes;
  };

  const tube = (points, radius) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps: 44,
      radial: 16,
    });
    disposables.push(surface);
    return surface.geometry;
  };

  // --- the frame -----------------------------------------------------------
  //
  // **The bones are a frame, not the subject.** They are drawn as the ring the
  // floor is slung across — the brim, the side walls and the rami round the
  // outlet — and not as hip bones: there is no wing, no acetabulum and no
  // obturator foramen here.
  solid(
    'pelvic-ring',
    (() => {
      const parts = [];
      const brim = [
        [0, 0.9, 3.6],
        [1.9, 1.3, 3.1],
        [3.4, 1.9, 1.2],
        [3.5, 2.2, -0.8],
        [1.9, 2.4, -2.6],
        [0, 2.4, -3.2],
      ];
      for (const side of [LEFT, -LEFT]) {
        // The wing flaring up and out above the brim. Without it the frame is
        // two hoops, and two hoops read as a gyroscope rather than a pelvis.
        parts.push(
          warpGeometry(new THREE.BoxGeometry(1, 1, 1, 26, 1, 16), (v) => {
            const along = clamp((v.z + 0.5) * 0.92 + 0.04, 0, 1);
            const up = v.x + 0.5;
            const point = alongPolyline(brim, along);
            // Highest and widest over the middle of the brim, and running out
            // at both ends.
            const height = 1.95 * Math.sin(Math.PI * along) ** 0.62;
            // The plate faces laterally, so its thickness is in x.
            v.x = side * (point[0] * (1 + 0.3 * up) + 0.12 * up * height) + (v.y > 0 ? 0.09 : -0.09);
            v.y = point[1] + up * height;
            v.z = point[2] * (1 - 0.16 * up);
          })
        );
        // The brim, from the symphysis round to the sacrum.
        parts.push(
          tube(
            [
              [0, 0.9, 3.6],
              [side * 1.9, 1.3, 3.1],
              [side * 3.4, 1.9, 1.2],
              [side * 3.5, 2.2, -0.8],
              [side * 1.9, 2.4, -2.6],
              [0, 2.4, -3.2],
            ],
            0.22
          )
        );
        // The outlet: down the side wall to the ischial tuberosity and forward
        // along the ramus to the symphysis.
        parts.push(
          tube(
            [
              [side * 3.5, 1.9, 0.2],
              [side * 3.9, 0.2, -0.6],
              [side * 3.5, -1.9, -0.9],
              [side * 2.4, -2.1, 1.0],
              [side * 0.7, -1.3, 3.1],
              [0, -0.5, 3.5],
            ],
            0.24
          )
        );
      }
      for (const part of parts) {
        part.deleteAttribute('uv');
        part.deleteAttribute('normal');
        part.computeVertexNormals();
      }
      const combined = mergeGeometries(parts, false);
      for (const part of parts) part.dispose();
      return combined;
    })(),
    null,
    '#e8e0cb',
    mineralMaterial
  );

  solid(
    'sacrum',
    shapedSphere({
      detail: 5,
      scale: [1.0, 1.7, 0.36],
      warp: (v) => {
        // Wide and flat above, narrowing to a point below, and curved forward.
        v.x *= 1 - 0.62 * smoothstep(0.3, -1, v.y);
        v.z += 1.3 * smoothstep(0.4, -1, v.y) * 0.6;
      },
    }),
    [0, 0.9, -3.4],
    '#ece4d0',
    mineralMaterial
  );

  solid(
    'coccyx',
    tube(
      [
        [0, -0.5, -3.2],
        [0, -0.82, -3.08],
        [0, -1.0, -2.92],
      ],
      (t) => 0.24 - 0.12 * t
    ),
    null,
    '#e6ddc6',
    mineralMaterial
  );

  // --- the side wall the floor hangs from ----------------------------------
  mirrored(
    'obturator-internus',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [0.26, 1.0, 1.5],
        warp: (v) => {
          v.y *= 1 - 0.3 * smoothstep(0, 1, Math.abs(v.z));
        },
      });
      geometry.translate(side * 3.7, 0.0, 0.6);
      return geometry;
    },
    '#c4816f',
    tissueMaterial
  );

  // The thickening on that wall the sheet actually attaches to. It is the same
  // line the sheet's origin runs along — drawn, so it can be pointed at.
  mirrored(
    'tendinous-arch',
    (side) =>
      tube(
        [0, 0.25, 0.5, 0.75].map((t) => levatorOrigin(t, side)),
        0.11
      ),
    '#ded2b0',
    tissueMaterial
  );

  // --- the floor itself -----------------------------------------------------
  //
  // Three named slices of one sheet, front to back. In front the two sides stop
  // short of the midline and the gap between them is the hiatus.
  mirrored('pubococcygeus', (side) => levatorSheet(0, 0.42, side, { sag: 0.34 }), '#cf8878', wallMaterial);
  mirrored('iliococcygeus', (side) => levatorSheet(0.42, 0.78, side, { sag: 0.26 }), '#c47d70', wallMaterial);
  mirrored('coccygeus', (side) => levatorSheet(0.78, 1, side, { sag: 0.1, thickness: 0.1 }), '#b8756c', wallMaterial);

  // The one part of the floor that is not a sheet: a sling from the back of
  // one pubis, **behind the bowel**, and back to the other. Pulling on it bends
  // the bowel forward, and that bend is what holds.
  solid(
    'puborectalis',
    tube(
      [
        [LEFT * 0.86, -1.0, 3.1],
        [LEFT * 0.98, -1.34, 1.4],
        [LEFT * 0.9, -1.52, 0.1],
        [LEFT * 0.5, -1.6, -0.78],
        [0, -1.6, -1.02],
        [-LEFT * 0.5, -1.6, -0.78],
        [-LEFT * 0.9, -1.52, 0.1],
        [-LEFT * 0.98, -1.34, 1.4],
        [-LEFT * 0.86, -1.0, 3.1],
      ],
      0.19
    ),
    null,
    '#d9756a',
    tissueMaterial
  );

  // The gap in the front of the sheet, drawn as the space it is — because the
  // thing worth pointing at here is an absence.
  solid(
    'urogenital-hiatus',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 16, 1, 20), (v) => {
      const along = v.z + 0.5;
      const t = lerp(0.02, HIATUS_BACK_T, along);
      const edge = levatorInsertion(t, LEFT);
      v.x = v.x * 2 * edge[0] * 0.94;
      v.z = lerp(2.9, edge[2], 0.5) + (0.5 - along) * 1.2;
      v.y = edge[1] - 0.12 + (v.y > 0 ? 0.05 : -0.05);
    }),
    null,
    '#8fc0d8',
    wallMaterial
  );

  // --- the perineum ---------------------------------------------------------
  //
  // The knot in the middle of it. Everything in the perineum is tied into this
  // one lump of fibrous tissue, which is why a tear through it matters out of
  // proportion to its size.
  solid(
    'perineal-body',
    shapedSphere({ detail: 4, scale: [0.3, 0.26, 0.24] }),
    [0, -1.72, 0.66],
    '#e7dba6',
    tissueMaterial
  );

  // The sheet below the floor, across the front half of the outlet.
  solid(
    'perineal-membrane',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 22, 1, 18), (v) => {
      const along = v.z + 0.5;
      const z = lerp(2.9, 0.5, along);
      const half = 1.7 * Math.sin(Math.PI * 0.5 * (0.25 + 0.75 * along));
      v.x = v.x * 2 * half;
      v.z = z;
      v.y = -2.0 - 0.16 * along + (v.y > 0 ? 0.05 : -0.05);
    }),
    null,
    '#dccf9c',
    wallMaterial
  );

  solid(
    'external-anal-sphincter',
    (() => {
      const points = [];
      for (let i = 0; i <= 40; i += 1) {
        const a = (2 * Math.PI * i) / 40;
        points.push([Math.sin(a) * 0.52, -2.05 + Math.cos(a) * 0.1, -0.5 + Math.cos(a) * 0.5]);
      }
      return tube(points, 0.17);
    })(),
    null,
    '#c4685f',
    tissueMaterial
  );

  // --- what goes through it -------------------------------------------------
  solid(
    'urethra',
    tube(
      [
        [0, 0.1, 2.4],
        [0, -0.8, 2.48],
        [0, -1.6, 2.52],
        [0, -2.3, 2.5],
      ],
      0.16
    ),
    null,
    '#d8b96f',
    mucosaMaterial
  );

  solid(
    'vagina',
    warpGeometry(
      shapedSphere({
        detail: 5,
        scale: [0.62, 1.5, 0.2],
        warp: (v) => {
          v.x *= 1 - 0.44 * smoothstep(0.2, -1, v.y);
        },
      }),
      (v) => {
        // Leaning forward as it descends, so that it crosses the floor in front
        // of the bowel and behind the urethra.
        v.z += 0.42 * smoothstep(1.2, -1.6, v.y);
      }
    ),
    [0, -0.6, 1.2],
    '#d69a95',
    wallMaterial
  );

  solid(
    'rectum',
    tube(
      [
        [0, 1.9, -2.5],
        [0, 0.6, -1.9],
        [0, -0.7, -1.4],
        [0, -1.35, -0.9],
      ],
      0.5
    ),
    null,
    '#cf8f7c',
    wallMaterial
  );

  // The last short length, angled forward by the sling above it.
  solid(
    'anal-canal',
    tube(
      [
        [0, -1.35, -0.9],
        [0, -1.72, -0.66],
        [0, -2.12, -0.48],
      ],
      0.3
    ),
    null,
    '#c07c6e',
    wallMaterial
  );

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    meshesFor: (id) => pairs.get(id) ?? (index.has(id) ? [index.get(id)] : []),
    anchorPoints: Object.fromEntries(
      Object.entries(SITES).map(([key, point]) => [key, new THREE.Vector3(...point)])
    ),
    dispose: () => {
      for (const item of disposables) item.dispose?.();
    },
  };
}
