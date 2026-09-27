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

test('scene exits: one open model still gets the site menu', () => {
  const { element } = oneModel();
  const [trigger] = findByClass(element, 'site-menu-trigger');

  // The model drawer's trigger used to be hidden whenever the scene list held a
  // single entry. That is exactly the public beta, so a 3D scene shipped with
  // no navigation control on it at all — and the links inside the drawer,
  // which are the routes to every other page, went with it. The site menu is
  // on every header, whatever the scene count.
  assert.ok(trigger, 'the menu has a trigger');
  assert.equal(trigger.hidden, false, 'and it is not hidden away');
  assert.ok(element.classList.contains('is-single'), 'the header still knows it is one model');
});

test('scene exits: and that menu opens, and reaches the pages a scene has no row for', () => {
  const { element } = oneModel();
  const [trigger] = findByClass(element, 'site-menu-trigger');
  const [panel] = findByClass(element, 'site-menu-panel');

  // Hiding the trigger was only half of it: `setOpen` refused to open at all
  // with one model, so restoring the button without this would have produced a
  // control that does nothing.
  assert.equal(panel.hidden, true, 'closed to begin with');
  trigger.click();
  assert.equal(panel.hidden, false, 'and it opens');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');

  const hrefs = [...findByClass(panel, 'site-menu-link'), ...findByClass(panel, 'site-menu-legal-link')]
    .map((link) => link.getAttribute('href'));
  assert.ok(hrefs.includes('#/terms'), 'the terms are one press away, which a model had no route to at all');
  assert.ok(hrefs.includes('#/support'), 'and so is support');
  assert.equal(hrefs.includes('#/trust'), false, 'the publication ledger is not a reader destination (2026-09-27)');
});

test('scene exits: the way home is the product icon alone, and says where it goes', () => {
  // Owner's decision, 2026-09-27: `← M/3 Medical 3D Lab | ホーム` said "home"
  // twice. What stays is the icon — the same one as the tab — and a name for
  // assistive tech that leads with the destination (next test).
  const { element } = oneModel();
  const [brand] = findByClass(element, 'global-nav-brand');

  assert.ok(brand, 'the header has a brand link');
  assert.equal(brand.getAttribute('href'), LANDING_ROUTE);
  assert.equal(findByClass(brand, 'brand-icon').length, 1, 'the product icon');
  assert.deepEqual(
    brand.children.map((child) => child.className),
    [findByClass(brand, 'brand-icon')[0].className],
    'and nothing else: no arrow, no name, no ホーム'
  );
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
