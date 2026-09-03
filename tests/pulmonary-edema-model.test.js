import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALVEOLAR,
  BASELINE_INTERSTITIAL_VOLUME_ML,
  DEFAULT_CONTROLS,
  INTERSTITIUM,
  LYMPHATICS,
  MAXIMUM_LUNG_WATER_ML,
  REFERENCE,
  SITUATIONS,
  SITUATION_IDS,
  capillaryPressure,
  createPulmonaryEdemaModel,
  floodingThresholdMmHg,
  interstitialPressure,
  lymphaticClearance,
  oxygenSaturation,
  oxygenTensionForContent,
  oxygenContent,
  situationState,
  solveSteadyState,
  stateAt,
} from '../src/models/pulmonaryEdema.js';

/**
 * **Layer 2 — model integrity.**
 *
 * Not physiology: these check that the solver does what a solver has to do —
 * converge, stay finite, stay deterministic, stay monotone where the equations
 * say it must, and never report a transient as a result. What the model claims
 * about lungs is in `respiratory-physiology.test.js`; what this repository
 * chose is in `calibration.test.js`.
 */

/** Every corner of the control space, for the tests that sweep it. */
function* everyControlCombination() {
  for (const leftAtrialPressureMmHg of [0, 5, 12, 20, 26, 40, 60])
    for (const plasmaOncoticPressureMmHg of [8, 14, 22, 28, 36])
      for (const permeability of [1, 1.8, 4, 8])
        for (const chronicity of [0, 0.5, 1])
          for (const pulmonaryFlowLPerMin of [1, 5, 14, 30])
            for (const inspiredOxygenFraction of [0.21, 0.6, 1])
              yield {
                leftAtrialPressureMmHg,
                plasmaOncoticPressureMmHg,
                permeability,
                chronicity,
                pulmonaryFlowLPerMin,
                inspiredOxygenFraction,
              };
}

test('every solved state is finite and inside its own bounds, everywhere in the control space', () => {
  let checked = 0;
  for (const controls of everyControlCombination()) {
    const state = solveSteadyState(controls);
    checked += 1;
    for (const [name, value] of Object.entries(state)) {
      if (typeof value !== 'number') continue;
      assert.ok(Number.isFinite(value), `${name} was ${value} at ${JSON.stringify(controls)}`);
    }
    assert.ok(
      state.lungWaterMl >= BASELINE_INTERSTITIAL_VOLUME_ML - 1e-6 &&
        state.lungWaterMl <= MAXIMUM_LUNG_WATER_ML + 1e-6,
      `lung water ${state.lungWaterMl} left its bounds`
    );
    assert.ok(state.floodedFraction >= 0 && state.floodedFraction <= 1);
    assert.ok(state.shuntFraction >= 0 && state.shuntFraction <= 1);
    assert.ok(state.arterialSaturation >= 0 && state.arterialSaturation <= 1);
    assert.ok(state.arterialOxygenMmHg >= 0);
    // The two compartments have to add up to the water there is.
    assert.ok(
      Math.abs(state.interstitialWaterMl + state.alveolarWaterMl - state.lungWaterMl) < 1e-9,
      'the compartments must account for all the water'
    );
  }
  assert.ok(checked > 1000, `the sweep should be broad, covered ${checked}`);
});

test('lung water rises with atrial pressure and never falls', () => {
  // Monotone, because every term in the balance is monotone in water content
  // and in pressure. It has not always been: solving the protein washout by
  // fixed-point iteration made it oscillate, and the solved water fell between
  // 20 and 22 mmHg — a lung that got better as it was loaded. Nothing else in
  // the suite would have caught that.
  let previous = -Infinity;
  for (let pressure = 0; pressure <= 60; pressure += 0.25) {
    const water = solveSteadyState({ leftAtrialPressureMmHg: pressure }).lungWaterMl;
    assert.ok(water >= previous - 1e-6, `water fell from ${previous.toFixed(2)} to ${water.toFixed(2)} at ${pressure}`);
    previous = water;
  }
});

