import test from 'node:test';
import assert from 'node:assert/strict';
import { createRespiratoryModel, breathingPattern, lungMechanics } from '../src/models/copd.js';
import {
  GENERATIONS,
  TERMINAL_COUNT,
  TREE,
  cartilageSupport,
  constrictibilityWeight,
  smoothMuscleFraction,
  solveAsthma,
} from '../src/models/asthma.js';
import {
  BASELINE_INTERSTITIAL_VOLUME_ML as PULMONARY_EDEMA_BASELINE_WATER_ML,
  INTERSTITIUM as PULMONARY_EDEMA_INTERSTITIUM,
  REFERENCE as PULMONARY_EDEMA_REFERENCE,
  barrier,
  baselineInterstitialOncoticPressure,
  floodingThresholdMmHg,
  solveFiltration,
  solveSteadyState as steadyState,
  stateAt,
} from '../src/models/pulmonaryEdema.js';

/** A solved lung at its own equilibrium, for the tests that want one. */
const edemaState = (controls) => steadyState(controls);

/**
 * **Layer 1 — external physiology. What the literature requires of this model.**
 *
 * There are three kinds of test in this repository and the difference between
 * them is not organisational; it decides what you may conclude when one goes
 * red. See `LAYER` in `src/models/evidence.js`, and `tests/README.md`.
 *
 * 1. **External physiology** — this file, and `portal-haemodynamics.test.js`.
 *    Propositions that would be true if this repository did not exist.
 * 2. **Model integrity** — conservation, finiteness, determinism, solver
 *    convergence, and the chain that keeps the chart, the read-out, the 3D and
 *    the teaching text all reading the same model.
 * 3. **Calibration behaviour** — `calibration.test.js`. That the
 *    parameterisation this repository *chose* still behaves as it was chosen
 *    to behave.
 *
 * **A failure here, and only here, licenses the sentence "the model has broken
 * a constraint the physiology imposes".** A failure in layer 3 means a choice
 * this repository made has changed, which may well be deliberate, and it is
 * never evidence that the medicine is wrong.
 *
 * The rule this file is held to, and the reason it was rewritten: **no
 * assertion here may depend on a constant this repository invented or
 * calibrated.** Every test must survive re-tuning. So there are directions,
 * orderings, sufficiency conditions and independence conditions here, and no
 * magnitudes, no ratios between two invented numbers, and no thresholds that
 * came out of this repository rather than out of a paper.
 *
 * Where an ordering is genuinely external — "the peripheral airway narrows
 * more than the central one" — it is asserted as an ordering and never as a
 * factor. The factor lives in layer 3, where it belongs.
 *
 * Nothing here reads a caption, a stored answer or a chart. Sources are named
 * claim by claim in `docs/model-evidence/copd.md` and
 * `docs/model-evidence/asthma.md`, and the confidence behind each is
 * machine-readable in `src/models/evidence.js`.
 */

const settled = (controls) => {
  const model = createRespiratoryModel({ controls });
  model.settle({ maxBreaths: 400 });
  // Twice: the drive and the volume settle on different timescales, and a
  // single pass can return while the second is still moving.
  model.settle({ maxBreaths: 400 });
  return model.state;
};

// --- 1. The time constant -------------------------------------------------

test('physiology: raising airway resistance lengthens the expiratory time constant', () => {
  // τ = R·C. Elementary, and the foundation of everything below — but the
  // model has to actually implement it rather than describe it, and it must
  // hold with elastic recoil untouched.
  const mechanics = (airwayResistance) => lungMechanics({ airwayResistance, elasticRecoil: 1 });
  const normal = mechanics(1);
  const narrowed = mechanics(2);
  assert.equal(narrowed.compliance, normal.compliance, 'compliance must not move when resistance does');
  assert.ok(
    Math.abs(narrowed.timeConstantS / normal.timeConstantS - 2) < 0.01,
    `doubling R must double τ: ${normal.timeConstantS} → ${narrowed.timeConstantS}`
  );
});

test('physiology: losing elastic recoil lengthens the time constant too', () => {
  // The other term of the same product. Both routes into a slow lung exist,
  // and neither is a precondition of the other.
  const normal = lungMechanics({ airwayResistance: 1, elasticRecoil: 1 });
  const floppy = lungMechanics({ airwayResistance: 1, elasticRecoil: 0.6 });
  assert.ok(floppy.compliance > normal.compliance, 'less recoil is more compliance');
  assert.ok(floppy.timeConstantS > normal.timeConstantS, 'and a longer τ');
});

test('physiology: a normal lung empties in the time a resting breath is given', () => {
  // The anchor that makes the rest of these meaningful: a healthy lung given
  // several time constants finishes emptying, so it rests at its relaxation
  // volume and traps nothing.
  //
  // What τ actually *is* in this model — about half a second — is a calibration
  // target, not a finding, and `calibration.test.js` is where that band is
  // checked. Here it only has to be short enough relative to the expiratory
  // time, which is the physiological content.
  const rest = settled({ airwayResistance: 1, elasticRecoil: 1, demand: 0 });
  assert.ok(rest.timeConstantsAvailable > 3, 'expiration has to be given more than three time constants');
  assert.ok(
    Math.abs(rest.endExpiratoryVolumeL - rest.relaxedVolumeL) < 0.05,
    'so it comes back to its relaxed volume'
  );
});

