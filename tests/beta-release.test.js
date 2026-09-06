import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SCENES, sceneById } from '../src/catalog/index.js';
import {
  DEV_UNLOCK_PARAM,
  DEV_UNLOCK_STORAGE_KEY,
  LOCKED_SCENES,
  RELEASED_SCENES,
  RELEASE_CHANNEL,
  isOrganModel,
  isRouteReleased,
  isSceneReleased,
  resolveDevUnlock,
} from '../src/catalog/release.js';
import { createLockedSurface } from '../src/app/LockedSurface.js';
import { resolveRoute } from '../src/app/router.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('beta release: the catalogue is split by whether a model makes a claim about a disease', () => {
  assert.equal(RELEASE_CHANNEL, 'beta');
  assert.equal(RELEASED_SCENES.length + LOCKED_SCENES.length, SCENES.length);
  assert.equal(
    new Set([...RELEASED_SCENES, ...LOCKED_SCENES].map((scene) => scene.id)).size,
    SCENES.length,
    'a scene is either open or locked, never both and never neither'
  );

  for (const scene of RELEASED_SCENES) {
    assert.equal(scene.disease, null, `${scene.id} is open, so it must not be about a disease`);
    assert.equal(isOrganModel(scene), true);
  }
  for (const scene of LOCKED_SCENES) {
    assert.ok(scene.disease, `${scene.id} is locked, so it must be a disease model`);
  }

  // The models the beta is being spread with. Named so that opening one is a
  // deliberate edit here rather than a side effect of adding a scene.
  assert.equal(isSceneReleased(sceneById('brain-anatomy')), true);
  assert.equal(isSceneReleased(sceneById('body-overview')), true);
  assert.equal(isSceneReleased(sceneById('breathing-lungs')), true);
  assert.equal(isSceneReleased(sceneById('heart-failure')), false);
  assert.equal(isSceneReleased(sceneById('amyloid-beta')), false);
  assert.equal(isSceneReleased(sceneById('circulation')), false);
});

test('beta release: the product shell stays open and the experimental surface does not', () => {
  assert.equal(isRouteReleased(resolveRoute('#/')), true, 'the landing page is how anyone arrives');
  assert.equal(isRouteReleased(resolveRoute('#/organs')), true);
  assert.equal(isRouteReleased(resolveRoute('#/explore')), true);
  assert.equal(isRouteReleased(resolveRoute('#/trust')), true);
  assert.equal(isRouteReleased(resolveRoute('#/terms')), true, 'legal documents are never gated');
  assert.equal(isRouteReleased(resolveRoute('#/privacy')), true);
  assert.equal(isRouteReleased(resolveRoute('#/lab')), false);
  assert.equal(isRouteReleased(resolveRoute('#/experimental')), false);

  assert.equal(isRouteReleased(resolveRoute('#/brain-anatomy')), true);
  assert.equal(isRouteReleased(resolveRoute('#/heart-failure')), false);

  // An unknown slug resolves to the historic default scene, which is locked.
  // It must land on "to be updated", not silently open a disease model.
  assert.equal(isRouteReleased(resolveRoute('#/not-a-scene')), false);
  assert.equal(isRouteReleased(null), false);
});

test('beta release: development stays open without anyone editing the gate', () => {
  // `npm run dev` never has to opt in.
  assert.deepEqual(resolveDevUnlock({ devBuild: true }), { unlocked: true, persist: null });
  assert.deepEqual(
    resolveDevUnlock({ devBuild: true, search: `?${DEV_UNLOCK_PARAM}=0` }),
    { unlocked: true, persist: null }
  );

  // On a built site the parameter opens it, and is remembered.
  assert.deepEqual(
    resolveDevUnlock({ search: `?${DEV_UNLOCK_PARAM}=1` }),
    { unlocked: true, persist: true }
  );
  assert.deepEqual(
    resolveDevUnlock({ search: `?${DEV_UNLOCK_PARAM}=1&utm_source=x` }),
    { unlocked: true, persist: true }
  );

  // And closes it again, explicitly, so a shared laptop can be handed back.
  for (const off of ['0', 'false', 'off', 'no', '']) {
    assert.deepEqual(
      resolveDevUnlock({ search: `?${DEV_UNLOCK_PARAM}=${off}`, stored: 'on' }),
      { unlocked: false, persist: false },
      `?${DEV_UNLOCK_PARAM}=${off}`
    );
  }

  // Without the parameter, only a previously remembered answer counts.
  assert.deepEqual(resolveDevUnlock({ stored: 'on' }), { unlocked: true, persist: null });
  assert.deepEqual(resolveDevUnlock({ stored: null }), { unlocked: false, persist: null });
  assert.deepEqual(resolveDevUnlock({ stored: 'anything-else' }), { unlocked: false, persist: null });
  assert.deepEqual(resolveDevUnlock(), { unlocked: false, persist: null });
});

