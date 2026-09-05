import test from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from 'three';

import { MyocardialIschemiaScene } from '../src/scenes/cardiovascular/scenes/myocardialIschemia/MyocardialIschemiaScene.js';
import { STAGES, METRICS, CHARTS, SCOPE, TERRITORY_COLORS, WALL_COLORS } from '../src/data/myocardialIschemia.js';
import { TERRITORIES } from '../src/models/coronaryTerritories.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { AHA_SEGMENTS } from '../src/scenes/cardiovascular/organs/coronaryAnatomy.js';

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

test('the three territories the legend names are three colours on the model', () => {
  // The legend carries a swatch for each of the three territories. If a reader
  // cannot find those three regions on the heart, the legend describes a map
  // that is not drawn — and for a scene whose whole claim is *where* the
  // starved muscle is, that is the claim failing, not a cosmetic miss. It
  // shipped that way: 16% of the territory's own hue over unsharpened weights,
  // and on the rendered frame the six pairs separated by 0.034-0.053 against a
  // lighting floor of 0.0447. Signal under noise, both aspects.
  //
  // **This is a necessary condition, not the criterion.** The criterion is a
  // property of the render, and the render is not available to `node --test`.
  // Measured across four settings, the rendered separation is 0.455-0.517x the
  // vertex-buffer separation asserted here — not a constant, because sharpening
  // the map changes the ratio as well as the magnitude. So a vertex threshold
  // can only be set at the *optimistic* end of that range: 0.0447 / 0.517 =
  // 0.086. Clearing it does not prove the render clears its floor; failing it
  // proves the render cannot. It catches the tint (0.16 and 0.22 both fail);
  // it does *not* catch dropping the sharpening, which passes here at 0.089 and
  // fails the render at 0.041. That one is held by the next test and by the
  // render measurement recorded in `docs/anatomy-review.md` §5.10.
  const painted = new MyocardialIschemiaScene({});
  painted.build();
  painted.setProgress(0.02); // at rest: nothing ischemic, the map at its most legible
  painted.phase = 0.999;
  painted.applyModelToScene();

  const color = painted.geometry.attributes.color;
  const chroma = (r, g, b) => { const s2 = r + g + b || 1; return [r / s2, g / s2]; };
  const samples = { lad: [], rca: [], lcx: [] };
  for (let v = 0; v < color.count; v++) {
    const base = v * TERRITORIES.length;
    const w = TERRITORIES.map((_, i) => painted.vertexTerritory[base + i]);
    const best = w.indexOf(Math.max(...w));
    if (w[best] < 0.7) continue;
    samples[TERRITORIES[best]].push(chroma(color.getX(v), color.getY(v), color.getZ(v)));
  }

  const med = (xs) => { const a = [...xs].sort((p, q) => p - q); return a[(a.length - 1) >> 1]; };
  const centre = {};
  for (const t of TERRITORIES) {
    assert.ok(samples[t].length > 20, `${t} covers enough of the wall to be a region at all`);
    centre[t] = [med(samples[t].map((q) => q[0])), med(samples[t].map((q) => q[1]))];
  }

  const NECESSARY = 0.086;
  for (const [a, b] of [['lad', 'rca'], ['lad', 'lcx'], ['rca', 'lcx']]) {
    const sep = Math.hypot(centre[a][0] - centre[b][0], centre[a][1] - centre[b][1]);
    assert.ok(
      sep > NECESSARY,
      `${a} and ${b} are different colours on the wall: ${sep.toFixed(4)}, and below ` +
        `${NECESSARY} the render cannot clear its lighting floor`
    );
  }

  // And each region is painted its *own* legend colour rather than merely some
  // other colour — a swapped swatch separates just as well and means the map
  // points at the wrong artery.
  //
  // Compared as a *direction*, not a position. At rest every vertex starts from
  // the same supplied-wall colour and the tint is only a quarter of the mix, so
  // all three regions still sit nearest the reddest swatch; the question is
  // which way each one was pushed, which is what the reader's eye picks up
  // against the surrounding wall.
  const supplied = new THREE.Color(WALL_COLORS.supplied);
  const linear = { lad: [], rca: [], lcx: [] };
  for (let v = 0; v < color.count; v++) {
    const b2 = v * TERRITORIES.length;
    const w = TERRITORIES.map((_, i) => painted.vertexTerritory[b2 + i]);
    const best = w.indexOf(Math.max(...w));
    if (w[best] < 0.7) continue;
    linear[TERRITORIES[best]].push([color.getX(v), color.getY(v), color.getZ(v)]);
  }
  const unit = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
  const dot = (a, b) => a.reduce((s2, x, i) => s2 + x * b[i], 0);
  for (const t of TERRITORIES) {
    const mean = [0, 1, 2].map((k) => linear[t].reduce((s2, c) => s2 + c[k], 0) / linear[t].length);
    const shift = unit([mean[0] - supplied.r, mean[1] - supplied.g, mean[2] - supplied.b]);
    const towards = (id) => {
      const sw = new THREE.Color(TERRITORY_COLORS[id]);
      return dot(shift, unit([sw.r - supplied.r, sw.g - supplied.g, sw.b - supplied.b]));
    };
    for (const other of TERRITORIES) {
      if (other === t) continue;
      assert.ok(
        towards(t) > towards(other),
        `the ${t} region is pushed towards the ${t} swatch (${towards(t).toFixed(3)}) ` +
          `more than the ${other} one (${towards(other).toFixed(3)})`
      );
    }
  }
});

