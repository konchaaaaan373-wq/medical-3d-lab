import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The abdomen: one bag, and everything that is not in it.
 *
 * The third **regional** model. A chest divides into left, right and the slab
 * between them; an abdomen divides differently, and the division is the whole
 * subject: **the peritoneum is a bag, and the question about any organ here is
 * whether it is inside that bag or behind it.**
 *
 * That one line decides almost everything a reader wants to know. What is
 * behind it — kidney, adrenal, aorta, cava, most of the pancreas, most of the
 * duodenum, the ascending and descending colon — is fixed, is reached from the
 * back or the side, and spills into a space rather than into a cavity. What is
 * inside it — stomach, spleen, small bowel, transverse and sigmoid colon —
 * hangs on a mesentery, moves, and spills into a cavity that reaches from the
 * diaphragm to the pelvis.
 *
 * ## What this scene is for
 *
 * - **`peritoneumBackAt(y)` is the line**, and it is not drawn twice. The bag's
 *   back wall and the retroperitoneum's front wall are the same surface, and
 *   every organ here is placed on one side of it or the other.
 * - **The pancreas and the duodenum straddle it**, which is why they are the
 *   two organs a reader always gets wrong: the tail of one and the first part of
 *   the other are in the bag, the rest of both are behind it.
 * - **Three ventral branches leave the aorta at three levels**, and the middle
 *   one crosses the third part of the duodenum. That crossing is the single
 *   most-drawn relationship in the region.
 *
 * ## The frame
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the patient's **left** is `+x`; `+y` is superior and `+z` anterior. Every
 * paired structure is built from the single `LEFT` constant below.
 *
 * **One world unit is one centimetre**, with `y = 0` at the **transpyloric
 * plane** — L1, halfway between the jugular notch and the pubic symphysis. The
 * pylorus is there, the neck of the pancreas is there, both renal hila are
 * there, the superior mesenteric artery leaves there, and the spinal cord ends
 * there.
 *
 * ## Not an atlas of any organ in it
 *
 * The liver, stomach, spleen, kidney, pancreas and bowel here are **outlines in
 * their places**. Each of them has its own scene at its own scale, and this one
 * answers a different question: not what a kidney is made of, but which side of
 * the peritoneum it is on (`CLAUDE.md`, "Organ と Disease を混ぜない").
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre, angle or volume
 * here is a measurement**, and nothing moves: nothing is digested, nothing
 * peristalses, no organ fills or empties and no pressure exists anywhere.
 */

/** Which way the patient's left is, seen from in front. */
export const LEFT = 1;

/**
 * Centimetres to world units. A viewer constraint, not an anatomical one
 * (`docs/follow-ups.md` F-90), applied once to the finished group.
 */
export const WORLD_SCALE = 0.4;

/**
 * The heights everything in the abdomen is placed against.
 *
 * `y = 0` is the transpyloric plane. Nothing else in this file may place itself
 * at a number that duplicates one of these.
 */
export const LEVELS = Object.freeze({
  /** The dome of the diaphragm: the top of the abdomen, inside the lower ribs. */
  diaphragm: 6.2,
  /** Where the coeliac trunk leaves the aorta — the first of the three. */
  coeliac: 1.7,
  /** **The transpyloric plane.** L1: pylorus, pancreatic neck, renal hila. */
  transpyloric: 0,
  /** Where the superior mesenteric artery leaves — the second of the three. */
  sma: -0.9,
  /** The hila of the kidneys. */
  renalHila: -1.5,
  /** The third part of the duodenum, which the superior mesenteric artery crosses. */
  duodenumThird: -3.1,
  /** The umbilicus, and with it the level the aorta is felt at. */
  umbilicus: -4.4,
  /** Where the inferior mesenteric artery leaves — the last of the three. */
  ima: -4.0,
  /** Where the aorta divides. */
  bifurcation: -5.8,
  /** The brim of the pelvis, where the ureters cross the iliac vessels. */
  pelvicBrim: -9.2,
  /** The bottom of what this scene draws. */
  floor: -11.0,
});

/**
 * The outside of the abdomen at a given height.
 *
 * **One function, four uses**: the wall is built from it, the rectus straps run
 * inside it, the peritoneal cavity is held inside that, and the retroperitoneum
 * is measured back from it.
 */
