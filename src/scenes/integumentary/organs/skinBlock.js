import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * Skin, as a block cut out of somebody.
 *
 * Every other organ in this repository is a thing with a shape. Skin is not: it
 * is a **sheet with a thickness**, and the only useful way to point at its parts
 * is to take a piece and look at the cut. So this is a specimen, and the section
 * is not a viewpoint — it is what the model *is*. Nothing has to be cut away to
 * see inside it, because the sides are already open.
 *
 * ## The one thing worth getting right
 *
 * The join between epidermis and dermis is **not flat**. It interlocks, in
 * ridges and pegs, and that is why skin does not shear off when it is rubbed —
 * and why a blister, which separates exactly there, is a thing that happens.
 * Both layers are built from one `reteWave`, so the two surfaces are the same
 * surface and cannot drift apart.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No thickness here is a
 * measurement**, and the layers are deliberately not to scale: see
 * `LAYER_DISPLAY_THICKNESS`.
 */

/**
 * Where each layer's floor is drawn.
 *
 * **Display values, and deliberately not to scale.** In life the epidermis is
 * about a tenth of a millimetre and the dermis about two — twenty times
 * thicker — so at scale the epidermis is a line, and a line cannot carry the
 * three things a reader needs to see in it. It is drawn at about a quarter of
 * the dermis instead. **No thickness or ratio may be read off this model.**
 */
export const LAYER_DISPLAY_THICKNESS = Object.freeze({
  surface: 1.0,
  epidermisFloor: 0.78,
  dermisFloor: 0.06,
  subcutisFloor: -1.1,
});

/** The block's footprint. A specimen, not a body. */
export const BLOCK = Object.freeze({ width: 3.2, depth: 3.2 });

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** Where the hair leaves the surface. */
  follicleMouth: [-0.55, LAYER_DISPLAY_THICKNESS.surface, 0.35],
  /** The bulb at the bottom of the follicle, down in the fat. */
  follicleBulb: [-0.15, -0.55, 0.62],
  /** The coil of the sweat gland, deep in the dermis. */
  sweatCoil: [0.85, -0.18, -0.35],
  /** Where its duct opens, which is *not* on a hair. */
  sweatPore: [0.62, LAYER_DISPLAY_THICKNESS.surface, -0.62],
});

/**
 * The interlocking join between epidermis and dermis.
 *
 * Used by both layers, so the underside of one and the top of the other are the
 * same surface by construction rather than by two functions that happen to
 * agree (`docs/architecture-rules.md` rule 1).
 */
export const reteWave = (x, z) =>
  0.07 * Math.sin(x * 2.6) * Math.cos(z * 2.9) + 0.045 * Math.sin(x * 5.1 + 1.2) * Math.sin(z * 4.4);

/** The floor of the dermis, where it gives way to fat. A longer, softer wave. */
export const dermisFloorWave = (x, z) => 0.12 * Math.sin(x * 1.3 + 0.6) * Math.cos(z * 1.1 - 0.4);

/**
 * @param {{ colors?: Record<string, string>, opacity?: number }} [options]
 */
