import test from 'node:test';
import assert from 'node:assert/strict';
import { CopdScene } from '../src/scenes/respiratory/scenes/copd/CopdScene.js';
import { CHARTS, METRICS, MODEL_CONTROLS, MODEL_SCOPE, STAGES } from '../src/data/copd.js';
import { CAUSAL_STORY, LEARNING_MODULES } from '../src/data/copdTeaching.js';
import { createRespiratoryModel, lungMechanics } from '../src/models/copd.js';

/**
 * What the COPD scene is required to get right.
 *
 * The model has its own tests, which check the physiology. These check the
 * thing that goes wrong *between* a correct model and a screen: a read-out row
 * that quotes a number the model does not produce, a lesson whose stored answer
 * stopped being what the model does, a chart that plots something the solver
 * never computed, a walk-through step that moves a control the scene does not
 * have.
 *
 * Every teaching claim in `src/data/copdTeaching.js` is re-derived from the
 * model here. A lesson can be badly worded; it cannot be wrong about the model.
 */

const scene = () => {
  const built = new CopdScene({});
  built.build();
  return built;
};

/** Runs a fresh model to its settled state under the given controls. */
function settled(controls) {
  const model = createRespiratoryModel({ controls });
  model.settle({ maxBreaths: 400 });
  return model.state;
}

/** The scene, driven to a steady state through its own public interface. */
function sceneAt({ progress = 0, ...controls } = {}) {
  const built = scene();
  built.setProgress(progress);
  for (const [id, value] of Object.entries(controls)) built.setModelControl(id, value);
  built.model.settle({ maxBreaths: 400 });
  built.applyModelToScene();
  return built;
}

// --- the interface contract ------------------------------------------------

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
});

test('every stage, legend entry and annotation is bilingual', () => {
  for (const stage of STAGES) {
    assert.ok(stage.name && stage.nameJa, `stage ${stage.id} needs a name in both languages`);
    assert.ok(stage.summary && stage.summaryJa, `stage ${stage.id} needs a summary in both languages`);
  }
  for (const annotation of scene().getAnnotations()) {
    assert.ok(annotation.text && annotation.sub, `annotation ${annotation.id} needs both languages`);
    assert.ok(annotation.position, `annotation ${annotation.id} has no position`);
  }
});

test('the stages are in order and span the axis', () => {
  const positions = STAGES.map((stage) => stage.at);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal(positions[0], 0);
  assert.equal(positions[positions.length - 1], 1);
});

// --- the read-out ----------------------------------------------------------

test('every read-out row carries a value, and the values are the model’s', () => {
  const built = sceneAt({ progress: 0.6 });
  const rows = new Map(built.getMetrics().map((row) => [row.id, row]));
  assert.equal(rows.size, METRICS.length, 'every declared row is produced');
  for (const row of rows.values()) {
    assert.ok(row.value != null && row.value !== '', `${row.id} has no value`);
    assert.ok(row.label && row.labelJa, `${row.id} is not bilingual`);
    assert.ok(Number.isFinite(Number(row.value)), `${row.id} is not a number: ${row.value}`);
  }

  const state = built.model.state;
  assert.equal(rows.get('ic').value, state.inspiratoryCapacityL.toFixed(2));
  assert.equal(rows.get('eelv').value, state.endExpiratoryVolumeL.toFixed(2));
  assert.equal(rows.get('tau').value, state.timeConstantS.toFixed(2));
});

test('no read-out row quotes more precision than the model has earned', () => {
  for (const row of sceneAt({ progress: 0.6 }).getMetrics()) {
    const decimals = String(row.value).split('.')[1]?.length ?? 0;
    assert.ok(decimals <= 2, `${row.id} shows ${decimals} decimal places`);
  }
});

test('the scene reports nothing about gas exchange', () => {
  const forbidden = /(spo2|sao2|pao2|paco2|oxygen|saturation|hypox)/i;
  for (const row of sceneAt({ progress: 1 }).getMetrics()) {
    assert.ok(!forbidden.test(row.id), `the scene must not report "${row.id}"`);
    assert.ok(!forbidden.test(row.label), `the scene must not label a row "${row.label}"`);
  }
});

// --- the charts ------------------------------------------------------------

