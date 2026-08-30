import test from 'node:test';
import assert from 'node:assert/strict';
import { PortalHypertensionScene } from '../src/scenes/hepatobiliary/scenes/portalHypertension/PortalHypertensionScene.js';
import { CHARTS, METRICS, MODEL_CONTROLS, MODEL_SCOPE, STAGES } from '../src/data/portalHypertension.js';
import { CAUSAL_STORY, LEARNING_MODULES } from '../src/data/portalHypertensionTeaching.js';
import { solvePortalCirculation } from '../src/models/portalHypertension.js';

/**
 * What the cirrhosis scene is required to get right.
 *
 * The model's own tests cover the network. These cover what a scene can get
 * wrong on top of a correct model — and, above all, they check the thing this
 * scene exists for: that it never shows one gradient and lets the reader think
 * it is the other.
 */

const scene = () => {
  const built = new PortalHypertensionScene({});
  built.build();
  return built;
};

/** The scene, driven through its own public interface. */
function sceneAt({ progress = 0, ...controls } = {}) {
  const built = scene();
  built.setProgress(progress);
  for (const [id, value] of Object.entries(controls)) built.setModelControl(id, value);
  return built;
}

/** The structural resistance the scene's slider maps a position to. */
const structuralAt = (progress) => 1 + (PortalHypertensionScene.MAX_STRUCTURAL_RESISTANCE - 1) * progress;

const CIRRHOTIC = { splanchnicVasodilation: 1 };

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

test('every stage and annotation is bilingual, and the stages span the axis', () => {
  for (const stage of STAGES) {
    assert.ok(stage.name && stage.nameJa, `stage ${stage.id} needs a name in both languages`);
    assert.ok(stage.summary && stage.summaryJa, `stage ${stage.id} needs a summary in both languages`);
  }
  const positions = STAGES.map((stage) => stage.at);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.equal(positions[0], 0);
  assert.equal(positions[positions.length - 1], 1);

  for (const annotation of scene().getAnnotations()) {
    assert.ok(annotation.text && annotation.sub, `annotation ${annotation.id} needs both languages`);
    assert.ok(annotation.position, `annotation ${annotation.id} has no position`);
  }
});

// --- the distinction the scene exists to make ------------------------------

test('the read-out always shows both gradients, and names each one for what it is', () => {
  const rows = sceneAt({ progress: 1, ...CIRRHOTIC }).getMetrics();
  const ppg = rows.find((row) => row.id === 'ppg');
  const hvpg = rows.find((row) => row.id === 'hvpg');
  assert.ok(ppg && hvpg, 'both rows are present at all times, not one or the other');
  // The row that is the model's own quantity has to say so, and the row that
  // is the measurement has to say that it is what a measurement would read.
  assert.match(ppg.label, /portal pressure gradient/i);
  assert.match(ppg.label, /this model/i);
  assert.match(hvpg.label, /HVPG/);
  assert.match(hvpg.label, /would read/i);
});

test('the scene never calls its own gradient an HVPG', () => {
  const built = sceneAt({ progress: 1, ...CIRRHOTIC });
  const state = built.solved;
  const rows = new Map(built.getMetrics().map((row) => [row.id, row]));
  assert.equal(rows.get('ppg').value, state.portalPressureGradientMmHg.toFixed(1));
  assert.equal(rows.get('hvpg').value, state.hepaticVenousPressureGradientMmHg.toFixed(1));
  // And in the default sinusoidal configuration they are close but the scene
  // still shows two rows rather than collapsing them into one.
  assert.notEqual(rows.get('ppg'), rows.get('hvpg'));
});

test('moving the resistance upstream collapses the measurement and not the gradient', () => {
  const sinusoidal = sceneAt({ progress: 1, ...CIRRHOTIC });
  const presinusoidal = sceneAt({ progress: 1, ...CIRRHOTIC, presinusoidalShare: 1 });
  const value = (built, id) => Number(built.getMetrics().find((row) => row.id === id).value);

  assert.ok(
    Math.abs(value(presinusoidal, 'ppg') - value(sinusoidal, 'ppg')) < 0.15,
    'the gradient the scene shows must not move'
  );
  assert.ok(
    value(presinusoidal, 'hvpg') < value(sinusoidal, 'hvpg') * 0.2,
    'and the measurement must collapse'
  );
  assert.ok(value(presinusoidal, 'missed') > 10, 'and the scene has to say how much was missed');
});