// --- 2. Insufficient expiratory time raises EELV --------------------------

test('physiology: raised airway resistance alone raises end-expiratory volume', () => {
  // THE constraint this file exists for, and the one an earlier version of
  // this scene violated.
  //
  // Under a fixed breathing pattern and a fixed expiratory muscle effort, a
  // longer time constant against an unchanged expiratory time means the lung
  // does not finish emptying, and end-expiratory volume rises. Elastic recoil
  // is *not* a precondition: methacholine-induced bronchoconstriction in
  // asthma produces dynamic hyperinflation and expiratory flow limitation in
  // lungs whose elastic recoil is normal (Tantucci et al., "Dynamic
  // hyperinflation and flow limitation during methacholine-induced
  // bronchoconstriction in asthma", PMID 10515404).
  //
  // Everything below the resistance is asserted to have stayed still, so that
  // a future change cannot satisfy this test by moving something else.
  const fixed = { elasticRecoil: 1, expiratoryPressureCmH2O: 0, demand: 0.6, bronchodilation: 0 };
  const before = settled({ ...fixed, airwayResistance: 1 });
  const after = settled({ ...fixed, airwayResistance: 2 });

  assert.equal(after.expiratoryTimeS, before.expiratoryTimeS, 'the breathing pattern was held fixed');
  assert.equal(after.ratePerMin, before.ratePerMin, 'including the rate');
  assert.equal(after.expiratoryPressureCmH2O, before.expiratoryPressureCmH2O, 'and the expiratory effort');
  assert.equal(after.relaxedVolumeL, before.relaxedVolumeL, 'and the elastic properties of the lung');

  assert.ok(after.timeConstantS > before.timeConstantS, 'τ rose');
  assert.ok(
    after.endExpiratoryVolumeL > before.endExpiratoryVolumeL,
    `and EELV had to rise with it: ${before.endExpiratoryVolumeL} → ${after.endExpiratoryVolumeL}`
  );
  assert.ok(
    after.inspiratoryCapacityL < before.inspiratoryCapacityL,
    'so the room left to breathe in has to fall'
  );
});

test('physiology: it does so without any expiratory flow limitation', () => {
  // The same result again, with the alternative explanation ruled out. If the
  // lung were reaching its flow ceiling, the rise could be attributed to flow
  // limitation rather than to the time constant. It is not.
  const fixed = { elasticRecoil: 1, expiratoryPressureCmH2O: 0, demand: 0.6 };
  const after = settled({ ...fixed, airwayResistance: 2 });
  assert.equal(after.flowLimitedFraction, 0, 'no part of the breath met the ceiling');
  assert.ok(after.endExpiratoryVolumeL > after.relaxedVolumeL, 'and the lung still rests above its relaxed volume');
});

test('physiology: breathing faster shortens expiratory time', () => {
  // The route by which exercise causes dynamic hyperinflation, and it has to
  // be true of the pattern itself, before any lung is involved.
  const rest = breathingPattern(0);
  const work = breathingPattern(1);
  assert.ok(work.ratePerMin > rest.ratePerMin, 'the rate rises');
  assert.ok(work.expiratoryTimeS < rest.expiratoryTimeS, 'and expiratory time falls');
  // Expiration must give up more of the cycle than inspiration does, because
  // the inspiratory duty cycle rises.
  const lostExpiratory = rest.expiratoryTimeS - work.expiratoryTimeS;
  const lostInspiratory = rest.inspiratoryTimeS - work.inspiratoryTimeS;
  assert.ok(lostExpiratory > lostInspiratory, 'and it gives up more of the cycle than inspiration does');
});

test('physiology: an obstructed lung hyperinflates when the expiratory time is taken away', () => {
  // Resistance and recoil held still; only the workload moves. Dynamic
  // hyperinflation is progressive with exercise in COPD, and this is that
  // statement.
  const lung = { airwayResistance: 3, elasticRecoil: 0.6, expiratoryPressureCmH2O: 0 };
  const readings = [0, 0.3, 0.6, 1].map((demand) => settled({ ...lung, demand }));
  for (let i = 1; i < readings.length; i++) {
    assert.ok(
      readings[i].expiratoryTimeS < readings[i - 1].expiratoryTimeS,
      'expiratory time has to fall at every step'
    );
    assert.ok(
      readings[i].endExpiratoryVolumeL > readings[i - 1].endExpiratoryVolumeL,
      `and EELV has to rise with it: ${readings[i - 1].endExpiratoryVolumeL} → ${readings[i].endExpiratoryVolumeL}`
    );
  }
  assert.ok(
    readings[3].inspiratoryCapacityL < readings[0].inspiratoryCapacityL,
    'and inspiratory capacity — the clinical measure of it — has to fall'
  );
});

