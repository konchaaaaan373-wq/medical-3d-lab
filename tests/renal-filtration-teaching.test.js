import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { LEARNING, METRICS, SCOPE, SITUATIONS, situation } from '../src/data/renalFiltration.js';
import { PRESET_CONTROLS, PRESET_IDS, getState, presetState } from '../src/models/renalFiltration.js';

const card = readFileSync(new URL('../docs/model-cards/renal-filtration.md', import.meta.url), 'utf8');
const dossier = readFileSync(new URL('../docs/model-evidence/renal-filtration.md', import.meta.url), 'utf8');

test('teaching: the stored answer is re-derived from the model, not trusted', () => {
  // The project's rule: a saved answer is checked by CI against the model that
  // is supposed to produce it, so a lesson cannot outlive its physiology.
  const { from, to, expect } = LEARNING.assertion;
  const before = presetState(from);
  const after = presetState(to);

  for (const [key, direction] of Object.entries(expect)) {
    if (direction === 'rises') assert.ok(after[key] > before[key], `${key} should rise: ${before[key]} -> ${after[key]}`);
    else assert.ok(after[key] < before[key], `${key} should fall: ${before[key]} -> ${after[key]}`);
  }

  // And the option the lesson stores as correct is the one that describes it.
  const derived =
    after.renalBloodFlowMlPerMin > before.renalBloodFlowMlPerMin && after.gfrMlPerMin < before.gfrMlPerMin
      ? 'flow-up-gfr-down'
      : 'something-else';
  assert.equal(LEARNING.answer, derived);
});

test('teaching: the answer is one of the options offered', () => {
  assert.ok(LEARNING.options.some((option) => option.id === LEARNING.answer));
  for (const option of LEARNING.options) {
    assert.ok(option.labelJa && option.labelEn, `${option.id} needs a label in both languages`);
  }
  assert.ok(LEARNING.options.length >= 3, 'a two-option question is a coin toss');
});

test('teaching: every distractor is a real answer to a different question', () => {
  // "Both fall" is what afferent constriction does; "both rise" is what a
  // higher perfusion pressure does. A distractor nothing produces teaches
  // nothing when it is eliminated.
  const base = getState(PRESET_CONTROLS.prerenal);
  const afferent = getState({ ...PRESET_CONTROLS.prerenal, afferentToneMultiplier: 1.4 });
  assert.ok(afferent.renalBloodFlowMlPerMin < base.renalBloodFlowMlPerMin);
  assert.ok(afferent.gfrMlPerMin < base.gfrMlPerMin, '"both fall" is afferent constriction');

  const perfused = getState({ ...PRESET_CONTROLS.prerenal, meanArterialPressureMmHg: 110 });
  assert.ok(perfused.renalBloodFlowMlPerMin > base.renalBloodFlowMlPerMin);
  assert.ok(perfused.gfrMlPerMin > base.gfrMlPerMin, '"both rise" is restored perfusion');
});

test('teaching: the explanation names the mechanism, in both languages', () => {
  assert.ok(LEARNING.explanationJa.length > 60 && LEARNING.explanationEn.length > 60);
  assert.match(LEARNING.explanationEn, /downstream/i, 'the explanation should say why the efferent is different');
  assert.match(LEARNING.explanationJa, /下流/);
  assert.ok(LEARNING.titleJa && LEARNING.titleEn && LEARNING.questionJa && LEARNING.questionEn);
});

test('copy: every situation names a preset the model actually has', () => {
  assert.deepEqual(SITUATIONS.map((entry) => entry.id).sort(), [...PRESET_IDS].sort());
  for (const entry of SITUATIONS) {
    assert.ok(entry.labelJa && entry.labelEn, `${entry.id} needs a label in both languages`);
    assert.ok(entry.questionJa && entry.questionEn, `${entry.id} needs a question in both languages`);
    assert.ok(entry.noteJa.length > 40 && entry.noteEn.length > 40, `${entry.id}: the note says too little`);
  }
});