test('the clinical band is withheld rather than extended where it would be wrong', () => {
  const sinusoidal = sceneAt({ progress: 1, ...CIRRHOTIC });
  const presinusoidal = sceneAt({ progress: 1, ...CIRRHOTIC, presinusoidalShare: 0.6 });
  const band = (built) => built.getMetrics().find((row) => row.id === 'band');

  assert.match(band(sinusoidal).value, /risk|significant/i, 'a badly obstructed sinusoidal liver gets a band');
  assert.match(band(presinusoidal).value, /not applicable/i, 'a presinusoidal one does not');
  assert.ok(band(presinusoidal).valueJa, 'and it says so in Japanese too');
});

// --- the read-out ----------------------------------------------------------

test('every read-out row carries a value, and the values are the model’s', () => {
  const built = sceneAt({ progress: 0.6, ...CIRRHOTIC });
  const rows = new Map(built.getMetrics().map((row) => [row.id, row]));
  assert.equal(rows.size, METRICS.length);
  for (const row of rows.values()) {
    assert.ok(row.value != null && row.value !== '', `${row.id} has no value`);
    assert.ok(row.label && row.labelJa, `${row.id} is not bilingual`);
  }
  const state = built.solved;
  assert.equal(rows.get('liverFlow').value, Math.round(state.portalLiverFlowMlPerMin));
  assert.equal(rows.get('shunt').value, Math.round(state.shuntFraction * 100));
});

test('no read-out row quotes more precision than the model has earned', () => {
  for (const row of sceneAt({ progress: 0.6 }).getMetrics()) {
    const decimals = String(row.value).split('.')[1]?.length ?? 0;
    assert.ok(decimals <= 1, `${row.id} shows ${decimals} decimal places`);
  }
});

test('the scene reports nothing about ascites, bleeding, liver function or a score', () => {
  const forbidden = /(ascites|varice|bleed|encephalopath|child|meld|albumin|survival)/i;
  for (const row of sceneAt({ progress: 1, ...CIRRHOTIC }).getMetrics()) {
    assert.ok(!forbidden.test(row.id), `the scene must not report "${row.id}"`);
    assert.ok(!forbidden.test(row.label), `the scene must not label a row "${row.label}"`);
  }
});

// --- the charts ------------------------------------------------------------

test('every declared chart is filled, and with the model’s own numbers', () => {
  const built = sceneAt({ progress: 1, ...CIRRHOTIC });
  const charts = built.getCharts();
  assert.equal(Object.keys(charts).length, CHARTS.length);
  for (const spec of CHARTS) assert.ok(charts[spec.id], `chart "${spec.id}" was declared but never filled`);
});

test('the pressure profile is the model’s profile, and it falls', () => {
  const built = sceneAt({ progress: 1, ...CIRRHOTIC, presinusoidalShare: 0.5 });
  const profile = built.getCharts()['pressure-profile'].series.find((series) => series.id === 'profile');
  const fromModel = built.solved.pressureProfile.map((point) => point.pressureMmHg);
  assert.deepEqual(
    profile.points.map((point) => point.y),
    fromModel
  );
  assert.deepEqual(fromModel, [...fromModel].sort((a, b) => b - a), 'pressure falls along the pathway');
});

test('the span drawn as “what HVPG sees” is exactly the sinusoidal segment', () => {
  const built = sceneAt({ progress: 1, ...CIRRHOTIC, presinusoidalShare: 0.7 });
  const measured = built.getCharts()['pressure-profile'].series.find((series) => series.id === 'measured');
  const state = built.solved;
  assert.equal(measured.points[0].y, state.sinusoidalPressureMmHg);
  assert.equal(measured.points[1].y, state.hepaticVeinPressureMmHg);
  // Which is to say: the drawn span is the HVPG.
  const drawnSpan = measured.points[0].y - measured.points[1].y;
  assert.ok(Math.abs(drawnSpan - state.hepaticVenousPressureGradientMmHg) < 1e-9);
});

test('the flow bars add up to the inflow the model computed', () => {
  const built = sceneAt({ progress: 1, ...CIRRHOTIC, tips: 0.6 });
  const bars = built.getCharts()['flow-destinations'].bars;
  const total = bars.reduce((sum, bar) => sum + bar.y, 0);
  assert.ok(
    Math.abs(total - built.solved.splanchnicInflowMlPerMin) < 1e-6,
    `the bars add to ${total} against an inflow of ${built.solved.splanchnicInflowMlPerMin}`
  );
});

// --- what the scene draws --------------------------------------------------

test('collaterals are not drawn at all until the model has opened them', () => {
  // The model's opening term is a sigmoid and never quite reaches zero, so the
  // premise is about flow: a healthy portal system has anastomoses, and what it
  // does not have is blood going through them.
  const healthy = sceneAt({ progress: 0 });
  assert.ok(healthy.solved.collateralFlowMlPerMin < 25, 'the premise: nothing is going through them');
  assert.equal(healthy.vessels.vessels.collateralOesophageal.mesh.visible, false);

  const cirrhotic = sceneAt({ progress: 1, ...CIRRHOTIC });
  assert.ok(cirrhotic.solved.collateralOpening > 0.5);
  assert.equal(cirrhotic.vessels.vessels.collateralOesophageal.mesh.visible, true);
});

