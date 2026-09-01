import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { framePose } from '../src/app/framing.js';
import {
  BASELINE_CIRCULATION,
  CIRCULATION_INTERVENTIONS,
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

test('the constructed case has MAP 70 because resistance supports low unindexed flow', () => {
  const state = solveCirculation();
  assert.equal(Math.round(state.meanArterialPressureMmHg), 70);
  assert.ok(state.cardiacOutputLMin < 4, `baseline CO was ${state.cardiacOutputLMin}`);
  assert.ok(state.oxygenDeliveryMlMin < 550, `baseline DO2 was ${state.oxygenDeliveryMlMin}`);
  assert.equal(state.heartRatePerMin, BASELINE_CIRCULATION.heartRatePerMin);
  assert.equal(state.intervention, CIRCULATION_INTERVENTIONS.BASELINE);
});

test('MAP depends on both flow and resistance in the constructed case', () => {
  const baseline = solveCirculation();
  const fluid = solveCirculation({ intervention: CIRCULATION_INTERVENTIONS.FLUID });
  const dobutamine = solveCirculation({ intervention: CIRCULATION_INTERVENTIONS.DOBUTAMINE });

  assert.ok(fluid.cardiacOutputLMin > baseline.cardiacOutputLMin);
  assert.equal(fluid.systemicVascularResistanceDynSCm5, baseline.systemicVascularResistanceDynSCm5);
  assert.ok(fluid.meanArterialPressureMmHg > baseline.meanArterialPressureMmHg);

  assert.ok(dobutamine.cardiacOutputLMin > baseline.cardiacOutputLMin);
  assert.ok(dobutamine.systemicVascularResistanceDynSCm5 < baseline.systemicVascularResistanceDynSCm5);
  assert.ok(
    Math.abs(dobutamine.meanArterialPressureMmHg - baseline.meanArterialPressureMmHg) < 3,
    'the illustrative DOB state is calibrated to keep MAP near baseline while flow rises'
  );
});

test('the three teaching states are mutually exclusive and invalid input returns to baseline', () => {
  for (const intervention of Object.values(CIRCULATION_INTERVENTIONS)) {
    const state = solveCirculation({ intervention });
    assert.equal(state.intervention, intervention);
    for (const value of Object.values(state)) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value));
    }
  }
  assert.deepEqual(solveCirculation({ intervention: 'fluid+dobutamine' }), solveCirculation());
});

test('the scene exposes one three-way choice and three baseline comparisons', () => {
  const scene = new CirculationScene({ viewer: {} });
  const controls = scene.getModelControls();
  assert.equal(controls.length, 1);
  assert.equal(controls[0].id, 'intervention');
  assert.equal(controls[0].kind, 'choice');
  assert.deepEqual(controls[0].options.map(({ value }) => value), ['baseline', 'fluid', 'dobutamine']);

  assert.deepEqual(scene.getMetrics().map(({ id }) => id), ['map', 'co', 'do2']);
  assert.ok(scene.getMetrics().every((metric) => metric.reference == null && metric.change == null));

  scene.setModelControl('intervention', 'fluid');
  assert.equal(scene.getModelControls()[0].value, 'fluid');
  assert.ok(scene.getMetrics().every((metric) => metric.reference != null));
  assert.deepEqual(scene.getMetrics().map(({ change }) => change), ['up', 'up', 'up']);

  scene.setModelControl('intervention', 'dobutamine');
  assert.equal(scene.getModelControls()[0].value, 'dobutamine');
  assert.deepEqual(scene.getMetrics().map(({ change }) => change), ['flat', 'up', 'up']);
  scene.resetModelControls();
  assert.equal(scene.getModelControls()[0].value, 'baseline');
});

test('the 3D makes flow, distributed resistance and oxygen cargo move without colouring tissue', () => {
  const scene = new CirculationScene({ viewer: {} });
  const root = scene.build();
  assert.ok(root instanceof Object3D);
  assert.equal(scene.resistanceBands.children.length, 3, 'resistance is distributed, not one local ring');

  const baselinePresentation = { ...scene.presentationState };
  scene.setModelControl('intervention', 'dobutamine');
  const after = scene.presentationState;
  assert.ok(after.arterialFlowRate > baselinePresentation.arterialFlowRate);
  assert.ok(after.oxygenDeliveryRate > baselinePresentation.oxygenDeliveryRate);
  assert.ok(after.resistanceCalibre > baselinePresentation.resistanceCalibre);
  assert.equal(
    after.tissueEmissiveIntensity,
    baselinePresentation.tissueEmissiveIntensity,
    'calculated global DO2 must not be rendered as improved tissue oxygenation'
  );
  assert.match(scene.getMetrics().find((metric) => metric.id === 'do2').labelJa, /計算上/);
  scene.update(1 / 60);
  scene.dispose();
});

test('portrait framing keeps the whole causal chain and every label inside the horizontal frame', () => {
  const scene = new CirculationScene({ viewer: {} });
  const root = scene.build();
  root.updateMatrixWorld(true);
  const aspect = 390 / 844;
  const pose = framePose(
    CirculationScene.cameraPose,
    aspect,
    'learning',
    42,
    0.26,
    CirculationScene.framing
  );
  const camera = new PerspectiveCamera(42, aspect, 0.1, 100);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  for (const annotation of scene.getAnnotations()) {
    const projected = annotation.position.clone().project(camera);
    assert.ok(Math.abs(projected.x) < 0.9, `${annotation.id} was cropped at x=${projected.x}`);
  }

  const box = new Box3().setFromObject(root);
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const projected = new Vector3(x, y, z).project(camera);
        assert.ok(Math.abs(projected.x) < 0.98, `the causal chain was cropped at x=${projected.x}`);
      }
    }
  }
  scene.dispose();
});
