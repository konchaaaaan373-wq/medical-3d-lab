import test from 'node:test';
import assert from 'node:assert/strict';
import { createRespiratoryModel, breathingPattern, lungMechanics } from '../src/models/copd.js';
import {
  GENERATIONS,
  TREE,
  cartilageSupport,
  constrictibilityWeight,
  smoothMuscleFraction,
  solveAsthma,
} from '../src/models/asthma.js';

/**
 * **Layer 2: what the literature requires, not what the model happens to do.**
 *
 * The rest of the suite checks that this repository agrees with itself — that
 * the graph is the model, the read-out is the model, the 3D is the model, and
 * the stored answer in a lesson is the model's own output. That is necessary
 * and it is not sufficient, and this scene is the proof: an earlier version
 * was internally consistent all the way through while teaching that narrowed
 * airways on their own do not trap gas, which is false.
 *
 * So the order this file enforces is:
 *
 * 1. the physiology literature states a constraint,
 * 2. the model has to satisfy it,
 * 3. and only then may the 3D, the numbers, the charts and the teaching text
 *    be derived from the model.
 *
 * Nothing here reads a stored answer, a caption or a chart. Each test names a
 * proposition that would still be true if this repository did not exist, and
 * asserts that the model obeys it. A failure here means the model has drifted
 * away from the physiology, whatever the rest of the suite says.
 *
 * Sources for the propositions are in `docs/model-evidence/copd.md` and
 * `docs/model-evidence/asthma.md`, which name them claim by claim.
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
  assert.ok(floppy.timeConstantS > normal.timeConstantS * 1.5, 'and a longer τ');
});

test('physiology: a normal lung empties in the time a resting breath is given', () => {
  // The anchor that makes the rest of these meaningful. Normal expiratory time
  // constants are of the order of half a second, and quiet expiration lasts
  // about three, so a healthy lung is given several τ and finishes.
  const rest = settled({ airwayResistance: 1, elasticRecoil: 1, demand: 0 });
  assert.ok(rest.timeConstantS > 0.35 && rest.timeConstantS < 0.9, `τ = ${rest.timeConstantS} s`);
  assert.ok(rest.timeConstantsAvailable > 3, 'and expiration is given more than three of them');
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
  assert.ok(work.expiratoryTimeS < rest.expiratoryTimeS * 0.6, 'and expiratory time falls a long way');
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
    readings[3].inspiratoryCapacityL < readings[0].inspiratoryCapacityL * 0.75,
    'and inspiratory capacity — the clinical measure of it — has to fall substantially'
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
  assert.ok(work.minuteVentilationLPerMin > rest.minuteVentilationLPerMin * 5, 'while ventilation rose several-fold');
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
    pushed.endExpiratoryVolumeL < passive.endExpiratoryVolumeL - 0.3,
    `pushing has to empty it further: ${passive.endExpiratoryVolumeL} → ${pushed.endExpiratoryVolumeL}`
  );
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
    };
  };
  const preserved = gain(1);
  const lost = gain(0.6);
  assert.ok(lost.limited > 0.8, 'the flow-limited lung expires against its ceiling for most of the breath');
  assert.ok(
    lost.gainedL < preserved.gainedL * 0.3,
    `and the same pressure gains it ${lost.gainedL} L against ${preserved.gainedL} L`
  );
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

test('physiology: losing elastic recoil lowers the flow ceiling more than it lowers recoil', () => {
  // Emphysema limits flow by more than the loss of driving pressure alone
  // would explain, because the same alveolar attachments that store the recoil
  // also tether the collapsible airways open. Both terms of `recoil / R_us`
  // move the wrong way at once.
  const normal = lungMechanics({ airwayResistance: 1, elasticRecoil: 1 });
  const emphysema = lungMechanics({ airwayResistance: 1, elasticRecoil: 0.6 });
  assert.ok(emphysema.upstreamResistance > normal.upstreamResistance, 'the upstream resistance rises');
  const recoilRatio = normal.lungCompliance / emphysema.lungCompliance;
  const ceilingRatio =
    (normal.lungCompliance ** -1 / normal.upstreamResistance) /
    (emphysema.lungCompliance ** -1 / emphysema.upstreamResistance);
  assert.ok(
    ceilingRatio > recoilRatio,
    `the ceiling falls by ${ceilingRatio}× against a recoil fall of ${recoilRatio}×`
  );
});

test('physiology: a bronchodilator shortens the time constant far more than it raises the ceiling', () => {
  // Smooth-muscle relaxation acts on the resistance of the whole airway tree;
  // what holds the collapsible segment open in expiration is parenchymal
  // tethering, which no drug restores. So the benefit in an emphysematous lung
  // shows up as operating volume rather than as flow.
  const before = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6, bronchodilation: 0 });
  const after = lungMechanics({ airwayResistance: 3, elasticRecoil: 0.6, bronchodilation: 1 });
  const resistanceRelief = 1 - after.resistance / before.resistance;
  const ceilingRelief = 1 - after.upstreamResistance / before.upstreamResistance;
  assert.ok(resistanceRelief > 0.2, `the drug has to lower total resistance; it lowered it ${resistanceRelief}`);
  assert.ok(ceilingRelief < resistanceRelief * 0.6, 'and has to touch the flow ceiling much less');
});

// --- 4. Asthma: where the muscle is ---------------------------------------

test('physiology: airway smooth muscle is present at every generation of the tree', () => {
  // Airway smooth muscle runs continuously from the trachea — as trachealis in
  // the posterior membranous wall between the ends of the cartilage rings — to
  // the terminal bronchioles. Asthma involves the whole airway tree, large
  // airways included, and a model that puts no muscle in the central airways
  // is one short step from teaching that it is a small-airway disease.
  for (let generation = 0; generation < GENERATIONS; generation++) {
    assert.ok(
      smoothMuscleFraction(generation) > 0,
      `generation ${generation} has no smooth muscle in this model, which is anatomically false`
    );
  }
  // And in the tree the solver actually uses, not only in the function.
  for (const branch of TREE) {
    assert.ok(branch.smoothMuscleFraction > 0, `branch ${branch.index} has no smooth muscle`);
  }
});

test('physiology: what falls away distally is the cartilage, not the muscle', () => {
  // Complete rings in the trachea, irregular plates in the bronchi, none at all
  // in a bronchiole — that is the definition of a bronchiole. Meanwhile the
  // muscle layer becomes complete rather than disappearing.
  for (let generation = 1; generation < GENERATIONS; generation++) {
    assert.ok(
      cartilageSupport(generation) <= cartilageSupport(generation - 1),
      `cartilage support rose between generations ${generation - 1} and ${generation}`
    );
    assert.ok(
      smoothMuscleFraction(generation) >= smoothMuscleFraction(generation - 1),
      `the muscle fraction fell between generations ${generation - 1} and ${generation}`
    );
  }
  assert.equal(cartilageSupport(GENERATIONS - 1), 0, 'a bronchiole has no cartilage');
});

test('physiology: the same activation narrows a small airway more than a central one', () => {
  // The consequence of putting those two together, and the statement the scene
  // is entitled to make. It is about *effect on calibre*, not about where the
  // muscle is — and it must not be strong enough to make the central airways
  // inert.
  const central = constrictibilityWeight(0);
  const peripheral = constrictibilityWeight(GENERATIONS - 1);
  assert.ok(peripheral > central * 3, 'a bronchiole has to narrow far more for the same activation');
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

  assert.ok(baseline.heterogeneity < 0.1, 'the tree starts almost uniform');
  assert.ok(constricted.heterogeneity > baseline.heterogeneity * 5, 'and ends markedly non-uniform');
  assert.ok(constricted.defectFraction > 0.2, 'with a substantial share of the lung barely ventilated');
  // Clustered, not speckled: the poorly ventilated units have to form regions
  // fed by a common airway rather than scattering one by one through the tree.
  assert.ok(
    constricted.largestDefectFraction > 0.05,
    `the defects have to cluster; the largest was ${constricted.largestDefectFraction} of the lung`
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
    withoutLoop.heterogeneity < withLoop.heterogeneity * 0.4,
    `heterogeneity ${withLoop.heterogeneity} → ${withoutLoop.heterogeneity} without the loop`
  );
  assert.ok(withoutLoop.largestDefectFraction < withLoop.largestDefectFraction, 'and the clusters go');
  // The airways are still narrowed — it is the *unevenness* that the loop
  // supplied, not the constriction.
  assert.ok(withoutLoop.medianCalibre < 0.9, 'the stimulus was still applied');
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

test('physiology: relaxing the smooth muscle does more than stretching the lung around it', () => {
  // Which is the ordering that matters clinically, and the reason a reliever
  // is a drug rather than an instruction to breathe deeply.
  const controls = { stimulus: 0.8, hyperresponsiveness: 1.2, wallThickening: 0.25 };
  const normal = solveAsthma(controls);
  const stretched = solveAsthma({ ...controls, lungInflation: 1.3 });
  const relaxed = solveAsthma({ ...controls, bronchodilator: 1 });
  assert.ok(
    relaxed.resistanceRatio < stretched.resistanceRatio,
    `relaxing the muscle ${relaxed.resistanceRatio} has to beat stretching the lung ${stretched.resistanceRatio}`
  );
  assert.ok(relaxed.heterogeneity < stretched.heterogeneity, 'and it has to undo more of the unevenness');
});
