import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The nose and the paranasal sinuses: one narrow cavity with rooms off it.
 *
 * The whole of this anatomy is about a **slit with shelves in it**. Air comes
 * in at the nostril, passes three turbinates that hang off the lateral wall,
 * and leaves backwards into the pharynx; four air-filled sinuses drain into the
 * gutters under those shelves through openings that are, in two cases, nowhere
 * near the bottom of the room they drain. That last fact is the reason this
 * scene exists in 3D at all: it cannot be drawn in a way that makes sense from
 * one flat picture, and it is what a blocked sinus is about.
 *
 * The cavity is **genuinely narrow** — about fifteen millimetres from septum to
 * lateral wall — and it is drawn narrow. Nothing here is widened to be easier
 * to click; what opens it up is the septum stepping back (the layer slider) and
 * the viewpoints that come in from the medial side, which is exactly how the
 * lateral wall is looked at in life.
 *
 * ## A right nasal cavity, with a whole external nose in front of it
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * the right side of the body is at −x and, in a right cavity, **medial** —
 * towards the septum and the midline — is +x. `+y` is superior, `+z` anterior.
 *
 * The external nose, the septum, the hard palate and the nasopharynx are
 * midline or shared and are drawn whole. Everything with a side to it — the
 * turbinates, the meatuses, the four sinuses, the two ducts — is the **right**
 * one, and the left is simply not drawn.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No length, calibre, angle or
 * volume here is a measurement**, and nothing moves: no air flows, no mucus is
 * cleared, and nothing swells.
 */

/** Which way medial is, in a right nasal cavity. */
export const MEDIAL = 1;

/**
 * The box the cavity lives in. Everything else is placed against these.
 *
 * One unit is roughly two centimetres, which puts a cavity of about seven
 * centimetres front to back at 3.4 units and the septum-to-wall distance at
 * 0.82 — a slit, which is what it is.
 */
export const CAVITY = Object.freeze({
  /** The midline. The septum is centred on it. */
  septum: 0,
  /** The lateral wall the turbinates hang from. */
  lateralWall: -MEDIAL * 0.82,
  /** The floor: the top of the hard palate. */
  floor: -0.72,
  /** The roof, under the anterior skull base. */
  roof: 0.98,
  /** The plane of the nostril. */
  nostril: 1.72,
  /** The choana: where the cavity opens backwards into the pharynx. */
  choana: -1.66,
});

/**
 * The three turbinates, each as the shelf it is.
 *
 * `attachY` is where the shelf meets the lateral wall, `reach` how far medially
 * it projects, `curl` how far its free edge hangs below its attachment, and
 * `thickness` its half-depth at the thickest point. The gutter under each one
 * is the meatus of the same name, and it is built from these same numbers —
 * see `turbinateSurface`.
 */
export const TURBINATES = Object.freeze({
  inferior: Object.freeze({
    id: 'inferior',
    attachY: -0.1,
    reach: 0.52,
    curl: 0.3,
    thickness: 0.13,
    zFront: 1.06,
    zBack: -1.32,
  }),
  middle: Object.freeze({
    id: 'middle',
    attachY: 0.4,
    reach: 0.44,
    curl: 0.28,
    thickness: 0.11,
    zFront: 0.82,
    zBack: -1.22,
  }),
  superior: Object.freeze({
    id: 'superior',
    attachY: 0.76,
    reach: 0.3,
    curl: 0.18,
    thickness: 0.08,
    zFront: -0.08,
    zBack: -1.02,
  }),
});

/**
 * The mid-surface of a turbinate at a given distance out from the wall.
 *
 * **One function, three uses.** The shelf is built around it, the gutter below
 * it takes its roof from it, and the gutter above takes its floor from it. Two
 * functions that happened to agree would drift the first time a turbinate moved
 * (`docs/architecture-rules.md` rule 1).
 *
 * @param {typeof TURBINATES.inferior} level
 * @param {number} x world x
 */
export function turbinateSurface(level, x) {
  const m = clamp((x - CAVITY.lateralWall) / (MEDIAL * level.reach), 0, 1);
  return level.attachY - level.curl * m * m;
}

/** How far the free edge of a turbinate reaches medially. */
export function turbinateEdge(level) {
  return CAVITY.lateralWall + MEDIAL * level.reach;
}

