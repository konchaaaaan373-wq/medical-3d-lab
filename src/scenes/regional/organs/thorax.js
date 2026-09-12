import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The chest: a cage, two bags, and everything else crowded into the space
 * between them.
 *
 * The second **regional** model, after the neck, and the same kind of subject:
 * not any one organ but where the organs are. A chest is one of the few places
 * in the body where that question has a clean answer, because the answer is
 * geometric — two pleural cavities take almost the whole of it, and everything
 * that is not lung has to fit in the slab left between them. **That slab is the
 * mediastinum**, and most of what a chest can go wrong about is a question
 * about which side of it, or which end of it, something is on.
 *
 * ## What this scene is for
 *
 * Three relationships it exists to make pointable:
 *
 * - **The left lung has a notch because the heart is there.** The notch is not
 *   drawn as a notch; it is what is left when the lung is pressed against the
 *   mediastinum, from the same function that places the heart.
 * - **The phrenic nerve passes in front of the hilum and the vagus behind it.**
 *   Two nerves, one structure between them, and that is the whole difference
 *   between what each of them reaches.
 * - **The lung does not fill the pleural cavity.** The costodiaphragmatic
 *   recess is the part it never reaches, and it is where a chest fills up.
 *
 * ## The frame
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is superior and `+z` anterior. Every
 * paired structure is built from the single `LEFT` constant below.
 *
 * **One world unit is one centimetre**, with `y = 0` at the **sternal angle** —
 * the ridge you can feel where the manubrium meets the body of the sternum. It
 * is the level everything in a chest is counted from: the second rib joins
 * there, the trachea divides there, the arch begins and ends there, and the
 * mediastinum is divided into upper and lower there.
 *
 * ## Not an atlas of any organ in it
 *
 * The lungs here are silhouettes with lobes and fissures, **not**
 * `respiratory/organs/lungs.js`, which carves twenty segments out of them for
 * `lung-anatomy`. The heart is an outline in its place, **not**
 * `cardiovascular/organs/heart.js` and certainly not the heart-failure scene's
 * ventricle. Each of those answers a question about one organ; this one answers
 * a question about where that organ is, and the two are different scales and
 * different purposes (`CLAUDE.md`, "Organ と Disease を混ぜない").
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre, angle, rib
 * count spacing or volume here is a measurement**, and nothing moves: nothing
 * breathes, the diaphragm does not descend, the ribs do not rise, the heart does
 * not beat and no pressure exists anywhere in this model.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/**
 * Centimetres to world units.
 *
 * The chest is laid out in centimetres because the whole subject is distances
 * between things. The finished group is scaled once, because the shared
 * viewer's orbit controls clamp the camera and a 28 cm chest cannot be framed
 * at one unit to the centimetre on a phone (`docs/follow-ups.md` F-90). **A
 * viewer constraint, not an anatomical one.**
 */
export const WORLD_SCALE = 0.4;

/**
 * The heights everything in the chest is placed against.
 *
 * `y = 0` is the sternal angle. Nothing else in this file may place itself at a
 * number that duplicates one of these.
 */
export const LEVELS = Object.freeze({
  /** The lung apex, which is **above** the first rib and above the clavicle. */
  apex: 5.4,
  /** Where the first rib crosses, at the top of the cage. */
  firstRib: 3.4,
  /** The jugular notch: the top of the manubrium, the dip you can feel. */
  jugularNotch: 2.7,
  /** **The sternal angle.** Second rib, T4/5, carina, both ends of the arch. */
  sternalAngle: 0,
  /** Where the trachea divides. */
  carina: -0.6,
  /** The hila, where everything enters each lung. */
  hilum: -2.6,
  /** The middle of the heart. */
  heartCentre: -5.2,
  /** The top of the right dome of the diaphragm, which is the higher of the two. */
  domeRight: -7.2,
  /** The left dome, lower because the heart sits on it. */
  domeLeft: -8.4,
  /** The bottom of the sternum. */
  xiphoid: -10.4,
  /** Where the costal margin leaves the sternum and runs out and down. */
  costalMargin: -12.6,
  /** The floor of the pleural cavity at the side, which the lung never reaches. */
  recessFloor: -15.4,
  /** The bottom of what this scene draws. */
  floor: -17.2,
});

