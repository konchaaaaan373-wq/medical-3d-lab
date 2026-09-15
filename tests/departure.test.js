import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEPARTURE_BACKSTOP_MS, hashChangeAction, installDeparture } from '../src/app/departure.js';
import { FakeElement, installFakeDocument } from './helpers/fake-dom.js';

/**
 * Leaving a document without showing the wrong answer while you go.
 *
 * The reported bug: a link to `#/copd` from the brain viewer left the brain on
 * screen with `#/copd` in the address bar, because the browser keeps painting
 * the old document until the reload commits.
 *
 * A veil fixes that and introduces a worse failure if it cannot come down, so
 * most of this file is about taking it down. The earlier attempt at this change
 * went through four review rounds and every defect but one was in the takedown:
 * a `pageshow`-only rule that same-document Back never fires, a latch that was
 * never released, a re-armed timer that re-queried the DOM at fire time, and a
 * single-flight that swallowed the second navigation.
 */

/** A window stand-in that records what was asked of it. */
function fakeWindow(hash) {
  const listeners = new Map();
  return {
    location: {
      hash,
      reloads: 0,
      reload() { this.reloads += 1; },
    },
    addEventListener(type, fn) {
      const forType = listeners.get(type) ?? new Set();
      forType.add(fn);
      listeners.set(type, forType);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    /** Move to a hash and fire the event, the way a browser would. */
    go(next) {
      this.location.hash = next;
      for (const fn of listeners.get('hashchange') ?? []) fn();
    },
    restore() {
      for (const fn of listeners.get('pageshow') ?? []) fn({ persisted: true });
    },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
  };
}

/** Timers that only fire when a test says so. */
function fakeClock() {
  const armed = new Map();
  let next = 1;
  return {
    setTimer(fn, ms) { armed.set(next, { fn, ms }); return next++; },
    clearTimer(id) { armed.delete(id); },
    get pending() { return [...armed.keys()]; },
    /** Fire everything currently armed. */
    tick() {
      for (const [id, { fn }] of [...armed]) { armed.delete(id); fn(); }
    },
  };
}

function scene(hash = '#/brain-anatomy', options = {}) {
  const restore = installFakeDocument();
  globalThis.document.body = new FakeElement('body');
  const windowRef = fakeWindow(hash);
  const clock = fakeClock();
  const departure = installDeparture({
    windowRef,
    doc: globalThis.document,
    shownHash: hash,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    ...options,
  });
  const veils = () => globalThis.document.body.children.filter((node) => node.className === 'loading');
  return { windowRef, clock, departure, veils, restore, doc: globalThis.document };
}

const textIn = (node, out = []) => {
  if (node.textContent) out.push(node.textContent);
  for (const child of node.children ?? []) textIn(child, out);
  return out;
};

// ---------------------------------------------------------------- the policy

test('a hash change is one of three things, and an anchor is the third', () => {
  // `ignore`, not `stay`. Collapsing these two is what uncovered a page that
  // was still leaving, because an anchor arriving after a departure read as
  // "we are back where we started".
  assert.equal(hashChangeAction('#top', '#/brain-anatomy'), 'ignore', 'a skip link on a scene');
  // And measured from a page that is *not* the default scene, because a bare
  // `#top` resolves to the default scene: asserting only from
  // `#/brain-anatomy` passes whether or not anchors are handled at all, which
  // is how the first version of this line let a mutation through.
  assert.equal(hashChangeAction('#top', '#/organs'), 'ignore', 'a skip link on the explorer');
  assert.equal(hashChangeAction('#section', '#/terms'), 'ignore', 'a skip link on the terms page');

  assert.equal(hashChangeAction('#/brain-anatomy', '#/brain-anatomy'), 'stay', 'the same scene');
  assert.equal(hashChangeAction('#/explore', '#/organs'), 'stay', 'an alias of the same route');

  assert.equal(hashChangeAction('#/copd', '#/brain-anatomy'), 'leave', 'another scene');
  assert.equal(hashChangeAction('#/organs', '#/brain-anatomy'), 'leave', 'the explorer');

  // Two legal documents are two routes. The explorer's old rule read them as
  // one — harmlessly, because you cannot reach one from the other without
  // leaving the explorer first, which that rule did catch. Pinned anyway: it
  // is the case a `kind`-only comparison gets wrong, and the next surface to
  // be written might be reachable from both.
  assert.equal(hashChangeAction('#/privacy', '#/terms'), 'leave', 'two legal documents are two routes');
});

// ------------------------------------------------------------ the way out

test('takedown: going back to the shown route in the same document uncovers it', () => {
  const { windowRef, veils, restore } = scene('#/brain-anatomy');
  try {
    windowRef.go('#/copd');
    assert.equal(veils().length, 1, 'covered on the way out');

    // Back, before the reload commits. The document never went away, so no
    // `pageshow` fires — this hashchange is the only signal there is, and a
    // veil that waits for `pageshow` stays up over a page that is staying.
    windowRef.go('#/brain-anatomy');
    assert.equal(veils().length, 0, 'and uncovered when the reader comes back');
  } finally {
    restore();
  }
});

test('takedown: a restored page arrives with the veil still in it', () => {
  const { windowRef, veils, restore } = scene('#/brain-anatomy');
  try {
    windowRef.go('#/copd');
    assert.equal(veils().length, 1);
    windowRef.restore();
    assert.equal(veils().length, 0, 'pageshow persisted takes it down');
  } finally {
    restore();
  }
});

test('takedown: the backstop offers to ask again rather than revealing the old answer', () => {
  const { windowRef, clock, veils, restore } = scene('#/brain-anatomy', { backstopMs: 50 });
  try {
    windowRef.go('#/copd');
    assert.equal(windowRef.location.reloads, 1);

    clock.tick();

    // Still covered. Automatically revealing a model that does not match the
    // URL after a wait is the original bug on a timer, not a recovery.
    assert.equal(veils().length, 1, 'the veil stays');
    const [veil] = veils();
    const said = textIn(veil).join(' ');
    assert.match(said, /時間がかかっています/);
    assert.match(said, /もう一度読み込む/);

    const [, retry] = veil.children;
    retry.click();
    assert.equal(windowRef.location.reloads, 2, 'and asking again asks again');
    assert.match(textIn(veil).join(' '), /移動しています/, 'back to working');
  } finally {
    restore();
  }
});

test('takedown: destroy removes the veil and stops listening', () => {
  const { windowRef, departure, veils, restore } = scene('#/brain-anatomy');
  try {
    windowRef.go('#/copd');
    assert.equal(veils().length, 1);
    departure.destroy();
    assert.equal(veils().length, 0);
    assert.equal(windowRef.listenerCount('hashchange'), 0);
    assert.equal(windowRef.listenerCount('pageshow'), 0);
  } finally {
    restore();
  }
});

// ------------------------------------------------------------ the way in

test('the veil goes up before the reload is asked for', () => {
  const order = [];
  const restore = installFakeDocument();
  globalThis.document.body = new FakeElement('body');
  const append = globalThis.document.body.append.bind(globalThis.document.body);
  globalThis.document.body.append = (...nodes) => { order.push('veil'); return append(...nodes); };
  const windowRef = fakeWindow('#/brain-anatomy');
  const clock = fakeClock();
  try {
    installDeparture({
      windowRef,
      doc: globalThis.document,
      shownHash: '#/brain-anatomy',
      reload: () => order.push('reload'),
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
    });
    windowRef.go('#/copd');
    // Reversed, the browser gets a chance to paint the old model after the hash
    // has already changed — which is the whole defect.
    assert.deepEqual(order, ['veil', 'reload']);
  } finally {
    restore();
  }
});

test('a second departure is asked for too, and does not stack veils', () => {
  const { windowRef, veils, restore } = scene('#/brain-anatomy');
  try {
    windowRef.go('#/copd');
    windowRef.go('#/asthma');

    // Two reloads, one veil. Single-flighting the reload would leave the
    // browser fetching the destination the reader changed their mind about.
    assert.equal(windowRef.location.reloads, 2, 'the last hash chosen is the one asked for');
    assert.equal(veils().length, 1, 'and the veil is not doubled');
  } finally {
    restore();
  }
});

test('re-arming the backstop cancels the first one', () => {
  const { windowRef, clock, restore } = scene('#/brain-anatomy', { backstopMs: 50 });
  try {
    windowRef.go('#/copd');
    assert.equal(clock.pending.length, 1);
    windowRef.go('#/asthma');
    // A leaked first timer fires later and rewrites a veil that a different
    // navigation is responsible for.
    assert.equal(clock.pending.length, 1, 'one armed timer, not two');
  } finally {
    restore();
  }
});

test('an in-page anchor on a page that is not a scene is still not a navigation', () => {
  // The explorer, where `resolveRoute('#top')` is a *different* route from the
  // one on screen. Reloading here would throw the reader out of the catalogue
  // for using a skip link.
  const { windowRef, veils, restore } = scene('#/organs');
  try {
    windowRef.go('#top');
    assert.equal(veils().length, 0);
    assert.equal(windowRef.location.reloads, 0, 'a skip link on the explorer reloads nothing');
  } finally {
    restore();
  }
});

test('an in-page anchor after departure neither covers nor uncovers', () => {
  const { windowRef, veils, restore } = scene('#/brain-anatomy');
  try {
    windowRef.go('#top');
    assert.equal(veils().length, 0, 'a skip link is not a navigation');
    assert.equal(windowRef.location.reloads, 0);

    windowRef.go('#/copd');
    windowRef.go('#section');
    assert.equal(veils().length, 1, 'and it does not uncover a page that is leaving');
  } finally {
    restore();
  }
});

test('the veil is announced and marked, and does not fade', () => {
  const { windowRef, veils, restore } = scene('#/brain-anatomy');
  try {
    windowRef.go('#/copd');
    const [veil] = veils();
    assert.equal(veil.getAttribute('role'), 'status');
    assert.equal(veil.dataset.leaving, '');
    // "Opening", not "Loading 3D model": the destination is often not a model
    // at all — the explorer, the terms, a page for a model that is not open.
    assert.match(textIn(veil).join(' '), /移動しています/);
  } finally {
    restore();
  }
});

// ------------------------------------------------------------- the stacking

test('nothing in any stylesheet is stacked above the departure veil', () => {
  const dir = fileURLToPath(new URL('../src/styles/', import.meta.url));
  const sheets = readdirSync(dir).filter((name) => name.endsWith('.css'));

  // Every sheet, found by listing the directory. An earlier version of this
  // guard hardcoded nine of them while its commit message claimed it walked
  // them all, which is worse than not having it: a new sheet with a higher
  // layer would have been invisible to it forever.
  assert.ok(sheets.length > 20, `only ${sheets.length} stylesheets found — is the path right?`);

  let veilLayer = null;
  const higher = [];
  for (const name of sheets) {
    const css = readFileSync(`${dir}${name}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const layer = [...body.matchAll(/z-index:\s*(-?\d+)/g)].at(-1)?.[1];
      if (layer === undefined) continue;
      if (selectors.includes('[data-leaving]')) veilLayer = Number(layer);
      else higher.push({ where: `${name}: ${selectors.trim().split('\n').join(' ')}`, layer: Number(layer) });
    }
  }

  assert.ok(veilLayer !== null, 'the departure veil declares a z-index');
  for (const { where, layer } of higher) {
    assert.ok(layer < veilLayer, `${where} is at ${layer}, at or above the veil's ${veilLayer}`);
  }
});

test('the backstop is long enough to be a backstop', () => {
  // Short enough to matter, long enough that a slow but working reload is not
  // interrupted by an offer to retry it.
  assert.ok(DEPARTURE_BACKSTOP_MS >= 5_000, `${DEPARTURE_BACKSTOP_MS}ms would fire during normal loads`);
  assert.ok(DEPARTURE_BACKSTOP_MS <= 30_000, `${DEPARTURE_BACKSTOP_MS}ms is long enough to feel broken`);
});