/**
 * The silhouette of the external nose in the sagittal plane, as `[z, y]` in
 * world units, going round: root, bridge, dorsum, tip, columella, alar base,
 * and back up the face to the root.
 *
 * **A nose is recognised by this outline and by very little else**, which is
 * why it is written down rather than being a warp of an ellipsoid. Two earlier
 * attempts — an ellipsoid tapered towards the top, then a tube swept along the
 * dorsum — came out a teardrop and a hook, because neither of them had a face
 * behind it to close the shape against. This one does: the last two points are
 * the plane the nose stands off.
 */
export const NOSE_PROFILE = Object.freeze([
  [0.52, 1.28],
  [0.86, 0.92],
  [1.3, 0.44],
  [1.66, 0.12],
  [1.88, -0.14],
  [1.58, -0.52],
  [1.1, -0.66],
  [0.62, -0.62],
  [0.34, 0.1],
]);

/** How wide the nose is at a given height: broad at the alae, narrow at the
 *  root. A display shape, not a measurement. */
export function noseHalfWidth(y) {
  return 0.1 + 0.36 * smoothstep(1.05, -0.5, y);
}

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The nostril, at the front of the vestibule. */
  nostril: [-MEDIAL * 0.26, -0.4, 1.6],
  /** The tip of the external nose. */
  tip: [0, NOSE_PROFILE[3][1], NOSE_PROFILE[3][0]],
  /** The maxillary sinus's own opening, high on its medial wall. */
  maxillaryOstium: [-MEDIAL * 0.72, 0.09, 0.17],
  /** The floor of the maxillary sinus — below its opening, which is the point. */
  maxillaryFloor: [-MEDIAL * 1.38, -0.75, 0.05],
  /** The gutter the maxillary, frontal and anterior ethmoid sinuses drain into. */
  middleMeatus: [-MEDIAL * 0.6, 0.11, 0.2],
  /** Where the tear duct opens, under the inferior turbinate. */
  nasolacrimalOpening: [-MEDIAL * 0.55, -0.45, 0.62],
  /** The olfactory patch on the roof. */
  olfactoryRoof: [-MEDIAL * 0.3, 0.94, -0.28],
  /** The choana, on the way to the pharynx. */
  choana: [-MEDIAL * 0.42, -0.06, CAVITY.choana],
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

/** The top of the septum: the roof, sloping down at the front and the back. */
export function septumTop(z) {
  if (z > 0.5) return lerp(0.98, -0.02, clamp((z - 0.5) / 1.04, 0, 1));
  if (z < -1.0) return lerp(0.98, 0.42, clamp((-1.0 - z) / 0.66, 0, 1));
  return CAVITY.roof;
}

/** The bottom of the septum: the floor, rising at the front to meet the top. */
export function septumBottom(z) {
  if (z > 1.14) return lerp(CAVITY.floor, -0.04, clamp((z - 1.14) / 0.4, 0, 1));
  return CAVITY.floor;
}

/** The top of the lateral wall: the roof, cut down at the front where the
 *  bony opening of the nose is, and at the back above the choana. */
export function lateralWallTop(z) {
  if (z > 0.86) return lerp(CAVITY.roof, 0.24, clamp((z - 0.86) / 0.3, 0, 1));
  if (z < -1.0) return lerp(CAVITY.roof, 0.42, clamp((-1.0 - z) / 0.66, 0, 1));
  return CAVITY.roof;
}

/**
 * A plate in a sagittal plane: a slab of fixed thickness whose outline is drawn
 * by a top and a bottom curve. A septum is read from that outline, so the
 * outline is what is written rather than being whatever squaring an ellipsoid
 * happens to leave.
 */
function plateGeometry({ x = 0, halfThickness, z0, z1, top, bottom, nz = 40 }) {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, nz);
  return warpGeometry(geometry, (v) => {
    const z = lerp(z0, z1, v.z + 0.5);
    v.z = z;
    v.x = x + v.x * 2 * halfThickness;
    v.y = v.y > 0 ? top(z) : bottom(z);
  });
}

/**
 * A turbinate: a lens-shaped shelf swept front to back, attached along the
 * lateral wall and hanging over the gutter it roofs.
 */
