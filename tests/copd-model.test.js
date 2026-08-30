import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONTROLS,
  MAX_INSPIRATORY_PRESSURE_CMH2O,
  REFERENCE,
  UNIT_COUNT,
  breathingPattern,
  createRespiratoryModel,
  lungMechanics,
  maximalFlowVolume,
} from '../src/models/copd.js';

/**
 * What the COPD model is required to get right.
 *
 * These are not regression snapshots. Each one is a physiological statement
 * that the scene, its read-out and its teaching text all rely on, written so
 * that it fails if the mechanism stops working — not if a number moves by a
 * per cent. If any of these breaks, something the scene *says* has become
 * untrue, and that is the failure worth having a test for.
 */

/**
 * **Layer 2 — model integrity.** These check that the COPD model agrees with
 * itself: that the solver converges, that nothing leaves the range it
 * described, and that the chart, the read-out, the 3D and the teaching text
 * are all reading the same model.
 *
 * A failure here means the implementation is broken or two parts of the
 * repository have drifted apart. It says nothing about the physiology — that
 * is layer 1 — and nothing about whether a chosen constant has moved, which
 * is layer 3. See `tests/README.md`.
 */

const NORMAL = { airwayResistance: 1, elasticRecoil: 1, bronchodilation: 0, expiratoryPressureCmH2O: 0 };
const OBSTRUCTED = { ...NORMAL, ...DEFAULT_CONTROLS };

/** A settled lung, because dynamic hyperinflation is an equilibrium. */
function settled(controls) {
  const model = createRespiratoryModel({ controls });
  const result = model.settle({ maxBreaths: 400 });
  assert.ok(result.settled, `model did not settle for ${JSON.stringify(controls)}`);
  return model.state;
}

// --- the mechanics ---------------------------------------------------------

test('the time constant is resistance times compliance, with nothing else in it', () => {
  for (const controls of [NORMAL, OBSTRUCTED, { ...NORMAL, airwayResistance: 2 }]) {
    const mechanics = lungMechanics(controls);
    assert.ok(
      Math.abs(mechanics.timeConstantS - mechanics.resistance * mechanics.compliance) < 1e-12,
      'τ must be R·C'
    );
  }
});

test('the units in parallel have the same time constant as the whole lung', () => {
  // Splitting a lung into twelve must not change the lung. Each unit carries
  // 1/N of the compliance and N times the resistance; heterogeneity scatters
  // them but holds the mean, so the average unit is the whole.
  const mechanics = lungMechanics(OBSTRUCTED);
  const mean =
    mechanics.units.reduce((sum, unit) => sum + unit.timeConstantS, 0) / mechanics.units.length;
  assert.ok(Math.abs(mean / mechanics.timeConstantS - 1) < 0.08, `mean unit τ was ${mean}`);
  assert.equal(mechanics.units.length, UNIT_COUNT);
});

test('units are heterogeneous, and the same heterogeneous lung every time', () => {
  const first = lungMechanics(OBSTRUCTED).units.map((unit) => unit.timeConstantS);
  const second = lungMechanics(OBSTRUCTED).units.map((unit) => unit.timeConstantS);
  assert.deepEqual(first, second, 'the lung must be the same lung on every load');
  assert.ok(Math.max(...first) > Math.min(...first) * 1.5, 'the spread has to be worth having');
});

test('losing elastic recoil raises residual volume, resting volume and capacity — in that order of size', () => {
  const healthy = lungMechanics(NORMAL);
  const emphysema = lungMechanics({ ...NORMAL, elasticRecoil: 0.6 });

  assert.ok(emphysema.residualVolumeL > healthy.residualVolumeL, 'RV rises');
  assert.ok(emphysema.relaxedVolumeL > healthy.relaxedVolumeL, 'FRC rises');
  assert.ok(emphysema.totalLungCapacityL > healthy.totalLungCapacityL, 'TLC rises');

  // The textbook summary of COPD is "TLC near normal, RV and FRC raised", and
  // the model has to reproduce the ordering, not just the directions.
  const rise = (a, b) => (b - a) / a;
  assert.ok(
    rise(healthy.totalLungCapacityL, emphysema.totalLungCapacityL) <
      rise(healthy.residualVolumeL, emphysema.residualVolumeL),
    'TLC must move proportionally less than RV'
  );
});

