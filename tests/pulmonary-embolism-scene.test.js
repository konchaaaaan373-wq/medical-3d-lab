import test from 'node:test';
import assert from 'node:assert/strict';
import { PulmonaryEmbolismScene } from '../src/scenes/respiratory/scenes/pulmonaryEmbolism/PulmonaryEmbolismScene.js';
import { LEGEND, MODEL_SCOPE, PROGRESS_LABEL, STAGES } from '../src/data/pulmonaryEmbolism.js';
import { MAX_MODELLED_OBSTRUCTED_TERRITORY, PE_UNIT_COUNT } from '../src/models/pulmonaryEmbolism.js';
import { PROXIMAL_OCCLUSION_SITE, buildVascularTerritory } from '../src/scenes/respiratory/organs/vascularTerritory.js';

/**
 * **Layer 2 — model integrity.** The scene against the interface the app
 * drives it through, and against its own solve. Physiology lives in
 * `respiratory-physiology.test.js`.
 */

const scene = () => {
  const built = new PulmonaryEmbolismScene({});
  built.build();
  return built;
};

test('pulmonary embolism scene: builds, updates and disposes through the interface the app drives', () => {
  const built = scene();
  for (const method of ['setProgress', 'update', 'getAnnotations', 'getMetrics', 'dispose']) {
    assert.equal(typeof built[method], 'function', `missing ${method}()`);
  }
  assert.equal(built.units.length, PE_UNIT_COUNT);
  assert.equal(built.territories.length, PE_UNIT_COUNT);
  assert.equal(built.units.filter((unit) => unit.vessel.name.startsWith('pulmonary-territory-')).length, PE_UNIT_COUNT);
  built.setProgress(0.6);
  built.update(0.016);
  built.update(0.4);
  for (const unit of built.units) {
    assert.ok(Number.isFinite(unit.flow.position.x), `flow marker ${unit.id}`);
    assert.ok(Number.isFinite(unit.air.scale.x));
  }
  assert.doesNotThrow(() => built.dispose());
});

test('pulmonary embolism scene: every read-out, embolus and branch reads the same solve', () => {
  const built = scene();
  built.setProgress(1);
  const state = built.state;
  assert.equal(state.obstructedTerritory, MAX_MODELLED_OBSTRUCTED_TERRITORY);
  const metrics = Object.fromEntries(built.getMetrics().map((metric) => [metric.id, metric]));
  assert.equal(metrics.territory.value, Math.round(state.obstructedTerritory * 100));
  assert.equal(metrics['dead-space'].value, Math.round(state.underperfusedVentilationFraction * 100));
  assert.equal(metrics.pvr.value, state.relativePulmonaryVascularResistance.toFixed(1));
  assert.match(String(metrics.pvr.value), /^\d+\.\d$/, 'relative PVR is shown to one decimal');
  for (const metric of Object.values(metrics)) assert.ok(metric.label && metric.labelJa, metric.id);
  for (const unit of built.units) {
    const solved = state.units[unit.id];
    assert.equal(unit.embolus.visible, solved.occlusion > 0.015, `embolus ${unit.id}`);
    assert.equal(unit.flow.visible, solved.perfusionAtFixedPressure > 0.09, `flow ${unit.id}`);
    assert.ok(unit.air.visible, `unit ${unit.id} keeps its ventilated bed`);
  }
  assert.ok(built.units.some((unit) => unit.embolus.visible), 'at full travel some branches are obstructed');
  assert.ok(built.units.some((unit) => unit.flow.visible), 'and some still carry flow');
  assert.match(PROGRESS_LABEL.label, /65%/);
  assert.match(PROGRESS_LABEL.labelJa, /65%/);
  built.dispose();
});

test('pulmonary embolism scene: emboli sit on the branch anchor the territory builder names, never on a bare curve fraction', () => {
  const built = scene();
  for (const unit of built.units) {
    const site = unit.territory.anchors.proximalOcclusionSite;
    assert.ok(unit.embolus.position.distanceTo(site) < 1e-9, `embolus ${unit.id} sits at the named site`);
    assert.ok(site.distanceTo(unit.territory.anchors.origin) > 0, 'clear of the hilum');
    assert.ok(site.distanceTo(unit.territory.anchors.distalBed) > 0, 'short of the bed');
  }
  assert.ok(PROXIMAL_OCCLUSION_SITE > 0 && PROXIMAL_OCCLUSION_SITE < 0.5, 'proximal half of the branch');
  const annotation = built.getAnnotations().find((entry) => entry.id === 'vascular-obstruction');
  assert.ok(annotation.position.distanceTo(built.units[0].territory.anchors.proximalOcclusionSite) < 1);
  built.dispose();
});

test('vascular territory builder: anchors lie on the branch and dispose releases the geometry', async () => {
  const THREE = await import('three');
  const territory = buildVascularTerritory({
    hilum: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(2, 1, 0),
  });
  assert.ok(territory.anchors.origin.distanceTo(new THREE.Vector3(0, 0, 0)) < 1e-6);
  assert.ok(territory.anchors.distalBed.distanceTo(new THREE.Vector3(2, 1, 0)) < 1e-6);
  assert.ok(territory.anchors.proximalOcclusionSite.distanceTo(territory.pointAt(PROXIMAL_OCCLUSION_SITE)) < 1e-9);
  assert.ok(territory.geometry.attributes.position.count > 0);
  territory.dispose();
});

test('pulmonary embolism scene: stages, legend and annotations are bilingual and in order', () => {
  const built = scene();
  for (const annotation of built.getAnnotations()) {
    assert.ok(annotation.text && annotation.sub, annotation.id);
    assert.ok(annotation.position && Number.isFinite(annotation.position.x), annotation.id);
  }
  for (const stage of STAGES) assert.ok(stage.name && stage.nameJa && stage.summary && stage.summaryJa, stage.id);
  const positions = STAGES.map((stage) => stage.at);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal(positions[0], 0);
  for (const entry of LEGEND) assert.ok(entry.label && entry.labelJa, entry.key);
  assert.equal(PulmonaryEmbolismScene.meta.modelScope, MODEL_SCOPE);
  built.dispose();
});
