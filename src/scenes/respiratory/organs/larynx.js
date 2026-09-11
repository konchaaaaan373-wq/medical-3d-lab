import * as THREE from 'three';
import { clamp, latheFromProfile, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The larynx and the pharynx: the place where the two ways cross.
 *
 * Everything above this runs in two separate tubes — one for air, one for food
 * — and everything below it runs in two separate tubes again. In between,
 * **for a few centimetres, they share one space**, and the larynx sits in the
 * front wall of it with its opening facing up into the traffic. That crossing
 * is the whole subject: the epiglottis, the folds that close, the two gutters
 * that carry a swallow round the outside of the airway, and the ring of
 * cartilage that keeps the airway open while it all happens.
 *
 * ## A midline organ, looked at from in front
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is superior and `+z` anterior. The
 * paired structures — tonsils, piriform sinuses, arytenoids, folds, nerves —
 * are drawn on both sides from a single `LEFT` constant.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre, angle or
 * cartilage dimension here is a measurement**, and nothing moves: nothing is
 * swallowed, the larynx does not rise, the epiglottis does not fold and **the
 * vocal folds neither open nor close**. They are drawn parted, at one width.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/**
 * The heights everything in the larynx is placed against.
 *
 * The four that matter are in order down the airway: the vestibular folds, the
 * ventricle between them, the vocal folds, and the subglottis below. Nothing
 * else in this file may place itself at a number that duplicates one of these.
 */
export const LEVELS = Object.freeze({
  /** The top of the pharynx, at the skull base. */
  skullBase: 4.6,
  /** Where the nasopharynx ends and the oropharynx begins: the soft palate. */
  softPalate: 3.3,
  /** Where the oropharynx ends and the larynx starts to fill the front wall. */
  laryngealInlet: 1.2,
  /** The false folds. */
  vestibularFold: 0.38,
  /** The pocket between the two pairs of folds. */
  ventricle: 0.19,
  /** The true folds. The airway's narrowest point in an adult. */
  vocalFold: 0.0,
  /** The space below them, inside the cricoid ring. */
  subglottis: -0.55,
  /** Where the cricoid ends and the trachea begins. */
  cricoidBase: -0.95,
  /** The bottom of what this scene draws. */
  floor: -3.3,
});

/**
 * How far from the midline each vocal fold's free edge is **at the back**.
 *
 * **A display value.** Folds at rest are apart and folds in phonation are
 * together, and this scene does neither — it draws one fixed opening so that
 * both folds and the slit between them can be seen and selected. **No airway
 * calibre may be read off it.** At the front the two folds meet: that end is
 * the anterior commissure and it is not a display choice.
 */
export const GLOTTIS_DISPLAY_GAP = 0.26;

/** The radius of the inside of the laryngeal skeleton. */
export const LARYNX_INNER_RADIUS = 0.78;

/**
 * How far from the midline the inside of the larynx is, at a given depth.
 *
 * **One function, two uses**: the thyroid cartilage is lathed about this radius
 * and the folds attach to it, so a fold cannot end short of the cartilage or
 * push through it (`docs/architecture-rules.md` rule 1). It is what makes the
 * glottis a V — near the front there is almost no room, which is why the two
 * folds meet there.
 */
export function laryngealWallAt(z) {
  return Math.sqrt(Math.max(0, LARYNX_INNER_RADIUS * LARYNX_INNER_RADIUS - z * z));
}

/**
 * The pharyngeal lumen at a given height: one function, four uses.
 *
 * The three named parts of the pharynx and the two piriform gutters are all
 * cut out of the same tube, so they are all built from this. Written twice they
 * would drift apart the first time the pharynx changed shape
 * (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} y world height
 */
export function pharynxSection(y) {
  const down = clamp((LEVELS.skullBase - y) / (LEVELS.skullBase - LEVELS.cricoidBase), 0, 1);
  return {
    // Widest across the middle, at the back of the mouth, and narrowing into
    // the oesophagus below.
    halfWidth: 0.78 + 0.3 * Math.sin(Math.PI * down ** 0.8) - 0.24 * down ** 2,
    // Always much shallower than it is wide: a pharynx is a slit held open.
    halfDepth: 0.46 - 0.16 * down ** 1.6,
    // And leaning back as it descends, because the larynx takes the front.
    centreZ: -0.12 - 1.14 * smoothstep(0.3, 1, down),
  };
}

/**
 * The front of the pharyngeal lumen, at a height and a fraction of its width.
 *
 * Above the larynx the front wall is a wall. Below it, **the larynx fills the
 * middle of that wall** and what is left of the lumen is a gutter on either
 * side of it, reaching forward past it — which is the whole reason a swallow
 * goes round an airway rather than over it.
 *
 * @param {number} y world height
 * @param {number} across −1 to 1 across the lumen
 */
export function pharynxFrontAt(y, across) {
  const section = pharynxSection(y);
  const wall = section.centreZ + section.halfDepth;
  if (y > LEVELS.laryngealInlet) return wall;
  const beside = smoothstep(0.6, 0.88, Math.abs(across));
  const deep = smoothstep(LEVELS.laryngealInlet, LEVELS.vocalFold, y);
  return lerp(wall, 0.16, beside * deep);
}

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The tip of the epiglottis, standing up behind the tongue. */
  epiglottisTip: [0, 1.72, 0.52],
  /** The laryngeal inlet: the opening the epiglottis stands over. */
  inlet: [0, LEVELS.laryngealInlet, 0.2],
  /** The midpoint of the glottis, between the two folds. */
  glottis: [0, LEVELS.vocalFold, 0.12],
  /** The laryngeal prominence — the front of the thyroid cartilage. */
  prominence: [0, 0.55, 1.02],
  /** The membrane between thyroid and cricoid: the front-of-neck airway. */
  cricothyroid: [0, -0.32, 0.86],
  /** The floor of the left piriform gutter, where a swallow passes. */
  piriform: [LEFT * 0.72, 0.2, 0.1],
  /** Where the pharynx becomes the oesophagus. */
  oesophagusMouth: [0, LEVELS.cricoidBase, -0.5],
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
 * A length of the pharyngeal lumen, drawn as the space itself.
 *
 * `sides` narrows the tube to a slice of its own width, which is how the two
 * piriform gutters are cut out of it: they are not separate tubes, they are the
 * lateral thirds of this one where the larynx has taken the middle.
 */
function lumenGeometry({ y0, y1, inset = 0, from = -1, to = 1 }) {
  return shapedSphere({
    detail: 5,
    warp: (v) => {
      const down = (1 - v.y) / 2;
      const y = lerp(y0, y1, down);
      const section = pharynxSection(y);
      const ring = Math.hypot(v.x, v.z);
      // Nearly flat ends: these lengths stack on one another, and rounded caps
      // would leave gaps between them.
      const girth = Math.min(1, ring * 2.4);
      const unitX = ring > 1e-5 ? v.x / ring : 0;
      const unitZ = ring > 1e-5 ? v.z / ring : 1;
      const across = lerp(from, to, (unitX + 1) / 2);
      const frontZ = pharynxFrontAt(y, across) - inset;
      const backZ = section.centreZ - section.halfDepth + inset;
      v.x = across * girth * (section.halfWidth - inset);
      v.y = y;
      v.z = (frontZ + backZ) / 2 + unitZ * girth * ((frontZ - backZ) / 2);
    },
  });
}

/** A tube of fixed calibre along a straight vertical run. */
function pipeGeometry({ y0, y1, radius, z = 0, radial = 32, rings = 24, wall = 0 }) {
  const profile = [];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    profile.push([radius, lerp(y0, y1, i / steps)]);
  }
  if (wall > 0) {
    for (let i = steps; i >= 0; i -= 1) profile.push([radius - wall, lerp(y0, y1, i / steps)]);
    profile.push([radius, y0]);
  }
  const geometry = latheFromProfile(profile, { segments: rings, radial });
  geometry.translate(0, 0, z);
  return geometry;
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildLarynx({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'larynx';
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

  /** One structure on both sides: built once, mirrored, kept as two meshes. */
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

  const cord = (id, points, radius, color, { material = mucosaMaterial, radial = 14, steps = 40 } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), { radius: () => radius, steps, radial });
    const built = material({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return new THREE.Mesh(surface.geometry, built);
  };

  // --- the pharynx, in its three named lengths -----------------------------
  //
  // One tube, cut at the two places its name changes: at the soft palate, and
  // at the top of the larynx. Drawn as the space itself, because a space is
  // what it is and there is no other way to point at one.
  solid(
    'nasopharynx',
    lumenGeometry({ y0: LEVELS.skullBase, y1: LEVELS.softPalate }),
    null,
    '#c3bedd',
    wallMaterial
  );
  solid(
    'oropharynx',
    lumenGeometry({ y0: LEVELS.softPalate, y1: LEVELS.laryngealInlet }),
    null,
    '#b2b6d8',
    wallMaterial
  );
  // Below the inlet the larynx has the middle of the front wall, so what is
  // left of the lumen is the back of it. The two gutters beside the larynx are
  // the same tube, and they are named separately below.
  solid(
    'laryngopharynx',
    lumenGeometry({ y0: LEVELS.laryngealInlet, y1: LEVELS.cricoidBase, from: -0.6, to: 0.6 }),
    null,
    '#a3aad2',
    wallMaterial
  );

  // The piriform gutters: the lateral thirds of that same lumen, reaching
  // forward past the larynx. **This is the route a swallow takes** — round the
  // outside of the airway, not over the top of it.
  mirrored(
    'piriform-sinus',
    (side) =>
      lumenGeometry({
        y0: LEVELS.laryngealInlet + 0.08,
        y1: LEVELS.subglottis,
        from: side > 0 ? 0.6 : -1.0,
        to: side > 0 ? 1.0 : -0.6,
      }),
    '#8fb8d6',
    wallMaterial
  );

  // --- what hangs into it from above ---------------------------------------
  //
  // The soft palate: the back of the roof of the mouth, sloping down and back,
  // with the uvula on the end of it. It is the door between nose and mouth.
  solid(
    'soft-palate',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 26, 1, 18), (v) => {
      const across = v.x;
      const along = v.z + 0.5;
      // Forward at the hard palate, back and down at the free edge.
      const z = lerp(0.95, -0.28, along);
      const midline = 1 - Math.min(1, Math.abs(across) * 5);
      const drop = 0.62 * along ** 1.6 + 0.22 * along ** 4 * midline;
      const width = 0.92 * (1 - 0.42 * along ** 2);
      v.x = across * 2 * width;
      v.z = z;
      v.y = LEVELS.softPalate + 0.62 - drop + (v.y > 0 ? 0.06 : -0.06) - 0.12 * across * across * 4;
    }),
    null,
    '#e0a7a0',
    wallMaterial
  );

  mirrored(
    'palatine-tonsil',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [0.2, 0.28, 0.16],
        warp: (v) => {
          v.z *= 1 - 0.3 * smoothstep(0, 1, Math.abs(v.y));
        },
      });
      geometry.translate(side * 0.76, LEVELS.softPalate - 0.4, 0.1);
      return geometry;
    },
    '#d98f8f',
    mucosaMaterial
  );

  // The epiglottis: a leaf on a stalk, standing up behind the tongue and over
  // the opening of the larynx. It is drawn **upright**, which is where it sits
  // when nothing is being swallowed.
  solid(
    'epiglottis',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 22, 1, 26), (v) => {
      const up = v.z + 0.5;
      const across = v.x;
      // A stalk at the bottom, a broad leaf at the top.
      const width = 0.12 + 0.46 * smoothstep(0.12, 0.72, up) - 0.16 * smoothstep(0.82, 1, up);
      const y = lerp(0.16, 1.74, up);
      // Curved forward like a shovel, and leaning back over the inlet.
      const z = 0.3 + 0.28 * up + 0.22 * across * across * 4;
      v.x = across * 2 * width;
      v.y = y;
      v.z = z + (v.y > 0 ? 0.05 : -0.05);
    }),
    null,
    '#e7cf9e',
    wallMaterial
  );

  // --- the skeleton of the larynx ------------------------------------------
  //
  // The hyoid: a horseshoe open to the back, the only bone here and the only
  // one in the body that joins no other bone.
  solid(
    'hyoid-bone',
    (() => {
      const points = [];
      for (let i = 0; i <= 28; i += 1) {
        const a = lerp(-1.15, 1.15, i / 28);
        points.push([LEFT * Math.sin(a) * 0.78, 1.42 + 0.06 * Math.cos(a * 1.4), 0.82 * Math.cos(a) - 0.18]);
      }
      const surface = new TubeSurface(smoothCurve(points), { radius: () => 0.09, steps: 40, radial: 14 });
      disposables.push(surface);
      return surface.geometry;
    })(),
    null,
    '#ece3cd',
    mineralMaterial
  );

  // The thyroid cartilage: a shield open at the back, with the two plates
  // meeting in front at an angle. That angle is the laryngeal prominence.
  solid(
    'thyroid-cartilage',
    warpGeometry(
      latheFromProfile(
        [
          [0.84, -0.2],
          [0.9, -0.06],
          [0.92, 0.5],
          [0.9, 1.04],
          [0.84, 1.14],
          [LARYNX_INNER_RADIUS, 1.04],
          [LARYNX_INNER_RADIUS, 0.5],
          [LARYNX_INNER_RADIUS, -0.06],
          [0.84, -0.2],
        ],
        { segments: 40, radial: 54, arc: 4.3, arcStart: -2.15 }
      ),
      (v) => {
        const midline = 1 - Math.min(1, Math.abs(v.x) / 0.42);
        // The two plates meet at a ridge in front rather than curving round:
        // that ridge is the laryngeal prominence.
        v.z += 0.16 * smoothstep(0.1, 1, v.z) * midline;
        // And the superior thyroid notch — the V at the top of it, which is
        // what a finger finds.
        v.y -= 0.28 * midline * smoothstep(0.25, 1, v.z) * smoothstep(0.7, 1.14, v.y);
      }
    ),
    null,
    '#e6ddc6',
    (options) => mineralMaterial({ ...options, roughness: 0.66 })
  );

  // The cricoid: the one complete ring in the whole airway, narrow in front
  // and deep behind — a signet ring, worn the other way round.
  solid(
    'cricoid-cartilage',
    warpGeometry(
      latheFromProfile(
        [
          [0.62, LEVELS.cricoidBase],
          [0.72, LEVELS.cricoidBase],
          [0.72, -0.24],
          [0.62, -0.24],
          [0.62, LEVELS.cricoidBase],
        ],
        { segments: 26, radial: 52 }
      ),
      (v) => {
        // Taller at the back: the lamina of the cricoid is what the arytenoids
        // sit on and what the oesophagus lies against.
        const back = smoothstep(-0.2, -0.66, v.z);
        v.y += 0.56 * back * smoothstep(LEVELS.cricoidBase, -0.24, v.y);
      }
    ),
    null,
    '#e2d8bf',
    mineralMaterial
  );

  // The two arytenoids: small pyramids standing on the back of the ring. Each
  // one carries the back end of a vocal fold, and turning them is how a larynx
  // opens and closes — **which this model does not do**.
  mirrored(
    'arytenoid-cartilage',
    (side) => {
      const geometry = shapedSphere({
        detail: 4,
        scale: [0.16, 0.3, 0.18],
        warp: (v) => {
          const up = smoothstep(-0.4, 1, v.y);
          v.x *= 1 - 0.6 * up;
          v.z *= 1 - 0.5 * up;
          // Drawn out into a point at the front, which is where the fold is
          // attached.
          v.z += 0.7 * smoothstep(0.2, 1, v.z) * smoothstep(0.6, -0.8, v.y);
        },
      });
      geometry.translate(side * 0.24, 0.2, -0.34);
      return geometry;
    },
    '#ded2b6',
    mineralMaterial
  );

  // The membrane between the two cartilages, in the front of the neck. It is a
  // landmark rather than a shape: everything above it is the voice and
  // everything below it is the trachea, and it is the one place an airway can
  // be reached from outside without going through either.
  solid(
    'cricothyroid-membrane',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 20, 1, 6), (v) => {
      const across = v.x * 2;
      const along = v.z + 0.5;
      v.x = across * 0.42 * (1 - 0.2 * along);
      v.y = lerp(-0.26, 0.0, along) - 0.05 * across * across * 4;
      v.z = 0.8 - 0.14 * across * across * 4 + (v.y > 0 ? 0.03 : -0.03);
    }),
    null,
    '#d6c9b0',
    wallMaterial
  );

  // --- the folds, and the space between them --------------------------------
  //
  // Two pairs of shelves projecting into the airway from each side, with a
  // pocket between them. The upper pair are not the ones that make the voice;
  // the lower pair are.
  const fold = (side, level, thickness, opening) =>
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 10, 6, 28), (v) => {
      const along = v.z + 0.5;
      const outward = v.x + 0.5;
      // Front to back: from the midline, where the two folds meet, to the
      // vocal process of the arytenoid behind.
      const z = lerp(0.76, -0.3, along);
      // The free edge, and the wall it is attached to. The wall comes from
      // `laryngealWallAt`, so the fold ends exactly where the cartilage is.
      const free = side * opening * smoothstep(0, 0.55, along);
      const wall = side * laryngealWallAt(z);
      v.x = lerp(free, wall, outward);
      v.z = z;
      v.y = level + v.y * 2 * thickness * (1 - 0.35 * outward);
    });

  mirrored(
    'vestibular-fold',
    (side) => fold(side, LEVELS.vestibularFold, 0.11, GLOTTIS_DISPLAY_GAP + 0.1),
    '#dba8a2',
    mucosaMaterial
  );
  mirrored('vocal-fold', (side) => fold(side, LEVELS.vocalFold, 0.09, GLOTTIS_DISPLAY_GAP), '#f0e6e2', mucosaMaterial);

  // The pocket between the two pairs — the one thing that proves they are two
  // pairs and not one.
  mirrored(
    'laryngeal-ventricle',
    (side) =>
      warpGeometry(new THREE.BoxGeometry(1, 1, 1, 6, 1, 18), (v) => {
        const along = v.z + 0.5;
        const inwards = v.x + 0.5;
        const z = lerp(0.68, -0.26, along);
        v.x = lerp(side * laryngealWallAt(z), side * 0.3, inwards);
        v.z = z;
        v.y = LEVELS.ventricle + (v.y > 0 ? 0.06 : -0.06);
      }),
    '#9ec6d8',
    wallMaterial
  );

  // Below the folds: a short cone inside the cricoid ring, and the narrowest
  // part of a small child's airway.
  solid(
    'subglottic-space',
    pipeGeometry({ y0: LEVELS.cricoidBase + 0.04, y1: LEVELS.vocalFold - 0.06, radius: 0.56 }),
    null,
    '#a9cfe0',
    wallMaterial
  );

  // --- and where it all goes ------------------------------------------------
  solid(
    'trachea',
    (() => {
      const geometry = pipeGeometry({
        y0: LEVELS.floor,
        y1: LEVELS.cricoidBase,
        radius: 0.6,
        radial: 40,
        rings: 40,
      });
      return warpGeometry(geometry, (v) => {
        // The rings, as ridges: a trachea is not a smooth pipe, and the ridges
        // are the only reason it looks like one from outside.
        const ridge = 0.035 * Math.cos(v.y * 9.5);
        const r = Math.hypot(v.x, v.z);
        if (r > 1e-4) {
          v.x *= 1 + ridge / r;
          v.z *= 1 + ridge / r;
        }
      });
    })(),
    null,
    '#e0d6c2',
    wallMaterial
  );

  solid(
    'oesophagus',
    warpGeometry(
      pipeGeometry({ y0: LEVELS.floor, y1: LEVELS.cricoidBase + 0.1, radius: 0.46, z: -1.2, radial: 32 }),
      (v) => {
        // Collapsed front to back, because an empty oesophagus is closed.
        v.z = -1.2 + (v.z + 1.2) * 0.5;
      }
    ),
    null,
    '#cf9f8f',
    wallMaterial
  );

  // The nerve that runs up the groove between them to reach the larynx from
  // below. The two sides do not take the same course to get here, and only the
  // last part of either is drawn.
  const nerves = [];
  for (const side of [LEFT, -LEFT]) {
    const mesh = cord(
      'recurrent-laryngeal-nerve',
      [
        [side * 0.4, LEVELS.floor, -0.86],
        [side * 0.42, -2.0, -0.86],
        [side * 0.44, -1.1, -0.84],
        [side * 0.4, -0.4, -0.8],
        [side * 0.34, 0.1, -0.78],
      ],
      0.045,
      '#efe7c0'
    );
    mesh.name = `recurrent-laryngeal-nerve-${side === LEFT ? 'left' : 'right'}`;
    object.add(mesh);
    nerves.push(mesh);
  }
  pairs.set('recurrent-laryngeal-nerve', nerves);
  index.set('recurrent-laryngeal-nerve', nerves[0]);

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