test('the normal lung sits at the textbook volumes', () => {
  const healthy = lungMechanics(NORMAL);
  assert.ok(Math.abs(healthy.relaxedVolumeL - 2.4) < 0.05, `FRC was ${healthy.relaxedVolumeL}`);
  assert.equal(healthy.residualVolumeL, REFERENCE.residualVolume);
  assert.equal(healthy.totalLungCapacityL, REFERENCE.totalLungCapacity);
  // 0.5–0.7 s is the range reported for the normal expiratory time constant.
  assert.ok(healthy.timeConstantS > 0.5 && healthy.timeConstantS < 0.7, `τ was ${healthy.timeConstantS}`);
});

test('the obstructed lung has the long time constant obstruction is known by', () => {
  const obstructed = lungMechanics(OBSTRUCTED);
  assert.ok(obstructed.timeConstantS > 2, `τ was ${obstructed.timeConstantS}, expected the order of 2–3 s`);
  assert.ok(obstructed.timeConstantS < 4, 'and not beyond what is reported even in severe disease');
});

// --- the flow ceiling ------------------------------------------------------

test('the maximal flow the lung can produce contains no term for effort', () => {
  // Not a property of the numbers but of the shape of the model: the envelope
  // is computed from mechanics alone, and mechanics has no drive in it.
  const envelope = maximalFlowVolume(lungMechanics(NORMAL));
  const withDrive = maximalFlowVolume(lungMechanics({ ...NORMAL, expiratoryPressureCmH2O: 20, demand: 1 }));
  assert.deepEqual(envelope, withDrive);
});

test('maximal flow falls to zero at residual volume and rises with volume', () => {
  const mechanics = lungMechanics(NORMAL);
  const envelope = maximalFlowVolume(mechanics);
  const last = envelope[envelope.length - 1];
  assert.ok(Math.abs(last.volumeL - mechanics.residualVolumeL) < 1e-9);
  assert.ok(last.flowLPerS < 1e-9, 'nothing comes out at residual volume');
  for (let i = 1; i < envelope.length; i++) {
    assert.ok(envelope[i].flowLPerS <= envelope[i - 1].flowLPerS + 1e-9, 'flow falls as volume falls');
  }
});

test('mid-expiratory maximal flow is in the right place for both lungs', () => {
  const at50 = (controls) => {
    const mechanics = lungMechanics(controls);
    const target =
      mechanics.residualVolumeL + (mechanics.totalLungCapacityL - mechanics.residualVolumeL) * 0.5;
    return maximalFlowVolume(mechanics).reduce((best, point) =>
      Math.abs(point.volumeL - target) < Math.abs(best.volumeL - target) ? point : best
    ).flowLPerS;
  };
  // A healthy adult's maximal flow at mid vital capacity is a few litres a
  // second; an obstructed one's is well under one. The model is calibrated
  // here, in the middle, where its linear recoil is closest to right.
  assert.ok(at50(NORMAL) > 3 && at50(NORMAL) < 7, `normal Vmax50 was ${at50(NORMAL)}`);
  assert.ok(at50(OBSTRUCTED) < 1.5, `obstructed Vmax50 was ${at50(OBSTRUCTED)}`);
});

// --- the breathing pattern -------------------------------------------------

test('working harder shortens expiratory time faster than it lengthens anything', () => {
  const rest = breathingPattern(0);
  const hard = breathingPattern(1);
  assert.ok(hard.expiratoryTimeS < rest.expiratoryTimeS * 0.5, 'Te collapses');
  assert.ok(hard.inspiratoryTimeS < rest.inspiratoryTimeS, 'so does Ti, but less dramatically');
  assert.ok(
    rest.expiratoryTimeS / hard.expiratoryTimeS > rest.inspiratoryTimeS / hard.inspiratoryTimeS,
    'expiration loses proportionally more of its time than inspiration does'
  );
  assert.ok(hard.targetVentilationLPerMin > rest.targetVentilationLPerMin * 5);
});

// --- what the whole thing does ---------------------------------------------

test('a normal lung does not hyperinflate however hard it works', () => {
  const relaxed = lungMechanics(NORMAL).relaxedVolumeL;
  for (const demand of [0, 0.3, 0.6, 1]) {
    const state = settled({ ...NORMAL, demand });
    assert.ok(
      state.endExpiratoryVolumeL <= relaxed + 0.05,
      `at demand ${demand} the normal lung rested at ${state.endExpiratoryVolumeL} L`
    );
  }
});

