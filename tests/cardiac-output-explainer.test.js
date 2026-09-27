import test from 'node:test';
import assert from 'node:assert/strict';

import { ExperimentSession } from '../src/scenes/cardiovascular/scenes/cardiacOutput/experimentSession.js';
import { describeEffect } from '../src/scenes/cardiovascular/scenes/cardiacOutput/changeSummary.js';
import {
  EXPLAINER_CONTRACTILITY,
  EXPLAINER_DURATION,
  EXPLAINER_STAGES,
  captionFor,
  contractilityAt,
  stageAt,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/explainerStoryboard.js';
import { bolusLengthFor, buildCircuit } from '../src/scenes/cardiovascular/scenes/cardiacOutput/circuit.js';
import { CONTROL_DOMAIN } from '../src/models/cardiacOutput.js';
import { EXPLAINER_COPY } from '../src/data/cardiacOutput.js';
import { createExplainerPlayer } from '../src/components/ExplainerPlayer.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The owner's review of 2026-09-27: the numbers moved and the 3D did not say
 * why. These hold the parts that now say it — the chain from the change to
 * the figures, the explanation that plays the model, and the drawing
 * quantities the circuit takes from the solved beat — to the model.
 */

const solved = (changes = {}) => {
  const session = new ExperimentSession();
  for (const [id, value] of Object.entries(changes)) session.setControl(id, value);
  return session;
};

test('the chain says what was changed, what the heart did, and what the figures did — from the solver', () => {
  const session = solved({ contractilityEesMmHgPerMl: 1.4 });
  const effect = describeEffect({
    baseline: session.baseline.input,
    shown: session.view.input,
    before: session.baseline.metrics,
    now: session.view.metrics,
  });
  assert.equal(effect.cause.ja, '収縮力↓');
  const esv = effect.heart.find((line) => line.id === 'esv');
  assert.ok(esv, 'weaker contraction leaves more blood behind');
  assert.ok(esv.ja.includes(`${Math.round(session.baseline.metrics.esvMl)}→${Math.round(session.view.metrics.esvMl)}`));
  assert.ok(effect.results.some((line) => line.id === 'co'), 'and the output is named');
  // The chain never names a step whose displayed value did not move: the
  // rate was held, so the beat interval is not in it.
  assert.equal(effect.heart.some((line) => line.id === 'interval'), false);
  assert.equal(describeEffect({ baseline: session.baseline.input, shown: session.baseline.input, before: session.baseline.metrics, now: session.baseline.metrics }), null);
});

test('a change of rate is said as the time between beats', () => {
  const session = solved({ heartRatePerMin: 100 });
  const effect = describeEffect({ baseline: session.baseline.input, shown: session.view.input, before: session.baseline.metrics, now: session.view.metrics });
  const interval = effect.heart.find((line) => line.id === 'interval');
  assert.ok(interval.ja.includes(`${(60 / 70).toFixed(2)}→${(60 / 100).toFixed(2)}`));
});

test('the explanation: contiguous stages, exact end points, every value one a reader could set', () => {
  EXPLAINER_STAGES.forEach((stage, index) => {
    if (index > 0) assert.equal(stage.at, EXPLAINER_STAGES[index - 1].until, `${stage.id} starts where the last ended`);
  });
  assert.equal(EXPLAINER_DURATION, EXPLAINER_STAGES.at(-1).until);
  assert.equal(contractilityAt(0), EXPLAINER_CONTRACTILITY.from, 'the first stage is the untouched start');
  assert.equal(contractilityAt(EXPLAINER_DURATION), EXPLAINER_CONTRACTILITY.to);
  const { min, max, step } = CONTROL_DOMAIN.contractilityEesMmHgPerMl;
  for (let t = 0; t <= EXPLAINER_DURATION; t += 0.25) {
    const value = contractilityAt(t);
    assert.ok(value >= min && value <= max, `${value} is inside the control's range`);
    const onGrid = Math.abs((value - min) / step - Math.round((value - min) / step)) < 1e-6;
    assert.ok(onGrid, `${value} is on the control's own grid`);
  }
  assert.equal(stageAt(-1).id, 'start');
  assert.equal(stageAt(EXPLAINER_DURATION + 5).id, EXPLAINER_STAGES.at(-1).id);
});

test('the explanation\'s sentences quote the solved beat and nothing else', () => {
  // No figure is written in the copy: every number is a placeholder.
  for (const [id, stage] of Object.entries(EXPLAINER_COPY.stages)) {
    for (const text of [stage.text, stage.textJa]) {
      // "1回" (once) is a word, not a figure.
      assert.doesNotMatch(text.replace(/\{\w+\}/g, '').replace(/1回/g, ''), /\d/, `${id}: a number written into the copy`);
    }
  }
  const session = solved({ contractilityEesMmHgPerMl: EXPLAINER_CONTRACTILITY.to });
  const caption = captionFor('inside', { before: session.baseline.metrics, now: session.view.metrics, input: session.view.input });
  assert.ok(caption.text.ja.includes(`${Math.round(session.baseline.metrics.esvMl)}→${Math.round(session.view.metrics.esvMl)}`));
  assert.doesNotMatch(caption.text.ja, /\{|\}|undefined|NaN/);
  // It says nothing about what the model does not compute.
  const all = Object.values(EXPLAINER_COPY.stages).map((stage) => stage.textJa).join('');
  assert.doesNotMatch(all, /DO2|DO₂|酸素供給量|灌流量/, 'no uncomputed oxygen delivery or perfusion as a result');
  assert.match(EXPLAINER_COPY.noteJa, /計算していません/);
});

test('the player: play, pause holds time, a reader\'s change interrupts, and it ends', () => {
  const restore = installFakeDocument();
  try {
    const driven = [];
    const stages = [];
    let begun = 0;
    const explainer = {
      copy: EXPLAINER_COPY,
      duration: EXPLAINER_DURATION,
      stages: EXPLAINER_STAGES,
      stageAt,
      driveAt: (t, op) => driven.push([t, op]),
      caption: () => ({ heading: { en: 'h', ja: 'h' }, text: { en: 't', ja: 't' } }),
      end: () => {},
    };
    const player = createExplainerPlayer({
      explainer,
      onBegin: () => {
        begun += 1;
      },
      onStage: (stage) => stages.push(stage.id),
      onFrame: () => {},
    });
    assert.equal(player.state, 'idle');
    const [play] = findByClass(player.element, 'explainer-play');
    play.click();
    assert.equal(player.state, 'playing');
    assert.equal(begun, 1, 'it starts from the start');
    player.tick(1);
    const at = player.time;
    play.click();
    assert.equal(player.state, 'paused');
    player.tick(5);
    assert.equal(player.time, at, 'paused, time stands still');
    play.click();
    player.tick(5);
    assert.ok(player.time > at);
    assert.equal(new Set(driven.map(([, op]) => op)).size, 1, 'one operation for the whole playback: one undo takes it back');
    player.interrupt();
    assert.equal(player.state, 'interrupted', 'a change by hand stops it');
    const count = driven.length;
    player.tick(1);
    assert.equal(driven.length, count, 'and it does not drive the model again');
    play.click();
    assert.equal(begun, 2, 'play again is from the start');
    for (let i = 0; i < 100; i += 1) player.tick(1);
    assert.equal(player.state, 'ended');
    assert.deepEqual([...new Set(stages)], EXPLAINER_STAGES.map((stage) => stage.id), 'every stage, in order');
  } finally {
    restore();
  }
});

test('the circuit takes its drawing from the solved beat: bolus length, bed calibre, venous filling', () => {
  // The bolus is a length in proportion to the stroke volume.
  assert.ok(Math.abs(bolusLengthFor(44) / bolusLengthFor(71) - 44 / 71) < 1e-12);
  assert.equal(bolusLengthFor(0), 0);

  const circuit = buildCircuit({ compact: true });
  const domain = CONTROL_DOMAIN.systemicResistanceMmHgSPerMl;
  const filling = { fillingDomain: CONTROL_DOMAIN.fillingVolumeMl };
  const drawn = (changes) => {
    const session = solved(changes);
    circuit.setState(session.view.metrics, domain, { ...filling, fillingVolumeMl: session.view.input.fillingVolumeMl });
    return circuit.presentationState();
  };
  const low = drawn({ systemicResistanceMmHgSPerMl: domain.min });
  const high = drawn({ systemicResistanceMmHgSPerMl: domain.max });
  assert.ok(high.bedRadius < low.bedRadius, 'a higher resistance is a narrower bed');
  assert.ok(high.bedVessels > 3, 'drawn as many vessels, not one ring');
  const less = drawn({ fillingVolumeMl: CONTROL_DOMAIN.fillingVolumeMl.min });
  const more = drawn({ fillingVolumeMl: CONTROL_DOMAIN.fillingVolumeMl.max });
  assert.ok(more.venousRadius > less.venousRadius, 'more filling is a fuller venous run');
  const weak = drawn({ contractilityEesMmHgPerMl: CONTROL_DOMAIN.contractilityEesMmHgPerMl.min });
  const strong = drawn({ contractilityEesMmHgPerMl: CONTROL_DOMAIN.contractilityEesMmHgPerMl.max });
  assert.ok(weak.bolusLength < strong.bolusLength, 'a weaker heart sends out a shorter bolus');
  circuit.dispose();
});

test('the player keeps what the reader had before play, and offers it back at the end', () => {
  const restoreDom = installFakeDocument();
  try {
    // A stand-in model: one number the player drives, and a key over it.
    const model = { value: 'reader' };
    const explainer = {
      copy: EXPLAINER_COPY,
      duration: EXPLAINER_DURATION,
      stages: EXPLAINER_STAGES,
      stageAt,
      driveAt: (t) => {
        const next = `explainer-${Math.floor(t)}`;
        const changed = next !== model.value;
        model.value = next;
        return changed;
      },
      stateKey: () => model.value,
      caption: () => ({ heading: { en: 'h', ja: 'h' }, text: { en: 't', ja: 't' } }),
    };
    const restored = [];
    const player = createExplainerPlayer({
      explainer,
      onBegin: () => {
        model.value = 'start';
      },
      onStage: () => {},
      onFrame: () => {},
      capture: () => ({ kept: model.value }),
      restore: (kept) => {
        restored.push(kept.kept);
        model.value = kept.kept;
      },
    });
    const [back] = findByClass(player.element, 'explainer-restore');
    assert.equal(back.hidden, true, 'nothing to offer before play');
    player.play();
    player.tick(2);
    // A replay mid-way keeps the reader's condition, not the explanation's.
    const [replay] = findByClass(player.element, 'explainer-replay');
    replay.click();
    for (let i = 0; i < 100; i += 1) player.tick(1);
    assert.equal(player.state, 'ended');
    assert.equal(back.hidden, false, 'offered at the end');
    back.click();
    assert.deepEqual(restored, ['reader'], 'what the reader had, not a frame of the explanation');
    assert.equal(model.value, 'reader');
    assert.equal(player.state, 'idle');
    assert.equal(back.hidden, true, 'offered once');
  } finally {
    restoreDom();
  }
});

test('the player stops when anything else moves the model, not only the reader\'s inputs', () => {
  const restoreDom = installFakeDocument();
  try {
    const model = { value: 0, frames: 0, captions: 0 };
    const explainer = {
      copy: EXPLAINER_COPY,
      duration: EXPLAINER_DURATION,
      stages: EXPLAINER_STAGES,
      stageAt,
      // Changes the model once a second, not every frame.
      driveAt: (t) => {
        const next = Math.floor(t);
        const changed = next !== model.value;
        model.value = next;
        return changed;
      },
      stateKey: () => String(model.value),
      caption: (id) => {
        model.captions += 1;
        return { heading: { en: id, ja: id }, text: { en: String(model.value), ja: String(model.value) } };
      },
    };
    const player = createExplainerPlayer({
      explainer,
      onBegin: () => {
        model.value = 0;
      },
      onStage: () => {},
      onFrame: () => {
        model.frames += 1;
      },
    });
    player.play();
    const [text] = findByClass(player.element, 'explainer-caption-text');
    const firstText = text.children[0];
    const frames = model.frames;
    for (let i = 0; i < 10; i += 1) player.tick(0.01);
    assert.equal(model.frames, frames, 'a frame that changed nothing is not re-read');
    assert.equal(text.children[0], firstText, 'and the live caption is not rewritten with the same sentence');
    player.tick(1);
    assert.ok(model.frames > frames, 'a frame that changed the model is');
    // A lesson, the reel or a reset elsewhere: the model moves without the
    // shell calling interrupt.
    model.value = 'someone else';
    player.tick(0.01);
    assert.equal(player.state, 'interrupted');
    // Paused counts too: the reader may pause and then start a lesson.
    player.play();
    player.pause();
    model.value = 'someone else';
    player.tick(0.01);
    assert.equal(player.state, 'interrupted');
  } finally {
    restoreDom();
  }
});

test('the live caption is written only when its sentence changes', () => {
  const restoreDom = installFakeDocument();
  try {
    const explainer = {
      copy: EXPLAINER_COPY,
      duration: EXPLAINER_DURATION,
      stages: EXPLAINER_STAGES,
      stageAt,
      driveAt: () => true, // the model changes every frame…
      caption: () => ({ heading: { en: 'h', ja: 'h' }, text: { en: 'same', ja: 'same' } }), // …and the sentence does not
    };
    const player = createExplainerPlayer({ explainer, onBegin: () => {}, onStage: () => {}, onFrame: () => {} });
    player.play();
    const [text] = findByClass(player.element, 'explainer-caption-text');
    const first = text.children[0];
    assert.ok(first, 'a sentence is written');
    player.tick(0.01);
    player.tick(0.01);
    assert.equal(text.children[0], first, 'an aria-live region re-written with the same words is announced again');
  } finally {
    restoreDom();
  }
});
