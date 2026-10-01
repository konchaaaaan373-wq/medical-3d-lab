import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { foldsAboutThisModel, modelLocation, scopeInAboutFold } from '../src/app/modelLocation.js';
import { anatomyChecksFor } from '../src/catalog/anatomyLinks.js';
import { SCENES, sceneById } from '../src/catalog/index.js';
import { isSceneReleased } from '../src/catalog/release.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { clinicalReviewPresentation, reviewDateLabel } from '../src/catalog/clinicalReview.js';
import { isPathologyModelScene } from '../src/catalog/pathologyModels.js';
import { createModelScopePanel } from '../src/components/ModelScopePanel.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';
import { declaration, rulesOf } from '../scripts/lib/css.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The model screen's shell (ADR 2026-09-30): where the model sits, the way to
 * its anatomy, and 「このモデルについて」 — the same for every disease model, so
 * a new model gets them from the catalogue rather than by writing them.
 */

test('model shell: a disease model says 病態モデル / its system, and goes back to #/models', () => {
  const location = modelLocation(sceneById('cardiac-output'));
  assert.equal(location.kind, 'disease');
  assert.equal(location.parent.href, '#/models');
  assert.equal(location.parent.ja, '病態モデル');
  assert.deepEqual(location.where, { ja: '循環', en: 'Circulation' });
  // Every disease model in the catalogue has a system the trail can name.
  for (const scene of SCENES.filter(isPathologyModelScene)) {
    assert.ok(modelLocation(scene).where, `${scene.id}: no system label for "${scene.system}"`);
  }
});

test('model shell: only a disease model\'s title card carries the trail — an anatomy card stays the height it was', () => {
  // An anatomy scene's header names its organ already (the organ strip). A
  // trail on its title card said it twice and covered the brain's front-top
  // corner at 1280x800: the card is not a band the camera frames around, so a
  // taller one lies over the model instead of moving it (verify:anatomy's tour
  // is what caught it).
  for (const scene of SCENES) {
    const trail = modelLocation(scene);
    if (isPathologyModelScene(scene)) assert.equal(trail?.kind, 'disease', scene.id);
    else assert.equal(trail, null, `${scene.id}: an anatomy title card with a trail`);
  }
  assert.match(read('src/components/TitleCard.js'), /const location = modelLocation\(sceneById\(meta\.id\)\);/);
  assert.equal(modelLocation(null), null);
});

test('model shell: every disease model folds its trust into 「このモデルについて」; anatomy keeps its row', () => {
  for (const scene of SCENES) {
    assert.equal(foldsAboutThisModel(scene), isPathologyModelScene(scene), scene.id);
  }
  // A scene may still decide for itself.
  assert.equal(foldsAboutThisModel(sceneById('heart-anatomy'), { titleCard: { foldTrust: true } }), true);
  assert.equal(foldsAboutThisModel(sceneById('cardiac-output'), { titleCard: { foldTrust: false } }), false);
  // And the title card asks this rule rather than keeping a second one.
  const card = read('src/components/TitleCard.js');
  assert.match(card, /foldsAboutThisModel\(sceneById\(meta\.id\), meta\)/);
  assert.match(card, /このモデルについて/);
  assert.doesNotMatch(card, /'根拠と限界'/, 'the fold has one name');
});

test('model shell: 「解剖を確認」 goes to the anatomy of the model\'s own organ, never to another disease model', () => {
  assert.deepEqual(anatomyChecksFor(sceneById('cardiac-output')).map((check) => check.scene.id), ['heart-anatomy']);
  for (const scene of SCENES.filter(isPathologyModelScene)) {
    for (const { scene: target } of anatomyChecksFor(scene)) {
      assert.equal(isPathologyModelScene(target), false, `${scene.id} → ${target.id}`);
      assert.ok([scene.organ, ...(scene.organs ?? [])].includes(target.organ), `${scene.id} → ${target.id}: another organ`);
      assert.notEqual(target.status, 'prototype');
    }
  }
  // An anatomy model has no 「解剖を確認」 of its own.
  assert.deepEqual(anatomyChecksFor(sceneById('heart-anatomy')), []);
});