test('the map is drawn with an edge the model does not claim', () => {
  // `territoryWeightsAt` is deliberately smooth: a coronary watershed is not a
  // line, and the model refuses to draw one. A map painted straight from those
  // weights has no edge anywhere, and most of what looked like "lighting
  // scatter inside a territory" was its neighbours bleeding in. So the drawing
  // sharpens a copy.
  //
  // This is the test that catches the sharpening being dropped, which the
  // previous one cannot: at MAP_EDGE 1 the vertex separation is 0.089 — over
  // that test's threshold — while the rendered separation is 0.041, under the
  // 0.0447 floor.
  const painted = new MyocardialIschemiaScene({});
  painted.build();
  painted.setProgress(0.02);
  painted.phase = 0.999;
  painted.applyModelToScene();

  const color = painted.geometry.attributes.color;
  const tints = TERRITORIES.map((t) => new THREE.Color(TERRITORY_COLORS[t]));

  // The most mixed vertex that still has an owner is where an edge either
  // exists or does not.
  let mixed = -1;
  let lowest = Infinity;
  for (let v = 0; v < color.count; v++) {
    const base = v * TERRITORIES.length;
    const w = TERRITORIES.map((_, i) => painted.vertexTerritory[base + i]);
    const top = Math.max(...w);
    if (top < 0.55 || top > 0.75) continue;
    if (top < lowest) { lowest = top; mixed = v; }
  }
  assert.ok(mixed >= 0, 'the map has boundary vertices to check');

  const base = mixed * TERRITORIES.length;
  const w = TERRITORIES.map((_, i) => painted.vertexTerritory[base + i]);
  const owner = w.indexOf(Math.max(...w));

  // Compared as directions away from the shared supplied-wall colour, so the
  // two things being compared live in the same space. The first version of this
  // test compared the *final* colour against the *tint blend* — a final colour
  // is three quarters supplied wall, a tint blend is none of it — and passed at
  // every setting, including the one it was written to reject.
  const supplied = new THREE.Color(WALL_COLORS.supplied);
  const from = (c) => [c[0] - supplied.r, c[1] - supplied.g, c[2] - supplied.b];
  const unit = (v) => { const n = Math.hypot(...v) || 1; return v.map((x) => x / n); };
  const dot = (a, b) => a.reduce((s2, x, i) => s2 + x * b[i], 0);

  const tint = (i) => { const c = tints[i]; return [c.r, c.g, c.b]; };
  const smooth = [0, 1, 2].map((k) => w.reduce((s2, wi, i) => s2 + wi * tint(i)[k], 0));
  const drawn = [color.getX(mixed), color.getY(mixed), color.getZ(mixed)];

  const ownWay = unit(from(tint(owner)));
  const sharpened = dot(unit(from(drawn)), ownWay);
  const unsharpened = dot(unit(from(smooth)), ownWay);
  assert.ok(
    sharpened > unsharpened,
    `a boundary vertex (owner weight ${lowest.toFixed(2)}) is pushed further towards its own ` +
      `territory than the model's smooth weights would push it: ${sharpened.toFixed(4)} against ${unsharpened.toFixed(4)}`
  );
});

