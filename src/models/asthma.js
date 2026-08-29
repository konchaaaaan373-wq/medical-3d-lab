import { fixedPoint } from './integrate.js';
import { scatter } from './random.js';

/**
 * Asthma: heterogeneous bronchoconstriction and where the patchiness comes from.
 *
 * The question this model exists to answer: **why does a stimulus that reaches
 * the whole lung evenly produce ventilation that is anything but even?**
 *
 * The answer is not "because some airways are worse than others", although
 * some are. It is that airway narrowing is **self-reinforcing through the
 * lung around it**. An airway is held open partly by the pull of the
 * parenchyma attached to it, and how hard that parenchyma pulls depends on how
 * much it is being stretched — which depends on how much air is reaching it,
 * which depends on how narrow the airway is. Narrow slightly, ventilate
 * slightly less, be tethered slightly less, narrow further. Where the loop
 * closes, a small difference between two neighbouring airways stops being
 * small.
 *
 * That is the mechanism Venegas and colleagues put forward for the clustered
 * ventilation defects seen on PET in bronchoconstricted asthmatics
 * (*Nature* 434:777–82, 2005). The model here is a much smaller and cruder
 * relative of theirs; what it reproduces is the *shape* of the result —
 * uniform stimulus, non-uniform outcome, arriving suddenly rather than
 * gradually — and it does so because of the feedback, not because anything
 * tells it to.
 *
 * ## Deliberately not the COPD model
 *
 * Nothing is shared with `copd.js` and nothing should be. That model is about
 * a lung emptying in the time available; this one is about how a stimulus
 * distributes itself through a branching network. Sharing a lung model between
 * the two would have meant one of the two subjects being expressed in a
 * vocabulary built for the other.
 *
 * ## Units
 *
 * **Relative throughout.** Resistances are ratios to the same tree unstimulated,
 * calibres are fractions of their own baseline, and ventilation is a share of
 * the current total. This is a deliberate limit on what may be claimed: the
 * resistance of a real airway is not Poiseuille's (flow in the large airways
 * is not laminar), the branching is not perfectly symmetric, and the model has
 * eight generations where a lung has twenty-three. What survives all of that
 * is the *relative* behaviour, so relative is all that is reported.
 *
 * There is no gas exchange here — no saturation, no gas tension. Ventilation
 * heterogeneity is a cause of hypoxaemia and is not the same thing as it, and
 * nothing in this model would let it compute one.
 */

/** Generations, 0 (trachea) to 7. */
export const GENERATIONS = 8;
/** Branches in the whole tree, in heap order. */
export const BRANCH_COUNT = 2 ** GENERATIONS - 1;
/** Terminal branches, each feeding one ventilation unit. */
export const TERMINAL_COUNT = 2 ** (GENERATIONS - 1);
/** Index of the first terminal branch in heap order. */
const FIRST_TERMINAL = TERMINAL_COUNT - 1;

/** Children and generation, in heap order. */
export const leftChild = (index) => 2 * index + 1;
export const rightChild = (index) => 2 * index + 2;
export const generationOf = (index) => Math.floor(Math.log2(index + 1));
export const isTerminal = (index) => index >= FIRST_TERMINAL;

/**
 * Diameter ratio between one generation and the next.
 *
 * 2^(−1/3) ≈ 0.7937 is the ratio a symmetric dichotomous tree takes if it is
 * to ventilate at the lowest energy cost — the Hess–Murray law — and it is the
 * value Weibel's model A uses. Real airways scatter widely around it and branch
 * asymmetrically; this model keeps the ideal and adds the scatter separately,
 * which is honest about which part is a law and which part is variation.
 */
export const HOMOTHETY = 2 ** (-1 / 3);

/**
 * How much of each generation is airway smooth muscle's to narrow.
 *
 * The trachea and the main bronchi are held open by cartilage; smooth muscle
 * comes to dominate in the small bronchi and bronchioles, which is why asthma
 * is a small-airway disease even though it is the whole airway that is
 * inflamed. Ramped rather than switched, because the transition is gradual.
 */
const smoothMuscleShare = (generation) => Math.min(1, Math.max(0, (generation - 1) / 2));

/** The most a fully contracted airway narrows, as a fraction of its radius. */
const MAX_NARROWING = 0.62;