/**
 * The twelve ribs, each as where it leaves the column and how far it runs.
 *
 * **One table, four uses**: the ribs are built from it, the costal cartilages
 * continue from it, the intercostal spaces are the gaps between consecutive
 * entries, and the neurovascular bundle runs under each one
 * (`docs/architecture-rules.md` rule 1). Written separately they would agree
 * until the first time a rib moved.
 *
 * `drop` is how far the rib falls between the column and its front end, which
 * is what makes a rib cage slope; `spread` is how much of the chest's own
 * section that level's rib follows; `boneEnd` is the angle its bone stops at
 * and its cartilage takes over; `front` says what that cartilage reaches.
 */
export const RIB_LEVELS = Object.freeze(
  [
    { y: 3.4, drop: 0.5, spread: 0.52, boneEnd: 0.5, front: 'sternum' },
    { y: 2.2, drop: 2.2, spread: 0.72, boneEnd: 0.52, front: 'sternum' },
    { y: 0.6, drop: 2.8, spread: 0.85, boneEnd: 0.54, front: 'sternum' },
    { y: -1.1, drop: 3.2, spread: 0.93, boneEnd: 0.56, front: 'sternum' },
    { y: -2.8, drop: 3.6, spread: 0.98, boneEnd: 0.58, front: 'sternum' },
    { y: -4.5, drop: 3.9, spread: 1.0, boneEnd: 0.6, front: 'sternum' },
    { y: -6.2, drop: 4.1, spread: 1.0, boneEnd: 0.62, front: 'sternum' },
    { y: -7.8, drop: 4.2, spread: 0.98, boneEnd: 0.66, front: 'margin' },
    { y: -9.3, drop: 4.2, spread: 0.94, boneEnd: 0.72, front: 'margin' },
    { y: -10.7, drop: 4.0, spread: 0.88, boneEnd: 0.8, front: 'margin' },
    { y: -12.0, drop: 3.0, spread: 0.78, boneEnd: 1.15, front: 'free' },
    { y: -13.2, drop: 2.2, spread: 0.62, boneEnd: 1.5, front: 'free' },
  ].map((level) => Object.freeze(level))
);

/**
 * The outside of the chest at a given height.
 *
 * **One function, three uses**: every rib is swept round it, the parietal
 * pleura is held just inside it, and the mediastinum is measured from it. A
 * chest in section is wider than it is deep and flattened behind, where the
 * column bulges forward into it.
 *
 * @param {number} y world height
 */
export function chestSection(y) {
  const down = clamp((LEVELS.firstRib - y) / (LEVELS.firstRib - LEVELS.costalMargin), 0, 1);
  // Narrow at the inlet, widest about two-thirds of the way down, drawing in
  // again at the costal margin.
  const open = smoothstep(-0.05, 0.46, down);
  const close = smoothstep(0.7, 1.16, down);
  return {
    halfWidth: 5.0 + 9.0 * open - 4.2 * close,
    halfDepth: 4.0 + 5.4 * open - 2.6 * close,
    centreZ: 0.6 - 0.4 * open,
  };
}

/**
 * A point along one rib, from the column to its anterior end.
 *
 * `t` runs 0 at the vertebra to 1 at the far end of the cartilage. The angle is
 * measured round the chest's own section: π is the midline behind, π/2 is the
 * side, 0 is the midline in front — so a rib is not a shape written out, it is
 * a run round `chestSection`.
 *
 * @param {number} index 0–11
 * @param {number} t 0 at the column, 1 at the anterior end
 * @param {number} side `LEFT` or `-LEFT`
 * @returns {[number, number, number]}
 */
export function ribPath(index, t, side) {
  const level = RIB_LEVELS[index];
  // A rib falls as it comes forward, and falls faster in its second half: that
  // slope is why a space counted in front is not the space counted behind.
  const y = level.y - level.drop * t ** 1.6;
  const at = chestSection(y);
  const end = level.front === 'free' ? level.boneEnd : 0.1;
  const angle = lerp(Math.PI * 0.93, end, t);
  return [
    side * Math.sin(angle) * at.halfWidth * level.spread,
    y,
    at.centreZ + Math.cos(angle) * at.halfDepth * level.spread,
  ];
}