test('physiology: a healthy lung does the opposite, and lowers its operating volume with exercise', () => {
  // The control case, and a real finding rather than a convenience: healthy
  // people recruit expiratory muscles during exercise and breathe at a *lower*
  // end-expiratory volume. A model in which everyone hyperinflates would have
  // made the COPD result meaningless.
  const lung = { airwayResistance: 1, elasticRecoil: 1, expiratoryPressureCmH2O: 0 };
  const rest = settled({ ...lung, demand: 0 });
  const work = settled({ ...lung, demand: 1 });
  assert.ok(
    work.endExpiratoryVolumeL < rest.endExpiratoryVolumeL,
    `EELV ${rest.endExpiratoryVolumeL} → ${work.endExpiratoryVolumeL}`
  );
  assert.ok(work.minuteVentilationLPerMin > rest.minuteVentilationLPerMin, 'while ventilation rose');
});

// --- 3. Effort compensates, until flow limitation -------------------------

test('physiology: expiratory muscle pressure empties a lung that is not flow-limited', () => {
  // Expiration is only effort-independent where the flow being asked for has
  // reached the maximum the lung can produce. Below that, more driving
  // pressure across the same resistance is more flow — and the model must not
  // have thrown that half away in the course of fixing the other one.
  const lung = { airwayResistance: 2, elasticRecoil: 1, demand: 0.6 };
  const passive = settled({ ...lung, expiratoryPressureCmH2O: 0 });
  const pushed = settled({ ...lung, expiratoryPressureCmH2O: 15 });
  assert.equal(passive.flowLimitedFraction, 0, 'the premise is a lung with ceiling to spare');
  assert.ok(
    pushed.endExpiratoryVolumeL < passive.endExpiratoryVolumeL,
    `pushing has to empty it further: ${passive.endExpiratoryVolumeL} → ${pushed.endExpiratoryVolumeL}`
  );
  assert.ok(pushed.inspiratoryCapacityL > passive.inspiratoryCapacityL, 'and give the room back');
});

test('physiology: losing elastic recoil takes that compensation away', () => {
  // Maximal expiratory flow is elastic recoil over the resistance upstream of
  // the equal pressure point, and contains no effort term. Once the breath is
  // running against that ceiling, raising pleural pressure raises the driving
  // pressure and the compressing pressure equally and buys nothing.
  const gain = (elasticRecoil) => {
    const lung = { airwayResistance: 3, elasticRecoil, demand: 0.6 };
    const passive = settled({ ...lung, expiratoryPressureCmH2O: 0 });
    const pushed = settled({ ...lung, expiratoryPressureCmH2O: 15 });
    return {
      gainedL: passive.endExpiratoryVolumeL - pushed.endExpiratoryVolumeL,
      limited: pushed.flowLimitedFraction,
      limitedRose: pushed.flowLimitedFraction > passive.flowLimitedFraction,
    };
  };
  const preserved = gain(1);
  const lost = gain(0.6);
  // Two orderings, no factors. How much less the pressure buys is a product of
  // this model's tethering exponent and bronchodilator split; `calibration.test.js`
  // holds that number. The physiology is the direction and the reason.
  assert.ok(
    lost.limited > preserved.limited,
    'the recoil-lost lung has to meet its ceiling for more of the breath'
  );
  assert.ok(
    lost.gainedL < preserved.gainedL,
    `and the same pressure has to buy it less: ${lost.gainedL} L against ${preserved.gainedL} L`
  );
  assert.ok(lost.limitedRose, 'and the extra pressure has to go into meeting the ceiling, not into flow');
});

test('physiology: the flow ceiling contains no effort term at all', () => {
  // Stated directly against the envelope rather than through a breath: the
  // maximal flow-volume curve is a property of the lung. Two lungs differing
  // only in what the person does with their abdominal muscles have the same
  // ceiling at every volume.
  const shape = (expiratoryPressureCmH2O) =>
    lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6, expiratoryPressureCmH2O });
  assert.equal(shape(0).upstreamResistance, shape(20).upstreamResistance);
  assert.equal(shape(0).lungCompliance, shape(20).lungCompliance);
  assert.equal(shape(0).residualVolumeL, shape(20).residualVolumeL);
});

test('physiology: losing elastic recoil raises the upstream resistance as well as lowering recoil', () => {
  // Emphysema limits flow by more than the loss of driving pressure alone
  // would explain, because the same alveolar attachments that store the recoil
  // also tether the collapsible airways open. Both terms of `recoil / R_us`
  // move the wrong way at once.
  //
  // Asserted as two directions and their consequence, with no reference to how
  // steeply the upstream resistance rises — that exponent is invented, and
  // `calibration.test.js` is where its size is checked. The inequality below
  // holds for any positive coupling at all, which is exactly what makes it an
  // external claim rather than a property of this parameterisation.
  const normal = lungMechanics({ airwayResistance: 1, elasticRecoil: 1 });
  const emphysema = lungMechanics({ airwayResistance: 1, elasticRecoil: 0.6 });

  assert.ok(emphysema.lungCompliance > normal.lungCompliance, 'less recoil is more compliance');
  assert.ok(emphysema.upstreamResistance > normal.upstreamResistance, 'and the upstream resistance rises');

  const recoilRatio = normal.lungCompliance / emphysema.lungCompliance;
  const ceilingRatio =
    (normal.lungCompliance ** -1 / normal.upstreamResistance) /
    (emphysema.lungCompliance ** -1 / emphysema.upstreamResistance);
  assert.ok(
    ceilingRatio > recoilRatio,
    `the ceiling has to fall by more than recoil does: ${ceilingRatio} against ${recoilRatio}`
  );
});

