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

test('leaving a scene: asking twice reloads once', () => {
  const doc = fakeDocument();
  let reloads = 0;
  const reload = () => { reloads += 1; };

  assert.equal(leaveForReload({ doc, reload }), true);
  assert.equal(leaveForReload({ doc, reload }), false, 'the second caller is told it did not start it');
  assert.equal(leaveForReload({ doc, reload }), false);

  assert.equal(reloads, 1, 'a hashchange can arrive more than once before the document is replaced');
  assert.equal(doc.body.children.length, 1, 'and veils do not stack');
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