export function abdomenSection(y) {
  const down = clamp((LEVELS.diaphragm - y) / (LEVELS.diaphragm - LEVELS.pelvicBrim), 0, 1);
  // Narrow under the ribs, widest about the waist, and flaring again into the
  // pelvis. A belly is deeper than a chest for its width.
  const waist = Math.exp(-Math.pow((down - 0.42) / 0.46, 2));
  const pelvis = smoothstep(0.72, 1.08, down);
  return {
    halfWidth: 12.6 - 1.9 * waist + 2.2 * pelvis,
    halfDepth: 9.4 - 1.0 * waist + 0.6 * pelvis,
    centreZ: 1.2,
  };
}

/**
 * **The line the whole scene turns on**: how far back the peritoneal bag
 * reaches at a given height.
 *
 * Everything in front of this is in the bag; everything behind it is behind the
 * bag. **One function, and it is the boundary of two structures at once** — the
 * back wall of the peritoneal cavity and the front wall of the retroperitoneum
 * are the same surface (`docs/architecture-rules.md` rule 1). Written twice
 * they would part company the first time either moved, and the scene would stop
 * being able to say anything.
 *
 * @param {number} y world height
 */
export function peritoneumBackAt(y) {
  const at = abdomenSection(y);
  // The retroperitoneum is deepest where the kidneys are and shallows above and
  // below them.
  const kidneys = Math.exp(-Math.pow((y - LEVELS.renalHila) / 4.2, 2));
  return at.centreZ - at.halfDepth + 3.4 + 3.0 * kidneys;
}

/** Whether a point is behind the bag rather than in it. */
export function isRetroperitoneal(x, y, z) {
  return z < peritoneumBackAt(y);
}

/** The aorta and the cava, and the fact that they are not in the midline. */
export const GREAT_VESSELS = Object.freeze({
  /** The aorta sits a little to the patient's left of the midline. */
  aortaX: LEFT * 1.1,
  /** The cava a little to the right of it, and further forward. */
  cavaX: -LEFT * 1.7,
  aortaRadius: 0.95,
  cavaRadius: 1.15,
});

/**
 * Where the aorta runs at a given height, and where the cava does.
 *
 * **One function, five uses**: the aorta is built from it and all three of its
 * ventral branches, the renal arteries and the bifurcation leave from it, so a
 * branch cannot start off its own vessel.
 *
 * @param {number} y world height
 * @returns {[number, number, number]}
 */
export function aortaAt(y) {
  const back = peritoneumBackAt(y);
  return [GREAT_VESSELS.aortaX, y, back - 2.1];
}

/** Where the inferior vena cava runs at a given height. */
export function cavaAt(y) {
  const back = peritoneumBackAt(y);
  return [GREAT_VESSELS.cavaX, y, back - 2.3];
}

/**
 * The psoas muscle, which is the shelf the kidneys and the ureters lie on.
 *
 * @param {number} y world height
 * @param {number} side `LEFT` or `-LEFT`
 * @returns {[number, number, number]}
 */
export function psoasAt(y, side) {
  const down = clamp((LEVELS.transpyloric - y) / (LEVELS.transpyloric - LEVELS.pelvicBrim), 0, 1);
  const back = peritoneumBackAt(y);
  // It runs down and outwards, away from the column and towards the brim.
  // Deep: the kidney and the ureter lie **on its front surface**, so psoas has
  // to be behind both of them and not level with them.
  return [side * (2.2 + 2.6 * down), y, back - 3.4 + 1.2 * down];
}

/**
 * The two kidneys. **The right is lower than the left**, because the liver is
 * above it — which is the one asymmetry a reader is expected to remember.
 */
export const KIDNEYS = Object.freeze({
  left: Object.freeze({ y: LEVELS.renalHila + 0.9, x: LEFT * 5.6 }),
  right: Object.freeze({ y: LEVELS.renalHila - 1.0, x: -LEFT * 5.6 }),
  halfHeight: 5.2,
  halfWidth: 2.6,
  halfDepth: 2.6,
});

