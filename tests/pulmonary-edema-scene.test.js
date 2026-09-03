import test from 'node:test';
import assert from 'node:assert/strict';
import { PulmonaryEdemaScene } from '../src/scenes/respiratory/scenes/pulmonaryEdema/PulmonaryEdemaScene.js';
import { CHARTS, CONTROLS, LEGEND, METRICS, MODEL_SCOPE, STAGES } from '../src/data/pulmonaryEdema.js';
import { solveSteadyState } from '../src/models/pulmonaryEdema.js';

/**
 * What the pulmonary oedema scene is required to get right.
 *
 * The model has its own tests, which check the physiology. **This file exists
 * because the scene had none**, and three defects went out behind that gap: a
 * lesson built to a shape of my own invention, which the panel answers with a
 * `TypeError` on the first click; a walk-through whose five steps all rendered
 * blank; and a chart method that ran for nobody because `meta` declared no
 * chart and the return was an array where the App reads an object. Every one of
 * them is a mismatch between the scene and the component that drives it, and
 * every one of them was invisible to a suite that only ever asked the model.
 *
 * So these tests speak the components' contracts back at the scene. Where a
 * panel reads `step.because.text`, that is what is checked — not that a
 * `because` exists.
 */

/**
 * **Layer 2 — model integrity.** These check that the scene agrees with
 * itself and with the components the App hands it to. A failure here means the
 * implementation is broken or two parts of the repository have drifted apart;
 * it says nothing about the physiology, which is layer 1. See `tests/README.md`.
 */

const scene = () => {
  const built = new PulmonaryEdemaScene({});
  built.build();
  return built;
};

test('the scene implements the interface the app drives it through', () => {
  const built = scene();
  for (const method of [
    'setProgress',
    'update',
    'getAnnotations',
    'getMetrics',
    'getCharts',
    'getModelControls',
    'setModelControl',
    'resetModelControls',
    'getCausalStory',
    'getLearningModules',
    'dispose',
  ]) {
    assert.equal(typeof built[method], 'function', `missing ${method}()`);
  }
  built.dispose();
});

test('every stage, legend entry and annotation is bilingual', () => {
  for (const stage of STAGES) {
    assert.ok(stage.name && stage.nameJa, `stage ${stage.id} needs a name in both languages`);
    assert.ok(stage.summary && stage.summaryJa, `stage ${stage.id} needs a summary in both languages`);
  }
  for (const entry of LEGEND) assert.ok(entry.label && entry.labelJa, `legend ${entry.key}`);
  const built = scene();
  for (const annotation of built.getAnnotations()) {
    assert.ok(annotation.text && annotation.sub, `annotation ${annotation.id} needs both languages`);
    assert.ok(annotation.position, `annotation ${annotation.id} has no position`);
  }
  built.dispose();
});

test('the stages are in order and span the axis', () => {
  const positions = STAGES.map((stage) => stage.at);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal(positions[0], 0);
  assert.equal(positions[positions.length - 1], 1);
});

/* --------------------------------------------------------------------------
   The chart, as `ChartPanel` reads it
   -------------------------------------------------------------------------- */

test('every declared chart is filled, and only with points the solver produced', () => {
  // `App` reads `meta.charts` to build the panels and then keys `getCharts()`
  // by their ids. Returning an array satisfied nothing and nobody noticed,
  // because a scene declaring no charts is never asked for any.
  const built = scene();
  const charts = built.getCharts();
  assert.ok(!Array.isArray(charts), 'getCharts() must be keyed by chart id, not a list');
  assert.ok(CHARTS.length > 0, 'the scene declares at least one chart');

  for (const declared of CHARTS) {
    const data = charts[declared.id];
    assert.ok(data, `chart "${declared.id}" is declared but never filled`);
    assert.ok(data.x && data.y, `chart "${declared.id}" needs both ranges`);
    const series = data.series ?? [];
    assert.ok(series.length > 0, `chart "${declared.id}" drew no series`);
    // Every series the key names is drawn, and nothing else is.
    const drawn = new Set(series.map((entry) => entry.id));
    for (const key of declared.key ?? []) {
      assert.ok(drawn.has(key.id), `chart "${declared.id}" names "${key.id}" in its key but draws no such series`);
    }
    for (const entry of series) {
      assert.ok(entry.points.length > 1, `series ${entry.id} is a single point`);
      for (const point of entry.points) {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `series ${entry.id} has a non-finite point`);
      }
    }
  }
  built.dispose();
});

