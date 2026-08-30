import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * A branching airway tree, laid out in three dimensions.
 *
 * PROTOTYPE-GRADE ANATOMY, PRODUCTION-GRADE STRUCTURE. What is right here is
 * the *structure*: a symmetric dichotomous tree in which every branch is
 * shorter and narrower than its parent by a fixed ratio, laid out so that the
 * two halves fill the two lungs and the branching plane rotates at each
 * generation the way a real tree's does. What is not right is any particular
 * airway: the angles are chosen so the tree reads clearly rather than measured,
 * real branching is markedly asymmetric, and a lung has twenty-three
 * generations where this has eight.
 *
 * The builder knows nothing about asthma. It is handed a tree — how many
 * generations, and how each branch relates to its parent — and it produces
 * geometry with a rewritable calibre per branch and a mount at every leaf.
 * What narrows an airway and why is the scene's business.
 *
 * Only the first few generations are drawn as tubes. Beyond that the airways
 * are smaller than a pixel and there are a hundred of them; what matters
 * further out is *where the air ended up*, and that is what the leaf mounts
 * are for.
 */

/** Heap order, matching the model's. */
const leftChild = (index) => 2 * index + 1;
const rightChild = (index) => 2 * index + 2;
const generationOf = (index) => Math.floor(Math.log2(index + 1));

/**
 * @param {{ generations: number, drawnGenerations?: number, homothety?: number,
 *           color?: string, radius?: number, length?: number,
 *           spread?: number, drop?: number }} options
 */
export function buildAirwayTree({
  generations,
  drawnGenerations = 5,
  homothety = 2 ** (-1 / 3),
  color = '#9fb0c8',
  /** Radius of the trachea, in scene units. */
  radius = 0.17,
  /** Length of the trachea, in scene units. */
  length = 1.3,
  /** Half-angle between two sister branches, radians. */
  spread = 0.85,
  /**
   * How much of each branch's direction is inherited from its parent.
   *
   * Low, so the tree opens into a rounded crown rather than hanging as a
   * fringe below the carina. A lung is a volume the airways fill, and a tree
   * whose leaves all end up in a horizontal band does not read as one.
   */
  drop = 0.25,
} = {}) {
  const object = new THREE.Group();
  object.name = 'airway-tree';

  const branchCount = 2 ** generations - 1;
  const leafCount = 2 ** (generations - 1);
  const firstLeaf = leafCount - 1;

  /**
   * Where each branch starts, where it ends, and how wide it was built.
   *
   * Laid out once. The scene rewrites calibres every time the model is
   * re-solved; it never moves an airway, because an airway that narrows does
   * not also relocate.
   */
  const nodes = new Array(branchCount);
  nodes[0] = {
    start: new THREE.Vector3(0, 2.5, 0),
    end: new THREE.Vector3(0, 2.5 - length, 0),
    direction: new THREE.Vector3(0, -1, 0),
    radius,
  };

  for (let index = 0; index < branchCount; index++) {
    const parent = nodes[index];
    const generation = generationOf(index);
    if (generation === generations - 1) continue;

    // The plane a bifurcation opens into rotates from one generation to the
    // next — otherwise the whole tree is flat and the far half of it hides
    // behind the near half. A quarter turn each time is the usual
    // simplification and it is what makes the tree readable in three
    // dimensions rather than two.
    const axis = generation % 2 === 0 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    const childLength = length * homothety ** (generation + 1);
    const childRadius = radius * homothety ** (generation + 1);

    for (const [child, sign] of [
      [leftChild(index), -1],
      [rightChild(index), 1],
    ]) {
      // Part the parent's heading, part the new direction: a real airway
      // does not turn a right angle at every division, and a tree built as
      // if it did fills a sphere instead of a lung.
      const turned = parent.direction
        .clone()
        .applyAxisAngle(axis, sign * spread)
        .normalize();
      const direction = parent.direction
        .clone()
        .multiplyScalar(drop)
        .addScaledVector(turned, 1 - drop)
        .normalize();
      const start = parent.end.clone();
      nodes[child] = {
        start,
        end: start.clone().addScaledVector(direction, childLength),
        direction,
        radius: childRadius,
      };
    }
  }

  // The drawn part of the tree: one rewritable tube per branch, out to
  // `drawnGenerations`.
  const material = tissueMaterial({ color, roughness: 0.45, emissiveIntensity: 0.06 });
  const surfaces = [];
  for (let index = 0; index < branchCount; index++) {
    if (generationOf(index) >= drawnGenerations) continue;
    const node = nodes[index];
    // Slightly curved rather than a straight rod: a chain of straight
    // cylinders reads as a diagram of a tree, not as a tree.
    const middle = node.start.clone().lerp(node.end, 0.5).addScaledVector(node.direction, 0.02);
    const curve = smoothCurve([
      [node.start.x, node.start.y, node.start.z],
      [middle.x, middle.y, middle.z],
      [node.end.x, node.end.y, node.end.z],
    ]);
    // Tapered from the parent's calibre to its own, so a division reads as a
    // division rather than as a step change in pipe diameter.
    const parentRadius = index === 0 ? node.radius : nodes[Math.floor((index - 1) / 2)].radius;
    const surface = new TubeSurface(curve, {
      radius: (u) => parentRadius + (node.radius - parentRadius) * Math.min(1, u * 1.6),
      steps: 14,
      radial: generationOf(index) < 3 ? 14 : 9,
    });
    object.add(new THREE.Mesh(surface.geometry, material));
    surfaces.push({ index, surface, baseRadius: node.radius });
  }

  return {
    object,
    material,
    /** Where every terminal branch ends: one point per ventilation unit. */
    leafPositions: Array.from({ length: leafCount }, (_, unit) => nodes[firstLeaf + unit].end.clone()),
    /** Every branch's midpoint, for anything that has to point at one. */
    midpointOf: (index) => nodes[index].start.clone().lerp(nodes[index].end, 0.5),
    anchors: {
      trachea: new THREE.Vector3(0.5, 2.4, 0.4),
      carina: new THREE.Vector3(0, 2.5 - length, 0.5),
    },
    /**
     * Redraws the calibre of every drawn branch.
     *
     * @param {(index: number) => number} openFraction 1 = fully open
     */
    setCalibres(openFraction) {
      for (const entry of surfaces) {
        const open = Math.max(0.08, Math.min(1, openFraction(entry.index)));
        entry.surface.refresh((u, base) => base * open);
      }
    },
    dispose() {
      for (const entry of surfaces) entry.surface.dispose();
      material.dispose();
    },
  };
}