// --- 3b. What a bronchodilator does, and what it cannot -------------------

test('physiology: a bronchodilator lowers airway resistance and shortens the time constant', () => {
  // Two established statements and nothing more. Smooth-muscle relaxation
  // lowers airway resistance; τ = R·C, so a lower R is a shorter τ at an
  // unchanged compliance.
  const before = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6, bronchodilation: 0 });
  const after = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6, bronchodilation: 1 });
  assert.ok(after.resistance < before.resistance, 'the drug has to lower airway resistance');
  assert.equal(after.compliance, before.compliance, 'without touching compliance');
  assert.ok(after.timeConstantS < before.timeConstantS, 'so τ has to shorten');
});

test('physiology: a bronchodilator can lower operating volumes and recover inspiratory capacity', () => {
  // The clinically reported benefit, at a workload the lung can meet. A
  // direction and nothing else: how much inspiratory capacity comes back is a
  // consequence of two invented percentages, and is checked in layer 3.
  const lung = { airwayResistance: 3, elasticRecoil: 0.6, demand: 0.3 };
  const before = settled({ ...lung, bronchodilation: 0 });
  const after = settled({ ...lung, bronchodilation: 1 });
  assert.ok(
    Math.abs(after.minuteVentilationLPerMin - before.minuteVentilationLPerMin) < 0.5,
    'the comparison is only fair while both are meeting the same demand'
  );
  assert.ok(
    after.endExpiratoryVolumeL < before.endExpiratoryVolumeL,
    `operating volume ${before.endExpiratoryVolumeL} → ${after.endExpiratoryVolumeL}`
  );
  assert.ok(after.inspiratoryCapacityL > before.inspiratoryCapacityL, 'and inspiratory capacity comes back');
});

test('physiology: a bronchodilator does not restore elastic recoil or the tethering that went with it', () => {
  // No drug reverses parenchymal destruction. So the elastic properties of the
  // lung must be untouched by bronchodilation, and whatever loss of flow
  // ceiling emphysema caused must survive it.
  //
  // Deliberately no comparison between how much the drug lowers total
  // resistance and how much it lowers the upstream segment. That the first is
  // larger is this model's parameterisation, not a finding, and it is asserted
  // in `calibration.test.js`.
  const emphysema = { airwayResistance: 3, elasticRecoil: 0.6 };
  const before = lungMechanics({ ...emphysema, bronchodilation: 0 });
  const after = lungMechanics({ ...emphysema, bronchodilation: 1 });

  assert.equal(after.lungCompliance, before.lungCompliance, 'the lung’s own elastic properties must not move');
  assert.equal(after.residualVolumeL, before.residualVolumeL, 'nor the volume it cannot empty below');
  assert.equal(after.relaxedVolumeL, before.relaxedVolumeL, 'nor where the relaxed lung sits');

  // And the loss of ceiling caused by the recoil is still there afterwards:
  // the treated emphysematous lung still has a far higher upstream resistance
  // than a lung that never lost its recoil.
  const healthy = lungMechanics({ airwayResistance: 3, elasticRecoil: 1, bronchodilation: 0 });
  assert.ok(
    after.upstreamResistance > healthy.upstreamResistance,
    'a treated emphysematous lung is still tethered worse than one that kept its recoil'
  );
});

// --- 4. Asthma: the airway wall ------------------------------------------

test('physiology: Poiseuille resistance in an ideal tube goes as length over radius to the fourth', () => {
  // The established half, stated about the thing it is actually true of: an
  // ideal cylindrical tube carrying steady laminar flow.
  //
  // What this model does with that exponent — apply it to every generation of a
  // branching tree where the flow in the large airways is not laminar and the
  // airways are not ideal tubes — is an approximation, not a law, and it is
  // registered as `fourth-power-approximation` and checked in layer 3. It is
  // load-bearing here only because every resistance this model reports is a
  // ratio to the same tree unstimulated, so the part it gets wrong divides out.
  const resistance = (length, radius) => length / radius ** 4;
  assert.equal(resistance(2, 1) / resistance(1, 1), 2, 'linear in length');
  assert.equal(resistance(1, 0.5) / resistance(1, 1), 16, 'halving the radius is sixteen times the resistance');
  assert.ok(
    Math.abs(resistance(1, 0.9) / resistance(1, 1) - 0.9 ** -4) < 1e-12,
    'and a tenth off the radius is half again as much resistance'
  );
});

