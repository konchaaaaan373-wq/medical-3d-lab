import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { declaration, rulesNaming, rulesOf } from '../scripts/lib/css.mjs';

import {
  VIDEO_CLAUSE,
  VIDEO_TERMS_VERSION,
  consentComplete,
  consentMissing,
  videoConsentTerms,
  videoExportOffered,
  videoExportProblems,
  videoFileName,
  recordingSize,
  RECORDING_FRAME_BUDGET_MS,
} from '../src/app/videoExport.js';
import {
  PROHIBITED_USE_COPY,
  VIDEO_CLAUSE_COPY,
  VIDEO_CONTENTS_COPY,
  VIDEO_EXPORT_COPY,
  clauseSentence,
} from '../src/data/videoExport.js';
import { CARD_BACKDROP_STOPS, FORMAT_LAYOUT_TABLE, paintReelFrame, wrapLines } from '../src/app/reelFramePainter.js';
// `ReelMode` pulls in `three`, which a `node --test` run loads happily —
// `tests/reel.test.js` already imports it for the same list. The formats are
// declared once and checked once.
import { REEL_FORMATS } from '../src/app/ReelMode.js';
import {
  VIDEO_MIME_CANDIDATES,
  createCanvasRecorder,
  extensionForMimeType,
  pickVideoMimeType,
  videoRecordingSupported,
} from '../src/app/videoRecorder.js';
import { createVideoConsentDialog } from '../src/components/VideoConsentDialog.js';
import { createReelChrome } from '../src/components/ReelChrome.js';
import { PUBLIC_SCENES, SCENES } from '../src/catalog/index.js';
import { PROHIBITED_USE } from '../src/catalog/modelProfiles.js';
import { PUBLIC_MODELS } from '../src/catalog/publicManifest.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The video export, from the rule that decides whether a file may exist to the
 * screen that asks before writing one.
 *
 * The scenes that carry a 15-second sequence are the five whose scene class
 * answers `getReel()`. This file does not import those classes — they pull in
 * `three` — so `animated: true` stands in for that answer, exactly as the app
 * passes `Boolean(scene.getReel)`.
 */

const REEL_CSS = readFileSync(new URL('../src/styles/reel.css', import.meta.url), 'utf8');

/**
 * What one exact selector declares, last wins.
 *
 * `rulesNaming` deliberately refuses descendant selectors, and every
 * format override is one (`.reel-frame[data-format='wide'] .reel-cards`), so
 * these are matched by the whole selector string instead of by class.
 */
function cssValue(selector, property) {
  const rules = [...rulesOf(REEL_CSS)].filter((rule) => rule.names.map((name) => name.trim()).includes(selector));
  for (const rule of rules.reverse()) {
    const found = declaration(rule.body, property);
    if (found) return found;
  }
  return null;
}

const ANIMATED_SCENES = [
  'copd-hyperinflation',
  'asthma-heterogeneity',
  'heart-failure',
  'portal-hypertension',
  'hepatorenal-syndrome',
  // The guard below found this one: it arrived on `main` while this branch was
  // open, with a sequence of its own, and it is the first scene whose export
  // carries a licence credit — so its consent screen has four clauses where
  // the others have three.
  'higher-brain-function',
];

// --- who may export at all --------------------------------------------------

test('the scenes listed here are the scenes that actually have a sequence', () => {
  // The list above is a copy of something the scene classes own, and a copy
  // that nothing compares is a copy that drifts: a sixth scene gaining a
  // sequence would ship a download nothing in this file had ever checked, and
  // one losing its sequence would leave a test passing about a scene that no
  // longer exists. So it is compared, by reading which scene modules answer
  // `getReel()` — which this file cannot do by importing them, because they
  // import `three`.
  const manifest = readFileSync(new URL('../src/catalog/scenes.js', import.meta.url), 'utf8');
  const withSequence = [];
  for (const scene of SCENES) {
    const at = manifest.indexOf(`id: '${scene.id}'`);
    if (at < 0) continue;
    const load = /import\('([^']+)'\)/.exec(manifest.slice(at));
    if (!load) continue;
    const directory = new URL(`../src/catalog/${load[1]}`, import.meta.url).pathname.replace(/\/[^/]+$/, '');
    if (sourceUnder(directory).some((file) => readFileSync(file, 'utf8').includes('getReel('))) {
      withSequence.push(scene.id);
    }
  }
  assert.deepEqual(
    withSequence.sort(),
    [...ANIMATED_SCENES].sort(),
    'a scene gained or lost its 15-second sequence; this list, and the docs that name it, are out of date'
  );
});

/** Every `.js` file under a directory, recursively. */
function sourceUnder(directory) {
  const out = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sourceUnder(path));
    else if (entry.name.endsWith('.js')) out.push(path);
  }
  return out;
}

test('an animated disease scene may be exported', () => {
  for (const id of ANIMATED_SCENES) {
    assert.ok(SCENES.some((scene) => scene.id === id), `${id} should be in the manifest`);
    assert.deepEqual(videoExportProblems(id, { animated: true }), [], `${id} should offer a video`);
  }
});

test('a scene with no sequence offers nothing, however good its model is', () => {
  const problems = videoExportProblems('copd-hyperinflation', { animated: false });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /no animated sequence/);
  assert.equal(videoExportOffered('copd-hyperinflation', { animated: false }), false);
});

test('an anatomy atlas is not exportable even if something animates it', () => {
  // Structure, not mechanism: there is nothing for a video to claim, and the
  // β publishes exactly these — so this is also what keeps a download surface
  // out of the public build.
  const problems = videoExportProblems('brain-anatomy', { animated: true });
  assert.ok(problems.some((problem) => /no mechanism claim/.test(problem)), problems.join(' | '));
});

test('nothing the β publishes can produce a file', () => {
  assert.ok(PUBLIC_MODELS.length > 0, 'the β should publish something for this to mean anything');
  for (const model of PUBLIC_MODELS) {
    const problems = videoExportProblems(model.sceneId, { animated: true });
    assert.ok(
      problems.length > 0,
      `${model.sceneId} is published and would hand out a video file: ${problems.join(' | ')}`
    );
  }
});

test('an unknown scene is refused rather than exported', () => {
  assert.deepEqual(videoExportProblems('not-a-scene', { animated: true }), ['no scene named "not-a-scene"']);
});

test('geometry that may not be redistributed stops the file', () => {
  const scenes = [{ id: 'made-up', slug: 'made-up', status: 'reviewed', modelProfile: 'made-up-profile' }];
  const profiles = [
    {
      profileId: 'made-up-profile',
      mechanismLevel: 'mechanistic',
      prohibitedUses: ['diagnosis'],
      assets: ['borrowed-asset'],
    },
  ];
  const assets = [
    {
      assetId: 'borrowed-asset',
      license: { redistribution: 'restricted', commercialUse: 'unknown', decisionRecord: 'docs/asset-provenance/made-up.md' },
    },
  ];
  const problems = videoExportProblems('made-up', { animated: true, scenes, profiles, assets, candidates: [] });
  assert.ok(problems.some((problem) => /redistribution is "restricted"/.test(problem)), problems.join(' | '));
});

