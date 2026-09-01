import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASELINE_CIRCULATION,
  MAX_INTERVENTION_STEPS,
  arterialOxygenContent,
  cardiacOutput,
  oxygenDelivery,
  solveCirculation,
} from '../src/models/circulation.js';
import { CirculationScene } from '../src/scenes/cardiovascular/scenes/circulation/CirculationScene.js';

test('circulation definitions preserve their clinical units', () => {
  const cardiacOutputLMin = cardiacOutput({ heartRatePerMin: 100, strokeVolumeMl: 50 });
  assert.equal(cardiacOutputLMin, 5);

  const arterialOxygenContentMlDl = arterialOxygenContent({
    hemoglobinGdl: 10,
    arterialOxygenSaturation: 1,
    arterialOxygenPressureMmHg: 100,
  });
  assert.ok(Math.abs(arterialOxygenContentMlDl - 13.7) < 1e-12);
  assert.equal(oxygenDelivery({ cardiacOutputLMin, arterialOxygenContentMlDl }), 685);
});

test('the constructed case has MAP 70 despite low flow', () => {
  const state = solveCirculation();
  assert.equal(Math.round(state.meanArterialPressureMmHg), 70);
  assert.equal(state.cardioOutputLMin, undefined, 'a misspelled duplicate output must never appear');
  assert.ok(state.cardiacOutputLMin < 4, `baseline CO was ${state.cardiacOutputLMin}`);
  assert.ok(state.oxygenDeliveryMlMin < 550, `baseline DO2 was ${state.oxygenDeliveryMlMin}`);
  assert.equal(state.heartRatePerMin, BASELINE_CIRCULATION.heartRatePerMin);
});

test('fluid raises flow and DO2 in the explicitly responsive case', () => {
  const before = solveCirculation();
  const after = solveCirculation({ fluidSteps: MAX_INTERVENTION_STEPS });
  assert.ok(after.strokeVolumeMl > before.strokeVolumeMl);
  assert.ok(after.cardiacOutputLMin > before.cardiacOutputLMin);
  assert.ok(after.oxygenDeliveryMlMin > before.oxygenDeliveryMlMin);

  const flowGain = after.cardiacOutputLMin / before.cardiacOutputLMin - 1;
  const pressureGain = after.meanArterialPressureMmHg / before.meanArterialPressureMmHg - 1;
  assert.ok(flowGain > pressureGain * 1.5, 'MAP should understate the change in flow');
});

test('dobutamine improves flow while resistance falls in this case', () => {
  const before = solveCirculation();
  const after = solveCirculation({ dobutamineSteps: MAX_INTERVENTION_STEPS });
  assert.ok(after.strokeVolumeMl > before.strokeVolumeMl);
  assert.ok(after.cardiacOutputLMin > before.cardiacOutputLMin);
  assert.ok(after.systemicVascularResistanceDynSCm5 < before.systemicVascularResistanceDynSCm5);
  assert.ok(after.oxygenDeliveryMlMin > before.oxygenDeliveryMlMin);

  const flowGain = after.cardiacOutputLMin / before.cardiacOutputLMin - 1;
  const pressureGain = after.meanArterialPressureMmHg / before.meanArterialPressureMmHg - 1;
  assert.ok(flowGain > pressureGain * 3, 'the model should make the CO/MAP dissociation legible');
});

test('the intervention surface is finite, bounded and monotonic', () => {
  let previousFluid = solveCirculation();
  let previousDobutamine = solveCirculation();
  for (let step = 1; step <= MAX_INTERVENTION_STEPS; step++) {
    const fluid = solveCirculation({ fluidSteps: step });
    const dobutamine = solveCirculation({ dobutamineSteps: step });
    assert.ok(fluid.cardiacOutputLMin > previousFluid.cardiacOutputLMin);
    assert.ok(dobutamine.cardiacOutputLMin > previousDobutamine.cardiacOutputLMin);
    for (const state of [fluid, dobutamine]) {
      for (const value of Object.values(state)) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value));
      }
    }
    previousFluid = fluid;
    previousDobutamine = dobutamine;
  }
  assert.deepEqual(solveCirculation({ fluidSteps: 99 }), solveCirculation({ fluidSteps: MAX_INTERVENTION_STEPS }));
  assert.deepEqual(solveCirculation({ dobutamineSteps: -2 }), solveCirculation());
});

test('the scene exposes exactly two actions and three read-outs', () => {
  const scene = new CirculationScene({ viewer: {} });
  assert.deepEqual(scene.getModelControls().map(({ id, kind }) => [id, kind]), [
    ['fluid', 'action'],
    ['dobutamine', 'action'],
  ]);
  assert.deepEqual(scene.getMetrics().map(({ id }) => id), ['map', 'co', 'do2']);

  const baseline = scene.getMetrics();
  scene.setModelControl('fluid', 2);
  assert.notDeepEqual(scene.getMetrics(), baseline);
  scene.resetModelControls();
  assert.deepEqual(scene.getMetrics(), baseline);
  assert.equal(CirculationScene.meta.progression.enabled, false);
  assert.equal(CirculationScene.meta.modelControls.primary, true);
});
