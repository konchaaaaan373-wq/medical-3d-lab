import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { leaveForReload } from '../src/app/sceneShellBridge.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Leaving a 3D scene by changing the hash.
 *
 * The reload is not in question — a scene owns a renderer and a GPU context,
 * and a fresh document is how the app is sure none of it survives. What is in
 * question is what the screen says while that happens: a browser paints the
 * outgoing document until the incoming one commits, so the model stayed up
 * under the new URL for the whole of the wait. It was reported as "I pressed
 * the COPD link and got the brain model".
 */

/** Just enough document for a function whose whole job is one element. */
function fakeDocument() {
  const body = { children: [], append(node) { this.children.push(node); } };
  const doc = {
    body,
    createElement: () => ({
      className: '',
      attributes: new Map(),
      innerHTML: '',
      setAttribute(name, value) { this.attributes.set(name, String(value)); },
      getAttribute(name) { return this.attributes.get(name) ?? null; },
      remove() {
        const at = body.children.indexOf(this);
        if (at >= 0) body.children.splice(at, 1);
      },
    }),
    querySelector: (selector) => {
      if (selector !== '.loading[data-leaving]') throw new Error(`unexpected selector ${selector}`);
      return body.children.find(
        (node) => node.className === 'loading' && node.attributes.has('data-leaving')
      ) ?? null;
    },
  };
  return doc;
}

/** A window that only has to remember who is listening for `pageshow`. */
function fakeWindow() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    emit(type, event) { for (const l of [...(listeners.get(type) ?? [])]) l(event); },
  };
}

test('leaving a scene: the model is covered before the reload is asked for', () => {
  const doc = fakeDocument();
  const order = [];
  const reload = () => order.push(`reload (veils: ${doc.body.children.length})`);

  assert.equal(leaveForReload({ doc, reload, language: 'ja' }), true);

  assert.equal(doc.body.children.length, 1, 'a veil was added');
  assert.deepEqual(
    order,
    ['reload (veils: 1)'],
    'the veil is in the document by the time reload is called — the other order paints the old model'
  );
});

test('leaving a scene: the veil is the same one the scene boot paints', () => {
  const doc = fakeDocument();
  leaveForReload({ doc, reload: () => {}, language: 'ja' });
  const [veil] = doc.body.children;

  // `.loading` is `position: fixed; inset: 0; background: var(--bg)` with a
  // z-index above the fixed navigation, which is what makes covering work.
  assert.equal(veil.className, 'loading');
  assert.match(read('src/styles/base.css'), /\.loading \{[^}]*position:\s*fixed/s);
  assert.match(read('src/styles/base.css'), /\.loading \{[^}]*inset:\s*0/s);
  assert.match(veil.innerHTML, /loading-bar/);
});

test('leaving a scene: it says it is leaving, not that a model is loading', () => {
  const ja = fakeDocument();
  leaveForReload({ doc: ja, reload: () => {}, language: 'ja' });
  assert.match(ja.body.children[0].innerHTML, /移動しています/);
  assert.equal(ja.body.children[0].getAttribute('lang'), 'ja');

  const en = fakeDocument();
  leaveForReload({ doc: en, reload: () => {}, language: 'en' });
  assert.match(en.body.children[0].innerHTML, /Opening/);
  assert.equal(en.body.children[0].getAttribute('lang'), 'en');

  // The destination may be a locked model, an index or a legal document, so
  // the copy the scene boot uses would be wrong here more often than not.
  assert.doesNotMatch(ja.body.children[0].innerHTML, /3Dモデルを読み込/);
  assert.doesNotMatch(en.body.children[0].innerHTML, /Loading 3D model/);
});

