import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { redirectFor } from '../src/app/routeRedirects.js';
import { resolveRoute } from '../src/app/router.js';
import { SHELL_DESTINATIONS } from '../src/components/ShellHeader.js';
import { ANATOMY_ROUTE, EXPLORER_ROUTE, LANDING_ROUTE, MODELS_ROUTE } from '../src/catalog/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Routes that no longer address a page of their own, corrected in the address
 * bar so a shared link still arrives.
 *
 * Until 2026-09-30 the one rule was `#/organs` → `#/`, because the beta
 * landing page *was* the organ chooser (an identical set of 23 controls). The
 * BYOKI MOTION rebrand took the organ hero off the landing page, so `#/organs`
 * is the anatomy page again and is not corrected. The rule now is the disease
 * list's old address, `#/pathology`, which is the product's `#/models`.
 */

test('#/pathology is corrected to #/models, keeping the reader\'s query', () => {
  for (const unlocked of [false, true]) {
    assert.equal(redirectFor('#/pathology', { unlocked }), MODELS_ROUTE);
    assert.equal(redirectFor('#/pathology?purpose=patient', { unlocked }), `${MODELS_ROUTE}?purpose=patient`);
  }
});

test('and corrects nothing else — the anatomy page included', () => {
  // A redirect that reached further would be a way for a model link to stop
  // opening a model, which is the failure every other part of this navigation
  // work exists to remove. `#/organs` and `#/explore` are listed on purpose:
  // they used to be corrected to the landing page, and must not be now that
  // the landing page has no organ on it.
  for (const unlocked of [false, true]) {
    for (const hash of ['#/', '#/models', '#/about', '#/anatomy', '#/organs', '#/explore', '#/trust',
      '#/trust?model=brain-anatomy', '#/terms', '#/privacy', '#/support', '#/commerce', '#/lab',
      '#/brain-anatomy', '#/heart-anatomy', '#/cardiac-output', '#/copd', '#content']) {
      assert.equal(redirectFor(hash, { unlocked }), null, `${hash} (unlocked=${unlocked})`);
    }
  }
});

test('the routes it corrects to, and the anatomy aliases, are ones that render', () => {
  // Asked of the router rather than trusted: a redirect to a slug nothing
  // resolves to would send the reader to the default 3D model, which is the
  // behaviour `resolveRoute` gives anything it does not recognise.
  assert.equal(resolveRoute(MODELS_ROUTE).kind, 'pathology');
  assert.equal(resolveRoute(LANDING_ROUTE).kind, 'landing');
  for (const route of [EXPLORER_ROUTE, ANATOMY_ROUTE, '#/explore']) {
    assert.equal(resolveRoute(route).kind, 'explorer', route);
  }
});

test('the header offers no destination that redirects', () => {
  // A destination offered where the route corrects itself is a link that does
  // nothing visible.
  for (const unlocked of [false, true]) {
    const offered = SHELL_DESTINATIONS.filter((item) => !item.gated || unlocked);
    assert.deepEqual(
      offered.filter((item) => redirectFor(item.route, { unlocked })).map((item) => item.id),
      [],
      `unlocked=${unlocked}: the header offers a destination that redirects`
    );
  }
  const models = SHELL_DESTINATIONS.find((item) => item.id === 'models');
  assert.equal(models.route, MODELS_ROUTE);
  assert.notEqual(models.gated, true, 'Models is the product\'s top level on every build');
});

test('both places that resolve a route apply the correction', () => {
  // Boot and swap. `main.js` corrects before the first surface renders;
  // `shellNavigation.js` corrects inside the swap, because a swap that
  // rendered the landing page under `#/organs` would leave `stillWanted` —
  // which asks the address bar — disagreeing with the screen for the rest of
  // the document's life.
  for (const path of ['src/main.js', 'src/app/shellNavigation.js']) {
    const source = read(path);
    assert.match(source, /redirectFor\(/, `${path} must apply the correction`);
    assert.match(
      source,
      /replaceState/,
      `${path} must correct the address bar too, and without costing a Back press`
    );
  }
});


test('a correction onto the route already painted does not rebuild it', () => {
  // `#/pathology` pressed *from* the model index corrects straight back to the
  // model index. Rebuilding it would tear down and re-mount the surface the
  // reader is looking at and scroll them to the top of it — a visible cost for
  // a navigation that went nowhere.
  //
  // Read from the source rather than driven: the swap's own harness lives in
  // `navigation-swap.test.js` and the condition here is one line in the middle
  // of it. What has to stay true is that the line exists and asks `sameRoute`
  // against what is painted, not against the hash it was handed.
  const source = readFileSync(new URL('../src/app/shellNavigation.js', import.meta.url), 'utf8');
  const corrected = source.slice(source.indexOf('const corrected = redirectFor('));
  const guard = corrected.slice(0, corrected.indexOf('const next = resolveRoute('));
  assert.match(guard, /sameRoute\(hash, shownHash\)/, 'the correction must check what is on screen');
  assert.match(guard, /return true/, 'and return without mounting');
});
