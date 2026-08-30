import test from 'node:test';
import assert from 'node:assert/strict';
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
  SYSTEMIC_REFERENCE,
  SYSTEMIC_VASODILATION_GAIN,
  TERLIPRESSIN_SPLANCHNIC_EFFECT,
  solveHepatorenal,
  solveKidney,
  vasoconstrictorActivation,
} from '../src/models/hepatorenal.js';

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
