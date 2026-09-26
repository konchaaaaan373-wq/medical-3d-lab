import test from 'node:test';
import assert from 'node:assert/strict';

import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

globalThis.requestAnimationFrame ??= (fn) => { fn(0); return 0; };

/**
 * Switching models from inside the model: organ, then layer.
 *
 * ## Why two levels (2026-09-26)
 *
 * The row below used to be one chip per published model, named by its organ
 * until two models shared an organ — then both fell back to their titles, and
 * with the heart's anatomy and its cardiac-output scene open the row read
 * `脳 / 触れて学ぶ心臓の解剖 / 心拍出量 / 肺 / 肝臓`: organs, a title and a
 * topic on one level, and at 390 px the lungs and liver past its end. Now the
 * row is organs, and the organ on screen names its layers in a second group.
 *
 * ## What stood here
 *
 * `神経 › 脳 › 解剖` — correct, and an answer to a question nobody was asking.
 * The question a reader has while a 3D model is on screen is *"how do I see the
 * heart?"*, and the only answer was a `モデル ⌄` button in the far corner that
 * opens a sheet. A first-time visitor has no reason to press it: nothing about
 * the word says it holds the other organs.
 *
 * A row of organ names, with the one you are looking at marked, answers both
 * questions at once — where am I, and how do I go somewhere else — without
 * leaving the viewer. Switching models is this product's main loop.
 *
 * ## What these fix
 *
 * - The strip offers exactly what the release has opened. Not the catalogue:
 *   a chip leading to "in development" would be the mislabelled link the whole
 *   navigation change set out to remove.
 * - Both languages on every chip. The manifest row carried only the Japanese
 *   organ name, so the first version of this rendered an empty English span at
 *   `lang-en` and lost half its labels with every structural check green.
 * - A scene is never left with no way out. Standing the drawer down when it
 *   duplicates the strip is the same *kind* of change as `is-single`, which in
 *   the beta left a 3D model with no navigation control on it at all (F-111) —
 *   so the way home is asserted in every case below, not assumed.
 */

const sceneRow = (id, { organ = 'brain', system = 'nervous', status = 'alpha', slug = id } = {}) => ({
  id, slug, organ, system, status, uses: [], label: id, labelJa: id, tags: ['anatomy'],
});

const group = (id, labelJa, scenes) => ({ id, label: id, labelJa, scenes });

function mount(groups, currentId) {
  const ui = new FakeElement('div');
  ui.dataset.lang = 'ja';
  const restore = installFakeDocument({ elements: { ui } });
  try {
    const switcher = createSceneSwitcher({ groups, currentId, showLab: false });
    assert.ok(switcher, 'the switcher rendered');
    return switcher;
  } finally {
    restore();
  }
}

/** Every published model as its own group, which is what the beta actually is. */
const publishedGroups = () =>
  PUBLIC_MANIFEST.models.map((model) =>
    group(model.organId, model.organLabelJa, [
      sceneRow(model.sceneId, { organ: model.organId, system: model.organId }),
    ])
  );

const strip = (element) => findByClass(element, 'global-nav-strip')[0] ?? null;
const chips = (element) => findByClass(element, 'global-nav-strip-link');
const wayHome = (element) => findByClass(element, 'global-nav-brand')[0] ?? null;

const layerRow = (element) => findByClass(element, 'global-nav-layers')[0] ?? null;
const layerLinks = (element) => findByClass(element, 'global-nav-layer-link');
const menuTrigger = (element) => findByClass(element, 'site-menu-trigger')[0] ?? null;

/** Organs in manifest order, each with its models — what the row should show. */
const organsOf = (models) => {
  const organs = new Map();
  for (const model of models) {
    if (!organs.has(model.organId)) organs.set(model.organId, []);
    organs.get(model.organId).push(model);
  }
  return organs;
};

