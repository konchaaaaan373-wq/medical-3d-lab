import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE } from '../src/catalog/index.js';
import { MODEL_INFO_ROUTE } from '../src/catalog/publicManifest.js';
import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The fixed header on a 3D model is the whole of the way out of it.
 *
 * A model fills the window: there is no page chrome around it, no breadcrumb
 * above it and — in the public beta — no related-scenes panel either, because
 * everything it would link to is still locked. So whatever this header offers
 * is the complete set of exits, and the failure it is being held to here is a
 * real one that shipped: with exactly one model open the drawer was hidden, and
 * the only remaining route anywhere was an unlabelled wordmark.
 */

const sceneRow = (id, { organ = 'brain', slug = id, disease = false, tags = ['anatomy'] } = {}) => ({
  id,
  slug,
  organ,
  disease,
  tags,
  status: 'alpha',
  label: id,
  labelJa: id,
});

const groupsOf = (...scenes) => [
  { id: 'nervous', label: 'Nervous', labelJa: '神経', scenes },
];

/** Render the switcher against a fake document and hand back its DOM. */
function mountSwitcher(options) {
  const ui = new FakeElement('div');
  const restore = installFakeDocument({ elements: { ui } });
  try {
    const switcher = createSceneSwitcher(options);
    assert.ok(switcher, 'the switcher rendered');
    return { element: switcher.element, ui };
  } finally {
    restore();
  }
}

const hrefs = (root, className) =>
  findByClass(root, className).map((node) => node.getAttribute('href'));

test('scene navigation: the way home is a labelled control, not just the wordmark', () => {
  const { element } = mountSwitcher({
    groups: groupsOf(sceneRow('brain-anatomy')),
    currentId: 'brain-anatomy',
    showLab: false,
  });

  const [brand] = findByClass(element, 'global-nav-brand');
  assert.ok(brand, 'the header has a brand link');
  assert.equal(brand.getAttribute('href'), LANDING_ROUTE);
  assert.match(
    brand.getAttribute('aria-label') ?? '',
    /Home/,
    'its accessible name says where it goes, not what the product is called'
  );
  assert.equal(findByClass(brand, 'global-nav-brand-back').length, 1, 'a back arrow');
  assert.equal(findByClass(brand, 'global-nav-brand-home').length, 1, 'and the word "Home"');
});

test('scene navigation: one open model still gets a drawer, because the shelf is in it', () => {
  const { element } = mountSwitcher({
    groups: groupsOf(sceneRow('brain-anatomy')),
    currentId: 'brain-anatomy',
    showLab: false,
  });

  const [trigger] = findByClass(element, 'global-nav-trigger');
  assert.ok(trigger, 'the drawer has a trigger');
  assert.equal(trigger.hidden, false, 'and it is not hidden away when there is one model');
  assert.ok(element.classList.contains('is-single'), 'the header still knows it is a single model');
});

test('scene navigation: the drawer reaches every other page of the product', () => {
  const { element } = mountSwitcher({
    groups: groupsOf(sceneRow('brain-anatomy')),
    currentId: 'brain-anatomy',
    showLab: false,
  });

  assert.deepEqual(
    hrefs(element, 'global-nav-footer-link'),
    [LANDING_ROUTE, EXPLORER_ROUTE, MODEL_INFO_ROUTE],
    'home, the model index and model information — and no locked Lab route'
  );
});

test('scene navigation: Lab is offered from the drawer only when it is unlocked', () => {
  const { element } = mountSwitcher({
    groups: groupsOf(sceneRow('brain-anatomy'), sceneRow('amyloid-beta', { disease: true, tags: [] })),
    currentId: 'brain-anatomy',
    showLab: true,
  });

  assert.deepEqual(
    hrefs(element, 'global-nav-footer-link'),
    [LANDING_ROUTE, EXPLORER_ROUTE, MODEL_INFO_ROUTE, LAB_ROUTE]
  );
});

test('scene navigation: the drawer names the same page the same way from every model', () => {
  const anatomy = mountSwitcher({
    groups: groupsOf(sceneRow('brain-anatomy')),
    currentId: 'brain-anatomy',
    showLab: true,
  });
  const prototype = mountSwitcher({
    groups: groupsOf(sceneRow('amyloid-beta', { disease: true, tags: [] })),
    currentId: 'amyloid-beta',
    showLab: true,
  });

  const labels = (root) =>
    findByClass(root, 'global-nav-footer-link').map((node) =>
      findByClass(node, 'lang-ja').map((span) => span.textContent).join('')
    );

  assert.deepEqual(labels(anatomy.element), labels(prototype.element));
  assert.deepEqual(labels(anatomy.element), ['ホーム', 'モデル一覧', 'モデル情報', '実験モデル']);
});

test('scene navigation: every model in scope is one link away', () => {
  const { element } = mountSwitcher({
    groups: groupsOf(
      sceneRow('brain-anatomy'),
      sceneRow('amyloid-beta', { disease: true, tags: [] }),
      sceneRow('heart-failure', { organ: 'heart', disease: true, tags: [] })
    ),
    currentId: 'brain-anatomy',
    showLab: false,
  });

  assert.deepEqual(
    hrefs(element, 'global-nav-scene'),
    ['#/brain-anatomy', '#/amyloid-beta', '#/heart-failure']
  );
  const current = findByClass(element, 'global-nav-scene').filter((node) =>
    node.classList.contains('is-current')
  );
  assert.equal(current.length, 1, 'exactly one row is marked as where you already are');
  assert.equal(current[0].getAttribute('aria-current'), 'page');
});
