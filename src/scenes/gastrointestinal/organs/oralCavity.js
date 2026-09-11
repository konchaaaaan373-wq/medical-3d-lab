import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The mouth: a roof, a floor, a tongue between them, and four ways in.
 *
 * Two things make this worth three dimensions rather than a diagram. The first
 * is that **the tongue is not one organ with one nerve** — a line across it,
 * the sulcus terminalis, separates a front two-thirds that came from the mouth
 * from a back third that came from the pharynx, and the row of large papillae
 * along that line is the only thing on the surface that marks it. The second is
 * that **the three pairs of salivary glands all sit outside the mouth and open
 * into it through ducts that go somewhere non-obvious**: the parotid across the
 * cheek to a back tooth, the submandibular forwards under the tongue to a point
 * beside the frenulum. Where a duct opens is not where its gland is.
 *
 * ## A mouth, drawn open, looked at from in front
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is superior and `+z` anterior — towards
 * the lips.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, angle or gland volume
 * here is a measurement**, and nothing moves: nothing is chewed or swallowed,
 * the tongue does not move, the jaw does not close, and no saliva flows.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/**
 * How far the jaw is drawn open.
 *
 * **A display value, and a position rather than a shape.** A mouth at rest is
 * closed, and a closed mouth shows nothing at all — no tongue, no arches, no
 * tonsils, no palate. Everything carried on the mandible is lowered by this
 * much from occlusion, exactly as a jaw lowers in life; **nothing is stretched
 * or resized to do it**, and no measurement of opening may be read off it.
 */
export const JAW_DISPLAY_OPENING = 1.3;

/** The heights everything is placed against. */
export const LEVELS = Object.freeze({
  /** The roof of the mouth at its highest, in the midline. */
  palate: 0.86,
  /** The biting edge of the upper teeth. */
  upperTeeth: 0.02,
  /** The biting edge of the lower teeth, lowered by the display opening. */
  lowerTeeth: 0.02 - JAW_DISPLAY_OPENING,
  /** The top of the tongue at its sides; it domes up from there. */
  tongueSurface: -1.42,
  /** The floor of the mouth, slung between the two sides of the jaw. */
  floor: -2.24,
  /** The lower border of the mandible. */
  jawBase: -3.04,
});

/**
 * The line across the tongue where its front two-thirds end.
 *
 * In front of it the tongue came from the mouth; behind it, from the pharynx,
 * and they are supplied by different nerves for both touch and taste. **Nothing
 * on the surface marks it except the row of large papillae**, which is why they
 * are drawn: they are the boundary, made visible.
 */
export const SULCUS_Z = -1.24;

/** The dental arch: how wide the row of teeth is at a given depth. */
export function archHalfWidth(z) {
  const along = clamp((3.3 - z) / 3.7, 0, 1);
  return 0.42 + 1.24 * Math.sin(Math.PI * 0.5 * Math.min(1, along * 1.55));
}

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The tip of the tongue. */
  tongueTip: [0, LEVELS.tongueSurface - 0.1, 3.0],
  /** The middle of the row of large papillae, on the boundary line. */
  sulcus: [0, LEVELS.tongueSurface + 0.06, SULCUS_Z],
  /** The fauces: the doorway from mouth to pharynx. */
  fauces: [0, -1.1, -2.3],
  /** Where the submandibular duct opens, beside the frenulum. */
  caruncle: [LEFT * 0.16, LEVELS.floor + 0.26, 2.5],
  /** Where the parotid duct opens, opposite an upper back tooth. */
  parotidOpening: [LEFT * 1.5, LEVELS.upperTeeth + 0.34, 0.5],
  /** The left palatine tonsil, in its bed between the two arches. */
  tonsil: [LEFT * 1.36, -0.9, -2.06],
  /** The vallecula behind the root of the tongue, on the way to the larynx. */
  vallecula: [0, -1.9, -3.1],
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
 * A band following the dental arch: teeth, gum, or the floor between them.
 *
 * `archHalfWidth` is shared by everything that follows the arch, so a row of
 * teeth and the jaw under it cannot disagree about where the arch is
 * (`docs/architecture-rules.md` rule 1).
 */