test('an obstructed lung hyperinflates as demand rises, and loses inspiratory capacity doing it', () => {
  const rest = settled({ ...OBSTRUCTED, demand: 0 });
  const work = settled({ ...OBSTRUCTED, demand: 1 });
  assert.ok(
    work.endExpiratoryVolumeL > rest.endExpiratoryVolumeL + 0.4,
    `EELV went ${rest.endExpiratoryVolumeL} → ${work.endExpiratoryVolumeL}`
  );
  assert.ok(
    work.inspiratoryCapacityL < rest.inspiratoryCapacityL * 0.8,
    `IC went ${rest.inspiratoryCapacityL} → ${work.inspiratoryCapacityL}`
  );
  // And the tidal breath ends up crowded against total lung capacity.
  const endInspiratory = work.endExpiratoryVolumeL + work.tidalVolumeL;
  assert.ok(endInspiratory / work.totalLungCapacityL > 0.82, 'the breath is taken near TLC');
});

test('hyperinflation follows from the time available, not from the disease label', () => {
  // Held at a workload the lung can actually meet, so that ventilation is the
  // same in both cases and the only thing that differs is how many time
  // constants fit into the expiratory time. Fewer τ needed, more of the breath
  // given back, lower resting volume — with nothing about the disease changed.
  const at = (bronchodilation) => {
    // Demand 0.3: low enough that both lungs meet the ventilation asked for,
    // so the comparison is not confounded by one of them falling short.
    const model = createRespiratoryModel({ controls: { ...OBSTRUCTED, demand: 0.3, bronchodilation } });
    model.settle({ maxBreaths: 400 });
    return model.state;
  };
  const slow = at(0);
  const quick = at(1);
  assert.ok(
    Math.abs(quick.minuteVentilationLPerMin - slow.minuteVentilationLPerMin) < 0.5,
    'the comparison is only fair while both are meeting the same demand'
  );
  assert.ok(quick.timeConstantsAvailable > slow.timeConstantsAvailable, 'more τ fit into the same Te');
  assert.ok(
    quick.endExpiratoryVolumeL < slow.endExpiratoryVolumeL,
    `shortening τ at the same Te empties the lung further: ${slow.endExpiratoryVolumeL} → ${quick.endExpiratoryVolumeL}`
  );
});

test('at maximal work the same bronchodilator buys ventilation instead of volume', () => {
  // The clinically important asymmetry, and it is emergent: the benefit shows
  // up as a lower operating volume only while the ventilation being asked for
  // is already being produced. Push the lung to where it cannot keep up and
  // the same shortened time constant is spent on moving more gas, leaving the
  // resting volume where it was. A trial that measured IC at maximal exercise
  // rather than at a fixed workload would find much less.
  const at = (bronchodilation) => {
    const model = createRespiratoryModel({ controls: { ...OBSTRUCTED, demand: 1, bronchodilation } });
    model.settle({ maxBreaths: 400 });
    return model.state;
  };
  const before = at(0);
  const after = at(1);
  assert.equal(before.ventilatoryLimited, true, 'the premise is a lung that cannot keep up');
  assert.ok(
    after.minuteVentilationLPerMin > before.minuteVentilationLPerMin + 1,
    `ventilation ${before.minuteVentilationLPerMin} → ${after.minuteVentilationLPerMin}`
  );
  assert.ok(
    after.inspiratoryCapacityL < before.inspiratoryCapacityL + 0.1,
    'and the inspiratory capacity is not what improved'
  );
});

test('expiratory effort moves a normal lung and does almost nothing to a limited one', () => {
  const gain = (controls) => {
    const easy = settled({ ...controls, expiratoryPressureCmH2O: 0 });
    const hard = settled({ ...controls, expiratoryPressureCmH2O: 15 });
    return hard.inspiratoryCapacityL - easy.inspiratoryCapacityL;
  };
  const normalGain = gain({ ...NORMAL, demand: 0.6 });
  const obstructedGain = gain({ ...OBSTRUCTED, demand: 0.6 });
  assert.ok(normalGain > 0.3, `expiratory pressure should empty a normal lung further; it gained ${normalGain} L`);
  assert.ok(
    obstructedGain < normalGain * 0.4,
    `the same pressure gained the obstructed lung ${obstructedGain} L against ${normalGain} L`
  );
});

test('the obstructed lung expires against the ceiling; the normal one never reaches it', () => {
  assert.equal(settled({ ...NORMAL, demand: 0.6 }).flowLimitedFraction, 0);
  // At maximal work a normal lung does brush the ceiling — the abdominal
  // recruitment that comes with the workload is enough to reach it for a
  // couple of per cent of the breath. That is the right direction: healthy
  // people approach flow limitation at peak exercise. It must stay negligible.
  assert.ok(settled({ ...NORMAL, demand: 1 }).flowLimitedFraction < 0.05);
  // The obstructed lung reaches the ceiling for about half of a moderate
  // breath and for most of a maximal one — with no more expiratory pressure
  // than the workload itself recruits.
  assert.ok(settled({ ...OBSTRUCTED, demand: 0.6 }).flowLimitedFraction > 0.4);
  assert.ok(settled({ ...OBSTRUCTED, demand: 1 }).flowLimitedFraction > 0.8);
});

