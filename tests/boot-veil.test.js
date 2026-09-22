import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DOCUMENT_ROUTE_SLUGS, resolveRoute } from '../src/app/router.js';

/**
 * The wait, painted before the bundle exists.
 *
 * Opening a model is a document load. Between the new document committing and
 * `main.js` running far enough to create a loading element there was a gap with
 * nothing on screen — caught in a screenshot 400 ms into a brain → heart
 * switch, with the build marker painted and nothing else. No work inside the
 * bundle can close that, because the bundle is what is being waited for, so the
 * veil is markup in `index.html` and the decision to show it is nine lines of
 * inline script.
 *
 * Which buys one duplication: the inline script cannot import the router, so it
 * carries its own copy of "every slug that is not a model". This file is what
 * makes that copy safe. Without it, adding a route means a "loading a 3D model"
 * veil flashing over a page with no model on it, and nothing would fail.
 */

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');

/** The array literal the inline script decides from. */
function inlineDocumentRoutes() {
  const match = html.match(/var DOCUMENT_ROUTES = (\[[^\]]*\]);/);
  assert.ok(match, 'index.html must declare DOCUMENT_ROUTES for the boot veil');
  return JSON.parse(match[1].replace(/'/g, '"'));
}

test('the boot veil and the router agree on what is not a model', () => {
  assert.deepEqual(
    [...inlineDocumentRoutes()].sort(),
    [...DOCUMENT_ROUTE_SLUGS].sort(),
    'index.html carries a copy of router.js\'s DOCUMENT_ROUTE_SLUGS — update both'
  );
});

test('every slug in that list really does resolve to something other than a scene', () => {
  // The lists agreeing is not enough on its own: they could agree and both be
  // wrong. This asks the router itself, one slug at a time.
  for (const slug of inlineDocumentRoutes()) {
    assert.notEqual(
      resolveRoute(`#/${slug}`).kind,
      'scene',
      `#/${slug} is in the boot veil's exempt list but resolves to a scene`
    );
  }
});

test('a model route is not in the list, so the veil is painted for it', () => {
  const inline = inlineDocumentRoutes();
  for (const slug of ['brain-anatomy', 'heart-anatomy', 'lung-anatomy', 'liver-anatomy']) {
    assert.equal(inline.includes(slug), false, `${slug} must reach the veil`);
    assert.equal(resolveRoute(`#/${slug}`).kind, 'scene');
  }
  // And an unknown slug, which `resolveRoute` sends to the default scene: the
  // veil has to be painted for it too, or a mistyped deep link opens a model
  // behind a blank page.
  assert.equal(inline.includes('not-a-real-model'), false);
  assert.equal(resolveRoute('#/not-a-real-model').kind, 'scene');
});

test('the veil markup is there for the script to find, and starts hidden', () => {
  assert.match(html, /id="boot-veil"/, 'the element the inline script reveals');
  assert.match(html, /id="boot-veil-label"/, 'the element it writes the sentence into');
  // Hidden in the markup, revealed by the script. The other way round would
  // flash a loading veil over every reading surface for one frame — which is
  // the bug this whole mechanism exists to remove, reintroduced at the top.
  assert.match(
    html,
    /<div id="boot-veil"[^>]*\shidden\b/,
    'the veil must start hidden and be revealed, never start visible and be hidden'
  );
  // It reuses `.loading`, so it is the same opaque element the departure veil
  // and `main.js` use. A second class would be a second appearance.
  assert.match(html, /<div id="boot-veil"[^>]*class="loading"/);
});

test('the inline script parses the hash the way the router does', () => {
  // `#/trust?model=heart-anatomy` is the trust page, not a model, and the
  // reader following a "sources & limits" link from a scene must not get a
  // "loading a 3D model" veil over a page of prose. The inline script has to
  // strip the query the same way `slugOf` does.
  assert.match(html, /split\('\?'\)\[0\]/, 'the inline script must drop the query string');
  assert.match(html, /replace\(\/\^#\\\/\?\/, ''\)/, 'and the leading #/');
  assert.equal(resolveRoute('#/trust?model=heart-anatomy').kind, 'trust');
});