/**
 * Steepness of the airway's response to smooth-muscle activation.
 *
 * A smooth-muscle dose-response is sigmoid, and it has to be *steep* here for
 * an honest reason: with a shallow response the feedback below settles
 * smoothly and the lung narrows evenly, which is not what happens. The
 * clustering in this model is a consequence of a steep local response closed
 * into a positive feedback loop, and both halves are needed. The value is
 * illustrative.
 */
const RESPONSE_STEEPNESS = 6;

/**
 * How strongly the surrounding parenchyma opposes narrowing.
 *
 * This is the load the airway smooth muscle is shortening against, and it is
 * the term that carries the feedback: it scales with how much the region is
 * being ventilated, and therefore stretched.
 */
const TETHERING_STRENGTH = 0.9;
/**
 * How much tethering remains in a region receiving no ventilation at all.
 * Not zero — the lung around a silent region is still inflated by its
 * neighbours — but much less than in a region that is moving.
 */
const TETHERING_FLOOR = 0.25;
/**
 * How sharply tethering follows the local ventilation.
 *
 * Below 1, and deliberately so. The parenchyma is a continuum, not a set of
 * independent boxes: a region that has stopped moving is still pulled open by
 * its neighbours, which have not. With a linear dependence the feedback loop's
 * gain is high enough that once anything tips, almost everything does, and the
 * model produces a lung that is uniformly shut rather than a patchy one. The
 * exponent is the mechanical coupling between neighbouring regions, expressed
 * in the crudest possible way; it is illustrative, and it is the single
 * parameter this model's behaviour is most sensitive to.
 */
const TETHERING_COUPLING = 0.35;

/** Resistance of everything beyond the modelled tree, per terminal unit. */
const ACINAR_RESISTANCE = 300;

/** How different one airway is from the next, as a half-width. */
const SENSITIVITY_SPREAD = 0.25;
const CALIBRE_SPREAD = 0.05;
const SENSITIVITY_SEED = 20260830;
const CALIBRE_SEED = 977;

/** Ventilation below this share of a unit's fair share counts as a defect. */
export const DEFECT_THRESHOLD = 0.3;

export const DEFAULT_CONTROLS = {
  /** How strong the bronchoconstrictor stimulus is, 0–1. The scene's main axis. */
  stimulus: 0,
  /** Airway hyperresponsiveness — how much narrowing a given stimulus produces. */
  hyperresponsiveness: 1.2,
  /**
   * Airway wall thickening from remodelling, 0–1. It takes lumen away before
   * any muscle contracts, and — because resistance goes as the fourth power of
   * a radius — it also amplifies whatever contraction follows.
   */
  wallThickening: 0.25,
  /**
   * How stretched the lung is, 0.6 to 1.3 of a normal resting inflation. A
   * deep breath stretches the parenchyma and pulls the airways open; this is
   * the control that makes that mechanism something the reader can do.
   */
  inflation: 1,
  /** A bronchodilator's relaxation of airway smooth muscle, 0–1. */
  bronchodilator: 0,
};

/**
 * The tree's fixed anatomy: baseline calibre, length, and how twitchy each
 * airway's smooth muscle is.
 *
 * Computed once and shared, because none of it depends on the controls. The
 * scatter is seeded, so this is the same lung on every load — a patchy lung
 * that is patchy somewhere different each time cannot be taught from.
 */
export const TREE = (() => {
  const own = scatter({ count: BRANCH_COUNT, spread: SENSITIVITY_SPREAD, seed: SENSITIVITY_SEED });
  const calibre = scatter({ count: BRANCH_COUNT, spread: CALIBRE_SPREAD, seed: CALIBRE_SEED });

  /**
   * Responsiveness, part inherited and part the branch's own.
   *
   * Airway inflammation is regional — it does not stop at a bifurcation — so a
   * branch is more like its parent than like an airway on the other side of
   * the lung. Without this the tipping points are scattered independently
   * through the tree and the model produces speckle rather than the clustered
   * defects imaging actually shows. The inherited share is illustrative; that
   * *some* of it is inherited is the claim.
   */
  const sensitivity = new Array(BRANCH_COUNT);
  const INHERITED = 0.7;
  for (let index = 0; index < BRANCH_COUNT; index++) {
    const parent = index === 0 ? 1 : sensitivity[Math.floor((index - 1) / 2)];
    sensitivity[index] = INHERITED * parent + (1 - INHERITED) * own[index];
  }

  return Array.from({ length: BRANCH_COUNT }, (_, index) => {
    const generation = generationOf(index);
    const scale = HOMOTHETY ** generation;
    return {
      index,
      generation,
      terminal: isTerminal(index),
      /** Radius as a fraction of the trachea's, before anything narrows it. */
      baseRadius: scale * calibre[index],
      /** Length, on the same scaling. */
      length: scale,
      /** This airway's own responsiveness, around a mean of exactly 1. */
      sensitivity: sensitivity[index],
      muscleShare: smoothMuscleShare(generation),
    };
  });
})();