test('sharpening the map does not touch what the model solved', () => {
  // MAP_EDGE sharpens a *copy* of the weights, for drawing. Burden and wall
  // motion read the weights as the model produced them, because those are
  // physics and a coronary watershed is not a line. If the sharpening ever
  // leaks into them, the ventricle's contraction is being scaled by a
  // presentation constant.
  const a = new MyocardialIschemiaScene({});
  a.build();
  a.setProgress(0.62);
  const before = {
    ef: a.getState().ejectionFraction,
    wall: a.getState().ladWallMotion,
    burden: a.getState().ladBurden,
  };
  // The mass weighting the solver uses comes from the segment table, not from
  // anything the map does with the per-vertex weights.
  assert.deepEqual(
    Object.keys(a.massFraction).sort(),
    [...TERRITORIES].sort(),
    'the solver weights territories, not vertices'
  );
  const sum = TERRITORIES.reduce((s, t) => s + a.massFraction[t], 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `mass fractions sum to 1: ${sum}`);
  a.applyModelToScene();
  assert.equal(a.getState().ejectionFraction, before.ef, 'drawing does not move the ejection fraction');
  assert.equal(a.getState().ladWallMotion, before.wall, 'nor the wall motion');
  assert.equal(a.getState().ladBurden, before.burden, 'nor the burden');
});

test('the territory boundary is actually injected into the shader three.js will compile', () => {
  // The boundary between two territories is drawn in the fragment shader,
  // because the mesh is 48 columns around and one vertex of boundary lands as a
  // 25 px band rather than a line. Shader injection has one failure mode and it
  // is silent: `onBeforeCompile` string-replaces `#include <color_fragment>`,
  // and if a future three.js renames or reorders that chunk the replace matches
  // nothing, the material compiles perfectly, and the map simply has no
  // boundaries. Nothing else in the suite would notice.
  //
  // So this runs the hook against three's *real* shader source — available in
  // node, no GL context needed — and checks the injection took.
  const scene2 = new MyocardialIschemiaScene({});
  scene2.build();

  assert.ok(
    scene2.geometry.attributes.territory,
    'the weights the boundary is derived from reach the shader as an attribute'
  );
  assert.equal(scene2.geometry.attributes.territory.itemSize, TERRITORIES.length);
  assert.equal(typeof scene2.material.onBeforeCompile, 'function', 'the hook is installed');

  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  };
  scene2.material.onBeforeCompile(shader);

  assert.match(shader.vertexShader, /attribute vec3 territory;/, 'the attribute is declared');
  assert.match(shader.vertexShader, /vTerritory = territory;/, 'and passed to the fragment stage');
  assert.match(shader.fragmentShader, /varying vec3 vTerritory;/, 'which receives it');
  assert.match(shader.fragmentShader, /diffuseColor\.rgb \*= mix\(1\.0, boundaryDarken, onLine\);/,
    'and darkens the wall on the watershed');
  assert.ok(shader.uniforms.boundaryWidth?.value > 0, 'the line has a width');
  assert.ok(
    shader.uniforms.boundaryDarken?.value > 0 && shader.uniforms.boundaryDarken.value < 1,
    'and darkens rather than blacks out or does nothing'
  );

  // The injection has to land *after* the vertex colours are applied, or the
  // territory fill overwrites the line.
  //
  // Against the *multiply*, not against `vColor`. Written as
  // `indexOf('onLine') > indexOf('vColor')` this passed either way, because the
  // first `vColor` in the shader is its varying declaration at the top — so the
  // test read as a position check and measured nothing. Moving the injection to
  // `<normal_fragment_begin>`, which really does draw the line under the fill,
  // failed nothing.
  //
  // Ordering is checked on the *resolved* shader, in the order three builds it:
  // the hook runs against source that still has `#include` directives in it,
  // and the chunks are expanded afterwards. Checked against the unresolved
  // source, `diffuseColor.rgb *= vColor;` is not there at all yet.
  const resolve = (source) => {
    let out = source;
    for (let pass = 0; pass < 4; pass++) {
      out = out.replace(/#include <(\w+)>/g, (whole, name) => THREE.ShaderChunk[name] ?? whole);
    }
    return out;
  };
  const resolved = resolve(shader.fragmentShader);
  // The *last* application of the fill, not the first. Injecting at
  // `<map_fragment>` re-emits `<color_fragment>` before the line and leaves the
  // original one after it, so the fill is applied twice and paints over the
  // line — and against `indexOf` that read as correctly ordered.
  const multiply = resolved.lastIndexOf('diffuseColor.rgb *= vColor;');
  assert.ok(multiply > 0, 'the vertex colours are applied somewhere');
  assert.ok(
    resolved.lastIndexOf('onLine') > multiply,
    'the line is drawn over the fill, not under it'
  );
});