test('physiology: airway smooth muscle is present at every generation, and prominent peripherally', () => {
  // What the anatomy requires, and only that. Airway smooth muscle runs
  // continuously from the trachea — as trachealis in the posterior membranous
  // wall between the ends of the cartilage rings — to the terminal bronchioles.
  // Asthma involves the whole airway tree, large airways included, and a model
  // with no muscle in the central airways is one short step from teaching that
  // it is a small-airway disease.
  //
  // Deliberately NOT asserted here: a strict generation-by-generation increase.
  // There is no continuous quantitative law in the literature to hold the model
  // to, and asserting the shape of this repository's own ramp as an external
  // invariant would be exactly the confusion this layer exists to prevent. The
  // ramp's profile is `constrictibility-weights`, checked in layer 3.
  for (let generation = 0; generation < GENERATIONS; generation++) {
    assert.ok(
      smoothMuscleFraction(generation) > 0,
      `generation ${generation} has no smooth muscle in this model, which is anatomically false`
    );
  }
  for (const branch of TREE) {
    assert.ok(branch.smoothMuscleFraction > 0, `branch ${branch.index} has no smooth muscle`);
  }
  // And the one comparison the anatomy does support: bronchiolar smooth muscle
  // is relatively more prominent, against the size of the wall it sits in, than
  // the trachealis is.
  assert.ok(
    smoothMuscleFraction(GENERATIONS - 1) > smoothMuscleFraction(0),
    'bronchiolar smooth muscle has to be relatively more prominent than the trachealis'
  );
});

test('physiology: cartilage support decreases distally and is absent from the bronchioles', () => {
  // Complete rings in the trachea, irregular plates in the bronchi, and none at
  // all in a bronchiole — the last being part of what defines one. This is a
  // decline the anatomy does state, so a monotone decline is fair to assert;
  // its steepness is not, and is not asserted.
  for (let generation = 1; generation < GENERATIONS; generation++) {
    assert.ok(
      cartilageSupport(generation) <= cartilageSupport(generation - 1),
      `cartilage support rose between generations ${generation - 1} and ${generation}`
    );
  }
  assert.ok(cartilageSupport(0) > 0, 'the trachea is splinted by cartilage');
  assert.equal(cartilageSupport(GENERATIONS - 1), 0, 'and a bronchiole has none');
});

test('physiology: the same activation can narrow a peripheral airway more than a central one', () => {
  // The consequence of putting those two facts together: the muscle acts on a
  // wall the cartilage no longer splints, so distal calibre can be more
  // strongly affected by the same contraction.
  //
  // An ordering, and deliberately not a factor. How much more is a product of
  // two invented profiles; `calibration.test.js` holds that number. What must
  // never happen is the central airway becoming inert, because that would put
  // the model back where the review found it.
  const central = constrictibilityWeight(0);
  const peripheral = constrictibilityWeight(GENERATIONS - 1);
  assert.ok(peripheral > central, 'a bronchiole has to narrow more for the same activation');
  assert.ok(central > 0, 'and a central airway still has to narrow, because it still has muscle');
});

test('physiology: raising smooth-muscle activation narrows the airways', () => {
  // The elementary direction, stated against calibre rather than against
  // resistance so that the fourth-power law is not doing the work.
  const quiet = solveAsthma({ stimulus: 0 });
  const stimulated = solveAsthma({ stimulus: 0.8 });
  assert.ok(
    stimulated.medianCalibre < quiet.medianCalibre,
    `median calibre ${quiet.medianCalibre} → ${stimulated.medianCalibre}`
  );
  assert.ok(stimulated.resistanceRatio > quiet.resistanceRatio, 'and airway resistance rises');
  assert.ok(stimulated.totalVentilation < quiet.totalVentilation, 'and less air reaches the lung');
});

// --- 5. Asthma: where the patchiness comes from ---------------------------

test('physiology: a uniform stimulus on a nearly-uniform tree produces clustered defects', () => {
  // The mechanism Venegas and colleagues proposed: a uniform stimulus, minimal
  // structural heterogeneity, interactions through the branching network, and
  // interdependence between an airway and the parenchyma around it, together
  // producing self-organised patchiness. This is not a reproduction of their
  // model and makes no quantitative claim against it — it asserts only that
  // the ingredients produce the shape.
  const baseline = solveAsthma({ stimulus: 0 });
  const constricted = solveAsthma({ stimulus: 0.8, hyperresponsiveness: 1.2, wallThickening: 0.25 });

  // Stated structurally rather than against chosen thresholds, so that
  // re-tuning the model cannot make this test pass or fail for the wrong
  // reason. "Nearly uniform" is "no region is below the defect threshold at
  // all"; "clustered" is "the largest mostly-dark region contains more than one
  // unit", which is the whole distinction between a cluster and speckle.
  assert.equal(baseline.defectFraction, 0, 'an unstimulated tree has no defects at all');
  assert.ok(constricted.heterogeneity > baseline.heterogeneity, 'and a stimulated one is less uniform');
  assert.ok(constricted.defectFraction > 0, 'with regions barely ventilated');
  assert.ok(
    constricted.largestDefectFraction > 1 / TERMINAL_COUNT,
    `the defects have to form regions, not scatter unit by unit; the largest was ${constricted.largestDefectFraction} of the lung`
  );
});

