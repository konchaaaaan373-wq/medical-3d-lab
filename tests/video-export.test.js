import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { declaration, rulesNaming } from '../scripts/lib/css.mjs';

import {
  VIDEO_CLAUSE,
  VIDEO_TERMS_VERSION,
  consentComplete,
  consentMissing,
  videoConsentTerms,
  videoExportOffered,
  videoExportProblems,
  videoFileName,
} from '../src/app/videoExport.js';
import {
  PROHIBITED_USE_COPY,
  VIDEO_CLAUSE_COPY,
  VIDEO_CONTENTS_COPY,
  VIDEO_EXPORT_COPY,
  clauseSentence,
} from '../src/data/videoExport.js';
import { paintReelFrame, wrapLines } from '../src/app/reelFramePainter.js';
import {
  VIDEO_MIME_CANDIDATES,
  createCanvasRecorder,
  extensionForMimeType,
  pickVideoMimeType,
  videoRecordingSupported,
} from '../src/app/videoRecorder.js';
import { createVideoConsentDialog } from '../src/components/VideoConsentDialog.js';
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

const ANIMATED_SCENES = ['copd-hyperinflation', 'asthma-heterogeneity', 'heart-failure', 'portal-hypertension', 'hepatorenal-syndrome'];

// --- who may export at all --------------------------------------------------

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
  const calls = { text: [], rects: [], fonts: [] };
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