test('the bullseye shows all seventeen segments, in the anatomy’s own angles', () => {
  // Why the panel exists: on the 3D heart the territory map cannot be seen at
  // once — 73% of the wall facing the opening camera is one artery's, and the
  // other two territories are round the back. A reader who does not rotate sees
  // one region and no map. The short axis flattened is the one projection where
  // all seventeen segments and all three territories are visible together, and
  // it is how the question is asked clinically.
  const spec = MyocardialIschemiaScene.meta.bullseye;
  assert.ok(spec, 'the scene declares one');

  const drawn = spec.rings.flatMap((ring) => ring.segments);
  assert.equal(drawn.length, AHA_SEGMENTS.length, 'every segment is drawn');
  assert.equal(spec.rings.length, 4, 'basal, mid, apical, apex');

  // Derived from the segment table, not listed again: a plot that carried its
  // own copy could put a segment in a territory the anatomy does not.
  for (const segment of AHA_SEGMENTS) {
    const wedge = drawn.find((w) => w.id === segment.id);
    assert.ok(wedge, `segment ${segment.number} is on the plot`);
    assert.equal(wedge.territory, segment.territory, `segment ${segment.number}'s artery`);
    assert.equal(wedge.phi, segment.phi, `segment ${segment.number} sits at the anatomy's angle`);
  }

  // Each ring's wedges tile the circle exactly: no gap, no overlap.
  for (const ring of spec.rings) {
    const total = ring.segments.reduce((sum, s) => sum + s.span, 0);
    assert.ok(
      Math.abs(total - Math.PI * 2) < 1e-9,
      `the ${ring.level} ring closes: ${total} radians over ${ring.segments.length} segments`
    );
  }

  // The convention that falls out of using the anatomy's own azimuth: the plot
  // is `(sin φ, −cos φ)` where the ventricle is `(sin φ, ·, cos φ)`, which puts
  // anterior at twelve o'clock, the septum at nine and the lateral wall at
  // three — the heart seen from the apex.
  const wallAt = (wall) => drawn.find((w) => AHA_SEGMENTS.find((s) => s.id === w.id)?.wall === wall);
  assert.ok(Math.abs(Math.sin(wallAt('anterior').phi)) < 1e-9, 'anterior is at the top');
  assert.ok(Math.cos(wallAt('anterior').phi) > 0.99, 'and not the bottom');
  assert.ok(Math.cos(wallAt('inferior').phi) < -0.99, 'inferior is at the bottom');
  assert.ok(Math.sin(wallAt('anterolateral').phi) > 0, 'the lateral wall is on the patient’s left');
  assert.ok(Math.sin(wallAt('anteroseptal').phi) < 0, 'and the septum on their right');
});

test('every segment on the bullseye carries its own territory’s burden', () => {
  // The model does not resolve finer than a territory. A plot that varied
  // segment by segment would be claiming a resolution nothing solved.
  const scene2 = new MyocardialIschemiaScene({});
  scene2.build();
  scene2.setProgress(0.62);

  const spec = MyocardialIschemiaScene.meta.bullseye;
  const frame = scene2.getBullseye()[spec.id];
  assert.ok(frame?.burden, 'the frame carries burden by segment');
  assert.equal(Object.keys(frame.burden).length, AHA_SEGMENTS.length);

  for (const segment of AHA_SEGMENTS) {
    assert.equal(
      frame.burden[segment.id],
      scene2.myocardialState.ischemicBurden[segment.territory],
      `segment ${segment.number} reads the ${segment.territory}'s burden`
    );
  }

  // And the claim the panel is there to make: at a lesion in one artery, that
  // artery's segments carry burden and the others carry none.
  const laden = AHA_SEGMENTS.filter((s) => frame.burden[s.id] > 0.2).map((s) => s.territory);
  assert.ok(laden.length > 0, 'something is ischemic at all');
  assert.deepEqual([...new Set(laden)], ['lad'], 'and only the anterior descending’s segments are');
});

test('the bullseye is a panel the shell can drive like any other', () => {
  // App pushes it into the same list as the charts and then updates, resizes
  // and focuses everything in that list without knowing what any of it is.
  const spec = MyocardialIschemiaScene.meta.bullseye;
  assert.ok(spec.id && spec.title && spec.titleJa, 'it is identified and titled in both languages');
  assert.ok(spec.caption && spec.captionJa, 'and captioned in both');
  for (const key of ['anterior', 'septal', 'inferior', 'lateral']) {
    assert.ok(spec.orientation[key] && spec.orientation[`${key}Ja`], `${key} is labelled in both`);
  }
  for (const territory of TERRITORIES) {
    assert.match(spec.colors[territory], /^#[0-9a-f]{6}$/i, `${territory} has a colour to fill with`);
  }
  assert.match(spec.ischemic, /^#[0-9a-f]{6}$/i, 'and there is a colour to fade toward');
});