test('a candidate asset no record describes stops the file too', () => {
  // The unregistered case used to be skipped, which made geometry *nothing*
  // describes weaker evidence than geometry a record describes as unfinished.
  const scenes = [{ id: 'made-up', slug: 'made-up', status: 'alpha', modelProfile: 'made-up-profile' }];
  const profiles = [
    { profileId: 'made-up-profile', mechanismLevel: 'mechanistic', prohibitedUses: [], assets: [], candidateAssets: ['nobody-knows'] },
  ];
  const problems = videoExportProblems('made-up', { animated: true, scenes, profiles, assets: [], candidates: [] });
  assert.ok(problems.some((problem) => /is in no record/.test(problem)), problems.join(' | '));
});

test('an asset still under examination stops the file', () => {
  const scenes = [{ id: 'made-up', slug: 'made-up', status: 'alpha', modelProfile: 'made-up-profile' }];
  const profiles = [
    { profileId: 'made-up-profile', mechanismLevel: 'mechanistic', prohibitedUses: [], assets: [], candidateAssets: ['looking-at-it'] },
  ];
  const candidates = [{ id: 'looking-at-it', url: 'https://example.invalid/mesh.glb', note: 'licence unread' }];
  const problems = videoExportProblems('made-up', { animated: true, scenes, profiles, assets: [], candidates });
  assert.ok(problems.some((problem) => /still under examination/.test(problem)), problems.join(' | '));
});

// --- what the reader agrees to ---------------------------------------------

test('the terms are assembled from the profile rather than written out', () => {
  const terms = videoConsentTerms('copd-hyperinflation');
  assert.equal(terms.termsVersion, VIDEO_TERMS_VERSION);
  assert.equal(terms.slug, 'copd');
  const ids = terms.clauses.map((clause) => clause.id);
  assert.deepEqual(ids, [VIDEO_CLAUSE.MODEL_NOT_PATIENT, VIDEO_CLAUSE.PROHIBITED_USES, VIDEO_CLAUSE.KEEP_THE_CAPTION]);

  const prohibited = terms.clauses.find((clause) => clause.id === VIDEO_CLAUSE.PROHIBITED_USES);
  // The profile's own list, not a copy of it kept beside the dialog.
  assert.ok(prohibited.details.includes(PROHIBITED_USE.DIAGNOSIS));
  assert.ok(prohibited.details.includes(PROHIBITED_USE.TREATMENT_SELECTION));
  assert.ok(prohibited.details.includes(PROHIBITED_USE.DOSE_SELECTION));
});

test('a scene resting on an attributed asset has to carry the credit', () => {
  const scenes = [{ id: 'made-up', slug: 'made-up', status: 'reviewed', modelProfile: 'made-up-profile' }];
  const profiles = [{ profileId: 'made-up-profile', mechanismLevel: 'mechanistic', prohibitedUses: ['diagnosis'], assets: ['credited'] }];
  const assets = [
    {
      assetId: 'credited',
      source: { name: 'An Atlas', url: 'https://example.invalid' },
      license: { spdx: 'CC-BY-4.0', attribution: 'An Atlas, CC BY 4.0', obligations: [{ kind: 'attribution', satisfiedBy: 'public/assets/ATTRIBUTION.md' }] },
    },
  ];
  const terms = videoConsentTerms('made-up', { scenes, profiles, assets, candidates: [] });
  const credit = terms.clauses.find((clause) => clause.id === VIDEO_CLAUSE.CARRY_THE_CREDIT);
  assert.ok(credit, 'the credit clause should be present');
  assert.deepEqual(credit.details, ['An Atlas, CC BY 4.0']);
  assert.match(clauseSentence(credit, 'en'), /An Atlas, CC BY 4\.0/);
  assert.match(clauseSentence(credit, 'ja'), /An Atlas, CC BY 4\.0/);
});

test('every clause is required, and a partial agreement is not one', () => {
  const terms = videoConsentTerms('asthma-heterogeneity');
  assert.deepEqual(consentMissing(terms, []), terms.clauses.map((clause) => clause.id));
  assert.equal(consentComplete(terms, []), false);
  assert.equal(consentComplete(terms, [VIDEO_CLAUSE.MODEL_NOT_PATIENT]), false);
  assert.equal(consentComplete(terms, terms.clauses.map((clause) => clause.id)), true);
  // A tick for a clause this scene does not have does not answer one it does.
  assert.equal(consentComplete(terms, [VIDEO_CLAUSE.CARRY_THE_CREDIT]), false);
});

test('a clause with nothing to name is not shown at all', () => {
  // "It stays outside ." is a sentence that teaches a reader to tick without
  // reading. Schema 1 makes an empty list impossible; the dialog does not
  // depend on that being true.
  const scenes = [{ id: 'made-up', slug: 'made-up', status: 'alpha', modelProfile: 'made-up-profile' }];
  const profiles = [{ profileId: 'made-up-profile', mechanismLevel: 'illustrative', prohibitedUses: [], assets: [] }];
  const terms = videoConsentTerms('made-up', { scenes, profiles, assets: [], candidates: [] });
  assert.deepEqual(terms.clauses.map((clause) => clause.id), [VIDEO_CLAUSE.MODEL_NOT_PATIENT, VIDEO_CLAUSE.KEEP_THE_CAPTION]);
  for (const clause of terms.clauses) {
    for (const language of ['en', 'ja']) {
      const sentence = clauseSentence(clause, language);
      assert.ok(sentence.length > 8, `${clause.id} says nothing in ${language}`);
      assert.ok(!/\{\w+\}/.test(sentence), `${clause.id} left a placeholder unfilled in ${language}`);
    }
  }
});

test('a scene with no profile is refused rather than given blank terms', () => {
  const scenes = [{ id: 'made-up', slug: 'made-up', status: 'prototype' }];
  assert.throws(() => videoConsentTerms('made-up', { scenes, profiles: [] }), /declares no model profile/);
});

// --- the copy ---------------------------------------------------------------

test('every clause has a sentence in both languages, and every sentence has a clause', () => {
  const ids = Object.values(VIDEO_CLAUSE);
  assert.deepEqual([...ids].sort(), Object.keys(VIDEO_CLAUSE_COPY).sort());
  for (const [id, copy] of Object.entries(VIDEO_CLAUSE_COPY)) {
    assert.ok(copy.en?.length > 20, `${id} has no English sentence`);
    assert.ok(copy.ja?.length > 8, `${id} has no Japanese sentence`);
  }
  for (const entry of [...VIDEO_CONTENTS_COPY, ...Object.values(VIDEO_EXPORT_COPY)]) {
    assert.ok(entry.en && entry.ja, `${entry.id ?? entry.en} is missing a language`);
  }
});

test('every prohibited use the vocabulary allows can be said out loud', () => {
  // A new prohibition that nothing can render would appear in the consent
  // screen as its own id — which is what "stays outside procedure-planning"
  // reads like to somebody who does not write the profiles.
  for (const use of Object.values(PROHIBITED_USE)) {
    assert.ok(PROHIBITED_USE_COPY[use]?.en, `no English phrase for "${use}"`);
    assert.ok(PROHIBITED_USE_COPY[use]?.ja, `no Japanese phrase for "${use}"`);
  }
});