test('leaving a scene: a second destination is the one that commits', () => {
  const doc = fakeDocument();
  const windowRef = fakeWindow();
  let reloads = 0;
  const reload = () => { reloads += 1; };

  assert.equal(leaveForReload({ doc, windowRef, reload }), true);
  assert.equal(leaveForReload({ doc, windowRef, reload }), false, 'the second caller did not raise the veil');
  assert.equal(leaveForReload({ doc, windowRef, reload }), false);

  // `reload()` loads whatever the address bar says *now*. Swallowing the later
  // calls — which the first version of this did — meant pressing Back during a
  // slow departure was ignored and the original target still committed, so the
  // address bar and the page disagreed.
  assert.equal(reloads, 3, 'every later navigation re-asks, so the newest one wins');
  assert.equal(doc.body.children.length, 1, 'but veils do not stack');
});

test('leaving a scene: a restored page is not left stranded under the veil', () => {
  const doc = fakeDocument();
  const windowRef = fakeWindow();
  leaveForReload({ doc, windowRef, reload: () => {} });
  assert.equal(doc.body.children.length, 1);

  // This document's own first load has nothing to undo.
  windowRef.emit('pageshow', { persisted: false });
  assert.equal(doc.body.children.length, 1, 'a fresh load is not a restore');

  // A restore means the reload never happened: the page is live again, and an
  // opaque click-swallowing veil over it with no reload pending is worse than
  // the stale model this whole change exists to remove.
  windowRef.emit('pageshow', { persisted: true });
  assert.equal(doc.body.children.length, 0, 'the veil comes down');
  assert.equal(windowRef.listeners.get('pageshow')?.size ?? 0, 0, 'and stops listening');
});

test('leaving a scene: the veil covers every overlay in the product', () => {
  const css = read('src/styles/base.css');
  const leaving = css.match(/\.loading\[data-leaving\]\s*\{([^}]*)\}/s);
  assert.ok(leaving, '`[data-leaving]` has its own stacking rule');
  const veilZ = Number(leaving[1].match(/z-index:\s*(\d+)/)?.[1]);
  assert.ok(Number.isFinite(veilZ), 'and that rule sets a z-index');

  // Anything painted above it stays on screen answering for a URL that has
  // already changed. The phone anatomy sheet (40) was the one that mattered:
  // the model's own structure list, opaque, full-width and still pressable.
  const sheets = ['base.css', 'reading-surface.css', 'telemetry.css', 'access.css',
    'anatomy-panel.css', 'landing.css', 'reel.css', 'navigation.css', 'ui.css'];
  for (const sheet of sheets) {
    for (const [, value] of read(`src/styles/${sheet}`).matchAll(/z-index:\s*(\d+)/g)) {
      assert.ok(
        Number(value) <= veilZ,
        `${sheet} paints something at z-index ${value}, above the departure veil at ${veilZ}`
      );
    }
  }
});

test('leaving a scene: the surfaces that render a model all use it', () => {
  const main = read('src/main.js');
  // The landing hero and the catalogue's organ cards are live WebGL too, so a
  // bare reload leaves an organ on screen under the destination's URL.
  const handlers = [...main.matchAll(/window\.addEventListener\('hashchange'[\s\S]{0,320}?\n    \}\);/g)]
    .map((match) => match[0]);
  const withModels = handlers.filter((body) => /leaveForReload\(\)/.test(body));
  assert.ok(withModels.length >= 2, 'landing and the catalogue both leave through the helper');
  assert.match(main, /import \{[\s\S]*?leaveForReload[\s\S]*?\} from '\.\/app\/sceneShellBridge\.js'/);
});

test('leaving a scene: with no document to cover, it still leaves', () => {
  let reloads = 0;
  assert.equal(leaveForReload({ doc: null, reload: () => { reloads += 1; } }), true);
  assert.equal(reloads, 1, 'navigation is the job; the veil is the courtesy');
});

test('leaving a scene: the scene shell uses it instead of reloading directly', () => {
  const app = read('src/app/App.js');
  const handler = app.slice(app.indexOf("window.addEventListener('hashchange'"));
  const body = handler.slice(0, handler.indexOf('});') + 3);

  assert.match(body, /leaveForReload\(\)/);
  assert.doesNotMatch(body, /window\.location\.reload\(\)/, 'the bare reload is what left the model up');
  assert.match(body, /isInPageAnchor/, 'an in-page anchor is still not navigation');
});
