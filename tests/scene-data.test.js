import test from 'node:test';
import assert from 'node:assert/strict';
import * as amyloid from '../src/data/amyloidBeta.js';
import * as heartFailure from '../src/data/heartFailure.js';
import * as copd from '../src/data/copd.js';
import * as asthma from '../src/data/asthma.js';
import * as portalHypertension from '../src/data/portalHypertension.js';
import * as hepatorenal from '../src/data/hepatorenal.js';
import { HeartFailureScene } from '../src/scenes/cardiovascular/scenes/heartFailure/HeartFailureScene.js';
import { sampleHemodynamics } from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';

const SCENES = [
  ['amyloid-beta', amyloid],
  ['heart-failure', heartFailure],
];

/**
 * Every scene that puts labels on the 3D, including the model-backed ones.
 *
 * The legend and stage tables above still differ in shape between the two
 * original scenes and the later ones, so those tests are not extended here.
 * The **annotation** contract does not differ: `LabelLayer` reads `text`,
 * `sub` and `range` from every one of them, and a scene that declares an
 * annotation any other way throws on the first frame rather than degrading.
 * That is worth checking everywhere.
 */
const ANNOTATED = [
  ['amyloid-beta', amyloid],
  ['heart-failure', heartFailure],
  ['copd', copd],
  ['asthma', asthma],
  ['portal-hypertension', portalHypertension],
  ['hepatorenal-syndrome', hepatorenal],
];

test('stage tables are well formed', () => {
  for (const [id, data] of SCENES) {
    assert.ok(data.STAGES.length >= 2, `${id} needs stages`);
    assert.equal(data.STAGES[0].at, 0, `${id} must start at 0`);
    let previous = -1;
    const ids = new Set();
    for (const stage of data.STAGES) {
      assert.ok(stage.at > previous, `${id}: stage boundaries must increase`);
      assert.ok(stage.at >= 0 && stage.at < 1, `${id}: stage boundary out of range`);
      assert.ok(!ids.has(stage.id), `${id}: duplicate stage id ${stage.id}`);
      ids.add(stage.id);
      for (const key of ['name', 'nameJa', 'summary', 'summaryJa']) {
        assert.ok(stage[key]?.length > 0, `${id}: stage ${stage.id} missing ${key}`);
      }
      previous = stage.at;
    }
  }
});

test('legend entries reference real palette colours and sane thresholds', () => {
  for (const [id, data] of SCENES) {
    for (const entry of data.LEGEND) {
      assert.ok(data.PALETTE[entry.key], `${id}: legend key ${entry.key} has no colour`);
      assert.ok(entry.label && entry.labelJa, `${id}: legend entry ${entry.key} missing a label`);
      assert.ok(
        entry.activeFrom >= 0 && entry.activeFrom <= 1,
        `${id}: legend activeFrom out of range for ${entry.key}`
      );
    }
  }
});

test('annotations are bilingual and their visibility windows are valid', () => {
  // Every scene that draws labels, because this is the shape `LabelLayer`
  // destructures on the first frame: a scene that declares an annotation any
  // other way fails at run time and passes every unit test that only looks at
  // its own data module.
  for (const [id, data] of ANNOTATED) {
    assert.ok(data.ANNOTATIONS?.length, `${id} declares no annotations`);
    for (const annotation of data.ANNOTATIONS) {
      assert.ok(annotation.id, `${id}: an annotation has no id`);
      assert.ok(annotation.text && annotation.sub, `${id}: annotation ${annotation.id} missing a language`);
      assert.ok(Array.isArray(annotation.range), `${id}: annotation ${annotation.id} has no range`);
      const [from, to] = annotation.range;
      assert.ok(from >= 0 && to <= 1 && from < to, `${id}: bad range on ${annotation.id}`);
      assert.ok(annotation.anchor, `${id}: annotation ${annotation.id} names no anchor`);
    }
  }
});

test('the slider is never presented as a clinical severity scale', () => {
  // These scenes model a physical process, not a patient's disease severity.
  const forbidden = [/disease progression/i, /severity/i, /clinical stage/i, /重症度/, /病期/];
  for (const [id, data] of SCENES) {
    const chrome = [
      data.RANGE.start,
      data.RANGE.startJa,
      data.RANGE.end,
      data.RANGE.endJa,
      data.PROGRESS_LABEL.label,
      data.PROGRESS_LABEL.labelJa,
    ].join(' | ');
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(chrome), `${id}: slider chrome reads as severity (${pattern})`);
    }
  }
});