test('the steady state is a steady state: at it, nothing accumulates', () => {
  for (const controls of [
    {},
    { leftAtrialPressureMmHg: 18 },
    { leftAtrialPressureMmHg: 22, chronicity: 0.4 },
    { permeability: 2.5 },
    { plasmaOncoticPressureMmHg: 15 },
  ]) {
    const state = solveSteadyState(controls);
    if (!state.balanced) continue;
    assert.ok(
      Math.abs(state.netAccumulationMlPerHour) < 0.5,
      `${JSON.stringify(controls)} settled with ${state.netAccumulationMlPerHour.toFixed(2)} mL/h still accumulating`
    );
  }
});

test('a lung that cannot balance says so rather than reporting a number', () => {
  // `balanced: false` is the model refusing to pretend a decompensating lung
  // has an equilibrium. Anything reading the state has to be able to tell.
  const drowning = solveSteadyState({ leftAtrialPressureMmHg: 40 });
  assert.equal(drowning.balanced, false);
  assert.equal(drowning.lungWaterMl, MAXIMUM_LUNG_WATER_ML);
  assert.ok(solveSteadyState({}).balanced, 'a normal lung does balance');
});

test('the integrator converges on the steady state the solver found', () => {
  // Two routes to the same answer, which is the check that the accumulation and
  // the equilibrium are readings of one model rather than two.
  for (const controls of [{ leftAtrialPressureMmHg: 16 }, { leftAtrialPressureMmHg: 21 }, { permeability: 2 }]) {
    const solved = solveSteadyState(controls);
    assert.ok(solved.balanced, 'the case has to have an equilibrium to converge on');
    const model = createPulmonaryEdemaModel({ controls });
    for (let i = 0; i < 60 * 600; i++) model.advance(1 / 60);
    assert.ok(
      Math.abs(model.getState().lungWaterMl - solved.lungWaterMl) < 5,
      `integrated to ${model.getState().lungWaterMl.toFixed(1)}, solver said ${solved.lungWaterMl.toFixed(1)}`
    );
  }
});

test('the answer does not depend on the frame rate', () => {
  const run = (frames) => {
    const model = createPulmonaryEdemaModel({ controls: { leftAtrialPressureMmHg: 22 } });
    for (const dt of frames) model.advance(dt);
    return model.getState().lungWaterMl;
  };
  const smooth = run(Array.from({ length: 60 * 120 }, () => 1 / 60));
  const slow = run(Array.from({ length: 30 * 120 }, () => 1 / 30));
  const jittery = run(Array.from({ length: 45 * 120 }, (_, i) => (i % 3 === 0 ? 1 / 20 : 1 / 120)));
  assert.ok(Math.abs(smooth - slow) < 1, `60 fps gave ${smooth.toFixed(2)}, 30 fps gave ${slow.toFixed(2)}`);
  assert.ok(Math.abs(smooth - jittery) < 1, `jittery frames gave ${jittery.toFixed(2)}`);
});

test('settling jumps to the equilibrium rather than to wherever the clock had got to', () => {
  // The reason `settle()` exists: a reading taken three seconds after a control
  // moved is a transient, and reporting it as the answer is how a model starts
  // teaching that a pressure is survivable when it is not.
  const model = createPulmonaryEdemaModel({ controls: { leftAtrialPressureMmHg: 21 } });
  model.advance(3);
  const transient = model.getState().lungWaterMl;
  const settled = model.settle().lungWaterMl;
  assert.ok(settled > transient + 10, 'the transient was nowhere near the answer');
  assert.ok(Math.abs(settled - solveSteadyState({ leftAtrialPressureMmHg: 21 }).lungWaterMl) < 1e-6);
});

