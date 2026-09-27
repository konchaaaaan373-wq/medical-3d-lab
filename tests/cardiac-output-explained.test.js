import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { ExperimentSession } from '../src/scenes/cardiovascular/scenes/cardiacOutput/experimentSession.js';
import { calloutSequence } from '../src/scenes/cardiovascular/scenes/cardiacOutput/calloutSequence.js';
import { describeEffect } from '../src/scenes/cardiovascular/scenes/cardiacOutput/changeSummary.js';
import {
  EXPLAINER_CONTRACTILITY,
  EXPLAINER_STAGES,
  captionFor,
  contractilityAt,
  presentationAt,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/explainerStoryboard.js';
import { GAUGE_UNITS_PER_ML, heights } from '../src/scenes/cardiovascular/scenes/cardiacOutput/bloodVolumes.js';
import { CONTROL_DOMAIN } from '../src/models/cardiacOutput.js';
import { INTRO_COPY } from '../src/data/cardiacOutput.js';
import { createSceneIntro } from '../src/components/SceneIntro.js';
import { createSceneCallouts } from '../src/components/SceneCallouts.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The owner's review of 2026-09-27, second round: a first-time reader should
 * be able to say what was changed, what the heart did and what the output did
 * **without reading the table**. These hold the parts that say it on the
 * model — the tags, the explanation's cues, the volumes drawn to scale — to
 * the solved beat.
 */

const solved = (changes = {}) => {
  const session = new ExperimentSession();
  for (const [id, value] of Object.entries(changes)) session.setControl(id, value);
  return session;
};
const sequenceFor = (session) =>
  calloutSequence({ baseline: session.baseline.input, shown: session.view.input, before: session.baseline.metrics, now: session.view.metrics });

test('lowering contractility is said along the model: cause → blood left → sent out → output, from the solver', () => {
  const session = solved({ contractilityEesMmHgPerMl: EXPLAINER_CONTRACTILITY.to });
  const steps = sequenceFor(session);
  assert.deepEqual(steps.map((step) => step.id), ['cause-contractilityEesMmHgPerMl', 'esv', 'sv', 'co']);
  assert.deepEqual(steps.map((step) => step.anchor), ['myocardium', 'residual', 'outflow', 'arterial']);
  assert.equal(steps[0].title.ja, '収縮力↓');
  assert.equal(steps[1].title.ja, '収縮後に残る血液↑');
  assert.equal(steps[2].title.ja, '1回に送り出す量↓');
  // Every number is the read-out's, at the read-out's precision — the same
  // pair the chain in the console quotes.
  const m = (key) => Math.round(session.baseline.metrics[key]) + '→' + Math.round(session.view.metrics[key]);
  assert.ok(steps[1].detail.ja.includes(m('esvMl')));
  assert.ok(steps[2].detail.ja.includes(m('strokeVolumeMl')));
  const chain = describeEffect({ baseline: session.baseline.input, shown: session.view.input, before: session.baseline.metrics, now: session.view.metrics });
  assert.ok(chain.heart.find((line) => line.id === 'esv').ja.includes(m('esvMl')), 'the tags and the chain quote one pair');
  // The step about the blood that stayed holds the beat where it stayed.
  assert.equal(steps[1].hold, 'end-systole');
  assert.equal(sequenceFor(solved()).length, 0, 'nothing changed, nothing said');
});

test('raising resistance starts at the vessels and says what it did downstream', () => {
  const session = solved({ systemicResistanceMmHgSPerMl: 1.5 });
  const steps = sequenceFor(session);
  assert.equal(steps[0].anchor, 'bed', 'said where it acts: the small arteries, not the heart');
  assert.equal(steps[1].id, 'map', 'the pressure the heart ejects against, next');
  assert.equal(steps[1].direction, 'up');
  assert.equal(steps.at(-1).anchor, 'downstream', 'and the flow that reaches the body, downstream of the bed');
  assert.equal(steps.at(-1).direction, 'down');
  assert.ok(steps.some((step) => step.id === 'sv' && step.direction === 'down'));
});

test('every step says only what moved, with the arrow the numbers show', () => {
  for (const [id, value] of [
    ['fillingVolumeMl', CONTROL_DOMAIN.fillingVolumeMl.max],
    ['heartRatePerMin', 100],
    ['contractilityEesMmHgPerMl', CONTROL_DOMAIN.contractilityEesMmHgPerMl.max],
  ]) {
    for (const step of sequenceFor(solved({ [id]: value }))) {
      if (step.id.startsWith('cause-')) continue;
      const [from, to] = step.detail.en.match(/(\d+(?:\.\d+)?)→(\d+(?:\.\d+)?)/).slice(1).map(Number);
      assert.notEqual(from, to, `${id}: ${step.id} said with no change`);
      assert.equal(step.direction, to > from ? 'up' : 'down', `${id}: ${step.id} arrow disagrees with its numbers`);
      assert.ok(step.title.ja.endsWith(to > from ? '↑' : '↓'));
    }
  }
});

test('the explanation points first, then shows, then waits', () => {
  const cause = EXPLAINER_STAGES.find((stage) => stage.id === 'cause');
  // Pointing: the muscle is lit and contractility has not moved yet.
  // A second and a half in, the change has still not started: time to look
  // at the part before anything happens to it.
  const pointing = cause.at + 1.5;
  assert.equal(contractilityAt(pointing), EXPLAINER_CONTRACTILITY.from);
  assert.deepEqual(presentationAt(pointing).highlight, ['myocardium']);
  // …and the sentence says it is about to happen, not "2.74 → 2.74".
  const session = solved();
  const pendingCaption = captionFor('cause', { before: session.baseline.metrics, now: session.view.metrics, input: session.view.input });
  assert.doesNotMatch(pendingCaption.text.ja, /→/);
  assert.match(pendingCaption.brief.ja, /心筋/);
  // Waiting: the last seconds of the stage hold the fallen value.
  assert.equal(contractilityAt(cause.until - 0.5), EXPLAINER_CONTRACTILITY.to);
  assert.ok(cause.until - cause.at - cause.fall.to >= 1.5, 'at least a second and a half to look after it falls');
  // Inside the heart: pointed at, then the start's lines, and the beat held.
  const inside = EXPLAINER_STAGES.find((stage) => stage.id === 'inside');
  assert.equal(presentationAt(inside.at + 0.1).compare, false);
  assert.equal(presentationAt(inside.at + inside.compareFrom + 0.1).compare, true);
  assert.equal(presentationAt(inside.at + 1).hold, 'end-systole');
  // The four scenes the owner named, in order.
  const order = EXPLAINER_STAGES.map((stage) => stage.id);
  for (const [a, b] of [['cause', 'inside'], ['inside', 'ejection'], ['ejection', 'circulation']]) {
    assert.ok(order.indexOf(a) < order.indexOf(b), `${a} before ${b}`);
  }
  for (const stage of EXPLAINER_STAGES) assert.ok(stage.anchor, `${stage.id} says its sentence beside a part`);
});

test('the gauge is linear in millilitres: 49 → 75 mL left behind is a column half as tall again', () => {
  const a = heights({ volumeMl: 49, esvMl: 49, edvMl: 116 });
  const b = heights({ volumeMl: 75, esvMl: 75, edvMl: 132 });
  assert.ok(Math.abs(b.residual / a.residual - 75 / 49) < 1e-12);
  assert.equal(a.eject, 0, 'at the end of the beat nothing is still to leave');
  const full = heights({ volumeMl: 116, esvMl: 49, edvMl: 116 });
  assert.ok(Math.abs(full.eject - (116 - 49) * GAUGE_UNITS_PER_ML) < 1e-12, 'at the start of the beat, the stroke is on top');
});

test('the introduction: shown once, tried or skipped, and brought back', () => {
  const restore = installFakeDocument();
  const store = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  try {
    let tried = 0;
    const make = () => createSceneIntro({ copy: INTRO_COPY, storageKey: 'k', onTry: () => (tried += 1) });
    const first = make();
    first.openIfNew();
    assert.equal(first.isOpen, true, 'a first visit opens it');
    findByClass(first.element, 'scene-intro-try')[0].click();
    assert.equal(first.isOpen, false);
    assert.equal(tried, 1, 'the suggested change is made');
    const second = make();
    second.openIfNew();
    assert.equal(second.isOpen, false, 'not again on the next visit');
    second.open();
    assert.equal(second.isOpen, true, 'but on request');
    findByClass(second.element, 'scene-intro-skip')[0].click();
    assert.equal(second.isOpen, false);
    assert.equal(tried, 1, 'skipping changes nothing');
    // Storage that throws is a reader who sees it every time, not a crash.
    globalThis.localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const blocked = make();
    blocked.openIfNew();
    assert.equal(blocked.isOpen, true);
    findByClass(blocked.element, 'scene-intro-skip')[0].click();
    assert.equal(blocked.isOpen, false);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
    restore();
  }
});

test('the tags are said one after another, each pointing at its part, and cleared back at the start', () => {
  const restore = installFakeDocument();
  try {
    const pointed = [];
    const callouts = createSceneCallouts({
      viewer: { camera: new THREE.PerspectiveCamera(), container: { clientWidth: 0, clientHeight: 0 } },
      getAnchor: () => new THREE.Vector3(),
      onStep: (step) => pointed.push(step?.highlight ?? null),
      stepMs: 1000,
    });
    const steps = sequenceFor(solved({ contractilityEesMmHgPerMl: EXPLAINER_CONTRACTILITY.to }));
    callouts.play(steps);
    assert.equal(callouts.currentStep.id, steps[0].id, 'the cause first');
    callouts.update(0.5);
    assert.equal(callouts.currentStep.id, steps[0].id, 'and it is given its time');
    callouts.update(0.6);
    assert.equal(callouts.currentStep.id, steps[1].id);
    for (let i = 0; i < 10; i += 1) callouts.update(1);
    assert.equal(callouts.playing, false);
    assert.deepEqual(pointed.slice(0, steps.length), steps.map((step) => step.highlight), 'each part pointed at in turn');
    assert.equal(pointed.at(-1), null, 'and nothing left pointed at when it is done');
    const nodes = findByClass(callouts.element, 'scene-callout');
    assert.equal(nodes.length, steps.length, 'what was said stays, to be read back along the model');
    callouts.clear();
    assert.equal(findByClass(callouts.element, 'scene-callout').length, 0);
  } finally {
    restore();
  }
});