test('the row is one chip per published organ, not one per model', () => {
  assert.ok(PUBLIC_MANIFEST.models.length > 1, 'this test needs a release with a choice in it');
  const current = PUBLIC_MANIFEST.models[0];
  const { element } = mount(publishedGroups(), current.sceneId);

  assert.ok(strip(element), 'the scene header carries the organ row');
  const organs = organsOf(PUBLIC_MANIFEST.models);
  assert.deepEqual(
    chips(element).map((chip) => chip.getAttribute('data-organ')),
    [...organs.keys()],
    'one chip per organ the release opened, in manifest order'
  );
  // Each organ opens at its anatomy — the first layer — when it has one.
  for (const chip of chips(element)) {
    const models = organs.get(chip.getAttribute('data-organ'));
    const entry = models.find((model) => model.layer === 'anatomy') ?? models[0];
    assert.equal(chip.getAttribute('href'), entry.route, `${chip.getAttribute('data-organ')} opens at its first layer`);
  }
});

test('every chip is named by its organ, in both languages', () => {
  const { element } = mount(publishedGroups(), PUBLIC_MANIFEST.models[0].sceneId);
  const organs = organsOf(PUBLIC_MANIFEST.models);
  for (const chip of chips(element)) {
    const [model] = organs.get(chip.getAttribute('data-organ'));
    const en = findByClass(chip, 'lang-en')[0];
    const ja = findByClass(chip, 'lang-ja')[0];
    assert.equal(en?.textContent, model.organLabel, `${chip.getAttribute('href')}: English is the organ's name`);
    assert.equal(ja?.textContent, model.organLabelJa, `${chip.getAttribute('href')}: Japanese is the organ's name`);
  }
});

test('the model on screen is the one page marked, whichever it is', () => {
  for (const model of PUBLIC_MANIFEST.models) {
    const { element } = mount(publishedGroups(), model.sceneId);
    const pageMarks = [...chips(element), ...layerLinks(element)].filter(
      (link) => link.getAttribute('aria-current') === 'page'
    );
    assert.deepEqual(
      pageMarks.map((link) => link.getAttribute('href')),
      [model.route],
      `${model.sceneId}: exactly one control says "this page"`
    );
    assert.equal(pageMarks[0].classList.contains('is-current'), true, 'and it is visibly marked too');

    // The organ it belongs to is marked as the place you are in.
    const organChip = chips(element).find((chip) => chip.getAttribute('data-organ') === model.organId);
    assert.equal(organChip.classList.contains('is-current'), true, `${model.sceneId}: its organ is marked`);
    assert.ok(
      ['page', 'true'].includes(organChip.getAttribute('aria-current')),
      `${model.sceneId}: the organ says where you are to assistive tech too`
    );
    // The breadcrumb it replaced must not also be there.
    assert.deepEqual(findByClass(element, 'global-nav-current'), []);
  }
});

test('an organ with more than one model names its layers; one with a single model does not', () => {
  const organs = organsOf(PUBLIC_MANIFEST.models);
  assert.ok(
    [...organs.values()].some((models) => models.length > 1),
    'this test needs an organ with two published models (the heart: anatomy and cardiac output)'
  );
  for (const model of PUBLIC_MANIFEST.models) {
    const siblings = organs.get(model.organId);
    const { element } = mount(publishedGroups(), model.sceneId);
    if (siblings.length === 1) {
      // A lone 解剖 chip would be a control with no job.
      assert.equal(layerRow(element), null, `${model.sceneId}: nothing to choose, no layer row`);
      continue;
    }
    assert.ok(layerRow(element), `${model.sceneId}: the organ's layers are offered`);
    assert.deepEqual(
      layerLinks(element).map((link) => link.getAttribute('href')).sort(),
      siblings.map((sibling) => sibling.route).sort(),
      `${model.sceneId}: one link per model of this organ, and no other organ's`
    );
    // Anatomy first: it is the layer everything else sits on.
    assert.equal(layerLinks(element)[0].classList.contains('is-anatomy'), true, 'anatomy leads');
  }
});

