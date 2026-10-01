import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnatomyPanel } from '../src/components/AnatomyPanel.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The switch between the heart with its aorta and the heart on its own.
 *
 * Driven through the component, against a scene that keeps the one value the
 * switch reads. What is held here is the panel's half of the contract: it is
 * on screen whenever the scene has two ways of looking and never otherwise, it
 * says which way is on in the attribute a screen reader reads, pressing it
 * asks the scene and nothing else, and it follows a change the reader did not
 * make through it — a way of looking, "Unhide all", "Show it".
 */
function fakeScene({ scopes = true } = {}) {
  const listeners = { selection: [], hover: [], status: [], isolation: [], visibility: [], scope: [] };
  // Ids that are not the heart's: the panel is shared, and asks the scene
  // which way the switch goes rather than knowing (review finding, 2026-10-01).
  const ON = 'wide';
  const OFF = 'narrow';
  let scope = ON;
  const asked = [];
  const scene = {
    asked,
    getAnatomySelection: () => null,
    onAnatomySelection: (fn) => { listeners.selection.push(fn); return () => {}; },
    onAnatomyHover: (fn) => { listeners.hover.push(fn); return () => {}; },
    getAnatomyStatus: () => ({ state: 'ready', selectableCount: 2 }),
    onAnatomyStatus: (fn) => { listeners.status.push(fn); return () => {}; },
    getAnatomyTree: () => [],
    getAnatomyInventory: () => [],
    isolateStructure: () => false,
    clearIsolation: () => false,
    getAnatomyIsolation: () => null,
    onAnatomyIsolation: (fn) => { listeners.isolation.push(fn); return () => {}; },
    getAnatomyVisibility: () => ({ hidden: [] }),
    onAnatomyVisibility: (fn) => { listeners.visibility.push(fn); return () => {}; },
    isStructureVisible: () => true,
    canRestoreDisplay: () => false,
    /** A change made somewhere else — a recipe, "Unhide all". */
    switchElsewhere(next) {
      scope = next;
      for (const fn of listeners.scope) fn({ id: scope, on: scope === ON, next: scope === ON ? OFF : ON });
    },
  };
  if (scopes) {
    Object.assign(scene, {
      getDisplayScope: () => ({
        id: scope, on: scope === ON, next: scope === ON ? OFF : ON, label: 'Aorta and main branches', labelJa: '大動脈・主要分枝を表示',
        hint: 'Off shows the heart on its own.', hintJa: 'オフで心臓だけ。',
      }),
      setDisplayScope: (next) => {
        asked.push(next);
        scene.switchElsewhere(next);
        return { ok: true, changed: true };
      },
      onDisplayScope: (fn) => { listeners.scope.push(fn); return () => {}; },
    });
  }
  return scene;
}

function mount(options) {
  const scene = fakeScene(options);
  const restoreDocument = installFakeDocument();
  document.documentElement = new FakeElement('html');
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  document.activeElement = null;
  const previousWindow = globalThis.window;
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const panel = createAnatomyPanel({
    scene,
    tree: { element: new FakeElement('div'), refresh: () => {}, dispose: () => {} },
    display: new FakeElement('section'),
    legend: null,
    detail: new FakeElement('div'),
  });
  return {
    scene,
    toggle: () => findByClass(panel.element, 'anatomy-scope-switch')[0],
    restore() {
      panel.dispose();
      restoreDocument();
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    },
  };
}

test('scope switch: on screen for a scene with two ways of looking, off it for every other', () => {
  const without = mount({ scopes: false });
  try {
    assert.equal(without.toggle(), undefined, 'a scene with one way of looking gets no switch');
  } finally {
    without.restore();
  }
  const m = mount();
  try {
    const toggle = m.toggle();
    assert.ok(toggle, 'the switch is there');
    assert.equal(toggle.getAttribute('role'), 'switch');
    assert.equal(toggle.getAttribute('aria-checked'), 'true', 'it opens on: the heart with its aorta');
    assert.equal(toggle.hidden, false);
  } finally {
    m.restore();
  }
});

test('scope switch: pressing it asks the scene, and it reads back what the scene says', () => {
  const m = mount();
  try {
    m.toggle().click();
    assert.deepEqual(m.scene.asked, ['narrow']);
    assert.equal(m.toggle().getAttribute('aria-checked'), 'false');
    m.toggle().click();
    assert.deepEqual(m.scene.asked, ['narrow', 'wide']);
    assert.equal(m.toggle().getAttribute('aria-checked'), 'true');
    // Changed somewhere else — a way of looking framed on the heart — and the
    // switch follows rather than going on claiming the aorta is on.
    m.scene.switchElsewhere('narrow');
    assert.equal(m.toggle().getAttribute('aria-checked'), 'false');
  } finally {
    m.restore();
  }
});
