import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PNEUMONIA_UNIT_COUNT,
  solvePneumonia,
} from '../src/models/pneumonia.js';
import { MODEL_SCOPE } from '../src/data/pneumonia.js';
import { PneumoniaScene } from '../src/scenes/respiratory/scenes/pneumonia/PneumoniaScene.js';

test('pneumonia: the reference lung has matched ventilation and perfusion', () => {
  const state = solvePneumonia();
  assert.equal(state.units.length, PNEUMONIA_UNIT_COUNT);
  assert.equal(state.consolidatedFraction, 0);
  assert.equal(state.ventilationFraction, 1);
  assert.equal(state.shuntFraction, 0);
  assert.ok(state.units.every((unit) => unit.ventilation === 1 && unit.perfusion > 0));
});

test('pneumonia: more consolidation monotonically removes ventilation and raises shunt', () => {
  let previousVentilation = Infinity;
  let previousShunt = -Infinity;
  for (let step = 0; step <= 20; step += 1) {
    const state = solvePneumonia({ consolidatedFraction: step / 20 });
    assert.ok(state.ventilationFraction <= previousVentilation + 1e-12);
    assert.ok(state.shuntFraction >= previousShunt - 1e-12);
    previousVentilation = state.ventilationFraction;
    previousShunt = state.shuntFraction;
  }
});

test('pneumonia: consolidated units remain perfused, which is the shunt mechanism', () => {
  const state = solvePneumonia({ consolidatedFraction: 0.42 });
  const consolidated = state.units.filter((unit) => unit.consolidation > 0);
  assert.ok(consolidated.length > 0);
  assert.ok(consolidated.every((unit) => unit.ventilation < 1));
  assert.ok(consolidated.every((unit) => unit.perfusion > 0));
  assert.ok(state.shuntFraction > 0);
});

test('pneumonia: a fully consolidated share has no ventilation', () => {
  const state = solvePneumonia({ consolidatedFraction: 1 });
  assert.equal(state.ventilationFraction, 0);
  assert.ok(state.units.every((unit) => unit.consolidation === 1));
  assert.ok(state.units.every((unit) => unit.ventilation === 0));
  assert.ok(state.units.every((unit) => unit.perfusion > 0));
});

test('pneumonia: HPV diverts some flow without abolishing shunt', () => {
  const none = solvePneumonia({ consolidatedFraction: 0.4, hypoxicVasoconstriction: 0 });
  const strong = solvePneumonia({ consolidatedFraction: 0.4, hypoxicVasoconstriction: 1 });
  assert.ok(strong.shuntFraction < none.shuntFraction);
  assert.ok(strong.shuntFraction > 0);
});

test('pneumonia: all reported fractions stay finite and bounded', () => {
  for (const consolidatedFraction of [-1, 0, 0.37, 1, 2]) {
    const state = solvePneumonia({ consolidatedFraction });
    for (const key of [
      'consolidatedFraction',
      'ventilationFraction',
      'shuntFraction',
      'exchangeMatchedPerfusionFraction',
    ]) {
      assert.ok(Number.isFinite(state[key]), key);
      assert.ok(state[key] >= 0 && state[key] <= 1, `${key} stays a fraction`);
    }
  }
});

test('pneumonia: the public scope panel is complete and bilingual', () => {
  assert.equal(PneumoniaScene.meta.modelScope, MODEL_SCOPE);
  assert.ok(MODEL_SCOPE.question && MODEL_SCOPE.questionJa);
  for (const key of ['answers', 'excludes', 'cautions', 'sources']) {
    assert.ok(MODEL_SCOPE[key].length, key);
    for (const entry of MODEL_SCOPE[key]) assert.ok(entry.text && entry.textJa, `${key} is bilingual`);
  }
  assert.match(MODEL_SCOPE.evidence, /^docs\/model-evidence\//);
  assert.match(MODEL_SCOPE.cautions.map((entry) => entry.text).join(' '), /not patient measurements/i);
});