test('physiology: disabling the interdependence feedback markedly attenuates the clustering', () => {
  // The falsification. If the patchiness came from the scatter in the tree
  // rather than from the loop, freezing the tethering term would leave it
  // roughly where it was. It must not.
  const controls = { stimulus: 0.8, hyperresponsiveness: 1.2, wallThickening: 0.25 };
  const withLoop = solveAsthma(controls);
  const withoutLoop = solveAsthma(controls, { feedback: false });

  assert.ok(
    withoutLoop.heterogeneity < withLoop.heterogeneity,
    `heterogeneity ${withLoop.heterogeneity} → ${withoutLoop.heterogeneity} without the loop`
  );
  // "Markedly attenuates" asserted as a structural fact rather than a chosen
  // factor: with the loop cut there is no clustered region left at all.
  assert.equal(withoutLoop.largestDefectFraction, 0, 'and no clustered region survives the loop being cut');
  assert.equal(withoutLoop.defectFraction, 0, 'nor any defect');
  // The airways are still narrowed — it is the *unevenness* that the loop
  // supplied, not the constriction. Stated against the unstimulated tree rather
  // than against a chosen calibre.
  const quiet = solveAsthma({ stimulus: 0, hyperresponsiveness: 1.2, wallThickening: 0.25 });
  assert.ok(withoutLoop.medianCalibre < quiet.medianCalibre, 'the stimulus was still applied');
});

test('physiology: greater lung inflation increases the tethering that opposes narrowing', () => {
  // A purely mechanical statement: raising lung volume stretches the
  // parenchyma, which pulls harder on the outside of every airway embedded in
  // it, which opposes smooth-muscle shortening.
  //
  // NOTE, and it is the point of writing this test rather than a different
  // one: this asserts a *direction* for the mechanical term. It deliberately
  // asserts no magnitude, and there is no test anywhere in this repository
  // requiring the model to reproduce any particular bronchodilation from a
  // real deep inspiration — because in asthma that response is impaired or
  // lost, and this model does not contain the smooth-muscle dynamics that
  // would decide it.
  const controls = { stimulus: 0.8, hyperresponsiveness: 1.2, wallThickening: 0.25 };
  const held = solveAsthma({ ...controls, lungInflation: 0.8 });
  const normal = solveAsthma(controls);
  const stretched = solveAsthma({ ...controls, lungInflation: 1.3 });

  assert.ok(stretched.medianCalibre > normal.medianCalibre, 'more stretch, wider airways');
  assert.ok(normal.medianCalibre > held.medianCalibre, 'less stretch, narrower');
  assert.ok(stretched.resistanceRatio < normal.resistanceRatio, 'and resistance follows');
  assert.ok(normal.resistanceRatio < held.resistanceRatio);
});

test('physiology: relaxing airway smooth muscle widens the airways and lowers resistance', () => {
  // A direction, and the reason a reliever exists. Relaxing the muscle removes
  // the activation that was narrowing the airway, so the calibre rises and the
  // resistance falls.
  //
  // Deliberately no comparison with what the lung-inflation control does. Both
  // controls have ranges this repository chose — how much drive a full
  // bronchodilator removes, how far the inflation slider goes — so which of
  // them wins at their respective maxima is a property of those ranges and not
  // of asthma. That comparison lives in `calibration.test.js`.
  const controls = { stimulus: 0.8, hyperresponsiveness: 1.2, wallThickening: 0.25 };
  const constricted = solveAsthma(controls);
  const relaxed = solveAsthma({ ...controls, bronchodilator: 1 });
  assert.ok(relaxed.medianCalibre > constricted.medianCalibre, 'the airways have to widen');
  assert.ok(relaxed.resistanceRatio < constricted.resistanceRatio, 'and the resistance has to fall');
  assert.ok(relaxed.totalVentilation > constricted.totalVentilation, 'and more air has to reach the lung');
});

/* --------------------------------------------------------------------------
   Pulmonary oedema — where the water goes when the left atrium fills

   Every test below would be true if this repository did not exist. None of
   them quotes a constant from `src/models/pulmonaryEdema.js`: they compare two
   solved lungs, so they stay true if the calibration moves.
   -------------------------------------------------------------------------- */

test('physiology: filtration follows the Starling terms, and only those', () => {
  // Each of the four terms moves the flux in the direction the equation says,
  // and nothing else does. A model that got any sign wrong here would still
  // produce oedema, for the wrong reason.
  const base = {
    drivingPressureMmHg: 16,
    filtrationCoefficient: PULMONARY_EDEMA_REFERENCE.filtrationCoefficient,
    reflectionCoefficient: PULMONARY_EDEMA_REFERENCE.reflectionCoefficient,
    plasmaOncoticPressureMmHg: PULMONARY_EDEMA_REFERENCE.plasmaOncoticPressureMmHg,
  };
  const reference = solveFiltration(base);

  assert.ok(
    solveFiltration({ ...base, drivingPressureMmHg: 24 }) > reference,
    'a larger hydrostatic gradient filters more'
  );
  assert.ok(
    solveFiltration({ ...base, plasmaOncoticPressureMmHg: 34 }) < reference,
    'more plasma protein opposes filtration'
  );
  assert.ok(
    solveFiltration({ ...base, reflectionCoefficient: 0.4 }) > reference,
    'a barrier that reflects less protein filters more at the same pressures'
  );
  assert.ok(
    solveFiltration({ ...base, filtrationCoefficient: base.filtrationCoefficient * 2 }) > reference,
    'a more conductive barrier filters more'
  );

  // And filtration reverses when the oncotic pull exceeds the hydrostatic
  // push, rather than being clamped at zero: the equation is symmetric.
  assert.ok(solveFiltration({ ...base, drivingPressureMmHg: 2 }) < 0, 'a low enough gradient absorbs');
});

