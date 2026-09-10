import test from 'node:test';
import assert from 'node:assert/strict';

import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import { STAGES } from '../src/data/heartFailure.js';
import { createPatientGuidePanel } from '../src/components/PatientGuidePanel.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The clinician's explanation and the patient's explanation have to be about
 * the same solved state.
 *
 * Two sets of words over one model is the whole idea; two sets of words over
 * two different states is a way of quietly saying something the model never
 * showed. So each patient step names the scene stage it stands beside, and the
 * position it moves the model to is read from that stage rather than typed in
 * again. Re-tune the trajectory and these move with it or this fails.
 */

const guide = PATIENT_GUIDES['heart-failure'];
const stageById = new Map(STAGES.map((stage) => [stage.id, stage]));

test('patient guide: every heart-failure step stands beside a stage the scene has', () => {
  assert.ok(guide?.steps?.length, 'the guide is there');
  for (const step of guide.steps) {
    assert.ok(step.stage, `"${step.title}" names the stage it pairs with`);
    assert.ok(stageById.has(step.stage), `"${step.stage}" is a stage this scene has`);
  }
  // Every stage of the model is spoken for. A stage with no patient words is a
  // state the person in the room is walked through and never told about.
  const paired = new Set(guide.steps.map((step) => step.stage));
  for (const stage of STAGES) {
    assert.ok(paired.has(stage.id), `the patient guide covers "${stage.id}"`);
  }
});

test('patient guide: it moves the model to where that stage actually is', () => {
  for (const step of guide.steps) {
    const stage = stageById.get(step.stage);
    assert.equal(
      step.progress,
      stage.at,
      `"${step.title}" moves to ${stage.at} — where "${stage.id}" is — rather than to ${step.progress}`
    );
  }
  // And in the order the physiology happens, because the reader is walked
  // forward through it.
  const positions = guide.steps.map((step) => step.progress);
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test('patient guide: three short beats per step, in this order', () => {
  // What changes, what follows, where to look. The third is the one a person
  // standing beside a monitor actually needs and the one that was missing.
  for (const step of guide.steps) {
    for (const key of ['title', 'titleJa', 'body', 'bodyJa', 'look', 'lookJa']) {
      assert.ok(step[key]?.trim().length, `"${step.stage}" carries ${key}`);
    }
    // A limit, not a style note: this copy is read aloud in a room, and the
    // longest of these fits on a phone without scrolling.
    assert.ok(step.body.length <= 190, `"${step.stage}" body is short (${step.body.length})`);
    assert.ok(step.bodyJa.length <= 110, `"${step.stage}" bodyJa is short (${step.bodyJa.length})`);
    assert.ok(step.look.length <= 150, `"${step.stage}" look is short (${step.look.length})`);
    assert.ok(step.lookJa.length <= 90, `"${step.stage}" lookJa is short (${step.lookJa.length})`);
  }
});

test('patient guide: it says nothing the model cannot show one person', () => {
  // No dose, no drug, no diagnosis, no prognosis, no number pretending to be a
  // measurement of the person in the room.
  const forbidden = [
    /\b\d+\s*(mg|ml|mmHg|%)/i,
    /\bdiagnos/i, /\bprognos/i, /\btreat(ment|ed)?\b/i, /\bdrug\b/i, /\bmedicat/i,
    /\byour\b/i, /\byou (have|will|are likely)/i,
    /診断/, /予後/, /治療/, /薬/, /投与/, /余命/,
    /あなたの(心臓|病気|状態)/,
  ];
  for (const step of guide.steps) {
    for (const text of [step.title, step.titleJa, step.body, step.bodyJa, step.look, step.lookJa]) {
      for (const pattern of forbidden) {
        assert.doesNotMatch(text, pattern, `"${step.stage}": ${pattern} in "${text}"`);
      }
    }
  }
});

test('patient guide: the patient words do not contradict the clinician words', () => {
  // Not a prose comparison — a check on the one thing that is easy to get
  // backwards and impossible to see: the stage where the wall thickens must
  // not be described to a patient as the chamber enlarging, and vice versa.
  const wall = guide.steps.find((step) => step.stage === 'concentric-hypertrophy');
  assert.match(wall.body, /thick/i);
  assert.match(wall.bodyJa, /厚/);
  assert.doesNotMatch(wall.bodyJa, /広がり|拡大/, 'the thickening stage is not described as enlargement');

  const dilation = guide.steps.find((step) => step.stage === 'dilation');
  assert.match(dilation.bodyJa, /広が/);
  assert.doesNotMatch(dilation.bodyJa, /厚くなる/, 'the enlargement stage is not described as thickening');

  // And the last step is about what leaves the heart, which is what the
  // clinician's summary of that stage is about too.
  const failing = guide.steps.find((step) => step.stage === 'systolic-dysfunction');
  assert.match(failing.bodyJa, /残|圧/);
  assert.match(stageById.get('systolic-dysfunction').summaryJa, /駆出率|充満圧/);
});

test('patient guide: the panel puts "where to look" on screen as its own line', () => {
  // The data is only half of it. This is the half a person in the room sees.
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { print: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.document.fullscreenEnabled = false;
  globalThis.document.addEventListener = () => {};
  globalThis.document.removeEventListener = () => {};
  try {
    const panel = createPatientGuidePanel({
      guide,
      setProgress: () => {},
      onExit: () => {},
    });
    panel.reset?.();
    const lines = findByClass(panel.element, 'patient-guide-look');
    assert.equal(lines.length, 1, 'one such line, not one per step');
    const texts = findByClass(panel.element, 'patient-guide-look-text').map((node) => node.getAttribute('text') ?? node.textContent);
    assert.ok(
      texts.some((text) => text && guide.steps.some((step) => text === step.look || text === step.lookJa)),
      'and it is showing the current step\'s own words'
    );
    assert.equal(lines[0].hidden, false, 'and it is not hidden when there is something to point at');
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