test('every declared chart is filled, and only with points the solver produced', () => {
  const built = sceneAt({ progress: 0.6 });
  const charts = built.getCharts();
  for (const spec of CHARTS) {
    const chart = charts[spec.id];
    assert.ok(chart, `chart "${spec.id}" was declared but never filled`);
    assert.ok(chart.series?.length, `chart "${spec.id}" has no series`);
    for (const series of chart.series) {
      for (const point of series.points) {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${spec.id}/${series.id} has a bad point`);
      }
    }
  }
  assert.equal(Object.keys(charts).length, CHARTS.length, 'no chart is filled that was not declared');
});

test('the flow-volume loop is the breath the model actually solved', () => {
  const built = sceneAt({ progress: 0.6 });
  const loop = built.getCharts()['flow-volume'].series.find((series) => series.id === 'tidal');
  const trace = built.model.trace;
  assert.equal(loop.points.length, trace.length, 'the loop is the trace, not a resampling of it');
  loop.points.forEach((point, index) => {
    assert.equal(point.x, trace[index].volumeL);
    assert.equal(point.y, trace[index].flowLPerS);
  });
});

test('the flow ceiling drawn on the chart is the model’s ceiling, negated for expiration', () => {
  const built = sceneAt({ progress: 0.6 });
  const drawn = built.getCharts()['flow-volume'].series.find((series) => series.id === 'ceiling');
  // Expiration is below the line on a flow-volume loop, so the envelope is
  // drawn negative. Its magnitude has to be the model's own function.
  const mechanics = built.model.mechanics;
  for (const point of drawn.points) {
    const recoil = (point.x - mechanics.residualVolumeL) / mechanics.lungCompliance;
    const expected = -Math.max(0, recoil / mechanics.upstreamResistance);
    assert.ok(Math.abs(point.y - expected) < 1e-9, `ceiling at ${point.x} L was ${point.y}, expected ${expected}`);
  }
});

test('the volume-time plot never draws a volume outside the lung it labelled', () => {
  const built = scene();
  built.setProgress(0.8);
  for (let i = 0; i < 60 * 40; i++) built.update(1 / 60);
  const chart = built.getCharts()['volume-time'];
  const mechanics = built.model.mechanics;
  for (const point of chart.series[0].points) {
    assert.ok(
      point.y >= mechanics.residualVolumeL - 1e-6 && point.y <= mechanics.totalLungCapacityL + 1e-6,
      `plotted ${point.y} L outside ${mechanics.residualVolumeL}–${mechanics.totalLungCapacityL}`
    );
  }
  assert.ok(chart.series[0].points.length > 100, 'the window actually filled up');
});

// --- the controls ----------------------------------------------------------

test('every declared control exists in the model and comes back with its value', () => {
  const built = scene();
  const controls = built.getModelControls();
  assert.equal(controls.length, MODEL_CONTROLS.length);
  for (const control of controls) {
    assert.ok(Number.isFinite(control.value), `${control.id} has no value`);
    assert.ok(control.value >= control.min && control.value <= control.max, `${control.id} starts outside its range`);
    assert.ok(control.label && control.labelJa, `${control.id} is not bilingual`);
    assert.equal(typeof control.format(control.value), 'string');
    // Setting it must be accepted by the model, at both ends of the range.
    built.setModelControl(control.id, control.min);
    built.setModelControl(control.id, control.max);
  }
});

test('resetting the controls puts them back where the scene opened', () => {
  const built = scene();
  const before = built.getModelControls().map((control) => control.value);
  for (const control of MODEL_CONTROLS) built.setModelControl(control.id, control.max);
  built.resetModelControls();
  assert.deepEqual(
    built.getModelControls().map((control) => control.value),
    before
  );
});

test('the progression axis is ventilatory demand and nothing else', () => {
  const built = scene();
  built.setProgress(0.5);
  // Moving the main slider must not change what kind of lung this is: severity
  // lives on the controls, where one property can be changed at a time.
  const mechanics = built.model.mechanics;
  built.setProgress(1);
  assert.equal(built.model.mechanics.timeConstantS, mechanics.timeConstantS);
  assert.equal(built.model.mechanics.totalLungCapacityL, mechanics.totalLungCapacityL);
  assert.equal(built.model.controls.demand, 1);
});

// --- what the scene draws --------------------------------------------------

test('the drawn shape follows the model’s volume and nothing else', () => {
  const rest = sceneAt({ progress: 0 });
  const work = sceneAt({ progress: 1 });
  // A hyperinflated lung has to be drawn bigger. Read off the mesh, because
  // that is what the reader sees.
  const height = (built) => built.lungs.object.getObjectByName('right-lung').scale.y;
  assert.ok(height(work) > height(rest), 'the lung at the ceiling is drawn larger than the lung at rest');

  // And the diaphragm has to be flatter, because that is what a chest that
  // never empties does to it.
  const curvature = (built) => {
    built.diaphragm.object.updateWorldMatrix(true, true);
    const sheet = built.diaphragm.object.getObjectByName('diaphragm-sheet');
    const y = sheet.geometry.attributes.position;
    let max = -Infinity;
    for (let i = 0; i < y.count; i++) max = Math.max(max, y.getY(i));
    return max;
  };
  assert.ok(curvature(work) < curvature(rest), 'the diaphragm at the ceiling is flatter than at rest');
});

test('the drawn exaggeration does not reach any number the scene reports', () => {
  // The lungs are drawn far larger than life so a tidal breath is visible. The
  // read-out must be untouched by that, which is only guaranteed if the
  // numbers come from the model rather than from the geometry.
  const built = sceneAt({ progress: 0.6 });
  const reported = built.getMetrics().find((row) => row.id === 'eelv').value;
  const fromModel = built.model.state.endExpiratoryVolumeL.toFixed(2);
  assert.equal(reported, fromModel);
});

// --- the walk-through ------------------------------------------------------

test('every walk-through step is bilingual, and every step after the first says why it follows', () => {
  assert.ok(CAUSAL_STORY.steps.length >= 8, 'the walk-through is eight steps');
  const ids = new Set();
  CAUSAL_STORY.steps.forEach((step, index) => {
    assert.ok(!ids.has(step.id), `duplicate step id ${step.id}`);
    ids.add(step.id);
    assert.ok(step.heading && step.headingJa, `${step.id}: heading needs both languages`);
    assert.ok(step.body && step.bodyJa, `${step.id}: body needs both languages`);
    if (index > 0) {
      assert.ok(step.because?.text && step.because?.textJa, `${step.id}: a step in a chain has to say what it follows from`);
    }
  });
});

test('every walk-through step points at controls, metrics and charts the scene has', () => {
  const built = scene();
  const controlIds = new Set(built.getModelControls().map((control) => control.id));
  const metricIds = new Set(built.getMetrics().map((row) => row.id));
  const chartIds = new Set(CHARTS.map((chart) => chart.id));
  for (const step of CAUSAL_STORY.steps) {
    for (const id of Object.keys(step.controls ?? {})) {
      assert.ok(controlIds.has(id), `step ${step.id} moves "${id}", which is not a control`);
    }
    for (const id of step.watch ?? []) {
      assert.ok(metricIds.has(id), `step ${step.id} watches "${id}", which is not a read-out row`);
    }
    if (step.chart) assert.ok(chartIds.has(step.chart), `step ${step.id} names chart "${step.chart}"`);
    if (step.progress != null) assert.ok(step.progress >= 0 && step.progress <= 1);
  }
});

test('the walk-through actually walks somewhere: the numbers it names change along it', () => {
  const readAt = (step) =>
    settled({ ...step.controls, demand: step.progress ?? 0 }).inspiratoryCapacityL;
  const capacities = CAUSAL_STORY.steps.map(readAt);
  // The scene's claim in one line: by the end, the room to breathe in is much
  // smaller than it was at the start. If a change to the model made that stop
  // being true, the walk-through would be narrating something that no longer
  // happens.
  assert.ok(
    capacities[capacities.length - 1] < capacities[0] * 0.6,
    `inspiratory capacity went ${capacities[0]} → ${capacities[capacities.length - 1]}`
  );
});

test('the walk-through’s central claim — that effort stops helping — is what the model does', () => {
  const effortStep = CAUSAL_STORY.steps.find((step) => step.id === 'effort');
  const withEffort = settled({ ...effortStep.controls, demand: effortStep.progress });
  const withoutEffort = settled({ ...effortStep.controls, expiratoryEffort: 1, demand: effortStep.progress });
  assert.ok(
    withEffort.inspiratoryCapacityL - withoutEffort.inspiratoryCapacityL < 0.1,
    'doubling the effort at this step must gain almost nothing'
  );
  assert.ok(withEffort.flowLimitedFraction > 0.5, 'and the breath must be running at the ceiling');
});

// --- the challenges --------------------------------------------------------

test('every challenge is structurally complete and bilingual', () => {
  assert.ok(LEARNING_MODULES.length >= 3, 'at least three challenges');
  const ids = new Set();
  for (const module of LEARNING_MODULES) {
    assert.ok(!ids.has(module.id), `duplicate challenge id ${module.id}`);
    ids.add(module.id);
    for (const [en, ja, where] of [
      [module.title, module.titleJa, 'title'],
      [module.short, module.shortJa, 'short title'],
      [module.question.text, module.question.textJa, 'question'],
      [module.manipulation.text, module.manipulation.textJa, 'manipulation'],
      [module.manipulation.action, module.manipulation.actionJa, 'action'],
      [module.manipulation.hint, module.manipulation.hintJa, 'hint'],
      [module.observation.text, module.observation.textJa, 'observation'],
      [module.explanation.text, module.explanation.textJa, 'explanation'],
      [module.explanation.footnote, module.explanation.footnoteJa, 'footnote'],
      [module.outro.text, module.outro.textJa, 'outro'],
    ]) {
      assert.ok(en?.length > 0, `${module.id}: missing English ${where}`);
      assert.ok(ja?.length > 0, `${module.id}: missing Japanese ${where}`);
    }
    assert.ok(module.question.options.length >= 2);
    assert.ok(
      module.question.options.some((option) => option.id === module.question.answer),
      `${module.id}: the stored answer is not one of the choices`
    );
    for (const option of module.question.options) {
      assert.ok(option.label && option.labelJa, `${module.id}: option ${option.id} is not bilingual`);
    }
  }
});

test('every challenge points at controls and rows the scene has', () => {
  const built = scene();
  const controlIds = new Set(built.getModelControls().map((control) => control.id));
  const metricIds = new Set(built.getMetrics().map((row) => row.id));
  for (const module of built.getLearningModules()) {
    assert.ok(controlIds.has(module.manipulation.control), `${module.id} moves a control that does not exist`);
    for (const id of Object.keys(module.setup)) {
      if (id === 'progress') continue;
      assert.ok(controlIds.has(id), `${module.id}: setup names "${id}", which is not a control`);
    }
    for (const id of module.watch) assert.ok(metricIds.has(id), `${module.id} watches "${id}"`);
    if (module.transfer) {
      assert.ok(metricIds.has(module.transfer.metric), `${module.id}: transfer measures "${module.transfer.metric}"`);
      assert.ok(Number.isFinite(module.transfer.progress), `${module.id}: transfer stage did not resolve`);
    }
  }
});

test('challenge 1: narrow airways alone do not trap gas in a lung that still has its recoil', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'obstruction-alone');
  const { setup, manipulation, transfer } = module;
  const before = settled({ ...setup, demand: setup.progress });
  const after = settled({ ...setup, [manipulation.control]: manipulation.to, demand: setup.progress });

  // The stored answer is the surprising one, so it is the one most worth
  // checking: this is where a change to the model would quietly turn a lesson
  // into a lie.
  assert.equal(module.question.answer, 'falls');
  assert.ok(
    after.endExpiratoryVolumeL <= before.endExpiratoryVolumeL,
    `EELV went ${before.endExpiratoryVolumeL} → ${after.endExpiratoryVolumeL}, which is not "falls slightly"`
  );
  // The manipulation has to actually do something to the mechanics, or the
  // lesson would be about nothing.
  assert.ok(after.timeConstantS > before.timeConstantS * 2.5, 'the time constant trebled');
  assert.ok(after.timeConstantsAvailable < 3, 'and expiration no longer has the τ it needs');
  // And the footnote's claim: the breath is still not meeting the ceiling.
  assert.ok(after.flowLimitedFraction < 0.1, `the ceiling was met for ${after.flowLimitedFraction} of the breath`);

  // The transfer: the same manipulation on a lung that has lost its recoil.
  assert.equal(transfer.answer, 'more');
  const lowRecoil = { ...setup, ...transfer.controls, demand: setup.progress };
  const lowBefore = settled(lowRecoil);
  const lowAfter = settled({ ...lowRecoil, [manipulation.control]: manipulation.to });
  const rise = (a, b) => b.endExpiratoryVolumeL - a.endExpiratoryVolumeL;
  assert.ok(
    rise(lowBefore, lowAfter) > rise(before, after) + 0.3,
    `with recoil lost the rise was ${rise(lowBefore, lowAfter)} against ${rise(before, after)}`
  );
  assert.ok(lowAfter.flowLimitedFraction > 0.5, 'and only there is the breath running at the ceiling');
});

test('challenge 2: doubling the effort leaves almost all of the breath at the ceiling', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'effort-independence');
  const { setup, manipulation } = module;
  const after = settled({ ...setup, [manipulation.control]: manipulation.to, demand: setup.progress });
  assert.equal(module.question.answer, 'nearly-all');
  assert.ok(after.flowLimitedFraction > 0.8, `only ${after.flowLimitedFraction} of the breath met the ceiling`);

  // And the footnote's promise: with normal recoil, the same doubling does a
  // great deal. If that stopped being true the footnote would be a lie.
  const healthy = { ...setup, elasticRecoil: 1, demand: setup.progress };
  const easy = settled({ ...healthy, expiratoryEffort: 1 });
  const hard = settled({ ...healthy, expiratoryEffort: manipulation.to });
  assert.ok(
    hard.inspiratoryCapacityL - easy.inspiratoryCapacityL > 0.08,
    'the same manipulation on a lung with normal recoil has to move a great deal of gas'
  );
});

test('challenge 3: a bronchodilator moves inspiratory capacity, not the ceiling or the capacity', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'bronchodilator');
  const { setup, manipulation, transfer } = module;
  const before = settled({ ...setup, demand: setup.progress });
  const after = settled({ ...setup, [manipulation.control]: manipulation.to, demand: setup.progress });

  assert.equal(module.question.answer, 'ic');
  assert.ok(after.inspiratoryCapacityL > before.inspiratoryCapacityL, 'inspiratory capacity is what improves');
  // The footnote says total lung capacity did not move at all.
  assert.equal(after.totalLungCapacityL, before.totalLungCapacityL);
  // And the observation says the fraction at the ceiling barely changed.
  assert.ok(
    Math.abs(after.flowLimitedFraction - before.flowLimitedFraction) < 0.25,
    'the drug must not abolish flow limitation'
  );

  // The transfer's stored answer: less improvement at maximal work.
  assert.equal(transfer.answer, 'less');
  const gainAt = (progress) => {
    const off = settled({ ...setup, demand: progress });
    const on = settled({ ...setup, [manipulation.control]: manipulation.to, demand: progress });
    return on.inspiratoryCapacityL - off.inspiratoryCapacityL;
  };
  assert.ok(
    gainAt(transfer.progress) < gainAt(setup.progress),
    `gain at maximal work (${gainAt(transfer.progress)}) must be smaller than at a fixed workload (${gainAt(setup.progress)})`
  );
});

// --- the scope panel -------------------------------------------------------

test('the scope panel is complete, bilingual, and says gas exchange is absent', () => {
  assert.ok(MODEL_SCOPE.question && MODEL_SCOPE.questionJa);
  for (const key of ['answers', 'excludes', 'cautions', 'sources']) {
    assert.ok(MODEL_SCOPE[key]?.length, `scope is missing ${key}`);
    for (const entry of MODEL_SCOPE[key]) {
      assert.ok(entry.text && entry.textJa, `a ${key} entry is not bilingual`);
    }
  }
  assert.ok(MODEL_SCOPE.evidence.startsWith('docs/model-evidence/'));
  // The single most important thing this scene must not be believed about.
  const excluded = MODEL_SCOPE.excludes.map((entry) => entry.text).join(' ');
  assert.match(excluded, /gas exchange/i);
});

test('the reference lung the shapes are drawn against is the normal one', () => {
  // The drawn size is relative to a normal lung's resting volume, which is what
  // makes hyperinflation visible rather than normalised away.
  const reference = lungMechanics({ airwayResistance: 1, elasticRecoil: 1 });
  assert.ok(Math.abs(reference.relaxedVolumeL - 2.4) < 0.05);
  const built = sceneAt({ progress: 0 });
  assert.ok(
    built.model.state.endExpiratoryVolumeL > reference.relaxedVolumeL + 1,
    'the scene’s lung rests well above a normal one, which is what the drawing has to show'
  );
});
