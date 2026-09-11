import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CAPACITY_ML as ACHALASIA_CAPACITY_ML,
  REFERENCE as ACHALASIA_REFERENCE,
  solveAchalasia,
} from '../src/models/achalasia.js';
import {
  LUMEN_COMPRESSION,
  REST_SHARES as PROSTATE_REST_SHARES,
  solveProstaticEnlargement,
} from '../src/models/prostaticEnlargement.js';
import { INNER_GLAND_FRACTION } from '../src/scenes/reproductive/organs/prostateAnatomy.js';
import {
  SEGMENTS as GUT_SEGMENTS,
  RETAINED_LOAD,
  SITES as OBSTRUCTION_SITES,
  solveBowelObstruction,
} from '../src/models/bowelObstruction.js';
import { buildColon, buildDuodenum, buildSmallIntestine, colonCalibre } from '../src/scenes/gastrointestinal/organs/intestine.js';
import { buildColonParts } from '../src/scenes/gastrointestinal/organs/colonParts.js';
import {
  DIAMETER_RANGE as FIBROID_DIAMETERS,
  LOCATIONS as FIBROID_LOCATIONS,
  UTERUS as FIBROID_UTERUS,
  solveUterineFibroid,
} from '../src/models/uterineFibroid.js';
import { buildUterusParts } from '../src/scenes/reproductive/organs/uterusParts.js';
import {
  BURDEN_RANGE as GOITRE_BURDEN,
  DIRECTIONS as GOITRE_DIRECTIONS,
  FACE_AREA,
  THYROID,
  solveMultinodularGoitre,
} from '../src/models/multinodularGoitre.js';
import { buildThyroidParts } from '../src/scenes/endocrine/organs/thyroidAnatomy.js';
import {
  EXTRUSION_PER_LOSS,
  KNEE,
  solveKneeOsteoarthritis,
} from '../src/models/kneeOsteoarthritis.js';
import { CONDYLE_SITES, buildKneeJoint } from '../src/scenes/musculoskeletal/organs/kneeJoint.js';
import { KneeOsteoarthritisScene } from '../src/scenes/musculoskeletal/scenes/kneeOsteoarthritis/KneeOsteoarthritisScene.js';
import {
  MAX_TRANSLATION,
  RESTRAINT,
  SEPARATES_ABOVE,
  solveAclInjury,
} from '../src/models/aclInjury.js';
import { HOLDS_ABOVE, RISE_MAX, SHARE, solveRotatorCuffTear } from '../src/models/rotatorCuffTear.js';
import { SUBACROMIAL_DISPLAY_GAP } from '../src/scenes/musculoskeletal/organs/shoulderJoint.js';
import { DIRECTIONS as HIP_DIRECTIONS, HIP, SPILL, solveHipOsteoarthritis } from '../src/models/hipOsteoarthritis.js';
import { buildHipJoint } from '../src/scenes/musculoskeletal/organs/hipJoint.js';
import { RotatorCuffTearScene } from '../src/scenes/musculoskeletal/scenes/rotatorCuffTear/RotatorCuffTearScene.js';
import {
  DEFAULT_CONTROLS as BILIARY_DEFAULTS,
  REFERENCE as BILIARY_REFERENCE,
  solveBiliaryObstruction,
} from '../src/models/biliaryObstruction.js';
import {
  BASELINE_INTERSTITIAL_VOLUME_ML as EDEMA_BASELINE_WATER_ML,
  INTERSTITIUM as EDEMA_INTERSTITIUM,
  LYMPHATICS as EDEMA_LYMPHATICS,
  MAXIMUM_LUNG_WATER_ML as EDEMA_MAXIMUM_WATER_ML,
  floodingThresholdMmHg as edemaThreshold,
  stateAt as edemaStateAt,
} from '../src/models/pulmonaryEdema.js';
import {
  BASELINE_CIRCULATION,
  CIRCULATION_INTERVENTIONS,
  ILLUSTRATIVE_RESPONSES,
  solveCirculation,
} from '../src/models/circulation.js';
import {
  REFERENCE,
  UNIT_COUNT,
  breathingPattern,
  createRespiratoryModel,
  lungMechanics,
} from '../src/models/copd.js';
import {
  GENERATIONS,
  HOMOTHETY,
  TERMINAL_COUNT,
  TREE,
  cartilageSupport,
  constrictibilityWeight,
  doseResponse,
  smoothMuscleFraction,
  solveAsthma,
  solveTree,
} from '../src/models/asthma.js';
import {
  DYNAMIC_SHARE_AT_FULL_TONE,
  establishedCollateralFraction,
  progressionCurve,
  solvePortalCirculation,
  vascularResistances,
} from '../src/models/portalHypertension.js';
import {
  ACTIVATION_HALF_PRESSURE_DEFICIT,
  AFFERENT_AUTOREGULATION,
  AFFERENT_PROSTAGLANDIN_PROTECTION,
  ALBUMIN_OUTPUT_GAIN,
  CARDIAC_COMPENSATION_EXPONENT,
  CENTRAL_VENOUS_PRESSURE,
  EFFERENT_CONSTRICTOR_GAIN,
  KF,
  KF_CONSTRICTOR_REDUCTION,
  PLASMA_ONCOTIC_PRESSURE,
  REFERENCE_AFFERENT_RESISTANCE,
  REFERENCE_EFFERENT_RESISTANCE,
  REFERENCE_SVR,
  RENAL_REFERENCE,
  SYSTEMIC_CONSTRICTION_GAIN,
  kidneyWithoutTheSignal,
  SYSTEMIC_REFERENCE,
  SYSTEMIC_VASODILATION_GAIN,
  TERLIPRESSIN_SPLANCHNIC_EFFECT,
  solveHepatorenal,
  solveKidney,
  vasoconstrictorActivation,
} from '../src/models/hepatorenal.js';
import { UrinaryObstructionScene } from '../src/scenes/renal/scenes/urinaryObstruction/UrinaryObstructionScene.js';
import {
  CAPSULE_GIVE,
  KIDNEY,
  KIDNEY_VOLUME,
  PELVIS_VOLUME,
  RETAINED_LOAD as URINARY_RETAINED_LOAD,
  THINNED_BELOW,
  solveUrinaryObstruction,
} from '../src/models/urinaryObstruction.js';
import { LobarCollapseScene } from '../src/scenes/respiratory/scenes/lobarCollapse/LobarCollapseScene.js';
import { LOBE_VOLUME_SHARES } from '../src/scenes/respiratory/organs/lungAnatomy.js';
import {
  LOBES as COLLAPSE_LOBES,
  MIDLINE_FACE,
  RESIDUAL as COLLAPSE_RESIDUAL,
  TAKEN_BY_REST,
  solveLobarCollapse,
} from '../src/models/lobarCollapse.js';
import { buildSpine } from '../src/scenes/musculoskeletal/organs/spine.js';
import {
  ANNULUS_BEHIND as DISC_ANNULUS_BEHIND,
  MAX_REACH as DISC_MAX_REACH,
  NUCLEUS_HALF_DEPTH as DISC_NUCLEUS_HALF_DEPTH,
  TARGETS as DISC_TARGETS,
  solveLumbarDiscHerniation,
} from '../src/models/lumbarDiscHerniation.js';
import { RetinalDetachmentScene } from '../src/scenes/sensory/scenes/retinalDetachment/RetinalDetachmentScene.js';
import { SITES as EYE_SITES, buildEyeball } from '../src/scenes/sensory/organs/eyeball.js';
import {
  GLOBE as RD_GLOBE,
  MAX_ARC as RD_MAX_ARC,
  MAX_LIFT as RD_MAX_LIFT,
  ORIGINS as RD_ORIGINS,
  solveRetinalDetachment,
} from '../src/models/retinalDetachment.js';
import { LENS as CATARACT_LENS, PUPILS as CATARACT_PUPILS, solveCataract } from '../src/models/cataract.js';
import { BppvScene } from '../src/scenes/sensory/scenes/bppv/BppvScene.js';
import { SITES as EAR_SITES, buildEar } from '../src/scenes/sensory/organs/ear.js';
import {
  CANAL as BPPV_CANAL,
  CANALS as BPPV_CANALS,
  DRIVES_ABOVE as BPPV_DRIVES_ABOVE,
  MAX_PITCH as BPPV_MAX_PITCH,
  solveBppv,
} from '../src/models/bppv.js';

/**
 * **Layer 3 — calibration behaviour. What this repository chose, still doing
 * what it was chosen to do.**
 *
 * Every assertion in this file is about a number **this repository invented or
 * tuned**, and about nothing else. None of them is a fact about a lung or a
 * liver, and none may ever be quoted as one.
 *
 * ## What a failure here means
 *
 * That a choice this repository made has changed. That may be a mistake, and it
 * may equally be a deliberate re-tuning that simply has not reached this file
 * yet. **It is never evidence that the medicine is wrong**, and no report,
 * commit message or PR body may present it that way. The sentence "the model
 * has broken a constraint the physiology imposes" belongs to
 * `respiratory-physiology.test.js` and `portal-haemodynamics.test.js` alone.
 *
 * ## Why the file exists at all
 *
 * These assertions are worth having. A calibration that silently drifts is how
 * a scene stops matching the textbook figures it was built against, and how
 * the flow ceiling stops sitting where the flow-volume envelope needs it. But
 * they were, until this pass, mixed in with the external invariants — a
 * bronchodilator split of 28% against 10%, a peripheral-to-central
 * constrictibility ratio, a dynamic component of exactly 30%, a post-TIPS
 * gradient below 12 — and a reader could not tell which failures would have
 * been a medical problem.
 *
 * Separating them is the whole point. A fact and a convenience should not be
 * defended by the same test.
 *
 * Each entry names the `src/models/evidence.js` id it defends, and
 * `tests/evidence.test.js` checks that every `calibration`, `illustrative` and
 * `approximation` entry is validated here and nowhere else.
 */

const settledLung = (controls) => {
  const model = createRespiratoryModel({ controls });
  model.settle({ maxBreaths: 400 });
  model.settle({ maxBreaths: 400 });
  return model.state;
};

// ===========================================================================
// Circulation
// ===========================================================================

test('calibration: the low-flow reference is anchored to MAP 70', () => {
  // Defends `low-flow-map-anchor`. Both the low-flow comparison and the MAP
  // target were chosen for this lesson; neither is a bedside threshold.
  const baseline = solveCirculation();
  assert.equal(baseline.intervention, CIRCULATION_INTERVENTIONS.BASELINE);
  assert.equal(baseline.heartRatePerMin, 96);
  assert.equal(baseline.strokeVolumeMl, 38);
  assert.ok(Math.abs(baseline.cardiacOutputLMin - 3.648) < 1e-12);
  assert.ok(
    Math.abs(baseline.meanArterialPressureMmHg - BASELINE_CIRCULATION.targetMeanArterialPressureMmHg) < 1e-12
  );
});

test('calibration: the two response states retain their chosen illustrative sizes', () => {
  // Defends `illustrative-response-sizes`. These are visibility choices, not
  // doses or expected effects, and the exact values intentionally live here.
  assert.deepEqual(ILLUSTRATIVE_RESPONSES[CIRCULATION_INTERVENTIONS.FLUID], {
    strokeVolumeMultiplier: 1.22,
    systemicVascularResistanceMultiplier: 1,
  });
  assert.deepEqual(ILLUSTRATIVE_RESPONSES[CIRCULATION_INTERVENTIONS.DOBUTAMINE], {
    strokeVolumeMultiplier: 1.4,
    systemicVascularResistanceMultiplier: 0.72,
  });
});

test('calibration: fixed oxygen content makes global DO2 proportional to cardiac output', () => {
  // Defends `fixed-oxygen-content`. Fixing Hb/SaO2/PaO2 is an illustrative
  // isolation, not a claim about what either intervention does in a patient.
  const states = Object.values(CIRCULATION_INTERVENTIONS).map((intervention) =>
    solveCirculation({ intervention })
  );
  const content = states[0].arterialOxygenContentMlDl;
  for (const state of states) {
    assert.equal(state.arterialOxygenContentMlDl, content);
    assert.ok(Math.abs(state.oxygenDeliveryMlMin / state.cardiacOutputLMin - content * 10) < 1e-12);
  }
});

// ===========================================================================
// COPD
// ===========================================================================

test('calibration: the reference lung lands on the textbook volumes and time constant', () => {
  // Defends `reference-lung`. The resistance, compliance and chest-wall recoil
  // were chosen to hit these three figures; that they still do is a property of
  // the choice, not a discovery. The literature's own figures are recorded in
  // docs/model-evidence/copd.md as the targets they are.
  const normal = lungMechanics({ airwayResistance: 1, elasticRecoil: 1 });
  assert.ok(
    normal.timeConstantS > 0.35 && normal.timeConstantS < 0.9,
    `the reference τ drifted to ${normal.timeConstantS} s, away from the ~0.55 s it was tuned to`
  );
  assert.ok(normal.residualVolumeL > 1 && normal.residualVolumeL < 1.5, `RV ${normal.residualVolumeL} L`);
  assert.ok(normal.relaxedVolumeL > 2.1 && normal.relaxedVolumeL < 2.7, `FRC ${normal.relaxedVolumeL} L`);
  assert.ok(normal.totalLungCapacityL > 5.5 && normal.totalLungCapacityL < 6.5, `TLC ${normal.totalLungCapacityL} L`);
  // And the scene's default obstructed lung, which the walk-through quotes.
  const obstructed = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6 });
  assert.ok(obstructed.timeConstantS > 2 && obstructed.timeConstantS < 4, `τ ${obstructed.timeConstantS} s`);
});