test('the prohibited-use sentence lists the uses rather than their ids', () => {
  const clause = { id: VIDEO_CLAUSE.PROHIBITED_USES, details: ['diagnosis', 'treatment-selection'] };
  const en = clauseSentence(clause, 'en');
  const ja = clauseSentence(clause, 'ja');
  assert.match(en, /making a diagnosis or choosing a treatment/);
  assert.match(ja, /診断、治療の選択/);
  assert.ok(!en.includes('{uses}') && !ja.includes('{uses}'), 'the placeholder should be filled');
  assert.ok(!en.includes('treatment-selection'), 'an id is not a sentence');
});

// --- how big the file is ----------------------------------------------------

test('the declared pixel size is used when the machine can draw it', () => {
  const declared = { width: 1080, height: 1920 };
  const canvas = { width: 506, height: 900 };
  const fast = recordingSize({ declared, canvas, frameMs: 9 });
  assert.deepEqual({ width: fast.width, height: fast.height }, declared);
  assert.equal(fast.declared, true);
});

test('a machine that cannot draw it records its own canvas instead', () => {
  // Measured: holding the canvas at 1080×1920 on a software rasteriser took
  // the sequence to 2.4 frames a second. A smaller file that moves is worth
  // more than a larger one that does not.
  const declared = { width: 1080, height: 1920 };
  const canvas = { width: 507, height: 901 };
  const slow = recordingSize({ declared, canvas, frameMs: 420 });
  assert.equal(slow.declared, false);
  // Even, because the encoders behind `video/mp4` reject odd dimensions.
  assert.deepEqual({ width: slow.width, height: slow.height }, { width: 506, height: 900 });
  assert.match(slow.reason, /420ms/);
});

test('the threshold is a frame rate, not a guess', () => {
  const declared = { width: 1080, height: 1920 };
  const canvas = { width: 506, height: 900 };
  assert.equal(recordingSize({ declared, canvas, frameMs: RECORDING_FRAME_BUDGET_MS }).declared, true);
  assert.equal(recordingSize({ declared, canvas, frameMs: RECORDING_FRAME_BUDGET_MS + 1 }).declared, false);
  // Roughly 22 frames a second: below that a fifteen-second clip is a slideshow.
  assert.ok(RECORDING_FRAME_BUDGET_MS >= 30 && RECORDING_FRAME_BUDGET_MS <= 60, 'the budget should be a video frame rate');
});

test('a canvas already bigger than the declared size is left alone', () => {
  // A large monitor gives the sequence more pixels than the format asks for.
  // Shrinking to the declared size would throw them away and measure nothing.
  const size = recordingSize({
    declared: { width: 1080, height: 1920 },
    canvas: { width: 1200, height: 2133 },
    frameMs: 9,
  });
  assert.deepEqual({ width: size.width, height: size.height }, { width: 1200, height: 2132 });
  assert.equal(size.declared, false);
});

test('an unmeasurable frame time keeps the declared size', () => {
  // `performance.now()` differences can come back as NaN in a stubbed
  // environment; refusing the declared size because a measurement failed would
  // make every such machine export small files for no reason.
  const size = recordingSize({
    declared: { width: 1080, height: 1920 },
    canvas: { width: 506, height: 900 },
    frameMs: Number.NaN,
  });
  assert.equal(size.declared, true);
});

// --- the file ---------------------------------------------------------------

test('the file name says which model and which frame it holds', () => {
  const name = videoFileName({ slug: 'copd', formatId: 'reel', extension: 'mp4', date: new Date('2026-09-21T10:00:00Z') });
  assert.equal(name, 'copd_reel_20260921.mp4');
});

test('the container decides the extension rather than an assumption', () => {
  assert.equal(extensionForMimeType('video/mp4;codecs=avc1.42E01E'), 'mp4');
  assert.equal(extensionForMimeType('video/webm;codecs=vp9'), 'webm');
  assert.equal(extensionForMimeType(undefined), 'webm');
});

test('the first container the browser can encode is the one used', () => {
  assert.equal(pickVideoMimeType({ isTypeSupported: () => true }), VIDEO_MIME_CANDIDATES[0]);
  assert.equal(
    pickVideoMimeType({ isTypeSupported: (type) => type.startsWith('video/webm') }),
    'video/webm;codecs=vp9'
  );
  assert.equal(pickVideoMimeType({ isTypeSupported: () => false }), null);
  // No recorder at all: nothing is picked, and nothing throws.
  assert.equal(pickVideoMimeType({}), null);
});

test('an MP4 is only claimed when H.264 was asked for by name', () => {
  // Chromium says yes to bare `video/mp4` on builds with no H.264 encoder and
  // then writes VP9 into it — a file branded `.mp4` that QuickTime will not
  // open. Measured in the browser check; guarded here.
  assert.ok(!VIDEO_MIME_CANDIDATES.includes('video/mp4'), 'bare video/mp4 must not be offered');
  for (const type of VIDEO_MIME_CANDIDATES) {
    if (!type.startsWith('video/mp4')) continue;
    assert.match(type, /codecs=(avc1|h264)/, `${type} claims MP4 without naming H.264`);
  }
  // A browser that supports the container but not the codec falls through to
  // a format that says what is inside it.
  const onlyBareMp4 = (type) => type === 'video/mp4' || type.startsWith('video/webm');
  assert.equal(pickVideoMimeType({ isTypeSupported: onlyBareMp4 }), 'video/webm;codecs=vp9');
});

test('a browser that cannot record is found out before the button is offered', () => {
  const canvas = { captureStream: () => ({}) };
  const Recorder = class {
    static isTypeSupported() {
      return true;
    }
  };
  assert.equal(videoRecordingSupported({ canvas, MediaRecorderCtor: Recorder }), true);
  assert.equal(videoRecordingSupported({ canvas: {}, MediaRecorderCtor: Recorder }), false);
  assert.equal(videoRecordingSupported({ canvas, MediaRecorderCtor: null }), false);
  assert.equal(
    videoRecordingSupported({ canvas, MediaRecorderCtor: class { static isTypeSupported() { return false; } } }),
    false
  );
});

test('the recorder resolves with the whole file, tail included', async () => {
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  const canvas = { captureStream: () => ({ getTracks: () => tracks }) };
  let instance = null;
  class FakeRecorder {
    static isTypeSupported(type) {
      return type.startsWith('video/webm');
    }

    constructor(stream, options) {
      this.stream = stream;
      this.options = options;
      this.state = 'inactive';
      instance = this;
    }

    start() {
      this.state = 'recording';
      this.ondataavailable({ data: new Blob(['abcd']) });
    }

    stop() {
      this.state = 'inactive';
      // The chunk that arrives *after* stop() is the one a naive
      // `setTimeout`-and-read loses.
      this.ondataavailable({ data: new Blob(['abcdef']) });
      this.onstop();
    }
  }

  const recorder = createCanvasRecorder({ canvas, MediaRecorderCtor: FakeRecorder, fps: 30 });
  assert.equal(recorder.mimeType, 'video/webm;codecs=vp9');
  assert.equal(instance.options.mimeType, 'video/webm;codecs=vp9');
  recorder.start();
  const blob = await recorder.stop();
  assert.equal(blob.size, 10, 'both chunks should be in the file');
  assert.equal(tracks[0].stopped, true, 'the capture stream should be released');
});