/** Where one kidney's centre is. */
export function kidneyAt(side) {
  const k = side === LEFT ? KIDNEYS.left : KIDNEYS.right;
  return [k.x, k.y, peritoneumBackAt(k.y) - 2.3];
}

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** L1: the level half the region is measured from. */
  transpyloric: [0, LEVELS.transpyloric, peritoneumBackAt(0)],
  /** Where the coeliac trunk leaves. */
  coeliac: aortaAt(LEVELS.coeliac),
  /** Where the superior mesenteric artery leaves. */
  sma: aortaAt(LEVELS.sma),
  /** Where that artery crosses the third part of the duodenum. */
  duodenalCrossing: [0, LEVELS.duodenumThird, peritoneumBackAt(LEVELS.duodenumThird) + 0.4],
  /** The hilum of the left kidney. */
  hilumLeft: [LEFT * 3.4, KIDNEYS.left.y, peritoneumBackAt(KIDNEYS.left.y) - 2.0],
  /** The hilum of the right kidney. */
  hilumRight: [-LEFT * 3.4, KIDNEYS.right.y, peritoneumBackAt(KIDNEYS.right.y) - 2.0],
  /** Where the aorta divides, and where it can be felt. */
  bifurcation: aortaAt(LEVELS.bifurcation),
  /** Where each ureter crosses the brim — the one place it can be found. */
  ureterCrossing: psoasAt(LEVELS.pelvicBrim, LEFT),
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

