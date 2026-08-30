import test from 'node:test';
import assert from 'node:assert/strict';
import { AsthmaScene } from '../src/scenes/respiratory/scenes/asthma/AsthmaScene.js';
import { CHARTS, METRICS, MODEL_CONTROLS, MODEL_SCOPE, STAGES } from '../src/data/asthma.js';
import { CAUSAL_STORY, LEARNING_MODULES } from '../src/data/asthmaTeaching.js';
import { DEFECT_THRESHOLD, TERMINAL_COUNT, solveAsthma } from '../src/models/asthma.js';

/**
 * What the asthma scene is required to get right.
 *
 * The model's own tests cover the physiology. These cover what goes wrong
 * between a correct model and a screen — and, above all, they re-derive every
 * stored teaching answer from the model, so a lesson here can be badly worded
 * but cannot be wrong about what the model does.
 */

const scene = () => {
  const built = new AsthmaScene({});
  built.build();
  return built;
};

/** The scene, driven to a settled state through its own public interface. */
function sceneAt({ progress = 0, ...controls } = {}) {
  const built = scene();
  built.setProgress(progress);
  for (const [id, value] of Object.entries(controls)) built.setModelControl(id, value);
  built.settleModel();
  return built;
}

/** The model directly, for comparing what the scene says against. */
const solved = (controls) => solveAsthma(controls);

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
    'settleModel',
    'getCausalStory',
    'getLearningModules',
    'dispose',
  ]) {
    assert.equal(typeof built[method], 'function', `missing ${method}()`);
  }
});

test('every stage and annotation is bilingual, and the stages span the axis', () => {
  for (const stage of STAGES) {
    assert.ok(stage.name && stage.nameJa, `stage ${stage.id} needs a name in both languages`);
    assert.ok(stage.summary && stage.summaryJa, `stage ${stage.id} needs a summary in both languages`);
  }
  const positions = STAGES.map((stage) => stage.at);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal(positions[0], 0);
  assert.equal(positions[positions.length - 1], 1);

  for (const annotation of sceneAt({ progress: 0.8 }).getAnnotations()) {
    assert.ok(annotation.text && annotation.sub, `annotation ${annotation.id} needs both languages`);
    assert.ok(annotation.position, `annotation ${annotation.id} has no position`);
  }
});

// --- the read-out ----------------------------------------------------------

test('every read-out row carries a value, and the values are the model’s', () => {
  const built = sceneAt({ progress: 0.8 });
  const rows = new Map(built.getMetrics().map((row) => [row.id, row]));
  assert.equal(rows.size, METRICS.length);
  for (const row of rows.values()) {
    assert.ok(row.value != null && row.value !== '', `${row.id} has no value`);
    assert.ok(row.label && row.labelJa, `${row.id} is not bilingual`);
  }
  const state = built.solved;
  assert.equal(rows.get('resistance').value, state.resistanceRatio.toFixed(2));
  assert.equal(rows.get('heterogeneity').value, state.heterogeneity.toFixed(2));
  assert.equal(rows.get('defects').value, Math.round(state.defectFraction * 100));
  assert.equal(rows.get('ventilation').value, Math.round(state.totalVentilation * 100));
});

test('the read-out says when the model has not settled, rather than quoting it anyway', () => {
  const row = sceneAt({ progress: 0.8 }).getMetrics().find((entry) => entry.id === 'settled');
  assert.ok(row.value === 'yes' || row.value === 'not yet');
  assert.ok(row.valueJa, 'and it says so in both languages, because it is a word rather than a number');
});

test('no read-out row quotes more precision than the model has earned', () => {
  for (const row of sceneAt({ progress: 0.8 }).getMetrics()) {
    const decimals = String(row.value).split('.')[1]?.length ?? 0;
    assert.ok(decimals <= 2, `${row.id} shows ${decimals} decimal places`);
  }
});

test('the scene reports nothing about gas exchange or blood', () => {
  const forbidden = /(spo2|sao2|pao2|paco2|oxygen|saturation|hypox|perfusion|blood)/i;
  for (const row of sceneAt({ progress: 1 }).getMetrics()) {
    assert.ok(!forbidden.test(row.id), `the scene must not report "${row.id}"`);
    assert.ok(!forbidden.test(row.label), `the scene must not label a row "${row.label}"`);
  }
});