test('a recorder that fails rejects rather than writing an empty file', async () => {
  const canvas = { captureStream: () => ({ getTracks: () => [] }) };
  class FailingRecorder {
    static isTypeSupported() {
      return true;
    }

    constructor() {
      this.state = 'inactive';
      // eslint-disable-next-line no-constructor-return
      FailingRecorder.last = this;
    }

    start() {
      this.state = 'recording';
      this.onerror({ error: new Error('encoder gave up') });
    }

    stop() {
      this.state = 'inactive';
      this.onstop();
    }
  }
  const recorder = createCanvasRecorder({ canvas, MediaRecorderCtor: FailingRecorder });
  recorder.start();
  await assert.rejects(() => recorder.stop(), /encoder gave up/);
});

// --- the exported frame -----------------------------------------------------

/** Records what was painted, in the order it was painted. */
function fakeContext() {
  const calls = { text: [], rects: [], fonts: [], gradients: [] };
  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    save() {},
    restore() {},
    fillRect(x, y, width, height) {
      calls.rects.push({ x, y, width, height, fillStyle: this.fillStyle });
    },
    // Enough of a gradient to record what was asked for: the card backing
    // fades at its foot, and the stops are the thing that has to match the
    // stylesheet.
    createLinearGradient(x0, y0, x1, y1) {
      const gradient = { x0, y0, x1, y1, stops: [], addColorStop(offset, colour) { this.stops.push([offset, colour]); } };
      calls.gradients.push(gradient);
      return gradient;
    },
    fillText(text, x, y) {
      calls.text.push({ text, x, y, alpha: this.globalAlpha, font: this.font });
      calls.fonts.push(this.font);
    },
    measureText(text) {
      // Font-aware, and full-width where the language is. A flat cost per
      // character measures nothing: it made a three-line Japanese caveat look
      // like one line, which is how a footer that fell off the bottom of the
      // frame passed every test in this file.
      const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 10);
      return {
        width: [...String(text)].reduce((total, character) => total + (/[\x20-\x7e]/.test(character) ? 0.55 : 1) * size, 0),
      };
    },
    drawImage() {},
  };
}

const FRAME = {
  title: { text: 'The lung cannot empty in time', opacity: 1, variant: 'hook' },
  subtitle: { text: 'twelve units, one time constant each', opacity: 1 },
  cards: {
    opacity: 1,
    items: [
      { label: 'Normal', headlineKey: 'IC', headline: '3.1', headlineUnit: 'L', rows: ['EELV 2.4 L'] },
      { label: 'COPD', headlineKey: 'IC', headline: '1.8', headlineUnit: 'L', rows: ['EELV 4.1 L'] },
    ],
  },
  marker: { text: 'breath 6', sub: 'expiration', opacity: 1 },
  badge: { text: 'air left behind', opacity: 1 },
  caption: { text: 'Each breath starts before the last one finished', opacity: 1 },
  note: { text: 'conceptual model · not a diagnosis', opacity: 1 },
};

const PROVENANCE = {
  title: 'COPD',
  caveat: 'Conceptual model — not a diagnosis.',
  credit: 'medical-3d-lab · #/copd',
};

test('every text slot the overlay would show is painted into the file', () => {
  const ctx = fakeContext();
  paintReelFrame(ctx, { frame: FRAME, width: 1080, height: 1920, provenance: PROVENANCE });
  const painted = ctx.calls.text.map((entry) => entry.text).join('\n');
  for (const expected of [
    'lung cannot empty',
    'twelve units',
    'Normal',
    'COPD',
    '3.1',
    'EELV 2.4 L',
    'breath 6',
    'expiration',
    'air left behind',
    'Each breath starts',
    'conceptual model',
  ]) {
    assert.ok(painted.includes(expected.split(' ')[0]), `"${expected}" is missing from the exported frame`);
  }
  assert.ok(painted.includes('Conceptual model'), 'the caveat must travel with the file');
  assert.ok(painted.includes('medical-3d-lab'), 'the credit must travel with the file');
});

test('a card labels its figure rather than shouting the label', () => {
  // The first exported frame read "吸う余地 3.72 L" with the words as tall as
  // the number: the key, the figure and the unit were painted as one string at
  // the figure's size. They are one line of three sizes, as they are on screen.
  const ctx = fakeContext();
  paintReelFrame(ctx, { frame: FRAME, width: 1080, height: 1920, provenance: PROVENANCE });
  const sizeOf = (text) => {
    const entry = ctx.calls.text.find((call) => call.text === text);
    assert.ok(entry, `"${text}" was not painted`);
    return Number(entry.font.match(/([\d.]+)px/)[1]);
  };
  assert.ok(sizeOf('3.1') > sizeOf('IC') * 2, 'the figure must dwarf its key');
  assert.ok(sizeOf('3.1') > sizeOf('L') * 2, 'the figure must dwarf its unit');
  assert.ok(sizeOf('Normal') < sizeOf('3.1'), 'the card name is not the headline');
  // One line, one baseline: all three are painted at the same y.
  const ys = ['IC', '3.1', 'L'].map((text) => ctx.calls.text.find((call) => call.text === text).y);
  assert.equal(new Set(ys).size, 1, `the figure's parts do not share a baseline: ${ys.join(', ')}`);
});

test('the provenance footer is painted even on an empty frame', () => {
  // The frame between cues has no caption at all. A file whose footer came and
  // went with the captions would be a file somebody could screenshot without
  // it — which is the whole reason the footer exists.
  const ctx = fakeContext();
  paintReelFrame(ctx, { frame: {}, width: 1080, height: 1920, provenance: PROVENANCE });
  const painted = ctx.calls.text.map((entry) => entry.text).join('\n');
  assert.ok(painted.includes('COPD'));
  assert.ok(painted.includes('Conceptual model'));
  assert.ok(ctx.calls.rects.length >= 1, 'the footer band should be filled');
  const band = ctx.calls.rects[ctx.calls.rects.length - 1];
  assert.equal(band.width, 1080);
  assert.ok(band.y + band.height <= 1920.001, 'the band sits at the bottom of the frame');
  for (const entry of ctx.calls.text) {
    assert.equal(entry.alpha, 1, 'the footer is never faded');
  }
});

test('a long caveat grows the footer instead of falling off the frame', () => {
  // Heart failure's own sentence runs to three lines at 9:16. With a fixed
  // band its last character and the source line were painted below the bottom
  // edge of the video: the one part of the file that may never be croppable,
  // cropped by the file itself.
  const ctx = fakeContext();
  const caveat =
    '教育用の模式図です。HFrEF の一例であり、すべての心不全がこの経過をたどるわけではありません。'
    + '数値は代表的な範囲に較正したモデルの出力で、特定の患者さんの計測値ではありません。';
  paintReelFrame(ctx, {
    frame: {},
    width: 1080,
    height: 1920,
    provenance: { title: '心不全', caveat, credit: 'medical-3d-lab · #/heart-failure' },
  });
  const band = ctx.calls.rects[ctx.calls.rects.length - 1];
  const footerLines = ctx.calls.text;
  const firstLine = footerLines[0];
  const lastLine = footerLines[footerLines.length - 1];
  const unit = 1080 / 100;
  assert.ok(footerLines.length > 3, 'the caveat should have wrapped');
  assert.ok(lastLine.y + 2 * unit <= 1920, `the last line is painted at ${lastLine.y}, below the frame`);
  // Inside the band at both ends: a band that grew while the text kept
  // starting where the old one did just moves the overflow down a line.
  assert.ok(firstLine.y >= band.y, 'the footer starts inside its band');
  assert.ok(firstLine.y <= band.y + 3 * unit, `the footer starts ${firstLine.y - band.y}px into a band it should be at the top of`);
  // The band grew: a fixed 11 units is 118px at this width.
  assert.ok(band.height > 11 * (1080 / 100), `the band did not grow (${band.height}px)`);
});

