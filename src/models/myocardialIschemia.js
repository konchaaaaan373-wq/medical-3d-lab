import { TERRITORIES } from './coronaryTerritories.js';
import { solveSteadyState } from './cardiacMechanics.js';

/**
 * Myocardial ischemia: what happens when a coronary territory is under-supplied.
 *
 * ## The one question this answers
 *
 * **Where a coronary artery narrows, which myocardium stops contracting, and
 * what that does to the whole circulation.** Not how a plaque forms, not
 * whether a person is having a heart attack, and not what to do about it.
 *
 * The chain it solves, per territory:
 *
 *   supply / demand  →  a deficit, when supply falls short
 *                    →  ischemic burden, which **accumulates over time**
 *                    →  contractility, which follows burden with a lag
 *                    →  regional wall motion, and the whole-heart consequences
 *                       the shared cardiac solver derives from the same state
 *
 * ## Burden is the whole point, and it is why colour is not
 *
 * `docs/anatomy-specs.md` §2 A3-a prohibits painting myocardium red the instant
 * supply drops, and this model is how that prohibition is kept: nothing
 * downstream reads supply. Colour, wall motion and the read-out all read
 * `burden`, which takes time to build and — the part that matters clinically —
 * time to come back down.
 *
 * That is the difference between a picture of a stenosis and a model of
 * ischemia. A vessel that narrows and a wall that stops moving are separated by
 * minutes of accumulating oxygen debt, and reperfusing the vessel does not put
 * the wall back at once. A model where colour tracked supply would teach that
 * blood flow and contraction are the same thing, which is exactly the
 * misconception stunning exists to correct.
 *
 * ## Time
 *
 * The axis is **normalized episode progress**, 0 to 1, and it is named that in
 * every field. It is not minutes. Real ischemic time-courses depend on
 * collateral supply, preconditioning, the size of the territory and how
 * complete the occlusion is, and none of those are in here; putting seconds on
 * this axis would claim a precision the model has no way to have.
 *
 * ## What this is not
 *
 * Not a patient simulator. Not a stenosis-to-flow calculation — there is no
 * Poiseuille law here and no plaque geometry; supply is a scale factor on a
 * territory, deliberately, because the imbalance is the subject and the
 * plumbing is not. No infarction, necrosis, scar or infarct expansion: this is
 * reversible ischemia, and a first version that showed dying muscle without
 * modelling any of the things that decide whether muscle dies would be worse
 * than one that says it stops at reversibility.
 *
 * Every number below is **behavioural calibration**: chosen so the model
 * behaves the way ischemia behaves — a deficit that accumulates, an ordering by
 * severity, a recovery that lags — and not read out of any series.
 * `docs/model-evidence/myocardial-ischemia.md` carries the claim-by-claim
 * boundary between what is published direction and what is fitted shape.
 */

/**
 * Oxygen supply relative to demand in a territory at rest, with every artery
 * open.
 *
 * A margin, not a measurement: the coronary circulation at rest runs with
 * reserve, which is why a stenosis can be silent until demand rises. The size
 * of the margin here is chosen so that the three severities the scene offers
 * separate cleanly, and it is the single number most of the behaviour below is
 * sensitive to.
 */
export const BASELINE_SUPPLY_DEMAND = 1.25;

/**
 * How fast burden accumulates per unit of progress, per unit of deficit.
 *
 * Calibrated against the shape the scene has to show rather than against a
 * clock: at a severe deficit the burden has to be unmistakable by the end of
 * one episode, and the three severities have to be told apart at a glance.
 */
const BURDEN_RISE = 4;

/**
 * How fast burden clears once supply is restored.
 *
 * Slower than it built, which is the clinically important asymmetry: `1` here
 * clears about 63% of the accumulated burden over a full normalized recovery,
 * so a reperfused territory is visibly better and visibly not yet normal.
 */
const BURDEN_FALL = 1;

/**
 * How much contractility a territory loses at full burden.
 *
 * At burden 1 a territory keeps a little under half of its contractility. It
 * does not reach zero: akinesis is not the same as absent muscle, and a
 * territory contributing nothing at all would make the ventricle behave like
 * one with a hole in it.
 */
const CONTRACTILITY_LOSS = 0.55;

/**
 * How quickly contractility follows burden — **and it is not the same in both
 * directions**.
 *
 * This asymmetry is the physiology, not a convenience. Regional contraction
 * falls almost as soon as a coronary artery occludes: hypokinesis is one of the
 * earliest things to happen, well before anything shows on an ECG. Recovery is
 * the slow half. Muscle that has been ischemic and is then reperfused stays
 * hypokinetic for hours to days with its blood supply entirely restored — that
 * is myocardial **stunning**, and it is the single most important thing this
 * model can teach, because the intuition it corrects is that flow and
 * contraction are the same thing.
 *
 * Written first as one rate for both directions, which forced a choice between
 * a wall that barely stopped moving during the occlusion and a wall that
 * snapped back the instant flow returned. Neither is what happens.
 */
