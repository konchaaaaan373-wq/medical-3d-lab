import test from 'node:test';
import assert from 'node:assert/strict';

import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

globalThis.requestAnimationFrame ??= (fn) => { fn(0); return 0; };

/**
 * `aria-current="page"` on the global nav's persistent chrome (F-141).
 *
 * Before this, the drawer marked which *scene* you were looking at
 * (`scene-switcher-models.test.js`) but never which *tab* — Lab or public
 * models — that scene lives under, so a screen reader reading the footer
 * heard two plain links and nothing saying which one you were already in.
 */

const sceneRow = (id, { organ = 'brain', system = 'nervous', status = 'alpha' } = {}) => ({
  id, slug: id, organ, system, status, uses: [], label: id, labelJa: id, tags: ['anatomy'],
});

const group = (id, labelJa, scenes) => ({ id, label: id, labelJa, scenes });

/** A minimal `window` with a mutable hash and a real `hashchange` dispatch. */
function installFakeWindow(initialHash) {
  const previous = globalThis.window;
  const listeners = new Map();
  const win = {
    location: { hash: initialHash },
    addEventListener(type, fn) {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
  };
  globalThis.window = win;
  return {
    setHash(hash) {
      win.location.hash = hash;
      for (const fn of listeners.get('hashchange') ?? []) fn();
    },
    restore() {
      if (previous === undefined) delete globalThis.window;
      else globalThis.window = previous;
    },
  };
}

function mount(groups, currentId, { hash = `#/${currentId}`, showLab = true } = {}) {
  const ui = new FakeElement('div');
  ui.dataset.lang = 'ja';
  const restoreDocument = installFakeDocument({ elements: { ui } });
  const fakeWindow = installFakeWindow(hash);
  // `models: []` — a header row that reaches none of these scenes, which is the
  // only situation the catalogue (and so this footer) is rendered in: the
  // preview unlock, where most of what the menu reaches is not on the row.
  const switcher = createSceneSwitcher({ groups, currentId, showLab, models: [] });
  assert.ok(switcher, 'the switcher rendered');
  return {
    ...switcher,
    setHash: fakeWindow.setHash,
    restore() {
      restoreDocument();
      fakeWindow.restore();
    },
  };
}

const footerLinks = (element) => findByClass(element, 'global-nav-footer-link');
const primaryFooterLink = (element) =>
  footerLinks(element).find((a) => !a.classList.contains('is-secondary'));
const secondaryFooterLink = (element) =>
  footerLinks(element).find((a) => a.classList.contains('is-secondary'));

test('the footer names the tab a public scene already lives under', () => {
  const groups = [group('nervous', '神経', [sceneRow('brain-anatomy', { status: 'alpha' })])];
  const { element, restore } = mount(groups, 'brain-anatomy');
  try {
    const primary = primaryFooterLink(element);
    assert.equal(primary.getAttribute('href'), '#/organs');
    assert.equal(primary.getAttribute('aria-current'), 'page', 'this scene is under the public tab');

    // Never the tab it did not name: the secondary footer link goes to Lab,
    // and a public scene is not Lab.
    const secondary = secondaryFooterLink(element);
    assert.equal(secondary.getAttribute('aria-current'), null);
  } finally {
    restore();
  }
});

test('and the tab a Lab (prototype) scene lives under, not the public one', () => {
  const groups = [group('nervous', '神経', [sceneRow('sketch-scene', { status: 'prototype' })])];
  const { element, restore } = mount(groups, 'sketch-scene');
  try {
    const primary = primaryFooterLink(element);
    assert.equal(primary.getAttribute('href'), '#/lab');
    assert.equal(primary.getAttribute('aria-current'), 'page');

    const secondary = secondaryFooterLink(element);
    assert.equal(secondary.getAttribute('href'), '#/organs');
    assert.equal(secondary.getAttribute('aria-current'), null, 'a Lab scene is not the public tab');
  } finally {
    restore();
  }
});

test('exactly one footer link carries aria-current, whichever tab it is', () => {
  for (const status of ['alpha', 'prototype']) {
    const groups = [group('nervous', '神経', [sceneRow('a-scene', { status })])];
    const { element, restore } = mount(groups, 'a-scene');
    try {
      const marked = footerLinks(element).filter((a) => a.getAttribute('aria-current') === 'page');
      assert.equal(marked.length, 1, `status=${status}: exactly one footer link is current`);
    } finally {
      restore();
    }
  }
});

test('the router, not a string prefix, decides — #/organs and its #/explore alias agree', () => {
  const groups = [group('nervous', '神経', [sceneRow('brain-anatomy')])];
  const { element, setHash, restore } = mount(groups, 'brain-anatomy');
  try {
    // A within-page hash change to the explorer's alternate spelling still
    // resolves to the same 'explorer' kind as '#/organs' — this component
    // never has to special-case the alias by name.
    setHash('#/explore');
    assert.equal(
      primaryFooterLink(element).getAttribute('aria-current'),
      null,
      'this document is no longer showing a scene, by the router\'s own account'
    );
  } finally {
    restore();
  }
});

test('the footer updates on every hash change, not only at mount', () => {
  const groups = [group('nervous', '神経', [sceneRow('brain-anatomy')])];
  const { element, setHash, restore } = mount(groups, 'brain-anatomy');
  try {
    assert.equal(primaryFooterLink(element).getAttribute('aria-current'), 'page');

    setHash('#/organs');
    assert.equal(primaryFooterLink(element).getAttribute('aria-current'), null, 'left the scene');

    // A deep link changing which structure it opens is still the same route
    // (`sameRoute` ignores the structure query) — the footer has to agree.
    setHash('#/brain-anatomy?structure=17');
    assert.equal(primaryFooterLink(element).getAttribute('aria-current'), 'page', 'back on a scene');
  } finally {
    restore();
  }
});
