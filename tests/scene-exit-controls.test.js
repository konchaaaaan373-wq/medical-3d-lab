import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANDING_ROUTE } from '../src/catalog/index.js';
import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// The drawer schedules its focus move on a frame, and that outlives the mount:
// the click that opens it happens later. Run frames straight away — there is no
// compositor here and these tests are about what opens, not about when.
globalThis.requestAnimationFrame ??= (fn) => { fn(0); return 0; };

/**
 * The way out of a 3D model.
 *
 * A model fills the window. There is no page chrome around it and no
 * breadcrumb above it, so the fixed header is the complete set of exits — and
 * in the public beta, where the release opens one model, both of the exits it
 * offered were failing. This holds the two of them.
 */

const sceneRow = (id, { organ = 'brain', slug = id } = {}) => ({
  id,
  slug,
  organ,
  system: 'nervous',
  status: 'alpha',
  uses: [],
  label: id,
  labelJa: id,
  tags: ['anatomy'],
});

const groupsOf = (...scenes) => [
  { id: 'nervous', label: 'Nervous', labelJa: '神経', scenes },
];

function mountSwitcher(options, { lang = 'ja' } = {}) {
  // `inLanguage()` reads `#ui[data-lang]` at the moment an element is built, so
  // a single-language attribute is only testable through the shell the product
  // actually mounts into.
  const ui = new FakeElement('div');
  ui.dataset.lang = lang;
  const restore = installFakeDocument({ elements: { ui } });
  try {
    const switcher = createSceneSwitcher(options);
    assert.ok(switcher, 'the switcher rendered');
    return switcher;
  } finally {
    restore();
  }
}

const oneModel = (options) => mountSwitcher({
  groups: groupsOf(sceneRow('brain-anatomy')),
  currentId: 'brain-anatomy',
  showLab: false,
}, options);

test('scene exits: one open model still gets a drawer', () => {
  const { element } = oneModel();
  const [trigger] = findByClass(element, 'global-nav-trigger');

  // The trigger used to be hidden whenever the scene list held a single entry.
  // That is exactly the public beta, so a 3D scene shipped with no navigation
  // control on it at all — and the shelf links inside the drawer, which are
  // the routes to every other page, went with it.
  assert.ok(trigger, 'the drawer has a trigger');
  assert.equal(trigger.hidden, false, 'and it is not hidden away');
  assert.ok(element.classList.contains('is-single'), 'the header still knows it is one model');
});

test('scene exits: and that drawer opens', () => {
  const { element } = oneModel();
  const [trigger] = findByClass(element, 'global-nav-trigger');
  const [panel] = findByClass(element, 'global-nav-panel');

  // Hiding the trigger was only half of it: `setOpen` refused to open at all
  // with one model, so restoring the button without this would have produced a
  // control that does nothing.
  assert.equal(panel.hidden, true, 'closed to begin with');
  trigger.click();
  assert.equal(panel.hidden, false, 'and it opens');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
});

test('scene exits: the way home is a labelled control, not just the wordmark', () => {
  const { element } = oneModel();
  const [brand] = findByClass(element, 'global-nav-brand');

  assert.ok(brand, 'the header has a brand link');
  assert.equal(brand.getAttribute('href'), LANDING_ROUTE);
  // A wordmark in the corner reads as the page's title. The arrow and the word
  // are what make it an offer.
  assert.equal(findByClass(brand, 'global-nav-brand-back').length, 1, 'a back arrow');
  assert.equal(findByClass(brand, 'global-nav-brand-home').length, 1, 'and the word "Home"');
});

test('scene exits: the accessible name leads with the destination, in one language', () => {
  // What a screen reader announces first should be where the link goes, not
  // what the product is called — and it should say it in the language on
  // screen, not read both out.
  for (const [lang, leads, absent] of [['en', /^Home —/, '戻る'], ['ja', /^トップへ戻る —/, 'Home —']]) {
    const [brand] = findByClass(oneModel({ lang }).element, 'global-nav-brand');
    const label = brand.getAttribute('aria-label') ?? '';
    assert.match(label, leads, `${lang}: the destination comes first`);
    assert.equal(label.includes(absent), false, `${lang}: only one language is announced`);
    assert.equal(brand.getAttribute('title'), label, `${lang}: the tooltip agrees`);
  }
});

test('scene exits: the brand is styled as a control, and the narrow gap survives', () => {
  const navigation = read('src/styles/navigation.css');
  const brandRule = navigation.match(/\n\.global-nav-brand \{([^}]*)\}/s)?.[1] ?? '';
  assert.match(brandRule, /border:/, 'a border is what says "pressable"');

  // `product-shell-b6.css` loads after `navigation.css` and had `gap: 0` at
  // narrow widths — correct when dropping the 3D mark left a bare wordmark,
  // wrong now that an arrow comes first. A rule in the earlier sheet cannot
  // fix that, so the stale one had to go rather than be overridden.
  const later = read('src/styles/product-shell-b6.css');
  const narrowGap = later.match(/\.global-nav-brand \{ gap: (\d+)px; \}/)?.[1];
  assert.ok(narrowGap && Number(narrowGap) > 0, `narrow-width brand gap is ${narrowGap ?? 'unset'}`);
});
