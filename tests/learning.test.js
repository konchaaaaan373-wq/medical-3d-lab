import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING_MODULES, STAGES } from '../src/data/heartFailure.js';
import { HeartFailureScene } from '../src/scenes/heartFailure/HeartFailureScene.js';
import { sampleHemodynamics } from '../src/scenes/heartFailure/hemodynamics.js';

/**
 * A lesson is content that makes a claim about the model. These tests are what
 * stop the two drifting apart: every stored answer is re-derived from the
 * circulation model here, so a change to the physics that invalidated a lesson
 * would fail the build rather than quietly teach the wrong thing.
 */

const scene = () => new HeartFailureScene({ viewer: {} });
const modules = () => scene().getLearningModules();

test('every lesson is structurally complete and bilingual', () => {
  assert.ok(LEARNING_MODULES.length > 0, 'there should be at least one lesson');
  const ids = new Set();
  for (const module of LEARNING_MODULES) {
    assert.ok(!ids.has(module.id), `duplicate lesson id ${module.id}`);
    ids.add(module.id);
    for (const [en, ja, where] of [
      [module.title, module.titleJa, 'title'],
      [module.question.text, module.question.textJa, 'question'],
      [module.manipulation.text, module.manipulation.textJa, 'manipulation'],
      [module.manipulation.action, module.manipulation.actionJa, 'manipulation action'],
      [module.manipulation.hint, module.manipulation.hintJa, 'manipulation hint'],
      [module.observation.text, module.observation.textJa, 'observation'],
      [module.explanation.text, module.explanation.textJa, 'explanation'],
      [module.explanation.footnote, module.explanation.footnoteJa, 'explanation footnote'],
      [module.transfer.text, module.transfer.textJa, 'transfer'],
      [module.transfer.explanation.text, module.transfer.explanation.textJa, 'transfer explanation'],
      [module.outro.text, module.outro.textJa, 'outro'],
    ]) {
      assert.ok(en?.length > 0, `${module.id}: missing English ${where}`);
      assert.ok(ja?.length > 0, `${module.id}: missing Japanese ${where}`);
    }
    for (const [label, options, answer] of [
      ['question', module.question.options, module.question.answer],
      ['transfer', module.transfer.options, module.transfer.answer],
    ]) {
      assert.ok(options.length >= 2, `${module.id}: ${label} needs choices`);
      assert.ok(
        options.some((option) => option.id === answer),
        `${module.id}: ${label} answer "${answer}" is not one of the choices`
      );
      for (const option of options) {
        assert.ok(option.label && option.labelJa, `${module.id}: ${label} option ${option.id} is not bilingual`);
      }
    }
  }
});

test('a lesson only points at things the scene actually has', () => {
  const target = scene();
  target.setProgress(0);
  const metricIds = new Set(target.getMetrics().map((row) => row.id));
  const controls = new Map(target.getModelControls().map((control) => [control.id, control]));

  for (const module of modules()) {
    // The rows the lesson tells the learner to watch must exist in the read-out,
    // or the highlight would point at nothing and the before/after table would
    // be reading undefined.
    for (const id of module.watch) {
      assert.ok(metricIds.has(id), `${module.id}: watches "${id}", which is not a metric`);
    }
    // The control it moves must exist, and the value it moves to must be one the
    // slider would allow — a lesson must not drive the model somewhere the
    // viewer cannot get to themselves.
    const control = controls.get(module.manipulation.control);
    assert.ok(control, `${module.id}: moves "${module.manipulation.control}", which is not a control`);
    assert.ok(
      module.manipulation.to >= control.min && module.manipulation.to <= control.max,
      `${module.id}: moves ${control.id} to ${module.manipulation.to}, outside [${control.min}, ${control.max}]`
    );
    for (const [id, value] of Object.entries(module.setup)) {
      if (id === 'progress') {
        assert.ok(value >= 0 && value <= 1, `${module.id}: setup progress out of range`);
        continue;
      }
      const setupControl = controls.get(id);
      assert.ok(setupControl, `${module.id}: setup sets "${id}", which is not a control`);
      assert.ok(
        value >= setupControl.min && value <= setupControl.max,
        `${module.id}: setup puts ${id} outside its range`
      );
    }
    assert.ok(
      STAGES.some((stage) => stage.id === module.transfer.atStage),
      `${module.id}: transfer targets stage "${module.transfer.atStage}", which does not exist`
    );
    assert.equal(
      module.transfer.progress,
      STAGES.find((stage) => stage.id === module.transfer.atStage).at,
      `${module.id}: transfer progress should be resolved from the stage`
    );
  }
});