test('the plotted curves are the model, resolved, and not a second approximation', () => {
  // The rule the repository states as one medical source of truth: a chart is
  // the model showing its working. Spot-checked against a fresh solve.
  const built = scene();
  const data = built.getCharts()['filtration-balance'];
  const controls = built.controlsNow();
  const byId = Object.fromEntries(data.series.map((entry) => [entry.id, entry]));

  for (const pressure of [8, 20, 34]) {
    const solved = solveSteadyState({ ...controls, leftAtrialPressureMmHg: pressure });
    const filtration = byId.filtration.points.find((point) => point.x === pressure);
    const lymph = byId.lymph.points.find((point) => point.x === pressure);
    assert.ok(filtration && lymph, `nothing plotted at ${pressure} mmHg`);
    assert.equal(filtration.y, solved.filtrationMlPerHour);
    assert.equal(lymph.y, solved.lymphaticClearanceMlPerHour);
  }
  built.dispose();
});

/* --------------------------------------------------------------------------
   The walk-through, as `CausalStoryPanel` reads it
   -------------------------------------------------------------------------- */

test('every walk-through step carries the fields the panel writes into', () => {
  // The panel writes `step.heading`/`headingJa` and `step.body`/`bodyJa`, and
  // reads `step.because?.text`. Written as `text`/`textJa` with a bare string
  // `because`, all five steps rendered blank and the `because` line stayed
  // visible with nothing in it, because a string is truthy.
  const built = scene();
  const story = built.getCausalStory();
  assert.ok(story.steps.length >= 4, 'the walk-through is a chain, not a caption');

  const ids = new Set();
  story.steps.forEach((step, index) => {
    assert.ok(!ids.has(step.id), `duplicate step id ${step.id}`);
    ids.add(step.id);
    assert.ok(step.heading && step.headingJa, `${step.id}: heading needs both languages`);
    assert.ok(step.body && step.bodyJa, `${step.id}: body needs both languages`);
    assert.equal(step.text, undefined, `${step.id}: "text" is not a field the panel reads`);
    if (index > 0) {
      assert.equal(
        typeof step.because,
        'object',
        `${step.id}: "because" is read as { text, textJa }, not as a string`
      );
      assert.ok(step.because.text && step.because.textJa, `${step.id}: because needs both languages`);
    }
  });
  built.dispose();
});

test('the walk-through reports the numbers the model is holding', () => {
  // A step that quotes a figure has to quote *this* solve's figure, or the
  // narration and the lung beside it are describing different lungs.
  const built = scene();
  built.setProgress(1);
  built.settleModel();
  const story = built.getCausalStory();
  const capillary = story.steps.find((step) => step.id === 'capillary');
  assert.match(capillary.body, new RegExp(built.state.capillaryPressureMmHg.toFixed(1)));

  const gas = story.steps.find((step) => step.id === 'gas');
  assert.match(gas.body, new RegExp(`${(built.state.shuntFraction * 100).toFixed(0)} %`));
  built.dispose();
});

/* --------------------------------------------------------------------------
   The lessons, as `LearningPanel` drives them
   -------------------------------------------------------------------------- */

test('every lesson is in the shape the panel drives, not one of my own', () => {
  // `LearningPanel` reads `module.question.options`, `module.setup[controlId]`
  // flat, `module.manipulation.control`, `module.observation.text` and
  // `module.explanation.text`. Given options at the top level and controls
  // nested under `setup.controls`, it calls `choices(undefined)` and throws on
  // the first click of "Predict it".
  const built = scene();
  const controlIds = new Set(built.getModelControls().map((control) => control.id));
  const metricIds = new Set(built.getMetrics().map((row) => row.id));

  const modules = built.getLearningModules();
  assert.ok(modules.length > 0);
  for (const module of modules) {
    assert.ok(module.title && module.titleJa, `${module.id}: title needs both languages`);

    assert.equal(typeof module.question, 'object', `${module.id}: question is read as an object`);
    assert.ok(module.question.text && module.question.textJa, `${module.id}: question needs both languages`);
    assert.ok(Array.isArray(module.question.options), `${module.id}: options live under question`);
    assert.ok(module.question.options.length >= 2, `${module.id}: a prediction needs alternatives`);
    for (const option of module.question.options) {
      assert.ok(option.id && option.label && option.labelJa, `${module.id}: option ${option.id}`);
    }
    assert.ok(
      module.question.options.some((option) => option.id === module.question.answer),
      `${module.id}: the stored answer is not one of the options`
    );
    assert.equal(module.options, undefined, `${module.id}: options at the top level are not read`);
    assert.equal(module.answer, undefined, `${module.id}: an answer at the top level is not read`);

    assert.ok(module.observation?.text && module.observation?.textJa, `${module.id}: observation`);
    assert.ok(module.explanation?.text && module.explanation?.textJa, `${module.id}: explanation`);

    // `setup` is applied as `{progress, ...controls}`, one control at a time.
    assert.equal(module.setup.controls, undefined, `${module.id}: setup controls are flat, not nested`);
    for (const [id, value] of Object.entries(module.setup)) {
      if (id === 'progress') {
        assert.ok(value >= 0 && value <= 1, `${module.id}: progress out of range`);
        continue;
      }
      assert.ok(controlIds.has(id), `${module.id}: setup moves "${id}", which is not a control`);
      assert.equal(typeof value, 'number', `${module.id}: setup value for ${id} is not a number`);
    }

    // The manipulation names one control and a value to take it to.
    assert.ok(controlIds.has(module.manipulation.control), `${module.id}: manipulates a control that does not exist`);
    assert.equal(typeof module.manipulation.to, 'number', `${module.id}: manipulation needs a target value`);
    assert.ok(module.manipulation.action && module.manipulation.actionJa, `${module.id}: manipulation action`);
    assert.ok(module.manipulation.text && module.manipulation.textJa, `${module.id}: manipulation text`);

    for (const id of module.watch ?? []) {
      assert.ok(metricIds.has(id), `${module.id}: watches "${id}", which is not a read-out row`);
    }
  }
  built.dispose();
});