export function buildSkinBlock({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'skin-block';
  const disposables = [];
  const index = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  /**
   * A slab of the block, between two named surfaces.
   *
   * A box subdivided finely enough that its top and bottom can follow a wave,
   * with the sides left straight — a specimen has straight sides, because
   * somebody cut it.
   */
  const slab = (id, top, bottom, color, material = tissueMaterial, extra = {}) => {
    const geometry = new THREE.BoxGeometry(BLOCK.width, 1, BLOCK.depth, 48, 2, 48);
    const position = geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i);
      const upper = v.y > 0.01;
      const lower = v.y < -0.01;
      // The middle ring of vertices is left to interpolate, which is what keeps
      // the sides straight while the two faces move.
      const height = upper ? top(v.x, v.z) : lower ? bottom(v.x, v.z) : (top(v.x, v.z) + bottom(v.x, v.z)) / 2;
      position.setXYZ(i, v.x, height, v.z);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    return add(id, new THREE.Mesh(geometry, built));
  };

  const cord = (id, points, radius, color, { material = wallMaterial, radial = 12, steps = 40 } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    const built = material({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };

  const blob = (id, geometry, position, color, material = mucosaMaterial) => {
    const built = material({ color: colors[id] ?? color });
    disposables.push(geometry, built);
    const mesh = add(id, new THREE.Mesh(geometry, built));
    mesh.position.set(...position);
    return mesh;
  };

  const L = LAYER_DISPLAY_THICKNESS;
  const surface = (x, z) => L.surface + 0.02 * Math.sin(x * 7.3) * Math.sin(z * 6.1);
  const junction = (x, z) => L.epidermisFloor + reteWave(x, z);
  const fatLine = (x, z) => L.dermisFloor + dermisFloorWave(x, z);
  const floor = () => L.subcutisFloor;

  // --- the three layers -----------------------------------------------------
  slab('epidermis', surface, junction, '#e8c3a4');
  slab('dermis', junction, fatLine, '#d98b80');
  slab('subcutaneous-tissue', fatLine, floor, '#f0dfa8', tissueMaterial, { roughness: 0.6 });

  // The fat itself, as the lobules it comes in. Drawn inside the subcutis
  // rather than instead of it: one is the compartment, the other is what fills
  // it, and a reader should be able to point at either.
  const lobuleMeshes = [];
  const lobuleMaterial = tissueMaterial({ color: colors['adipose-tissue'] ?? '#f6e9b4', roughness: 0.35 });
  disposables.push(lobuleMaterial);
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 14; i += 1) {
    const geometry = shapedSphere({
      detail: 3,
      scale: [0.3 + random() * 0.16, 0.24 + random() * 0.12, 0.3 + random() * 0.16],
    });
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, lobuleMaterial);
    // Kept clear of the cut sides and of the floor: a lobule poking out of the
    // compartment it is in reads as a mistake, because it is one.
    mesh.position.set(
      (random() - 0.5) * (BLOCK.width - 1.5),
      -0.32 - random() * 0.36,
      (random() - 0.5) * (BLOCK.depth - 1.5)
    );
    mesh.name = `adipose-lobule-${i}`;
    object.add(mesh);
    lobuleMeshes.push(mesh);
  }
  index.set('adipose-tissue', lobuleMeshes[0]);

  // --- what goes down through it -------------------------------------------
  //
  // A hair follicle is a tube of epidermis that has grown down into the dermis
  // — which is why a follicle is lined with the same tissue as the surface, and
  // why what starts in one can spread into the other.
  const follicle = [
    [...SITES.follicleMouth],
    [-0.46, 0.62, 0.41],
    [-0.32, 0.16, 0.5],
    [-0.2, -0.26, 0.58],
    [...SITES.follicleBulb],
  ];
  cord('hair-follicle', follicle, (u) => 0.1 + 0.09 * smoothstep(0.72, 1, u), '#c9a07a', {
    material: mucosaMaterial,
    radial: 14,
    steps: 40,
  });
  // The shaft above the skin, drawn as part of the follicle's structure rather
  // than as a separate thing: it is what the follicle makes.
  const shaft = new TubeSurface(
    smoothCurve([
      [-0.55, L.surface - 0.05, 0.35],
      [-0.72, L.surface + 0.55, 0.2],
      [-0.95, L.surface + 1.0, 0.02],
    ]),
    { radius: () => 0.035, steps: 20, radial: 8 }
  );
  const shaftMaterial = wallMaterial({ color: colors['hair-follicle'] ?? '#6b5340' });
  disposables.push(shaft, shaftMaterial);
  const shaftMesh = new THREE.Mesh(shaft.geometry, shaftMaterial);
  shaftMesh.name = 'hair-shaft';
  object.add(shaftMesh);

  // The sebaceous gland opens into the follicle, not onto the skin. That is the
  // relation the whole of acne is about, and it is the reason it is drawn here
  // attached rather than nearby.
  blob(
    'sebaceous-gland',
    shapedSphere({
      detail: 3,
      scale: [0.22, 0.18, 0.2],
      warp: (v) => {
        // Lobulated, because a sebaceous gland is a cluster of sacs.
        const lobe = Math.sin(v.x * 5) * Math.sin(v.y * 5) * Math.sin(v.z * 5);
        v.multiplyScalar(1 + 0.16 * lobe);
      },
    }),
    [-0.62, 0.42, 0.66],
    '#e8d07a'
  );

  // The sweat gland is a coil deep down with a duct that spirals up and opens
  // **on the surface**, nowhere near a hair. Two different routes to the
  // outside, and confusing them is the commonest mistake about skin.
  blob(
    'sweat-gland',
    shapedSphere({
      detail: 4,
      scale: [0.26, 0.2, 0.26],
      warp: (v) => {
        const coil = Math.sin(v.x * 7 + v.z * 7) * Math.sin(v.y * 6);
        v.multiplyScalar(1 + 0.22 * coil);
      },
    }),
    SITES.sweatCoil,
    '#9fd0c4'
  );
  const duct = [];
  for (let i = 0; i <= 26; i += 1) {
    const t = i / 26;
    const angle = t * Math.PI * 3.2;
    const spread = 0.09 * (1 - t);
    duct.push([
      SITES.sweatCoil[0] + (SITES.sweatPore[0] - SITES.sweatCoil[0]) * t + Math.cos(angle) * spread,
      SITES.sweatCoil[1] + (SITES.sweatPore[1] - SITES.sweatCoil[1]) * t,
      SITES.sweatCoil[2] + (SITES.sweatPore[2] - SITES.sweatCoil[2]) * t + Math.sin(angle) * spread,
    ]);
  }
  const ductSurface = new TubeSurface(smoothCurve(duct), { radius: () => 0.045, steps: 40, radial: 8 });
  const ductMaterial = mucosaMaterial({ color: colors['sweat-gland'] ?? '#9fd0c4' });
  disposables.push(ductSurface, ductMaterial);
  const ductMesh = new THREE.Mesh(ductSurface.geometry, ductMaterial);
  ductMesh.name = 'sweat-duct';
  object.add(ductMesh);

  // --- what feeds it --------------------------------------------------------
  //
  // Two plexuses, one deep and one just under the epidermis, joined by vessels
  // that run up between them — and **stopping below the junction**, because the
  // epidermis has no vessels at all. It is fed by diffusion across that join,
  // which is why it can be peeled off and live; a vessel drawn a little too
  // high says the opposite.
  //
  // The two are drawn **apart across the block**, not one behind the other.
  // They were one course and a copy of it displaced 0.12 in both y and z, which
  // is a fair description of an arteriole and its companion venule and a
  // useless thing to look at: two tubes 0.12 across, 0.17 apart along very
  // nearly the direction every viewpoint here looks down. The artery came out
  // as a red rim behind the vein in all five, so one of two structures a reader
  // is invited to name could not be seen or clicked — which is the playbook's
  // rule that accuracy you cannot see is not accuracy. The spacing between them
  // is a display value like the layer thicknesses above: **no distance between
  // these two vessels may be read off this model**, only that they run together
  // and that the venous side lies deeper.
  const vessel = (id, [dy, dz], color) =>
    cord(
      id,
      [
        [-1.5, -0.2 + dy, -0.9 + dz],
        [-0.6, -0.12 + dy, -0.7 + dz],
        [0.1, 0.1 + dy, -0.55 + dz],
        [0.5, 0.44 + dy, -0.66 + dz],
        [1.0, 0.54 + dy, -0.8 + dz],
        [1.5, 0.48 + dy, -1.0 + dz],
      ],
      (u) => 0.06 - 0.02 * Math.sin(u * Math.PI),
      color,
      { radial: 10, steps: 40 }
    );
  vessel('arteriole', [0, 0], '#c2413c');
  vessel('venule', [-0.1, 0.34], '#5878a8');

  // A nerve, ending in the dermis just under the surface. Skin is an organ of
  // sense before it is anything else.
  cord(
    'sensory-nerve',
    [
      [1.5, -0.5, 0.9],
      [0.9, -0.3, 0.8],
      [0.35, 0.1, 0.72],
      [0.05, 0.5, 0.72],
      [-0.04, 0.7, 0.74],
    ],
    (u) => 0.05 + 0.03 * smoothstep(0.85, 1, u),
    '#e5d98a',
    { material: tissueMaterial, radial: 10, steps: 36 }
  );

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    /** One structure, many meshes: fat comes in lobules. */
    lobuleMeshes,
    /** The follicle is the tube and the hair it makes. */
    follicleMeshes: [index.get('hair-follicle'), shaftMesh],
    sweatMeshes: [index.get('sweat-gland'), ductMesh],
    anchorPoints: Object.fromEntries(Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