test('the painter lays out each format the way the stylesheet does', () => {
  // The frame's shape changes ten values in `reel.css` — a 16:9 frame has far
  // less vertical room, so the figures shrink and the bands tighten. The
  // painter ignored all of it and drew every format as 9:16, which put the
  // card figures across the middle of the model in a 16:9 export: the reader
  // saw one layout and the file carried another. Measured by reading the
  // stylesheet, so the table cannot drift away from it either.
  const valueOf = cssValue;
  const em = (value) => (value === null ? null : Number.parseFloat(value));
  const fraction = (value) => (value === null ? null : Number.parseFloat(value) / 100);
  const forFormat = (format, selector, property, read) => {
    const scoped = format === 'reel' ? null : read(valueOf(`.reel-frame[data-format='${format}'] ${selector}`, property));
    return scoped ?? read(valueOf(selector, property));
  };

  for (const format of REEL_FORMATS) {
    const table = FORMAT_LAYOUT_TABLE[format.id];
    assert.ok(table, `${format.id} has no layout`);
    const expected = {
      cardFigure: forFormat(format.id, '.reel-card-ef', 'font-size', em),
      hook: forFormat(format.id, ".reel-title[data-variant='hook']", 'font-size', em),
      takeHome: forFormat(format.id, ".reel-title[data-variant='take-home']", 'font-size', em),
      caption: forFormat(format.id, '.reel-caption', 'font-size', em),
      cardsTop: forFormat(format.id, '.reel-cards', 'top', fraction),
      markerTop: forFormat(format.id, '.reel-marker', 'top', fraction),
      badgeTop: forFormat(format.id, '.reel-residual', 'top', fraction),
      bottomBand: forFormat(format.id, '.reel-bottom', 'bottom', fraction),
      takeHomeBottom: forFormat(format.id, ".reel-centre:has(.reel-title[data-variant='take-home'])", 'bottom', fraction),
    };
    for (const [key, value] of Object.entries(expected)) {
      assert.ok(value !== null && Number.isFinite(value), `${format.id}: could not read ${key} from reel.css`);
      assert.equal(table[key], value, `${format.id}: the painter uses ${table[key]} for ${key}, the stylesheet says ${value}`);
    }
  }
});

test('the painted frame uses its own format\'s sizes, not the default ones', () => {
  // The table being right is half of it: the painter could hold a correct
  // table and paint every frame at 9:16 anyway, which is what it did. This
  // reads the sizes back out of what was painted.
  for (const format of REEL_FORMATS) {
    const table = FORMAT_LAYOUT_TABLE[format.id];
    const unit = format.width / 100;
    const ctx = fakeContext();
    paintReelFrame(ctx, { frame: FRAME, width: format.width, height: format.height, provenance: PROVENANCE, format: format.id });
    // A long line wraps, so what was painted is its first line rather than the
    // whole string — the size and the position are on that call either way.
    const call = (text) => {
      const found = ctx.calls.text.find((entry) => entry.text.length > 2 && text.startsWith(entry.text.trim()));
      assert.ok(found, `${format.id}: "${text}" was not painted`);
      return found;
    };
    const sizeOf = (text) => Number(/([\d.]+)px/.exec(call(text).font)[1]);
    assert.ok(
      Math.abs(sizeOf('3.1') - table.cardFigure * unit) < 0.01,
      `${format.id}: the card figure is ${sizeOf('3.1')}px, the format asks for ${table.cardFigure * unit}px`
    );
    assert.ok(
      Math.abs(sizeOf(FRAME.title.text) - table.hook * unit) < 0.01,
      `${format.id}: the headline is ${sizeOf(FRAME.title.text)}px, the format asks for ${table.hook * unit}px`
    );
    assert.ok(
      Math.abs(sizeOf(FRAME.caption.text) - table.caption * unit) < 0.01,
      `${format.id}: the caption is ${sizeOf(FRAME.caption.text)}px, the format asks for ${table.caption * unit}px`
    );
    // And the cards start where this format puts them.
    assert.ok(
      Math.abs(call('Normal').y - format.height * table.cardsTop) < 1,
      `${format.id}: the cards start at ${Math.round(call('Normal').y)}, the format asks for ${Math.round(format.height * table.cardsTop)}`
    );

    // The take-home is a second frame, and a second size.
    const takeHome = fakeContext();
    paintReelFrame(takeHome, {
      frame: { title: { text: 'Emptying is the problem', opacity: 1, variant: 'take-home' } },
      width: format.width,
      height: format.height,
      provenance: PROVENANCE,
      format: format.id,
    });
    const headline = takeHome.calls.text.find((entry) => 'Emptying is the problem'.startsWith(entry.text.trim()) && entry.text.length > 2);
    const size = Number(/([\d.]+)px/.exec(headline.font)[1]);
    assert.ok(
      Math.abs(size - table.takeHome * unit) < 0.01,
      `${format.id}: the take-home is ${size}px, the format asks for ${table.takeHome * unit}px`
    );
  }
});