test('calibration: the tethering exponent puts the flow ceiling where it was tuned to sit', () => {
  // Defends `tethering-exponent`. That the upstream resistance rises when
  // recoil is lost is external and is asserted in the physiology layer; how
  // steeply it rises is this number, and it was chosen to put mid-expiratory
  // maximal flow in the reported range for both lungs.
  const normal = lungMechanics({ airwayResistance: 1, elasticRecoil: 1 });
  const emphysema = lungMechanics({ airwayResistance: 1, elasticRecoil: 0.6 });
  const ratio = emphysema.upstreamResistance / normal.upstreamResistance;
  assert.ok(ratio > 2 && ratio < 4, `the upstream resistance ratio drifted to ${ratio}×`);

  // The consequence it was tuned for: a normal lung is never flow-limited at
  // rest, and the scene's obstructed lung is limited for most of a hard breath.
  assert.equal(settledLung({ airwayResistance: 1, elasticRecoil: 1, demand: 0 }).flowLimitedFraction, 0);
  assert.ok(settledLung({ airwayResistance: 3, elasticRecoil: 0.6, demand: 1 }).flowLimitedFraction > 0.8);
});

test('calibration: the bronchodilator split favours total resistance over the ceiling', () => {
  // Defends `bronchodilator-split`, and this is the assertion the final review
  // singled out. Both percentages are invented, and so is the ratio between
  // them. What is external — that bronchodilation lowers airway resistance,
  // shortens τ, can lower operating volumes, and does not restore destroyed
  // recoil or alveolar attachments — is asserted in the physiology layer with
  // no magnitudes at all. This is the model's parameterisation, and only that.
  const before = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6, bronchodilation: 0 });
  const after = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6, bronchodilation: 1 });
  const resistanceRelief = 1 - after.resistance / before.resistance;
  const ceilingRelief = 1 - after.upstreamResistance / before.upstreamResistance;

  assert.ok(Math.abs(resistanceRelief - 0.28) < 0.01, `total-resistance relief drifted to ${resistanceRelief}`);
  assert.ok(Math.abs(ceilingRelief - 0.1) < 0.01, `upstream relief drifted to ${ceilingRelief}`);
  assert.ok(resistanceRelief > ceilingRelief * 2, 'the split is meant to be strongly asymmetric');
});

test('calibration: the workload recruits expiratory pressure without reference to the lung', () => {
  // Defends `workload-expiratory-recruitment`. The size is invented; the
  // independence is the point, and it is what makes "a fixed expiratory effort"
  // a condition the model can be held to.
  assert.equal(breathingPattern(0).expiratoryPressureCmH2O, 0, 'quiet expiration is passive');
  assert.ok(breathingPattern(1).expiratoryPressureCmH2O > breathingPattern(0.5).expiratoryPressureCmH2O);
  assert.ok(breathingPattern(1).expiratoryPressureCmH2O < 12, 'and stays modest');

  // Independent of the lung: two very different lungs at the same workload are
  // given the same expiratory pressure.
  const easy = settledLung({ airwayResistance: 1, elasticRecoil: 1, demand: 0.6 });
  const hard = settledLung({ airwayResistance: 4, elasticRecoil: 0.45, demand: 0.6 });
  assert.equal(easy.expiratoryPressureCmH2O, hard.expiratoryPressureCmH2O);
});

test('calibration: the unit spread has the width it was given, and does not move the mean lung', () => {
  // Defends `heterogeneity-width`. The widths are invented. What must hold is
  // that adding heterogeneity leaves the whole lung's time constant exactly
  // where a uniform lung would have put it — otherwise the spread would be
  // quietly changing the answer rather than only its distribution.
  const mechanics = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6 });
  assert.equal(mechanics.units.length, UNIT_COUNT);
  assert.ok(
    Math.abs(mechanics.timeConstantS - mechanics.resistance * mechanics.compliance) < 1e-12,
    'the whole lung’s τ has to be R·C exactly, however the units are scattered'
  );
  const spread = mechanics.slowestTimeConstantS / mechanics.fastestTimeConstantS;
  assert.ok(spread > 2 && spread < 8, `the spread of unit time constants drifted to ${spread}×`);
  assert.ok(REFERENCE.expiratoryResistance === 5 && REFERENCE.compliance === 0.11, 'the reference pair moved');
});

test('calibration: expiratory pressure buys the volume this parameterisation was tuned to give', () => {
  // The magnitudes taken out of the physiology layer. That effort empties a
  // lung with ceiling to spare, and buys less once the ceiling is met, are
  // directions asserted there. These are the sizes, and they follow from the
  // tethering exponent and the reference pair.
  const gain = (elasticRecoil) => {
    const lung = { airwayResistance: 3, elasticRecoil, demand: 0.6 };
    const passive = settledLung({ ...lung, expiratoryPressureCmH2O: 0 });
    const pushed = settledLung({ ...lung, expiratoryPressureCmH2O: 15 });
    return passive.endExpiratoryVolumeL - pushed.endExpiratoryVolumeL;
  };
  const preserved = gain(1);
  const lost = gain(0.6);
  assert.ok(preserved > 0.5, `15 cmH₂O bought only ${preserved} L in a recoil-preserved lung`);
  assert.ok(lost < preserved * 0.3, `and ${lost} L in an emphysematous one, against ${preserved} L`);
});

// ===========================================================================
// Asthma
// ===========================================================================

test('calibration: the tree’s resistance is a ratio to itself, so the approximation cancels', () => {
  // Defends `fourth-power-approximation`. Poiseuille's law is true of an ideal
  // tube and that is asserted in the physiology layer. Applying it to every
  // generation of a branching tree is an approximation, and it survives only
  // because every resistance this model reports is a ratio to the same tree
  // unstimulated. So the guarantee to check is that **no absolute resistance
  // escapes**, and that the healthy reference tree is exactly 1.
  // Within the solver's own tolerance: the baseline is computed at uniform
  // ventilation and the reference is solved to a fixed point, so they agree to
  // rather better than anything downstream reports.
  const healthy = solveAsthma({ stimulus: 0, hyperresponsiveness: 1, wallThickening: 0 });
  assert.ok(Math.abs(healthy.resistanceRatio - 1) < 1e-4, `the reference tree drifted to ${healthy.resistanceRatio}×`);
  assert.ok(Math.abs(healthy.totalVentilation - 1) < 1e-4, 'and its ventilation from 1');

  // Nothing downstream may report a resistance with a unit on it.
  const solved = solveAsthma({ stimulus: 0.8 });
  for (const key of Object.keys(solved)) {
    assert.ok(
      !/Pa|CmH2O|MmHg|PerS|PerMin/.test(key),
      `"${key}" looks like an absolute quantity, which this model may not produce`
    );
  }
});

test('calibration: each generation is narrower than the last by the homothety ratio', () => {
  // Defends `symmetric-dichotomy`. Weibel's ideal ratio, in an idealised tree.
  // Real branching is asymmetric and a lung has twenty-three generations; this
  // asserts the idealisation is intact, not that a lung is like it.
  assert.equal(TREE.length, 2 ** GENERATIONS - 1);
  assert.equal(TERMINAL_COUNT, 2 ** (GENERATIONS - 1));
  for (let generation = 3; generation < GENERATIONS; generation++) {
    const mean = (g) => {
      const branches = TREE.filter((branch) => branch.generation === g);
      return branches.reduce((sum, branch) => sum + branch.baseRadius, 0) / branches.length;
    };
    assert.ok(Math.abs(mean(generation) / mean(generation - 1) - HOMOTHETY) < 0.03);
  }
});

test('calibration: the constrictibility weights have the profile they were given', () => {
  // Defends `constrictibility-weights`, and this is the second assertion the
  // final review singled out. The anatomy — smooth muscle present throughout,
  // cartilage falling away distally, distal calibre more strongly affected — is
  // asserted in the physiology layer with no numbers. These are the numbers.
  assert.ok(Math.abs(smoothMuscleFraction(0) - 0.45) < 1e-9, 'the tracheal muscle fraction moved');
  assert.equal(smoothMuscleFraction(GENERATIONS - 1), 1);
  assert.ok(Math.abs(cartilageSupport(0) - 0.85) < 1e-9, 'the tracheal cartilage support moved');
  assert.equal(cartilageSupport(GENERATIONS - 1), 0);

  // The peripheral-to-central ratio, which used to sit in the physiology layer
  // as "> ×3". It is a consequence of two invented profiles and belongs here.
  const ratio = constrictibilityWeight(GENERATIONS - 1) / constrictibilityWeight(0);
  assert.ok(ratio > 3, `the peripheral-to-central ratio drifted to ${ratio}×`);

  // The ramp this repository chose happens to rise monotonically. That is a
  // property of the ramp — there is no continuous quantitative law in the
  // literature to hold it to — so it is asserted here and not there.
  for (let generation = 1; generation < GENERATIONS; generation++) {
    assert.ok(constrictibilityWeight(generation) >= constrictibilityWeight(generation - 1));
  }
});

test('calibration: the coupling exponent is what decides patchy against uniformly shut', () => {
  // Defends `tethering-coupling`. The single parameter this model's behaviour
  // is most sensitive to, and it is not derived from anything. What is checked
  // is that the tuned value still produces the regime it was tuned for: a lung
  // that goes patchy partway up the dose rather than tipping all at once.
  const middle = solveAsthma({ stimulus: 0.8, hyperresponsiveness: 1.2, wallThickening: 0.25 });
  const extreme = solveAsthma({ stimulus: 1, hyperresponsiveness: 1.2, wallThickening: 0.25 });
  assert.ok(middle.converged && extreme.converged, 'both have to settle');
  assert.ok(middle.heterogeneity > 0.5, `patchiness at the knee drifted to CV ${middle.heterogeneity}`);
  assert.ok(middle.largestDefectFraction > 0.05, 'and the clusters have to be worth looking at');
  assert.ok(extreme.totalVentilation < middle.totalVentilation, 'and the lung has to keep closing past it');
});

test('calibration: the dose-response has the knee this parameterisation was chosen to give', () => {
  // Defends `response-steepness`. A sigmoid smooth-muscle response is standard;
  // a steepness of 6 is not, and the knee's sharpness is a joint property of it
  // and the coupling exponent.
  const curve = doseResponse({});
  const at = (stimulus) =>
    curve.reduce((best, point) =>
      Math.abs(point.stimulus - stimulus) < Math.abs(best.stimulus - stimulus) ? point : best
    );
  const rest = at(0).resistanceRatio;
  assert.ok(at(0.3).resistanceRatio < rest * 1.15, 'the bottom of the curve has to stay flat');
  const firstHalf = at(0.5).resistanceRatio - rest;
  const secondHalf = at(1).resistanceRatio - at(0.5).resistanceRatio;
  assert.ok(secondHalf > firstHalf * 6, `the knee flattened out: ${firstHalf} then ${secondHalf}`);
});

test('calibration: inherited sensitivity is what turns speckle into regions', () => {
  // Defends `inherited-sensitivity`. That the defects cluster is asserted in
  // the physiology layer against the structure of the tree. That they cluster
  // *because seven tenths of a branch's responsiveness comes from its parent*
  // is this repository's mechanism for it, and the share is invented.
  const correlation = () => {
    const pairs = TREE.filter((branch) => branch.index > 0).map((branch) => [
      TREE[Math.floor((branch.index - 1) / 2)].sensitivity,
      branch.sensitivity,
    ]);
    const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const xs = pairs.map(([x]) => x);
    const ys = pairs.map(([, y]) => y);
    const mx = mean(xs);
    const my = mean(ys);
    const cov = mean(pairs.map(([x, y]) => (x - mx) * (y - my)));
    const sx = Math.sqrt(mean(xs.map((x) => (x - mx) ** 2)));
    const sy = Math.sqrt(mean(ys.map((y) => (y - my) ** 2)));
    return cov / (sx * sy);
  };
  assert.ok(correlation() > 0.6, `parent-to-child responsiveness correlation drifted to ${correlation()}`);
});

test('calibration: the maximum narrowing bounds how far the model can go', () => {
  // Defends `maximum-narrowing`. An invented ceiling on the model's range.
  const shut = solveAsthma({ stimulus: 1, hyperresponsiveness: 1.8, wallThickening: 0 });
  const narrowest = Math.min(...shut.calibres.map((calibre) => calibre.openFraction));
  assert.ok(narrowest > 0.3, `an airway narrowed to ${narrowest} of its baseline, past the intended floor`);
});

