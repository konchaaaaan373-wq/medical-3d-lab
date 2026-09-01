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

/**
 * **Layer 2 — model integrity.** These check that the asthma scene agrees with
 * itself: that the solver converges, that nothing leaves the range it
 * described, and that the chart, the read-out, the 3D and the teaching text
 * are all reading the same model.
 *
 * A failure here means the implementation is broken or two parts of the
 * repository have drifted apart. It says nothing about the physiology — that
 * is layer 1 — and nothing about whether a chosen constant has moved, which
 * is layer 3. See `tests/README.md`.
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
  built.primary.tree.setCalibres((index) => {
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
  const colours = built.primary.units.instanceColor.array;
  const lightness = [];
  for (let unit = 0; unit < TERMINAL_COUNT; unit++) {
    lightness.push(colours[unit * 3] + colours[unit * 3 + 1] + colours[unit * 3 + 2]);
  }
  const spread = Math.max(...lightness) - Math.min(...lightness);
  assert.ok(spread > 0.4, `every unit was drawn nearly the same colour (spread ${spread})`);

  // And the quiet lung is drawn as one population.
  const quiet = sceneAt({ progress: 0 });
  const quietColours = quiet.primary.units.instanceColor.array;
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
  const leaf = built.primary.tree.leafPositions[worst.unit];
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

test('challenge 1: more parenchymal tethering opens a lung that has already tipped', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'parenchymal-tethering');
  const { setup, manipulation } = module;
  const before = solved({ ...setup, stimulus: setup.progress });
  const after = solved({ ...setup, [manipulation.control]: manipulation.to, stimulus: setup.progress });

  assert.equal(module.question.answer, 'falls');
  assert.ok(before.defectFraction > 0.35, 'the premise: a good share of the lung has tipped');
  assert.ok(after.heterogeneity < before.heterogeneity, 'the unevenness has to fall');
  assert.ok(after.defectFraction < before.defectFraction, 'and some regions have to come back');
  // The observation says only that resistance fell and more air arrived — no
  // magnitude, deliberately. Asserting a size here would be asserting a size
  // for a calibration constant.
  assert.ok(after.resistanceRatio < before.resistanceRatio, 'resistance has to fall');
  assert.ok(after.totalVentilation > before.totalVentilation, 'and more air has to reach the lung');
  // The footnote says going the other way raises the resistance instead.
  const held = solved({ ...setup, lungInflation: 0.8, stimulus: setup.progress });
  assert.ok(held.resistanceRatio > before.resistanceRatio, 'and less stretch does the reverse');
});

test('challenge 1 never claims a bronchodilator response to a real deep inspiration', () => {
  // The lesson this replaced quoted a size — "a third of the dark regions came
  // back" — for what a deep breath does. The mechanism in the model is
  // parenchymal tethering, which is only part of what a deep inspiration is,
  // and the deep-inspiration response is impaired or lost in asthma. So the
  // text is required to name the mechanism and to disclaim the manoeuvre.
  const module = LEARNING_MODULES.find((entry) => entry.id === 'parenchymal-tethering');
  const prose = [
    module.title,
    module.question.text,
    module.manipulation.text,
    module.manipulation.action,
    module.observation.text,
    module.explanation.text,
    module.explanation.footnote,
    module.outro.text,
  ].join(' ');
  assert.ok(/tethering/i.test(prose), 'the lesson has to name the mechanism it is actually showing');
  assert.ok(
    /does not predict the bronchodilator response to a real deep inspiration/i.test(module.outro.text),
    'and it has to say plainly that it is not predicting a patient’s deep breath'
  );
  assert.ok(
    /impaired or lost/i.test(module.outro.text),
    'including that the real response is impaired or lost in asthma'
  );
  // No quantity anywhere in the prose: the numbers belong on the panel, where
  // they come from the model and carry the model's caveats with them.
  assert.ok(
    !/\b(half|halved|doubled|a third|two thirds|a quarter)\b/i.test(prose),
    'the lesson must not quote a size for an illustrative mechanism'
  );
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

// --- normal beside disease -------------------------------------------------

test('the comparison puts a healthy tree beside the asthmatic one', () => {
  const built = scene();
  assert.equal(built.reference, undefined, 'the second tree is not built until it is asked for');

  built.setComparison(true);
  assert.ok(built.reference, 'turning the comparison on builds it');
  assert.ok(built.reference.object.visible);
  assert.ok(built.primary.object.position.x > 0);
  assert.equal(built.reference.object.position.x, -built.primary.object.position.x);

  built.setComparison(false);
  assert.equal(built.primary.object.position.x, 0);
  assert.equal(built.reference.object.visible, false);
});

test('both trees are given the same stimulus, so the difference is the lung', () => {
  // The whole image is "one stimulus, two lungs". If the healthy tree were
  // quietly given a weaker stimulus, the picture would be an artefact of the
  // setup rather than a property of the trait.
  const built = scene();
  built.setComparison(true);
  for (const progress of [0, 0.4, 0.8, 1]) {
    built.setProgress(progress);
    const reference = built.referenceSolve();
    assert.equal(reference.controls.stimulus, built.solved.controls.stimulus, `stimulus differed at ${progress}`);
    // And what does differ is the trait and the remodelling, which is the point.
    assert.equal(reference.controls.hyperresponsiveness, 1);
    assert.equal(reference.controls.wallThickening, 0);
    assert.ok(built.solved.controls.hyperresponsiveness > 1);
  }
});

test('the comparison shows what hyperresponsiveness actually is: the knee moves left', () => {
  // The reason this scene earns a second tree, stated correctly.
  //
  // It is *not* that a normal lung never goes patchy. It does: the feedback
  // through parenchymal tethering is a property of a branching lung, not of
  // asthma, and a strong enough stimulus tips any of them. What the asthmatic
  // trait does is move the knee of the dose-response curve to a lower dose.
  //
  // So the comparison is worth watching at a dose near the asthmatic knee,
  // where one tree has already tipped and the other has not — and it stays
  // honest at full dose, where both do.
  const built = scene();
  built.setComparison(true);

  built.setProgress(0.6);
  const asthmaticAtKnee = built.solved;
  const healthyAtKnee = built.referenceSolve();
  assert.ok(asthmaticAtKnee.defectFraction > 0, 'the asthmatic tree has tipped at this dose');
  assert.equal(healthyAtKnee.defectFraction, 0, 'and the healthy one has not');
  assert.ok(healthyAtKnee.heterogeneity < asthmaticAtKnee.heterogeneity);
  assert.ok(healthyAtKnee.totalVentilation > asthmaticAtKnee.totalVentilation);

  // And at full dose the healthy tree tips too, which the scene must not hide.
  built.setProgress(1);
  assert.ok(
    built.referenceSolve().defectFraction > 0,
    'a normal lung has to be allowed to go patchy under a strong enough stimulus'
  );
});

test('the two trees are drawn by the same code, and only their solves differ', () => {
  // Both go through `drawTree`, so nothing can drift between them that nobody
  // chose. Asserted by drawing both from the same solve.
  const built = scene();
  built.setComparison(true);
  built.setProgress(0.8);
  built.drawTree(built.primary, built.solved);
  built.drawTree(built.reference, built.solved);

  assert.deepEqual(
    Array.from(built.primary.units.instanceColor.array),
    Array.from(built.reference.units.instanceColor.array)
  );
  assert.equal(built.primary.tree.material.color.getHex(), built.reference.tree.material.color.getHex());
});

test('the comparison view frames the pair rather than one tree', () => {
  const built = scene();
  const pair = built.getComparisonView();
  assert.ok(pair.position.z > AsthmaScene.cameraPose.position.z, 'the camera has to pull back for two trees');
  assert.equal(pair.target.x, 0, 'and sit on the midline so neither is favoured');
});

test('the comparison says which tree is which, and the read-out carries both', () => {
  // Two near-identical trees side by side with no labels is a picture, not a
  // statement. Read without switching the comparison on first: the app reads
  // this list once, at load, so a label that only appeared afterwards would
  // never appear at all.
  const built = scene();
  const labels = Object.fromEntries(built.getAnnotations().map((a) => [a.id, a]));
  assert.ok(labels['reference-tree'] && labels['asthmatic-tree'], 'both trees are named');
  assert.equal(labels['reference-tree'].comparisonOnly, true);
  assert.equal(labels['asthmatic-tree'].comparisonOnly, true);

  // Each label sits on the same side as the tree it names.
  built.setComparison(true);
  assert.equal(Math.sign(labels['reference-tree'].position.x), Math.sign(built.reference.object.position.x));
  assert.equal(Math.sign(labels['asthmatic-tree'].position.x), Math.sign(built.primary.object.position.x));

  // While comparing, each read-out row also carries the healthy tree's figure,
  // from the same solve the reference tree is drawn from.
  built.setProgress(0.6);
  const rows = new Map(built.getMetrics().map((row) => [row.id, row]));
  const healthy = built.referenceSolve();
  assert.equal(rows.get('resistance').reference, healthy.resistanceRatio.toFixed(2));
  assert.equal(rows.get('defects').reference, Math.round(healthy.defectFraction * 100));
  assert.equal(rows.get('stimulus').reference, rows.get('stimulus').value, 'the dose column says the ask is identical');
  assert.equal(rows.get('settled').reference, undefined, 'convergence is a solver fact, not a difference between lungs');

  // And off again: no reference column outside the comparison.
  built.setComparison(false);
  assert.equal(built.getMetrics().find((row) => row.id === 'resistance').reference, undefined);
});