test('ventilatory limitation is an outcome, not a setting', () => {
  const easy = settled({ ...OBSTRUCTED, demand: 0.1 });
  assert.equal(easy.ventilatoryLimited, false);
  assert.ok(easy.minuteVentilationLPerMin >= easy.targetVentilationLPerMin * 0.95, 'demand is met at rest');

  const hard = settled({ ...OBSTRUCTED, demand: 1 });
  assert.equal(hard.ventilatoryLimited, true);
  assert.ok(hard.minuteVentilationLPerMin < hard.targetVentilationLPerMin * 0.9, 'and not met under load');
  assert.ok(
    Math.abs(hard.inspiratoryPressureCmH2O - MAX_INSPIRATORY_PRESSURE_CMH2O) < 0.1,
    'the drive is at its ceiling and still short'
  );

  // A normal lung meets the same demand with pressure to spare.
  const healthy = settled({ ...NORMAL, demand: 1 });
  assert.equal(healthy.ventilatoryLimited, false);
  assert.ok(healthy.inspiratoryPressureCmH2O < MAX_INSPIRATORY_PRESSURE_CMH2O * 0.8);
});

test('a bronchodilator buys back inspiratory capacity, and buys back less than normal recoil would', () => {
  // At a workload the lung can meet — see the test above for what happens when
  // it cannot.
  const before = settled({ ...OBSTRUCTED, demand: 0.4 });
  const after = settled({ ...OBSTRUCTED, demand: 0.4, bronchodilation: 1 });
  assert.ok(
    after.inspiratoryCapacityL > before.inspiratoryCapacityL,
    `IC ${before.inspiratoryCapacityL} → ${after.inspiratoryCapacityL}`
  );
  // It shortens the time constant, which is the mechanism.
  assert.ok(after.timeConstantS < before.timeConstantS * 0.85);
  // But it does not abolish flow limitation, because what sets the ceiling is
  // the tethering the drug cannot restore.
  assert.ok(after.flowLimitedFraction > 0.3, 'the ceiling is still being met');
  const restored = settled({ ...OBSTRUCTED, demand: 0.4, elasticRecoil: 1 });
  assert.ok(
    restored.inspiratoryCapacityL > after.inspiratoryCapacityL,
    'giving the recoil back does more than any bronchodilation does'
  );
});

test('the model is deterministic and independent of how the frames fall', () => {
  const advanceWith = (frames) => {
    const model = createRespiratoryModel({ controls: { ...OBSTRUCTED, demand: 0.5 } });
    for (let i = 0; i < frames.length; i++) model.advance(frames[i]);
    return model.state.volumeL;
  };
  const seconds = 6;
  const smooth = Array.from({ length: seconds * 60 }, () => 1 / 60);
  const choppy = Array.from({ length: seconds * 24 }, () => 1 / 24);
  assert.ok(
    Math.abs(advanceWith(smooth) - advanceWith(choppy)) < 0.02,
    'six seconds of breathing is six seconds of breathing at any frame rate'
  );
  assert.equal(advanceWith(smooth), advanceWith(smooth), 'and the same every time');
});

test('the model never produces a volume outside the lung it described', () => {
  const model = createRespiratoryModel({ controls: { ...OBSTRUCTED, demand: 1, expiratoryPressureCmH2O: 30 } });
  const { residualVolumeL, totalLungCapacityL } = model.mechanics;
  for (let i = 0; i < 60 * 30; i++) {
    model.advance(1 / 60);
    const volume = model.state.volumeL;
    assert.ok(
      volume >= residualVolumeL - 1e-6 && volume <= totalLungCapacityL + 1e-6,
      `volume left the lung: ${volume} outside ${residualVolumeL}–${totalLungCapacityL}`
    );
  }
});

test('nothing in the model produces a gas tension, a saturation or a blood value', () => {
  // The strongest guarantee this model can give is about what it does *not*
  // have: there is no gas exchange in it, so nothing downstream may report
  // one. A key appearing here is a key some scene will eventually put on
  // screen, so the check belongs at the source.
  const state = settled({ ...OBSTRUCTED, demand: 0.6 });
  const forbidden = /(spo2|sao2|pao2|paco2|oxygen|saturation|hypox|blood|pulse|heart)/i;
  for (const key of Object.keys(state)) {
    assert.ok(!forbidden.test(key), `the lung model must not report "${key}"`);
  }
});
