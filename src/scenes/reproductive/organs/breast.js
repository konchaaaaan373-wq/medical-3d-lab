import * as THREE from 'three';
import { latheFromProfile, shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The breast: a gland on a chest wall, and where its drainage goes.
 *
 * Drawn for the three questions a breast is actually asked. **Which tissue** —
 * duct or lobule, because those are the two things disease is named after.
 * **How deep** — skin, fat, gland, then the muscle it sits on, because that is
 * what a hand or a needle passes through. And **where does it drain** — the
 * axilla, because that is where anything spreading in lymph turns up.
 *
 * The shape itself is deliberately plain. A breast modelled for its outline is
 * an illustration; what earns its place here is the arrangement inside it, and
 * the outline exists so the arrangement has somewhere to be.
 *
 * ## A right breast, from in front
 *
 * Screen-left is the patient's right (`docs/architecture-rules.md` rule 5), so
 * in a right breast **medial** — towards the sternum — is +x and the **axilla**
 * is at −x. `+z` is forward, out of the chest.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **No size, duct count or lobule count
 * here is a measurement**, and nothing moves or changes with the cycle.
 */

/** Which way medial is, in a right breast seen from in front. */
export const MEDIAL = 1;

/**
 * How many ducts and lobules are drawn.
 *
 * **Display counts.** A breast has fifteen to twenty duct systems and each ends
 * in dozens of lobules; drawing them all makes a thicket nobody can click. What
 * is drawn is enough to show that ducts converge on one place and that lobules
 * hang off their ends. **No count may be read off this model.**
 */
export const DISPLAY_COUNTS = Object.freeze({ ducts: 8, lobulesPerDuct: 2, coopers: 7 });

/** The points the scene and the pathology layer hang things on. */
export const SITES = Object.freeze({
  /** The tip of the nipple, where every duct system ends. */
  nipple: [0, 0, 1.42],
  /** The front of the muscle: the deep edge of everything above it. */
  chestWall: [0, 0, -0.2],
  /** The upper outer corner, where the gland runs towards the armpit. */
  axillaryTail: [-MEDIAL * 1.26, 0.86, 0.1],
  /** The node group that tail drains to. */
  axilla: [-MEDIAL * 2.1, 1.35, -0.05],
});

/**
 * @param {{ colors?: Record<string, string> }} [options]
 */
export function buildBreast({ colors = {} } = {}) {
  const object = new THREE.Group();
  object.name = 'breast';
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

  const cord = (id, points, radius, color, { material = wallMaterial, radial = 10, steps = 30 } = {}) => {
    const surface = new TubeSurface(smoothCurve(points), {
      radius: typeof radius === 'function' ? radius : () => radius,
      steps,
      radial,
    });
    const built = material({ color: colors[id] ?? color });
    disposables.push(surface, built);
    return add(id, new THREE.Mesh(surface.geometry, built));
  };

  /** The breast's own outline: a dome on the chest, running out to the axilla. */
  const domeWarp = (v) => {
    // Flatter against the chest and fuller in front.
    v.z = v.z * 0.9 + 0.3;
    // Heavier below than above, which is what a breast does.
    v.y -= 0.16 * smoothstep(0, -1, v.y);
    // Drawn out towards the armpit at the upper outer corner: the axillary
    // tail is part of the gland, not a separate lump beside it.
    const towardsAxilla = smoothstep(0.1, 1, -v.x * MEDIAL) * smoothstep(-0.1, 0.9, v.y);
    v.x -= MEDIAL * 0.42 * towardsAxilla;
    v.z -= 0.42 * towardsAxilla;
    // Flat at the back, because a breast sits *on* the chest wall rather than
    // in it. A dome left spherical reaches through the muscle behind it, which
    // would make "does it move with the muscle" an unanswerable question.
    if (v.z < -0.1) v.z = -0.1 + 0.05 * (v.z + 0.1);
  };

  // --- the chest wall it sits on -------------------------------------------
  //
  // Drawn first because it is the floor: everything else in this scene is in
  // front of it, and how much is in front of it is what a hand feels.
  solid(
    'pectoralis-major',
    shapedSphere({
      detail: 5,
      scale: [1.9, 1.9, 0.3],
      warp: (v) => {
        // A sheet, not a ball: flattened front and back, and squared off.
        const r = Math.hypot(v.x, v.y);
        if (r > 1e-6) {
          const spread = Math.pow(r, 0.6) / r;
          v.x *= spread;
          v.y *= spread;
        }
      },
    }),
    [-MEDIAL * 0.1, -0.05, -0.5],
    '#b4514a'
  );

  // --- the gland and what fills it -----------------------------------------
  solid(
    'adipose-tissue',
    shapedSphere({ detail: 6, scale: [1.24, 1.24, 1.08], warp: domeWarp }),
    null,
    '#f2e2ac',
    tissueMaterial,
    { roughness: 0.45 }
  );
  // The skin over it, as a shell: the breast is a thing you look at before it
  // is a thing you cut into.
  solid(
    'skin',
    shapedSphere({ detail: 6, scale: [1.3, 1.3, 1.14], warp: domeWarp }),
    null,
    '#e8c3a4',
    tissueMaterial,
    { roughness: 0.55 }
  );

  // Areola and nipple. The areola is where every duct system arrives, which is
  // why it is a place and not a colour.
  const areola = latheFromProfile(
    [
      [0.02, 0.0],
      [0.42, 0.02],
      [0.42, -0.04],
      [0.02, -0.04],
    ],
    { segments: 16, radial: 40 }
  );
  areola.rotateX(-Math.PI / 2);
  solid('areola', areola, [0, 0, 1.35], '#b06a5c', mucosaMaterial);
  solid(
    'nipple',
    shapedSphere({
      detail: 4,
      scale: [0.16, 0.16, 0.2],
      warp: (v) => {
        v.z += 0.35 * smoothstep(0.2, 1, v.z);
      },
    }),
    SITES.nipple,
    '#9c5a50',
    mucosaMaterial
  );

  // --- duct systems ---------------------------------------------------------
  //
  // Every duct ends at the nipple. That is the fact the whole of the gland's
  // arrangement follows from — and the reason a discharge is a duct's news.
  const ductMeshes = [];
  const lobuleMeshes = [];
  const ductMaterial = mucosaMaterial({ color: colors['lactiferous-ducts'] ?? '#7fb0c4' });
  const lobuleMaterial = mucosaMaterial({ color: colors.lobules ?? '#5d8fa8' });
  disposables.push(ductMaterial, lobuleMaterial);

  for (let i = 0; i < DISPLAY_COUNTS.ducts; i += 1) {
    const angle = (i / DISPLAY_COUNTS.ducts) * Math.PI * 2 + 0.3;
    // Kept inside the fat that contains the gland: a lobule outside the
    // compartment it lives in reads as a mistake, because it is one.
    const reach = 0.56 + (i % 3) * 0.1;
    const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    const tip = new THREE.Vector3(dir.x * reach, dir.y * reach, 0.22);
    const surface = new TubeSurface(
      smoothCurve([
        [0, 0, 1.3],
        [dir.x * 0.18, dir.y * 0.18, 1.06],
        [dir.x * reach * 0.6, dir.y * reach * 0.6, 0.72],
        tip.toArray(),
      ]),
      { radius: (u) => 0.05 + 0.035 * smoothstep(0.35, 0, u), steps: 26, radial: 8 }
    );
    disposables.push(surface);
    const duct = new THREE.Mesh(surface.geometry, ductMaterial);
    duct.name = `lactiferous-duct-${i}`;
    object.add(duct);
    ductMeshes.push(duct);

    // Lobules hang off the *far* end of a duct, never the near one. Which of
    // the two a lesion is in is the whole of what "ductal" and "lobular" mean.
    for (let j = 0; j < DISPLAY_COUNTS.lobulesPerDuct; j += 1) {
      const spread = (j - (DISPLAY_COUNTS.lobulesPerDuct - 1) / 2) * 0.26;
      const geometry = shapedSphere({
        detail: 3,
        scale: [0.15, 0.15, 0.13],
        warp: (v) => {
          const lobe = Math.sin(v.x * 6) * Math.sin(v.y * 6) * Math.sin(v.z * 6);
          v.multiplyScalar(1 + 0.24 * lobe);
        },
      });
      disposables.push(geometry);
      const lobule = new THREE.Mesh(geometry, lobuleMaterial);
      lobule.position.set(
        tip.x + dir.y * spread + dir.x * 0.14,
        tip.y - dir.x * spread + dir.y * 0.14,
        tip.z - 0.08
      );
      lobule.name = `lobule-${i}-${j}`;
      object.add(lobule);
      lobuleMeshes.push(lobule);
    }
  }
  index.set('lactiferous-ducts', ductMeshes[0]);
  index.set('lobules', lobuleMeshes[0]);

  // --- what holds it up -----------------------------------------------------
  //
  // Strands from the chest wall through the gland to the skin. They are why the
  // breast keeps its shape — and why something pulling on them dimples the skin
  // above it rather than staying out of sight.
  const cooperMeshes = [];
  const cooperMaterial = tissueMaterial({ color: colors['cooper-ligaments'] ?? '#e0d4b0', roughness: 0.6 });
  disposables.push(cooperMaterial);
  for (let i = 0; i < DISPLAY_COUNTS.coopers; i += 1) {
    const angle = (i / DISPLAY_COUNTS.coopers) * Math.PI * 2 + 0.9;
    const out = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    const surface = new TubeSurface(
      smoothCurve([
        [out.x * 0.55, out.y * 0.55, -0.2],
        [out.x * 0.85, out.y * 0.85, 0.35],
        [out.x * 1.02, out.y * 1.02, 0.82],
        [out.x * 1.06, out.y * 1.06, 1.02],
      ]),
      { radius: () => 0.035, steps: 20, radial: 6 }
    );
    disposables.push(surface);
    const strand = new THREE.Mesh(surface.geometry, cooperMaterial);
    strand.name = `cooper-ligament-${i}`;
    object.add(strand);
    cooperMeshes.push(strand);
  }
  index.set('cooper-ligaments', cooperMeshes[0]);

  // --- where it drains ------------------------------------------------------
  //
  // The tail of the gland runs towards the armpit, and most of the breast
  // drains that way. That is why the axilla is examined at all.
  cord(
    'axillary-tail',
    [
      [-MEDIAL * 0.78, 0.62, 0.34],
      [...SITES.axillaryTail],
      [-MEDIAL * 1.62, 1.1, -0.02],
    ],
    (u) => 0.24 - 0.1 * u,
    '#f2e2ac',
    { material: tissueMaterial, radial: 12, steps: 24 }
  );

  const nodeMeshes = [];
  const nodeMaterial = mucosaMaterial({ color: colors['axillary-nodes'] ?? '#c46a5a' });
  disposables.push(nodeMaterial);
  for (let i = 0; i < 7; i += 1) {
    const geometry = shapedSphere({ detail: 3, scale: [0.15, 0.11, 0.11] });
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, nodeMaterial);
    const t = i / 6;
    mesh.position.set(
      SITES.axilla[0] - MEDIAL * (t * 0.5 - 0.18),
      SITES.axilla[1] + Math.sin(i * 2.1) * 0.34 + t * 0.36,
      SITES.axilla[2] + Math.cos(i * 1.7) * 0.22
    );
    mesh.rotation.set(i * 0.7, i * 1.3, 0);
    mesh.name = `axillary-node-${i}`;
    object.add(mesh);
    nodeMeshes.push(mesh);
  }
  index.set('axillary-nodes', nodeMeshes[0]);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    ductMeshes,
    lobuleMeshes,
    cooperMeshes,
    nodeMeshes,
    anchorPoints: Object.fromEntries(Object.keys(SITES).map((key) => [key, new THREE.Vector3(...SITES[key])])),
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
