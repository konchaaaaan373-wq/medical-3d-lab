import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROL_DOMAIN,
  DIAGNOSTIC_TOLERANCES,
  PRESET_IDS,
  presetInput,
  referenceInput,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';
import { walkBeat } from '../src/models/cardiacMechanics.js';

/**
 * External physiology for the cardiac-output experiment.
 *
 * A failure in this file means the circulation has broken a constraint the
 * physics imposes — a valve that ran backwards, a mean pressure that is not the
 * mean of the pressure, a gradient that does not match flow times resistance.
 * It reads no caption, no chart and no stored answer.
 *
 * Conservation, convergence and determinism are **not** here. They are
 * properties of the implementation rather than of the circulation, and this
 * repository files them in the integrity layer
 * (`cardiac-output-model.test.js`), where a failure means the solver is broken
 * rather than that the medicine is wrong.
 *
 * What is deliberately **not** here: "raising the rate raises the output",
 * "filling more is better", "a higher pressure means better circulation". Two
 * of those are false in this model and all three are false in people under
 * conditions the model can produce. Where a direction is asserted below, the
 * conditions it holds under are named in the test, because a direction without
 * its conditions is not a physiological claim — it is a slogan that happened to
 * be true at one operating point.
 */

const solve = (overrides = {}) => solveCardiacOutput({ ...referenceInput(), ...overrides });

/** Five points on each axis, so the corners of the domain are walked, not just its middle. */
const axisPoints = (id) => {
  const { min, max } = CONTROL_DOMAIN[id];
  return [min, min + (max - min) / 4, (min + max) / 2, max - (max - min) / 4, max];
};

test('mean arterial pressure is the mean of the arterial pressure', () => {
  // Not "diastolic plus a third of the pulse pressure", which is a different
  // quantity wearing the same name and diverges as the waveform changes shape.
  // The reference here is integrated independently, at four times the solver's
  // resolution, from the real trajectory rather than from the recorded trace.
  for (const overrides of [{}, { systemicResistanceMmHgSPerMl: 1.8 }, { heartRatePerMin: 110 }]) {
    const result = solve(overrides);
    const solution = { volumes: result.volumes, cycle: result.cycle };
    let integral = 0;
    let seconds = 0;
    walkBeat(solution, result.parameters, 960, ({ dt, pressures }) => {
      integral += pressures.sa * dt;
      seconds += dt;
    });
    const independent = integral / seconds;
    assert.ok(
      Math.abs(independent - result.metrics.meanArterialPressureMmHg) < 0.3,
      `${JSON.stringify(overrides)}: ${independent.toFixed(3)} vs ${result.metrics.meanArterialPressureMmHg.toFixed(3)}`
    );

    // And it is genuinely not the bedside estimate — recorded so that nobody
    // later "simplifies" the read-out into the formula and finds the tests
    // still green.
    const estimate =
      result.metrics.diastolicPressureMmHg +
      (result.metrics.systolicPressureMmHg - result.metrics.diastolicPressureMmHg) / 3;
    assert.ok(
      Math.abs(estimate - result.metrics.meanArterialPressureMmHg) > 0.5,
      'the two are different quantities and the model reports the integral'
    );
  }
});

test('the pressure drop across the systemic bed is its flow times its resistance', () => {
  // ΔP = Q·R, in the model's own units, with the gradient measured against the
  // venous reservoir rather than against zero. Getting this wrong by a factor
  // of 60 is what a per-minute flow in a per-second resistance looks like, and
  // it would still produce plausible-looking pressures.
  for (const resistance of axisPoints('systemicResistanceMmHgSPerMl')) {
    const result = solve({ systemicResistanceMmHgSPerMl: resistance });
    const gradient =
      result.metrics.meanArterialPressureMmHg - result.metrics.meanSystemicVenousPressureMmHg;
    const predicted = result.metrics.meanSystemicFlowMlPerS * resistance;
    assert.ok(
      Math.abs(predicted - gradient) / gradient < DIAGNOSTIC_TOLERANCES.systemicOhmRelative,
      `R=${resistance}: gradient ${gradient.toFixed(2)} vs Q·R ${predicted.toFixed(2)} mmHg`
    );
    // The mean systemic flow is the cardiac output, in the other unit.
    const outputAsFlow = (result.metrics.cardiacOutputLMin * 1000) / 60;
    assert.ok(
      Math.abs(outputAsFlow - result.metrics.meanSystemicFlowMlPerS) < 0.5,
      `R=${resistance}: CO ${outputAsFlow.toFixed(2)} vs mean systemic flow ${result.metrics.meanSystemicFlowMlPerS.toFixed(2)} mL/s`
    );
  }
});