test('copy: the copy layer stores no computed value', () => {
  // One medical source of truth: the moment a number is written down here it
  // is a second one, and it will disagree the day a constant changes.
  const source = readFileSync(new URL('../src/data/renalFiltration.js', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/from '\.\.\/models\//.test(code), 'the copy layer does not compute, so it does not import the model');

  // Prose may quote a round figure ("about 125 mL a minute"); a data *field*
  // may not hold a medical result. The numeric fields allowed here are all
  // presentation: how many digits to show, what to multiply a fraction by to
  // read it as a percentage, where a stage sits on the progression, and the
  // bounds of a slider. None of them is an answer the model produces.
  const numericFields = [...code.matchAll(/^\s*(\w+):\s*-?\d/gm)].map((match) => match[1]);
  assert.deepEqual([...new Set(numericFields)].sort(), ['at', 'digits', 'max', 'min', 'scale', 'step']);

  // And no read-out row carries a value at all — the scene fills those in
  // from the solve, every time it is read. (A `choice` control's options do
  // carry a `value`; that is the option's own identifier, not a number.)
  for (const metric of METRICS) {
    assert.ok(!('value' in metric), `${metric.id} stores a value in the copy layer`);
  }
});

test('read-out: every metric names a field the model actually produces', () => {
  const state = getState();
  for (const metric of METRICS) {
    assert.ok(metric.key in state, `the read-out names "${metric.key}", which the model does not produce`);
    assert.equal(typeof state[metric.key], 'number', `${metric.key} is not a number`);
    assert.ok(metric.labelJa && metric.label, `${metric.key} needs a label in both languages`);
    assert.ok(metric.id, `${metric.key} needs an id the read-out can key on`);
    assert.ok(Number.isInteger(metric.digits) && metric.digits <= 2, `${metric.key}: too many digits claimed`);
  }
});

test('read-out: the steady-state creatinine cannot be displayed as "creatinine"', () => {
  // The single most misleading number this model produces, so the name it is
  // displayed under has to carry the caveat with it.
  const creatinine = METRICS.find((metric) => metric.key === 'steadyStatePlasmaCreatinineMgDl');
  assert.ok(creatinine, 'the read-out should show it at all');
  assert.match(creatinine.label, /steady state/i);
  assert.match(creatinine.labelJa, /定常状態/);
});

test('scope: the panel states the limits the card and the dossier state', () => {
  assert.ok(SCOPE.answersJa.length === SCOPE.answersEn.length && SCOPE.answersJa.length >= 3);
  assert.ok(SCOPE.notAnsweredJa.length === SCOPE.notAnsweredEn.length && SCOPE.notAnsweredJa.length >= 4);

  const scope = SCOPE.notAnsweredEn.join('\n');
  // The four boundaries the evidence dossier calls out by name.
  assert.match(scope, /steady state/i);
  assert.match(scope, /acid[–-]base|potassium/i);
  assert.match(scope, /outside the kidney|volume status/i);
  assert.match(scope, /Time\./);
});

test('scope: the steady-state creatinine caveat is the first thing it says', () => {
  assert.match(SCOPE.notAnsweredEn[0], /creatinine/i);
  assert.match(SCOPE.notAnsweredJa[0], /クレアチニン/);
});

test('documents: the card and the dossier exist and cover the same boundary', () => {
  // Whitespace-tolerant: these documents are wrapped, so a phrase the card
  // does contain can still be split across two lines.
  for (const claim of [
    /steady\s+state/i,
    /calibration\s+constant,\s+not\s+a\s+measurement/i,
    /not\s+a\s+patient\s+simulator/i,
    /No\s+clinical\s+review\s+is\s+recorded/,
  ]) {
    assert.match(card, claim, `the model card does not state: ${claim}`);
  }
  assert.match(card, /\*\*Catalog status:\*\* `alpha`/);

  // Every numbered claim in the dossier says how it is validated.
  const sections = dossier.split(/\n## /).slice(2);
  for (const section of sections) {
    const heading = section.split('\n')[0];
    if (/Known limitations/.test(heading)) continue;
    assert.match(section, /\*\*Validation\.\*\*|\*\*Assumption\.\*\*/, `"${heading}" has no validation or assumption`);
  }
});

test('documents: the dossier does not claim a source it cannot have', () => {
  // The repository has said elsewhere that it cannot reach medical publishers.
  // A dossier that cited a page number would be claiming something untrue.
  assert.match(dossier, /not\s+a\s+measurement\s+in\s+a\s+patient|nothing\s+here\s+is\s+fitted\s+to\s+data/i);
});

test('situations: each one is reachable and produces a distinct state', () => {
  const gfrs = SITUATIONS.map((entry) => presetState(entry.id).gfrMlPerMin);
  assert.equal(new Set(gfrs.map((value) => value.toFixed(1))).size, SITUATIONS.length, 'two situations coincide');
  assert.equal(situation('nonsense').id, SITUATIONS[0].id, 'an unknown id falls back rather than throwing');
});
