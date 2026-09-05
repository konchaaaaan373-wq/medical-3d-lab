import test from 'node:test';
import assert from 'node:assert/strict';

import { MyocardialIschemiaScene } from '../src/scenes/cardiovascular/scenes/myocardialIschemia/MyocardialIschemiaScene.js';
import { STAGES, METRICS, CHARTS, SCOPE } from '../src/data/myocardialIschemia.js';
import { TERRITORIES } from '../src/models/coronaryTerritories.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';

/**
 * The ischemia scene, against the contract the App actually calls it with.
 *
 * This file exists because of what happened to the pulmonary oedema scene: it
 * shipped with three contract violations — a learning module that threw a
 * `TypeError` on the first click, a causal story that rendered blank, and a
 * chart keyed so that nothing ever drew it — and every one of them was
 * invisible to a test suite that checked the model and never called the scene.
 *
 * So this calls every method the App calls, at several points on the story, and
 * asserts the *shape* the panels require rather than only that nothing threw.
 */

const scene = new MyocardialIschemiaScene({});
scene.build();

test('the class carries every static the shell reads off it', () => {
  // This test exists because the scene shipped without them and the whole
  // surface fell back to "3D renderer unavailable": the App reads
  // `SceneClass.cameraPose` while framing the camera, before any instance
  // exists. The rest of this file called instance methods and saw nothing
  // wrong — the same shape of miss as the pulmonary oedema scene's, one level
  // up, so the lesson is the level rather than the method.
  const Scene = MyocardialIschemiaScene;

  assert.ok(Scene.cameraPose?.position, 'a camera position, before anything is built');
  assert.ok(Scene.cameraPose?.target, 'and something to look at — the field that was missing');

  const meta = Scene.meta;
  assert.ok(meta, 'meta is on the class');
  assert.equal(meta.id, 'myocardial-ischemia', 'and its id matches the catalogue');
  assert.equal(meta.status, 'alpha', 'and so does its status');

  // Every field the UI destructures. Listed rather than spot-checked, because
  // a missing one is not an error — it renders as nothing.
  for (const key of [
    'title', 'titleJa', 'subtitle', 'subtitleJa',
    'stages', 'legend', 'charts', 'range', 'progressLabel', 'palette',
    'modelScope', 'modelControls', 'story', 'learning',
    'disclaimer', 'disclaimerJa', 'disclaimerShort', 'disclaimerShortJa',
  ]) {
    assert.ok(meta[key], `meta.${key} is present`);
  }

  assert.ok(meta.range.min < meta.range.max, 'the slider has a range');
  for (const entry of meta.legend) {
    assert.ok(meta.palette[entry.key], `the legend's "${entry.key}" has a colour`);
    assert.ok(entry.label && entry.labelJa, `and a name in both languages`);
  }
  assert.ok(meta.modelScope.limits.length >= 4, 'the scope panel says what the scene refuses');
  for (const source of meta.modelScope.sources) {
    assert.match(source, /^(docs|src)\//, `${source} is a path into this repository`);
  }
  // The disclaimer has to say the two things this model most needs it to.
  assert.match(meta.disclaimer, /reversible|no infarction/i, 'it says there is no infarction');
  assert.match(meta.disclaimer, /not minutes|episode progress/i, 'and that the axis is not a clock');
});

test('the scene is registered as alpha, with a model card', () => {
  const entry = SCENE_MANIFEST.find((s) => s.id === 'myocardial-ischemia');
  assert.ok(entry, 'the scene is in the catalogue');
  assert.equal(entry.status, 'alpha');
  assert.equal(entry.modelCard, 'docs/model-cards/myocardial-ischemia.md');
  assert.equal(entry.system, 'cardiovascular');
  assert.equal(entry.organ, 'heart');
  assert.ok(entry.titleJa && entry.descriptionJa, 'named and described in both languages');
});

test('every stage of the story has a span, and the last one runs', () => {
  // The bug this catches was in the first version: reperfusion began at 1,
  // which is the end, so the restored supply never ran for any of the episode.
  // The scene finished showing an artery that was open in the caption and shut
  // in every number.
  for (let i = 1; i < STAGES.length; i++) {
    assert.ok(STAGES[i].at > STAGES[i - 1].at, `stage ${STAGES[i].id} starts after the one before`);
  }
  assert.equal(STAGES[0].at, 0, 'the first stage starts at the start');
  assert.ok(STAGES[STAGES.length - 1].at < 1, 'and the last one starts before the end, so it runs');

  scene.setProgress(1);
  const end = scene.getState();
  const reperfusion = STAGES[STAGES.length - 1];
  assert.equal(reperfusion.supply, 1, 'the last stage is the one where flow returns');
  assert.ok(
    end.ladSupplyDemand > 1,
    `and by the end the supply really has returned: ${end.ladSupplyDemand.toFixed(2)}`
  );
});

test('the episode tells the story the stages claim it tells', () => {
  const readAt = (progress) => {
    scene.setProgress(progress);
    return scene.getState();
  };
  const rest = readAt(0);
  const early = readAt(0.3);
  const peak = readAt(0.78);
  const after = readAt(1);

  assert.ok(rest.ladBurden <= 0.02, 'nothing accumulated at rest');
  assert.ok(rest.ladWallMotion > 0.98, 'and the wall moves normally');

  // The debt is running up before the wall shows it, which is the whole point
  // of the second stage's caption.
  assert.ok(early.ladBurden > rest.ladBurden, 'the debt is building');
  assert.ok(early.ladWallMotion > peak.ladWallMotion, 'and the wall has not caught up with it yet');

  assert.ok(peak.ladBurden > 0.5, 'by the third stage the burden is unmistakable');
  assert.ok(peak.ladWallMotion < 0.85, 'and the wall has stopped keeping up');
  assert.ok(peak.ejectionFraction < rest.ejectionFraction, 'which costs the whole ventricle');

  // Reperfusion: flow back, wall not. If this ever inverted, the scene would be
  // teaching that flow and contraction are the same thing.
  assert.ok(after.ladSupplyDemand > peak.ladSupplyDemand, 'flow is restored');
  assert.ok(after.ladBurden < peak.ladBurden, 'and the debt is being repaid');
  assert.ok(
    after.ladWallMotion < 0.85,
    `while the wall is still hypokinetic: ${(after.ladWallMotion * 100).toFixed(0)}% of normal`
  );
});

test('the story panel gets a heading and a body at every point on the slider', () => {
  // `getCausalStory` renders blank if it returns the wrong shape, and blank is
  // not an error — the pulmonary oedema scene shipped that way.
  for (const progress of [0, 0.15, 0.3, 0.5, 0.78, 0.9, 1]) {
    scene.setProgress(progress);
    const story = scene.getCausalStory();
    assert.ok(story.heading && story.headingJa, `heading at ${progress}, in both languages`);
    assert.ok(story.body && story.bodyJa, `body at ${progress}, in both languages`);
    assert.ok(story.because?.text && story.because?.textJa, `and a because at ${progress}`);
  }
});

test('the metrics panel gets a finite number for every read-out', () => {
  for (const progress of [0, 0.5, 1]) {
    scene.setProgress(progress);
    const metrics = scene.getMetrics();
    assert.equal(metrics.length, METRICS.length);
    for (const metric of metrics) {
      assert.ok(metric.id && metric.label && metric.labelJa, `${metric.id} is named in both languages`);
      assert.notEqual(metric.value, '—', `${metric.id} has a value at progress ${progress}`);
      assert.ok(Number.isFinite(Number(metric.value)), `${metric.id} is a number, got "${metric.value}"`);
    }
  }
});

/**
 * The keys `components/ChartPanel.js` actually reads, from its own docblock.
 *
 * Listed here so that a key the panel ignores fails a test instead of being
 * drawn nowhere. That is not hypothetical: the first version of this chart
 * declared `label`, `xLabel` and `yLabel` in the spec and returned `domain` and
 * `marker` in the data, and every one of those five is invisible to the panel.
 * The result was a chart on an auto-scaled axis with no progress marker, and a
 * `TypeError` from `spec.x.invert` the moment it drew its axes — and the test
 * that was supposed to cover it asserted `chart.label`, a key nothing reads.
 * A test can only check a contract it has actually looked up.
 */
const CHART_SPEC_KEYS = new Set([
  'id',
  'title',
  'titleJa',
  'unitLabel',
  'x',
  'y',
  'key',
  'height',
]);
const CHART_DATA_KEYS = new Set(['x', 'y', 'series', 'bars', 'bands', 'rules', 'markers', 'note']);

test('the chart spec is the shape the panel reads', () => {
  for (const spec of CHARTS) {
    assert.ok(spec.title && spec.titleJa, `${spec.id} is titled in both languages`);
    for (const axis of ['x', 'y']) {
      assert.ok(spec[axis], `${spec.id} declares its ${axis} axis`);
      assert.ok(
        Number.isFinite(spec[axis].min) && Number.isFinite(spec[axis].max),
        `${spec.id}'s ${axis} axis is fixed, so the chart cannot rescale under the reader`
      );
    }
    for (const entry of spec.key ?? []) {
      assert.ok(entry.id && entry.label && entry.labelJa && entry.color, 'every key entry is complete');
    }
    for (const key of Object.keys(spec)) {
      assert.ok(CHART_SPEC_KEYS.has(key), `${spec.id} declares "${key}", which the panel does not read`);
    }
  }
});

test('the chart is keyed the way the panel looks it up, and its series are drawable', () => {
  // The failure this catches ran for nobody: a chart returned as an array when
  // the App reads an object keyed by the ids `meta.charts` declares.
  scene.setProgress(0.6);
  const charts = scene.getCharts();
  assert.ok(!Array.isArray(charts), 'charts are keyed by id, not a list');
  for (const declared of CHARTS) {
    const chart = charts[declared.id];
    assert.ok(chart, `the panel's id "${declared.id}" is present`);
    for (const key of Object.keys(chart)) {
      assert.ok(CHART_DATA_KEYS.has(key), `the frame sends "${key}", which the panel does not read`);
    }
    // `dash` on a rule is the pattern the panel hands to `setLineDash`, not a
    // flag. `dash: true` throws, and the docblock said `dash?` without saying
    // of what.
    for (const rule of chart.rules ?? []) {
      assert.ok(
        rule.dash === undefined || (Array.isArray(rule.dash) && rule.dash.every(Number.isFinite)),
        'a rule dashes with a pattern, not a boolean'
      );
      assert.ok(rule.axis === 'x' || rule.axis === 'y', 'and names an axis');
    }
    assert.ok(chart.markers?.length === 1, 'the reader can see where on the episode they are');
    assert.ok(
      Number.isFinite(chart.markers[0].x) && Number.isFinite(chart.markers[0].y),
      'and the marker is somewhere drawable'
    );
    assert.ok(Array.isArray(chart.series) && chart.series.length === TERRITORIES.length);
    for (const series of chart.series) {
      assert.ok(series.points.length > 10, `${series.id} has points to draw`);
      for (const point of series.points) {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${series.id} has finite points`);
        assert.ok(point.y >= 0 && point.y <= 1, `${series.id} stays inside the declared domain`);
      }
    }
  }

  // The anterior descending's curve is the one that moves; the others are flat.
  const chart = charts[CHARTS[0].id];
  const spread = (id) => {
    const ys = chart.series.find((s) => s.id === id).points.map((p) => p.y);
    return Math.max(...ys) - Math.min(...ys);
  };
  assert.ok(spread('lad') > 0.3, 'the anterior descending accumulates');
  assert.ok(spread('rca') < 0.05, 'and the right coronary does not');
});

test('every learning module matches the panel it is rendered by', () => {
  // The shape the LearningPanel requires. The pulmonary oedema scene's modules
  // threw a TypeError on the first click because this was never checked.
  const modules = scene.getLearningModules();
  assert.ok(modules.length >= 2, 'there are modules');
  for (const module of modules) {
    assert.ok(module.id && module.title && module.titleJa, `${module.id} is titled in both languages`);
    assert.ok(module.question?.text && module.question?.textJa, `${module.id} asks a question`);
    assert.ok(Array.isArray(module.question.options), `${module.id} has options`);
    assert.ok(module.question.options.length >= 3, `${module.id} has enough options to be a question`);
    for (const option of module.question.options) {
      assert.ok(option.id && option.text && option.textJa, `${module.id}: every option is bilingual`);
    }
    assert.ok(
      module.question.options.some((option) => option.id === module.question.answer),
      `${module.id}: the answer is one of the options`
    );
    assert.equal(typeof module.setup, 'string', `${module.id}: setup is flat text`);
    assert.ok(module.manipulation?.control, `${module.id}: the manipulation names a control`);
    assert.ok(Number.isFinite(module.manipulation.to), `${module.id}: and a value to move it to`);
    assert.ok(module.observation && module.explanation, `${module.id}: says what to see and why`);
  }
});

test('the model controls round-trip, and reset really resets', () => {
  const controls = scene.getModelControls();
  assert.ok(controls.length >= 2);
  for (const control of controls) {
    assert.ok(control.id && control.label && control.labelJa);
    assert.ok(control.min < control.max, `${control.id} has a real range`);
    assert.ok(control.value >= control.min && control.value <= control.max, `${control.id} starts in range`);
  }

  scene.setProgress(0.78);
  const before = scene.getState().ladBurden;
  scene.setModelControl('supply', 1);
  assert.ok(scene.getState().ladBurden < before, 'opening the artery reduces the burden accrued');
  scene.resetModelControls();
  assert.ok(
    Math.abs(scene.getState().ladBurden - before) < 1e-9,
    'and resetting puts it back exactly'
  );
});

test('the annotations point at things, in both languages', () => {
  const annotations = scene.getAnnotations();
  assert.ok(annotations.length >= 2);
  for (const annotation of annotations) {
    assert.ok(annotation.id && annotation.text && annotation.sub, `${annotation.id} is bilingual`);
    assert.ok(annotation.position, `${annotation.id} has somewhere to point`);
    assert.ok(Array.isArray(annotation.range), `${annotation.id} says when it applies`);
  }
});

test('the scope panel says what the scene refuses, not only what it answers', () => {
  const scope = scene.getScope();
  assert.ok(scope.answers.length >= 3, 'it says what it is for');
  assert.ok(scope.refuses.length >= 4, 'and what it is not for');
  for (const entry of [...scope.answers, ...scope.refuses]) {
    assert.ok(entry.en && entry.ja, 'every line is bilingual');
  }
  // The two refusals a reader is most likely to need.
  const refusals = scope.refuses.map((entry) => entry.en).join(' ');
  assert.match(refusals, /heart attack|infarct/i, 'it refuses to say whether this is a heart attack');
  assert.match(refusals, /minutes|how long/i, 'and refuses to put a clock on it');
  assert.deepEqual(scope, SCOPE, 'and it is the scope the data file declares');
});

test('the scene disposes without leaving its geometry behind', () => {
  const fresh = new MyocardialIschemiaScene({});
  fresh.build();
  fresh.setProgress(0.5);
  fresh.update(0.016);
  fresh.dispose();
  assert.equal(fresh.root.children.length, 0, 'the group is emptied');
});

test('the arteries stay on the wall through the beat, not only where they were built', () => {
  // The vessels are built once, on the end-diastolic epicardium. Left there,
  // they do not move while the ventricle contracts away from underneath them:
  // measured this way, the anterior descending's furthest sample went from 0.34
  // scene units off the wall at end diastole to 0.64 at mid-systole, at the
  // apex — and in a render the two descending arteries left the silhouette and
  // hung in space below the heart. Nothing in the suite saw it, because every
  // clearance test measured the moment the vessels were built.
  //
  // Distance is to the nearest vertex of the mesh that is actually drawn, which
  // overstates the gap by up to half the row spacing. That is why this is a
  // comparison against end diastole rather than an absolute bound: the same
  // overstatement is in both numbers.
  const beating = new MyocardialIschemiaScene({});
  beating.build();
  const position = beating.geometry.attributes.position;

  const furthestFromWall = () => {
    const worst = new Map();
    for (const branch of beating.coronaries.branches) {
      if (!branch.where.length) continue;
      const offset = branch.points.length - branch.where.length;
      let far = 0;
      for (let i = 0; i < branch.where.length; i++) {
        const p = branch.points[offset + i];
        let near = Infinity;
        for (let v = 0; v < position.count; v++) {
          const dx = position.getX(v) - p.x;
          const dy = position.getY(v) - p.y;
          const dz = position.getZ(v) - p.z;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < near) near = d;
        }
        far = Math.max(far, Math.sqrt(near));
      }
      worst.set(branch.id, far);
    }
    return worst;
  };

  beating.setProgress(0.05);
  beating.phase = 0.999; // end diastole: the wall the vessels were laid on
  beating.applyModelToScene();
  const atRest = furthestFromWall();

  for (const [progress, phase] of [
    [0.05, 0.3],
    [0.62, 0.3],
    [0.62, 0.5],
    [0.93, 0.3],
  ]) {
    beating.setProgress(progress);
    beating.phase = phase;
    beating.applyModelToScene();
    for (const [id, far] of furthestFromWall()) {
      assert.ok(
        far <= atRest.get(id) * 1.15,
        `${id} stays on the wall at progress ${progress}, phase ${phase}: ` +
          `${far.toFixed(2)} against ${atRest.get(id).toFixed(2)} at end diastole`
      );
    }
  }
});