/**
 * Poiseuille resistance of one airway, in arbitrary units.
 *
 * `R ∝ L / r⁴`. Used as a **relative** statement and nothing more: real flow in
 * the trachea and main bronchi is not laminar, so this is not the resistance of
 * a real airway. What it is right about is the exponent — halve a radius and
 * the resistance rises sixteenfold — and that exponent is why a disease of the
 * small airways is a disease at all.
 */
const branchResistance = (branch, radius) => branch.length / Math.max(1e-6, radius) ** 4;

/**
 * How narrow each airway is, given the stimulus reaching it and the pull of
 * the lung around it.
 *
 * @param {object} controls
 * @param {number[]} regionalVentilation ventilation share of the region each
 *   branch feeds, from the previous iterate — 1 means it is getting its fair
 *   share. This is the only place the feedback enters.
 */
function calibresFor(controls, regionalVentilation) {
  const { stimulus, hyperresponsiveness, wallThickening, inflation, bronchodilator } = controls;
  const drive = stimulus * hyperresponsiveness * (1 - 0.55 * bronchodilator);

  return TREE.map((branch, index) => {
    // Wall thickening takes lumen from every airway, most from the small ones
    // where the wall is a larger share of the whole. Nothing to do with muscle:
    // it is there before any stimulus arrives.
    const thickened = branch.baseRadius * (1 - wallThickening * 0.32 * branch.muscleShare);

    const activation = drive * branch.sensitivity * branch.muscleShare;
    // What the muscle is shortening against: the parenchyma's pull, which
    // scales with how stretched it is — and it is stretched by the air that
    // reaches it and by however inflated the lung is overall.
    const stretch =
      TETHERING_FLOOR +
      (1 - TETHERING_FLOOR) * Math.min(2.2, Math.max(0, regionalVentilation[index])) ** TETHERING_COUPLING;
    const opposition = TETHERING_STRENGTH * stretch * inflation;

    // The airway narrows to the extent the muscle wins. An airway with its
    // normal tethering needs an activation above `TETHERING_STRENGTH` before
    // anything happens at all — which is why losing the tethering, rather than
    // gaining more stimulus, is what tips one over.
    const narrowing = 1 / (1 + Math.exp(-RESPONSE_STEEPNESS * (activation - opposition)));

    return {
      radius: thickened * (1 - MAX_NARROWING * narrowing),
      openFraction: (thickened * (1 - MAX_NARROWING * narrowing)) / branch.baseRadius,
      narrowing,
    };
  });
}

/**
 * Solves the tree for how the flow divides.
 *
 * Every branch is a resistance; a bifurcation is two subtrees in parallel; the
 * flow into a bifurcation divides between them in inverse proportion to what
 * each of them costs. Recursion, from the terminal branches back up, is the
 * shape of the problem and so it is the shape of the code.
 *
 * @param {{radius:number}[]} calibres
 * @returns {{ equivalent: number[], flow: number[] }} equivalent resistance of
 *   the subtree below each branch (including the branch), and the share of the
 *   total flow reaching each branch
 */
export function solveTree(calibres) {
  const equivalent = new Array(BRANCH_COUNT);

  // Upwards: a subtree's cost is its own branch plus its children in parallel.
  for (let index = BRANCH_COUNT - 1; index >= 0; index--) {
    const branch = TREE[index];
    const own = branchResistance(branch, calibres[index].radius);
    if (branch.terminal) {
      equivalent[index] = own + ACINAR_RESISTANCE;
      continue;
    }
    const left = equivalent[leftChild(index)];
    const right = equivalent[rightChild(index)];
    equivalent[index] = own + (left * right) / (left + right);
  }

  // Downwards: unit flow into the trachea, divided at every bifurcation. The
  // child that costs less gets more, which is the whole of why an airway that
  // narrows loses ventilation to its neighbour rather than only losing its own.
  const flow = new Array(BRANCH_COUNT).fill(0);
  flow[0] = 1;
  for (let index = 0; index < FIRST_TERMINAL; index++) {
    const left = equivalent[leftChild(index)];
    const right = equivalent[rightChild(index)];
    const total = left + right;
    flow[leftChild(index)] = (flow[index] * right) / total;
    flow[rightChild(index)] = (flow[index] * left) / total;
  }

  return { equivalent, flow };
}

