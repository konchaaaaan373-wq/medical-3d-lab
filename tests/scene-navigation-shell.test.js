import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE } from '../src/catalog/index.js';
import { MODEL_INFO_ROUTE } from '../src/catalog/publicManifest.js';
import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { shellNavLinks } from '../src/app/shellDestinations.js';
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

/**
 * The same invariant, measured on what the surfaces actually render.
 *
 * `shell-navigation.test.js` holds the vocabulary; it cannot tell whether a
 * surface calls it. That gap was real: the scene-failure fallback — the page a
 * reader meets when the 3D will not start, so the one where the way out matters
 * most — kept its own names for two of these routes through the first pass, and
 * the legal page's only check was that its source mentioned the helper, which
 * its import line satisfies on its own.
 */

const renderFlatSurfaces = async () => {
  const { createLegal } = await import('../src/app/Legal.js');
  const { createTrust } = await import('../src/app/Trust.js');
  const { createLockedSurface } = await import('../src/app/LockedSurface.js');
  const { createSceneFailureFallback } = await import('../src/app/SceneFailureFallback.js');
  const { resolveRoute } = await import('../src/app/router.js');
  const { RELEASED_SCENES } = await import('../src/catalog/release.js');

  const restore = installFakeDocument();
  globalThis.document.documentElement = new FakeElement('html');
  // `releaseGate.betaUnlocked()` reads `window.location.search`; with no window
  // there is nothing to read and these surfaces cannot mount at all. An empty
  // search is the locked answer, which is what the beta gives a reader.
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: { search: '', hash: '' },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  };
  try {
    const surfaces = [];
    for (const [name, mount] of [
      ['legal', (ui) => createLegal({ ui, docId: 'terms' })],
      ['trust', (ui) => createTrust({ ui })],
      ['locked', (ui) => createLockedSurface({ ui, route: resolveRoute('#/copd') })],
      ['scene failure fallback', (ui) =>
        createSceneFailureFallback({ ui, sceneId: RELEASED_SCENES[0].id })],
    ]) {
      const ui = new FakeElement('div');
      await mount(ui);
      surfaces.push([name, ui]);
    }
    return surfaces;
  } finally {
    restore();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
};

const allHrefs = (root) => {
  const found = [];
  const visit = (node) => {
    if (!(node instanceof FakeElement)) return;
    const href = node.getAttribute?.('href');
    if (node.tagName === 'A' && href) found.push(href);
    node.children.forEach(visit);
  };
  visit(root);
  return found;
};

/**
 * The text of every link on the surface.
 *
 * Links only, deliberately. The rule is about what a *destination is called*,
 * not about prose: the locked page's body explains that the beta publishes
 * "脳と心臓の3D解剖モデル", which is a true sentence about the product and not a
 * second name for the Explorer.
 */
const linkLabels = (root) => {
  const labels = [];
  const visit = (node, insideLink) => {
    if (!(node instanceof FakeElement)) return;
    const isLink = node.tagName === 'A';
    if (isLink) labels.push('');
    if (node.textContent && (insideLink || isLink)) {
      labels[labels.length - 1] += node.textContent;
    }
    node.children.forEach((child) => visit(child, insideLink || isLink));
  };
  visit(root, false);
  return labels;
};

test('shell surfaces: every flat surface renders a route home', async () => {
  for (const [name, ui] of await renderFlatSurfaces()) {
    assert.ok(
      allHrefs(ui).includes(LANDING_ROUTE),
      `${name} offers no route home — the wordmark is not one, it is a title`
    );
  }
});

test('shell surfaces: no surface invents its own name for a shell destination', async () => {
  // The names these four pages used to use for the Explorer and for Lab. Each
  // was correct on the page that wrote it and wrong beside the next one.
  const retired = ['Anatomy models', '解剖モデル', 'Browse public models', '公開モデルを見る',
    'Public models', '公開モデル', 'Lab index', '実験モデル一覧', 'Model index', 'Experimental Lab', '実験室'];

  for (const [name, ui] of await renderFlatSurfaces()) {
    for (const label of linkLabels(ui)) {
      for (const retiredName of retired) {
        assert.equal(
          label.includes(retiredName),
          false,
          `${name} still offers a link called "${label}" — shellDestinations.js is meant to be the only namer`
        );
      }
    }
  }
});

test('shell surfaces: the scene-failure fallback offers the shell row, not its own', async () => {
  const surfaces = await renderFlatSurfaces();
  const [, fallback] = surfaces.find(([name]) => name === 'scene failure fallback');
  const hrefs = allHrefs(fallback);

  // `betaUnlocked()` is false under `node --test`, so Lab is withheld — which is
  // the same answer the locked beta gives a reader in a browser.
  assert.deepEqual(
    hrefs,
    shellNavLinks({ current: null, labUnlocked: false }).map((link) => link.route)
  );
});

test('shell surfaces: a legal document offers model information, in the rendered page', async () => {
  const surfaces = await renderFlatSurfaces();
  const [, legal] = surfaces.find(([name]) => name === 'legal');
  const modelInfo = shellNavLinks({ current: null }).find((link) => link.id === 'model-info');

  assert.ok(allHrefs(legal).includes(modelInfo.route), 'the route is offered');
  assert.ok(
    linkLabels(legal).some((label) => label.includes(modelInfo.ja)),
    'and it is called what the shell calls it'
  );
});
