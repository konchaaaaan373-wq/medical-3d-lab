import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createAnatomyPanel } from '../src/components/AnatomyPanel.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The one line under the fixed views, and when it is entitled to be there.
 *
 * It reports a measurement taken at one moment: this recipe, from that
 * viewpoint, with that display. The moment it stops describing what is on
 * screen, it has to go — and it must not go *before* that, which is the trap
 * this component fell into twice.
 *
 * First it was cleared by the app's own camera tween, because the invalidation
 * listened on the controls' `change`: applying the recipe's own viewpoint wiped
 * the report the viewpoint had just been applied to produce. Then, listening on
 * `start` instead, it survived the reader pressing a zoom button, holding `+`,
 * or asking to be taken to a structure — none of which touch the controls.
 *
 * These tests drive the component, not the source text. A regular expression
 * looking for the word `start` would have passed while both bugs were live.
 */

/** A scene with one fixed view, enough surface for the panel to mount. */
function fakeScene({ recipeResult } = {}) {
  const listeners = { selection: [], hover: [], status: [], isolation: [], visibility: [] };
  const notify = (kind, value) => listeners[kind].forEach((fn) => fn(value));
  let selection = null;
  const applied = [];
  return {
    applied,
    notify,
    getAnatomySelection: () => selection,
    setSelection(value) { selection = value; notify('selection', value); },
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
    getAnatomyViews: () => [{ id: 'anterior', label: 'Anterior', labelJa: '前面' }],
    getDisplayRecipes: () => [{
      id: 'inside', label: 'Inside', labelJa: '内側', summary: 's', summaryJa: 's',
      view: 'anterior', shows: ['a', 'b', 'c'], hide: ['x'],
    }],
    applyDisplayRecipe: (id) => {
      applied.push(id);
      return recipeResult ?? {
        ok: true, hid: ['x'], view: 'anterior',
        anchorsClear: ['a', 'b'], anchorsBlocked: ['c'], anchorsUnmeasured: [],
      };
    },
  };
}

function mount({ recipeResult } = {}) {
  const scene = fakeScene({ recipeResult });
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

  const views = [];
  const tree = { element: new FakeElement('div'), refresh: () => {}, dispose: () => {} };
  const panel = createAnatomyPanel({
    scene,
    tree,
    display: new FakeElement('section'),
    legend: null,
    detail: new FakeElement('div'),
    onViewChange: (id, options) => views.push({ id, options }),
  });
  // Only the open tab's content is mounted, and the fixed views live in the
  // Display tab — the same tab the console's display control opens.
  panel.showDisplay();
  return {
    scene,
    panel,
    views,
    status: () => findByClass(panel.element, 'anatomy-recipe-status')[0],
    loadStatus: () => findByClass(panel.element, 'anatomy-panel-status')[0],
    press: () => findByClass(panel.element, 'anatomy-recipe')[0].click(),
    restore() {
      panel.dispose();
      restoreDocument();
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    },
  };
}

const visible = (node) => node && node.hidden !== true;

/** Every text node under an element, joined — the fake DOM has no innerText. */
function allText(node) {
  if (!node) return '';
  const parts = [node.textContent ?? ''];
  for (const child of node.children ?? []) parts.push(allText(child));
  return parts.filter(Boolean).join(' ');
}

test('recipe report: appears when the recipe runs, and says what was measured', () => {
  const m = mount();
  try {
    assert.equal(visible(m.status()), false, 'nothing to report before it is pressed');
    m.press();
    assert.deepEqual(m.scene.applied, ['inside']);
    const text = allText(m.status());
    assert.ok(visible(m.status()), 'the report is there');
    // Two of three anchors clear, one blocked, none unmeasured — and the wording
    // is about anchors from a viewpoint, not about being visible on screen.
    assert.match(text, /2 of 3|対象 3 のうち 2/);
    assert.match(text, /anchor|アンカー/);
    assert.doesNotMatch(text, /\bvisible\b/, 'never claims visibility it did not measure');
  } finally {
    m.restore();
  }
});

test('recipe report: the recipe\'s own viewpoint is applied as not-by-the-reader', () => {
  const m = mount();
  try {
    m.press();
    assert.deepEqual(m.views, [{ id: 'anterior', options: { byReader: false } }]);
    assert.ok(visible(m.status()), 'so the report the recipe just wrote survives its own camera move');
  } finally {
    m.restore();
  }
});

test('recipe report: any display change clears it', () => {
  const m = mount();
  try {
    m.press();
    assert.ok(visible(m.status()));
    // A visibility event is what a hide, an unhide or an isolation produces.
    m.scene.notify('visibility', { hidden: ['y'] });
    assert.equal(visible(m.status()), false, 'the display moved on');
  } finally {
    m.restore();
  }
});

test('recipe report: the owner can invalidate it without a repaint', () => {
  // This is the hook every camera path in App uses. The panel has no camera and
  // no canvas, so a zoom button, a `+` key, "go to it" and "View" all reach it
  // this way.
  const m = mount();
  try {
    m.press();
    assert.ok(visible(m.status()));
    m.panel.noteDisplayChanged();
    assert.equal(visible(m.status()), false);

    // And it is idempotent: a second call on an already-cleared report is not
    // an error and does not resurrect anything.
    m.panel.noteDisplayChanged();
    assert.equal(visible(m.status()), false);
  } finally {
    m.restore();
  }
});

