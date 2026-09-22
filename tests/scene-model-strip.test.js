import test from 'node:test';
import assert from 'node:assert/strict';

import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

globalThis.requestAnimationFrame ??= (fn) => { fn(0); return 0; };

/**
 * Switching models from inside the model.
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

test('a published model shows every other published model as one press', () => {
  assert.ok(PUBLIC_MANIFEST.models.length > 1, 'this test needs a release with a choice in it');
  const current = PUBLIC_MANIFEST.models[0];
  const { element } = mount(publishedGroups(), current.sceneId);

  assert.ok(strip(element), 'the scene header carries the model strip');
  assert.deepEqual(
    chips(element).map((chip) => chip.getAttribute('href')),
    PUBLIC_MANIFEST.models.map((model) => model.route),
    'one chip per published model, and nothing the release has not opened'
  );
});

test('every chip is readable in both languages', () => {
  const { element } = mount(publishedGroups(), PUBLIC_MANIFEST.models[0].sceneId);
  for (const chip of chips(element)) {
    const en = findByClass(chip, 'lang-en')[0];
    const ja = findByClass(chip, 'lang-ja')[0];
    assert.ok(en?.textContent?.trim(), `${chip.getAttribute('href')}: no English label`);
    assert.ok(ja?.textContent?.trim(), `${chip.getAttribute('href')}: no Japanese label`);
  }
});

test('the model on screen is the marked one, whichever it is', () => {
  for (const model of PUBLIC_MANIFEST.models) {
    const { element } = mount(publishedGroups(), model.sceneId);
    const marked = chips(element).filter((chip) => chip.getAttribute('aria-current') === 'page');
    assert.deepEqual(
      marked.map((chip) => chip.getAttribute('href')),
      [model.route],
      `${model.sceneId}: exactly one chip says "you are here"`
    );
    assert.equal(marked[0].classList.contains('is-current'), true, 'and it is visibly marked too');
    // The breadcrumb it replaced must not also be there: two answers to "where
    // am I" in one header is the state this replaced, not an improvement on it.
    assert.deepEqual(findByClass(element, 'global-nav-current'), []);
  }
});

test('a scene the release has not opened keeps the breadcrumb instead', () => {
  // Reached only through the preview unlock. There is nothing on the strip to
  // mark, and a strip with no current chip would claim the reader is on one of
  // four models when they are on a fifth.
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

test('the drawer stands down only when the strip already reaches everything', () => {
  // The beta: every scene this document can reach is a chip, so `モデル ⌄`
  // beside the chips opens a sheet listing the same models under the same
  // names. That is the duplicate entrance, not a second feature.
  const { element: beta } = mount(publishedGroups(), PUBLIC_MANIFEST.models[0].sceneId);
  assert.deepEqual(findByClass(beta, 'global-nav-trigger'), [], 'no second door onto the same room');
  assert.deepEqual(findByClass(beta, 'global-nav-panel'), []);
  assert.ok(wayHome(beta), 'and the way home is still on screen');

  // The preview unlock: the catalogue is far larger than the strip, so the
  // drawer is the only way to most of it and must be untouched.
  const withPrototypes = [
    ...publishedGroups(),
    group('respiratory', '呼吸器', [
      sceneRow('copd', { organ: 'lung', system: 'respiratory', status: 'prototype' }),
      sceneRow('asthma', { organ: 'lung', system: 'respiratory', status: 'prototype' }),
    ]),
  ];
  const { element: unlocked } = mount(withPrototypes, PUBLIC_MANIFEST.models[0].sceneId);
  assert.ok(strip(unlocked), 'the strip still says where you are');
  assert.ok(
    findByClass(unlocked, 'global-nav-trigger')[0],
    'and the drawer still reaches what the strip does not'
  );
  assert.ok(findByClass(unlocked, 'global-nav-panel')[0]);
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
    const reachable = [
      ...findByClass(element, 'global-nav-strip-link'),
      ...findByClass(element, 'global-nav-trigger'),
    ];
    assert.ok(reachable.length > 0, `${current}: no way to another model`);
  }
});