/** Where along a rib its bone ends and its cartilage begins. */
export function ribBoneFraction(index) {
  const level = RIB_LEVELS[index];
  if (level.front === 'free') return 1;
  return clamp((Math.PI * 0.93 - level.boneEnd) / (Math.PI * 0.93 - 0.1), 0, 1);
}

/**
 * The mediastinum at a given height: the slab between the two pleural cavities.
 *
 * **One function, five uses** — the mediastinum is drawn from it, **both lungs
 * are pressed out of it**, the pericardium is sized by it, and the great
 * vessels and the two nerves are placed inside it. The left lung's cardiac
 * notch is not drawn as a notch; it is what is left when the lung meets this
 * (`docs/architecture-rules.md` rule 1).
 *
 * @param {number} y world height
 */
export function mediastinumSection(y) {
  const at = chestSection(y);
  // Narrow above, between the two lung apices; wide below, where the heart is.
  const heart = Math.exp(-Math.pow((y - LEVELS.heartCentre) / 4.6, 2));
  return {
    halfWidth: 2.1 + 5.0 * heart,
    // It takes more of the patient's left than of the right, because the heart
    // does. That asymmetry is the whole reason the two lungs differ in shape.
    centreX: LEFT * 2.4 * heart,
    front: at.centreZ + at.halfDepth - 0.9,
    // The column is behind this, not inside it.
    back: at.centreZ - at.halfDepth + 2.4,
  };
}

/** The air column: trachea above the carina, and the two bronchi below it. */
export const AIRWAY = Object.freeze({
  z: -1.5,
  trachearadius: 0.95,
  /** The right bronchus is wider, shorter and far more upright than the left —
   *  which is why what is inhaled goes down the right. */
  right: Object.freeze({ radius: 0.82, run: 2.6, spread: 0.42, drop: 2.0 }),
  left: Object.freeze({ radius: 0.66, run: 4.8, spread: 0.84, drop: 1.5 }),
});

/**
 * A point along one main bronchus, from the carina outwards.
 *
 * @param {number} side `LEFT` or `-LEFT`
 * @param {number} t 0 at the carina, 1 at the hilum
 * @returns {[number, number, number]}
 */
export function bronchusPath(side, t) {
  const arm = side === LEFT ? AIRWAY.left : AIRWAY.right;
  return [
    side * arm.spread * arm.run * t,
    LEVELS.carina - arm.drop * t,
    AIRWAY.z + 0.5 * t,
  ];
}

/**
 * The height of the diaphragm under a point on the floor of the chest.
 *
 * **One function, three uses**: the diaphragm is built from it, each lung's
 * base rests on it, and the recess the lung never reaches is the space between
 * it and the chest wall. The right dome is higher than the left, because the
 * liver is under one and the heart sits on the other.
 */
export function diaphragmAt(x, z) {
  const at = chestSection(LEVELS.recessFloor + 1.0);
  // The two domes are not the same height, and the change between them is a
  // slope across the midline rather than a step: written as a step it draws a
  // crease down the middle of a sheet that has none.
  const toLeft = smoothstep(-at.halfWidth * 0.45, at.halfWidth * 0.45, x * LEFT);
  const dome = lerp(LEVELS.domeRight, LEVELS.domeLeft, toLeft);
  const across = clamp(Math.abs(x) / at.halfWidth, 0, 1);
  const fore = clamp(Math.abs(z - at.centreZ) / at.halfDepth, 0, 1);
  // A dome, falling away to the wall on every side.
  const fall = Math.min(1, Math.hypot(across, fore * 0.94));
  return LEVELS.recessFloor + (dome - LEVELS.recessFloor) * Math.cos((Math.PI / 2) * fall ** 1.25);
}

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The ridge you can feel. Second rib, T4/5, carina, both ends of the arch. */
  sternalAngle: [0, LEVELS.sternalAngle, chestSection(0).centreZ + chestSection(0).halfDepth],
  /** The dip above the manubrium. */
  jugularNotch: [0, LEVELS.jugularNotch, chestSection(LEVELS.jugularNotch).centreZ + 3.2],
  /** Where the trachea divides. */
  carina: [0, LEVELS.carina, AIRWAY.z],
  /** The root of the left lung. */
  hilumLeft: bronchusPath(LEFT, 1),
  /** The root of the right lung. */
  hilumRight: bronchusPath(-LEFT, 1),
  /** Where the apex beat is felt: fifth space, mid-clavicular, on the left. */
  apexBeat: [LEFT * 8.4, -7.6, 8.2],
  /** The bottom of the pleural cavity at the side, which no lung reaches. */
  costophrenicAngle: [-LEFT * 12.4, LEVELS.recessFloor + 0.6, 0.2],
  /** Where the oesophagus leaves the chest, with the vagus nerves on it. */
  oesophagealHiatus: [LEFT * 0.6, -10.8, -2.0],
  /** Where the aorta leaves, behind the diaphragm rather than through it. */
  aorticHiatus: [0, -12.2, -4.6],
  /** Where the inferior vena cava leaves, the highest of the three. */
  cavalOpening: [-LEFT * 1.8, -8.6, -0.6],
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
 * Push a vertex out of the mediastinum, if it is inside it.
 *
 * This is what gives the left lung its cardiac notch: both lungs are built as
 * simple bodies filling their side of the chest and then pressed against the
 * slab in the middle, so **the notch is the mediastinum's own boundary** and
 * cannot drift from whatever is in it.
 */
