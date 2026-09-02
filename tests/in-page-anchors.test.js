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

test('anchors: every hashchange handler in the shell checks first', () => {
  const main = read('src/main.js');
  const handlers = main.match(/addEventListener\('hashchange', \(\) => \{[\s\S]*?\n {4}\}\)/g) ?? [];
  assert.ok(handlers.length >= 5, `expected a handler per surface, found ${handlers.length}`);
  for (const handler of handlers) {
    assert.match(handler, /isInPageAnchor/, `a hashchange handler navigates on an in-page anchor:\n${handler}`);
  }
});

test('anchors: the scene view checks too, because a reload there costs the session', () => {
  // Reloading a scene throws away the camera, the progression and any model
  // controls the reader had set.
  const app = read('src/app/App.js');
  const handler = app.slice(app.indexOf("addEventListener('hashchange'"));
  assert.match(handler.slice(0, 400), /isInPageAnchor/);
});

test('anchors: the skip link only points at an element that exists', () => {
  // Pointing at a missing id falls through to the browser default, which is
  // the hash navigation the guard exists to prevent.
  const explorer = read('src/app/Explorer.js');
  assert.match(explorer, /skipTargetId \? \[skipLink\(skipTargetId\)\] : \[\]/);
});

test('fallback: the WebGL failure screen can navigate', () => {
  // Its links are the entire reason it exists, and the scene route's own
  // hashchange listener is registered inside `createApp` — which is what threw.
  const main = read('src/main.js');
  const fallback = main.slice(main.indexOf('createSceneFailureFallback({'));
  assert.match(fallback, /addEventListener\('hashchange'/, 'the fallback has no navigation listener');
  assert.match(fallback, /window\.location\.reload\(\)/);
});
