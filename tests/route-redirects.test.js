import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { redirectFor } from '../src/app/routeRedirects.js';
import { resolveRoute } from '../src/app/router.js';
import { SHELL_DESTINATIONS } from '../src/components/ShellHeader.js';
import { EXPLORER_ROUTE, LANDING_ROUTE } from '../src/catalog/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * `#/organs` in the beta is the landing page with a different heading.
 *
 * Driven in a browser, the two surfaces exposed an identical set of 23
 * controls in the same order — the same organ hero, the same organ chips, the
 * same "open this model" and "sources & limits" buttons. `createExplorer` is
 * why: it sees the release gate and hands straight over to
 * `createPublicModelsExplorer`, which is the function the landing page uses.
 *
 * Two pages with the same controls are one page with two entrances, and the
 * reader pays for it: "Models" in the header and the wordmark beside it went
 * to the same models and neither said which one you were on.
 *
 * These tests fix both halves of the answer — the route corrects itself, and
 * the duplicate header destination is not offered — and, just as importantly,
 * that **neither half applies under the preview unlock**, where `#/organs` is
 * the real Explorer with seventy models, search and filters in it.
 */

test('the beta corrects #/organs and its alias to the landing page', () => {
  for (const hash of ['#/organs', '#/explore', '#/organs?x=1']) {
    assert.equal(
      redirectFor(hash, { unlocked: false }),
      LANDING_ROUTE,
      `${hash} must not render a copy of the landing page`
    );
  }
});

test('and corrects nothing else', () => {
  // The rule is one route. A redirect that reached further would be a way for
  // a model link to stop opening a model, which is the failure every other
  // part of this navigation work exists to remove.
  for (const hash of ['#/', '#/trust', '#/trust?model=brain-anatomy', '#/terms', '#/privacy',
    '#/support', '#/commerce', '#/lab', '#/brain-anatomy', '#/heart-anatomy', '#/copd', '#content']) {
    assert.equal(redirectFor(hash, { unlocked: false }), null, hash);
  }
});

test('the preview unlock keeps the Explorer, because there it is a real page', () => {
  for (const hash of ['#/organs', '#/explore']) {
    assert.equal(redirectFor(hash, { unlocked: true }), null, hash);
  }
});

test('the route it corrects to is one that renders', () => {
  // Asked of the router rather than trusted: a redirect to a slug nothing
  // resolves to would send the reader to the default 3D model, which is the
  // behaviour `resolveRoute` gives anything it does not recognise.
  assert.equal(resolveRoute(LANDING_ROUTE).kind, 'landing');
  assert.equal(resolveRoute(EXPLORER_ROUTE).kind, 'explorer');
});

test('the beta header does not offer a destination the beta redirects away from', () => {
  const models = SHELL_DESTINATIONS.find((item) => item.id === 'models');
  assert.ok(models, 'the Models destination still exists for the unlocked build');
  assert.equal(models.route, EXPLORER_ROUTE);
  assert.equal(
    models.gated,
    true,
    'a header link whose destination redirects is a link that does nothing visible'
  );

  // The two halves must agree. A destination offered where the route corrects
  // itself is a link to the page the reader is already on; a destination
  // withheld where the route does render is a page with no way in.
  for (const unlocked of [false, true]) {
    const offered = SHELL_DESTINATIONS.filter((item) => !item.gated || unlocked);
    const redirected = offered.filter((item) => redirectFor(item.route, { unlocked }));
    assert.deepEqual(
      redirected.map((item) => item.id),
      [],
      `unlocked=${unlocked}: the header offers a destination that redirects`
    );
  }
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
  // `#/organs` pressed *from* the landing page corrects straight back to the
  // landing page. Rebuilding it would tear down and re-mount the surface the
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