test('the model is deterministic and resettable', () => {
  const first = createPulmonaryEdemaModel({ controls: { leftAtrialPressureMmHg: 24 } });
  const second = createPulmonaryEdemaModel({ controls: { leftAtrialPressureMmHg: 24 } });
  for (let i = 0; i < 600; i++) {
    first.advance(1 / 60);
    second.advance(1 / 60);
  }
  assert.equal(first.getState().lungWaterMl, second.getState().lungWaterMl);

  first.reset();
  assert.equal(first.getState().lungWaterMl, BASELINE_INTERSTITIAL_VOLUME_ML);
  assert.equal(first.getState().floodedFraction, 0);
});

test('changing a control changes the state without advancing the clock', () => {
  const model = createPulmonaryEdemaModel({});
  const before = model.getState();
  model.setControls({ leftAtrialPressureMmHg: 30 });
  const after = model.getState();
  assert.equal(after.lungWaterMl, before.lungWaterMl, 'no water has moved yet');
  assert.ok(after.capillaryPressureMmHg > before.capillaryPressureMmHg, 'but the pressure has');
  assert.ok(after.netAccumulationMlPerHour > before.netAccumulationMlPerHour, 'and it is now filling');
});

test('the capillary sits above the atrium, by more when the flow is higher', () => {
  assert.ok(capillaryPressure(10, 5) > 10);
  assert.ok(capillaryPressure(10, 15) > capillaryPressure(10, 5));
  assert.equal(capillaryPressure(10, 0), 10, 'with no flow there is no drop to be upstream of');
});

test('interstitial pressure rises from subatmospheric and saturates', () => {
  assert.equal(interstitialPressure(BASELINE_INTERSTITIAL_VOLUME_ML), REFERENCE.dryInterstitialPressureMmHg);
  let previous = -Infinity;
  for (let water = BASELINE_INTERSTITIAL_VOLUME_ML; water <= MAXIMUM_LUNG_WATER_ML; water += 10) {
    const pressure = interstitialPressure(water);
    assert.ok(pressure >= previous, 'interstitial pressure never falls as water is added');
    previous = pressure;
  }
  assert.ok(previous < INTERSTITIUM.plateauPressureMmHg + 0.01, 'and it stops at the plateau');
  // The curve has to cross zero somewhere inside the interstitial range, or the
  // "subatmospheric becoming positive" buffer is not being spent at all.
  assert.ok(interstitialPressure(INTERSTITIUM.floodThresholdMl) > 0);
});

test('lymphatic clearance rises with filling and stops at its ceiling', () => {
  assert.equal(lymphaticClearance(BASELINE_INTERSTITIAL_VOLUME_ML, 0), LYMPHATICS.baselineFlowMlPerHour);
  // Measured inside the rising part: the ceiling is reached by about 470 mL, so
  // comparing two volumes above that compares the ceiling with itself.
  assert.ok(lymphaticClearance(430, 0) > lymphaticClearance(410, 0));
  const acuteCeiling = LYMPHATICS.baselineFlowMlPerHour * LYMPHATICS.acuteCapacityMultiple;
  assert.ok(Math.abs(lymphaticClearance(MAXIMUM_LUNG_WATER_ML, 0) - acuteCeiling) < 1e-9);
  assert.ok(
    lymphaticClearance(MAXIMUM_LUNG_WATER_ML, 1) > lymphaticClearance(MAXIMUM_LUNG_WATER_ML, 0),
    'adaptation raises the ceiling'
  );
});

test('the oxygen dissociation curve and its inverse agree with each other', () => {
  // The inverse is bisected against the forward curve rather than approximated,
  // so this is the check that the bisection is converging rather than the check
  // that two published fits happen to agree.
  for (const tension of [10, 27, 40, 60, 100, 200, 500, 700]) {
    const content = oxygenContent(tension, REFERENCE.haemoglobinGDl);
    const back = oxygenTensionForContent(content, REFERENCE.haemoglobinGDl);
    assert.ok(Math.abs(back - tension) < 0.5, `${tension} mmHg came back as ${back.toFixed(2)}`);
  }
  // And the curve is the shape it is supposed to be: steep low down, flat high
  // up, and passing near 50% at the P50 the equation encodes.
  assert.ok(oxygenSaturation(27) > 0.45 && oxygenSaturation(27) < 0.55, 'P50 near 27 mmHg');
  assert.ok(oxygenSaturation(100) > 0.96);
  assert.ok(oxygenSaturation(600) - oxygenSaturation(300) < 0.01, 'flat where the extra tension is dissolved');
});

