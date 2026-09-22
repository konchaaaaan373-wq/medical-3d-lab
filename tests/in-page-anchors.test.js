import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SCENES } from '../src/catalog/index.js';
import { isInPageAnchor, resolveRoute } from '../src/app/router.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Every route in this product is written `#/something`. A hash without that
 * slash addresses an element on a page that is already open.
 *
 * This distinction did not exist until a skip link needed it: `#content` fell
 * through to `resolveRoute`, resolved to a scene, and every surface's
 * hashchange handler reloaded into the default 3D model.
 */

test('anchors: a hash without a leading slash is not a route', () => {
  for (const hash of ['#content', '#system-renal', '#system-cardiovascular', '#top']) {
    assert.equal(isInPageAnchor(hash), true, hash);
  }
});

test('anchors: every real route is not an anchor', () => {
  for (const hash of ['#/', '#/organs', '#/lab', '#/trust', '#/terms', '#/privacy', '']) {
    assert.equal(isInPageAnchor(hash), false, hash);
  }
  for (const scene of SCENES) {
    assert.equal(isInPageAnchor(`#/${scene.slug}`), false, scene.slug);
  }
});

test('anchors: the router would still resolve one to a scene, which is why the guard exists', () => {
  // `resolveRoute` sends anything unknown to the historic default scene, which
  // is deliberate for a malformed deep link and catastrophic for an in-page
  // anchor. The guard is what keeps the two apart.
  assert.equal(resolveRoute('#content').kind, 'scene');
  assert.equal(isInPageAnchor('#content'), true);
});

test('anchors: no shell can forget the check, because no shell makes it', () => {
  // This used to read every inline `hashchange` handler in `main.js` and
  // require each to mention `isInPageAnchor` — six handlers, six chances to
  // omit it, and a seventh surface would have arrived with no guard at all.
  // There is one door now, so the assertion is that nobody built a side one.
  // What the door does with an anchor is `tests/departure.test.js`.
  const main = read('src/main.js');
  const app = read('src/app/App.js');

  for (const [name, source] of [['main.js', main], ['App.js', app]]) {
    assert.doesNotMatch(
      source,
      /addEventListener\('hashchange'/,
      `${name} decides for itself what a hash change means, so it can get anchors wrong alone`
    );
    assert.match(source, /installDeparture\(/, `${name} never installs the shared departure`);
  }

  // There is now one installation for all the document surfaces, rather than
  // one per branch: `shellNavigation.js` installs the door once and keeps it
  // across route changes, because a route change between reading surfaces no
  // longer replaces the document. Counting call sites would therefore be
  // counting the wrong thing — what matters is that every surface is behind
  // one, and that nobody opened a side door.
  const shell = read('src/app/shellNavigation.js');
  assert.match(shell, /installDeparture\(\{/, 'the document surfaces share one door');
  assert.doesNotMatch(
    shell,
    /addEventListener\('hashchange'/,
    'shellNavigation.js decides for itself what a hash change means'
  );

  // The scene keeps its own, because it owns a document of its own; the
  // fallback keeps one for the same reason. Two, and both are the shared one.
  assert.match(main, /leaveOnRouteChange\(\);/, 'the scene-failure surface is covered');
  assert.match(app, /installDeparture\(\{/, 'the scene is covered');

  // No surface may route by hand. `documentSurfaces.js` builds pages and must
  // never grow an opinion about navigation.
  const surfaces = read('src/app/documentSurfaces.js');
  assert.doesNotMatch(surfaces, /addEventListener\('hashchange'/);
  assert.doesNotMatch(surfaces, /location\.reload/);
});

test('anchors: the scene view is covered by the same door, because a reload there costs the session', () => {
  // Reloading a scene throws away the camera, the progression and any model
  // controls the reader had set.
  const app = read('src/app/App.js');
  assert.match(app, /installDeparture\(\{[\s\S]{0,200}shownHash/);
});

test('anchors: the skip link only points at an element that exists', () => {
  // Pointing at a missing id falls through to the browser default, which is
  // the hash navigation the guard exists to prevent.
  const explorer = read('src/app/Explorer.js');
  assert.match(explorer, /skipTargetId \? \[skipLink\(skipTargetId\)\] : \[\]/);
});

test('fallback: the WebGL failure screen can navigate', () => {
  // Its links are the entire reason it exists, and the scene route's own
  // departure is installed inside `createApp` — which is what threw. So this
  // branch has to install one of its own.
  const main = read('src/main.js');
  const fallback = main.slice(main.indexOf('createSceneFailureFallback({'));
  assert.match(fallback, /leaveOnRouteChange\(\);/, 'the fallback has no navigation listener');
});