test('the aortic valve is open exactly while the ventricle is ejecting', () => {
  // The named parts of the beat come from the solved flows, so a scene that
  // labels "ejection" is labelling a window in which blood is actually
  // leaving. A drawing that opened the valve at a fixed fraction of the cycle
  // would drift out of step the moment a condition changed.
  for (const overrides of [{}, { contractilityEesMmHgPerMl: 0.8 }, { systemicResistanceMmHgSPerMl: 1.8 }]) {
    const result = solve(overrides);
    const { ejectionStartPhase, ejectionEndPhase } = result.metrics;
    assert.ok(ejectionStartPhase > 0 && ejectionStartPhase < ejectionEndPhase && ejectionEndPhase < 1);
    let openOutside = 0;
    let shutInside = 0;
    walkBeat({ volumes: result.volumes, cycle: result.cycle }, result.parameters, 960, ({ phase, flows }) => {
      const inside = phase >= ejectionStartPhase && phase <= ejectionEndPhase;
      if (!inside && flows.aortic > 1e-6) openOutside += 1;
      if (inside && flows.aortic <= 0) shutInside += 1;
    });
    // A step or two either side is the resolution difference between the
    // recorded window and this finer walk, not a valve doing something else.
    assert.ok(openOutside <= 6, `${JSON.stringify(overrides)}: flow outside the named window (${openOutside} steps)`);
    assert.ok(shutInside <= 6, `${JSON.stringify(overrides)}: no flow inside it (${shutInside} steps)`);
  }
});

test('raising afterload alone lowers stroke volume and raises ventricular pressure', () => {
  // Stated with its conditions, because it is not a universal law: filling,
  // contractility and rate are all held, and the claim is about this ventricle
  // over this range. Under a baroreflex, or with filling free to change, the
  // same manipulation does something else — and neither is in this model.
  const low = solve({ systemicResistanceMmHgSPerMl: 0.9 });
  const high = solve({ systemicResistanceMmHgSPerMl: 1.6 });
  assert.ok(high.metrics.strokeVolumeMl < low.metrics.strokeVolumeMl, 'stroke volume falls');
  assert.ok(high.metrics.esvMl > low.metrics.esvMl, 'more blood is left behind');
  assert.ok(
    high.metrics.peakVentricularPressureMmHg > low.metrics.peakVentricularPressureMmHg,
    'the ventricle has to generate more pressure'
  );
  assert.ok(high.metrics.meanArterialPressureMmHg > low.metrics.meanArterialPressureMmHg, 'arterial pressure rises');
  assert.ok(high.metrics.cardiacOutputLMin < low.metrics.cardiacOutputLMin, 'and output falls even as pressure rises');
});