test('each lesson’s stored answer is what the model actually does', () => {
  // A lesson can be badly worded; it cannot be wrong about the model. Both are
  // re-derived here rather than trusted.
  const built = scene();
  const modules = new Map(built.getLearningModules().map((module) => [module.id, module]));

  // Oxygen widens the A–a difference and does not touch the shunt.
  const shunt = modules.get('oxygen-and-shunt');
  const setupControls = { ...built.controlsNow(), ...withoutProgress(shunt.setup) };
  const air = solveSteadyState(setupControls);
  const oxygen = solveSteadyState({ ...setupControls, inspiredOxygenFraction: shunt.manipulation.to });
  assert.equal(shunt.question.answer, 'widens');
  assert.ok(
    oxygen.alveolarArterialDifferenceMmHg > air.alveolarArterialDifferenceMmHg * 2,
    `A–a went ${air.alveolarArterialDifferenceMmHg.toFixed(0)} → ${oxygen.alveolarArterialDifferenceMmHg.toFixed(0)}`
  );
  assert.ok(
    Math.abs(oxygen.shuntFraction - air.shuntFraction) < 1e-9,
    'the lesson says the shunt does not move; the model moved it'
  );

  // Lymphatic adaptation clears the alveoli at an unchanged pressure.
  const adaptation = modules.get('two-lungs-one-pressure');
  const acuteControls = { ...built.controlsNow(), ...withoutProgress(adaptation.setup) };
  const acute = solveSteadyState(acuteControls);
  const chronic = solveSteadyState({ ...acuteControls, chronicity: adaptation.manipulation.to });
  assert.equal(adaptation.question.answer, 'clears');
  assert.ok(acute.alveolarWaterMl > 0, 'the lesson starts from a lung with water in its alveoli');
  assert.ok(
    chronic.alveolarWaterMl < acute.alveolarWaterMl,
    `alveolar water went ${acute.alveolarWaterMl.toFixed(0)} → ${chronic.alveolarWaterMl.toFixed(0)}`
  );
  assert.ok(
    chronic.lymphaticClearanceMlPerHour > acute.lymphaticClearanceMlPerHour,
    'the mechanism the lesson names — clearance — did not move'
  );
  built.dispose();
});

/* --------------------------------------------------------------------------
   Read-outs and controls
   -------------------------------------------------------------------------- */

test('every declared control exists in the model and comes back with its value', () => {
  const built = scene();
  const returned = new Map(built.getModelControls().map((control) => [control.id, control]));
  for (const control of CONTROLS) {
    const back = returned.get(control.id);
    assert.ok(back, `control ${control.id} is declared but not returned`);
    assert.notEqual(back.value, undefined, `control ${control.id} comes back with no value`);
    if (control.kind !== 'choice') {
      assert.ok(back.value >= control.min && back.value <= control.max, `${control.id} outside its own range`);
    }
  }
  built.dispose();
});

test('no read-out row quotes more precision than the model has earned', () => {
  const built = scene();
  for (const row of built.getMetrics()) {
    const declared = METRICS.find((metric) => metric.id === row.id);
    assert.ok(declared, `read-out row ${row.id} is not declared`);
    const decimals = String(row.value).split('.')[1]?.length ?? 0;
    assert.ok(decimals <= (declared.digits ?? 0), `${row.id} shows ${decimals} decimals for a ${declared.digits ?? 0}-digit figure`);
  }
  built.dispose();
});

test('the scope panel says what the model does not have', () => {
  // An alpha scene answers for its own boundaries. The two the model is most
  // likely to be read past are gravity and ventilation.
  const said = JSON.stringify(MODEL_SCOPE);
  assert.match(said, /gravit/i);
  assert.match(said, /ventilat/i);
});

/** `setup` carries progress alongside control values; the model takes only the controls. */
function withoutProgress(setup) {
  const { progress, ...controls } = setup;
  void progress;
  return controls;
}
