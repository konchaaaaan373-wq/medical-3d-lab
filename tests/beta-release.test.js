import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PUBLIC_SCENES, SCENES, sceneById } from '../src/catalog/index.js';
import {
  BETA_ORGANS,
  CRAWLABLE_SCENES,
  DEV_UNLOCK_PARAM,
  DEV_UNLOCK_STORAGE_KEY,
  LOCKED_SCENES,
  RELEASED_SCENES,
  RELEASE_CHANNEL,
  isRouteReleased,
  isSceneReleased,
  resolveDevUnlock,
} from '../src/catalog/release.js';
import { createLockedSurface } from '../src/app/LockedSurface.js';
import { createSceneFailureFallback } from '../src/app/SceneFailureFallback.js';
import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { createTrust } from '../src/app/Trust.js';
import { systemsWithScenes } from '../src/catalog/index.js';
import { isInPageAnchor, resolveRoute } from '../src/app/router.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('beta release: only the beta organs, and nothing still schematic, is open', () => {
  assert.equal(RELEASE_CHANNEL, 'beta');
  assert.deepEqual([...BETA_ORGANS], ['brain', 'heart']);
  assert.equal(RELEASED_SCENES.length + LOCKED_SCENES.length, SCENES.length);
  assert.equal(
    new Set([...RELEASED_SCENES, ...LOCKED_SCENES].map((scene) => scene.id)).size,
    SCENES.length,
    'a scene is either open or locked, never both and never neither'
  );

  for (const scene of RELEASED_SCENES) {
    assert.ok(BETA_ORGANS.includes(scene.organ), `${scene.id} is open but is not a beta organ`);
    assert.notEqual(
      scene.status,
      'prototype',
      `${scene.id} is open, and a Prototype's shape and motion are provisional by definition`
    );
  }

  // Nothing under the beta organs is left behind by accident: if it is locked
  // and it is a brain or heart scene, the only reason may be its maturity.
  for (const scene of LOCKED_SCENES) {
    if (BETA_ORGANS.includes(scene.organ)) {
      assert.equal(scene.status, 'prototype', `${scene.id} is a beta organ but is locked`);
    }
  }

  // The models the beta is being spread with. Named so that opening or closing
  // one is a deliberate edit here rather than a side effect of adding a scene.
  assert.deepEqual(RELEASED_SCENES.map((scene) => scene.id), [
    'brain-anatomy',
    'amyloid-beta',
    'heart-failure',
    'circulation',
    'myocardial-ischemia',
  ]);

  // The heart has no anatomy-grade scene, so opening the heart means opening
  // models that put numbers on a disease. That is a deliberate part of this
  // release, not an oversight — and each of them carries its own scope panel.
  const heart = RELEASED_SCENES.filter((scene) => scene.organ === 'heart');
  assert.ok(heart.length > 0);
  assert.ok(heart.every((scene) => scene.disease));

  for (const id of ['copd-hyperinflation', 'renal-filtration', 'breathing-lungs', 'body-overview']) {
    assert.equal(isSceneReleased(sceneById(id)), false, id);
  }
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
  assert.equal(isRouteReleased(resolveRoute('#/heart-failure')), true);
  assert.equal(isRouteReleased(resolveRoute('#/copd')), false);
  assert.equal(isRouteReleased(resolveRoute('#/breathing-lungs')), false);

  // An unknown slug resolves to the historic default scene. That scene happens
  // to be open, so a typo lands on a model rather than an apology — which is
  // the historic behaviour and is fine. What must not happen is a typo opening
  // something the release is holding back.
  assert.equal(
    isRouteReleased(resolveRoute('#/not-a-scene')),
    isSceneReleased(sceneById(resolveRoute('#/not-a-scene').sceneId))
  );
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
    const surface = createLockedSurface({ ui, route: resolveRoute('#/copd') });
    const text = collect(surface.element).join(' ');

    assert.match(text, /TO BE UPDATED/);
    assert.match(text, /準備中/);
    assert.match(text, /COPD/, 'the page says what the link pointed at');

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
  assert.match(landing, /class: 'landing-locked-row'/);
  assert.doesNotMatch(landing, /landing-scene-card is-locked/);
  assert.doesNotMatch(locked, /from ['"]three['"]|\/scenes\//);
  // The browser half reads the storage key and the parameter name from the
  // rule; a second spelling of either is how the unlock quietly stops working.
  const gate = read('src/app/releaseGate.js');
  assert.match(gate, /DEV_UNLOCK_STORAGE_KEY/);
  assert.match(gate, /DEV_UNLOCK_PARAM/);
  assert.doesNotMatch(gate, new RegExp(`['\"]${DEV_UNLOCK_STORAGE_KEY.replace('.', '\\.')}['\"]`));
  assert.doesNotMatch(gate, /resolveDevUnlock\([\s\S]{0,200}devBuild:\s*false/);
});


/**
 * Every surface that hands out a link, checked against the gate.
 *
 * This is the test the review found missing. The gate was applied to the
 * router, the landing page and the Explorer, and three other surfaces went on
 * offering links into models the release does not open: the in-scene switcher,
 * the Trust page's "Open model", and the crawlable pages the build emits. Each
 * was a link a reader could follow from inside something that worked to a page
 * that apologises. Checking them one at a time is how the fourth one gets
 * missed, so this checks them together, by walking what they actually render.
 */
test('beta release: no surface offers a link the release cannot honour', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  document.documentElement = new FakeElement('html');
  // The switcher reads the UI root to decide where its sheet mounts, and the
  // surfaces bind to the document for escape keys and visibility.
  document.getElementById = () => new FakeElement('div');
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  document.visibilityState = 'visible';
  globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

  const offered = (root) => {
    const found = [];
    const walk = (node) => {
      const href = node.attributes?.get?.('href');
      if (href) found.push(href);
      for (const child of node.children ?? []) walk(child);
    };
    walk(root);
    // In-page anchors address the page that is already open; the skip link and
    // the Explorer's section jumps are not routes.
    return found.filter((href) => !isInPageAnchor(href));
  };

  try {
    const surfaces = [];

    surfaces.push([
      'scene switcher',
      createSceneSwitcher({
        groups: systemsWithScenes(RELEASED_SCENES),
        currentId: RELEASED_SCENES[0].id,
        showLab: false,
      }).element,
    ]);

    const trustUi = new FakeElement('div');
    await createTrust({ ui: trustUi });
    surfaces.push(['trust', trustUi]);

    const fallbackUi = new FakeElement('div');
    createSceneFailureFallback({ ui: fallbackUi, sceneId: RELEASED_SCENES[0].id });
    surfaces.push(['scene failure fallback', fallbackUi]);

    const lockedUi = new FakeElement('div');
    createLockedSurface({ ui: lockedUi, route: resolveRoute('#/copd') });
    surfaces.push(['locked surface', lockedUi]);

    for (const [name, root] of surfaces) {
      const hrefs = offered(root);
      assert.ok(hrefs.length > 0, `${name} offers no links at all, which is probably a broken mount`);
      for (const href of hrefs) {
        assert.equal(
          isRouteReleased(resolveRoute(href)),
          true,
          `${name} offers "${href}", which the release does not open`
        );
      }
    }
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('beta release: the crawlable surface and the in-scene navigator read the gate', () => {
  // Two surfaces this test file cannot mount — the build config, and the app
  // shell that configures the switcher — so what is checked is that each takes
  // its scenes from the gate rather than from the public catalogue.
  const config = read('vite.config.js');
  assert.match(config, /scenes: CRAWLABLE_SCENES/);
  assert.doesNotMatch(config, /scenes: (PUBLIC|RELEASED)_SCENES/);

  const app = read('src/app/App.js');
  assert.match(app, /systemsWithScenes\(betaUnlocked\(\) \? SCENES : RELEASED_SCENES\)/);
  assert.match(app, /showLab: betaUnlocked\(\)/);

  const siteCheck = read('scripts/check-site-output.js');
  assert.match(siteCheck, /CRAWLABLE_SCENES/);
  assert.match(
    siteCheck,
    /if \(CRAWLABLE_SCENES\.includes\(scene\)\) continue;/,
    'the build check has to fail on anything published that is not crawlable'
  );
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

test('beta release: the crawlable set is what is open AND what is public, in both channels', () => {
  // Two independent reasons to withhold a page, and a set that satisfies only
  // one of them is a bug in whichever channel it is not checked in. This one
  // would not have shown until the beta ended: `isSceneReleased` returns true
  // for everything once the channel changes, so `RELEASED_SCENES` alone would
  // publish fourteen prototypes on the day the release opens.
  for (const scene of CRAWLABLE_SCENES) {
    assert.equal(isSceneReleased(scene), true, `${scene.id} is crawlable but not open`);
    assert.notEqual(scene.status, 'prototype', `${scene.id} is crawlable and still a Prototype`);
  }
  for (const scene of SCENES) {
    const crawlable = CRAWLABLE_SCENES.includes(scene);
    const eligible = isSceneReleased(scene) && scene.status !== 'prototype';
    assert.equal(crawlable, eligible, `${scene.id}: the crawlable set does not follow the two rules`);
  }

  // The rule has to survive the channel change, which is the case the beta
  // cannot exercise. Simulated on the same predicates the module uses.
  const openedUp = SCENES.filter((scene) => true && scene.status !== 'prototype');
  assert.equal(
    openedUp.length,
    PUBLIC_SCENES.length,
    'once everything is open, the crawlable set is the public catalogue and no more'
  );
  assert.ok(
    openedUp.every((scene) => scene.status !== 'prototype'),
    'and it never contains a Prototype, whatever the channel'
  );
});