test('a normal lung breathing air reports the gas the textbooks report', () => {
  const normal = stateAt(BASELINE_INTERSTITIAL_VOLUME_ML, {});
  assert.ok(normal.arterialOxygenMmHg > 85 && normal.arterialOxygenMmHg < 105, `PaO₂ ${normal.arterialOxygenMmHg}`);
  assert.ok(normal.arterialSaturation > 0.95 && normal.arterialSaturation < 0.99);
  // Not zero: a normal lung has an anatomical shunt, and a model that reported
  // a perfect A–a difference would make every abnormal one look smaller.
  assert.ok(
    normal.alveolarArterialDifferenceMmHg > 2 && normal.alveolarArterialDifferenceMmHg < 15,
    `A–a was ${normal.alveolarArterialDifferenceMmHg.toFixed(1)} mmHg`
  );
  assert.equal(normal.floodedFraction, 0);
  assert.ok(Math.abs(normal.shuntFraction - ALVEOLAR.anatomicalShunt) < 1e-9);
});

test('every named situation solves, and they say different things', () => {
  assert.ok(SITUATION_IDS.length >= 5);
  const water = new Map();
  for (const id of SITUATION_IDS) {
    const state = situationState(id);
    assert.ok(Number.isFinite(state.lungWaterMl), `${id} did not solve`);
    water.set(id, state.lungWaterMl);
  }
  // The two that exist to be compared have to differ, or the contrast the
  // scene is built on is not in the model.
  assert.ok(
    water.get('acuteCardiogenic') > water.get('chronicCardiogenic') + 100,
    'the acute and chronic lungs at the same pressure must not look alike'
  );
  assert.equal(situationState('normal').floodedFraction, 0);
  assert.ok(situationState('acuteCardiogenic').floodedFraction > 0);
});

test('the flooding threshold is searched for, not stored', () => {
  // If any constant in the file were the threshold, moving an unrelated control
  // would not move it. All four of these do.
  const base = floodingThresholdMmHg({});
  assert.ok(floodingThresholdMmHg({ chronicity: 1 }) > base);
  assert.ok(floodingThresholdMmHg({ plasmaOncoticPressureMmHg: 34 }) > base);
  assert.ok(floodingThresholdMmHg({ permeability: 2 }) < base);
  assert.ok(floodingThresholdMmHg({ pulmonaryFlowLPerMin: 12 }) < base);
  // A barrier that has all but failed drives the threshold towards nothing —
  // but not to nothing. Even then the lung needs *some* pressure, because a
  // full interstitium sits above atmospheric and a capillary at zero cannot
  // push water into it. That is the model saying something rather than
  // saturating, so it is worth pinning.
  assert.ok(floodingThresholdMmHg({ permeability: 40 }) < 3);

  // And a lung that cannot flood anywhere in the range says null rather than
  // returning the end of the search.
  assert.equal(floodingThresholdMmHg({ chronicity: 1, plasmaOncoticPressureMmHg: 36 }, { maxPressureMmHg: 40 }), null);
});

test('the default controls describe a normal resting adult', () => {
  const state = stateAt(BASELINE_INTERSTITIAL_VOLUME_ML, DEFAULT_CONTROLS);
  assert.equal(state.floodedFraction, 0);
  assert.ok(Math.abs(state.netAccumulationMlPerHour) < 0.5);
  assert.equal(DEFAULT_CONTROLS.permeability, 1, 'an intact barrier');
  assert.equal(DEFAULT_CONTROLS.chronicity, 0, 'and a lung that has not had to adapt');
});
