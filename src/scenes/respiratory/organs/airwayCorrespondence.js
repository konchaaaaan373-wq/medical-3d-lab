import { ANATOMICAL_AXES } from '../../cardiovascular/scenes/heartFailure/anatomy.js';
import { SIDES } from './lungAnatomy.js';

/**
 * Where the asthma model's tree and the anatomical bronchial tree agree, and
 * where they stop.
 *
 * There are two airway trees in this repository and they are different kinds of
 * object. `airwayTree.js` builds the one the asthma model solves: a symmetric
 * dichotomous tree in heap order, eight generations, every branch a fixed ratio
 * of its parent — a *network*, whose point is that resistance and ventilation
 * can be computed over it. `lungs.js` builds the anatomical one: trachea, two
 * main bronchi, five lobar, eighteen segmental, each with the name a person
 * uses for it.
 *
 * `docs/anatomy-specs.md` §1 A2 asks for the correspondence between them to be
 * written in one place, so the model's branches and the geometry's cannot drift
 * apart. This is that place. What it mostly records is **where the two cannot
 * correspond**, because that is the part somebody will otherwise assume.
 *
 * ## The trap this exists for
 *
 * The heap's `leftChild(0)` is index 1, and index 1 is the patient's **right**
 * lung. `leftChild` is heap terminology — the left slot of a binary node — and
 * carries no anatomy at all. Measured on the built tree, index 1's leaves have
 * a mean x of −2.10 and `SIDES.right.lateralX` is −1, so the branch a reader
 * would call "the left one" supplies the right lung.
 *
 * Nothing was wrong when this was written down; the point is that nothing in
 * either file said so, and the two derived side independently. Architecture
 * rule 5: a scene's anatomical axes are defined once and left/right is read
 * from them, never guessed from a sign.
 */

/**
 * The named anatomical branch each heap index stands for.
 *
 * Only generations 0 and 1. Beyond that a symmetric binary tree and a lung do
 * not have the same number of branches, and pretending otherwise is what this
 * file exists to prevent — see `WHERE_THE_CORRESPONDENCE_ENDS`.
 */
export const NAMED_BRANCHES = Object.freeze({
  0: 'trachea',
  1: 'right-main-bronchus',
  2: 'left-main-bronchus',
});

/**
 * Why the mapping stops at generation 1, in the numbers that make it stop.
 *
 * A symmetric dichotomous tree has 2^g branches at generation g. A lung has
 * the count anatomy gave it, which is not a power of two at any level below the
 * main bronchi. There is no assignment to argue about — the sets are different
 * sizes.
 */
export const WHERE_THE_CORRESPONDENCE_ENDS = Object.freeze({
  generation: 2,
  modelBranchesAtThatGeneration: 4,
  /** Right upper, middle and lower; left upper and lower. */
  anatomicalBranchesAtThatGeneration: 5,
  atGenerationThree: Object.freeze({ model: 8, anatomical: 18 }),
  note:
    'Below the main bronchi the two trees have different branch counts, so no ' +
    'index-to-name mapping exists. What still corresponds is the side, which ' +
    '`sideOfModelBranch` answers for every index.',
});

/** The generation-1 heap index that supplies each lung. */
export const MAIN_BRONCHUS_INDEX = Object.freeze({ right: 1, left: 2 });

/**
 * Which lung a model branch is in, for any heap index.
 *
 * This much *does* correspond all the way down, and it is the part the asthma
 * scene needs: heterogeneity between the two lungs is a thing the model
 * computes and the geometry has to draw on the correct side.
 *
 * Walks up to the generation-1 ancestor rather than doing arithmetic on the
 * index, because the walk is obviously right and the arithmetic is the kind of
 * thing that is off by one for half a tree.
 *
 * @param {number} index heap index, 0-based
 * @returns {'right' | 'left' | null} null for the trachea, which is neither
 */
export function sideOfModelBranch(index) {
  if (!Number.isInteger(index) || index < 0) return null;
  let node = index;
  while (node > 2) node = Math.floor((node - 1) / 2);
  if (node === 0) return null;
  return node === MAIN_BRONCHUS_INDEX.right ? 'right' : 'left';
}

/**
 * Which way the model's tree sends a branch, from the anatomical axes.
 *
 * The sign the geometry actually uses, derived rather than typed: the patient's
 * right is `-x` because `SIDES.right.lateralX` says so and `ANATOMICAL_AXES`
 * says which way `+x` points. A test measures the built tree against this, so
 * flipping a spread sign or swapping a rotation axis in `airwayTree.js` fails
 * rather than quietly mirroring the lungs.
 *
 * @param {'right' | 'left'} side
 * @returns {number} the sign of x that side lies on
 */
export function lateralSignFor(side) {
  const lateral = SIDES[side]?.lateralX;
  if (lateral === undefined) throw new Error(`Unknown side "${side}"`);
  // `+x` is the patient's left in this repository's axes, and a side's
  // `lateralX` points away from the midline, so the two agree by construction.
  return Math.sign(lateral * ANATOMICAL_AXES.left.x);
}