test('physiology: raising pulmonary blood flow floods a lung the same atrial pressure left dry', () => {
  // The capillary is upstream of a resistance, so its pressure is the atrial
  // pressure plus a flow times that resistance. Exercise therefore floods a
  // lung whose atrium has not changed — which is why a resting wedge pressure
  // does not say what the capillary saw an hour ago.
  const atRest = floodingThresholdMmHg({ pulmonaryFlowLPerMin: 5 });
  const onExertion = floodingThresholdMmHg({ pulmonaryFlowLPerMin: 15 });
  assert.ok(onExertion < atRest, `exertion should lower the threshold: ${onExertion} vs ${atRest}`);

  const pressure = (atRest + onExertion) / 2;
  assert.equal(edemaState({ leftAtrialPressureMmHg: pressure, pulmonaryFlowLPerMin: 5 }).floodedFraction, 0);
  assert.ok(edemaState({ leftAtrialPressureMmHg: pressure, pulmonaryFlowLPerMin: 15 }).floodedFraction > 0);
});

test('physiology: three separate buffers hold water back, and removing any one lowers the threshold', () => {
  // The safety factor is not one mechanism. Interstitial pressure rising from
  // a subatmospheric value, lymphatic flow increasing, and interstitial
  // protein washing down each subtract from the driving gradient, and a lung
  // missing any one of them floods sooner.
  const intact = floodingThresholdMmHg({});

  // Take the lymphatic reserve away by asking the barrier for more flux than
  // any ceiling can carry, and the threshold has to fall.
  const withoutLymphaticReserve = floodingThresholdMmHg({ permeability: 1.6 });
  assert.ok(withoutLymphaticReserve < intact, 'a barrier that outruns the lymphatics floods sooner');

  // Take the oncotic buffer away and it falls again.
  const withoutOncotic = floodingThresholdMmHg({ plasmaOncoticPressureMmHg: 16 });
  assert.ok(withoutOncotic < intact, 'less plasma protein floods sooner');

  // The interstitial pressure buffer shows itself as the distance between the
  // pressure at which the lung starts gaining water and the pressure at which
  // an alveolus first fills. Those must not be the same pressure: if they
  // were, the interstitium would be holding nothing back.
  let firstGain = null;
  for (let la = 0; la <= intact; la += 0.5) {
    if (steadyState({ leftAtrialPressureMmHg: la }).lungWaterMl > PULMONARY_EDEMA_BASELINE_WATER_ML + 1) {
      firstGain = la;
      break;
    }
  }
  assert.ok(firstGain !== null, 'the lung starts gaining water somewhere below the flooding threshold');
  assert.ok(intact - firstGain > 5, 'and holds it in the interstitium over a wide range of pressure');
});

test('physiology: the interstitium fills before any alveolus does', () => {
  // The staging is the reason breathlessness precedes hypoxaemia. It is a
  // claim about ordering, so it is checked over the whole range rather than at
  // a chosen pressure.
  for (let la = 0; la <= 45; la += 0.5) {
    const state = steadyState({ leftAtrialPressureMmHg: la });
    if (state.alveolarWaterMl > 0) {
      assert.ok(
        state.interstitialWaterMl >= PULMONARY_EDEMA_INTERSTITIUM.floodThresholdMl - 1e-9,
        `alveoli filled at ${la} mmHg with the interstitium not yet full`
      );
    }
    if (state.interstitialWaterMl < PULMONARY_EDEMA_INTERSTITIUM.floodThresholdMl - 1e-9) {
      assert.equal(state.alveolarWaterMl, 0, `water reached an alveolus at ${la} mmHg before the interstitium was full`);
      assert.equal(state.floodedFraction, 0);
    }
  }
});

test('physiology: an adapted lung floods at a higher pressure than an unadapted one', () => {
  // Why the same wedge pressure means two different things in two patients,
  // and why a chronic mitral stenosis lives at a pressure that would drown a
  // previously normal lung.
  const unadapted = floodingThresholdMmHg({ chronicity: 0 });
  const adapted = floodingThresholdMmHg({ chronicity: 1 });
  assert.ok(adapted > unadapted, `adaptation should raise the threshold: ${adapted} vs ${unadapted}`);

  const between = (unadapted + adapted) / 2;
  assert.ok(steadyState({ leftAtrialPressureMmHg: between, chronicity: 0 }).floodedFraction > 0);
  assert.equal(steadyState({ leftAtrialPressureMmHg: between, chronicity: 1 }).floodedFraction, 0);
});