test('both scenes carry a visible educational disclaimer in both languages', () => {
  for (const [id, data] of SCENES) {
    assert.ok(data.DISCLAIMER.length > 40, `${id}: English disclaimer too thin`);
    assert.ok(data.DISCLAIMER_JA.length > 20, `${id}: Japanese disclaimer too thin`);
    assert.match(data.DISCLAIMER, /simplified|educational/i);
    assert.match(data.DISCLAIMER_JA, /教育|模式|簡易/);
  }
});

test('the heart-failure scene states that it shows one HFrEF pattern', () => {
  assert.match(heartFailure.DISCLAIMER, /HFrEF/);
  assert.match(heartFailure.DISCLAIMER, /Not all heart failure/i);
  assert.match(heartFailure.DISCLAIMER_JA, /すべての心不全/);
  // And it must not present particle motion as a physical simulation.
  assert.match(heartFailure.DISCLAIMER, /not a fluid-dynamics simulation/i);
});

test('heart-failure terminology matches between languages', () => {
  const byId = Object.fromEntries(heartFailure.STAGES.map((s) => [s.id, s]));
  // "リモデリング" is the Japanese for remodeling, which in the echo
  // classification means increased RWT with *normal* mass. This model adds
  // mass, so the concentric stage must not carry that word in either language.
  const concentric = byId['concentric-hypertrophy'];
  assert.ok(concentric, 'the concentric stage should be identified as hypertrophy');
  assert.match(concentric.name, /hypertrophy/i);
  assert.match(concentric.nameJa, /肥大/);
  assert.doesNotMatch(concentric.name, /remodel/i);
  assert.doesNotMatch(concentric.nameJa, /リモデリング/);
  // HFrEF must be labelled as such in both languages.
  assert.match(byId['systolic-dysfunction'].name, /HFrEF/);
  assert.match(byId['systolic-dysfunction'].nameJa, /HFrEF/);
  // The slider's far end stays on the structural axis, not on congestion.
  assert.doesNotMatch(heartFailure.RANGE.end, /congestion/i);
  assert.doesNotMatch(heartFailure.RANGE.endJa, /うっ血/);
});

test('the amyloid scene states that species coexist and that it is not a clinical stage', () => {
  assert.match(amyloid.DISCLAIMER, /coexist/i);
  assert.match(amyloid.DISCLAIMER, /not represent clinical disease stages/i);
  assert.match(amyloid.DISCLAIMER_JA, /共存/);
});

test('the read-out reports what the model solved, at the precision it supports', () => {
  const scene = new HeartFailureScene({ viewer: {} });
  scene.setProgress(0.85);
  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));

  // Every pressure the panel shows must be a solved one, in real units.
  for (const id of ['lvedp', 'pvp', 'bp']) {
    assert.equal(rows[id].unit, 'mmHg', `${id} should be reported in mmHg`);
  }
  const state = sampleHemodynamics(0.85);
  assert.equal(rows.lvedp.value, Math.round(state.endDiastolicPressureMmHg));
  assert.equal(rows.pvp.value, Math.round(state.meanPulmonaryVenousPressureMmHg));
  assert.equal(rows.ef.value, Math.round(state.ejectionFraction * 100));

  // Whole units for volumes and pressures, one decimal at most elsewhere: the
  // chamber is a truncated-ellipsoid approximation driven by a lumped
  // circulation, and more digits would imply accuracy it does not have.
  for (const row of Object.values(rows)) {
    const decimals = String(row.value).split('.')[1];
    assert.ok(!decimals || decimals.length <= 1, `${row.id} shows more precision than the model supports`);
  }

  // Model-derived myocardial volume and mass are internal. They belong to this
  // ellipsoid approximation, not to an echocardiographic measurement, so they
  // must never appear as a figure a viewer could read as a clinical LV mass.
  const text = JSON.stringify(scene.getMetrics()).toLowerCase();
  assert.ok(!/\bmass\b|\bg\/m|質量|心筋重量/.test(text), 'LV mass must not reach the UI');
});

test('the loading sliders are inputs to the model, not overrides of its output', () => {
  const scene = new HeartFailureScene({ viewer: {} });
  scene.setProgress(0.42);
  const before = scene.getMetrics().find((row) => row.id === 'sv').value;

  scene.setModelControl('preload', 1.1);
  const after = scene.getMetrics().find((row) => row.id === 'sv').value;
  // The read-out has to move, and move the way the circulation says it should.
  assert.ok(after > before, 'raising preload should raise the reported stroke volume');
  assert.equal(after, Math.round(sampleHemodynamics(0.42, { preload: 1.1 }).strokeVolumeMl));

  scene.resetModelControls();
  assert.equal(scene.getMetrics().find((row) => row.id === 'sv').value, before);
  assert.deepEqual(
    scene.getModelControls().map((control) => control.value),
    [1, 1]
  );
});