test('a short frame backs the figures, and only where the stylesheet does', () => {
  // At 16:9 and 1:1 the comparison fills the frame, so the figures are read
  // over the model. Moving them has nowhere to go and pulling the camera back
  // shrinks the subject to make room for its own caption (F-171), so they get
  // the backing the marker already uses — in the app and in the file, from one
  // decision rather than two.
  for (const format of REEL_FORMATS) {
    const declared = cssValue(`.reel-frame[data-format='${format.id}'] .reel-cards`, 'background');
    const table = FORMAT_LAYOUT_TABLE[format.id];
    assert.equal(
      table.cardBackdrop,
      declared !== null,
      `${format.id}: the painter ${table.cardBackdrop ? 'backs' : 'does not back'} the cards and the stylesheet ${declared ? 'does' : 'does not'}`
    );
    if (declared) {
      // Same stops, in the same order, on both surfaces: the reader sees one
      // of them and the file carries the other.
      const stops = [...declared.matchAll(/(rgba?\([^)]*\))\s*([\d.]+)%/g)].map(([, colour, offset]) => [
        Number(offset) / 100,
        colour,
      ]);
      assert.deepEqual(stops, CARD_BACKDROP_STOPS.map(([offset, colour]) => [offset, colour]),
        `${format.id}: the stylesheet fades the card backing differently from the painter`);
    }

    const ctx = fakeContext();
    paintReelFrame(ctx, { frame: FRAME, width: format.width, height: format.height, provenance: PROVENANCE, format: format.id });
    const gradient = ctx.calls.gradients[0] ?? null;
    const backdrop = ctx.calls.rects.find((rect) => rect.fillStyle === gradient);
    assert.equal(Boolean(backdrop), table.cardBackdrop, `${format.id}: the painted backdrop does not match the table`);
    if (!backdrop) continue;
    assert.deepEqual(gradient.stops, CARD_BACKDROP_STOPS.map(([offset, colour]) => [offset, colour]));
    // The fade runs down the band, not across it.
    assert.equal(gradient.x0, gradient.x1);
    assert.ok(gradient.y1 > gradient.y0);

    // It has to be under the figures it backs, and cover them.
    const figure = ctx.calls.text.find((call) => call.text === '3.1');
    assert.ok(backdrop.y <= figure.y, `${format.id}: the backdrop starts below the figure it backs`);
    // The bottom of the last line, not its top: a backdrop measured without the
    // small rows under the figure still clears their *top* edge, and covers
    // none of them.
    const rows = ctx.calls.text.filter((call) => call.text.startsWith('EELV'));
    const lowest = Math.max(...rows.map((call) => call.y + Number(/([\d.]+)px/.exec(call.font)[1]) * 1.25));
    assert.ok(
      backdrop.y + backdrop.height >= lowest,
      `${format.id}: the backdrop ends at ${Math.round(backdrop.y + backdrop.height)} and the card runs to ${Math.round(lowest)}`
    );
  }
});

test('no format paints the caption or the take-home under the footer', () => {
  // The footer is sized in width units; the bottom-anchored blocks were placed
  // as a fraction of the height. Independent of each other, they collided at
  // 16:9 — and the footer is drawn last and opaque, so what disappeared was the
  // note that reads "not a diagnosis". Checked at every shape the sequence
  // offers, because 9:16 alone would never have shown it.
  //
  // With a caveat long enough to wrap, too. The first version of this test used
  // a one-line fixture, which is what let the same collision survive on the
  // take-home after it had been fixed on the caption: a review found it, at
  // 1920×1080, on the scene whose caveat is longest (L-60).
  const LONG = {
    title: '門脈圧亢進症',
    caveat:
      '概念的なネットワークモデルです。HVPG ではなく門脈圧較差で、腹水は扱いません。'
      + '診断には使用できません。数値は代表的な範囲に較正したモデルの出力です。',
    credit: 'medical-3d-lab · #/portal-hypertension',
  };
  for (const format of REEL_FORMATS) {
    const ctx = fakeContext();
    const note = 'conceptual model · not a diagnosis';
    paintReelFrame(ctx, {
      frame: {
        caption: { text: 'Each breath starts before the last one finished', opacity: 1 },
        note: { text: note, opacity: 1 },
        title: { text: 'Emptying is the problem', opacity: 1, variant: 'take-home' },
      },
      width: format.width,
      height: format.height,
      provenance: LONG,
    });
    const band = ctx.calls.rects[ctx.calls.rects.length - 1];
    assert.equal(band.width, format.width, `${format.label}: the last rectangle should be the footer band`);
    const painted = ctx.calls.text.find((call) => call.text === note);
    assert.ok(painted, `${format.label}: the note was not painted at all`);
    const size = Number(/([\d.]+)px/.exec(painted.font)[1]);
    assert.ok(
      painted.y + size <= band.y,
      `${format.label}: the note is painted at ${Math.round(painted.y)} and the opaque footer starts at ${Math.round(band.y)}`
    );
    // The take-home is the sentence the file ends on, and it grows upward from
    // its own anchor — so it needs the same clamp, measured with its own size.
    const headline = ctx.calls.text.find((call) => 'Emptying is the problem'.startsWith(call.text.trim()) && call.text.length > 2);
    assert.ok(headline, `${format.label}: the take-home was not painted`);
    const headlineSize = Number(/([\d.]+)px/.exec(headline.font)[1]);
    assert.ok(
      headline.y + headlineSize <= band.y,
      `${format.label}: the take-home is painted at ${Math.round(headline.y)} and the opaque footer starts at ${Math.round(band.y)}`
    );
    // And above the caption band, not on the same line as it. Clamping both to
    // the footer gave them the same ceiling, which read as two sentences
    // printed on top of each other — measured in a 16:9 recording of portal
    // hypertension, where the take-home sat across the note.
    assert.ok(
      headline.y + headlineSize <= painted.y,
      `${format.label}: the take-home runs to ${Math.round(headline.y + headlineSize)} and the note starts at ${Math.round(painted.y)}`
    );
    const captionLine = ctx.calls.text.find(
      (call) => call.text.length > 2 && 'Each breath starts before the last one finished'.startsWith(call.text.trim())
    );
    assert.ok(captionLine, `${format.label}: the caption was not painted`);
    assert.ok(
      headline.y + headlineSize <= captionLine.y,
      `${format.label}: the take-home overlaps the caption`
    );

    // The state the recording was actually in when the overlap was seen: the
    // caption has faded and the note has not, so the note alone decides how
    // much room is left. A ceiling computed from the caption's height only is
    // right whenever both are up, and wrong exactly here.
    const noteOnly = fakeContext();
    paintReelFrame(noteOnly, {
      frame: {
        caption: { text: 'Each breath starts before the last one finished', opacity: 0 },
        note: { text: note, opacity: 1 },
        title: { text: 'Emptying is the problem', opacity: 1, variant: 'take-home' },
      },
      width: format.width,
      height: format.height,
      provenance: LONG,
      format: format.id,
    });
    const aloneNote = noteOnly.calls.text.find((call) => call.text === note);
    const aloneHead = noteOnly.calls.text.find(
      (call) => call.text.length > 2 && 'Emptying is the problem'.startsWith(call.text.trim())
    );
    const aloneSize = Number(/([\d.]+)px/.exec(aloneHead.font)[1]);
    assert.ok(
      aloneHead.y + aloneSize <= aloneNote.y,
      `${format.label}: with the caption faded, the take-home runs to ${Math.round(aloneHead.y + aloneSize)} and the note starts at ${Math.round(aloneNote.y)}`
    );
  }
});

test('a faded slot is not painted', () => {
  const ctx = fakeContext();
  paintReelFrame(ctx, {
    frame: { caption: { text: 'gone', opacity: 0 }, note: { text: 'here', opacity: 1 } },
    width: 1080,
    height: 1920,
    provenance: PROVENANCE,
  });
  const painted = ctx.calls.text.map((entry) => entry.text).join('\n');
  assert.ok(!painted.includes('gone'));
  assert.ok(painted.includes('here'));
});

test('the take-home sits above the bottom band rather than under the footer', () => {
  const ctx = fakeContext();
  paintReelFrame(ctx, {
    frame: { title: { text: 'Emptying is the problem', opacity: 1, variant: 'take-home' } },
    width: 1080,
    height: 1920,
    provenance: PROVENANCE,
  });
  const headline = ctx.calls.text.find((entry) => entry.text.includes('Emptying'));
  assert.ok(headline, 'the take-home should be painted');
  assert.ok(headline.y < 1920 * 0.8, `the take-home is anchored bottom, not top (y=${headline.y})`);
});