test('recipe report: pressing again re-measures rather than leaving the old number', () => {
  const m = mount();
  try {
    m.press();
    const first = allText(m.status());
    m.panel.noteDisplayChanged();
    m.press();
    const second = allText(m.status());
    assert.ok(visible(m.status()));
    assert.equal(first, second, 'same display, same measurement');
    assert.equal(m.scene.applied.length, 2, 'and it was measured again, not remembered');
  } finally {
    m.restore();
  }
});

test('recipe report: a recipe that does not apply leaves no report', () => {
  const m = mount({ recipeResult: { ok: false, reason: 'unknown-recipe' } });
  try {
    m.press();
    assert.equal(visible(m.status()), false);
    assert.deepEqual(m.views, [], 'and no camera move is asked for');
  } finally {
    m.restore();
  }
});

// ---------------------------------------------------------------------------
// the owner's side: every reader-facing camera path has to call the hook

/** The body of a named function declaration in App.js, braces matched. */
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `App.js has no function ${name}`);
  // Past the parameter list, which may itself contain braces — a destructured
  // options argument with a default is exactly that.
  let parens = 0;
  let afterParams = start;
  for (let i = source.indexOf('(', start); i < source.length; i += 1) {
    if (source[i] === '(') parens += 1;
    else if (source[i] === ')') {
      parens -= 1;
      if (parens === 0) { afterParams = i; break; }
    }
  }
  const open = source.indexOf('{', afterParams);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

test('recipe report: every camera path a reader can take invalidates it', () => {
  // Checked per function rather than by looking for a word anywhere in the
  // file: the previous version of this rule was satisfied by one listener and
  // still missed the zoom buttons, the +/- keys and "go to it".
  const app = readFileSync(new URL('../src/app/App.js', import.meta.url), 'utf8');

  for (const name of ['zoomBy', 'resetView', 'applyInspectionView']) {
    assert.match(
      functionBody(app, name),
      /noteDisplayChanged/,
      `${name} moves the camera for the reader and must invalidate the report`
    );
  }

  // `focusOnStructure` is an arrow, and "go to it" is exactly the path the
  // review found missing.
  const focus = app.slice(app.indexOf('const focusOnStructure = (id) => {'));
  assert.match(focus.slice(0, focus.indexOf('\n  };')), /noteDisplayChanged/);

  // The zoom buttons and the keyboard both route through zoomBy, so one call
  // covers both — assert that routing rather than assuming it.
  assert.match(app, /onZoom: \(direction\) => zoomBy\(direction\)/);
  assert.match(app, /case '\+':[\s\S]{0,80}zoomBy\?\.\(1\)/);
  assert.match(app, /case '-':[\s\S]{0,80}zoomBy\?\.\(-1\)/);

  // A drag, a pinch and a wheel come through the controls, and it must stay
  // `start` — `change` fires for the app's own tweens too.
  assert.match(app, /addEventListener\?\.\('start', \(\) => anatomyPanel\?\.noteDisplayChanged\?\.\(\)\)/);
  assert.doesNotMatch(app, /addEventListener\?\.\('change', \(\) => anatomyPanel\?\.noteDisplayChanged/);

  // And the one path that must NOT invalidate: the app applying a recipe's own
  // viewpoint on the reader's behalf.
  assert.match(app, /applyInspectionView\(id, \{ byReader = true \} = \{\}\)/);
  assert.match(app, /if \(byReader\) anatomyPanel\?\.noteDisplayChanged\?\.\(\)/);
});

test('a failed load is said in the summary, which is always mounted', () => {
  // The words already existed, in the Detail tab's footer — and the tab body
  // holds only the open tab's content (`body.replaceChildren(tab.content)`), so
  // with Parts open, which is the default, they were not in the document at
  // all. A model that failed to load therefore said nothing anywhere the reader
  // was looking. Driving the real app with the candidate GLB blocked is what
  // found it.
  const harness = mount();
  try {
    const line = harness.loadStatus();
    assert.ok(line, 'the summary carries a load-status line');
    assert.equal(line.hidden, true, 'and it stays out of the way while the model is ready');

    harness.scene.notify('status', { state: 'error', selectableCount: 0 });
    assert.equal(harness.loadStatus().hidden, false, 'a failure is shown');
    assert.match(allText(harness.loadStatus()), /could not be loaded/);
    assert.match(allText(harness.loadStatus()), /読み込めませんでした/);
    assert.equal(harness.loadStatus().dataset.state, 'error');

    harness.scene.notify('status', { state: 'loading' });
    assert.equal(harness.loadStatus().hidden, false, 'so is a load still in progress');

    harness.scene.notify('status', { state: 'ready', selectableCount: 46 });
    assert.equal(harness.loadStatus().hidden, true, 'and a healthy scene looks exactly as it did');
  } finally {
    harness.restore();
  }
});