function scrollGeometry(level, { steps = 46, radial = 26 } = {}) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const z = lerp(level.zFront, level.zBack, u);
    // Tapered at both ends: a turbinate rises out of the wall and sinks back
    // into it rather than stopping square.
    const extent = Math.sin(Math.PI * clamp((u - 0.02) / 0.96, 0, 1)) ** 0.28;
    for (let j = 0; j < radial; j += 1) {
      const a = (2 * Math.PI * j) / radial;
      // Out to the free edge over the first half of the loop and back over the
      // second, so the cross-section closes on itself.
      const m = 0.5 - 0.5 * Math.cos(a);
      const x = CAVITY.lateralWall + MEDIAL * level.reach * m * extent;
      const half = level.thickness * Math.sin(Math.PI * m) ** 0.55 * extent;
      const y = turbinateSurface(level, x) + Math.sign(Math.sin(a)) * half;
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      indices.push(a, b, a + radial, b, b + radial, a + radial);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * A meatus: the gutter between two surfaces, drawn as the space itself.
 *
 * A space cannot be pointed at any other way, and these three are what the
 * sinuses and the tear duct open into, so they have to be nameable.
 */
function gutterGeometry({ x0, x1, z0, z1, top, bottom, nx = 18, nz = 30 }) {
  const geometry = new THREE.BoxGeometry(1, 1, 1, nx, 1, nz);
  return warpGeometry(geometry, (v) => {
    const x = lerp(x0, x1, v.x + 0.5);
    const z = lerp(z0, z1, v.z + 0.5);
    v.x = x;
    v.z = z;
    v.y = v.y > 0 ? top(x, z) : bottom(x, z);
  });
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildNose({ colors = {}, opacity = 1 } = {}) {
  const object = new THREE.Group();
  object.name = 'nose';
  const disposables = [];
  const index = new Map();

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

  const cord = (id, points, radius, color, { material = mucosaMaterial, radial = 16, steps = 34 } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    const built = material({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };

  // --- the outside ----------------------------------------------------------
  //
  // A nose is read from its profile, so it is built from one: a line of named
  // points from the root between the eyes, down the dorsum to the tip, and back
  // under it to the alar base, with the shell swept around that line — narrow
  // above and broad below. It is drawn whole, because a nose is a midline
  // structure and half of one is not recognisable as anything.
  // Drawn through the points rather than between them: a nose has no straight
  // edges on it, and the first version, with one segment per point, came out a
  // faceted tent.
  const outline = NOSE_PROFILE.map(([z, y]) => new THREE.Vector2(z, y));
  const silhouette = new THREE.Shape();
  silhouette.moveTo(outline[0].x, outline[0].y);
  silhouette.splineThru(outline.slice(1));
  silhouette.autoClose = true;
  solid(
    'external-nose',
    warpGeometry(
      mergeVertices(
        new THREE.ExtrudeGeometry(silhouette, {
          depth: 1,
          steps: 1,
          curveSegments: 14,
          bevelEnabled: true,
          bevelThickness: 0.14,
          bevelSize: 0.08,
          bevelOffset: 0,
          bevelSegments: 5,
        }),
        1e-4
      ),
      (v) => {
        // The shape is drawn in (z, y) and extruded across the midline, so the
        // extrusion coordinate is what becomes width — tapered by height, which
        // is what turns a flat cut-out into a nose.
        const across = v.z / 1.24 - 0.5;
        const z = v.x;
        v.x = across * 2 * noseHalfWidth(v.y);
        v.z = z;
      }
    ),
    null,
    '#e9bda4',
    tissueMaterial,
    { opacity }
  );

  // The vestibule: the first room inside the nostril, skin-lined rather than
  // mucosa-lined, and the only part of the cavity you can see into from outside.
  solid(
    'nasal-vestibule',
    gutterGeometry({
      x0: -MEDIAL * 0.06,
      x1: -MEDIAL * 0.46,
      z0: 1.64,
      z1: 1.12,
      top: () => -0.12,
      bottom: () => -0.68,
      nx: 8,
      nz: 10,
    }),
    null,
    '#d9a58c',
    wallMaterial
  );

  // --- the walls of the cavity ---------------------------------------------
  //
  // The septum: a plate on the midline, with the outline a septum has — the
  // roof along the top, the floor along the bottom, a slope down at the front
  // to where it runs out under the tip, and the choana cut away behind.
  solid(
    'nasal-septum',
    plateGeometry({
      halfThickness: 0.07,
      z0: 1.54,
      z1: CAVITY.choana,
      top: septumTop,
      bottom: septumBottom,
    }),
    null,
    '#e6cdbb',
    tissueMaterial,
    { opacity }
  );

  // The lateral wall: the sheet the turbinates hang off and the sinuses sit
  // behind. It is what makes them a wall rather than three floating shelves,
  // and it carries the same roof and floor as the septum opposite it.
  solid(
    'lateral-nasal-wall',
    plateGeometry({
      x: CAVITY.lateralWall - MEDIAL * 0.07,
      halfThickness: 0.08,
      z0: 1.16,
      z1: CAVITY.choana,
      top: lateralWallTop,
      bottom: () => CAVITY.floor,
    }),
    null,
    '#e4d9c4',
    mineralMaterial
  );

  // The floor, which is the roof of the mouth. Drawn whole: it is one plate
  // across the midline, and where it ends is where the pharynx begins.
  solid(
    'hard-palate',
    warpGeometry(new THREE.BoxGeometry(1, 1, 1, 24, 1, 30), (v) => {
      const x = lerp(0.74, -0.92, v.x + 0.5);
      const z = lerp(1.5, CAVITY.choana + 0.04, v.z + 0.5);
      v.x = x;
      v.z = z;
      // Arched: the nasal side is the top of a vault, so the floor of the nose
      // is higher in the midline than at its sides.
      const arch = 0.06 * Math.cos((Math.PI * x) / 1.9);
      v.y = v.y > 0 ? CAVITY.floor + arch : CAVITY.floor - 0.11 + arch;
    }),
    null,
    '#eae2cd',
    mineralMaterial
  );

  // --- the three shelves and the three gutters ------------------------------
  for (const level of [TURBINATES.inferior, TURBINATES.middle, TURBINATES.superior]) {
    solid(`${level.id}-turbinate`, scrollGeometry(level), null, '#dca08c', mucosaMaterial);
  }

  // Each gutter is roofed by the turbinate above it and floored by the one
  // below — or, for the lowest, by the floor of the cavity itself.
  const meatus = (level, below) =>
    gutterGeometry({
      x0: CAVITY.lateralWall - MEDIAL * 0.02,
      x1: turbinateEdge(level),
      z0: level.zFront - 0.02,
      z1: level.zBack + 0.02,
      top: (x) => turbinateSurface(level, x) - level.thickness,
      bottom: below
        ? (x) => turbinateSurface(below, x) + below.thickness
        : () => CAVITY.floor + 0.02,
    });

  solid('inferior-meatus', meatus(TURBINATES.inferior, null), null, '#a9cfe0', wallMaterial);
  solid('middle-meatus', meatus(TURBINATES.middle, TURBINATES.inferior), null, '#8fc0d8', wallMaterial);
  solid('superior-meatus', meatus(TURBINATES.superior, TURBINATES.middle), null, '#7aafd0', wallMaterial);

  // --- the four sinuses -----------------------------------------------------
  //
  // The maxillary: the big one, lateral to and below the cavity, with its own
  // opening high on the wall it shares with the nose.
  solid(
    'maxillary-sinus',
    shapedSphere({
      detail: 5,
      scale: [0.56, 0.46, 0.8],
      warp: (v) => {
        // Flat against the nasal wall on its medial side, and tapering down and
        // laterally into the cheek.
        if (v.x > 0.35) v.x = 0.35 + 0.3 * (v.x - 0.35);
        v.y -= 0.18 * smoothstep(0.2, -1, v.y);
        v.z *= 1 - 0.12 * smoothstep(0, -1, v.y);
      },
    }),
    [-MEDIAL * 1.34, -0.3, 0.05],
    '#bcd9dd',
    wallMaterial
  );

  // The opening, drawn as the short passage it is. It leaves the sinus near the
  // **top** of its medial wall and enters the middle meatus: the sinus drains
  // uphill, which is the single fact this scene is built to make visible.
  cord(
    'maxillary-ostium',
    [
      [-MEDIAL * 1.08, 0.06, 0.16],
      [-MEDIAL * 0.78, 0.09, 0.18],
      [-MEDIAL * 0.62, 0.11, 0.2],
    ],
    0.055,
    '#7fb2c4'
  );

  // The frontal sinus, in the bone of the forehead above the root of the nose.
  solid(
    'frontal-sinus',
    shapedSphere({
      detail: 4,
      scale: [0.3, 0.26, 0.2],
      warp: (v) => {
        v.y += 0.2 * smoothstep(0, 1, v.y);
        v.x *= 1 + 0.25 * smoothstep(0.2, 1, Math.abs(v.y));
      },
    }),
    [-MEDIAL * 0.34, 1.24, 0.46],
    '#c8dfe2',
    wallMaterial
  );

  // The ethmoid: not one room but a honeycomb of small ones, between the cavity
  // and the orbit. Several meshes, one structure — because that is what it is.
  const ethmoidCells = [];
  // Every cell is **lateral to the lateral wall** — between the cavity and the
  // orbit, which is where the ethmoid is. A cell drawn medial to that wall
  // would be sitting in the airway.
  const cellSites = [
    [-1.02, 0.62, 0.44],
    [-1.22, 0.8, 0.18],
    [-1.06, 0.58, -0.12],
    [-1.24, 0.82, -0.38],
    [-1.04, 0.64, -0.64],
    [-1.3, 0.58, 0.02],
  ];
  cellSites.forEach(([x, y, z], i) => {
    const geometry = shapedSphere({ detail: 3, scale: [0.15, 0.16, 0.17] });
    const built = wallMaterial({ color: colors['ethmoid-air-cells'] ?? '#d3e4df' });
    disposables.push(geometry, built);
    const mesh = new THREE.Mesh(geometry, built);
    mesh.position.set(MEDIAL * x, y, z);
    mesh.name = `ethmoid-air-cells-${i}`;
    object.add(mesh);
    ethmoidCells.push(mesh);
  });

  // The sphenoid, behind everything, under the pituitary.
  solid(
    'sphenoid-sinus',
    shapedSphere({
      detail: 4,
      scale: [0.32, 0.34, 0.3],
      warp: (v) => {
        v.z *= 1 - 0.2 * smoothstep(0, 1, v.y);
      },
    }),
    [-MEDIAL * 0.34, 0.6, -1.56],
    '#cfd9ea',
    wallMaterial
  );

  // --- what else opens into the cavity --------------------------------------
  //
  // The tear duct, from the corner of the eye down to the lowest gutter. It is
  // the reason a cry runs into the nose.
  cord(
    'nasolacrimal-duct',
    [
      [-MEDIAL * 0.66, 0.8, 0.84],
      [-MEDIAL * 0.62, 0.36, 0.76],
      [-MEDIAL * 0.57, -0.1, 0.68],
      [-MEDIAL * 0.55, -0.45, 0.62],
    ],
    0.055,
    '#9fc7b0'
  );

  // The olfactory region: a patch of the roof and the top of the septum, with
  // the nerve filaments that leave it through the bone above.
  const olfactoryParts = [];
  const patch = warpGeometry(new THREE.BoxGeometry(1, 1, 1, 14, 1, 18), (v) => {
    const x = lerp(-MEDIAL * 0.04, -MEDIAL * 0.56, v.x + 0.5);
    const z = lerp(0.2, -0.78, v.z + 0.5);
    v.x = x;
    v.z = z;
    v.y = (v.y > 0 ? 0.97 : 0.9) - 0.05 * smoothstep(0.2, 0.56, Math.abs(x));
  });
  const patchMaterial = mucosaMaterial({ color: colors['olfactory-region'] ?? '#d8b6d6' });
  disposables.push(patch, patchMaterial);
  const patchMesh = new THREE.Mesh(patch, patchMaterial);
  patchMesh.name = 'olfactory-region';
  object.add(patchMesh);
  olfactoryParts.push(patchMesh);
  index.set('olfactory-region', patchMesh);

  for (let i = 0; i < 4; i += 1) {
    const z = lerp(0.04, -0.56, i / 3);
    const x = -MEDIAL * (0.14 + 0.06 * (i % 2));
    const surface = new TubeSurface(
      smoothCurve([
        [x, 0.93, z],
        [x, 1.02, z + 0.01],
        [x * 0.82, 1.12, z + 0.02],
      ]),
      { radius: () => 0.018, steps: 12, radial: 8 }
    );
    const built = mucosaMaterial({ color: colors['olfactory-region'] ?? '#d8b6d6' });
    disposables.push(surface, built);
    const filament = new THREE.Mesh(surface.geometry, built);
    filament.name = `olfactory-region-filament-${i}`;
    object.add(filament);
    olfactoryParts.push(filament);
  }

  // Where the cavity goes: backwards and down, into the top of the throat. It
  // is shared by both sides, so it is drawn across the midline.
  solid(
    'nasopharynx',
    gutterGeometry({
      x0: 0.78,
      x1: -MEDIAL * 0.82,
      z0: CAVITY.choana + 0.06,
      z1: -2.46,
      top: () => 0.56,
      bottom: () => CAVITY.floor,
      nx: 14,
      nz: 14,
    }),
    null,
    '#c3bedd',
    wallMaterial
  );

  return {
    object,
    mesh: (id) => index.get(id) ?? null,
    /** `SITES`, as points, for anything that has to measure against them. */
    anchorPoints: Object.fromEntries(
      Object.entries(SITES).map(([key, point]) => [key, new THREE.Vector3(...point)])
    ),
    ethmoidCells,
    olfactoryParts,
    dispose: () => {
      for (const item of disposables) item.dispose?.();
    },
  };
}