const CONTRACTILITY_ONSET = 6;
const CONTRACTILITY_RECOVERY = 0.55;

/** A fresh value for each territory. */
const perTerritory = (value) =>
  Object.fromEntries(TERRITORIES.map((territory) => [territory, value]));

/**
 * The state of the myocardium, per territory.
 *
 * @typedef {object} IschemiaState
 * @property {Record<string, number>} supplyDemandRatio oxygen supply over demand
 * @property {Record<string, number>} ischemicBurden 0 (none) to 1 (maximal)
 * @property {Record<string, number>} contractilityMultiplier 0..1, applied to Ees
 * @property {number} episodeProgress how far through the episode, 0..1
 */

/**
 * The resting myocardium: every artery open, nothing accumulated.
 *
 * @returns {IschemiaState}
 */
export function restingMyocardium() {
  return {
    supplyDemandRatio: perTerritory(BASELINE_SUPPLY_DEMAND),
    ischemicBurden: perTerritory(0),
    contractilityMultiplier: perTerritory(1),
    /** Carried alongside burden so contractility can lag behind it. */
    contractilityBurden: perTerritory(0),
    episodeProgress: 0,
  };
}

/**
 * Supply and demand in each territory, given what is narrowed and how hard the
 * heart is working.
 *
 * `supplyFactor` is a fraction of normal flow down that artery — 1 is open,
 * 0.35 is a severe deficit. It is **not** a stenosis diameter and must not be
 * presented as one; there is no flow calculation here, and the relationship
 * between a lumen and a flow reserve is exactly the thing this model does not
 * carry.
 *
 * `demandFactor` scales every territory's demand together, which is what
 * exercise or tachycardia does. Demand is uniform because regional demand
 * differences are small next to a supply deficit, and modelling them would
 * imply a resolution the territory map has not got.
 *
 * @param {{ supplyFactor?: Record<string, number>, demandFactor?: number }} options
 * @returns {Record<string, number>} supply/demand per territory
 */
export function supplyDemandRatios({ supplyFactor = {}, demandFactor = 1 } = {}) {
  if (!(demandFactor > 0)) throw new RangeError(`demandFactor must be positive, got ${demandFactor}`);
  const ratios = {};
  for (const territory of TERRITORIES) {
    const supply = supplyFactor[territory] ?? 1;
    if (!(supply >= 0)) throw new RangeError(`supplyFactor.${territory} must be 0 or more, got ${supply}`);
    ratios[territory] = (BASELINE_SUPPLY_DEMAND * supply) / demandFactor;
  }
  return ratios;
}

/**
 * Advance the myocardium through part of an episode.
 *
 * Integrated as a first-order relaxation rather than added linearly, so burden
 * saturates towards 1 instead of running past it, and so the same call works at
 * any step size — a scene that advances by a frame and a test that advances in
 * one jump have to agree, or the physiology would depend on the frame rate.
 *
 * @param {IschemiaState} state
 * @param {object} options
 * @param {Record<string, number>} [options.supplyFactor]
 * @param {number} [options.demandFactor]
 * @param {number} options.deltaProgress how much of the episode elapses, > 0
 * @returns {IschemiaState} a new state; the input is not modified
 */
export function advanceIschemia(state, { supplyFactor = {}, demandFactor = 1, deltaProgress } = {}) {
  if (!(deltaProgress > 0)) {
    throw new RangeError(`advanceIschemia needs a positive step, got ${deltaProgress}`);
  }
  const ratios = supplyDemandRatios({ supplyFactor, demandFactor });
  const burden = {};
  const contractilityBurden = {};
  const contractilityMultiplier = {};

  for (const territory of TERRITORIES) {
    const ratio = ratios[territory];
    const previous = state.ischemicBurden[territory];

    if (ratio < 1) {
      // Under-supplied: burden climbs towards 1, faster the deeper the deficit.
      const deficit = 1 - ratio;
      const target = 1;
      const rate = BURDEN_RISE * deficit;
      burden[territory] = target - (target - previous) * Math.exp(-rate * deltaProgress);
    } else {
      // Supplied: the debt is repaid, and more slowly than it was run up.
      burden[territory] = previous * Math.exp(-BURDEN_FALL * deltaProgress);
    }

    // Contractility does not follow burden directly. It follows a lagged copy of
    // it, and the lag is one-sided: it catches up quickly while the burden is
    // rising and slowly while it falls. That is what makes a reperfused wall
    // stay hypokinetic after its blood supply is back.
    const lagged = state.contractilityBurden[territory];
    const rate = burden[territory] >= lagged ? CONTRACTILITY_ONSET : CONTRACTILITY_RECOVERY;
    contractilityBurden[territory] =
      burden[territory] - (burden[territory] - lagged) * Math.exp(-rate * deltaProgress);
    contractilityMultiplier[territory] = 1 - CONTRACTILITY_LOSS * contractilityBurden[territory];
  }

  return {
    supplyDemandRatio: ratios,
    ischemicBurden: burden,
    contractilityBurden,
    contractilityMultiplier,
    episodeProgress: Math.min(1, state.episodeProgress + deltaProgress),
  };
}