test('model shell: every published disease model reaches published anatomy, and the card gates the link', () => {
  // On the released product the link must land on an open model — the title
  // card filters by `sceneOpen`, and here the release says there is one.
  const published = PUBLIC_MANIFEST.models.map((model) => sceneById(model.sceneId)).filter(isPathologyModelScene);
  for (const scene of published) {
    const open = anatomyChecksFor(scene).filter((check) => isSceneReleased(check.scene));
    assert.ok(open.length >= 1, `${scene.id}: no released anatomy to check`);
  }
  assert.match(read('src/components/TitleCard.js'), /anatomyChecksFor\(sceneById\(meta\.id\)\)\.filter\(\(check\) => sceneOpen\(check\.scene\)\)/);
});

test('model shell: inside 「このモデルについて」 the scope opens with the fold, not as a second disclosure', () => {
  const restore = installFakeDocument();
  try {
    const scope = sceneById('cardiac-output') && {
      question: 'q', questionJa: 'q',
      answers: [{ text: 'a', textJa: 'a' }],
      excludes: [{ text: 'e', textJa: 'e' }],
      sources: [{ text: 's', textJa: 's' }],
    };
    const panel = createModelScopePanel(scope);
    const fold = new FakeElement('details');
    panel.embedIn(fold);
    assert.equal(findByClass(panel.element, 'scope-toggle').length, 0, 'no toggle inside the fold');
    assert.equal(findByClass(panel.element, 'scope-body')[0].hidden, false, 'the body shows when the fold does');
    assert.ok(fold.children.includes(panel.element));
    panel.open();
    assert.equal(fold.open, true, 'a lesson asking to open the scope opens the fold');
    // The sections are named for what a reader asks.
    const headings = findByClass(panel.element, 'scope-section-title').map((node) => findByClass(node, 'lang-ja')[0].textContent);
    assert.deepEqual(headings, ['このモデルが示すこと', '示さないこと', '根拠と出典']);
  } finally {
    restore();
  }
});

