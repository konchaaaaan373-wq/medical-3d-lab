import * as THREE from 'three';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, flattenTube, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The spine: four regions, and one segment worth looking at closely.
 *
 * A spine is thirty-three bones and almost nobody needs all of them named.
 * What people need is **which region** — because a neck, a chest and a low back
 * do different jobs and fail in different ways — and **what one segment is made
 * of**, because that is where a disc, a facet and a nerve root live.
 *
 * So the column is drawn whole, in four regions, with **one lumbar level drawn
 * properly** and the rest as the blocks they are. The detailed level is part of
 * the column, in its place, at the same scale: it is not lifted out, and the
 * reader reaches it by moving the camera.
 *
 * ## The curves are the point
 *
 * A spine is not a stick. Neck forward, chest back, low back forward — and the
 * regions are built from one `spineAt` curve, so the column bends once rather
 * than three times in three places that happen to line up.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No height, width, angle or curve
 * here is a measurement**, and nothing moves or bends.
 */

/** `+z` is forward. `+x` is the patient's left. */
export const FORWARD = 1;

/**
 * Which level is drawn in full.
 *
 * A lumbar one, because that is where a disc, a facet joint and a nerve root
 * are asked about most — and because below the first lumbar level the thing in
 * the canal is the cauda equina rather than the cord, which is worth showing.
 */
export const DETAILED_LEVEL = Object.freeze({ region: 'lumbar', index: 2 });

/** Where each region sits, and how many levels it has. */
export const REGIONS = Object.freeze([
  { id: 'cervical', count: 7, top: 4.5, bottom: 3.0, lean: FORWARD * 0.34, size: 0.23 },
  { id: 'thoracic', count: 12, top: 2.8, bottom: 0.0, lean: -FORWARD * 0.3, size: 0.3 },
  { id: 'lumbar', count: 5, top: -0.25, bottom: -1.85, lean: FORWARD * 0.42, size: 0.4 },
]);

/** The bottom of the cord, and the top of what replaces it. */
export const CORD_ENDS_AT = -0.35;

/**
 * The line the column follows. One curve, so the four regions are one spine.
 *
 * @param {number} y height up the column
 * @returns {number} how far forward the centre of a body at that height sits
 */
export function spineAt(y) {
  let lean = 0;
  for (const region of REGIONS) {
    const inside = smoothstep(region.bottom - 0.5, region.bottom + 0.2, y) * smoothstep(region.top + 0.5, region.top - 0.2, y);
    lean += region.lean * inside;
  }
  return lean;
}

/** How wide a body is at that height: a spine carries more as it goes down. */
export function bodySizeAt(y) {
  let size = 0.23;
  for (const region of REGIONS) {
    const inside = smoothstep(region.bottom - 0.4, region.bottom + 0.2, y) * smoothstep(region.top + 0.4, region.top - 0.2, y);
    size = Math.max(size, region.size * inside);
  }
  return Math.max(0.22, size);
}