test('a shunt is drawn only when one has been placed', () => {
  assert.equal(sceneAt({ progress: 1, ...CIRRHOTIC }).vessels.vessels.tips.mesh.visible, false);
  assert.equal(sceneAt({ progress: 1, ...CIRRHOTIC, tips: 1 }).vessels.vessels.tips.mesh.visible, true);
});

test('a vessel carrying more blood is drawn wider', () => {
  const radiusOf = (built, name) => {
    const surface = built.vessels.vessels[name].surface;
    const position = surface.geometry.attributes.position;
    // Distance of the first ring's first vertex from the curve's start.
    const start = surface.points[0];
    return Math.hypot(
      position.getX(0) - start.x,
      position.getY(0) - start.y,
      position.getZ(0) - start.z
    );
  };
  const quiet = sceneAt({ progress: 0 });
  const busy = sceneAt({ progress: 1, splanchnicVasodilation: 1 });
  assert.ok(
    busy.solved.splanchnicInflowMlPerMin > quiet.solved.splanchnicInflowMlPerMin * 1.3,
    'the premise: much more blood is arriving'
  );
  assert.ok(radiusOf(busy, 'portal') > radiusOf(quiet, 'portal'), 'so the portal vein is drawn wider');
});

// --- the controls ----------------------------------------------------------

test('every declared control exists in the model and comes back with its value', () => {
  const built = scene();
  const controls = built.getModelControls();
  assert.equal(controls.length, MODEL_CONTROLS.length);
  for (const control of controls) {
    assert.ok(Number.isFinite(control.value), `${control.id} has no value`);
    assert.ok(control.value >= control.min && control.value <= control.max);
    assert.ok(control.label && control.labelJa, `${control.id} is not bilingual`);
    built.setModelControl(control.id, control.min);
    built.setModelControl(control.id, control.max);
  }
});

test('the progression axis is the structural resistance and nothing else', () => {
  const built = scene();
  built.setProgress(0.5);
  const others = { ...built.controls };
  built.setProgress(1);
  for (const [id, value] of Object.entries(others)) {
    if (id === 'structuralResistance') continue;
    assert.equal(built.controls[id], value, `moving the main slider changed "${id}"`);
  }
  assert.ok(Math.abs(built.controls.structuralResistance - structuralAt(1)) < 1e-9);
});

// --- the walk-through ------------------------------------------------------