/** Specificity of one compound selector list entry, as [ids, classes+attributes]. */
const specificity = (selector) => [
  (selector.match(/#[\w-]+/g) ?? []).length,
  (selector.match(/\.[\w-]+|\[[^\]]+\]/g) ?? []).length,
];
const beats = (a, b) => a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
const ruleWith = (css, selector) => [...rulesOf(css)].find((rule) => rule.names.includes(selector));

test('model shell: 「このモデルについて」 is painted on a phone — the column drops its fade while it is open', () => {
  // The column under the title card fades with a mask while it scrolls, and a
  // mask clips fixed descendants too: the phone's sheet sits below the column,
  // so on every disease model outside the experiment layout it opened unseen.
  const ui = read('src/styles/ui.css');
  const brand = read('src/styles/brand.css');
  const fade = ruleWith(ui, '.top-left.has-more');
  assert.ok(fade && declaration(fade.body, 'mask-image'), 'the fade this answers is still a mask');
  const off = ruleWith(brand, '#ui .top-left.is-reading-about');
  assert.ok(off, 'brand.css drops the fade while the fold is open');
  assert.equal(declaration(off.body, 'mask-image'), 'none');
  assert.ok(beats(specificity('#ui .top-left.is-reading-about'), specificity('.top-left.has-more')));
  assert.match(read('src/components/TitleCard.js'), /classList\.toggle\('is-reading-about', fold\.open\)/);
});

test('model shell: the scope inside 「このモデルについて」 is shown in the learning view, primary or not', () => {
  // The learning view hides a non-primary scope; inside the fold that emptied it
  // of what the model shows and does not (COPD and every other non-primary one).
  const ui = read('src/styles/ui.css');
  const brand = read('src/styles/brand.css');
  const hide = "#ui[data-view='learning'] .model-scope:not(.is-primary)";
  const hidden = ruleWith(ui, hide);
  assert.ok(hidden && declaration(hidden.body, 'display') === 'none', 'the rule this answers still hides');
  const shown = '#ui[data-view] .title-about .model-scope.is-embedded';
  const rule = ruleWith(brand, shown);
  assert.ok(rule, 'brand.css shows the embedded scope');
  assert.equal(declaration(rule.body, 'display'), 'block');
  assert.ok(beats(specificity(shown), specificity(hide)), 'and wins whichever sheet loads last');
  assert.match(read('src/components/ModelScopePanel.js'), /classList\.add\([^)]*'is-embedded'/);
});

test('model shell: the review line never says 「未実施」 beside a badge that says a review exists', () => {
  // A legacy record is a real historical review with no pinned date; the line
  // used to read 「医学レビュー未実施」 next to 「医学レビュー：旧基準・版固定なし」.
  const seen = new Set();
  for (const scene of SCENES) {
    const review = clinicalReviewPresentation(scene.id);
    const label = reviewDateLabel(review);
    seen.add(review.status);
    const attested = ['reviewed', 'stale', 'legacy-unversioned'].includes(review.status);
    if (attested) assert.notEqual(label.ja, '医学レビュー未実施', `${scene.id} (${review.status})`);
    if (review.record?.reviewedAt) assert.match(label.ja, new RegExp(review.record.reviewedAt));
    if (!attested) assert.equal(label.ja, '医学レビュー未実施', `${scene.id} (${review.status})`);
  }
  assert.ok(seen.has('legacy-unversioned'), 'the case this guards still exists in the registry');
  assert.equal(reviewDateLabel(null), null);
  assert.match(read('src/components/TitleCard.js'), /const dateLabel = reviewDateLabel\(review\);/);
});

test('model shell: a primary scope is the lesson\'s question and stays in view unless the scene folds it', () => {
  // Folding every disease model by default hid circulation's primary scope —
  // the question its lesson is built on — behind a closed line.
  assert.equal(scopeInAboutFold({ modelScope: { primary: true } }), false, 'circulation keeps its question in view');
  assert.equal(scopeInAboutFold({ modelScope: { primary: true }, titleCard: { foldTrust: true } }), true, 'cardiac-output folds its own');
  assert.equal(scopeInAboutFold({ modelScope: { question: 'q' } }), true, 'a reference scope goes in the fold');
  assert.equal(scopeInAboutFold(), true);
  assert.match(read('src/app/App.js'), /const scopeInFold = Boolean\(trustFold && scopePanel && scopeInAboutFold\(meta\)\);/);
  // The two scenes this decides, as they are declared.
  assert.match(read('src/data/circulation.js'), /primary: true/);
  assert.match(read('src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'), /titleCard: \{ foldTrust: true \}/);
});

test('menu: the published models are listed disease models first, then the anatomy', async () => {
  const { modelShelfList } = await import('../src/components/SiteMenu.js');
  const restore = installFakeDocument();
  try {
    const list = modelShelfList(PUBLIC_MANIFEST.models, { systemOf: (id) => modelLocation(sceneById(id))?.where ?? null });
    const shelves = findByClass(list, 'site-menu-shelf');
    assert.deepEqual(
      shelves.map((shelf) => findByClass(findByClass(shelf, 'site-menu-shelf-title')[0], 'lang-ja')[0].textContent),
      ['病態モデル', '解剖']
    );
    const hrefs = (shelf) => findByClass(shelf, 'site-menu-model').map((link) => link.getAttribute('href'));
    const disease = PUBLIC_MANIFEST.models.filter((model) => model.layer !== 'anatomy').map((model) => model.route);
    const anatomy = PUBLIC_MANIFEST.models.filter((model) => model.layer === 'anatomy').map((model) => model.route);
    assert.deepEqual(hrefs(shelves[0]), disease);
    assert.deepEqual(hrefs(shelves[1]), anatomy);
    // Every published model once, no more.
    assert.equal(hrefs(list).length, PUBLIC_MANIFEST.count);
  } finally {
    restore();
  }
});