test('calibration: relaxing the muscle beats stretching the lung, at this model’s control ranges', () => {
  // The comparison taken out of the physiology layer. Both controls have ranges
  // this repository chose — how much drive a full bronchodilator removes, how
  // far the inflation slider goes — so which of them wins at their respective
  // maxima is a property of those ranges and not of asthma. The scene's second
  // challenge teaches this ordering, so it is worth defending; it is simply not
  // a physiological invariant.
  const controls = { stimulus: 0.8, hyperresponsiveness: 1.2, wallThickening: 0.25 };
  const stretched = solveAsthma({ ...controls, lungInflation: 1.3 });
  const relaxed = solveAsthma({ ...controls, bronchodilator: 1 });
  assert.ok(
    relaxed.resistanceRatio < stretched.resistanceRatio,
    `full bronchodilation ${relaxed.resistanceRatio}× against full inflation ${stretched.resistanceRatio}×`
  );
  assert.ok(relaxed.heterogeneity < stretched.heterogeneity);
});

test('calibration: the acinar resistance keeps the last bifurcation from dominating', () => {
  // Not a named registry entry on its own — it is part of what makes the
  // baseline tree "nearly uniform" — but it is a tuned constant and it belongs
  // on this side of the line. Too low and the terminal splits dominate the
  // distribution; too high and nothing upstream matters.
  const quiet = solveAsthma({ stimulus: 0, hyperresponsiveness: 1, wallThickening: 0 });
  assert.ok(quiet.heterogeneity < 0.1, `the unstimulated tree drifted to CV ${quiet.heterogeneity}`);
  const { equivalent } = solveTree(quiet.calibres);
  assert.ok(equivalent[0] > 0, 'and the tree still costs something');
});

// ===========================================================================
// Portal hypertension
// ===========================================================================

test('calibration: a healthy liver lands where this model was tuned to put it', () => {
  // Defends `reference-resistances`. The three resistances were chosen to hit
  // these figures — the literature's own normal HVPG of 1–5 mmHg and a portal
  // flow of the order of a litre a minute. That they still do is a property of
  // the choice. This used to sit in the physiology layer, where it read as
  // though the model had discovered the normal range.
  const healthy = solvePortalCirculation({});
  assert.ok(
    healthy.hepaticVenousPressureGradientMmHg >= 1 && healthy.hepaticVenousPressureGradientMmHg <= 5,
    `HVPG drifted to ${healthy.hepaticVenousPressureGradientMmHg} mmHg`
  );
  assert.ok(
    healthy.portalLiverFlowMlPerMin > 800 && healthy.portalLiverFlowMlPerMin < 1300,
    `portal flow drifted to ${healthy.portalLiverFlowMlPerMin} mL/min`
  );
  assert.ok(healthy.shuntFraction < 0.03, 'and almost nothing should bypass a healthy liver');
});

test('calibration: the dynamic component is a share of what the structure already costs', () => {
  // Defends `dynamic-tone-parameterisation`, and this is the third assertion
  // the final review singled out. That a reversible component exists and is a
  // minority of the total is external and is asserted in the physiology layer.
  // That it is *30% of the structural resistance, multiplicatively* is this
  // model's choice, and the consequence — worth more in a scarred liver than in
  // a healthy one — is a property of that choice.
  const structural = vascularResistances({ structuralResistance: 8, dynamicTone: 0 });
  const withTone = vascularResistances({ structuralResistance: 8, dynamicTone: 1 });
  assert.ok(
    Math.abs(withTone.intrahepatic / structural.intrahepatic - (1 + DYNAMIC_SHARE_AT_FULL_TONE)) < 1e-9,
    'the dynamic share moved'
  );
  const healthyGain =
    vascularResistances({ structuralResistance: 1, dynamicTone: 1 }).intrahepatic -
    vascularResistances({ structuralResistance: 1, dynamicTone: 0 }).intrahepatic;
  const scarredGain = withTone.intrahepatic - structural.intrahepatic;
  assert.ok(scarredGain > healthyGain * 5, 'the multiplicative form is what makes it worth more when scarred');
});

test('calibration: the collateral mapping is smooth, and is not a valve', () => {
  // Defends `collateral-conductance-mapping`. That 10 mmHg is a clinical
  // threshold rather than an opening pressure is asserted in the physiology
  // layer, without reference to the width. The width is invented, and this is
  // where its consequences are pinned.
  assert.ok(establishedCollateralFraction(3, 1) < 0.05, 'a healthy gradient establishes almost nothing');
  const half = establishedCollateralFraction(10, 1);
  assert.ok(half > 0.4 && half < 0.6, `half-establishment drifted to ${half} at ten mmHg`);
  assert.ok(establishedCollateralFraction(18, 1) > 0.9, 'and it is essentially complete well above');
  assert.equal(establishedCollateralFraction(18, 0), 0, 'propensity zero means none at any pressure');
  let previous = 0;
  for (let gradient = 0; gradient <= 30; gradient += 0.5) {
    const value = establishedCollateralFraction(gradient, 1);
    assert.ok(value - previous < 0.25, `a step of ${value - previous} at ${gradient} mmHg would read as a valve`);
    previous = value;
  }
});

test('calibration: the collateral and shunt resistances land the two configurations where they were aimed', () => {
  // Defends `collateral-and-shunt-resistance`, and this is the fourth group the
  // final review singled out. Every number here is a consequence of two chosen
  // resistances: the residual gradient with collaterals fully established, the
  // share of flow they take, whether a full shunt clears 12 mmHg, and how far
  // hepatic portal flow falls when it does.
  //
  // The external claims — collaterals divert flow and leave the driving
  // pathophysiology in place; a TIPS is a low-resistance path that lowers the
  // gradient and diverts blood past the liver; below 12 mmHg is the Baveno VII
  // post-TIPS target in variceal bleeding — are all in the physiology layer,
  // with no magnitudes.
  const cirrhotic = { structuralResistance: 10, splanchnicVasodilation: 1 };
  const open = solvePortalCirculation({ ...cirrhotic, collateralPropensity: 1 });
  assert.ok(
    open.portalPressureGradientMmHg > 15,
    `with collaterals fully established the gradient drifted to ${open.portalPressureGradientMmHg} mmHg`
  );
  assert.ok(open.shuntFraction > 0.5, `the collateral share of flow drifted to ${open.shuntFraction}`);

  const shunted = solvePortalCirculation({ ...cirrhotic, tips: 1 });
  assert.ok(
    shunted.portalPressureGradientMmHg < 12,
    `a fully dilated shunt reached only ${shunted.portalPressureGradientMmHg} mmHg`
  );
  assert.ok(
    shunted.portalLiverFlowMlPerMin < open.portalLiverFlowMlPerMin * 0.5,
    `hepatic portal flow fell only to ${shunted.portalLiverFlowMlPerMin} mL/min`
  );
});

test('calibration: the model’s HVPG is the sinusoidal segment exactly, by construction', () => {
  // Defends `wedged-equals-sinusoidal`. The prose everywhere says WHVP
  // *approximates* sinusoidal pressure; the arithmetic says equals. That gap is
  // an idealisation, and pinning it here keeps it from being mistaken for the
  // established claim about what HVPG measures.
  const state = solvePortalCirculation({ structuralResistance: 8, haemodynamicPattern: 1 });
  const [portal, sinusoid, hepatic] = state.pressureProfile;
  assert.equal(state.sinusoidalPressureMmHg, sinusoid.pressureMmHg);
  assert.ok(
    Math.abs(state.hepaticVenousPressureGradientMmHg - (sinusoid.pressureMmHg - hepatic.pressureMmHg)) < 1e-12,
    'the reported HVPG has to be the sinusoidal drop exactly'
  );
  assert.ok(portal.pressureMmHg > sinusoid.pressureMmHg, 'with the presinusoidal drop above it');
});

test('calibration: hepatic portal perfusion falls by the margin this progression was tuned to give', () => {
  // The magnitude taken out of the physiology layer. That perfusion falls along
  // the scene's axis is external and is asserted there at every step; that it
  // more than halves over this particular range of structural resistance is a
  // consequence of the reference resistances.
  const curve = progressionCurve({ splanchnicVasodilation: 0 });
  const fall = curve[curve.length - 1].portalLiverFlowMlPerMin / curve[0].portalLiverFlowMlPerMin;
  assert.ok(fall < 0.5, `hepatic portal flow fell only to ${fall} of baseline over the progression`);
});

// ---------------------------------------------------------------------------
// Hepatorenal syndrome
// ---------------------------------------------------------------------------

test('calibration: the healthy kidney reproduces its reference flows and a filtration fraction near a fifth', () => {
  // The arteriolar resistances and the ultrafiltration coefficient were
  // derived from these targets, so hitting them is a check that the derivation
  // is still the one in the file — not evidence about anybody's kidney.
  const healthy = solveKidney({ meanArterialPressureMmHg: 90, activation: 0 });
  assert.ok(Math.abs(healthy.renalBloodFlowMlPerMin - RENAL_REFERENCE.renalBloodFlowMlPerMin) < 1);
  assert.ok(
    Math.abs(
      healthy.glomerularFiltrationRateMlPerMin - RENAL_REFERENCE.glomerularFiltrationRateMlPerMin
    ) < 1
  );
  assert.ok(Math.abs(healthy.glomerularPressureMmHg - RENAL_REFERENCE.glomerularPressureMmHg) < 0.5);
  assert.ok(
    Math.abs(healthy.filtrationFraction - 0.2) < 0.02,
    `filtration fraction ${healthy.filtrationFraction}, and a fifth is what it was aimed at`
  );
  assert.ok(Math.abs(KF - 12) < 0.5, `Kf ${KF} mL/min/mmHg`);
});

test('calibration: a healthy liver solves to the reference circulation it was anchored at', () => {
  // The non-splanchnic conductance is defined as whatever is left over once
  // the healthy splanchnic circulation has taken its share of the reference
  // output, so a healthy liver has to come back out at the anchor exactly.
  const healthy = solveHepatorenal({ structuralResistance: 1, splanchnicVasodilation: 0 });
  assert.ok(healthy.converged);
  assert.ok(
    Math.abs(
      healthy.systemic.meanArterialPressureMmHg - SYSTEMIC_REFERENCE.meanArterialPressureMmHg
    ) < 0.01
  );
  assert.ok(
    Math.abs(healthy.systemic.cardiacOutputMlPerMin - SYSTEMIC_REFERENCE.cardiacOutputMlPerMin) < 1
  );
  assert.equal(healthy.neurohumoral.activation, 0);
  assert.ok(
    Math.abs(healthy.systemic.splanchnicShareOfOutput - 0.2) < 0.03,
    `the splanchnic bed took ${healthy.systemic.splanchnicShareOfOutput} of the output`
  );
  assert.ok(Math.abs(REFERENCE_SVR - 1.032) < 0.01);
});

test('calibration: the cardiac compensation exponent sets how far pressure falls for a given dilation', () => {
  // Arterial pressure goes as the resistance ratio to the power of one minus
  // the exponent. That is the functional form the constant lives in, and this
  // is the test that owns both.
  assert.ok(CARDIAC_COMPENSATION_EXPONENT > 0 && CARDIAC_COMPENSATION_EXPONENT < 1);
  const state = solveHepatorenal({ structuralResistance: 10, splanchnicVasodilation: 0.9 });
  const ratio = state.systemic.systemicVascularResistance / REFERENCE_SVR;
  const predicted =
    (SYSTEMIC_REFERENCE.meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE) *
      ratio ** (1 - CARDIAC_COMPENSATION_EXPONENT) +
    CENTRAL_VENOUS_PRESSURE;
  assert.ok(
    Math.abs(predicted - state.systemic.meanArterialPressureMmHg) < 0.01,
    `${predicted} vs ${state.systemic.meanArterialPressureMmHg}`
  );
  // And the range it produces: advanced disease lands in the seventies and
  // eighties with a raised output, which is what it was chosen for.
  assert.ok(state.systemic.meanArterialPressureMmHg > 72 && state.systemic.meanArterialPressureMmHg < 86);
  assert.ok(state.systemic.cardiacOutputMlPerMin > 5500);
});

test('calibration: the activation curve is a saturating function of the pressure deficit', () => {
  // Half activation at the chosen deficit, saturating rather than linear, and
  // never leaving nought to one. An index, with no units and no concentration
  // behind it.
  const reference = SYSTEMIC_REFERENCE.meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE;
  const half = vasoconstrictorActivation(
    CENTRAL_VENOUS_PRESSURE + reference * (1 - ACTIVATION_HALF_PRESSURE_DEFICIT)
  );
  assert.ok(Math.abs(half.activation - 0.5) < 1e-9);
  assert.equal(vasoconstrictorActivation(SYSTEMIC_REFERENCE.meanArterialPressureMmHg).activation, 0);
  assert.ok(vasoconstrictorActivation(20).activation < 1);
  assert.ok(vasoconstrictorActivation(20).activation > 0.8);
  // Saturating: the second half of the deficit buys less than the first.
  const a = vasoconstrictorActivation(CENTRAL_VENOUS_PRESSURE + reference * 0.9).activation;
  const b = vasoconstrictorActivation(CENTRAL_VENOUS_PRESSURE + reference * 0.8).activation;
  const c = vasoconstrictorActivation(CENTRAL_VENOUS_PRESSURE + reference * 0.7).activation;
  assert.ok(b - a > c - b);
});

