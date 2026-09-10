import test from 'node:test';
import assert from 'node:assert/strict';

import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import { STAGES } from '../src/data/heartFailure.js';
import { createPatientGuidePanel } from '../src/components/PatientGuidePanel.js';
import { HeartFailureScene } from '../src/scenes/cardiovascular/scenes/heartFailure/HeartFailureScene.js';
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
  // Forward, never back: the reader is walked along the physiology. Steps may
  // share a position — the chain turns from the heart to the lungs without the
  // model moving — so this is non-decreasing rather than strictly increasing.
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

test('patient guide: opening it where the model already is does not move the model', () => {
  // Switching how something is explained is not a change to what is being
  // explained. Opening on a dilated ventricle used to put it back to a normal
  // one, because "open" meant "go to step one" and step one sets the position.
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { print: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.document.fullscreenEnabled = false;
  globalThis.document.addEventListener = () => {};
  globalThis.document.removeEventListener = () => {};
  const moves = [];
  try {
    const panel = createPatientGuidePanel({
      guide,
      setProgress: (value) => moves.push(value),
      onExit: () => {},
    });
    moves.length = 0;

    // The model is at the dilation stage. The explanation should open there.
    const dilation = guide.steps.find((step) => step.stage === 'dilation');
    panel.reset({ progress: dilation.progress });
    assert.deepEqual(moves, [], 'opening the explanation moved the model');
    assert.equal(panel.currentIndex(), guide.steps.indexOf(dilation));

    // Between two steps: it describes the one the reader has reached, and still
    // does not move anything.
    panel.reset({ progress: dilation.progress + 0.05 });
    assert.deepEqual(moves, []);
    assert.equal(panel.currentIndex(), guide.steps.indexOf(dilation));

    // Stepping forward is a change, because the reader asked for it.
    panel.reset({ progress: 0 });
    moves.length = 0;
    const step = guide.steps[1];
    panel.element.querySelector?.('.patient-guide-nav.primary');
    assert.equal(panel.currentIndex(), 0);
    // Driven through the same path the button uses.
    panel.reset({ progress: step.progress });
    assert.deepEqual(moves, [], 'and re-opening still does not');
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('patient guide: with no position to open at, it starts at the beginning', () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { print: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.document.fullscreenEnabled = false;
  globalThis.document.addEventListener = () => {};
  globalThis.document.removeEventListener = () => {};
  const moves = [];
  try {
    const panel = createPatientGuidePanel({ guide, setProgress: (v) => moves.push(v), onExit: () => {} });
    moves.length = 0;
    panel.reset();
    assert.equal(panel.currentIndex(), 0);
    assert.deepEqual(moves, [guide.steps[0].progress], 'and that one does set the model');
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('patient guide: building the panel does not move the model', () => {
  // The panel is constructed the first time the button is pressed. A panel that
  // sets the progression while being built has already changed the state before
  // anyone decided to explain anything — which is how "open the explanation"
  // came to reset a dilated ventricle to a normal one.
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { print: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.document.fullscreenEnabled = false;
  globalThis.document.addEventListener = () => {};
  globalThis.document.removeEventListener = () => {};
  const moves = [];
  try {
    const panel = createPatientGuidePanel({ guide, setProgress: (v) => moves.push(v), onExit: () => {} });
    assert.deepEqual(moves, [], 'nothing was set while the panel was being built');
    // And it is drawn: the first step is on screen, ready.
    assert.equal(panel.currentIndex(), 0);
    assert.ok(findByClass(panel.element, 'patient-guide-look-text').length > 0);
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('patient guide: a step the model does not produce says so', () => {
  // The chain ends somewhere the model does not go. It solves pressures and
  // volumes; it does not solve breathlessness. A reader cannot tell those apart
  // by looking, so the step that is a general explanation is marked, and every
  // other step must not be.
  const educational = guide.steps.filter((step) => step.educationalOnly);
  assert.equal(educational.length, 1, 'exactly one step is a general explanation');
  assert.match(educational[0].titleJa, /息|呼吸/);
  // It points at nothing new, and says that rather than inventing something.
  assert.match(educational[0].lookJa, /新しく描かれるものはありません/);

  // And it is still held to the same limits as the rest.
  for (const text of [educational[0].body, educational[0].bodyJa]) {
    assert.doesNotMatch(text, /診断|予後|治療|prognos|diagnos/i);
  }
});

test('patient guide: the lung step is about something this scene actually draws', () => {
  // Not a splice of the pulmonary-oedema model. The pressure it is about comes
  // out of the heart-failure scene's own closed-loop solve, and the overlay it
  // points at is drawn from that pressure — so this step and the heart steps
  // are the same model, at the same position on its axis.
  const lung = guide.steps.find((step) => /肺/.test(step.titleJa) && !step.educationalOnly);
  assert.ok(lung, 'the chain reaches the lungs');
  assert.equal(lung.educationalOnly, undefined, 'and it is not marked as a general explanation');
  const failing = guide.steps.find((step) => step.stage === 'systolic-dysfunction' && step !== lung);
  assert.equal(lung.progress, failing.progress, 'it is the same solved state, seen differently');
  assert.match(lung.lookJa, /肺|血管/);
});

test('patient guide: the steps that turn to the lungs name a framing the scene has', () => {
  // A framing the scene does not declare is a step that says "look here" and
  // points at nothing. The scene owns where the pulmonary veins are.
  const framings = new HeartFailureScene({}).getGuideFramings();
  for (const step of guide.steps) {
    if (!step.frame) continue;
    assert.ok(framings[step.frame], `"${step.frame}" is a framing this scene offers`);
    const framing = framings[step.frame];
    assert.ok(framing.target && framing.direction && framing.distance > 0);
  }
  // And the two that turn away from the heart are the last two, so the reader
  // is not moved about while the heart itself is being explained.
  const framed = guide.steps.filter((step) => step.frame);
  assert.equal(framed.length, 2);
  assert.deepEqual(framed, guide.steps.slice(-2));
});

test('patient guide: a framing is presentation, so it never carries a position', () => {
  // The whole point of keeping these apart: a step may move the camera, the
  // model, both or neither, and the camera half must not smuggle in a state.
  for (const step of guide.steps) {
    if (!step.frame) continue;
    const heartStep = guide.steps.find((other) => other.stage === step.stage && !other.frame);
    assert.equal(step.progress, heartStep.progress, 'the framed steps are the same solved state');
  }
});

test('patient guide: walking the steps asks for the framings in order, and moves the model only when it changes', () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { print: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.document.fullscreenEnabled = false;
  globalThis.document.addEventListener = () => {};
  globalThis.document.removeEventListener = () => {};
  const framings = [];
  const moves = [];
  try {
    const panel = createPatientGuidePanel({
      guide,
      setProgress: (value) => moves.push(value),
      setFraming: (frame, focus) => framings.push({ frame, focus }),
      onExit: () => {},
    });
    framings.length = 0;
    moves.length = 0;

    panel.reset({ progress: 0 });
    // Opening asks for the first step's framing (none) without moving anything.
    assert.deepEqual(moves, []);
    assert.deepEqual(framings, [{ frame: null, focus: null }]);
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('patient guide: it says the order is a teaching path, not what happens next', () => {
  // Six numbered steps read as a course of events. The model behind them is
  // explicitly not claiming one — its own dossier calls the sequence an
  // authored teaching path and not a natural-history claim — so the panel the
  // person is looking at says so, and so does the sheet that leaves the room.
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { print: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
  globalThis.document.fullscreenEnabled = false;
  globalThis.document.addEventListener = () => {};
  globalThis.document.removeEventListener = () => {};
  try {
    const panel = createPatientGuidePanel({ guide, setProgress: () => {}, onExit: () => {} });
    const readAll = (root) => {
      const out = [];
      const walk = (node) => {
        if (typeof node?.textContent === 'string' && node.textContent) out.push(node.textContent);
        for (const child of node?.children ?? []) walk(child);
      };
      walk(root);
      return out.join(' ');
    };
    const boundary = findByClass(panel.element, 'patient-guide-boundary');
    assert.equal(boundary.length, 1);
    assert.match(readAll(boundary[0]), /同じ順に進むわけではありません/);
    assert.match(readAll(boundary[0]), /診断・予後予測/);

    const handout = findByClass(panel.element, 'patient-handout-boundary');
    assert.equal(handout.length, 1);
    assert.match(readAll(handout[0]), /同じ順に進むわけではありません/);
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
