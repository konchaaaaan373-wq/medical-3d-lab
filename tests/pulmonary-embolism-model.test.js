import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_MODELLED_OBSTRUCTED_TERRITORY,
  PE_UNIT_COUNT,
  solvePulmonaryEmbolism,
} from '../src/models/pulmonaryEmbolism.js';
import { MODEL_SCOPE } from '../src/data/pulmonaryEmbolism.js';
import { PulmonaryEmbolismScene } from '../src/scenes/respiratory/scenes/pulmonaryEmbolism/PulmonaryEmbolismScene.js';

test('pulmonary embolism: the reference lung has perfusion in every ventilated territory', () => {
  const state = solvePulmonaryEmbolism();
  assert.equal(state.units.length, PE_UNIT_COUNT);
  assert.equal(state.obstructedTerritory, 0);
  assert.equal(state.totalConductanceFraction, 1);
  assert.equal(state.underperfusedVentilationFraction, 0);
  assert.equal(state.relativePulmonaryVascularResistance, 1);
});

test('pulmonary embolism: obstruction leaves distal ventilation present', () => {
  const state = solvePulmonaryEmbolism({ obstruction: 0.7 });
  assert.ok(state.units.some((unit) => unit.occlusion > 0.5));
  assert.ok(state.units.every((unit) => unit.ventilation === 1));
  assert.ok(state.units.some((unit) => unit.perfusionAtFixedPressure < unit.ventilation));
});

test('pulmonary embolism: vascular conductance falls and relative resistance rises monotonically', () => {
  let previousConductance = Infinity;
  let previousResistance = -Infinity;
  let previousUnderperfused = -Infinity;
  for (let step = 0; step <= 20; step += 1) {
    const state = solvePulmonaryEmbolism({ obstruction: step / 20 });
    assert.ok(state.totalConductanceFraction <= previousConductance + 1e-12);
    assert.ok(state.relativePulmonaryVascularResistance >= previousResistance - 1e-12);
    assert.ok(state.underperfusedVentilationFraction >= previousUnderperfused - 1e-12);
    previousConductance = state.totalConductanceFraction;
    previousResistance = state.relativePulmonaryVascularResistance;
    previousUnderperfused = state.underperfusedVentilationFraction;
  }
});

test('pulmonary embolism: the teaching axis is bounded below total-lung obstruction', () => {
  const state = solvePulmonaryEmbolism({ obstruction: 9 });
  assert.equal(state.obstructedTerritory, MAX_MODELLED_OBSTRUCTED_TERRITORY);
  assert.equal(state.underperfusedVentilationFraction, state.obstructedTerritory);
  assert.ok(state.units.some((unit) => unit.occlusion === 1));
  assert.ok(state.units.some((unit) => unit.perfusionAtFixedPressure === 0));
  assert.ok(state.totalConductanceFraction > 0);
  assert.ok(Number.isFinite(state.relativePulmonaryVascularResistance));
});

test('pulmonary embolism: the solver emits no clinical pressure, gas or risk score', () => {
  const document = Object.keys(solvePulmonaryEmbolism({ obstruction: 0.5 })).join(' ');
  assert.doesNotMatch(document, /pao2|spo2|pressure|mortality|risk|rvFunction|vdVt/i);
});

test('pulmonary embolism: the public scope panel is complete and bilingual', () => {
  assert.equal(PulmonaryEmbolismScene.meta.modelScope, MODEL_SCOPE);
  assert.ok(MODEL_SCOPE.question && MODEL_SCOPE.questionJa);
  for (const key of ['answers', 'excludes', 'cautions', 'sources']) {
    assert.ok(MODEL_SCOPE[key].length, key);
    for (const entry of MODEL_SCOPE[key]) assert.ok(entry.text && entry.textJa, `${key} is bilingual`);
  }
  assert.match(MODEL_SCOPE.evidence, /^docs\/model-evidence\//);
  assert.match(MODEL_SCOPE.cautions.map((entry) => entry.text).join(' '), /not measured PVR/i);
});