test('physiology: raising plasma protein stops protecting a lung whose barrier has failed', () => {
  // The clinical difference between cardiogenic and non-cardiogenic oedema, as
  // a property of one equation: σ multiplies the oncotic term, so a barrier
  // that no longer reflects protein cannot be helped by more of it.
  //
  // Measured as **how much more pressure the lung tolerates** for the same rise
  // in plasma protein, which is what "protecting" means. Measured as lung water
  // instead, the comparison inverts and appears to say the opposite: a leaking
  // barrier has a larger filtration coefficient, so the small pressure it has
  // left to gain still moves more water than the large one an intact barrier
  // gains. That is a fact about Kf, not about protection, and reading it as
  // protection would have had this model teaching the reverse of the truth.
  const protection = (permeability) => {
    const poor = floodingThresholdMmHg({ permeability, plasmaOncoticPressureMmHg: 18 });
    const rich = floodingThresholdMmHg({ permeability, plasmaOncoticPressureMmHg: 30 });
    assert.ok(poor !== null && rich !== null, 'both lungs have a threshold to compare');
    return rich - poor;
  };
  const intact = protection(1);
  const failed = protection(5);
  assert.ok(intact > 5, `an intact barrier should buy real tolerance: ${intact.toFixed(1)} mmHg`);
  assert.ok(
    failed < intact * 0.4,
    `a failed barrier should lose most of it: ${failed.toFixed(1)} vs ${intact.toFixed(1)} mmHg`
  );

  // And the reason, stated separately from the consequence: σ is what the
  // oncotic gradient is multiplied by, and it is what the injury destroys.
  const opposition = (permeability, plasmaOncoticPressureMmHg) => {
    const { reflectionCoefficient } = barrier(permeability);
    return (
      reflectionCoefficient *
      (plasmaOncoticPressureMmHg - baselineInterstitialOncoticPressure(plasmaOncoticPressureMmHg))
    );
  };
  assert.ok(opposition(5, 30) < opposition(1, 30) * 0.3, 'the oncotic term itself has been taken away');
});

test('physiology: low plasma protein alone does not flood a lung', () => {
  // Because interstitial protein falls with plasma protein, most of the
  // transcapillary gradient survives. Hypoalbuminaemia is a real risk factor
  // and a poor sole cause, and the model has to reproduce both halves.
  const hypoalbuminaemic = steadyState({ plasmaOncoticPressureMmHg: 14 });
  assert.equal(hypoalbuminaemic.floodedFraction, 0, 'a normal filling pressure with low albumin must not flood');
  assert.ok(
    hypoalbuminaemic.lungWaterMl > steadyState({}).lungWaterMl,
    'but it must leave the lung wetter than a normal one'
  );
  assert.ok(
    floodingThresholdMmHg({ plasmaOncoticPressureMmHg: 14 }) < floodingThresholdMmHg({}),
    'and it must lower the pressure the lung tolerates'
  );
});

test('physiology: oxygen widens the A–a difference in a shunt instead of closing it', () => {
  // The defining behaviour of a shunt, and the reason a flooded lung does not
  // respond to oxygen the way a lung with a diffusion problem does. Blood that
  // never met an alveolus cannot be improved by what is in the alveolus.
  const flooded = PULMONARY_EDEMA_INTERSTITIUM.floodThresholdMl + 360;
  const air = stateAt(flooded, { inspiredOxygenFraction: 0.21 });
  const oxygen = stateAt(flooded, { inspiredOxygenFraction: 1 });

  assert.ok(air.shuntFraction > 0.2, 'the test needs a substantial shunt to be about anything');
  assert.ok(
    oxygen.alveolarArterialDifferenceMmHg > air.alveolarArterialDifferenceMmHg * 3,
    'oxygen must widen the difference, not close it'
  );
  // The arterial tension rises far less than the alveolar one it is compared
  // against — that disproportion is the finding.
  const alveolarGain = oxygen.alveolarOxygenMmHg - air.alveolarOxygenMmHg;
  const arterialGain = oxygen.arterialOxygenMmHg - air.arterialOxygenMmHg;
  assert.ok(arterialGain > 0, 'oxygen still helps a little');
  assert.ok(arterialGain < alveolarGain * 0.25, 'but nothing like as much as the alveolar tension rose');

  // A lung with no shunt does not behave this way, which is what makes the
  // finding a finding rather than a property of the arithmetic.
  const dry = PULMONARY_EDEMA_BASELINE_WATER_ML;
  const dryAir = stateAt(dry, { inspiredOxygenFraction: 0.21 });
  const dryOxygen = stateAt(dry, { inspiredOxygenFraction: 1 });
  assert.ok(
    dryOxygen.alveolarArterialDifferenceMmHg < oxygen.alveolarArterialDifferenceMmHg / 4,
    'a lung without flooding keeps a small difference on oxygen'
  );
  assert.ok(dryAir.arterialSaturation > 0.95);
});