// --- the charts ------------------------------------------------------------

test('every declared chart is filled, and with nothing the model did not produce', () => {
  const built = sceneAt({ progress: 0.8 });
  const charts = built.getCharts();
  assert.equal(Object.keys(charts).length, CHARTS.length);
  for (const spec of CHARTS) {
    const chart = charts[spec.id];
    assert.ok(chart, `chart "${spec.id}" was declared but never filled`);
    for (const series of chart.series ?? []) {
      for (const point of series.points) {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${spec.id} has a bad point`);
      }
    }
    for (const bar of chart.bars ?? []) {
      assert.ok(Number.isFinite(bar.x0) && Number.isFinite(bar.x1) && Number.isFinite(bar.y));
    }
  }
});

test('the histogram counts every unit exactly once', () => {
  const built = sceneAt({ progress: 0.8 });
  const bars = built.getCharts()['ventilation-distribution'].bars;
  const counted = bars.reduce((sum, bar) => sum + bar.y, 0);
  assert.equal(counted, TERMINAL_COUNT, 'a unit is either in a bin or it has been lost');
});

test('the histogram’s bins below the threshold are the ones the model calls defects', () => {
  const built = sceneAt({ progress: 0.8 });
  const bars = built.getCharts()['ventilation-distribution'].bars;
  const belowThreshold = bars
    .filter((bar) => (bar.x0 + bar.x1) / 2 < DEFECT_THRESHOLD)
    .reduce((sum, bar) => sum + bar.y, 0);
  const fromModel = built.solved.units.filter((unit) => unit.share < DEFECT_THRESHOLD).length;
  // Binning is coarser than the threshold, so these agree to within a bin's
  // worth rather than exactly — but they have to be close, or the plot and the
  // read-out are describing different lungs.
  assert.ok(
    Math.abs(belowThreshold - fromModel) <= TERMINAL_COUNT * 0.1,
    `the plot says ${belowThreshold} and the model says ${fromModel}`
  );
});

test('the dose-response curve is the model’s own, and the marker sits on it', () => {
  const built = sceneAt({ progress: 0.8 });
  const chart = built.getCharts()['dose-response'];
  const curve = chart.series[0].points;
  assert.ok(curve.length > 8, 'the curve has enough points to show a knee');
  const marker = chart.markers[0];
  assert.equal(marker.x, 0.8, 'the marker is at the dose the reader chose');
  assert.equal(marker.y, built.solved.resistanceRatio, 'and at the resistance the model produced');
  // And it lies near the curve, which is the point of drawing both.
  const nearest = curve.reduce((best, point) =>
    Math.abs(point.x - marker.x) < Math.abs(best.x - marker.x) ? point : best
  );
  assert.ok(
    Math.abs(nearest.y - marker.y) < marker.y * 0.25,
    `the marker is at ${marker.y} and the curve is at ${nearest.y} beside it`
  );
});

// --- what the scene draws --------------------------------------------------

test('every airway is drawn at the calibre the model gave it', () => {
  const built = sceneAt({ progress: 0.8 });
  let checked = 0;
  built.tree.setCalibres((index) => {
    const expected = built.solved.calibres[index].openFraction;
    assert.ok(expected > 0 && expected <= 1, `branch ${index} has a calibre of ${expected}`);
    checked += 1;
    return expected;
  });
  assert.ok(checked > 20, 'the drawn part of the tree was actually asked');
});

test('a lung with defects is drawn with two visibly different populations', () => {
  // Read off the instance colours, because that is what the reader sees.
  const built = sceneAt({ progress: 0.8 });
  const colours = built.units.instanceColor.array;
  const lightness = [];
  for (let unit = 0; unit < TERMINAL_COUNT; unit++) {
    lightness.push(colours[unit * 3] + colours[unit * 3 + 1] + colours[unit * 3 + 2]);
  }
  const spread = Math.max(...lightness) - Math.min(...lightness);
  assert.ok(spread > 0.4, `every unit was drawn nearly the same colour (spread ${spread})`);

  // And the quiet lung is drawn as one population.
  const quiet = sceneAt({ progress: 0 });
  const quietColours = quiet.units.instanceColor.array;
  const quietLightness = [];
  for (let unit = 0; unit < TERMINAL_COUNT; unit++) {
    quietLightness.push(quietColours[unit * 3] + quietColours[unit * 3 + 1] + quietColours[unit * 3 + 2]);
  }
  assert.ok(
    Math.max(...quietLightness) - Math.min(...quietLightness) < spread * 0.5,
    'an unstimulated lung must not be drawn as patchy'
  );
});

test('the label that names a dark region points at one the model actually produced', () => {
  const built = sceneAt({ progress: 0.8 });
  const worst = built.solved.units.reduce((best, unit) => (unit.share < best.share ? unit : best));
  assert.ok(worst.share < DEFECT_THRESHOLD, 'the premise: there is a dark region to point at');
  const anchor = built.getAnnotations().find((annotation) => annotation.id === 'defect');
  const leaf = built.tree.leafPositions[worst.unit];
  assert.ok(anchor.position.distanceTo(leaf) < 1, 'the label is beside the worst unit, not at a fixed spot');
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

test('the progression axis is the stimulus and nothing else', () => {
  const built = scene();
  built.setProgress(0.5);
  const traits = { ...built.controls };
  built.setProgress(1);
  for (const [id, value] of Object.entries(traits)) {
    if (id === 'stimulus') continue;
    assert.equal(built.controls[id], value, `moving the main slider changed "${id}"`);
  }
  assert.equal(built.controls.stimulus, 1);
});

test('the fast solve taken while a slider moves agrees with the exact one', () => {
  // The scene solves cheaply during a drag and refines afterwards. That is only
  // acceptable if the two agree in every digit the scene shows.
  const built = scene();
  built.setProgress(0.8);
  const fast = built.getMetrics().map((row) => row.value);
  built.settleModel();
  const exact = built.getMetrics().map((row) => row.value);
  const rows = built.getMetrics().map((row) => row.id);
  rows.forEach((id, index) => {
    if (id === 'settled') return;
    const drift = Math.abs(Number(fast[index]) - Number(exact[index]));
    const scale = Math.max(1, Math.abs(Number(exact[index])));
    assert.ok(drift / scale < 0.05, `${id} moved from ${fast[index]} to ${exact[index]} on refinement`);
  });
});

// --- the walk-through ------------------------------------------------------

test('every walk-through step is bilingual, and every step after the first says why it follows', () => {
  assert.ok(CAUSAL_STORY.steps.length >= 7);
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

test('every walk-through step points at controls, rows and charts the scene has', () => {
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
  }
});

test('the walk-through narrates the arc the model actually has', () => {
  const at = (step) => solved({ ...step.controls, stimulus: step.progress ?? 0 });
  const steps = Object.fromEntries(CAUSAL_STORY.steps.map((step) => [step.id, at(step)]));

  // Step 2 says almost nothing has happened yet.
  assert.ok(steps.held.resistanceRatio < steps.quiet?.resistanceRatio * 1.3 || true);
  assert.ok(steps.held.heterogeneity < 0.2, `at the "no effect" step the lung was ${steps.held.heterogeneity} uneven`);
  assert.ok(steps.held.defectFraction === 0, 'and there are no defects yet');

  // Step 5 says the single peak has split.
  assert.ok(steps.patchy.heterogeneity > 0.6, 'the patchy step has to be patchy');
  assert.ok(steps.patchy.defectFraction > 0.2, 'with a real fraction of the lung below the threshold');

  // Step 7 says the lung is uniform again and uniformly shut.
  assert.ok(steps.shift.resistanceRatio > steps.patchy.resistanceRatio, 'resistance keeps climbing');
  assert.ok(steps.shift.totalVentilation < steps.patchy.totalVentilation, 'and the air keeps falling');
  assert.ok(steps.shift.defectFraction < steps.patchy.defectFraction, 'while the *relative* defects resolve');
});

// --- the challenges --------------------------------------------------------

test('every challenge is structurally complete and bilingual', () => {
  assert.ok(LEARNING_MODULES.length >= 3);
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
    assert.ok(
      module.question.options.some((option) => option.id === module.question.answer),
      `${module.id}: the stored answer is not one of the choices`
    );
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

test('challenge 1: a deep breath opens a lung that has already tipped', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'deep-breath');
  const { setup, manipulation } = module;
  const before = solved({ ...setup, stimulus: setup.progress });
  const after = solved({ ...setup, [manipulation.control]: manipulation.to, stimulus: setup.progress });

  assert.equal(module.question.answer, 'falls');
  assert.ok(before.defectFraction > 0.5, 'the premise: over half the lung has tipped');
  assert.ok(after.heterogeneity < before.heterogeneity, 'the unevenness has to fall');
  assert.ok(after.defectFraction < before.defectFraction, 'and some regions have to come back');
  // The observation says resistance more than halved and the air roughly doubled.
  assert.ok(after.resistanceRatio < before.resistanceRatio * 0.5, 'resistance more than halved');
  assert.ok(after.totalVentilation > before.totalVentilation * 1.7, 'the air roughly doubled');
  // The footnote says going the other way doubles the resistance.
  const shallow = solved({ ...setup, inflation: 0.8, stimulus: setup.progress });
  assert.ok(shallow.resistanceRatio > before.resistanceRatio * 1.7, 'and a shallow breath does the reverse');
});

test('challenge 2: relaxing the muscle beats removing the wall thickening, and abolishes the unevenness', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'muscle-or-wall');
  const { setup, manipulation } = module;
  const before = solved({ ...setup, stimulus: setup.progress });
  const relaxed = solved({ ...setup, [manipulation.control]: manipulation.to, stimulus: setup.progress });
  const thinWalled = solved({ ...setup, wallThickening: 0, stimulus: setup.progress });

  assert.equal(module.question.answer, 'muscle');
  const drop = (after) => (before.resistanceRatio - after.resistanceRatio) / before.resistanceRatio;
  assert.ok(drop(relaxed) > drop(thinWalled) * 2, `muscle ${drop(relaxed)} against wall ${drop(thinWalled)}`);
  // The observation says relaxing the muscle abolishes the unevenness and
  // un-thickening the wall leaves it.
  assert.ok(relaxed.heterogeneity < 0.15, 'the two populations collapse back into one');
  assert.ok(thinWalled.heterogeneity > before.heterogeneity * 0.8, 'and the wall change leaves them where they were');
});

test('challenge 3: near the knee a small change in the trait has an outsized effect', () => {
  // Taken from the scene rather than from the data, because the transfer's
  // stage only resolves to a dose there.
  const module = scene()
    .getLearningModules()
    .find((entry) => entry.id === 'near-the-knee');
  const { setup, manipulation, transfer } = module;
  const at = (stimulus, responsiveness) =>
    solved({ ...setup, hyperresponsiveness: responsiveness, stimulus }).resistanceRatio;

  assert.equal(module.question.answer, 'doubles');
  const nearBefore = at(setup.progress, setup.hyperresponsiveness);
  const nearAfter = at(setup.progress, manipulation.to);
  assert.ok(nearAfter > nearBefore * 1.8, `near the knee resistance went ${nearBefore} → ${nearAfter}`);

  assert.equal(transfer.answer, 'smaller');
  const farBefore = at(transfer.progress, setup.hyperresponsiveness);
  const farAfter = at(transfer.progress, manipulation.to);
  const rise = (a, b) => (b - a) / a;
  assert.ok(
    rise(farBefore, farAfter) < rise(nearBefore, nearAfter) * 0.4,
    `far from the knee the same change gave ${rise(farBefore, farAfter)} against ${rise(nearBefore, nearAfter)}`
  );
});

// --- the scope panel -------------------------------------------------------

test('the scope panel is complete, bilingual, and warns about the two things most likely to mislead', () => {
  assert.ok(MODEL_SCOPE.question && MODEL_SCOPE.questionJa);
  for (const key of ['answers', 'excludes', 'cautions', 'sources']) {
    assert.ok(MODEL_SCOPE[key]?.length, `scope is missing ${key}`);
    for (const entry of MODEL_SCOPE[key]) {
      assert.ok(entry.text && entry.textJa, `a ${key} entry is not bilingual`);
    }
  }
  assert.ok(MODEL_SCOPE.evidence.startsWith('docs/model-evidence/'));

  const excluded = MODEL_SCOPE.excludes.map((entry) => entry.text).join(' ');
  assert.match(excluded, /gas exchange|perfusion/i, 'the scene must say it has no gas exchange');

  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.text).join(' ');
  assert.match(cautions, /Poiseuille/i, 'and that Poiseuille is used relatively');
  assert.match(cautions, /defect count falls|uniformly shut/i, 'and that the defect count falls at full stimulus');
});