function archGeometry({ y0, y1, z0 = 3.34, z1 = -0.5, inset = 0, thickness = 0.2, steps = 34, rings = 10 }) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    // Round the front of the arch rather than stopping square at the midline.
    const z = lerp(z0, z1, u);
    const half = archHalfWidth(z) - inset;
    for (let j = 0; j <= rings; j += 1) {
      const a = (2 * Math.PI * j) / rings;
      // Around the cross-section of the band: a rounded bar, not a ribbon.
      const across = Math.cos(a) * thickness;
      const up = Math.sin(a) * ((y1 - y0) / 2);
      positions.push(half + across, (y0 + y1) / 2 + up, z);
    }
  }
  // The other half of the arch is the mirror of this one, welded at the front.
  const rowWidth = rings + 1;
  const rows = steps + 1;
  const mirrorOffset = positions.length / 3;
  for (let i = 0; i < mirrorOffset; i += 1) positions.push(-positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
  const strip = (offset, flip) => {
    for (let i = 0; i < rows - 1; i += 1) {
      for (let j = 0; j < rings; j += 1) {
        const a = offset + i * rowWidth + j;
        const b = a + 1;
        const c = a + rowWidth;
        const d = c + 1;
        if (flip) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  };
  strip(0, false);
  strip(mirrorOffset, true);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildOralCavity({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'oral-cavity';
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

  /** One structure, both sides, two meshes. */
  const mirrored = (id, build, color, material = tissueMaterial) => {
    const built = material({ color: colors[id] ?? color });
    disposables.push(built);
    const meshes = [];
    for (const side of [LEFT, -LEFT]) {
      const parts = [].concat(build(side));
      for (const geometry of parts) {
        disposables.push(geometry);
        const mesh = new THREE.Mesh(geometry, built);
        mesh.name = `${id}-${side === LEFT ? 'left' : 'right'}`;
        object.add(mesh);
        meshes.push(mesh);
      }
    }
    pairs.set(id, meshes);
    index.set(id, meshes[0]);
    return meshes;
  };

  const cordGeometry = (points, radius) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps: 30, radial: 12 });
    disposables.push(surface);
    return surface.geometry;
  };

  // --- the way in ----------------------------------------------------------
  solid(
    'lips',
    (() => {
      const points = [];
      for (let i = 0; i <= 40; i += 1) {
        const a = (2 * Math.PI * i) / 40;
        const x = Math.sin(a) * 1.26;
        const y = -0.63 + Math.cos(a) * 0.98;
        // Fuller at the top and bottom than at the corners, and the upper lip
        // dips in the midline.
        const dip = 0.12 * Math.cos(a) * smoothstep(0.4, 1, Math.cos(a));
        points.push([x, y - dip, 3.5 - 0.28 * Math.abs(Math.sin(a))]);
      }
      const surface = new TubeSurface(smoothCurve(points, { closed: true }), {
        radius: (t) => 0.2 + 0.12 * Math.abs(Math.cos(2 * Math.PI * t)),
        steps: 72,
        radial: 16,
      });
      disposables.push(surface);
      return surface.geometry;
    })(),
    null,
    '#cf8478',
    tissueMaterial,
    { opacity }
  );

  // --- the roof ------------------------------------------------------------
  //
  // The hard palate: a vault, higher in the midline than at the sides, running
  // back from behind the front teeth.
  solid(
    'hard-palate',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 30, 1, 30), (v) => {
      const along = v.z + 0.5;
      const z = lerp(3.2, -0.52, along);
      const half = archHalfWidth(z) - 0.16;
      const x = v.x * 2 * half;
      v.x = x;
      v.z = z;
      // Arched across, and a little deeper towards the back.
      const arch = (0.3 + 0.14 * along) * (1 - (x / Math.max(0.2, half)) ** 2);
      v.y = LEVELS.palate - 0.3 + arch + (v.y > 0 ? 0.06 : -0.06);
    }),
    null,
    '#eec3b4',
    wallMaterial
  );

  // The soft palate: the roof carrying on backwards and downwards, with the
  // uvula on the end of it. It is the door between mouth and nose.
  solid(
    'soft-palate',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 26, 1, 22), (v) => {
      const along = v.z + 0.5;
      const z = lerp(-0.52, -2.5, along);
      const half = (archHalfWidth(-0.5) - 0.16) * (1 - 0.38 * along ** 1.8);
      const x = v.x * 2 * half;
      const midline = 1 - Math.min(1, Math.abs(x) * 2.2);
      v.x = x;
      v.z = z;
      v.y =
        LEVELS.palate -
        0.3 -
        0.92 * along ** 1.7 -
        0.44 * along ** 5 * midline +
        (v.y > 0 ? 0.07 : -0.07);
    }),
    null,
    '#e5a79c',
    wallMaterial
  );

  // The two arches that frame the doorway, and the tonsil in the bed between
  // them. The front arch runs down onto the side of the tongue, which is what
  // its name says and what makes the doorway a doorway.
  mirrored(
    'palatoglossal-arch',
    (side) =>
      cordGeometry(
        [
          [side * 0.44, LEVELS.palate - 0.66, -2.12],
          [side * 1.12, -0.5, -1.9],
          [side * 1.34, -1.1, -1.62],
          [side * 1.16, LEVELS.tongueSurface + 0.16, -1.48],
        ],
        0.12
      ),
    '#dd9a92',
    mucosaMaterial
  );

  mirrored(
    'palatine-tonsil',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [0.2, 0.34, 0.24],
        warp: (v) => {
          v.z *= 1 - 0.28 * smoothstep(0, 1, Math.abs(v.y));
        },
      });
      geometry.translate(side * 1.36, -0.9, -2.06);
      return geometry;
    },
    '#d5827e',
    mucosaMaterial
  );

  // --- the two rows of teeth, and the bone the lower one stands in ----------
  solid(
    'upper-teeth',
    archGeometry({ y0: LEVELS.upperTeeth, y1: LEVELS.upperTeeth + 0.62, thickness: 0.19 }),
    null,
    '#f6f2e6',
    (options) => mineralMaterial({ ...options, roughness: 0.34 })
  );
  solid(
    'lower-teeth',
    archGeometry({ y0: LEVELS.lowerTeeth - 0.6, y1: LEVELS.lowerTeeth, thickness: 0.18, z0: 3.2, z1: -0.58 }),
    null,
    '#f4efe2',
    (options) => mineralMaterial({ ...options, roughness: 0.34 })
  );

  solid(
    'mandible',
    (() => {
      // The body follows the same arch as the teeth standing in it, and a
      // ramus rises from each end of it. Without the rami a mandible is a
      // horseshoe, and a horseshoe is not what anybody recognises as a jaw.
      const parts = [
        archGeometry({
          y0: LEVELS.jawBase,
          y1: LEVELS.lowerTeeth - 0.58,
          thickness: 0.3,
          z0: 3.24,
          z1: -1.5,
        }),
      ];
      for (const side of [LEFT, -LEFT]) {
        parts.push(
          warpGeometry(new THREE.BoxGeometry(1, 1, 1, 2, 16, 10), (v) => {
            const up = v.y + 0.5;
            const along = v.z + 0.5;
            v.x = side * (1.62 - 0.13 * up) + v.x * 0.26;
            v.y = lerp(LEVELS.jawBase + 0.12, 0.72, up);
            v.z = lerp(-1.32, -2.4, along) - 0.52 * up;
          })
        );
        // The arch carries no UVs, so neither may the rami, or the merge is
        // refused.
        parts[parts.length - 1].deleteAttribute('uv');
        parts[parts.length - 1].deleteAttribute('normal');
      }
      for (const part of parts) part.computeVertexNormals();
      const combined = mergeGeometries(parts, false);
      for (const geometry of parts) geometry.dispose();
      return combined;
    })(),
    null,
    '#eae2cd',
    mineralMaterial
  );

  // --- the tongue -----------------------------------------------------------
  //
  // Drawn in two parts because it **is** two parts: a front two-thirds from
  // the mouth and a back third from the pharynx, meeting at `SULCUS_Z`.
  const tongueSurface = (x, z) => {
    // Domed across, falling away at the tip, and lower at the back where the
    // root turns down towards the pharynx.
    const across = 1 - Math.min(1, (Math.abs(x) / 1.44) ** 2);
    const tip = smoothstep(2.4, 3.1, z);
    const back = smoothstep(-1.0, -2.9, z);
    return LEVELS.tongueSurface + 0.46 * across - 0.3 * tip - 0.9 * back;
  };

  /** The underside of the tongue: lowest in the midline, rising at the sides
   *  to leave the floor of the mouth and the glands in it their room. */
  const tongueUnder = (x) => LEVELS.floor + 0.16 + 0.52 * Math.min(1, (Math.abs(x) / 1.46) ** 2);

  const tonguePart = (z0, z1) =>
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 30, 1, 28), (v) => {
      const along = v.z + 0.5;
      const z = lerp(z0, z1, along);
      const half = 1.46 * (1 - 0.72 * smoothstep(2.3, 3.08, z) ** 1.4) * (1 - 0.2 * smoothstep(-1.6, -3.0, z));
      const x = v.x * 2 * half;
      v.x = x;
      v.z = z;
      v.y = v.y > 0 ? tongueSurface(x, z) : tongueUnder(x);
    });

  solid('tongue-oral-part', tonguePart(3.08, SULCUS_Z), null, '#dd8f85', wallMaterial);
  solid('tongue-root', tonguePart(SULCUS_Z, -3.0), null, '#cf7f7c', wallMaterial);

  // The row of large papillae: a V lying on the boundary, opening forwards.
  // **They are the only thing on the surface that marks it.**
  solid(
    'vallate-papillae',
    (() => {
      const merged = [];
      for (let i = 0; i < 9; i += 1) {
        const t = (i / 8) * 2 - 1;
        const x = t * 1.0;
        const z = SULCUS_Z + 0.34 * (1 - Math.abs(t)) + 0.02;
        const geometry = shapedSphere({ detail: 3, scale: [0.11, 0.05, 0.11] });
        geometry.translate(x, tongueSurface(x, z) + 0.02, z);
        merged.push(geometry);
      }
      const combined = mergeGeometries(merged);
      for (const geometry of merged) geometry.dispose();
      return combined;
    })(),
    null,
    '#c66f6c',
    mucosaMaterial
  );

  // The lingual tonsil: the lumpy surface of the root, behind the boundary.
  solid(
    'lingual-tonsil',
    (() => {
      const merged = [];
      for (let i = 0; i < 10; i += 1) {
        const x = ((i % 5) / 4 - 0.5) * 1.7;
        const z = SULCUS_Z - 0.46 - Math.floor(i / 5) * 0.62;
        const geometry = shapedSphere({ detail: 3, scale: [0.24, 0.1, 0.22] });
        geometry.translate(x, tongueSurface(x, z) + 0.04, z);
        merged.push(geometry);
      }
      const combined = mergeGeometries(merged);
      for (const geometry of merged) geometry.dispose();
      return combined;
    })(),
    null,
    '#c0787e',
    mucosaMaterial
  );

  // --- under the tongue -----------------------------------------------------
  solid(
    'floor-of-mouth',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 26, 1, 26), (v) => {
      const along = v.z + 0.5;
      const z = lerp(3.0, -1.3, along);
      const half = archHalfWidth(z) - 0.3;
      const x = v.x * 2 * half;
      v.x = x;
      v.z = z;
      // Slung between the two sides of the jaw, and sagging in the middle.
      const sag = 0.26 * (1 - (x / Math.max(0.2, half)) ** 2);
      v.y = LEVELS.floor - sag + (v.y > 0 ? 0.05 : -0.05);
    }),
    null,
    '#dfa79c',
    wallMaterial
  );

  solid(
    'lingual-frenulum',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 2, 14, 16), (v) => {
      const along = v.z + 0.5;
      const up = v.y + 0.5;
      const z = lerp(2.72, 1.62, along);
      v.x = v.x * 0.1;
      v.z = z;
      v.y = lerp(LEVELS.floor + 0.08, LEVELS.floor + 0.62 + 0.2 * along, up);
    }),
    null,
    '#e6b3a8',
    wallMaterial
  );

  // --- the three pairs of glands, and where each one actually opens ---------
  mirrored(
    'sublingual-gland',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [0.2, 0.18, 0.56],
        warp: (v) => {
          v.y *= 1 - 0.3 * smoothstep(0, 1, Math.abs(v.z));
        },
      });
      geometry.translate(side * 1.12, LEVELS.floor + 0.26, 1.9);
      return geometry;
    },
    '#e0c38e',
    tissueMaterial
  );

  mirrored(
    'submandibular-gland',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [0.34, 0.3, 0.46],
        warp: (v) => {
          v.z *= 1 + 0.3 * smoothstep(0, 1, v.z);
        },
      });
      geometry.translate(side * 1.42, LEVELS.jawBase - 0.04, -1.1);
      return geometry;
    },
    '#d9b579',
    tissueMaterial
  );

  // Forwards, under the tongue, all the way to a point beside the frenulum —
  // which is a long way from the gland it comes from.
  mirrored(
    'submandibular-duct',
    (side) =>
      cordGeometry(
        [
          [side * 1.42, LEVELS.jawBase + 0.04, -1.12],
          [side * 1.3, LEVELS.jawBase + 0.62, -0.8],
          [side * 1.1, LEVELS.floor + 0.16, -0.1],
          [side * 0.7, LEVELS.floor + 0.22, 1.2],
          [side * 0.16, LEVELS.floor + 0.26, 2.5],
        ],
        0.062
      ),
    '#c8a25e',
    mucosaMaterial
  );

  mirrored(
    'parotid-gland',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [0.3, 0.62, 0.42],
        warp: (v) => {
          v.y -= 0.3 * smoothstep(0.1, -1, v.y);
        },
      });
      geometry.translate(side * 2.12, -0.6, -2.34);
      return geometry;
    },
    '#e4cb9c',
    tissueMaterial
  );

  // Across the cheek to open opposite an upper back tooth: the one fact about
  // a parotid that is not where the gland is.
  mirrored(
    'parotid-duct',
    (side) =>
      cordGeometry(
        [
          [side * 2.0, -0.24, -2.1],
          [side * 1.86, 0.14, -1.0],
          [side * 1.7, 0.34, 0.0],
          [side * 1.5, LEVELS.upperTeeth + 0.34, 0.5],
        ],
        0.06
      ),
    '#cfae68',
    mucosaMaterial
  );

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    meshesFor: (id) => pairs.get(id) ?? (index.has(id) ? [index.get(id)] : []),
    tongueSurface,
    anchorPoints: Object.fromEntries(
      Object.entries(SITES).map(([key, point]) => [key, new THREE.Vector3(...point)])
    ),
    dispose: () => {
      for (const item of disposables) item.dispose?.();
    },
  };
}