test('calibration: the systemic limb of the vasodilation sets how far resistance can fall', () => {
  // The split between splanchnic and non-splanchnic vasodilation is invented.
  // This is the assertion that it is the split the file says it is, and that
  // the resistance fall it produces is the one it was chosen for.
  assert.ok(SYSTEMIC_VASODILATION_GAIN > 0);
  const worst = solveHepatorenal({ structuralResistance: 12, splanchnicVasodilation: 1 });
  const fall = 1 - worst.systemic.systemicVascularResistance / REFERENCE_SVR;
  assert.ok(fall > 0.25 && fall < 0.4, `systemic resistance fell by ${fall}`);
});

test('calibration: the four constrictor gains produce a defended phase and then a failing one', () => {
  // The ordering the gains encode is external; their sizes are not, and what
  // they buy is the shape of the trajectory: filtration held while blood flow
  // falls, then filtration failing. The severity at which the knee falls is a
  // consequence of these numbers and is not a prediction about anybody.
  assert.ok(EFFERENT_CONSTRICTOR_GAIN > 0);
  assert.ok(KF_CONSTRICTOR_REDUCTION > 0 && KF_CONSTRICTOR_REDUCTION < 1);
  assert.ok(AFFERENT_PROSTAGLANDIN_PROTECTION > 0 && AFFERENT_PROSTAGLANDIN_PROTECTION < 1);

  const steps = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) =>
    solveHepatorenal({ structuralResistance: 1 + 11 * t, splanchnicVasodilation: t })
  );
  const knee = steps.findIndex((s) => !s.kidney.autoregulating);
  assert.ok(knee > 1 && knee < steps.length - 1, `the knee fell at step ${knee}`);
  assert.ok(steps.at(-1).kidney.glomerularFiltrationRateMlPerMin < 60);
  assert.ok(steps.at(-1).kidney.glomerularFiltrationRateMlPerMin > 30);
  assert.ok(steps.at(-1).kidney.renalBloodFlowMlPerMin < 800);
  // The filtration fraction rises before it falls, and the peak is where the
  // efferent arteriole is working and the afferent one still is not.
  const fractions = steps.map((s) => s.kidney.filtrationFraction);
  const peak = fractions.indexOf(Math.max(...fractions));
  assert.ok(peak > 0 && peak < fractions.length - 1, `the filtration fraction peaked at ${peak}`);
  assert.ok(fractions.at(-1) < fractions[0]);
});

test('calibration: autoregulation is a permitted resistance band with a chosen width', () => {
  // Autoregulation here is a band, not a mechanism. Its width is invented and
  // the lower limit of autoregulation is a consequence of the width rather
  // than a value taken from anywhere.
  assert.ok(AFFERENT_AUTOREGULATION.minimumFactor < 1);
  assert.ok(AFFERENT_AUTOREGULATION.maximumFactor > 1);
  let limit = 0;
  for (let map = 140; map > 20; map -= 0.25) {
    if (solveKidney({ meanArterialPressureMmHg: map, activation: 0 }).autoregulatoryReserve <= 0) {
      limit = map;
      break;
    }
  }
  assert.ok(limit > 65 && limit < 78, `the lower limit of autoregulation came out at ${limit} mmHg`);
});

test('calibration: the oncotic pressure is a constant and filtration equilibrium is not modelled', () => {
  // A single mean value stands in for a pressure that rises along the
  // capillary. The consequence is that filtration here can never be stopped by
  // oncotic pressure part-way along, and this is the test that says so.
  assert.equal(typeof PLASMA_ONCOTIC_PRESSURE, 'number');
  const a = solveKidney({ meanArterialPressureMmHg: 90, activation: 0 });
  const b = solveKidney({ meanArterialPressureMmHg: 60, activation: 0.8 });
  assert.equal(
    a.glomerularPressureMmHg - a.netFiltrationPressureMmHg,
    b.glomerularPressureMmHg - b.netFiltrationPressureMmHg,
    'the opposing pressures have to be the same constant in both states'
  );
});

test('calibration: the efferent resistance is the whole path from glomerulus to renal vein', () => {
  // Efferent arteriole and peritubular bed as one number, derived from the
  // reference so that the glomerular pressure lands where it was aimed.
  const flow = RENAL_REFERENCE.renalBloodFlowMlPerMin / 60;
  assert.ok(
    Math.abs(
      REFERENCE_EFFERENT_RESISTANCE * flow -
        (RENAL_REFERENCE.glomerularPressureMmHg - CENTRAL_VENOUS_PRESSURE)
    ) < 1e-9
  );
  assert.ok(
    Math.abs(
      REFERENCE_AFFERENT_RESISTANCE * flow -
        (SYSTEMIC_REFERENCE.meanArterialPressureMmHg - RENAL_REFERENCE.glomerularPressureMmHg)
    ) < 1e-9
  );
});

test('calibration: the treatment effect sizes are the ones this model was given', () => {
  // How much of the vasodilation a full dose reverses, and how much output a
  // full course of albumin buys. Both invented; neither is a dose.
  assert.ok(TERLIPRESSIN_SPLANCHNIC_EFFECT > 0 && TERLIPRESSIN_SPLANCHNIC_EFFECT <= 1);
  assert.ok(ALBUMIN_OUTPUT_GAIN > 0 && ALBUMIN_OUTPUT_GAIN < 0.5);

  const sick = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const treated = solveHepatorenal({ ...sick, terlipressin: 1 });
  assert.ok(
    Math.abs(treated.effectiveSplanchnicVasodilation - (0.9 - TERLIPRESSIN_SPLANCHNIC_EFFECT)) < 1e-9
  );
  const withAlbumin = solveHepatorenal({ ...sick, albumin: 1 });
  const without = solveHepatorenal(sick);
  assert.ok(withAlbumin.systemic.cardiacOutputMlPerMin > without.systemic.cardiacOutputMlPerMin);
  assert.ok(
    withAlbumin.kidney.glomerularFiltrationRateMlPerMin >
      without.kidney.glomerularFiltrationRateMlPerMin
  );
});

test('calibration: the constriction gain leaves the resistance fall intact', () => {
  // The parallel law says that opening one bed lowers total resistance **when
  // the others hold still**. Here they do not — they constrict, driven by the
  // same signal — so whether the total still falls is a question about two
  // gains this repository chose, and it is answered here rather than in the
  // external layer where it used to sit.
  assert.ok(SYSTEMIC_CONSTRICTION_GAIN > 0, 'nothing is compensating at all');
  const resistances = [0, 0.25, 0.5, 0.75, 1].map(
    (splanchnicVasodilation) =>
      solveHepatorenal({ structuralResistance: 6, splanchnicVasodilation }).systemic
        .systemicVascularResistance
  );
  for (let i = 1; i < resistances.length; i += 1) {
    assert.ok(
      resistances[i] < resistances[i - 1],
      `the compensation reversed the fall between steps ${i - 1} and ${i}: ${resistances}`
    );
  }
  // And the compensation is doing something, or the test would be vacuous: the
  // fall is smaller than it would be with the other beds held still.
  const held = 1 / (1 / REFERENCE_SVR + (1 / resistances.at(-1) - 1 / resistances[0]));
  assert.ok(resistances.at(-1) > held, 'the other beds are not constricting at all');
});

test('calibration: the default path raises cardiac output and the reserve control can reverse it', () => {
  // With cardiac reserve intact this model's axis raises output at every step.
  // That is the parameterisation, not a natural history — at the onset of
  // hepatorenal syndrome cardiac output has been observed to fall — so the
  // rising path is asserted here and the existence of the falling one is
  // asserted in the external layer.
  const rising = [0, 0.25, 0.5, 0.75, 1].map(
    (t) =>
      solveHepatorenal({
        structuralResistance: 1 + 11 * t,
        splanchnicVasodilation: t,
        cardiacReserve: 1,
      }).systemic.cardiacOutputMlPerMin
  );
  for (let i = 1; i < rising.length; i += 1) {
    assert.ok(rising[i] > rising[i - 1], `output did not rise at step ${i}: ${rising}`);
  }
  assert.ok(rising.at(-1) / rising[0] > 1.15, `output rose only to ${rising.at(-1) / rising[0]}×`);

  const advanced = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  assert.ok(
    solveHepatorenal({ ...advanced, cardiacReserve: 0 }).systemic.cardiacOutputMlPerMin <
      solveHepatorenal({ ...advanced, cardiacReserve: 1 }).systemic.cardiacOutputMlPerMin,
    'the reserve control cannot produce a lower-output path'
  );
});

// ---------------------------------------------------------------------------
// The chosen progression axis
//
// Everything below is a property of a path this repository picked through
// parameter space, or of what this parameterisation is capable of. None of it
// is a fact about a patient, and all of it used to be asserted in the external
// layer.
// ---------------------------------------------------------------------------

/** The scene's own axis: scarring and the vasodilation it induces, together. */
const along = (t) => ({ structuralResistance: 1 + 11 * t, splanchnicVasodilation: t });
const AXIS = [0, 0.2, 0.4, 0.6, 0.8, 1];

test('calibration: pressure falls at every step of the chosen progression axis', () => {
  // The arithmetic of incomplete compensation is external. That *this* axis
  // exercises it monotonically is a consequence of the chosen exponent applied
  // to a path this repository invented, and a patient's course need not be
  // monotonic in arterial pressure at all.
  const pressures = AXIS.map((t) => solveHepatorenal(along(t)).systemic.meanArterialPressureMmHg);
  for (let i = 1; i < pressures.length; i += 1) {
    assert.ok(pressures[i] < pressures[i - 1], `pressure did not fall at step ${i}: ${pressures}`);
  }
});

test('calibration: underfilling and activation rise at every step of the chosen axis', () => {
  // The external claim is local: a larger pressure deficit gives a larger
  // signal. The monotonicity along this axis is the path's, not cirrhosis's.
  const states = AXIS.map((t) => solveHepatorenal(along(t)));
  for (let i = 1; i < states.length; i += 1) {
    assert.ok(
      states[i].neurohumoral.arterialUnderfilling > states[i - 1].neurohumoral.arterialUnderfilling
    );
    assert.ok(states[i].neurohumoral.activation > states[i - 1].neurohumoral.activation);
  }
  assert.equal(states[0].neurohumoral.activation, 0, 'the axis has to start from a quiet circulation');
});

test('calibration: the counterfactual improves perfusion at every step, and filtration only past a later crossover', () => {
  // Two separate positions on the chosen axis, and it is easy to conflate
  // them. Perfusion is restored everywhere, because both arteriolar
  // resistances are monotonic in the activation. Filtration is *not*: early on
  // the efferent constriction is holding it up, and removing the signal takes
  // that support away. The crossover where the counterfactual starts helping
  // filtration lies **past** the knee, not at it — an earlier version of this
  // repository said "past the failure of autoregulation" and was wrong by
  // about a tenth of the axis.
  const fine = [];
  for (let t = 0; t <= 1.0001; t += 0.02) fine.push([t, solveHepatorenal(along(t))]);

  for (const [t, state] of fine) {
    if (t === 0) continue;
    assert.ok(
      kidneyWithoutTheSignal(state).renalBloodFlowMlPerMin > state.kidney.renalBloodFlowMlPerMin,
      `the counterfactual did not restore perfusion at ${t.toFixed(2)}`
    );
  }

  const knee = fine.find(([, s]) => !s.kidney.autoregulating)?.[0];
  const crossover = fine.find(
    ([, s]) =>
      kidneyWithoutTheSignal(s).glomerularFiltrationRateMlPerMin >
      s.kidney.glomerularFiltrationRateMlPerMin
  )?.[0];

  assert.ok(knee != null, 'the axis never reaches the failure of autoregulation');
  assert.ok(crossover != null, 'the counterfactual never starts improving filtration');
  assert.ok(
    crossover > knee,
    `the filtration crossover (${crossover}) should lie past the knee (${knee})`
  );
  assert.ok(knee > 0.4 && knee < 0.7, `the knee moved to ${knee}`);
  assert.ok(crossover > 0.55 && crossover < 0.8, `the crossover moved to ${crossover}`);

  // And below the crossover it goes the other way, which is the half that is
  // easy to state backwards.
  const early = solveHepatorenal(along(0.2));
  assert.ok(
    kidneyWithoutTheSignal(early).glomerularFiltrationRateMlPerMin <
      early.kidney.glomerularFiltrationRateMlPerMin,
    'early on, removing the signal should lower filtration, not raise it'
  );
});

test('calibration: the reserve control can drive a low-output path into the failing renal phase', () => {
  // That a falling cardiac output is a real route into HRS-AKI is supported.
  // That *this* model can represent one, and that under this calibration it
  // reaches the failing renal phase at this point on the axis, is a statement
  // about a parameterisation.
  const advanced = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const intact = solveHepatorenal({ ...advanced, cardiacReserve: 1 });
  const impaired = solveHepatorenal({ ...advanced, cardiacReserve: 0 });

  assert.ok(impaired.systemic.cardiacOutputMlPerMin < intact.systemic.cardiacOutputMlPerMin);
  assert.equal(impaired.kidney.autoregulating, false);
  assert.ok(impaired.kidney.glomerularFiltrationRateMlPerMin < 40);
  assert.ok(impaired.systemic.meanArterialPressureMmHg < 80);
});

