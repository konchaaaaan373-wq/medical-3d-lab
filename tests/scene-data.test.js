import test from 'node:test';
import assert from 'node:assert/strict';
import * as amyloid from '../src/data/amyloidBeta.js';
import * as heartFailure from '../src/data/heartFailure.js';

const SCENES = [
  ['amyloid-beta', amyloid],
  ['heart-failure', heartFailure],
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
  for (const [id, data] of SCENES) {
    for (const annotation of data.ANNOTATIONS) {
      assert.ok(annotation.text && annotation.sub, `${id}: annotation ${annotation.id} missing a language`);
      const [from, to] = annotation.range;
      assert.ok(from >= 0 && to <= 1 && from < to, `${id}: bad range on ${annotation.id}`);
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

test('the amyloid scene states that species coexist and that it is not a clinical stage', () => {
  assert.match(amyloid.DISCLAIMER, /coexist/i);
  assert.match(amyloid.DISCLAIMER, /not represent clinical disease stages/i);
  assert.match(amyloid.DISCLAIMER_JA, /共存/);
});