function clearMediastinum(v, side, clearance = 0.25) {
  const at = mediastinumSection(v.y);
  if (v.z > at.front || v.z < at.back) return;
  // Pushed to **its own** side, not to whichever side of the slab's centre it
  // happened to start on: the slab is displaced towards the patient's left, so
  // sorting by the centre ejected the left lung's medial vertices out of the
  // right-hand face of it and put half a left lung on the right of the chest.
  const edge = at.centreX + side * (at.halfWidth + clearance);
  if (side * v.x < side * edge) v.x = edge;
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

/** A ribbon stretched between two written lines — used for the spaces. */
function ribbonGeometry(a, b, { steps = 22 } = {}) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    positions.push(...a(t), ...b(t));
  }
  for (let i = 0; i < steps; i += 1) {
    const p = i * 2;
    indices.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildThorax({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'thorax';
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

  /** One structure drawn as many meshes — the ribs, the spaces, a pair. */
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

  const cord = (points, radius, { steps = 56, radial = 12, flatten = null } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    if (flatten) flattenTube(surface, flatten[0], flatten[1]);
    disposables.push(surface);
    return surface.geometry;
  };

  const front = (y) => {
    const at = chestSection(y);
    return at.centreZ + at.halfDepth;
  };

  // --- the sternum, in its three parts -------------------------------------
  //
  // Three, not one, because the joint between the first two is the landmark the
  // whole chest is counted from and a reader has to be able to point at it.
  solid(
    'manubrium',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 6, 10, 4), (v) => {
      const t = 0.5 - v.y;
      const y = lerp(LEVELS.jugularNotch, LEVELS.sternalAngle, t);
      v.x *= 2.6 - 0.7 * t;
      v.y = y;
      v.z = front(y) - 0.55 + v.z * 1.1;
    }),
    '#e9e2d0',
    mineralMaterial
  );

  solid(
    'sternal-body',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 6, 26, 4), (v) => {
      const t = 0.5 - v.y;
      const y = lerp(LEVELS.sternalAngle, LEVELS.xiphoid, t);
      v.x *= 1.9 + 0.25 * Math.sin(Math.PI * t);
      v.y = y;
      // Standing slightly proud of the rib ends at the angle, which is why the
      // ridge can be felt at all.
      v.z = front(y) - 0.5 + v.z * 1.0 + 0.28 * Math.exp(-Math.pow(t / 0.09, 2));
    }),
    '#ece5d4',
    mineralMaterial
  );

  solid(
    'xiphoid-process',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 5, 8, 4), (v) => {
      const t = 0.5 - v.y;
      const y = lerp(LEVELS.xiphoid, LEVELS.xiphoid - 2.1, t);
      v.x *= 1.3 - 0.9 * t;
      v.y = y;
      v.z = front(y) - 0.45 + v.z * 0.8;
    }),
    '#e4dcc8',
    mineralMaterial
  );

  // --- the cage -------------------------------------------------------------
  {
    const ribs = [];
    const cartilages = [];
    for (let i = 0; i < RIB_LEVELS.length; i += 1) {
      const level = RIB_LEVELS[i];
      const boneEnd = ribBoneFraction(i);
      for (const side of [LEFT, -LEFT]) {
        const bonePoints = [];
        for (let s = 0; s <= 12; s += 1) bonePoints.push(ribPath(i, (boneEnd * s) / 12, side));
        ribs.push(cord(bonePoints, (u) => 0.46 - 0.12 * u, { radial: 10, steps: 40, flatten: ['y', 0.62] }));
        if (level.front === 'free') continue;
        const cartilagePoints = [];
        for (let s = 0; s <= 8; s += 1) {
          const t = lerp(boneEnd, 1, s / 8);
          const point = ribPath(i, t, side);
          // The lower cartilages do not reach the sternum: they turn up and
          // join the one above, and the line they make together is the costal
          // margin you can feel.
          if (level.front === 'margin') point[1] += 2.6 * ((t - boneEnd) / (1 - boneEnd)) ** 1.4;
          cartilagePoints.push(point);
        }
        cartilages.push(cord(cartilagePoints, 0.34, { radial: 10, steps: 26, flatten: ['y', 0.7] }));
      }
    }
    several('ribs', ribs, '#e9e2d0', mineralMaterial);
    several('costal-cartilages', cartilages, '#dfe6dd', tissueMaterial, { roughness: 0.3 });
  }

  // The spaces, as spaces: what is between two ribs, which is where a needle or
  // a drain goes and where the muscles that move the cage are.
  {
    const spaces = [];
    for (let i = 0; i < RIB_LEVELS.length - 1; i += 1) {
      const end = Math.min(ribBoneFraction(i), ribBoneFraction(i + 1));
      for (const side of [LEFT, -LEFT]) {
        spaces.push(
          ribbonGeometry(
            (t) => ribPath(i, t * end, side),
            (t) => ribPath(i + 1, t * end, side),
            { steps: 20 }
          )
        );
      }
    }
    several('intercostal-space', spaces, '#d9b6a8', wallMaterial, { opacity: 0.42 });
  }

  // Vein, artery and nerve, in that order downwards, tucked under the lower
  // border of each rib. **The whole reason anything entering a chest is aimed
  // at the top of a space and not the bottom.**
  {
    const bundles = [];
    for (let i = 0; i < RIB_LEVELS.length - 1; i += 1) {
      const end = ribBoneFraction(i);
      for (const side of [LEFT, -LEFT]) {
        const points = [];
        for (let s = 1; s <= 10; s += 1) {
          const point = ribPath(i, (end * s) / 10, side);
          point[1] -= 0.42;
          points.push(point);
        }
        bundles.push(cord(points, 0.13, { radial: 8, steps: 28 }));
      }
    }
    several('intercostal-bundle', bundles, '#c8536a', mucosaMaterial);
  }

  {
    const parts = [];
    for (let i = 0; i < 12; i += 1) {
      const y = RIB_LEVELS[i].y - 0.4;
      const at = chestSection(y);
      const body = new THREE.BoxGeometry(3.0, 1.2, 2.4);
      body.translate(0, y, at.centreZ - at.halfDepth + 1.5);
      parts.push(body);
      const spine = new THREE.BoxGeometry(0.8, 0.7, 2.6);
      spine.translate(0, y - 0.7, at.centreZ - at.halfDepth - 0.4);
      parts.push(spine);
    }
    for (const part of parts) {
      part.deleteAttribute('uv');
      part.deleteAttribute('normal');
    }
    const merged = mergeGeometries(parts);
    merged.computeVertexNormals();
    for (const part of parts) part.dispose();
    solid('thoracic-vertebrae', merged, '#d8cfbc', mineralMaterial);
  }

  // --- the floor ------------------------------------------------------------
  solid(
    'diaphragm',
    (() => {
      // A disc built in polar coordinates, following the chest's own outline
      // **where the diaphragm is attached** rather than where its dome is:
      // drawn to the dome's width it hangs outside the ribs it is fixed to.
      const at = chestSection(LEVELS.recessFloor + 1.0);
      const rings = 26;
      const radial = 60;
      const positions = [];
      const indices = [];
      for (let i = 0; i <= rings; i += 1) {
        const r = i / rings;
        for (let j = 0; j <= radial; j += 1) {
          const a = (2 * Math.PI * j) / radial;
          const x = Math.cos(a) * r * at.halfWidth * 0.96;
          const z = at.centreZ + Math.sin(a) * r * at.halfDepth * 0.96;
          positions.push(x, diaphragmAt(x, z), z);
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
    '#b8656a',
    tissueMaterial
  );

  // --- the two bags ---------------------------------------------------------
  //
  // Drawn as the lining rather than as the space, and translucent, because
  // everything the scene is about is inside them.
  several(
    'parietal-pleura',
    [LEFT, -LEFT].map((side) =>
      warpGeometry(
        shellGeometry({
          y0: LEVELS.apex,
          y1: LEVELS.recessFloor,
          section: (y) => {
            const at = chestSection(y);
            const med = mediastinumSection(y);
            const outer = at.halfWidth - 0.5;
            const inner = med.centreX + side * (med.halfWidth + 0.2);
            return {
              halfWidth: Math.max(0.4, (outer - side * inner) / 2),
              halfDepth: at.halfDepth - 0.5,
              centreZ: at.centreZ,
              centreX: side * ((outer + side * inner) / 2),
            };
          },
          detail: 5,
        }),
        () => {}
      )
    ),
    '#cfd8d6',
    wallMaterial,
    { opacity: 0.22 }
  );

  // The part of the cavity the lung never reaches, even at full breath.
  several(
    'costodiaphragmatic-recess',
    [LEFT, -LEFT].map((side) =>
      shellGeometry({
        y0: -9.2,
        y1: LEVELS.recessFloor + 0.3,
        section: (y) => {
          const at = chestSection(y);
          const down = clamp((-9.2 - y) / (LEVELS.recessFloor + 0.3 + 9.2), 0, 1);
          return {
            halfWidth: 2.4 - 1.2 * down,
            halfDepth: at.halfDepth * (0.72 - 0.2 * down),
            centreZ: at.centreZ,
            centreX: side * (at.halfWidth - 2.9 + 0.7 * down),
          };
        },
        detail: 5,
      })
    ),
    '#8fb6cc',
    wallMaterial,
    { opacity: 0.34 }
  );

  // --- the lungs ------------------------------------------------------------
  //
  // Silhouettes in their place, pressed out of the mediastinum. **The left
  // lung's notch is not drawn**: it is what is left when the lung meets the
  // heart's own slab.
  for (const [id, side] of [['right-lung', -LEFT], ['left-lung', LEFT]]) {
    solid(
      id,
      warpGeometry(
        shapedSphere({
          detail: 7,
          warp: (v) => {
            const down = (1 - v.y) / 2;
            const y = lerp(LEVELS.apex - 0.4, LEVELS.recessFloor + 2.4, down);
            const at = chestSection(y);
            const ring = Math.hypot(v.x, v.z);
            const girth = Math.min(1, ring * 2.1);
            const unitX = ring > 1e-5 ? v.x / ring : 0;
            const unitZ = ring > 1e-5 ? v.z / ring : 1;
            const outer = at.halfWidth - 0.9;
            v.x = side * (outer / 2) + unitX * girth * (outer / 2);
            v.y = y;
            v.z = at.centreZ + unitZ * girth * (at.halfDepth - 0.9);
          },
        }),
        (v) => {
          // The base is not flat: it sits on the dome, and it stops well above
          // the floor of the cavity beside it.
          const floor = diaphragmAt(v.x, v.z) + 0.5;
          if (v.y < floor) v.y = floor;
          clearMediastinum(v, side);
        }
      ),
      '#d99aa0',
      tissueMaterial,
      { roughness: 0.55 }
    );
  }

  // --- the slab in the middle ----------------------------------------------
  solid(
    'mediastinum',
    shellGeometry({
      y0: LEVELS.apex - 1.2,
      y1: LEVELS.domeLeft - 0.6,
      section: (y) => {
        const at = mediastinumSection(y);
        return {
          halfWidth: at.halfWidth,
          halfDepth: (at.front - at.back) / 2,
          centreZ: (at.front + at.back) / 2,
          centreX: at.centreX,
        };
      },
      detail: 5,
    }),
    '#c4bcd4',
    wallMaterial,
    { opacity: 0.16 }
  );

  // --- what is in the slab --------------------------------------------------
  //
  // A heart in its place, not a heart. `cardiovascular/organs/heart.js` is the
  // landmark outline and the heart-failure scene has the one built from a
  // model; this is neither, and it exists to be where it is.
  solid(
    'heart',
    warpGeometry(
      shapedSphere({
        detail: 6,
        scale: [3.6, 4.0, 2.9],
        warp: (v) => {
          // A blunt cone: broad at the base above, drawn to an apex below.
          // **These offsets are in unit-sphere space**, before `scale` is
          // applied — written as centimetres they put an apex outside the
          // chest, which is what the first version drew.
          const down = smoothstep(0.25, -1, v.y);
          v.x *= 1 - 0.58 * down * down;
          v.z *= 1 - 0.5 * down * down;
          // The apex points down, forward and to the patient's left, which is
          // why it is felt where it is felt.
          v.x += LEFT * 0.6 * down * down;
          v.z += 0.42 * down * down;
        },
      }),
      (v) => {
        v.x += LEFT * 1.2;
        v.y += LEVELS.heartCentre + 0.6;
        v.z += 2.2;
      }
    ),
    '#b8444c'
  );

  solid(
    'pericardium',
    warpGeometry(
      shapedSphere({
        detail: 5,
        scale: [4.3, 4.7, 3.5],
        warp: (v) => {
          const down = smoothstep(0.25, -1, v.y);
          v.x *= 1 - 0.5 * down * down;
          v.z *= 1 - 0.42 * down * down;
          v.x += LEFT * 0.52 * down * down;
          v.z += 0.36 * down * down;
        },
      }),
      (v) => {
        v.x += LEFT * 1.1;
        v.y += LEVELS.heartCentre + 0.8;
        v.z += 2.1;
      }
    ),
    '#ded6c4',
    wallMaterial,
    { opacity: 0.26 }
  );

  // The airway, down to where it divides and out to each lung. **The two sides
  // are not alike**: the right is wider, shorter and far more upright.
  {
    const parts = [];
    const trachea = [];
    for (let s = 0; s <= 8; s += 1) {
      trachea.push([0, lerp(LEVELS.apex + 1.2, LEVELS.carina, s / 8), AIRWAY.z]);
    }
    parts.push(cord(trachea, AIRWAY.trachearadius, { radial: 18, steps: 30 }));
    for (const side of [LEFT, -LEFT]) {
      const arm = side === LEFT ? AIRWAY.left : AIRWAY.right;
      const points = [];
      for (let s = 0; s <= 8; s += 1) points.push(bronchusPath(side, s / 8));
      parts.push(cord(points, arm.radius, { radial: 14, steps: 26 }));
    }
    several('trachea-and-bronchi', parts, '#ded4bf', wallMaterial, { opacity: 0.86 });
  }

  // Behind the airway, then behind the heart, then through the diaphragm with
  // the two vagus nerves on it.
  solid(
    'oesophagus',
    cord(
      [
        [0, LEVELS.apex + 1.2, AIRWAY.z - 1.5],
        [0, LEVELS.carina, AIRWAY.z - 1.6],
        [-LEFT * 0.3, LEVELS.hilum, -2.6],
        [LEFT * 0.2, LEVELS.heartCentre, -3.0],
        [...SITES.oesophagealHiatus],
        [LEFT * 0.8, -12.2, -1.6],
      ],
      0.62,
      { radial: 14, flatten: ['z', 0.66] }
    ),
    '#cd9a8b',
    wallMaterial,
    { opacity: 0.8 }
  );

  // --- the great vessels ----------------------------------------------------
  //
  // One structure for the aorta, because its three lengths are one vessel and
  // the point of drawing it here is that it crosses the whole chest.
  solid(
    'aorta',
    cord(
      [
        [LEFT * 0.4, LEVELS.heartCentre + 1.2, 2.6],
        [-LEFT * 0.9, -1.8, 2.0],
        [-LEFT * 0.6, LEVELS.sternalAngle + 0.6, 0.4],
        [LEFT * 1.4, LEVELS.sternalAngle + 0.5, -2.2],
        [LEFT * 1.6, LEVELS.hilum, -3.8],
        [LEFT * 1.0, LEVELS.heartCentre, -4.4],
        [...SITES.aorticHiatus],
        [0, -13.6, -4.6],
      ],
      (u) => 1.5 - 0.45 * smoothstep(0.2, 0.9, u),
      { radial: 18, steps: 70 }
    ),
    '#b53a39'
  );

  several(
    'venae-cavae',
    [
      // Superior: straight down the right of the arch into the right atrium.
      cord(
        [
          [-LEFT * 2.4, LEVELS.apex - 0.6, 1.4],
          [-LEFT * 2.6, LEVELS.sternalAngle, 1.8],
          [-LEFT * 2.3, LEVELS.heartCentre + 2.6, 2.2],
        ],
        0.95,
        { radial: 14, steps: 26 }
      ),
      // Inferior: short, and it enters the chest higher than anything else
      // crossing the diaphragm does.
      cord(
        [
          [-LEFT * 2.0, LEVELS.heartCentre - 1.6, 1.0],
          [...SITES.cavalOpening],
          [-LEFT * 1.6, -9.8, -0.6],
        ],
        1.1,
        { radial: 14, steps: 20 }
      ),
    ],
    '#4a6ea8'
  );

  several(
    'pulmonary-arteries',
    [
      cord(
        [
          [LEFT * 1.0, LEVELS.heartCentre + 2.2, 3.6],
          [LEFT * 1.4, -2.4, 2.6],
          [LEFT * 1.2, LEVELS.hilum + 0.6, 0.8],
        ],
        0.9,
        { radial: 14, steps: 20 }
      ),
      ...[LEFT, -LEFT].map((side) =>
        cord(
          [
            [side === LEFT ? LEFT * 1.2 : LEFT * 0.9, LEVELS.hilum + 0.6, 0.8],
            [side * 2.6, LEVELS.hilum + 0.5, 0.2],
            [side * (Math.abs(bronchusPath(side, 1)[0]) + 0.6), LEVELS.hilum + 0.2, -0.6],
          ],
          0.62,
          { radial: 12, steps: 18 }
        )
      ),
    ],
    '#7f6fb0'
  );

  // --- the two nerves -------------------------------------------------------
  //
  // **The scene's third subject.** They run down the same chest on the same
  // sides and pass the same structure on opposite faces of it: the phrenic in
  // front of the hilum, the vagus behind it. Everything each of them reaches
  // follows from that.
  several(
    'phrenic-nerve',
    [LEFT, -LEFT].map((side) => {
      const hilum = bronchusPath(side, 1);
      return cord(
        [
          [side * 2.2, LEVELS.apex - 0.4, 0.6],
          [side * 3.2, LEVELS.sternalAngle, 2.2],
          // In front of the hilum, on the pericardium.
          [side * (Math.abs(hilum[0]) + 0.8), hilum[1], hilum[2] + 4.2],
          [side * (Math.abs(hilum[0]) + 1.2), LEVELS.heartCentre, 3.4],
          [side * 5.4, diaphragmAt(side * 5.4, 1.6) + 0.3, 1.6],
        ],
        0.19,
        { radial: 10, steps: 44 }
      );
    }),
    '#efe2ab',
    mucosaMaterial
  );

  several(
    'vagus-nerve',
    [LEFT, -LEFT].map((side) => {
      const hilum = bronchusPath(side, 1);
      return cord(
        [
          [side * 1.8, LEVELS.apex - 0.4, -0.6],
          [side * 2.4, LEVELS.sternalAngle, -1.6],
          // Behind the hilum.
          [side * (Math.abs(hilum[0]) + 0.5), hilum[1], hilum[2] - 2.4],
          // And then onto the gullet, which is what it is here for.
          [side * 1.2, LEVELS.heartCentre, -3.4],
          [side * 0.5, -10.4, -2.2],
        ],
        0.17,
        { radial: 10, steps: 44 }
      );
    }),
    '#ddc472',
    mucosaMaterial
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