test('calibration: the treatment slider improves pressure and filtration monotonically across its range', () => {
  // Strict monotonicity across a whole slider is not a clinical invariant, and
  // an earlier version of this repository asserted it as one — including a
  // strictly falling cardiac output. It is a property of a chosen effect size
  // over a chosen range, and reported resolution with a vasoconstrictor and
  // albumin is of the order of 40–50% rather than universal.
  const advanced = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const doses = [0, 0.25, 0.5, 0.75].map((terlipressin) =>
    solveHepatorenal({ ...advanced, terlipressin })
  );
  const rising = (values) => values.every((v, i) => i === 0 || v > values[i - 1]);
  const falling = (values) => values.every((v, i) => i === 0 || v < values[i - 1]);

  assert.ok(rising(doses.map((s) => s.systemic.meanArterialPressureMmHg)));
  assert.ok(falling(doses.map((s) => s.neurohumoral.activation)));
  assert.ok(rising(doses.map((s) => s.kidney.glomerularFiltrationRateMlPerMin)));
  assert.ok(
    falling(doses.map((s) => s.systemic.cardiacOutputMlPerMin)),
    'the hyperdynamic circulation should settle back rather than be driven harder'
  );
});

/* --------------------------------------------------------------------------
   Pulmonary oedema — the numbers this repository chose

   Nothing here is a fact about lungs. Each one pins a constant to the target it
   was chosen to reproduce, so that moving it has to be deliberate.
   -------------------------------------------------------------------------- */

test('calibration: a normal lung filters at its lymph flow and gains no water', () => {
  // The filtration coefficient was solved backwards from this: a resting lung
  // at a normal atrial pressure filters at the lymph flow a lung is observed to
  // carry, and therefore neither gains nor loses water.
  const resting = edemaStateAt(EDEMA_BASELINE_WATER_ML, {});
  assert.ok(
    Math.abs(resting.filtrationMlPerHour - EDEMA_LYMPHATICS.baselineFlowMlPerHour) < 0.5,
    `baseline filtration was ${resting.filtrationMlPerHour.toFixed(1)} mL/h`
  );
  assert.ok(Math.abs(resting.netAccumulationMlPerHour) < 0.5, 'a normal lung is in balance');
  // And the net Starling pressure that produces it is the small positive
  // number the textbooks give, not a large one cancelled by a small Kf.
  const net = resting.filtrationMlPerHour / resting.filtrationCoefficient;
  assert.ok(net > 0 && net < 3, `net filtration pressure was ${net.toFixed(2)} mmHg`);
});

test('calibration: an unadapted lung floods where the textbooks put the threshold', () => {
  // Conventionally, alveolar oedema in a previously normal lung above a wedge
  // pressure of about 25 mmHg. The threshold is searched for, never stored, so
  // this pins the constants that place it rather than the threshold itself.
  const threshold = edemaThreshold({});
  assert.ok(threshold !== null, 'an unadapted lung has a threshold at all');
  assert.ok(threshold > 20 && threshold < 28, `unadapted flooding threshold was ${threshold.toFixed(1)} mmHg`);
});

test('calibration: the lymphatic ceilings place the two thresholds where the model claims', () => {
  // The acute and chronic multiples are invented. What they are chosen for is
  // the gap between an unadapted lung and one that has lived at pressure.
  const unadapted = edemaThreshold({ chronicity: 0 });
  const adapted = edemaThreshold({ chronicity: 1 });
  assert.ok(adapted - unadapted > 10, `the adaptation should be worth more than 10 mmHg, got ${(adapted - unadapted).toFixed(1)}`);
  assert.ok(adapted < 50, 'and not so much that the lung becomes indestructible');
});

test('calibration: the interstitium fills across a clinically recognisable range of lung water', () => {
  // Extravascular lung water is measured in people, so the numbers this model
  // reports have to be the numbers a monitor would report: roughly 5 mL/kg dry,
  // roughly 10 mL/kg when oedema is called present.
  const kg = 70;
  assert.ok(
    EDEMA_BASELINE_WATER_ML / kg > 4 && EDEMA_BASELINE_WATER_ML / kg < 8,
    `a dry lung holds ${(EDEMA_BASELINE_WATER_ML / kg).toFixed(1)} mL/kg`
  );
  assert.ok(
    EDEMA_INTERSTITIUM.floodThresholdMl / kg > 8 && EDEMA_INTERSTITIUM.floodThresholdMl / kg < 13,
    `alveoli start filling at ${(EDEMA_INTERSTITIUM.floodThresholdMl / kg).toFixed(1)} mL/kg`
  );
});

test('calibration: diversion reduces the shunt without abolishing it', () => {
  // Hypoxic pulmonary vasoconstriction is real and partial. A fraction that
  // abolished the shunt would have made flooding harmless; one of zero would
  // have made the lung worse than it is.
  const fullyFlooded = edemaStateAt(EDEMA_MAXIMUM_WATER_ML, {});
  assert.equal(fullyFlooded.floodedFraction, 1, 'the test needs a completely flooded lung');
  assert.ok(fullyFlooded.shuntFraction > 0.5, `shunt was ${fullyFlooded.shuntFraction.toFixed(2)}`);
  assert.ok(fullyFlooded.shuntFraction < 0.85, 'but diversion keeps it short of the whole output');
});

test('calibration: the open biliary tree lands on an ordinary resting pressure', () => {
  // Defends `duct-resistances`. The four resistances were chosen to put an
  // unobstructed common bile duct near ten centimetres of water at an ordinary
  // bile flow, with nearly all of the normal resistance in the sphincter. That
  // they still do is a property of the choice, not a finding — and no pressure
  // this model reports is a threshold for anything.
  const open = solveBiliaryObstruction();
  const cbd = open.pressure['common-bile-duct'];
  assert.ok(cbd > 4 && cbd < 12, `the resting common bile duct drifted to ${cbd} cmH2O`);
  assert.ok(
    open.pressure['common-hepatic-duct'] - cbd < 1,
    'nearly all of the normal resistance is supposed to be the sphincter, so the ducts sit close together'
  );
  const pancreatic = open.pressure['pancreatic-duct'];
  assert.ok(pancreatic > cbd, `the pancreatic duct is supposed to sit higher: ${pancreatic} vs ${cbd}`);
  // And the gallbladder keeps up with a meal when nothing is blocking it.
  assert.ok(
    open.gallbladderTimeConstantMin < BILIARY_REFERENCE.gallbladderWindowMin / 3,
    `τ ${open.gallbladderTimeConstantMin} min against a ${BILIARY_REFERENCE.gallbladderWindowMin} min window`
  );
});

test('calibration: one occlusion resistance means the same thing at every site', () => {
  // Defends `occlusion-resistance`. It is added rather than multiplied so that
  // "complete" is site-independent — a stone is the same stone wherever it
  // lodges — and the number is large enough that a complete blockage delivers
  // almost nothing through the resistance it sits in. Neither is a measurement
  // of a stone, a stricture or a degree of stenosis.
  assert.ok(BILIARY_DEFAULTS.occlusionResistance > 500, BILIARY_DEFAULTS.occlusionResistance);
  const distal = solveBiliaryObstruction({ site: 'common-bile-duct', completeness: 1 });
  const ampullary = solveBiliaryObstruction({ site: 'ampulla', completeness: 1 });
  assert.ok(distal.bileDeliveredFraction < 0.1, distal.bileDeliveredFraction);
  assert.ok(ampullary.pancreaticDeliveredFraction < 0.1, ampullary.pancreaticDeliveredFraction);
  // The same addition at two sites leaves the bile path in the same state,
  // because the resistance it was added to is downstream of the same segments.
  assert.equal(
    distal.bileDeliveredFraction.toFixed(4),
    ampullary.bileDeliveredFraction.toFixed(4),
    'a blockage at the papilla and one just above it cost the bile path the same'
  );
});

test('calibration: a normal swallow clears and a failed one balances inside the organ', () => {
  // Defends `swallow-conductance` and `column-cross-section`. Two numbers were
  // chosen together: what the sphincter passes per millimetre of mercury, and
  // the cross-section a retained column stands in. They were chosen so that a
  // normal swallow clears with room to spare, a failed one settles somewhere a
  // human oesophagus has room for, and a complete failure has nowhere to settle.
  // That they still do is a property of the choice, not a finding — and no
  // figure here is a manometric value or a threshold.
  const normal = solveAchalasia({ relaxationFailure: 0, peristalticVigour: 1 });
  assert.equal(normal.retainedVolumeMl, 0, 'a normal swallow leaves nothing behind');

  const balanced = solveAchalasia({ relaxationFailure: 0.74, peristalticVigour: 0.3 });
  assert.ok(balanced.balanced, 'the middle of the range settles');
  assert.ok(
    balanced.retainedVolumeMl > 5 && balanced.retainedVolumeMl < ACHALASIA_CAPACITY_ML,
    `it settles at ${balanced.retainedVolumeMl} mL, inside a ${ACHALASIA_CAPACITY_ML} mL organ`
  );
  assert.ok(
    balanced.columnHeightCm < ACHALASIA_REFERENCE.lengthCm,
    `and at ${balanced.columnHeightCm} cm, inside a ${ACHALASIA_REFERENCE.lengthCm} cm one`
  );

  assert.equal(
    solveAchalasia({ relaxationFailure: 1, peristalticVigour: 0 }).balanced,
    false,
    'and a complete failure has nowhere to settle'
  );
});

test('calibration: the prostatic enlargement model starts from the atlas’s own zone proportions', () => {
  // Defends `zone-display-proportions`. The resting shares are not anatomy:
  // they are the proportions `prostateAnatomy.js` draws, chosen there so four
  // zones can be told apart on screen. The scene is drawn on that atlas, so
  // the two have to agree — and this test is what keeps them agreeing.
  //
  // What is being defended is the agreement and the shape it produces, never
  // the numbers themselves. No prostate volume follows from any of this.
  assert.equal(
    PROSTATE_REST_SHARES.innerRadiusFraction,
    INNER_GLAND_FRACTION,
    'the model grows the inner gland the atlas drew, at the radius the atlas drew it'
  );

  const rest = solveProstaticEnlargement();
  assert.ok(rest.zoneShares.peripheral > 0.5, 'so at rest the outside is the larger part');
  assert.ok(rest.zoneShares.transition < 0.12, 'and the transition zone is a small one');
  assert.ok(
    rest.zoneShares.transition + rest.zoneShares.central + rest.zoneShares.peripheral > 0.999,
    'and the three account for the gland'
  );
});

test('calibration: the channel narrows visibly across the walk without closing', () => {
  // Defends `lumen-compression`. One number says how much of the channel is
  // left per unit of transition-zone growth. It was chosen so the narrowing is
  // plain across the span the scene walks and never reaches nothing — because
  // a channel drawn shut would be a retention this model cannot model.
  //
  // That it still behaves that way is a property of the choice. The fraction
  // is a fraction of this model's own resting channel: it is not a calibre, it
  // is not a flow rate, and no position on it is a threshold for anything.
  assert.ok(LUMEN_COMPRESSION > 0, 'growth narrows rather than widens');

  const walked = solveProstaticEnlargement({ transitionGrowth: 14 });
  assert.ok(
    walked.urethralLumenFraction < 0.35,
    `the far end of the walk is plainly narrowed (${walked.urethralLumenFraction.toFixed(2)})`
  );
  assert.ok(walked.urethralLumenFraction > 0.1, 'and is not drawn shut');

  // Monotone, and starting from a channel that is whole.
  let previous = 1.0001;
  for (const growth of [1, 2, 4, 7, 10, 14]) {
    const solved = solveProstaticEnlargement({ transitionGrowth: growth });
    assert.ok(solved.urethralLumenFraction < previous, `it narrows further by ×${growth}`);
    previous = solved.urethralLumenFraction;
  }
  assert.equal(solveProstaticEnlargement().urethralLumenFraction, 1, 'and an unenlarged gland is unnarrowed');
});