/** Hold a vertex in front of the peritoneum's back wall, or behind it. */
function keepSideOfPeritoneum(v, inTheBag, clearance = 0.2) {
  const back = peritoneumBackAt(v.y);
  if (inTheBag && v.z < back + clearance) v.z = back + clearance;
  if (!inTheBag && v.z > back - clearance) v.z = back - clearance;
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
export function buildAbdomen({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'abdomen';
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

  const cord = (points, radius, { steps = 52, radial = 12, flatten = null } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    if (flatten) flattenTube(surface, flatten[0], flatten[1]);
    disposables.push(surface);
    return surface.geometry;
  };

  /** A blob in its place, held on one side of the peritoneum. */
  const organ = (id, { at, scale, inTheBag, color, warp, detail = 5, material, extra }) =>
    solid(
      id,
      warpGeometry(shapedSphere({ detail, scale, warp }), (v) => {
        v.x += at[0];
        v.y += at[1];
        v.z += at[2];
        if (inTheBag !== null) keepSideOfPeritoneum(v, inTheBag);
      }),
      color,
      material ?? tissueMaterial,
      extra ?? {}
    );

  // --- the wall -------------------------------------------------------------
  solid(
    'abdominal-wall',
    shellGeometry({
      y0: LEVELS.diaphragm,
      y1: LEVELS.pelvicBrim,
      section: abdomenSection,
      detail: 5,
    }),
    '#d9a793',
    wallMaterial,
    { opacity: 0.3 }
  );

  // The two straps down the front. They are what is cut through in the midline
  // and what is split in the flank, and they are the only part of the wall a
  // reader can point at from outside.
  several(
    'rectus-abdominis',
    [LEFT, -LEFT].map((side) => {
      const points = [];
      for (let s = 0; s <= 8; s += 1) {
        const y = lerp(LEVELS.diaphragm - 0.6, LEVELS.pelvicBrim + 0.4, s / 8);
        const at = abdomenSection(y);
        points.push([side * (2.2 + 0.5 * (s / 8)), y, at.centreZ + at.halfDepth - 1.0]);
      }
      return cord(points, (u) => 2.0 - 0.5 * u, { radial: 14, steps: 30, flatten: ['z', 0.32] });
    }),
    '#b8565a'
  );

  // --- the bag, and what is behind it --------------------------------------
  //
  // These two share a surface: `peritoneumBackAt` is the back of the first and
  // the front of the second, so nothing can be in both or in neither.
  solid(
    'peritoneal-cavity',
    shellGeometry({
      y0: LEVELS.diaphragm - 0.4,
      y1: LEVELS.pelvicBrim,
      section: (y) => {
        const at = abdomenSection(y);
        const back = peritoneumBackAt(y);
        const front = at.centreZ + at.halfDepth - 1.6;
        return {
          halfWidth: at.halfWidth - 1.6,
          halfDepth: (front - back) / 2,
          centreZ: (front + back) / 2,
        };
      },
      detail: 5,
    }),
    '#a8c4d8',
    wallMaterial,
    { opacity: 0.16 }
  );

  solid(
    'retroperitoneum',
    shellGeometry({
      y0: LEVELS.diaphragm - 1.2,
      y1: LEVELS.pelvicBrim,
      section: (y) => {
        const at = abdomenSection(y);
        const back = peritoneumBackAt(y);
        const wall = at.centreZ - at.halfDepth + 0.6;
        return {
          halfWidth: at.halfWidth - 2.4,
          halfDepth: (back - wall) / 2,
          centreZ: (back + wall) / 2,
        };
      },
      detail: 5,
    }),
    '#c9bf9a',
    wallMaterial,
    { opacity: 0.2 }
  );

  // --- the back wall --------------------------------------------------------
  {
    const parts = [];
    for (let i = 0; i < 5; i += 1) {
      const y = LEVELS.transpyloric - i * 2.6;
      const at = abdomenSection(y);
      const body = new THREE.BoxGeometry(4.0, 2.0, 3.0);
      body.translate(0, y, at.centreZ - at.halfDepth + 2.0);
      parts.push(body);
      const spine = new THREE.BoxGeometry(1.1, 1.0, 3.2);
      spine.translate(0, y - 1.0, at.centreZ - at.halfDepth - 1.0);
      parts.push(spine);
    }
    for (const part of parts) {
      part.deleteAttribute('uv');
      part.deleteAttribute('normal');
    }
    const merged = mergeGeometries(parts);
    merged.computeVertexNormals();
    for (const part of parts) part.dispose();
    solid('lumbar-vertebrae', merged, '#d8cfbc', mineralMaterial);
  }

  several(
    'psoas-muscle',
    [LEFT, -LEFT].map((side) => {
      const points = [];
      for (let s = 0; s <= 6; s += 1) {
        points.push(psoasAt(lerp(LEVELS.transpyloric + 1.6, LEVELS.pelvicBrim, s / 6), side));
      }
      return cord(points, (u) => 1.9 + 0.4 * u, { radial: 14, steps: 26 });
    }),
    '#a84f4c'
  );

  // --- inside the bag -------------------------------------------------------
  organ('liver', {
    at: [-LEFT * 5.2, 3.2, 3.6],
    scale: [7.6, 3.6, 4.6],
    inTheBag: true,
    color: '#8f4a42',
    warp: (v) => {
      // Wedge-shaped: thick on the right, thinning to a point on the left.
      const toLeft = smoothstep(-0.2, 1, v.x * LEFT);
      v.y *= 1 - 0.5 * toLeft;
      v.z *= 1 - 0.3 * toLeft;
    },
  });

  organ('stomach', {
    at: [LEFT * 3.6, 2.4, 4.2],
    scale: [3.4, 3.6, 2.6],
    inTheBag: true,
    color: '#c07f6a',
    warp: (v) => {
      // A J: the greater curvature swings down and to the left.
      const down = smoothstep(0.4, -1, v.y);
      v.x += LEFT * 0.5 * down;
    },
  });

  organ('spleen', {
    at: [LEFT * 8.6, 3.0, -0.6],
    scale: [2.0, 2.8, 2.4],
    inTheBag: true,
    color: '#7f4f6a',
  });

  // The mesentery: the fan the small bowel hangs on, with the superior
  // mesenteric vessels running down inside it. It is why small bowel moves and
  // colon on the back wall does not.
  solid(
    'mesentery',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 40, 26, 1), (v) => {
      const along = v.x + 0.5;
      const down = 0.5 - v.y;
      // From a short root running down and to the right, to a long free border
      // out in the bag.
      const rootY = lerp(LEVELS.sma, LEVELS.pelvicBrim + 1.6, along);
      const rootX = lerp(-LEFT * 0.6, LEFT * 5.0, along) * -1;
      const rootZ = peritoneumBackAt(rootY) + 0.4;
      const spread = 6.6 * Math.sin(Math.PI * clamp(along, 0, 1)) + 1.0;
      v.x = rootX + (v.z + 0.5) * 0 + spread * down * (0.2 + 0.9 * along);
      v.y = rootY - 2.0 * down;
      v.z = rootZ + spread * down * 0.9;
    }),
    '#e0c39a',
    wallMaterial,
    { opacity: 0.42 }
  );

  organ('small-bowel', {
    at: [LEFT * 0.4, -4.2, 4.4],
    scale: [7.4, 4.2, 3.4],
    inTheBag: true,
    color: '#d49a86',
    detail: 6,
    warp: (v) => {
      // Coiled rather than smooth, so a bag of loops does not read as one organ.
      const coil =
        0.1 * Math.sin(v.x * 7.4) * Math.cos(v.y * 6.2) + 0.08 * Math.sin(v.z * 8.6 + v.x * 3.1);
      v.multiplyScalar(1 + coil);
    },
  });

  // The colon: a frame round the small bowel. **Two of its four lengths are
  // behind the bag and two are in it**, which is the clearest example in the
  // body of the distinction this scene is about.
  {
    const ascending = [];
    for (let s = 0; s <= 6; s += 1) {
      const y = lerp(LEVELS.pelvicBrim + 1.0, LEVELS.transpyloric + 1.4, s / 6);
      ascending.push([-LEFT * 9.4, y, peritoneumBackAt(y) - 2.0]);
    }
    const transverse = [];
    for (let s = 0; s <= 6; s += 1) {
      const x = lerp(-LEFT * 9.2, LEFT * 9.2, s / 6);
      // Hanging forward into the bag, and sagging in the middle.
      transverse.push([x, 0.6 - 2.4 * Math.sin(Math.PI * (s / 6)), 5.6 - 1.2 * Math.abs(s / 6 - 0.5)]);
    }
    const descending = [];
    for (let s = 0; s <= 6; s += 1) {
      const y = lerp(LEVELS.transpyloric + 1.4, LEVELS.pelvicBrim + 1.4, s / 6);
      descending.push([LEFT * 9.6, y, peritoneumBackAt(y) - 2.0]);
    }
    const sigmoid = [
      [LEFT * 9.6, LEVELS.pelvicBrim + 1.4, peritoneumBackAt(LEVELS.pelvicBrim + 1.4) + 1.8],
      [LEFT * 5.0, LEVELS.pelvicBrim - 0.6, 3.0],
      [0, LEVELS.pelvicBrim - 1.0, 1.4],
    ];
    several(
      'colon',
      [ascending, transverse, descending, sigmoid].map((points) =>
        cord(points, 1.5, { radial: 14, steps: 30 })
      ),
      '#c9a06e'
    );
  }

  // The apron that hangs in front of all of it, which is why a bowel is not the
  // first thing seen when a belly is opened.
  solid(
    'greater-omentum',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 44, 30, 1), (v) => {
      const across = v.x;
      const down = 0.5 - v.y;
      const y = lerp(1.4, LEVELS.pelvicBrim + 0.6, down);
      const at = abdomenSection(y);
      v.x = across * 2 * (at.halfWidth - 3.0);
      v.y = y;
      v.z = at.centreZ + at.halfDepth - 2.6 - 1.2 * Math.abs(across) * 2;
    }),
    '#e8d09c',
    wallMaterial,
    { opacity: 0.5 }
  );

  // --- behind the bag -------------------------------------------------------
  //
  // The two organs that straddle the line. The pancreas lies across the back
  // with its tail reaching into the bag towards the spleen; the duodenum curls
  // round its head with only its first part in the bag.
  solid(
    'pancreas',
    (() => {
      const points = [];
      for (let s = 0; s <= 8; s += 1) {
        const t = s / 8;
        // Head low and to the right, neck at the transpyloric plane, body and
        // tail rising to the left towards the spleen.
        const x = lerp(-LEFT * 3.4, LEFT * 8.4, t);
        const y = lerp(LEVELS.transpyloric - 1.8, LEVELS.transpyloric + 2.8, t ** 0.8);
        const back = peritoneumBackAt(y);
        // The tail is the one part that leaves the back wall and enters the bag.
        const forward = 0.3 + 3.0 * smoothstep(0.74, 1, t);
        points.push([x, y, back - 1.7 + forward]);
      }
      return cord(points, (u) => 1.5 - 0.7 * smoothstep(0.3, 1, u), {
        radial: 14,
        steps: 34,
        flatten: ['z', 0.62],
      });
    })(),
    '#d8b070'
  );

  solid(
    'duodenum',
    cord(
      [
        // First part: **in the bag**, off the pylorus. It is the only part that
        // is, which is the claim this structure is here to make.
        [LEFT * 1.4, LEVELS.transpyloric + 1.6, peritoneumBackAt(LEVELS.transpyloric + 1.6) + 2.6],
        [-LEFT * 2.0, LEVELS.transpyloric + 1.0, peritoneumBackAt(LEVELS.transpyloric + 1.0) + 1.7],
        // Second part: down the right of the pancreas head, behind the bag.
        [-LEFT * 4.4, LEVELS.transpyloric - 0.6, peritoneumBackAt(LEVELS.transpyloric - 0.6) - 1.3],
        [-LEFT * 4.6, LEVELS.duodenumThird + 0.6, peritoneumBackAt(LEVELS.duodenumThird + 0.6) - 1.4],
        // Third part: across the midline, **under the superior mesenteric artery**.
        [-LEFT * 1.8, LEVELS.duodenumThird, peritoneumBackAt(LEVELS.duodenumThird) - 1.4],
        [LEFT * 1.6, LEVELS.duodenumThird, peritoneumBackAt(LEVELS.duodenumThird) - 1.4],
        // Fourth part: up on the left, still behind, to where it becomes jejunum.
        [LEFT * 2.8, LEVELS.sma - 0.4, peritoneumBackAt(LEVELS.sma - 0.4) - 1.2],
      ],
      0.92,
      { radial: 14, steps: 44 }
    ),
    '#cf9f8f'
  );

  several(
    'kidneys',
    [LEFT, -LEFT].map((side) => {
      const at = kidneyAt(side);
      return warpGeometry(
        shapedSphere({
          detail: 5,
          scale: [KIDNEYS.halfWidth, KIDNEYS.halfHeight, KIDNEYS.halfDepth],
          warp: (v) => {
            // Hollowed on the side facing the midline: that hollow is the hilum.
            const medial = -v.x * side;
            const middle = Math.exp(-Math.pow(v.y / 0.42, 2));
            if (medial > 0) v.x += side * 0.55 * medial * middle;
          },
        }),
        (v) => {
          v.x += at[0];
          v.y += at[1];
          v.z += at[2];
          keepSideOfPeritoneum(v, false);
        }
      );
    }),
    '#a8555a'
  );

  // Capping each kidney, and **not** part of it: different origin, different
  // blood supply, and removing a kidney does not remove one.
  several(
    'adrenal-glands',
    [LEFT, -LEFT].map((side) => {
      const at = kidneyAt(side);
      // Held behind the line like everything else back here: the gland sits
      // higher than the kidney it caps, and the line is shallower up there, so
      // a depth copied from the kidney put a third of it in the bag.
      return warpGeometry(shapedSphere({ detail: 4, scale: [1.9, 0.9, 1.3] }), (v) => {
        v.x += at[0] - side * 0.6;
        v.y += at[1] + KIDNEYS.halfHeight - 0.2;
        v.z += at[2] - 0.2;
        keepSideOfPeritoneum(v, false);
      });
    }),
    '#d9b25c'
  );

  several(
    'ureters',
    [LEFT, -LEFT].map((side) => {
      const points = [];
      for (let s = 0; s <= 6; s += 1) {
        const t = s / 6;
        const y = lerp(kidneyAt(side)[1], LEVELS.pelvicBrim - 0.8, t);
        const on = psoasAt(y, side);
        // Down the front of psoas, drawing in towards the midline as it goes —
        // and **still behind the line**, which `psoasAt` alone does not
        // guarantee at the bottom of its run.
        points.push([
          lerp(kidneyAt(side)[0] - side * 2.2, on[0] * 0.86, t),
          y,
          Math.min(peritoneumBackAt(y) - 1.0, on[2] + 1.4),
        ]);
      }
      return cord(points, 0.34, { radial: 10, steps: 30 });
    }),
    '#c9b4a0'
  );

  // --- the great vessels and the three branches ----------------------------
  solid(
    'aorta',
    (() => {
      const points = [];
      for (let s = 0; s <= 8; s += 1) {
        points.push(aortaAt(lerp(LEVELS.diaphragm - 0.6, LEVELS.bifurcation, s / 8)));
      }
      const low = aortaAt(LEVELS.bifurcation);
      points.push([low[0] - LEFT * 0.4, LEVELS.bifurcation - 1.4, low[2] + 0.3]);
      return cord(points, GREAT_VESSELS.aortaRadius, { radial: 16, steps: 34 });
    })(),
    '#b53a39'
  );

  solid(
    'inferior-vena-cava',
    (() => {
      const points = [];
      for (let s = 0; s <= 8; s += 1) {
        points.push(cavaAt(lerp(LEVELS.bifurcation - 1.2, LEVELS.diaphragm - 0.6, s / 8)));
      }
      return cord(points, GREAT_VESSELS.cavaRadius, { radial: 16, steps: 34 });
    })(),
    '#4a6ea8'
  );

  // **Three ventral branches at three levels**, and the middle one crosses the
  // third part of the duodenum. All three start on `aortaAt`, so none of them
  // can begin off its own vessel.
  solid(
    'coeliac-trunk',
    (() => {
      const root = aortaAt(LEVELS.coeliac);
      return cord(
        [
          root,
          [root[0], root[1] + 0.2, root[2] + 1.6],
          [root[0] + LEFT * 1.6, root[1] + 0.8, root[2] + 2.6],
        ],
        0.46,
        { radial: 10, steps: 18 }
      );
    })(),
    '#c0403e'
  );

  several(
    'superior-mesenteric-vessels',
    (() => {
      const root = aortaAt(LEVELS.sma);
      const artery = [
        root,
        [root[0], LEVELS.sma - 0.6, root[2] + 1.8],
        // Passing in front of the third part of the duodenum, not behind it.
        [root[0] - LEFT * 0.2, LEVELS.duodenumThird, peritoneumBackAt(LEVELS.duodenumThird) + 1.0],
        [root[0] + LEFT * 1.2, LEVELS.umbilicus - 1.6, 3.4],
        [root[0] + LEFT * 2.6, LEVELS.pelvicBrim + 2.0, 4.2],
      ];
      const vein = artery.map(([x, y, z]) => [x - LEFT * 1.3, y, z + 0.3]);
      return [
        cord(artery, (u) => 0.52 - 0.2 * u, { radial: 10, steps: 34 }),
        cord(vein, (u) => 0.58 - 0.22 * u, { radial: 10, steps: 34 }),
      ];
    })(),
    '#c9535f'
  );

  solid(
    'inferior-mesenteric-artery',
    (() => {
      const root = aortaAt(LEVELS.ima);
      return cord(
        [
          root,
          [root[0] + LEFT * 1.4, root[1] - 1.0, root[2] + 1.2],
          [root[0] + LEFT * 4.4, LEVELS.pelvicBrim + 1.6, root[2] + 2.0],
        ],
        0.34,
        { radial: 10, steps: 20 }
      );
    })(),
    '#c0403e'
  );

  // The renal vessels, and the one relationship worth drawing them for: **the
  // left renal vein has to cross the midline in front of the aorta** to reach
  // the cava, and it crosses under the superior mesenteric artery to do it.
  several(
    'renal-vessels',
    (() => {
      const parts = [];
      for (const side of [LEFT, -LEFT]) {
        const at = kidneyAt(side);
        const root = aortaAt(at[1]);
        parts.push(
          cord([root, [side * 2.6, at[1], root[2] + 0.2], [at[0] - side * 2.0, at[1], at[2]]], 0.38, {
            radial: 10,
            steps: 18,
          })
        );
        const cavaRoot = cavaAt(at[1] + 0.4);
        const vein = [
          [at[0] - side * 2.0, at[1] + 0.4, at[2] + 0.5],
          [side * 2.6, at[1] + 0.4, cavaRoot[2] + 1.1],
          cavaRoot,
        ];
        parts.push(cord(vein, 0.44, { radial: 10, steps: 18 }));
      }
      return parts;
    })(),
    '#8f5e8f'
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
