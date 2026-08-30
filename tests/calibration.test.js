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