test('a closing character overhangs rather than starting a line', () => {
  // A lone "。" under the heart failure footer, on a line of its own: the
  // closing character of the sentence that bounds the model, orphaned by
  // per-character wrapping.
  const ctx = fakeContext();
  ctx.font = '10px sans';
  const sentence = '教育用の模式図です。HFrEF の一例であり、すべての心不全がこの経過をたどるわけではありません。';
  for (let width = 60; width <= 200; width += 7) {
    for (const line of wrapLines(ctx, sentence, width)) {
      assert.ok(!/^[。、」）？！]/.test(line), `a line starts with "${line[0]}" at width ${width}`);
    }
  }
  assert.equal(wrapLines(ctx, sentence, 120).join(''), sentence, 'nothing is dropped to achieve it');
});

test('Japanese wraps by character and English by word', () => {
  const ctx = fakeContext();
  ctx.font = '10px sans';
  const english = wrapLines(ctx, 'one two three four five six', 100);
  assert.ok(english.length > 1);
  assert.ok(english.every((line) => line.length <= 20), english.join(' | '));
  const japanese = wrapLines(ctx, '呼気が時間内に終わらないまま次の吸気が始まります', 100);
  assert.ok(japanese.length > 1, 'a Japanese sentence has no spaces to break on');
  assert.ok(japanese.every((line) => line.length <= 11), japanese.join(' | '));
  assert.equal(japanese.join(''), '呼気が時間内に終わらないまま次の吸気が始まります');
});

// --- the controls inside the sequence ---------------------------------------

test('the whole control row goes quiet while a recording runs', () => {
  // A recording composites into a canvas sized when it began, so changing the
  // format part-way stretches the rest of the frames into the old shape — and
  // the chip that changed it is the one the file would have been named after.
  // Restart would put the sequence back to zero in the middle of the take.
  const restore = installFakeDocument();
  try {
    const formats = REEL_FORMATS.map((format) => ({ ...format }));
    const chrome = createReelChrome({
      formats,
      currentFormatId: 'reel',
      onFormat: () => {},
      onRestart: () => {},
      onExit: () => {},
      onDownload: () => {},
    });
    const chips = findByClass(chrome.element, 'reel-chip');
    const exitChip = chips.find((chip) => chip.classList.contains('is-exit'));
    const quietable = chips.filter((chip) => chip !== exitChip && !chip.classList.contains('is-download'));
    assert.equal(quietable.length, formats.length + 1, 'every format chip and the restart chip');

    chrome.setDownloadLabel({ en: 'Recording…', ja: '録画中…' }, { busy: true });
    for (const chip of quietable) {
      assert.equal(chip.disabled, true, 'a control stayed live during the recording');
      assert.equal(chip.attributes.get('aria-disabled'), 'true');
    }
    // Leaving is always available: a reader is never trapped in a recording.
    assert.notEqual(exitChip.disabled, true);

    chrome.setDownloadLabel({ en: 'Download video', ja: '動画を保存' }, { busy: false });
    for (const chip of quietable) assert.equal(chip.disabled, false, 'a control stayed disabled after the recording');
  } finally {
    restore();
  }
});

// --- the consent screen -----------------------------------------------------

const SUBJECT = {
  title: 'COPD',
  titleJa: 'COPD',
  caveat: 'Conceptual model — not a diagnosis.',
  caveatJa: '概念モデル｜診断には使用できません。',
};

function openDialog({ onAgree = () => {}, onCancel = () => {} } = {}) {
  const terms = videoConsentTerms('copd-hyperinflation');
  const host = new FakeElement('div');
  const dialog = createVideoConsentDialog({ terms, subject: SUBJECT, onAgree, onCancel });
  dialog.open(host);
  return { terms, host, dialog };
}

test('the consent screen cannot be agreed to until every clause is ticked', () => {
  const restore = installFakeDocument();
  try {
    let agreed = 0;
    const { terms, dialog } = openDialog({ onAgree: () => { agreed += 1; } });
    const agree = findByClass(dialog.element, 'video-consent-agree')[0];
    const boxes = findByClass(dialog.element, 'video-consent-box');
    assert.equal(boxes.length, terms.clauses.length);
    assert.equal(agree.disabled, true);

    // Pressing it anyway does nothing: the rule is asked again, not assumed
    // from the attribute.
    agree.click();
    assert.equal(agreed, 0);

    boxes.forEach((box, index) => {
      box.checked = true;
      box.dispatchEvent({ type: 'change', target: box });
      const last = index === boxes.length - 1;
      assert.equal(agree.disabled, !last, `after ${index + 1} of ${boxes.length} ticks`);
    });

    agree.click();
    assert.equal(agreed, 1);
    assert.deepEqual(dialog.acknowledged.sort(), terms.clauses.map((clause) => clause.id).sort());
  } finally {
    restore();
  }
});

test('un-ticking a clause closes the door again', () => {
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const agree = findByClass(dialog.element, 'video-consent-agree')[0];
    const boxes = findByClass(dialog.element, 'video-consent-box');
    for (const box of boxes) {
      box.checked = true;
      box.dispatchEvent({ type: 'change', target: box });
    }
    assert.equal(agree.disabled, false);
    boxes[0].checked = false;
    boxes[0].dispatchEvent({ type: 'change', target: boxes[0] });
    assert.equal(agree.disabled, true);
  } finally {
    restore();
  }
});

test('cancelling writes nothing and hands focus back', () => {
  const restore = installFakeDocument();
  try {
    let agreed = 0;
    let cancelled = 0;
    const opener = new FakeElement('button');
    opener.focus();
    const { dialog } = openDialog({ onAgree: () => { agreed += 1; }, onCancel: () => { cancelled += 1; } });
    findByClass(dialog.element, 'video-consent-cancel')[0].click();
    assert.equal(cancelled, 1);
    assert.equal(agreed, 0);
    assert.equal(globalThis.document.activeElement, opener, 'focus returns to where it came from');
    // A second close does not fire a second answer.
    dialog.close();
    assert.equal(cancelled, 1);
  } finally {
    restore();
  }
});

test('Escape cancels, and the listener does not outlive the dialog', () => {
  const restore = installFakeDocument();
  try {
    let cancelled = 0;
    const { dialog } = openDialog({ onCancel: () => { cancelled += 1; } });
    const listeners = [...(globalThis.document.listeners.get('keydown') ?? [])];
    assert.equal(listeners.length, 1);
    listeners[0]({ key: 'Escape' });
    assert.equal(cancelled, 1);
    assert.equal(globalThis.document.listeners.get('keydown').size, 0, 'the listener is removed on close');
    void dialog;
  } finally {
    restore();
  }
});

test('the screen says what the model is, in the scene\'s own words', () => {
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const subject = findByClass(dialog.element, 'video-consent-subject')[0];
    const text = subject.children.map((child) => child.textContent).join(' ');
    assert.ok(text.includes(SUBJECT.caveat), 'the English disclaimer is quoted');
    assert.ok(text.includes(SUBJECT.caveatJa), 'the Japanese disclaimer is quoted');
    // Both languages are in the DOM and each is marked, so a screen reader
    // does not announce one with the other's phonemes.
    const en = subject.children.find((child) => child.classList.contains('lang-en'));
    const ja = subject.children.find((child) => child.classList.contains('lang-ja'));
    assert.equal(en.attributes.get('lang'), 'en');
    assert.equal(ja.attributes.get('lang'), 'ja');
  } finally {
    restore();
  }
});

