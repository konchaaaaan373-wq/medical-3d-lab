import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

globalThis.requestAnimationFrame ??= (fn) => { fn(0); return 0; };

/**
 * Reaching the other published model.
 *
 * The drawer groups models by body system and opens one system at a time —
 * deliberate, and right for a fourteen-system catalogue. It is wrong for a beta
 * that publishes two models in two different systems: measured at 390px on a
 * production build, standing on `brain-anatomy` put `heart-anatomy` inside a
 * closed `<details>` labelled 循環器, three taps away, with nothing to say the
 * only other published model was in there (F-111).
 *
 * So the drawer lists what it can reach, flat, above the accordion — while that
 * list is short enough to be a shortcut rather than a duplicate of the map.
 */

const sceneRow = (id, { organ = 'brain', system = 'nervous', slug = id } = {}) => ({
  id, slug, organ, system, status: 'alpha', uses: [], label: id, labelJa: id, tags: ['anatomy'],
});

const groupsOf = (...groups) => groups;
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

/** The beta as it actually stands: two models, two different body systems. */
const beta = () => groupsOf(
  group('nervous', '神経', [sceneRow('brain-anatomy')]),
  group('cardiovascular', '循環器', [sceneRow('heart-anatomy', { organ: 'heart', system: 'cardiovascular' })]),
);

const modelLinks = (element) => {
  const [list] = findByClass(element, 'global-nav-model-list');
  return list ? findByClass(list, 'global-nav-scene') : [];
};

test('the other published model is listed without opening its body system', () => {
  const { element } = mount(beta(), 'brain-anatomy');
  const [section] = findByClass(element, 'global-nav-models');
  assert.ok(section, 'the drawer has a flat model list');
  assert.equal(section.hidden, false);

  const hrefs = modelLinks(element).map((a) => a.getAttribute('href'));
  assert.deepEqual(hrefs, ['#/brain-anatomy', '#/heart-anatomy']);

  // The point of the whole change: the heart is reachable from the brain with
  // no accordion in the way. Named by href, because a link that exists inside a
  // closed `<details>` is exactly the thing that did not count (L-08).
  const heart = modelLinks(element).find((a) => a.getAttribute('href') === '#/heart-anatomy');
  assert.ok(heart, 'the other model is in the flat list');
  assert.equal(heart.classList.contains('is-current'), false);
});

test('and the one being looked at is marked in that list', () => {
  for (const [current, other] of [['brain-anatomy', 'heart-anatomy'], ['heart-anatomy', 'brain-anatomy']]) {
    const { element } = mount(beta(), current);
    const marked = modelLinks(element).filter((a) => a.getAttribute('aria-current') === 'page');
    assert.deepEqual(
      marked.map((a) => a.getAttribute('href')),
      [`#/${current}`],
      `standing on ${current}, exactly it is marked`,
    );
    assert.ok(
      modelLinks(element).some((a) => a.getAttribute('href') === `#/${other}`),
      `and ${other} is still offered`,
    );
  }
});

test('one model has nothing to switch to, so the section stays away', () => {
  // The beta before the heart published. A "Models" heading over a list of one,
  // which is the model already on screen, is noise wearing a shortcut's clothes.
  const { element } = mount(groupsOf(group('nervous', '神経', [sceneRow('brain-anatomy')])), 'brain-anatomy');
  const [section] = findByClass(element, 'global-nav-models');
  assert.equal(section.hidden, true);
  assert.deepEqual(modelLinks(element), []);
});

test('past a short list it takes itself away rather than duplicating the map', () => {
  // A preview build reaches every declared scene. Eighty of them flat above the
  // accordion is not a shortcut, it is the accordion again without the grouping.
  const many = (n) => groupsOf(group('nervous', '神経',
    Array.from({ length: n }, (_, i) => sceneRow(`scene-${i}`))));

  const shown = mount(many(16), 'scene-0');
  assert.equal(findByClass(shown.element, 'global-nav-models')[0].hidden, false, '16 is still a shortcut');
  assert.equal(modelLinks(shown.element).length, 16);

  const gone = mount(many(17), 'scene-0');
  assert.equal(findByClass(gone.element, 'global-nav-models')[0].hidden, true, '17 is a second catalogue');
  assert.deepEqual(modelLinks(gone.element), []);

  const preview = mount(many(83), 'scene-0');
  assert.equal(findByClass(preview.element, 'global-nav-models')[0].hidden, true);
});

test('the flat list is first inside the region that scrolls', () => {
  // Two things at once, because they were separable and one of them was wrong.
  //
  // Position: F-111 asks for the move between models to be at the top of the
  // drawer, and a shortcut under a fourteen-system accordion is the same hunt
  // with an extra step.
  //
  // Container: the first version made it a sibling of `.global-nav-list`, which
  // is the only scrolling child of a `overflow: hidden` column flex panel. At
  // 390px with the list at its own 16-model limit, the section grew to 955px
  // against a 720px panel and seven rows were clipped with no way to reach
  // them. Being first is no use inside a box that cannot scroll.
  const { element } = mount(beta(), 'brain-anatomy');
  const [list] = findByClass(element, 'global-nav-list');
  assert.ok(list, 'the scrollable list exists');

  const classes = list.children.map((child) => (child.className || '').toString());
  assert.ok(
    classes[0]?.includes('global-nav-models'),
    `the shortcut is not first inside the scroller: ${JSON.stringify(classes)}`,
  );
  assert.ok(
    classes.slice(1).some((cls) => cls.includes('global-nav-system-section')),
    'and the system accordion follows it',
  );

  // And not left outside the scroller as a sibling, which is the shape that
  // clipped.
  const [panel] = findByClass(element, 'global-nav-panel');
  assert.deepEqual(
    panel.children.filter((child) => (child.className || '').toString().includes('global-nav-models')),
    [],
    'the shortcut must not be a direct child of the panel',
  );
});

test('the section is styled, and its heading clears the type floor', () => {
  // The favourites heading beside it is 10px and sits in the baseline. A new
  // one at that size would be new small type on a heading, which is what the
  // ratchet exists to refuse.
  const css = read('src/styles/navigation.css');
  assert.match(css, /\.global-nav-models\s*\{/);
  assert.match(css, /\.global-nav-models\[hidden\]/, 'hiding it must actually hide it');
  const title = css.slice(css.indexOf('.global-nav-models-title'));
  const size = title.match(/font-size:\s*([0-9.]+)px/)?.[1];
  assert.ok(size, 'the heading declares a px size');
  assert.ok(Number(size) >= 12, `the heading is ${size}px, below the 12px floor`);
});