test('calibration: the bowel obstruction model is measured off the atlas’s own gut', () => {
  // Defends `drawn-proportions`. The model's lengths and calibres are not
  // anatomy and do not claim to be: they are the proportions the intestinal
  // atlas draws, so that the arithmetic and the picture are the same gut.
  //
  // What this defends is that agreement and the ordering it produces. It is
  // not a check that either is right about a person, and it never could be.
  const small = buildSmallIntestine({});
  const colon = buildColon({});
  const duodenum = buildDuodenum({});
  const parts = buildColonParts({});

  const smallLength = small.curve.getLength();
  const colonLength = colon.curve.getLength();
  const total = smallLength + colonLength + duodenum.curve.getLength();

  // The coil carries two of the model's segments, split where the scene splits
  // it, so the two are checked as one length.
  const drawn = {
    duodenum: duodenum.curve.getLength() / total,
    'proximal-small-bowel': (smallLength * 0.4) / total,
    'distal-small-bowel': (smallLength * 0.6) / total,
  };
  for (const part of parts.parts) drawn[part.id] = ((part.to - part.from) * colonLength) / total;

  // Calibres against the caecum's, from the profile the colon is built from.
  const calibre = colonCalibre(0);
  const caecumPart = parts.parts.find((part) => part.id === 'caecum');
  const caecumRadius = calibre((caecumPart.from + caecumPart.to) / 2);
  const drawnRadius = { duodenum: 0.2 / caecumRadius * 1.15, 'proximal-small-bowel': 0.21 / caecumRadius * 1.15 };
  drawnRadius['distal-small-bowel'] = drawnRadius['proximal-small-bowel'];
  for (const part of parts.parts) {
    drawnRadius[part.id] = calibre((part.from + part.to) / 2) / caecumRadius;
  }

  for (const segment of GUT_SEGMENTS) {
    assert.ok(
      Math.abs(segment.lengthShare - drawn[segment.id]) < 0.01,
      `${segment.id}: the model has ${segment.lengthShare} of the gut, the atlas draws ${drawn[segment.id]?.toFixed(4)}`
    );
    assert.ok(
      Math.abs(segment.restingRadius - drawnRadius[segment.id]) < 0.02,
      `${segment.id}: the model has a calibre of ${segment.restingRadius}, the atlas draws ${drawnRadius[segment.id]?.toFixed(3)}`
    );
  }

  // The ordering the model actually claims, held directly.
  const colonSegments = GUT_SEGMENTS.filter((segment) => parts.parts.some((part) => part.id === segment.id));
  assert.equal(colonSegments[0].id, 'caecum');
  for (let at = 1; at < colonSegments.length; at += 1) {
    assert.ok(
      colonSegments[at].restingRadius < colonSegments[at - 1].restingRadius,
      `${colonSegments[at].id} is narrower than the part before it`
    );
  }

  small.dispose();
  colon.dispose();
  duodenum.dispose();
  parts.dispose();
});

test('calibration: a complete blockage distends the bowel visibly at every site without doubling it', () => {
  // Defends `retained-load`. One number says how much arrives above a blockage,
  // as a multiple of the whole gut's resting volume. It was chosen so that the
  // distension is plain at every one of the four sites and never runs away.
  //
  // That it still behaves that way is a property of the choice. Nothing here is
  // millilitres, and no figure in it is a threshold.
  assert.ok(RETAINED_LOAD > 0);

  for (const site of OBSTRUCTION_SITES.filter((candidate) => candidate.blocks)) {
    for (const valveCompetence of [0, 1]) {
      const solved = solveBowelObstruction({ site: site.id, completeness: 1, valveCompetence });
      assert.ok(
        solved.radiusRatio > 1.12,
        `${site.id} (valve ${valveCompetence}): ${solved.radiusRatio.toFixed(2)}× is not a visible distension`
      );
      assert.ok(
        solved.radiusRatio < 2,
        `${site.id} (valve ${valveCompetence}): ${solved.radiusRatio.toFixed(2)}× has run away`
      );
    }
  }

  // And a patent gut is drawn at its resting calibre, exactly.
  assert.equal(solveBowelObstruction({ site: 'none', completeness: 1 }).radiusRatio, 1);
});

test('calibration: the fibroid model is measured off the atlas’s own uterus', () => {
  // Defends `atlas-proportions`. The wall's depth, the cavity's area and the
  // organ's volume are not anatomy: they are this repository's drawn uterus,
  // measured off its meshes so that the arithmetic and the picture are the same
  // organ. What is defended is that agreement, never that either is right about
  // a person.
  const uterus = buildUterusParts({});

  // The organ's volume, by the divergence theorem over its closed wall parts.
  const signedVolume = (geometry) => {
    const position = geometry.attributes.position;
    const index = geometry.index;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    let total = 0;
    const count = index ? index.count : position.count;
    for (let at = 0; at < count; at += 3) {
      const [i, j, k] = index
        ? [index.getX(at), index.getX(at + 1), index.getX(at + 2)]
        : [at, at + 1, at + 2];
      a.fromBufferAttribute(position, i);
      b.fromBufferAttribute(position, j);
      c.fromBufferAttribute(position, k);
      total += a.dot(b.clone().cross(c)) / 6;
    }
    return Math.abs(total);
  };
  const volume = ['fundus', 'body', 'isthmus', 'cervix'].reduce(
    (sum, id) => sum + signedVolume(uterus.mesh(id).geometry),
    0
  );
  assert.ok(
    Math.abs(FIBROID_UTERUS.volume - volume) < 0.01,
    `the model has ${FIBROID_UTERUS.volume}, the atlas draws ${volume.toFixed(4)}`
  );

  // The wall's depth at the body, from the cavity plane (z = 0) to the serosa.
  const body = uterus.mesh('body');
  body.geometry.computeBoundingBox();
  const depth = body.geometry.boundingBox.max.z;
  assert.ok(
    Math.abs(FIBROID_UTERUS.wallDepth - depth) < 0.01,
    `the model has a wall of ${FIBROID_UTERUS.wallDepth}, the atlas draws ${depth.toFixed(4)}`
  );

  // The cavity is a triangle, so its area is half the cross product of two of
  // its edges — read off the mesh rather than off the corner constants.
  const cavity = uterus.mesh('uterine-cavity').geometry.attributes.position;
  const corner = (at) => new THREE.Vector3().fromBufferAttribute(cavity, at);
  const area = corner(1).sub(corner(0)).cross(corner(2).sub(corner(0))).length() / 2;
  assert.ok(
    Math.abs(FIBROID_UTERUS.cavityArea - area) < 0.01,
    `the model has a cavity of ${FIBROID_UTERUS.cavityArea}, the atlas draws ${area.toFixed(4)}`
  );

  uterus.dispose();
});

test('calibration: each of the three names behaves the way its description says', () => {
  // Defends `three-chosen-depths`. Three fractions of the wall's depth were
  // chosen so that each standard name does what its description says across the
  // range the scene offers. That they still do is a property of the choice.
  const { min, max } = FIBROID_DIAMETERS;
  const at = (location, diameter) => solveUterineFibroid({ location, diameter });

  // Shallow: against the cavity throughout, and never out through the surface.
  assert.equal(at('submucosal', min).reachesCavity, true);
  assert.equal(at('submucosal', max).reachesSerosa, false);
  assert.ok(at('submucosal', max).cavityContactFraction > 0.5, 'and it takes most of the cavity');

  // Deep: past the surface throughout, and never into the cavity.
  assert.ok(at('subserosal', min * 1.3).reachesSerosa, true);
  assert.equal(at('subserosal', max).reachesCavity, false);

  // Middle: crosses from neither to both *inside* the range, which is what
  // makes it worth a third name rather than a midpoint.
  assert.equal(at('intramural', min).reachesCavity, false);
  assert.equal(at('intramural', min).reachesSerosa, false);
  assert.equal(at('intramural', max).reachesCavity, true);
  assert.equal(at('intramural', max).reachesSerosa, true);
  const crossing = at('intramural', max).reachesCavityAt;
  assert.ok(crossing > min && crossing < max, `it crosses at ${crossing.toFixed(3)}, inside the range`);

  // And every location is a location the scene offers.
  for (const location of FIBROID_LOCATIONS) {
    assert.equal(solveUterineFibroid({ location: location.id }).controls.location, location.id);
  }
});

test('calibration: the goitre model is measured off the atlas’s own gland and airway', () => {
  // Defends `atlas-and-face-area`. Three of the four numbers are the atlas's
  // own, measured off its meshes so that the arithmetic and the picture are the
  // same gland; the fourth turns a volume into a distance and is a calibration.
  const thyroid = buildThyroidParts({});
  const lobe = thyroid.mesh('left-lobe');
  lobe.updateMatrixWorld(true);

  const position = lobe.geometry.attributes.position;
  const index = lobe.geometry.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let volume = 0;
  const count = index ? index.count : position.count;
  for (let step = 0; step < count; step += 3) {
    const [i, j, k] = index
      ? [index.getX(step), index.getX(step + 1), index.getX(step + 2)]
      : [step, step + 1, step + 2];
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, j);
    c.fromBufferAttribute(position, k);
    volume += a.dot(b.clone().cross(c)) / 6;
  }
  assert.ok(
    Math.abs(THYROID.lobeVolume - Math.abs(volume)) < 0.01,
    `the model has a lobe of ${THYROID.lobeVolume}, the atlas draws ${Math.abs(volume).toFixed(4)}`
  );

  lobe.geometry.computeBoundingBox();
  const box = lobe.geometry.boundingBox;
  const depth = box.max.z - box.min.z;
  assert.ok(
    Math.abs(THYROID.lobeDepth - depth) < 0.01,
    `the model has a lobe ${THYROID.lobeDepth} deep, the atlas draws ${depth.toFixed(4)}`
  );

  const trachea = thyroid.mesh('trachea');
  trachea.geometry.computeBoundingBox();
  const radius = trachea.geometry.boundingBox.max.x;
  assert.ok(
    Math.abs(THYROID.tracheaRadius - radius) < 0.01,
    `the model has an airway of ${THYROID.tracheaRadius}, the atlas draws ${radius.toFixed(4)}`
  );

  // The one that is not measured: chosen so the burdens the scene offers move
  // and narrow things visibly without running away.
  assert.ok(FACE_AREA > 0);
  const largest = solveMultinodularGoitre({ direction: 'medial', burden: GOITRE_BURDEN.max });
  assert.ok(largest.deviationRadii > 1 && largest.deviationRadii < 4, largest.deviationRadii);

  thyroid.dispose();
});

test('calibration: one of the four directions narrows the airway and the others displace it', () => {
  // Defends `four-directions`. Twelve coefficients were chosen as a reading of
  // four standard pictures. What is defended is the *ordering* they produce —
  // exactly one direction is confined — and never the sizes.
  const confined = GOITRE_DIRECTIONS.filter((direction) => direction.confined > 0.5);
  assert.equal(confined.length, 1, 'exactly one direction meets a boundary that will not move');
  assert.equal(confined[0].id, 'retrosternal');

  const narrowed = [];
  for (const direction of GOITRE_DIRECTIONS) {
    if (direction.id === 'none') continue;
    const solved = solveMultinodularGoitre({ direction: direction.id, burden: GOITRE_BURDEN.max });
    if (solved.airwayEffect === 'narrowed') narrowed.push(direction.id);
    assert.ok(solved.tracheaWidthFraction > 0.08, `${direction.id}: it never closes`);
  }
  assert.deepEqual(narrowed, ['retrosternal'], 'and exactly one of them narrows the airway');

  // Each direction is a different picture rather than a different amount.
  const signatures = new Set(
    GOITRE_DIRECTIONS.filter((direction) => direction.id !== 'none').map((direction) => {
      const solved = solveMultinodularGoitre({ direction: direction.id, burden: GOITRE_BURDEN.max });
      return `${solved.deviationRadii.toFixed(2)}/${solved.tracheaWidthFraction.toFixed(2)}/${solved.behindFraction.toFixed(2)}`;
    })
  );
  assert.equal(signatures.size, 4, 'the four directions produce four different pictures');
});

test('calibration: the knee model thins the atlas’s own drawn layer', () => {
  // Defends `drawn-layer-not-a-joint-space`. The layer this model reports a
  // fraction of is the atlas's, so the arithmetic and the picture are the same
  // knee. What is defended is that agreement — never that either is a
  // measurement, and emphatically never that the fraction is a joint space.
  assert.ok(
    Math.abs(KNEE.compartmentSeparation - (CONDYLE_SITES.medial[0] - CONDYLE_SITES.lateral[0]) / 0.84) < 0.2,
    'the compartments are as far apart as the atlas puts them'
  );

  const knee = buildKneeJoint({});
  // The layer really is four meshes and not one coat, which is what makes a
  // compartment expressible at all.
  assert.equal(knee.cartilageMeshes.length, 4);
  const names = knee.cartilageMeshes.map((mesh) => mesh.name).sort();
  assert.deepEqual(names, [
    'lateral-condylar-cartilage',
    'lateral-plateau-cartilage',
    'medial-condylar-cartilage',
    'medial-plateau-cartilage',
  ]);
  knee.dispose();

  // Thinning it to nothing brings the cap back onto the bone it was inflated
  // from, and leaving it alone leaves it where the atlas put it.
  const scene = new KneeOsteoarthritisScene({});
  assert.equal(scene.capScaleFor(1), 1);
  assert.ok(Math.abs(scene.capScaleFor(0) - 1 / (1 + KNEE.condylarLayer)) < 1e-9);
});

test('calibration: the meniscus is visibly pushed out without leaving the joint', () => {
  // Defends `extrusion-coefficient`. One number says how far a meniscus is
  // pushed per unit of layer lost. It was chosen so the movement is plain
  // across the range the scene walks and the wedge stays in the joint.
  assert.ok(EXTRUSION_PER_LOSS > 0);
  const gone = solveKneeOsteoarthritis({ side: 'medial', loss: 1, confinement: 1 });
  assert.ok(gone.medial.meniscalExtrusion > 0.3, `${gone.medial.meniscalExtrusion} is not visible`);
  assert.ok(gone.medial.meniscalExtrusion < 1, 'and it has not left the joint');
  assert.equal(solveKneeOsteoarthritis({ side: 'none' }).medial.meniscalExtrusion, 0);
});