test('the afterload lesson teaches what the model actually does', () => {
  const module = modules().find((entry) => entry.id === 'afterload-and-stroke-volume');
  assert.ok(module, 'the afterload lesson should exist');

  const before = sampleHemodynamics(module.setup.progress, {
    preload: module.setup.preload,
    afterload: module.setup.afterload,
  });
  const after = sampleHemodynamics(module.setup.progress, {
    preload: module.setup.preload,
    afterload: module.manipulation.to,
  });

  // The stored answer, re-derived. This is the whole point of the test file:
  // the lesson says stroke volume falls, so the model had better make it fall.
  const direction = after.strokeVolumeMl < before.strokeVolumeMl ? 'down' : 'up';
  assert.equal(direction, module.question.answer, 'the lesson answer disagrees with the model');

  // And the three things it tells the learner to watch each have to move, in the
  // direction the explanation describes — otherwise the observation table would
  // show a change the explanation does not account for.
  assert.ok(after.esvMl > before.esvMl + 1, 'end-systolic volume should rise visibly');
  assert.ok(before.strokeVolumeMl - after.strokeVolumeMl > 1, 'stroke volume should fall visibly');
  assert.ok(
    after.peakVentricularPressureMmHg > before.peakVentricularPressureMmHg + 1,
    'peak ventricular pressure should rise visibly'
  );

  // The footnote claims stroke volume falls by less than end-systolic volume
  // gains, because end-diastolic volume rises a little too. That is a specific
  // arithmetic claim, so it gets checked.
  assert.ok(after.edvMl > before.edvMl, 'end-diastolic volume should rise a little');
  assert.ok(
    before.strokeVolumeMl - after.strokeVolumeMl < after.esvMl - before.esvMl,
    'the footnote about EDV offsetting part of the ESV rise should hold'
  );

  // Rounded to whole millilitres — what the panel shows — the changes are still
  // legible. A lesson whose numbers round to no change teaches nothing.
  assert.notEqual(Math.round(after.esvMl), Math.round(before.esvMl));
  assert.notEqual(Math.round(after.strokeVolumeMl), Math.round(before.strokeVolumeMl));
});

test('the transfer question is answered by the model, not by the copy', () => {
  const module = modules().find((entry) => entry.id === 'afterload-and-stroke-volume');
  const lost = (progress) => {
    const base = sampleHemodynamics(progress, { afterload: module.setup.afterload });
    const loaded = sampleHemodynamics(progress, { afterload: module.manipulation.to });
    return (base.strokeVolumeMl - loaded.strokeVolumeMl) / base.strokeVolumeMl;
  };
  const normal = lost(module.setup.progress);
  const failing = lost(module.transfer.progress);

  const verdict = failing > normal * 1.1 ? 'larger' : failing < normal * 0.9 ? 'smaller' : 'same';
  assert.equal(verdict, module.transfer.answer, 'the transfer answer disagrees with the model');

  // The panel shows both losses as whole percents; they have to differ once
  // rounded, or the learner is told "larger" while looking at two equal numbers.
  assert.notEqual(Math.round(failing * 100), Math.round(normal * 100));
});

test('a lesson is reachable and leaves the model where it found it', () => {
  // The lesson drives the model through the same setters the sliders use, so
  // running it and resetting must land exactly back on the modelled state.
  const target = scene();
  target.setProgress(0.5);
  target.setModelControl('afterload', 1.15);
  const explored = target.getMetrics().find((row) => row.id === 'sv').value;

  const module = target.getLearningModules()[0];
  target.setProgress(module.setup.progress);
  target.setModelControl('afterload', module.manipulation.to);
  assert.notEqual(target.getMetrics().find((row) => row.id === 'sv').value, explored);

  // What the app's session restore does on the way out.
  target.setProgress(0.5);
  target.setModelControl('afterload', 1.15);
  assert.equal(target.getMetrics().find((row) => row.id === 'sv').value, explored);
});