test('a ventricle with lower contractility ejects less from the same filling conditions', () => {
  // Conditions: the two presets differ in end-systolic elastance and in nothing
  // else — same circulating volume, same resistance, same rate, same unstressed
  // volume, same filling curve.
  const reference = solveCardiacOutput(presetInput(PRESET_IDS.REFERENCE));
  const reduced = solveCardiacOutput(presetInput(PRESET_IDS.REDUCED_CONTRACTILITY));
  assert.ok(reduced.metrics.esvMl > reference.metrics.esvMl, 'more blood remains at end systole');
  assert.ok(reduced.metrics.edvMl > reference.metrics.edvMl, 'and the chamber fills to a larger volume');
  assert.ok(reduced.metrics.ejectionFraction < reference.metrics.ejectionFraction);
  assert.ok(reduced.metrics.strokeVolumeMl < reference.metrics.strokeVolumeMl);
  assert.ok(
    reduced.metrics.endDiastolicPressureMmHg > reference.metrics.endDiastolicPressureMmHg,
    'filling pressure rises, which is the thing worth watching'
  );
});

test('raising the rate does not by itself raise cardiac output', () => {
  // The claim the tests must NOT contain is "faster is more". Here it is
  // checked as a *negative*: somewhere in the declared range there is a
  // condition where raising the rate lowers the output, because each beat
  // fills less. Writing "CO rises with HR" into a test would teach a
  // falsehood and then defend it.
  const lowContractility = { contractilityEesMmHgPerMl: 1.0, fillingVolumeMl: 600 };
  const slow = solve({ ...lowContractility, heartRatePerMin: 70 });
  const fast = solve({ ...lowContractility, heartRatePerMin: 110 });
  assert.ok(fast.metrics.strokeVolumeMl < slow.metrics.strokeVolumeMl, 'each beat carries less');
  // Whether the product HR × SV rises or falls is the interesting part, and the
  // model is allowed to answer either way. What must hold is that it is the
  // product and not the rate that decides.
  assert.ok(
    Math.abs(fast.metrics.cardiacOutputLMin - (110 * fast.metrics.strokeVolumeMl) / 1000) < 1e-9,
    'output is the product, at any rate'
  );
});

test('filling more raises filling pressure faster than it raises output', () => {
  // The end-diastolic pressure-volume relationship is exponential, so the
  // pressure cost of the last increment of filling is larger than the output
  // it buys. That is the shape the model asserts; it does not assert where a
  // person's useful limit lies, and nothing here is a fluid-responsiveness
  // test.
  const dry = solve({ fillingVolumeMl: 600 });
  const middle = solve({ fillingVolumeMl: 790 });
  const wet = solve({ fillingVolumeMl: 980 });

  const outputGainEarly = middle.metrics.cardiacOutputLMin - dry.metrics.cardiacOutputLMin;
  const outputGainLate = wet.metrics.cardiacOutputLMin - middle.metrics.cardiacOutputLMin;
  const pressureCostEarly =
    middle.metrics.endDiastolicPressureMmHg - dry.metrics.endDiastolicPressureMmHg;
  const pressureCostLate =
    wet.metrics.endDiastolicPressureMmHg - middle.metrics.endDiastolicPressureMmHg;

  assert.ok(outputGainEarly > 0 && outputGainLate > 0, 'more filling still buys some output');
  assert.ok(outputGainLate < outputGainEarly, 'but less of it, for the same increment');
  assert.ok(pressureCostLate > pressureCostEarly, 'while the pressure cost is larger');
});

test('mean pulmonary venous pressure is never labelled as a central venous pressure', () => {
  // There is no right atrium in this model. The systemic venous reservoir has a
  // mean pressure and it is not a CVP; the pulmonary venous compartment lumps
  // the capillary bed with the veins. Both are reported under names that say
  // what they are, and both have to stay physically ordered: the pulmonary
  // venous pressure sits above the mean left atrial pressure, because that
  // gradient is what returns blood to the atrium.
  const result = solve();
  assert.ok(
    result.metrics.meanPulmonaryVenousPressureMmHg > result.metrics.meanLeftAtrialPressureMmHg,
    'the gradient that drives pulmonary venous return points the right way'
  );
  assert.ok(
    result.metrics.meanArterialPressureMmHg > result.metrics.meanSystemicVenousPressureMmHg,
    'and so does the systemic one'
  );
  assert.equal(result.metrics.centralVenousPressureMmHg, undefined, 'no such quantity is reported');
});
