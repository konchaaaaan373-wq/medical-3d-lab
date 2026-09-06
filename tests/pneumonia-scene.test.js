import test from 'node:test';
import assert from 'node:assert/strict';
import { PneumoniaScene } from '../src/scenes/respiratory/scenes/pneumonia/PneumoniaScene.js';
import { LEGEND, MODEL_SCOPE, PROGRESS_LABEL, RANGE, STAGES } from '../src/data/pneumonia.js';
import {
  PNEUMONIA_TEACHING_MAX_CONSOLIDATION,
  PNEUMONIA_UNIT_COUNT,
  solvePneumonia,
} from '../src/models/pneumonia.js';

/**
 * **Layer 2 — model integrity.** The scene is driven by `App.js` through a
 * fixed interface; these tests speak that interface back at it and check that
 * everything on screen is a reading of `solvePneumonia()`. The physiology is
 * checked in `respiratory-physiology.test.js`.
 */

const scene = () => {
  const built = new PneumoniaScene({});
  built.build();
  return built;
};

test('pneumonia scene: builds, updates and disposes through the interface the app drives', () => {
  const built = scene();
  for (const method of ['setProgress', 'update', 'getAnnotations', 'getMetrics', 'dispose']) {
    assert.equal(typeof built[method], 'function', `missing ${method}()`);
  }
  assert.equal(built.units.length, PNEUMONIA_UNIT_COUNT);
  assert.ok(built.root.children.length > 0);
  built.setProgress(0.5);
  built.update(0.016);
  built.update(0.5);
  for (const unit of built.units) {
    assert.ok(Number.isFinite(unit.air.scale.x));
    assert.ok(Number.isFinite(unit.bead.position.x));
  }
  assert.doesNotThrow(() => built.dispose());
});

test('pneumonia scene: the slider is a teaching axis that stops at 60% of the lung, not the solver domain', () => {
  const built = scene();
  built.setProgress(1);
  assert.equal(built.state.controls.consolidatedFraction, PNEUMONIA_TEACHING_MAX_CONSOLIDATION);
  assert.ok(built.state.ventilationFraction > 0, 'full travel never shows a lung with no ventilation');
  assert.ok(built.state.consolidatedFraction <= PNEUMONIA_TEACHING_MAX_CONSOLIDATION + 1e-12);
  const metrics = Object.fromEntries(built.getMetrics().map((metric) => [metric.id, metric.value]));
  assert.equal(metrics.consolidation, Math.round(PNEUMONIA_TEACHING_MAX_CONSOLIDATION * 100));
  assert.ok(metrics.ventilation > 0);
  // Out-of-range and non-finite progress cannot push past the range either.
  for (const value of [2, Infinity, NaN, -1]) {
    built.setProgress(value);
    assert.ok(built.state.controls.consolidatedFraction <= PNEUMONIA_TEACHING_MAX_CONSOLIDATION + 1e-12, String(value));
    assert.ok(built.getMetrics().every((metric) => Number.isFinite(Number(metric.value))), String(value));
  }
  // The solver itself still reaches total consolidation: that boundary is a
  // property of the model, deliberately not reachable from the slider.
  assert.equal(solvePneumonia({ consolidatedFraction: 1 }).ventilationFraction, 0);
  assert.equal(RANGE.max, 1, 'the axis is 0–1; the mapping, not the range, applies the cap');
  assert.match(PROGRESS_LABEL.label, /60%/);
  assert.match(PROGRESS_LABEL.labelJa, /60%/);
  built.dispose();
});

test('pneumonia scene: every metric, annotation, stage and legend entry reads the same solve and is bilingual', () => {
  const built = scene();
  built.setProgress(0.7);
  const state = built.state;
  const metrics = Object.fromEntries(built.getMetrics().map((metric) => [metric.id, metric]));
  assert.equal(metrics.consolidation.value, Math.round(state.consolidatedFraction * 100));
  assert.equal(metrics.ventilation.value, Math.round(state.ventilationFraction * 100));
  assert.equal(metrics.shunt.value, Math.round(state.shuntFraction * 100));
  for (const metric of Object.values(metrics)) assert.ok(metric.label && metric.labelJa, metric.id);
  for (const unit of built.units) {
    const solved = state.units[unit.id];
    assert.equal(unit.consolidation.visible, solved.consolidation > 0.005);
    assert.ok(unit.airMaterial.opacity >= 0.02 && unit.airMaterial.opacity <= 0.6);
    assert.ok(unit.perfusionMaterial.opacity > 0, `unit ${unit.id} still draws perfusion`);
  }
  for (const annotation of built.getAnnotations()) {
    assert.ok(annotation.text && annotation.sub, annotation.id);
    assert.ok(annotation.position && Number.isFinite(annotation.position.x), annotation.id);
  }
  for (const stage of STAGES) assert.ok(stage.name && stage.nameJa && stage.summary && stage.summaryJa, stage.id);
  const positions = STAGES.map((stage) => stage.at);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal(positions[0], 0);
  assert.ok(positions[positions.length - 1] <= 1);
  for (const entry of LEGEND) assert.ok(entry.label && entry.labelJa, entry.key);
  assert.equal(PneumoniaScene.meta.modelScope, MODEL_SCOPE);
  assert.match(MODEL_SCOPE.cautions.map((entry) => entry.text).join(' '), /60%/);
  built.dispose();
});

test('pneumonia scene: consolidated units stay perfused on screen as well as in the solve', () => {
  const built = scene();
  built.setProgress(1);
  const consolidated = built.units.filter((unit) => unit.consolidation.visible);
  assert.ok(consolidated.length > 0);
  for (const unit of consolidated) {
    assert.ok(unit.perfusionMaterial.opacity >= 0.18, `unit ${unit.id}: the red orbit never disappears`);
  }
  built.dispose();
});