/** The y of one level in a region. */
export function levelHeight(region, index) {
  const step = (region.top - region.bottom) / Math.max(1, region.count - 1);
  return region.top - step * index;
}

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildSpine({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'spine';
  const disposables = [];
  const index = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  const solid = (id, geometry, position, color, material = mineralMaterial, extra = {}) => {
    const built = material({ color: colors[id] ?? color, ...extra });
    disposables.push(geometry, built);
    const mesh = add(id, new THREE.Mesh(geometry, built));
    if (position) mesh.position.set(...position);
    return mesh;
  };

  const cord = (id, points, radius, color, { material = wallMaterial, radial = 12, steps = 40, flatten = 1, axis = 'x' } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    if (flatten !== 1) flattenTube(surface, axis, flatten);
    const built = material({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };

  /** One vertebra as a block: a body in front and a spine sticking out behind. */
  const blockGeometry = (size) =>
    shapedSphere({
      detail: 4,
      scale: [size, size * 0.52, size * 0.9],
      warp: (v) => {
        // Square it up: a vertebral body is a drum, not a ball.
        const r = Math.hypot(v.x, v.z);
        if (r > 1e-6) {
          const spread = Math.pow(r, 0.6) / r;
          v.x *= spread;
          v.z *= spread;
        }
        // The spinous process behind, pointing down and back.
        const behind = smoothstep(-0.5, -1, v.z);
        v.z -= 1.5 * behind;
        v.y -= 0.5 * behind;
      },
    });

  // --- the column, region by region ----------------------------------------
  const regionMeshes = {};
  for (const region of REGIONS) {
    const material = mineralMaterial({ color: colors[`${region.id}-spine`] ?? '#e6e0cd', roughness: 0.68 });
    disposables.push(material);
    const meshes = [];
    for (let i = 0; i < region.count; i += 1) {
      // The level drawn in full is left out of its region's blocks: two
      // versions of one vertebra in the same place is one vertebra too many.
      if (region.id === DETAILED_LEVEL.region && i === DETAILED_LEVEL.index) continue;
      const y = levelHeight(region, i);
      const geometry = blockGeometry(bodySizeAt(y));
      disposables.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, y, spineAt(y));
      mesh.name = `${region.id}-${i + 1}`;
      object.add(mesh);
      meshes.push(mesh);
    }
    regionMeshes[region.id] = meshes;
    index.set(`${region.id}-spine`, meshes[0]);
  }

  // The sacrum: one wedge, because that is what it is — five bones fused into
  // one, and nobody counts them.
  solid(
    'sacrum',
    shapedSphere({
      detail: 5,
      scale: [0.58, 0.78, 0.34],
      warp: (v) => {
        // Narrowing downwards to a point, and curved forward at the bottom.
        v.x *= 1 - 0.62 * smoothstep(0.2, -1, v.y);
        v.z += FORWARD * 0.5 * smoothstep(0.1, -1, v.y);
      },
    }),
    [0, -2.66, FORWARD * 0.1],
    '#ded7c0'
  );

  // --- one level, drawn properly -------------------------------------------
  const region = REGIONS.find((r) => r.id === DETAILED_LEVEL.region);
  const levelY = levelHeight(region, DETAILED_LEVEL.index);
  const levelZ = spineAt(levelY);
  const size = bodySizeAt(levelY);
  const step = (region.top - region.bottom) / (region.count - 1);

  /** Everything about the detailed level is placed from here. */
  const SEGMENT = Object.freeze({
    body: [0, levelY, levelZ],
    canal: [0, levelY, levelZ - size * 1.7],
    spinous: [0, levelY - size * 0.4, levelZ - size * 2.2],
    // Below the body, not inside it: half the body plus half the disc.
    discBelow: [0, levelY - size * 0.7, spineAt(levelY - size * 0.7)],
  });

  solid(
    'vertebral-body',
    shapedSphere({
      detail: 5,
      scale: [size * 1.02, size * 0.5, size * 0.92],
      warp: (v) => {
        const r = Math.hypot(v.x, v.z);
        if (r > 1e-6) {
          const spread = Math.pow(r, 0.55) / r;
          v.x *= spread;
          v.z *= spread;
        }
        // Waisted at the sides, which is what a body looks like from in front.
        v.x *= 1 - 0.12 * Math.exp(-Math.pow(v.y / 0.5, 2));
      },
    }),
    SEGMENT.body,
    '#e8c98a'
  );

  // Pedicles: the two short struts from the back of the body to the arch. They
  // are the only way from the body to everything behind it, which is why a
  // screw goes through one.
  const pedicleMeshes = [];
  const laminaMeshes = [];
  const facetMeshes = [];
  const pedicleMaterial = mineralMaterial({ color: colors.pedicle ?? '#c98f4e', roughness: 0.68 });
  const laminaMaterial = mineralMaterial({ color: colors.lamina ?? '#a8c46a', roughness: 0.68 });
  const facetMaterial = mineralMaterial({ color: colors['facet-joint'] ?? '#6aa8c4', roughness: 0.5 });
  disposables.push(pedicleMaterial, laminaMaterial, facetMaterial);

  for (const side of [1, -1]) {
    const pedicle = new TubeSurface(
      smoothCurve([
        [side * size * 0.55, levelY, levelZ - size * 0.55],
        [side * size * 0.72, levelY, levelZ - size * 0.95],
        [side * size * 0.8, levelY, levelZ - size * 1.25],
      ]),
      { radius: () => size * 0.2, steps: 12, radial: 10 }
    );
    disposables.push(pedicle);
    const pedicleMesh = new THREE.Mesh(pedicle.geometry, pedicleMaterial);
    pedicleMesh.name = `pedicle-${side > 0 ? 'left' : 'right'}`;
    object.add(pedicleMesh);
    pedicleMeshes.push(pedicleMesh);

    // Laminae: the two plates that close the arch behind, meeting at the
    // spinous process. Cut them and the canal is open — which is what a
    // decompression is.
    const lamina = new TubeSurface(
      smoothCurve([
        [side * size * 0.8, levelY, levelZ - size * 1.3],
        [side * size * 0.6, levelY - size * 0.16, levelZ - size * 1.8],
        [side * size * 0.16, levelY - size * 0.34, levelZ - size * 2.1],
      ]),
      { radius: () => size * 0.17, steps: 14, radial: 10 }
    );
    flattenTube(lamina, 'y', 0.6);
    disposables.push(lamina);
    const laminaMesh = new THREE.Mesh(lamina.geometry, laminaMaterial);
    laminaMesh.name = `lamina-${side > 0 ? 'left' : 'right'}`;
    object.add(laminaMesh);
    laminaMeshes.push(laminaMesh);

    // The facet joints: the two small joints that decide which way a level can
    // move, one above and one below on each side.
    for (const up of [1, -1]) {
      const geometry = shapedSphere({ detail: 3, scale: [size * 0.2, size * 0.22, size * 0.16] });
      disposables.push(geometry);
      const facet = new THREE.Mesh(geometry, facetMaterial);
      facet.position.set(side * size * 0.82, levelY + up * size * 0.5, levelZ - size * 1.32);
      facet.name = `facet-${side > 0 ? 'left' : 'right'}-${up > 0 ? 'superior' : 'inferior'}`;
      object.add(facet);
      facetMeshes.push(facet);
    }
  }
  index.set('pedicle', pedicleMeshes[0]);
  index.set('lamina', laminaMeshes[0]);
  index.set('facet-joint', facetMeshes[0]);

  solid(
    'spinous-process',
    shapedSphere({
      detail: 4,
      scale: [size * 0.14, size * 0.4, size * 0.6],
      warp: (v) => {
        v.z -= 0.6 * smoothstep(-0.2, -1, v.z);
      },
    }),
    SEGMENT.spinous,
    '#8fbf96'
  );

  // --- the disc -------------------------------------------------------------
  //
  // Two structures, because they are two tissues and the difference between
  // them is the difference between a bulge and a rupture.
  solid(
    'annulus-fibrosus',
    shapedSphere({
      detail: 5,
      scale: [size * 1.0, size * 0.2, size * 0.9],
      warp: (v) => {
        const r = Math.hypot(v.x, v.z);
        if (r > 1e-6) {
          const spread = Math.pow(r, 0.55) / r;
          v.x *= spread;
          v.z *= spread;
        }
      },
    }),
    SEGMENT.discBelow,
    '#d88f7a'
  );
  solid(
    'nucleus-pulposus',
    shapedSphere({ detail: 4, scale: [size * 0.42, size * 0.13, size * 0.4] }),
    [SEGMENT.discBelow[0], SEGMENT.discBelow[1], SEGMENT.discBelow[2] - size * 0.1],
    '#f0dfa8',
    tissueMaterial
  );

  // --- what is in the canal -------------------------------------------------
  //
  // The canal is a space, drawn as a body because a space cannot otherwise be
  // pointed at. It runs the whole column, not just the detailed level.
  const canalPoints = [];
  for (let i = 0; i <= 40; i += 1) {
    const y = 4.6 - (i / 40) * 7.0;
    // Behind the bodies rather than through them: the canal is the space the
    // arch encloses, and a canal drawn inside the body it is behind is a hole.
    canalPoints.push([0, y, spineAt(y) - bodySizeAt(y) * 1.7]);
  }
  cord('spinal-canal', canalPoints, (u) => 0.2 + 0.06 * u, '#bcd8e0', {
    material: tissueMaterial,
    radial: 14,
    steps: 60,
  });

  // The cord stops well above the bottom of the column. Below it the canal
  // holds a bundle of roots instead — which is why a needle low down is a
  // different proposition from a needle high up.
  const cordPoints = canalPoints.filter((point) => point[1] >= CORD_ENDS_AT);
  cord('spinal-cord', cordPoints, (u) => 0.115 - 0.03 * smoothstep(0.8, 1, u), '#e8d8b0', {
    material: mucosaMaterial,
    radial: 12,
    steps: 48,
  });
  const caudaPoints = canalPoints.filter((point) => point[1] <= CORD_ENDS_AT + 0.2);
  const caudaMeshes = [];
  const caudaMaterial = mucosaMaterial({ color: colors['cauda-equina'] ?? '#e0c07a' });
  disposables.push(caudaMaterial);
  for (let i = 0; i < 6; i += 1) {
    const offset = ((i - 2.5) / 2.5) * 0.09;
    const surface = new TubeSurface(
      smoothCurve(caudaPoints.map(([x, y, z], j) => [x + offset * (1 - j / caudaPoints.length), y, z + offset * 0.5])),
      { radius: () => 0.022, steps: 36, radial: 6 }
    );
    disposables.push(surface);
    const strand = new THREE.Mesh(surface.geometry, caudaMaterial);
    strand.name = `cauda-equina-${i}`;
    object.add(strand);
    caudaMeshes.push(strand);
  }
  index.set('cauda-equina', caudaMeshes[0]);

  // A pair of roots leaving at the detailed level, under its pedicles: the
  // thing a disc at that level is in a position to press on.
  const rootMeshes = [];
  const rootMaterial = mucosaMaterial({ color: colors['nerve-root'] ?? '#e8b45a' });
  disposables.push(rootMaterial);
  for (const side of [1, -1]) {
    const surface = new TubeSurface(
      smoothCurve([
        [0, levelY + size * 0.1, levelZ - size * 1.0],
        [side * size * 0.5, levelY - size * 0.1, levelZ - size * 1.05],
        [side * size * 1.1, levelY - size * 0.35, levelZ - size * 0.8],
        [side * size * 1.7, levelY - size * 0.6, levelZ - size * 0.4],
      ]),
      { radius: (u) => 0.05 - 0.012 * u, steps: 20, radial: 8 }
    );
    disposables.push(surface);
    const root = new THREE.Mesh(surface.geometry, rootMaterial);
    root.name = `nerve-root-${side > 0 ? 'left' : 'right'}`;
    object.add(root);
    rootMeshes.push(root);
  }
  index.set('nerve-root', rootMeshes[0]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    regionMeshes,
    pedicleMeshes,
    laminaMeshes,
    facetMeshes,
    caudaMeshes,
    rootMeshes,
    segment: SEGMENT,
    anchorPoints: {
      detailedBody: new THREE.Vector3(...SEGMENT.body),
      detailedDisc: new THREE.Vector3(...SEGMENT.discBelow),
      canalAtLevel: new THREE.Vector3(...SEGMENT.canal),
      conusMedullaris: new THREE.Vector3(0, CORD_ENDS_AT, spineAt(CORD_ENDS_AT)),
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