/**
 * Ventilation reaching the region below each branch, as a share of its fair
 * share.
 *
 * A branch feeding a sixteenth of the lung and carrying a sixteenth of the
 * flow is at 1. This is what the tethering term reads, and what the scene
 * colours the tree by.
 */
function regionalSharesFrom(flow) {
  return flow.map((value, index) => value * 2 ** generationOf(index));
}

/**
 * The reference lung every ratio is quoted against: **healthy**, not merely
 * unstimulated.
 *
 * No stimulus, no wall thickening, ordinary responsiveness, ordinary
 * inflation. Quoting against the reader's own lung with the stimulus removed
 * would normalise away the resistance that airway remodelling costs at rest,
 * which is a real cost and one of the things the scene is for.
 */
export const REFERENCE_CONTROLS = {
  stimulus: 0,
  hyperresponsiveness: 1,
  wallThickening: 0,
  inflation: 1,
  bronchodilator: 0,
};

const BASELINE = (() => {
  const calibres = calibresFor(REFERENCE_CONTROLS, new Array(BRANCH_COUNT).fill(1));
  return solveTree(calibres);
})();

/**
 * Solve the lung for a given set of controls.
 *
 * The feedback makes this circular — calibre depends on ventilation, which
 * depends on calibre — so it is iterated to a fixed point with damping.
 * Damping is not a numerical convenience here: the system is genuinely
 * bistable near the tipping point, and an undamped iteration flips between two
 * answers forever rather than settling on either. The result reports whether it
 * settled, and a caller that gets `false` is looking at a lung the model cannot
 * pin down rather than at an answer.
 *
 * @param {object} [controls]
 */
export function solveAsthma(controls = {}, { maxIterations = 2600, tolerance = 1e-5, feedback = true } = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };

  // `feedback: false` freezes the tethering at what a fully ventilated lung
  // would give, so the airways narrow according to the stimulus and their own
  // responsiveness and nothing else. It exists so that the scene's central
  // claim — that the patchiness comes from the loop, not from the scatter —
  // can be *falsified* rather than only asserted, here and in the tests.
  if (!feedback) {
    const calibres = calibresFor(settings, new Array(BRANCH_COUNT).fill(1));
    return report(settings, calibres, { converged: true, iterations: 1 });
  }

  const solved = fixedPoint({
    initial: new Array(BRANCH_COUNT).fill(1),
    next: (ventilation) => regionalSharesFrom(solveTree(calibresFor(settings, ventilation)).flow),
    blend: (a, b, t) => a.map((value, index) => value + (b[index] - value) * t),
    // Root-mean-square across the tree rather than the worst single branch.
    // Right at the tipping point one or two branches keep flipping between two
    // nearly-equal answers long after everything the model reports has stopped
    // moving; a max-difference residual calls that "not settled" and is
    // measuring the wrong thing.
    distance: (a, b) =>
      Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length),
    // Heavily damped, because near the tipping point an eager iteration flips
    // between the two answers rather than approaching either. The default
    // tolerance is loose on purpose: it is an order of magnitude tighter than
    // the digits anything downstream reports, and a tighter one costs a
    // noticeable fraction of a second every time a slider moves. Where it
    // still does not settle, `converged` says so and the scene says so too.
    damping: 0.12,
    tolerance,
    maxIterations,
  });

  return report(settings, calibresFor(settings, solved.value), solved);
}