test('calibration: the ordering holds and the crossover falls where the ligament fails', () => {
  // Defends `restraint-split`. Two numbers divide the restraint between the
  // ligament and everything else. They are a reading of the word "primary",
  // and what is defended is the ordering they produce and where the two cross
  // — never the numbers themselves.
  assert.ok(RESTRAINT.acl > RESTRAINT.secondary * 3, 'the ligament is the primary one by some margin');
  assert.ok(Math.abs(RESTRAINT.acl + RESTRAINT.secondary - 1) < 1e-9, 'and between them they are all of it');

  // The two cross over at about the point the cord stops being continuous, so
  // "it is discontinuous" and "the others are carrying it" arrive together
  // rather than at two unrelated places on the axis.
  const crossover = 1 - RESTRAINT.secondary / RESTRAINT.acl;
  assert.ok(
    Math.abs(crossover - SEPARATES_ABOVE) < 0.06,
    `the crossover is at ${crossover.toFixed(2)} and the cord fails at ${SEPARATES_ABOVE}`
  );
  assert.equal(solveAclInjury({ disruption: SEPARATES_ABOVE + 0.01 }).secondaryCarriesIt, true);
});

test('calibration: the tibia travels visibly without leaving the femur', () => {
  // Defends `drawn-travel`. One number says how far forward this model lets the
  // bone sit. It was chosen so the movement is plain and the joint stays a
  // joint — and it is a fraction of a drawn plateau, not a millimetre.
  assert.ok(MAX_TRANSLATION > 0.15, 'visible');
  assert.ok(MAX_TRANSLATION < 0.45, 'and not off the end of the plateau');
  assert.equal(solveAclInjury({ disruption: 0 }).translationFraction, 0);
  assert.ok(
    Math.abs(solveAclInjury({ disruption: 1, secondaryRestraint: 0 }).translationFraction - MAX_TRANSLATION) < 1e-9,
    'and nothing holding it at all is the whole of it'
  );
});

test('calibration: a complete tear sparing the pair keeps the head centred, and one reaching it does not', () => {
  // Defends `containment-shares`. Three numbers — two shares and a threshold —
  // were chosen so that the behaviour is what the descriptions say: the top
  // tendon can be gone across its width with the head still centred, and the
  // head rises when the tear reaches the pair. **The behaviour is the claim.**
  assert.ok(SHARE.couple > SHARE.supraspinatus, 'the pair is the larger part of the job');
  assert.ok(
    Math.abs(SHARE.couple - HOLDS_ABOVE) < 1e-9,
    'and the threshold is exactly what the pair alone provides, which is what makes the two statements one'
  );

  assert.equal(solveRotatorCuffTear({ tear: 1, couple: 1 }).centred, true);
  assert.equal(solveRotatorCuffTear({ tear: 1, couple: 0.9 }).centred, false);
  assert.equal(solveRotatorCuffTear({ tear: 0, couple: 1 }).riseFraction, 0);
});

test('calibration: the rise is a share of the atlas’s own display gap', () => {
  // Defends `a-share-of-a-drawn-gap`. The gap the rise is a fraction of is the
  // shoulder atlas's, imported rather than retyped — because the number this
  // scene reports a share of has to be the one the atlas actually drew, and
  // because the atlas's own comment is why it is reported as a share at all.
  assert.ok(RISE_MAX > 0 && RISE_MAX < 1, 'the head never reaches the arch');
  assert.ok(SUBACROMIAL_DISPLAY_GAP > 0);

  const scene = new RotatorCuffTearScene({});
  scene.build();
  scene.setProgress(1);
  scene.setModelControl('couple', 0);
  assert.ok(
    Math.abs(scene.rise() - scene.solved.riseFraction * scene.displayGap) < 1e-9,
    'the drawn rise is that fraction of the room the drawing actually left'
  );
  assert.ok(scene.rise() < scene.displayGap, 'and it stays inside it');
  // And that room is what the atlas's display gap produced, rather than a
  // number this scene chose: the acromion's height was set to leave one.
  assert.ok(scene.displayGap > SUBACROMIAL_DISPLAY_GAP, 'the arch stands clear of the head');
  assert.ok(scene.displayGap < SUBACROMIAL_DISPLAY_GAP * 6, 'and not by an unrelated amount');
  scene.dispose();
});

test('calibration: the hip model thins the layer the atlas’s own radii leave', () => {
  // Defends `a-drawn-layer-not-a-joint-space`. The layer every fraction in this
  // scene is a fraction of is the difference between the head the atlas draws
  // and the socket it draws — so the arithmetic and the picture are the same
  // hip. **It is an illustrative layer and the fraction is not a joint space.**
  const hip = buildHipJoint({});
  const head = hip.mesh('femoral-head');
  head.geometry.computeBoundingBox();
  // The fovea is carved out of the medial face, so the radius is read from the
  // side the socket's roof is on rather than from the widest span.
  const drawnHeadRadius = head.geometry.boundingBox.max.y;
  assert.ok(
    Math.abs(HIP.headRadius - drawnHeadRadius) < 0.01,
    `the model has a head of ${HIP.headRadius}, the atlas draws ${drawnHeadRadius.toFixed(3)}`
  );
  assert.ok(HIP.socketRadius > HIP.headRadius, 'and the socket is the larger of the two');
  assert.ok(HIP.layer > 0.02 && HIP.layer < 0.2, `${HIP.layer} is a layer rather than a cavity`);
  hip.dispose();
});

test('calibration: a directional loss is plainly directional and an even one has no direction at all', () => {
  // Defends `four-patterns-and-a-spill`. The angles are a reading of three
  // described patterns and the spill says how much of a directional loss
  // reaches the rest of the surface. What is defended is the behaviour: a
  // direction that is unmistakably a direction, and a surface that is not left
  // untouched away from it.
  assert.ok(SPILL > 0 && SPILL < 0.35, 'some of it reaches the rest, and not most of it');

  const directional = solveHipOsteoarthritis({ direction: 'superolateral', loss: 1 });
  assert.ok(
    directional.at.superolateral.gapFraction < 0.1 && directional.at.medial.gapFraction > 1.2,
    'the two ends of the joint are in opposite states'
  );
  assert.ok(
    directional.remainingAt(directional.narrowest.angle + Math.PI) < 1,
    'and the far side has lost a little of its layer too'
  );

  const even = solveHipOsteoarthritis({ direction: 'concentric', loss: 1 });
  assert.equal(even.offsetFraction, 0, 'the even pattern has no direction in it at all');

  // Every direction the scene offers is one the model knows, and the three that
  // have an angle are distinct.
  const angles = HIP_DIRECTIONS.filter((entry) => entry.angle !== null).map((entry) => entry.angle);
  assert.equal(new Set(angles).size, angles.length);
  assert.equal(angles.length, 3);
});

// --- urinary obstruction ---------------------------------------------------

test('calibration: the urinary tract scene is built from the volumes the model was given', () => {
  // Defends `atlas-proportions`. The model's semi-axes are the landmark
  // kidney builder's own, so the picture and the arithmetic are the same organ.
  // Read off the meshes rather than off a constant somebody copied.
  const scene = new UrinaryObstructionScene({});
  scene.build();
  scene.setModelControl('level', 'none');
  scene.setProgress(0);

  const { cortex, pelvis } = scene.kidneys.left;
  cortex.geometry.computeBoundingBox();
  pelvis.geometry.computeBoundingBox();

  const drawnOuter = cortex.geometry.boundingBox.max.toArray();
  const drawnPelvis = pelvis.geometry.boundingBox.max.toArray();
  for (let axis = 0; axis < 3; axis += 1) {
    // The cortex is warped, so its bounding box is a little larger than its
    // semi-axis. What must hold is the proportion the model was given.
    assert.ok(
      Math.abs(drawnOuter[axis] / KIDNEY.outer[axis] - 1) < 0.12,
      `the capsule is drawn at the semi-axis the model has on ${axis}`
    );
    assert.ok(
      Math.abs(drawnPelvis[axis] / KIDNEY.pelvis[axis] - 1) < 0.12,
      `and the collecting system on ${axis}`
    );
  }

  assert.ok(KIDNEY_VOLUME > PELVIS_VOLUME * 10, 'the collecting system is a small part of the organ at rest');
  scene.dispose();
});

test('calibration: the capsule takes only a minority share of what backs up', () => {
  // Defends `retained-load-and-capsule-give`. The claim these two constants
  // carry is not either of their values — it is that the room comes out of the
  // parenchyma, which is a claim about their ratio. So the ratio is what is
  // fixed here, and either constant may move as long as it holds.
  for (const backPressure of [0.25, 0.5, 1]) {
    const solved = solveUrinaryObstruction(backPressure, { level: 'mid-ureter' });
    const share = solved.capsuleGained / solved.retainedVolume;
    assert.ok(share < 0.3, `${backPressure}: the capsule took ${share} of it, which is not a minority`);
    assert.ok(share > 0, `${backPressure}: but it is not a rigid box either`);
  }

  // And the load is not so large that the collecting system reaches the capsule,
  // which would leave nothing for the parenchyma to be drawn as.
  const full = solveUrinaryObstruction(1, { level: 'mid-ureter' });
  assert.ok(full.kidneys.left.parenchymaRatio > 0.25, 'there is still a parenchyma to see');
  assert.ok(URINARY_RETAINED_LOAD > 0 && CAPSULE_GIVE > 0);
});

test('calibration: a distended stretch is plainly distended and an undistended one is plainly not', () => {
  // Defends `dilation-factors`. Unlike the kidney, the tract's calibres are
  // drawn values rather than solved ones, so what is defended is that they are
  // legible: the step at the blockage has to be unmistakable on screen.
  const solved = solveUrinaryObstruction(1, { level: 'mid-ureter' });
  const above = solved.stretch('left-mid-ureter').ratio;
  const below = solved.stretch('left-lower-ureter').ratio;
  assert.equal(below, 1, 'below it is at its resting calibre');
  assert.ok(above > 1.6, `${above} is not a step anybody would see`);
  assert.ok(above < 3, 'and not one that stops reading as a ureter');

  const bladder = solveUrinaryObstruction(1, { level: 'bladder-outlet' }).stretch('bladder');
  assert.ok(bladder.ratio > 1.2 && bladder.ratio < 1.8, 'the bladder is fuller and still a bladder');
});

test('calibration: the thinned threshold fires where the drawing changes and nowhere else', () => {
  // Defends `thinned-below`. A reporting threshold for the copy, and the one
  // thing it must not become is a grade — so what is fixed is that it tracks
  // the drawing rather than naming a stage.
  assert.ok(THINNED_BELOW > 0.7 && THINNED_BELOW < 1, 'it fires below rest and above nothing');

  // It is false with nothing above the blockage, at any amount.
  for (const backPressure of [0.5, 1]) {
    assert.equal(solveUrinaryObstruction(backPressure, { level: 'none' }).parenchymaThinned, false);
  }

  // And it turns over exactly where the ratio crosses it, rather than at a
  // point of its own.
  let crossed = null;
  for (let step = 0; step <= 40; step += 1) {
    const backPressure = step / 40;
    const solved = solveUrinaryObstruction(backPressure, { level: 'mid-ureter' });
    const expected = solved.kidneys.left.parenchymaRatio < THINNED_BELOW;
    assert.equal(solved.parenchymaThinned, expected, `${backPressure}: the flag is the ratio and nothing else`);
    if (expected && crossed === null) crossed = backPressure;
  }
  assert.ok(crossed !== null && crossed > 0, 'and it is not already true at rest');
});

// --- lobar collapse --------------------------------------------------------

test('calibration: the lobar collapse model and the lung atlas divide a lung the same way', () => {
  // Defends `atlas-lobe-shares`. The model may not import `three`, so the lobe
  // shares are copied rather than imported — and a copy that nothing compares
  // is a copy that drifts. This is the comparison.
  for (const lobe of COLLAPSE_LOBES) {
    assert.equal(
      lobe.share,
      LOBE_VOLUME_SHARES[lobe.id],
      `${lobe.id}: the model and the atlas disagree about how much of a lung it is`
    );
  }
  assert.equal(COLLAPSE_LOBES.length, Object.keys(LOBE_VOLUME_SHARES).length, 'and about how many lobes there are');

  // Shares are per side, so each lung's lobes come to one.
  for (const side of ['right', 'left']) {
    const total = COLLAPSE_LOBES.filter((lobe) => lobe.side === side).reduce((sum, lobe) => sum + lobe.share, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `${side}: its lobes come to ${total} of a lung`);
  }
});