test('beta release: a locked deep link still answers as a page', () => {
  const restoreDocument = installFakeDocument();
  document.documentElement = new FakeElement('html');

  try {
    const ui = new FakeElement('div');
    const surface = createLockedSurface({ ui, route: resolveRoute('#/heart-failure') });
    const text = collect(surface.element).join(' ');

    assert.match(text, /TO BE UPDATED/);
    assert.match(text, /準備中/);
    assert.match(text, /Heart failure/, 'the page says what the link pointed at');
    assert.match(text, /心不全/);

    // Every link it offers has to be a route the beta actually opens.
    const hrefs = links(surface.element);
    assert.ok(hrefs.length > 0);
    for (const href of hrefs) {
      assert.equal(isRouteReleased(resolveRoute(href)), true, href);
    }
    assert.ok(hrefs.includes('#/organs'), 'the way out is the open catalogue');
  } finally {
    restoreDocument();
  }
});

test('beta release: the locked route names the surface even when it is not a scene', () => {
  const restoreDocument = installFakeDocument();
  document.documentElement = new FakeElement('html');

  try {
    const ui = new FakeElement('div');
    const surface = createLockedSurface({ ui, route: resolveRoute('#/lab') });
    const text = collect(surface.element).join(' ');
    assert.match(text, /TO BE UPDATED/);
    assert.match(text, /Experimental Lab/);
  } finally {
    restoreDocument();
  }
});

test('beta release: a locked route never downloads the scene it is refusing to show', () => {
  const main = read('src/main.js');
  const gate = main.indexOf('if (!open) {');
  assert.ok(gate > 0, 'main.js has to decide before it routes');
  assert.ok(gate < main.indexOf("import('./app/App.js')"), 'the gate runs before the scene app loads');
  assert.ok(gate < main.indexOf("import('./app/Landing.js')"));
  assert.match(main, /if \(open && route\.kind === 'scene'\) recordSceneVisit/);

  // The locked branch imports the plain-DOM surface and nothing heavier.
  const branch = main.slice(gate, main.indexOf("if (route.kind === 'landing')"));
  assert.match(branch, /import\('\.\/app\/LockedSurface\.js'\)/);
  assert.doesNotMatch(branch, /App\.js|loadScene|Viewer/);
});

test('beta release: the catalogue surfaces read the same gate rather than their own list', () => {
  const explorer = read('src/app/Explorer.js');
  const landing = read('src/app/Landing.js');
  const locked = read('src/app/LockedSurface.js');

  for (const source of [explorer, landing]) {
    assert.match(source, /from '\.\.\/catalog\/release\.js'|from '\.\/releaseGate\.js'/);
  }
  // A locked model is not a link that apologises — it is not a link.
  assert.match(explorer, /el\('span', \{ class: 'explorer-scene is-locked' \}/);
  assert.match(landing, /class: 'landing-scene-card is-locked'/);
  assert.doesNotMatch(locked, /from ['"]three['"]|\/scenes\//);
  // The browser half reads the storage key and the parameter name from the
  // rule; a second spelling of either is how the unlock quietly stops working.
  const gate = read('src/app/releaseGate.js');
  assert.match(gate, /DEV_UNLOCK_STORAGE_KEY/);
  assert.match(gate, /DEV_UNLOCK_PARAM/);
  assert.doesNotMatch(gate, new RegExp(`['\"]${DEV_UNLOCK_STORAGE_KEY.replace('.', '\\.')}['\"]`));
  assert.doesNotMatch(gate, /resolveDevUnlock\([\s\S]{0,200}devBuild:\s*false/);
});

/** Every text node under an element, in order. */
function collect(node, out = []) {
  if (node.textContent) out.push(node.textContent);
  for (const child of node.children ?? []) collect(child, out);
  return out;
}

/** Every href under an element. */
function links(node, out = []) {
  const href = node.attributes?.get?.('href');
  if (href) out.push(href);
  for (const child of node.children ?? []) links(child, out);
  return out;
}