/** Turns a set of calibres into everything downstream is allowed to quote. */
function report(settings, calibres, solved) {
  const { equivalent, flow } = solveTree(calibres);
  const shares = regionalSharesFrom(flow);

  /**
   * How much less air is reaching the lung as a whole than at baseline.
   *
   * Under a fixed driving pressure, total flow is inversely proportional to
   * total resistance. Needed because `share` is normalised — when *every* unit
   * shuts equally, every share is 1 and a share-based read-out calls the lung
   * uniform, which it is, and well ventilated, which it is not.
   */
  const totalVentilation = BASELINE.equivalent[0] / equivalent[0];

  const units = [];
  for (let index = FIRST_TERMINAL; index < BRANCH_COUNT; index++) {
    units.push({
      index,
      unit: index - FIRST_TERMINAL,
      /** Share of its fair share of the current total. Mean is exactly 1. */
      share: shares[index],
      /** Air actually reaching it, as a fraction of what it got at baseline. */
      ventilation: shares[index] * totalVentilation,
      openFraction: calibres[index].openFraction,
    });
  }

  const ventilations = units.map((unit) => unit.share);
  const mean = ventilations.reduce((sum, value) => sum + value, 0) / ventilations.length;
  const variance =
    ventilations.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ventilations.length;

  return {
    controls: settings,
    converged: solved.converged,
    iterations: solved.iterations,
    calibres,
    units,
    /** Every branch's share of its fair share, for colouring the tree. */
    regionalVentilation: shares,
    /** Total airway resistance as a multiple of the same tree unstimulated. */
    resistanceRatio: equivalent[0] / BASELINE.equivalent[0],
    /** Air reaching the lung as a whole, as a fraction of baseline. */
    totalVentilation,
    /**
     * Coefficient of variation of ventilation across the units. The standard
     * summary of ventilation heterogeneity, and zero for a uniform lung by
     * construction.
     */
    heterogeneity: Math.sqrt(variance) / mean,
    /** Fraction of units receiving less than `DEFECT_THRESHOLD` of their share. */
    defectFraction: ventilations.filter((value) => value < DEFECT_THRESHOLD).length / ventilations.length,
    /**
     * The largest *contiguous* region that is poorly ventilated, as a fraction
     * of the lung — the single number that distinguishes "patchy" from "evenly
     * a bit worse". Contiguity is defined on the tree: a region is the set of
     * units below one branch, which is what a region of lung fed by one airway
     * is.
     */
    largestDefectFraction: largestDefectiveSubtree(ventilations),
    /** Median calibre across the airways smooth muscle can act on. */
    medianCalibre: median(
      TREE.filter((branch) => branch.muscleShare > 0.5).map((branch) => calibres[branch.index].openFraction)
    ),
  };
}

/** How much of a region has to be dark before it counts as a defect. */
const CLUSTER_PURITY = 0.8;

/**
 * The largest region that is mostly dark, as a fraction of the whole lung.
 *
 * "Region" means the set of units below one branch, which is what a region of
 * lung fed by one airway is — contiguity on a branching tree, not contiguity
 * in space, and the model does not claim the two are the same. "Mostly" rather
 * than "entirely" because a defect with one surviving unit in the middle of it
 * is still a defect, and demanding purity turned every real cluster into
 * several small ones.
 *
 * This is the number that separates *patchy* from *evenly a bit worse*, which
 * is the distinction the whole scene exists to make.
 */
function largestDefectiveSubtree(ventilations) {
  const defectiveBelow = new Array(BRANCH_COUNT);
  const size = new Array(BRANCH_COUNT);
  for (let index = BRANCH_COUNT - 1; index >= 0; index--) {
    if (isTerminal(index)) {
      defectiveBelow[index] = ventilations[index - FIRST_TERMINAL] < DEFECT_THRESHOLD ? 1 : 0;
      size[index] = 1;
      continue;
    }
    defectiveBelow[index] = defectiveBelow[leftChild(index)] + defectiveBelow[rightChild(index)];
    size[index] = size[leftChild(index)] + size[rightChild(index)];
  }
  let largest = 0;
  for (let index = 0; index < BRANCH_COUNT; index++) {
    if (defectiveBelow[index] >= size[index] * CLUSTER_PURITY) {
      largest = Math.max(largest, defectiveBelow[index]);
    }
  }
  return largest / TERMINAL_COUNT;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * The whole dose-response curve, solved.
 *
 * The scene plots this so that the reader can see where the lung they are
 * looking at sits on it — and, more to the point, see that the curve has a
 * knee. Solved rather than drawn: if the feedback were removed the curve would
 * straighten out here as well as on screen.
 *
 * @param {object} controls everything except the stimulus
 * @param {number} [samples]
 */
export function doseResponse(controls, samples = 16) {
  const points = [];
  for (let i = 0; i <= samples; i++) {
    const stimulus = i / samples;
    // A curve, not a read-out: solved less exactly than the lung the reader is
    // looking at, because the shape of the knee does not need six decimal
    // places and a full solve at every dose is half a second of the main
    // thread.
    const solved = solveAsthma({ ...controls, stimulus }, { maxIterations: 300, tolerance: 1e-4 });
    points.push({
      stimulus,
      resistanceRatio: solved.resistanceRatio,
      heterogeneity: solved.heterogeneity,
      defectFraction: solved.defectFraction,
    });
  }
  return points;
}