test('calibration: both halves of the answer are visible at the top of the axis', () => {
  // Defends `how-the-room-divides` and `the-face-the-shift-is-spread-over`.
  // Neither constant carries a claim on its own; what they carry together is
  // that a reader can see both destinations at once. A split near either end
  // tells half the story, and a shift of a few pixels tells none of it.
  assert.ok(TAKEN_BY_REST > 0.35 && TAKEN_BY_REST < 0.85, 'neither destination takes nearly all of it');

  const solved = solveLobarCollapse(1, { bronchus: 'right-lower' });
  assert.ok(solved.takenByTheRest > 0 && solved.takenByTheHemithorax > 0);

  // The rest of the lung expands enough to read as expansion.
  const expanded = solved.lobes.filter((lobe) => lobe.expanded);
  assert.ok(expanded.length > 0, 'something visibly took the room');
  assert.ok(expanded.every((lobe) => lobe.volumeRatio > 1.08), 'and by enough to see');

  // The shift is a legible fraction of a lung's own width rather than a few
  // pixels of something the reader has no reference for.
  assert.ok(solved.shift > 0.18, `${solved.shift} is a shift nobody can read`);
  assert.ok(solved.shift < 0.8, 'and not one that puts the middle inside a lung');
  assert.ok(MIDLINE_FACE > 0, 'the face is an area, not a sign');
});

test('calibration: a fully collapsed lobe is still a shape there is something to point at', () => {
  // Defends `a-residual-so-there-is-something-to-point-at`. Chosen away from
  // zero, and the reason is drawing rather than physiology: a lobe scaled to
  // nothing is a lobe the scene has deleted.
  assert.ok(COLLAPSE_RESIDUAL > 0.05 && COLLAPSE_RESIDUAL < 0.3, 'small, and not nothing');

  const scene = new LobarCollapseScene({});
  scene.build();
  scene.setModelControl('bronchus', 'right-lower');
  scene.setProgress(1);
  const lobe = scene.lobeById.get('right-lower').mesh;
  assert.ok(lobe.scale.x > 0.3, `${lobe.scale.x} of its size is not a shape anybody can point at`);
  assert.ok(lobe.scale.x < 0.7, 'and it is unmistakably smaller than it was');
  assert.equal(lobe.visible, true, 'the scene draws it rather than removing it');
  scene.dispose();
});

// --- lumbar disc displacement ----------------------------------------------

test('calibration: the disc model and the spine atlas measure the same column', () => {
  // Defends `atlas-clearances`. The model may not import `three`, so the
  // distances are copied out of the atlas — and a copy nothing compares drifts.
  const spine = buildSpine({});
  const nucleus = spine.mesh('nucleus-pulposus');
  const annulus = spine.mesh('annulus-fibrosus');
  nucleus.geometry.computeBoundingBox();
  annulus.geometry.computeBoundingBox();

  const halfDepth = nucleus.geometry.boundingBox.max.z;
  assert.ok(Math.abs(halfDepth - DISC_NUCLEUS_HALF_DEPTH) < 0.01, `${halfDepth} against ${DISC_NUCLEUS_HALF_DEPTH}`);

  // The ring left behind the nucleus, posteriorly: from the nucleus's own back
  // to the annulus's, both in the disc's frame.
  const nucleusBack = nucleus.position.z - halfDepth;
  const annulusBack = annulus.position.z - annulus.geometry.boundingBox.max.z;
  const behind = nucleusBack - annulusBack;
  assert.ok(Math.abs(behind - DISC_ANNULUS_BEHIND) < 0.01, `${behind} of ring against ${DISC_ANNULUS_BEHIND}`);

  // And the clearance to each thing a direction names, measured to the nearest
  // vertex of that structure and reduced by the nucleus's own half-depth.
  const nearest = (mesh) => {
    const attribute = mesh.geometry.attributes.position;
    const point = new THREE.Vector3();
    let best = Infinity;
    for (let i = 0; i < attribute.count; i += 1) {
      point.fromBufferAttribute(attribute, i).add(mesh.position);
      best = Math.min(best, point.distanceTo(nucleus.position));
    }
    return best;
  };
  const toCanal = nearest(spine.mesh('spinal-canal')) - halfDepth;
  assert.ok(Math.abs(toCanal - DISC_TARGETS.canal.clearance) < 0.05, `${toCanal} to the canal`);
  const toRoot = nearest(spine.rootMeshes[0]) - halfDepth - DISC_TARGETS['root-shoulder'].width;
  assert.ok(Math.abs(toRoot - DISC_TARGETS['root-shoulder'].clearance) < 0.05, `${toRoot} to the root`);

  spine.dispose?.();
});

test('calibration: every direction arrives before the top of the axis, and the far one arrives last', () => {
  // Defends `how-far-the-axis-goes`. The constant carries no claim of its own;
  // what it has to deliver is that three directions are comparable on one axis.
  const arrival = (direction) => {
    for (let step = 0; step <= 100; step += 1) {
      if (solveLumbarDiscHerniation(step / 100, { direction }).touching) return step / 100;
    }
    return null;
  };
  const near = arrival('posterolateral');
  const canal = arrival('central');
  const far = arrival('far-lateral');
  for (const [name, value] of [['posterolateral', near], ['central', canal], ['far-lateral', far]]) {
    assert.ok(value !== null && value < 1, `${name} never arrives within the axis`);
    assert.ok(value > 0.2, `${name} arrives too early to show anything before it`);
  }
  assert.ok(far > near && far > canal, 'the furthest thing is reached last');
  assert.ok(DISC_MAX_REACH > 0);
});

// --- retinal detachment ----------------------------------------------------

test('calibration: the detachment model and the eye atlas measure the same globe', () => {
  // Defends `atlas-globe-and-angles`. The model may not import `three`, so the
  // globe and the angles are copied — and the scene's own direction table is
  // what makes those angles true. All three have to agree.
  const eye = buildEyeball({});
  const macula = new THREE.Vector3(...EYE_SITES.fovea).normalize();
  for (const origin of RD_ORIGINS.filter((o) => o.toMacula !== null)) {
    const direction = RetinalDetachmentScene.ORIGIN_DIRECTION[origin.id];
    assert.ok(direction, `${origin.id} has a direction in the scene`);
    const degrees = (direction.angleTo(macula) * 180) / Math.PI;
    assert.ok(
      Math.abs(degrees - origin.toMacula) < 6,
      `${origin.id}: the scene aims ${degrees}° from the macula where the model says ${origin.toMacula}°`
    );
  }
  assert.ok(RD_GLOBE.retina[0] < RD_GLOBE.choroid[1], 'the retina sits inside the layer it separates from');
  eye.dispose?.();
});

test('calibration: a peripheral separation arrives late and a posterior one at once', () => {
  // Defends `how-far-the-arc-goes`. The constant carries no claim; what it has
  // to deliver is a long span where a peripheral separation has not reached the
  // macula, and an arrival before the axis runs out.
  const arrival = (origin) => {
    for (let step = 0; step <= 100; step += 1) {
      if (solveRetinalDetachment(step / 100, { origin }).maculaInside) return step / 100;
    }
    return null;
  };
  for (const origin of ['superior', 'temporal', 'inferior']) {
    const when = arrival(origin);
    assert.ok(when !== null && when <= 1, `${origin} never arrives within the axis`);
    assert.ok(when > 0.6, `${origin} arrives at ${when}, too early to show a span without it`);
  }
  assert.ok(arrival('posterior') < 0.2, 'and a posterior start is inside almost at once');
  assert.ok(RD_MAX_ARC > 0);
});

test('calibration: the drawn lift is far larger than the atlas’s own coat spacing, and says so', () => {
  // Defends `the-lift-is-drawn-not-measured`. What must hold is the gap between
  // the two: the drawn height has to be unmistakably not the real spacing, so
  // nobody can read it as one.
  const coatGap = RD_GLOBE.choroid[1] - RD_GLOBE.retina[0];
  assert.ok(coatGap < 0.02, `the atlas's own spacing is ${coatGap}, which is invisible`);
  assert.ok(RD_MAX_LIFT > coatGap * 8, 'so the drawn lift is much larger, and cannot be read as the spacing');
  assert.ok(RD_MAX_LIFT < 0.25, 'while still leaving the sheet on a globe rather than beside one');
});

// --- lens opacity ----------------------------------------------------------

test('calibration: the cataract model and the eye atlas measure the same lens', () => {
  // Defends `atlas-lens-and-pupil`. The model may not import `three`, so the
  // lens and the pupil are copied out of the atlas.
  const eye = buildEyeball({});
  const lens = eye.mesh('lens');
  const pupil = eye.mesh('pupil');
  lens.geometry.computeBoundingBox();
  pupil.geometry.computeBoundingBox();
  assert.ok(Math.abs(lens.geometry.boundingBox.max.x - CATARACT_LENS.radius) < 0.01, 'the lens radius');
  assert.ok(
    Math.abs(pupil.geometry.boundingBox.max.x - CATARACT_LENS.drawnPupilRadius) < 0.01,
    'and the pupil the atlas draws'
  );
  eye.dispose?.();
});

test('calibration: the two apertures produce the reversal the scene exists for', () => {
  // Defends `the-bands-and-the-two-apertures`. Neither the bands nor the pupil
  // sizes carry a claim on their own; what they have to deliver together is
  // that opening the aperture swaps which opacity is in the way. That is what
  // is fixed here, so any of the values may move as long as it still holds.
  const rimNarrow = solveCataract(1, { kind: 'cortical', pupil: 'narrow' });
  const rimWide = solveCataract(1, { kind: 'cortical', pupil: 'wide' });
  const patchNarrow = solveCataract(1, { kind: 'posterior-subcapsular', pupil: 'narrow' });
  const patchWide = solveCataract(1, { kind: 'posterior-subcapsular', pupil: 'wide' });

  assert.ok(patchNarrow.inPath > rimNarrow.inPath + 0.4, 'the small patch plainly wins at a small aperture');
  assert.ok(rimWide.inPath > patchWide.inPath + 0.2, 'and the rim plainly wins at a wide one');
  assert.ok(rimNarrow.ofTheLens > patchNarrow.ofTheLens * 4, 'while the rim is much the larger cloud throughout');

  // The middle band has to sit inside the narrow aperture entirely, or the
  // "all of it" case the scene opens on is not available.
  assert.ok(Math.abs(solveCataract(1, { kind: 'nuclear', pupil: 'narrow' }).inPath - 1) < 1e-9);
  assert.ok(CATARACT_PUPILS.wide < 1, 'and the wide aperture is still inside the lens');
});

// --- particles in a semicircular canal --------------------------------------

test('calibration: the canal model and the ear atlas use the same planes and the same loop', () => {
  // Defends `atlas-canal-planes`. The model may not import `three`, so the
  // planes and the loop are copied — and the scene builds its own frame from
  // the same normals. All three have to describe one labyrinth.
  const ear = buildEar({});
  const scene = new BppvScene({});
  scene.build();

  for (const entry of BPPV_CANALS.filter((c) => c.normal)) {
    const mesh = ear.canalMeshes.find((m) => m.name.startsWith(entry.id));
    assert.ok(mesh, `${entry.id}: the atlas draws this loop`);

    // Every vertex of the atlas's tube lies about the model's plane, and about
    // the model's radius from the loop's centre in it.
    const attribute = mesh.geometry.attributes.position;
    const normal = new THREE.Vector3(...entry.normal).normalize();
    const centre = new THREE.Vector3(...EAR_SITES.vestibule);
    const point = new THREE.Vector3();
    let minRadius = Infinity;
    let maxRadius = 0;
    for (let i = 0; i < attribute.count; i += 7) {
      point.fromBufferAttribute(attribute, i).sub(centre);
      const inPlane = point.clone().addScaledVector(normal, -point.dot(normal));
      minRadius = Math.min(minRadius, inPlane.length());
      maxRadius = Math.max(maxRadius, inPlane.length());
    }
    assert.ok(
      Math.abs((minRadius + maxRadius) / 2 - BPPV_CANAL.radius) < 0.08,
      `${entry.id}: the drawn loop is ${(minRadius + maxRadius) / 2} across against ${BPPV_CANAL.radius}`
    );
    // And the scene puts a point at the model's angle on that same loop.
    const drawn = scene.pointOnLoop(entry.normal, 0).sub(centre);
    assert.ok(Math.abs(drawn.dot(normal) - 0.12) < 1e-9, `${entry.id}: the scene's loop lies in the atlas's plane`);
  }

  scene.dispose();
  ear.dispose?.();
});

test('calibration: the head’s path takes the level loop from nothing to nearly all of it', () => {
  // Defends `the-heads-path-is-chosen`. The rotation carries no claim of its
  // own; what it has to deliver is that the scene can show a loop going from
  // driving nothing to driving something. That is what is fixed.
  assert.ok(solveBppv(0, { canal: 'lateral' }).inPlane < BPPV_DRIVES_ABOVE, 'it begins holding nothing');
  const most = Math.max(...[0.25, 0.5, 0.75, 1].map((head) => solveBppv(head, { canal: 'lateral' }).inPlane));
  assert.ok(most > 0.9, `${most} is not enough of it to read as a plane holding gravity`);
  assert.ok(BPPV_MAX_PITCH > 60 && BPPV_MAX_PITCH < 180, 'and the head goes back rather than over');

  // The other loop must not do the same thing, or the comparison is empty.
  assert.ok(solveBppv(0, { canal: 'posterior' }).drives, 'the posterior loop holds it from the start');
});