test('Tab stays inside the dialog, and the console behind it goes quiet', () => {
  const restore = installFakeDocument();
  try {
    const host = new FakeElement('div');
    const console_ = new FakeElement('div');
    host.append(console_);
    const terms = videoConsentTerms('copd-hyperinflation');
    const dialog = createVideoConsentDialog({ terms, subject: SUBJECT, onAgree: () => {}, onCancel: () => {} });
    dialog.open(host);

    // `aria-modal` tells a screen reader and stops nothing: what keeps a reader
    // from tabbing into a model control mid-decision is this.
    assert.equal(console_.inert, true, 'the surface behind the dialog should be inert');

    const keydown = [...globalThis.document.listeners.get('keydown')][0];
    const boxes = findByClass(dialog.element, 'video-consent-box');
    const link = findByClass(dialog.element, 'video-consent-terms')[0];
    const first = boxes[0];

    // Forward off the last stop wraps to the first.
    link.focus();
    let prevented = 0;
    keydown({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented += 1; } });
    assert.equal(globalThis.document.activeElement, first);
    // Backward off the first wraps to the last.
    keydown({ key: 'Tab', shiftKey: true, preventDefault: () => { prevented += 1; } });
    assert.equal(globalThis.document.activeElement, link);
    assert.equal(prevented, 2, 'the browser must not also move focus');

    dialog.close();
    assert.equal(console_.inert, false, 'the surface comes back when the dialog goes');
  } finally {
    restore();
  }
});

test('the screen opens at its first sentence, not at its buttons', () => {
  // Focus used to go to Cancel, at the bottom of a panel that scrolls on a
  // phone — so the browser scrolled it into view and the consent screen opened
  // past its own title and intro. Photographed by `npm run shots:phone`.
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const panel = findByClass(dialog.element, 'video-consent-panel')[0];
    assert.equal(globalThis.document.activeElement, panel, 'focus belongs on the dialog, not on a control');
    assert.equal(panel.attributes.get('tabindex'), '-1', 'a dialog that takes focus has to be focusable');
    assert.equal(panel.scrollTop, 0, 'it opens at the top of the agreement');
  } finally {
    restore();
  }
});

test('the version the reader is agreeing to is on the screen', () => {
  // The terms carry a version and nothing stores the answer, so the only place
  // that version can mean anything is in front of the reader.
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const shown = findByClass(dialog.element, 'video-consent-version')[0];
    assert.ok(shown, 'the dialog should state which terms these are');
    // Each language on its own: the interface shows one of them, so a version
    // that is only in the other is a version that reader never sees.
    for (const language of ['en', 'ja']) {
      const span = shown.children.find((child) => child.classList.contains(`lang-${language}`));
      assert.ok(span, `no ${language} version line`);
      assert.ok(
        span.textContent.includes(VIDEO_TERMS_VERSION),
        `the ${language} line reads "${span.textContent}" and does not name ${VIDEO_TERMS_VERSION}`
      );
    }
  } finally {
    restore();
  }
});

test('shift-Tab off the dialog itself stays inside it', () => {
  // The dialog opens with focus on the panel. Forward, the browser reaches the
  // first control by itself; backward, it would leave the dialog — the one
  // direction a trap exists for, and the one the first version let through.
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const panel = findByClass(dialog.element, 'video-consent-panel')[0];
    const link = findByClass(dialog.element, 'video-consent-terms')[0];
    assert.equal(globalThis.document.activeElement, panel);
    const keydown = [...globalThis.document.listeners.get('keydown')][0];
    let prevented = 0;
    keydown({ key: 'Tab', shiftKey: true, preventDefault: () => { prevented += 1; } });
    assert.equal(globalThis.document.activeElement, link, 'it wraps to the last control');
    assert.equal(prevented, 1);
  } finally {
    restore();
  }
});

test('no key reaches the scene behind the open dialog', () => {
  // The app binds Space / R / H / C / arrows on `window`; this listener is on
  // `document`, one step below it. Without stopping propagation, Escape closed
  // the dialog *and* exited the sequence underneath it, and every other
  // shortcut drove a model the reader could not see.
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const keydown = [...globalThis.document.listeners.get('keydown')][0];
    const seen = [];
    for (const key of ['r', 'Escape']) {
      let stopped = 0;
      keydown({ key, preventDefault: () => {}, stopPropagation: () => { stopped += 1; } });
      seen.push([key, stopped]);
    }
    assert.deepEqual(seen, [['r', 1], ['Escape', 1]], 'every key is stopped, not only the one that closes');
    void dialog;
  } finally {
    restore();
  }
});

test('the terms open beside the decision, not instead of it', () => {
  // The route *is* the app: following `#/terms` in place tears down the scene,
  // the sequence and the half-ticked agreement on top of it. `credentialForm`
  // links the same document the same way.
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const link = findByClass(dialog.element, 'video-consent-terms')[0];
    assert.equal(link.attributes.get('href'), '#/terms');
    assert.equal(link.attributes.get('target'), '_blank');
    assert.equal(link.attributes.get('rel'), 'noopener');
  } finally {
    restore();
  }
});

test('the dialog is announced as one', () => {
  const restore = installFakeDocument();
  try {
    const { dialog } = openDialog();
    const panel = findByClass(dialog.element, 'video-consent-panel')[0];
    assert.equal(panel.attributes.get('role'), 'dialog');
    assert.equal(panel.attributes.get('aria-modal'), 'true');
    const labelledBy = panel.attributes.get('aria-labelledby');
    assert.ok(findByClass(dialog.element, 'video-consent-title')[0].attributes.get('id') === labelledBy);
  } finally {
    restore();
  }
});

test('the sequence controls stay on the screen they are drawn on', () => {
  // The row gained a download control, and at 390px that pushed the 9:16 chip
  // off the left and "Exit (Esc)" off the right — a control a reader cannot
  // reach, on the surface whose whole job is to be recorded. Read as rules
  // rather than searched as text (L-02/L-03/L-04).
  const css = readFileSync(new URL('../src/styles/reel.css', import.meta.url), 'utf8');
  const rules = rulesNaming(css, '.reel-chrome');
  assert.ok(rules.length, '.reel-chrome should be styled');
  const body = rules.map((rule) => rule.body).join(';');
  assert.equal(declaration(body, 'flex-wrap'), 'wrap', 'the row has to wrap when it runs out of width');
  assert.match(declaration(body, 'max-width') ?? '', /100vw/, 'and be bounded by the viewport');
});

test('the catalogue and the manifest agree about what is public', () => {
  // Guards the guard above: if `PUBLIC_MODELS` held ids the catalogue does not
  // know, the β check would be passing on scenes that do not exist — every one
  // of which is refused with "no scene named", for the wrong reason.
  for (const model of PUBLIC_MODELS) {
    assert.ok(PUBLIC_SCENES.some((entry) => entry.id === model.sceneId), `${model.sceneId} is published but not in PUBLIC_SCENES`);
  }
});