/**
 * Run a whole episode from rest, in one call.
 *
 * The same integration the frame loop performs, in steps small enough that the
 * result does not depend on the step size. Exists so that a test, a chart and a
 * scene asking "where does this end up" all get the same answer as the scene
 * that walked there — there is one integration, not two.
 *
 * @param {object} options
 * @param {Record<string, number>} [options.supplyFactor]
 * @param {number} [options.demandFactor]
 * @param {number} options.progress how far through the episode to run, 0..1
 * @param {IschemiaState} [options.from] a state to continue from; rest by default
 * @returns {IschemiaState}
 */
export function episodeAt({ supplyFactor = {}, demandFactor = 1, progress, from } = {}) {
  if (!(progress >= 0)) throw new RangeError(`episodeAt needs a progress of 0 or more, got ${progress}`);
  let state = from ?? restingMyocardium();
  if (progress === 0) return state;
  const steps = Math.max(1, Math.ceil(progress / 0.002));
  const deltaProgress = progress / steps;
  for (let i = 0; i < steps; i++) {
    state = advanceIschemia(state, { supplyFactor, demandFactor, deltaProgress });
  }
  return state;
}

/**
 * The contractility of the whole ventricle, from its territories.
 *
 * Weighted by how much myocardium each territory supplies, so that losing the
 * anterior descending's share costs more than losing the circumflex's — which
 * it does, and which is why a proximal LAD lesion is the one with a name.
 *
 * This is the single number that couples the regional model to the whole-heart
 * one: the cardiac solver's end-systolic elastance is scaled by it, and every
 * global consequence — stroke volume, ejection fraction, the pressure-volume
 * loop, the filling pressures — falls out of that one solve rather than being
 * computed a second way for the read-out.
 *
 * @param {IschemiaState} state
 * @param {Record<string, number>} massFraction share of myocardium per territory
 * @returns {number} 0..1
 */
export function ventricularContractility(state, massFraction) {
  let total = 0;
  let weighted = 0;
  for (const territory of TERRITORIES) {
    const share = massFraction[territory];
    if (!(share >= 0)) throw new RangeError(`massFraction.${territory} must be 0 or more, got ${share}`);
    total += share;
    weighted += share * state.contractilityMultiplier[territory];
  }
  if (!(total > 0)) throw new RangeError('massFraction has to add up to something');
  return weighted / total;
}

/**
 * How much a territory's wall still moves, relative to rest.
 *
 * The same multiplier the global solve uses, read per territory — so the wall
 * that is drawn moving less and the ejection fraction that falls are the same
 * fact seen twice, not two calculations that happen to agree.
 *
 * @param {IschemiaState} state
 * @param {string} territory
 * @returns {number} 1 at rest, lower when ischemic
 */
export function wallMotionAmplitude(state, territory) {
  const multiplier = state.contractilityMultiplier[territory];
  if (multiplier === undefined) throw new Error(`Unknown territory "${territory}"`);
  return multiplier;
}

/**
 * The whole circulation, solved from the ischemic state.
 *
 * This is the join the whole design exists for. The regional model gives one
 * number — how hard the ventricle can still contract — and **everything global
 * falls out of a single solve of the shared cardiac model**: stroke volume,
 * ejection fraction, the pressure-volume loop, the filling pressures, the
 * arterial pressures. Nothing is computed a second way for a read-out or a
 * chart, which is the rule the repository is built on and the reason the solver
 * was moved out of the heart-failure scene in the first place.
 *
 * End-systolic elastance is what the contractility multiplier scales, because
 * `Ees` *is* contractility in a time-varying elastance model: it is the slope of
 * the end-systolic pressure-volume relation, and losing regional contraction is
 * exactly a fall in that slope. Scaling stroke volume or ejection fraction
 * directly would have been assigning the answer rather than solving for it —
 * and would have produced a ventricle whose loop did not match its own numbers.
 *
 * @param {IschemiaState} state
 * @param {object} options
 * @param {object} options.parameters the circulation parameters at rest
 * @param {Record<string, number>} options.massFraction share of myocardium per territory
 * @returns {{ solution: object, contractility: number, parameters: object }}
 */
export function solveIschemicCirculation(state, { parameters, massFraction }) {
  if (!parameters?.lv?.ees) {
    throw new TypeError('solveIschemicCirculation needs circulation parameters with an lv.ees');
  }
  const contractility = ventricularContractility(state, massFraction);
  const scaled = {
    ...parameters,
    lv: { ...parameters.lv, ees: parameters.lv.ees * contractility },
  };
  return { solution: solveSteadyState(scaled), contractility, parameters: scaled };
}