test('every walk-through step is bilingual, and every step after the first says why it follows', () => {
  assert.ok(CAUSAL_STORY.steps.length >= 8);
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

test('the walk-through narrates the chain the model actually produces', () => {
  const at = (id) => {
    const step = CAUSAL_STORY.steps.find((entry) => entry.id === id);
    return solvePortalCirculation({ ...step.controls, structuralResistance: structuralAt(step.progress) });
  };

  // Step 2: scarring alone, collaterals held shut, takes it a very long way.
  assert.ok(at('resistance').portalPressureGradientMmHg > at('healthy').portalPressureGradientMmHg * 5);
  // Step 3: adding inflow takes it further still.
  assert.ok(at('inflow').portalPressureGradientMmHg > at('resistance').portalPressureGradientMmHg);
  assert.ok(at('inflow').splanchnicInflowMlPerMin > at('resistance').splanchnicInflowMlPerMin * 1.2);
  // Step 4: collaterals take a real bite out of it.
  assert.ok(at('collaterals').portalPressureGradientMmHg < at('inflow').portalPressureGradientMmHg * 0.7);
  // Step 5: and leave it clearly abnormal, with most of the blood diverted.
  assert.ok(at('not-enough').portalPressureGradientMmHg > 12);
  assert.ok(at('not-enough').shuntFraction > 0.4);
  // Step 6: the two gradients agree here.
  assert.ok(at('measuring').gradientMissedByHvpgMmHg < 0.5);
  // Step 7: and they do not, there.
  assert.ok(at('presinusoidal').gradientMissedByHvpgMmHg > 10);
  assert.ok(
    Math.abs(at('presinusoidal').portalPressureGradientMmHg - at('measuring').portalPressureGradientMmHg) < 0.01,
    'and the true gradient is the same in both'
  );
  // Step 8: the shunt works, and costs.
  assert.ok(at('shunt').portalPressureGradientMmHg < 12);
  assert.ok(at('shunt').portalLiverFlowMlPerMin < at('not-enough').portalLiverFlowMlPerMin * 0.6);
});

// --- the challenges --------------------------------------------------------

test('every challenge is structurally complete and bilingual', () => {
  assert.ok(LEARNING_MODULES.length >= 3);
  for (const module of LEARNING_MODULES) {
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
      assert.ok(metricIds.has(module.transfer.metric));
      assert.ok(Number.isFinite(module.transfer.progress), `${module.id}: transfer stage did not resolve`);
    }
  }
});

test('challenge 1: collaterals roughly halve the pressure and leave it clearly abnormal', () => {
  const module = scene()
    .getLearningModules()
    .find((entry) => entry.id === 'collaterals-do-not-fix-it');
  const { setup, manipulation, transfer } = module;
  const solve = (progress, overrides) =>
    solvePortalCirculation({ ...setup, ...overrides, structuralResistance: structuralAt(progress) });

  const before = solve(setup.progress, {});
  const after = solve(setup.progress, { [manipulation.control]: manipulation.to });

  assert.equal(module.question.answer, 'halves');
  assert.ok(after.portalPressureGradientMmHg < before.portalPressureGradientMmHg * 0.65, 'roughly halves');
  assert.ok(after.portalPressureGradientMmHg > 12, 'and stays clearly abnormal');
  assert.ok(after.shuntFraction > 0.5, 'having diverted well over half the blood');

  // Transfer: the same collaterals on a less scarred liver relieve less.
  assert.equal(transfer.answer, 'less');
  const relief = (progress) =>
    solve(progress, {}).portalPressureGradientMmHg -
    solve(progress, { [manipulation.control]: manipulation.to }).portalPressureGradientMmHg;
  assert.ok(
    relief(transfer.progress) < relief(setup.progress),
    `early relief ${relief(transfer.progress)} against late ${relief(setup.progress)}`
  );
});

test('challenge 2: moving the resistance upstream collapses HVPG and leaves the gradient', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'hvpg-versus-gradient');
  const { setup, manipulation } = module;
  const solve = (overrides) =>
    solvePortalCirculation({ ...setup, ...overrides, structuralResistance: structuralAt(setup.progress) });

  assert.equal(module.question.answer, 'hvpg-falls');
  const before = solve({});
  const after = solve({ [manipulation.control]: manipulation.to });
  assert.ok(Math.abs(after.portalPressureGradientMmHg - before.portalPressureGradientMmHg) < 0.01);
  assert.ok(after.hepaticVenousPressureGradientMmHg < before.hepaticVenousPressureGradientMmHg * 0.2);
});

test('challenge 3: a shunt drops the gradient and the hepatic perfusion with it', () => {
  const module = LEARNING_MODULES.find((entry) => entry.id === 'shunt-trade');
  const { setup, manipulation } = module;
  const solve = (overrides) =>
    solvePortalCirculation({ ...setup, ...overrides, structuralResistance: structuralAt(setup.progress) });

  assert.equal(module.question.answer, 'falls');
  const before = solve({});
  const after = solve({ [manipulation.control]: manipulation.to });
  assert.ok(after.portalPressureGradientMmHg < 12, 'the gradient falls below where varices bleed');
  assert.ok(
    after.portalLiverFlowMlPerMin < before.portalLiverFlowMlPerMin * 0.5,
    `hepatic perfusion went ${before.portalLiverFlowMlPerMin} → ${after.portalLiverFlowMlPerMin}`
  );
});

// --- the scope panel -------------------------------------------------------

test('the scope panel is complete, bilingual, and refuses the two claims most likely to be read into it', () => {
  assert.ok(MODEL_SCOPE.question && MODEL_SCOPE.questionJa);
  for (const key of ['answers', 'excludes', 'cautions', 'sources']) {
    assert.ok(MODEL_SCOPE[key]?.length, `scope is missing ${key}`);
    for (const entry of MODEL_SCOPE[key]) {
      assert.ok(entry.text && entry.textJa, `a ${key} entry is not bilingual`);
    }
  }
  assert.ok(MODEL_SCOPE.evidence.startsWith('docs/model-evidence/'));

  const excluded = MODEL_SCOPE.excludes.map((entry) => entry.text).join(' ');
  assert.match(excluded, /ascites/i, 'the scene must say it does not model ascites');

  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.text).join(' ');
  assert.match(cautions, /HVPG/, 'and that its gradient is not an HVPG');
  assert.match(cautions, /Baveno/i, 'and where the thresholds came from and apply');
});

test('the disclaimer says the two things a reader most needs before believing a number here', () => {
  const scene = PortalHypertensionScene.meta;
  assert.match(scene.disclaimer, /not the same measurement as HVPG|not an HVPG/i);
  assert.match(scene.disclaimer, /ascites/i);
  assert.match(scene.disclaimerJa, /HVPG/);
  assert.match(scene.disclaimerJa, /腹水/);
});