test('a layer that is not anatomy says which layer it is', () => {
  const mechanism = PUBLIC_MANIFEST.models.find((model) => model.layer === 'mechanism');
  assert.ok(mechanism, 'this test needs a published mechanism scene');
  const { element } = mount(publishedGroups(), mechanism.sceneId);
  const link = layerLinks(element).find((candidate) => candidate.getAttribute('href') === mechanism.route);
  const [kind] = findByClass(link, 'global-nav-layer-kind');
  assert.ok(kind, 'the mechanism link carries its layer');
  assert.equal(findByClass(kind, 'lang-ja')[0].textContent, '機序');
  assert.equal(findByClass(findByClass(link, 'global-nav-layer-name')[0], 'lang-ja')[0].textContent, mechanism.titleJa);

  // The anatomy link *is* the layer, so it does not say it twice.
  const anatomy = layerLinks(element).find((candidate) => candidate.classList.contains('is-anatomy'));
  assert.deepEqual(findByClass(anatomy, 'global-nav-layer-kind'), []);
  assert.equal(findByClass(anatomy, 'lang-ja').at(-1).textContent, '解剖');
});

test('a scene the release has not opened keeps the breadcrumb instead', () => {
  // Reached only through the preview unlock. There is nothing on the strip to
  // mark, and a strip with no current chip would claim the reader is on one of
  // the published organs when they are somewhere else.
  const groups = [
    ...publishedGroups(),
    group('respiratory', '呼吸器', [
      sceneRow('copd', { organ: 'lung', system: 'respiratory', status: 'prototype' }),
    ]),
  ];
  const { element } = mount(groups, 'copd');
  assert.equal(strip(element), null, 'no strip on a scene the strip cannot mark');
  assert.ok(findByClass(element, 'global-nav-current')[0], 'the breadcrumb stands in');
});

test('the menu carries the catalogue only when the row does not already reach everything', () => {
  // The beta: every scene this document can reach is on the row, so a model
  // list in the menu would be the old `モデル ⌄` drawer again — a second door
  // onto the same room. The menu is still there; the catalogue is not.
  const { element: beta } = mount(publishedGroups(), PUBLIC_MANIFEST.models[0].sceneId);
  assert.ok(menuTrigger(beta), 'the site menu is always there');
  assert.deepEqual(findByClass(beta, 'global-nav-list'), [], 'no second door onto the same room');
  assert.ok(wayHome(beta), 'and the way home is still on screen');

  // The preview unlock: the catalogue is far larger than the row, so the menu
  // is the only way to most of it and must carry it.
  const withPrototypes = [
    ...publishedGroups(),
    group('respiratory', '呼吸器', [
      sceneRow('copd', { organ: 'lung', system: 'respiratory', status: 'prototype' }),
      sceneRow('asthma', { organ: 'lung', system: 'respiratory', status: 'prototype' }),
    ]),
  ];
  const { element: unlocked } = mount(withPrototypes, PUBLIC_MANIFEST.models[0].sceneId);
  assert.ok(strip(unlocked), 'the strip still says where you are');
  assert.ok(findByClass(unlocked, 'global-nav-list')[0], 'and the menu reaches what the row does not');
});

test('every scene keeps a way out, whichever branch it takes', () => {
  // The assertion F-111 exists because nobody wrote. `is-single` hid the
  // drawer's trigger and left a 3D model in the public beta with no navigation
  // control on it at all.
  const cases = [
    [publishedGroups(), PUBLIC_MANIFEST.models[0].sceneId],
    [publishedGroups(), PUBLIC_MANIFEST.models.at(-1).sceneId],
    [[group('nervous', '神経', [sceneRow('brain-anatomy')])], 'brain-anatomy'],
    [
      [group('respiratory', '呼吸器', [
        sceneRow('copd', { organ: 'lung', system: 'respiratory', status: 'prototype' }),
      ])],
      'copd',
    ],
  ];
  for (const [groups, current] of cases) {
    const { element } = mount(groups, current);
    const home = wayHome(element);
    assert.ok(home, `${current}: no way home`);
    assert.equal(home.getAttribute('href'), '#/');
    assert.ok(menuTrigger(element), `${current}: no site menu`);
    const reachable = [
      ...findByClass(element, 'global-nav-strip-link'),
      ...findByClass(element, 'global-nav-scene'),
    ];
    assert.ok(reachable.length > 0 || groups.flatMap((g) => g.scenes).length === 1, `${current}: no way to another model`);
  }
});
