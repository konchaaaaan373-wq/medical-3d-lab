import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { createLanding } from '../src/app/Landing.js';
import { createLandingOrganHero } from '../src/app/landingOrganHero.js';
import { mountLandingOrganViewport, shouldLoadDetail } from '../src/app/landingOrganViewport.js';
import {
  LANDING_FLOW_BUDGETS,
  createLandingFlowField,
  landingFlowConfig,
} from '../src/app/landingFlowField.js';
import { SCENES, organById, sceneById } from '../src/catalog/index.js';
import { RELEASED_SCENES, isSceneReleased } from '../src/catalog/release.js';
import { hasOrganModel } from '../src/app/organModels.js';
import { createLanguageToggle } from '../src/components/LanguageToggle.js';
import {
  LANDING_MODEL_ORDER,
  orderLandingScenes,
  validateLandingPresentation,
} from '../src/data/landing.js';
import { HERO_ORGANS, HERO_ROTATION, featuredHeroOrgan, heroRotationDay } from '../src/data/landingHero.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** Every text node under an element, in order. */
function collectText(node, out = []) {
  if (node.textContent) out.push(node.textContent);
  for (const child of node.children ?? []) collectText(child, out);
  return out;
}

test('landing: every listed model has one curated question and stays reachable', () => {
  assert.deepEqual(validateLandingPresentation(SCENES), []);

  const ordered = orderLandingScenes(SCENES);
  assert.equal(ordered.length, SCENES.length);
  assert.equal(new Set(ordered.map((scene) => scene.id)).size, SCENES.length);
  assert.deepEqual(
    ordered.map((scene) => scene.id),
    LANDING_MODEL_ORDER
  );
  assert.equal(ordered[0].id, 'brain-anatomy', 'the beta leads with a model it actually opens');

  // The open models come first. A visitor who stops reading part way down has
  // still only seen models they can actually open.
  const firstLocked = ordered.findIndex((scene) => !isSceneReleased(scene));
  const lastOpen = ordered.reduce((last, scene, index) => (isSceneReleased(scene) ? index : last), -1);
  assert.ok(firstLocked > lastOpen, 'released models must not be interleaved with locked ones');
});

test('landing hero: the initial model is fixed and does not change with the date', () => {
  const rotation = [HERO_ORGANS[0], HERO_ORGANS[1]];
  const first = featuredHeroOrgan(new Date(Date.UTC(2026, 8, 6)), rotation);
  const later = featuredHeroOrgan(new Date(Date.UTC(2027, 0, 14)), rotation);

  assert.equal(heroRotationDay(new Date(Date.UTC(2026, 8, 6))), 0);
  assert.equal(heroRotationDay(new Date(Date.UTC(2027, 0, 14))), 0);
  assert.equal(first.organ, 'brain');
  assert.equal(later.organ, 'brain');
});

test('landing hero: every rotation entry is a real organ that opens a released model', () => {
  assert.equal(HERO_ORGANS[0].organ, 'brain');

  // The declared list is the target, the rotation is what is shown, and the
  // difference between them is exactly what is not finished. An entry naming a
  // scene the release does not open is dropped, never repointed at a
  // neighbouring model — which is how the heart came to link to heart failure.
  assert.deepEqual(
    HERO_ROTATION.map((entry) => entry.organ),
    HERO_ORGANS.filter((entry) => isSceneReleased(sceneById(entry.sceneId))).map((entry) => entry.organ)
  );
  assert.ok(HERO_ROTATION.length > 0, 'the hero has to have something to show');
  const heart = HERO_ORGANS.find((entry) => entry.organ === 'heart');
  assert.equal(heart.sceneId, 'heart-anatomy', 'the heart entry names an anatomy scene, built or not');
  // The scene exists now, and the hero still does not show it: what the filter
  // asks is whether the release *opens* it, not whether it was written. That
  // distinction is the whole mechanism, and this is where it is checked.
  assert.ok(sceneById(heart.sceneId), 'the scene is registered');
  assert.equal(isSceneReleased(sceneById(heart.sceneId)), false);
  assert.equal(HERO_ROTATION.includes(heart), false, 'and it is not shown until the release opens it');

  for (const entry of HERO_ROTATION) {
    // The detailed model that replaces the builder has to be a scene the
    // release actually opens, or the hero would be showing geometry from
    // something a visitor is told is not ready.
    if (entry.upgradeSceneId) {
      const upgrade = sceneById(entry.upgradeSceneId);
      assert.ok(upgrade, `${entry.upgradeSceneId} is not a registered scene`);
      assert.equal(isSceneReleased(upgrade), true, entry.upgradeSceneId);
    }
    for (const key of ['kickerEn', 'kickerJa']) {
      assert.ok(entry[key]?.trim(), `${entry.organ}: ${key} is empty`);
    }
    assert.ok(organById(entry.organ), `${entry.organ} is not an organ in the taxonomy`);
    assert.equal(hasOrganModel(entry.organ), true, `${entry.organ} has no standalone builder`);

    const scene = sceneById(entry.sceneId);
    assert.ok(scene, `${entry.sceneId} is not a registered scene`);
    assert.equal(
      isSceneReleased(scene),
      true,
      `the hero must never offer a model the release has locked (${entry.sceneId})`
    );
    for (const key of ['lineEn', 'lineJa']) {
      assert.equal(typeof entry[key], 'string');
      assert.ok(entry[key].trim().length > 0, `${entry.organ}: ${key} is empty`);
    }
  }
});

test('landing: ambient particles have explicit device, data and motion budgets', () => {
  const phone = landingFlowConfig({ width: 390, height: 844, devicePixelRatio: 3 });
  const phoneBoundary = landingFlowConfig({ width: 720, height: 900, devicePixelRatio: 3 });
  const tabletBoundary = landingFlowConfig({ width: 721, height: 900, devicePixelRatio: 3 });
  const tablet = landingFlowConfig({ width: 900, height: 900, devicePixelRatio: 3 });
  const desktop = landingFlowConfig({ width: 1440, height: 900, devicePixelRatio: 3 });
  const largeDesktop = landingFlowConfig({ width: 1920, height: 1080, devicePixelRatio: 3 });
  const tallTablet = landingFlowConfig({ width: 1200, height: 1400, devicePixelRatio: 3 });
  const saveData = landingFlowConfig({ width: 1440, height: 900, devicePixelRatio: 3, saveData: true });
  const reduced = landingFlowConfig({ width: 390, height: 844, reducedMotion: true });

  assert.equal(phone.deviceClass, 'phone');
  assert.equal(phoneBoundary.deviceClass, 'phone');
  assert.equal(tabletBoundary.deviceClass, 'tablet');
  assert.equal(tablet.deviceClass, 'tablet');
  assert.equal(desktop.deviceClass, 'desktop');
  assert.ok(phone.particleCount <= LANDING_FLOW_BUDGETS.phone.maxParticles);
  assert.ok(tablet.particleCount <= LANDING_FLOW_BUDGETS.tablet.maxParticles);
  assert.ok(desktop.particleCount <= LANDING_FLOW_BUDGETS.desktop.maxParticles);
  assert.equal(largeDesktop.particleCount, LANDING_FLOW_BUDGETS.desktop.maxParticles);
  assert.equal(tallTablet.particleCount, LANDING_FLOW_BUDGETS.tablet.maxParticles);
  assert.ok(saveData.particleCount < desktop.particleCount);
  assert.ok(saveData.fps <= 20);
  assert.equal(saveData.pixelRatio, 1);
  assert.equal(reduced.animate, false);
});

test('landing: switching to reduced motion cancels the already queued frame', () => {
  let motionChanged = null;
  let nextFrame = 0;
  const cancelled = [];
  const motionQuery = {
    matches: false,
    addEventListener: (_type, listener) => { motionChanged = listener; },
    removeEventListener() {},
  };
  const context = {
    setTransform() {},
    clearRect() {},
    save() {},
    translate() {},
    rotate() {},
    beginPath() {},
    ellipse() {},
    fill() {},
    restore() {},
  };
  const canvas = {
    className: '',
    dataset: {},
    setAttribute() {},
    getContext: () => context,
    remove() {},
  };
  const doc = {
    visibilityState: 'visible',
    createElement: () => canvas,
    addEventListener() {},
    removeEventListener() {},
  };
  const win = {
    innerWidth: 390,
    innerHeight: 844,
    devicePixelRatio: 3,
    navigator: {},
    matchMedia: () => motionQuery,
    requestAnimationFrame: () => ++nextFrame,
    cancelAnimationFrame: (frame) => cancelled.push(frame),
    addEventListener() {},
    removeEventListener() {},
  };

  const field = createLandingFlowField({ win, doc, random: () => 0.5 });
  assert.equal(nextFrame, 1);

  motionQuery.matches = true;
  motionChanged();
  assert.deepEqual(cancelled, [1]);
  assert.equal(nextFrame, 1, 'reduced-motion mode must not queue a replacement frame');

  field.destroy();
});

test('landing: the shell stays readable while the hero dynamically mounts a real organ model', () => {
  const landing = read('src/app/Landing.js');
  const hero = read('src/app/landingOrganHero.js');
  const main = read('src/main.js');
  const viewport = read('src/app/landingOrganViewport.js');
  const flow = read('src/app/landingFlowField.js');
  const css = read('src/styles/landing.css');

  for (const source of [landing, hero, flow]) {
    assert.doesNotMatch(source, /from ['"]three['"]|\/scenes\//);
  }
  assert.match(hero, /featuredHeroOrgan/);
  assert.match(hero, /import\('\.\/landingOrganViewport\.js'\)/);
  assert.match(viewport, /ORGAN_HERO_BUILDERS/);
  assert.match(viewport, /Viewer/);
  assert.match(viewport, /IntersectionObserver/);
  assert.match(viewport, /viewer\.stop\(\)/);
  assert.match(viewport, /viewer\.composer\.render\(\)/);
  assert.match(viewport, /document\.visibilityState/);
  assert.match(viewport, /container\.addEventListener\('keydown', keyboardMoved\)/);
  assert.match(viewport, /'ArrowLeft'[\s\S]*'ArrowRight'[\s\S]*'Home'/);
  assert.match(viewport, /style\.touchAction = 'pan-y pinch-zoom'/);
  assert.match(main, /onRendererFailure:[\s\S]*captureRendererFailure\(error/);
  assert.match(landing, /PUBLIC_MANIFEST/, 'the page reads the open set from the manifest');
  assert.match(landing, /heroOrgansForModels/);
  assert.doesNotMatch(landing, /posterPath|posterKind/);
  assert.doesNotMatch(css, /overflow:\s*hidden/);
  assert.doesNotMatch(css, /touch-action:\s*none/);
  assert.match(css, /touch-action:\s*pan-y pinch-zoom/);
  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.landing-demo-viewport canvas/);
  assert.match(css, /\.landing-demo-drag-hint\[hidden\]\s*\{[^}]*display:\s*none/s);
  assert.match(
    css,
    /\.landing-demo-viewport:focus-visible\s*\{[^}]*outline-offset:\s*-[\d.]+px/s,
    'the focus indicator must be drawn inside the clipped 3D stage',
  );
  assert.match(css, /\.landing-demo-state\.is-selected/);
  assert.match(css, /\.landing-demo-state-grid\.is-organs/);
});

test('landing: one public model is the live brain, not a one-card index', () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {};

  try {
    const ui = new FakeElement('div');
    const mounted = createLanding({ ui });
    const controls = findByClass(mounted.element, 'landing-demo-state');
    const viewports = findByClass(mounted.element, 'landing-demo-viewport');
    const links = findByClass(mounted.element, 'landing-cta');

    assert.equal(PUBLIC_MANIFEST.count, 1);
    assert.equal(findByClass(mounted.element, 'landing-scene-card').length, 0);
    assert.equal(viewports.length, 1);
    assert.equal(controls.length, 0);
    assert.ok(links.some((link) => link.getAttribute('href') === '#/brain-anatomy'));
    assert.equal(mounted.organHero.organ, 'brain');
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing hero: the open link and the day badge follow the organ on screen', () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {};

  try {
    const hero = createLandingOrganHero({ now: () => new Date(Date.UTC(2026, 8, 6)) });
    const badge = findByClass(hero.element, 'landing-demo-case')[0];
    const link = findByClass(hero.element, 'landing-demo-link')[0];

    assert.equal(hero.organ, 'brain');
    assert.equal(badge.hidden, false, "the day's own organ is marked as such");
    assert.equal(link.getAttribute('href'), '#/brain-anatomy');

    // An organ that is not in the rotation cannot be selected into view: the
    // hero has nothing to show for it and must not fall back to a neighbour.
    void hero.setOrgan('heart');
    assert.equal(hero.organ, 'brain');
    assert.equal(link.getAttribute('href'), '#/brain-anatomy');
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing: leaving the route cancels a 3D viewport that is still loading', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { requestAnimationFrame() {} };

  let finishLoading;
  let mountCount = 0;
  const loadViewport = () => new Promise((resolve) => {
    finishLoading = resolve;
  });

  try {
    const hero = createLandingOrganHero({ loadViewport });
    const pending = hero.mount();
    hero.destroy();
    finishLoading({
      mountLandingOrganViewport() {
        mountCount += 1;
        return { setOrgan: async () => null, destroy() {} };
      },
    });

    assert.equal(await pending, null);
    assert.equal(mountCount, 0, 'a detached route must not start a WebGL viewer');
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing: a failed 3D hero exposes its fallback message', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  const previousError = console.error;
  globalThis.window = { requestAnimationFrame() {} };
  console.error = () => {};
  const rendererError = new Error('no WebGL');
  let reportedError = null;

  try {
    const hero = createLandingOrganHero({
      loadViewport: () => Promise.reject(rendererError),
      onRendererFailure: (error) => { reportedError = error; },
    });
    await hero.mount();
    const loading = findByClass(hero.element, 'landing-demo-loading')[0];
    const viewport = findByClass(hero.element, 'landing-demo-viewport')[0];
    const dragHint = findByClass(hero.element, 'landing-demo-drag-hint')[0];

    assert.equal(loading.getAttribute('role'), 'status');
    assert.equal(loading.getAttribute('aria-live'), 'polite');
    assert.match(collectText(loading).join(' '), /この環境では脳の3Dモデル/);
    assert.equal(hero.element.dataset.viewport, 'unavailable');
    assert.equal(viewport.getAttribute('tabindex'), '-1');
    assert.equal(viewport.getAttribute('role'), 'presentation');
    assert.equal(viewport.getAttribute('aria-hidden'), 'true');
    assert.equal(viewport.getAttribute('aria-label'), '');
    assert.equal(viewport.getAttribute('aria-describedby'), '');
    assert.equal(dragHint.getAttribute('hidden'), '');
    assert.equal(hero.element.getAttribute('aria-busy'), 'false');
    assert.equal(reportedError, rendererError);
  } finally {
    console.error = previousError;
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing: a deferred real model has one explicit load action', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { requestAnimationFrame() {} };
  let retryCount = 0;

  try {
    const hero = createLandingOrganHero({
      compact: true,
      showOpenLink: false,
      loadViewport: async () => ({
        mountLandingOrganViewport(_container, options) {
          return {
            async setOrgan() {
              options.onStateChange('deferred', {});
            },
            async retryDetail() {
              retryCount += 1;
              options.onStateChange('loading', {});
            },
            destroy() {},
          };
        },
      }),
    });
    await hero.mount();

    const retry = findByClass(hero.element, 'landing-demo-retry')[0];
    assert.equal(hero.element.dataset.viewport, 'deferred');
    assert.equal(retry.hidden, false);
    assert.match(collectText(retry).join(' '), /3Dモデルを読み込む/);

    retry.click();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(retryCount, 1);
    assert.equal(hero.element.dataset.viewport, 'loading');
    assert.equal(hero.element.getAttribute('aria-busy'), 'true');
    assert.equal(retry.hidden, true, 'a running attempt cannot be started again');
    hero.destroy();
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing: a viewer that fails during setup is released, not left half-built', () => {
  let viewerDisposed = 0;
  const container = { dataset: {}, addEventListener() {}, removeEventListener() {} };

  class FailingViewer {
    constructor() {
      this.renderer = { domElement: { style: {} } };
      this.scene = {
        add() {
          throw new Error('failed midway through viewer setup');
        },
        remove() {},
      };
    }

    dispose() {
      viewerDisposed += 1;
    }
  }

  assert.throws(
    () => mountLandingOrganViewport(container, { ViewerClass: FailingViewer }),
    /failed midway/
  );
  assert.equal(viewerDisposed, 1);
  assert.equal(container.dataset.ready, undefined);
});

/** A Viewer stand-in with real Three objects, so framing maths runs for real. */
function createFakeViewerClass() {
  class FakeViewer {
    static instance = null;

    constructor() {
      FakeViewer.instance = this;
      this.running = false;
      // A real canvas has a box, and the keyboard path asks it for one: the
      // middle of the frame is the only place a keyboard user can aim.
      this.renderer = {
        domElement: {
          style: {},
          getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        },
      };
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(42, 1.5, 0.1, 200);
      this.controls = {
        target: new THREE.Vector3(),
        minDistance: 0,
        maxDistance: 100,
        autoRotate: true,
        autoRotateSpeed: 0,
        addEventListener() {},
        removeEventListener() {},
        update() {},
      };
      this.renderCount = 0;
      this.composer = { render: () => { this.renderCount += 1; } };
    }

    onResize() { return () => {}; }
    onFrame() { return () => {}; }
    start() { this.running = true; }
    stop() { this.running = false; }
    dispose() {}
  }
  return FakeViewer;
}

const cubeBuilders = {
  brain: async (Three) => ({
    object: new Three.Mesh(new Three.BoxGeometry(2, 2, 2), new Three.MeshBasicMaterial()),
  }),
  heart: async (Three) => ({
    object: new Three.Mesh(new Three.BoxGeometry(1, 1, 1), new Three.MeshBasicMaterial()),
  }),
};

test('landing hero viewport: swapping organs never leaves two models in the frame', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  globalThis.window = {
    innerWidth: 1200,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    // The hero ends itself when the page goes away, so it listens here.
    addEventListener() {},
    removeEventListener() {},
  };

  try {
    const FakeViewer = createFakeViewerClass();
    const container = new FakeElement('div');
    const mounted = mountLandingOrganViewport(container, {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
    });

    await mounted.setOrgan('brain');
    const heroes = () => FakeViewer.instance.scene.children.filter((child) => child.name.endsWith('-hero'));
    assert.deepEqual(heroes().map((child) => child.name), ['brain-hero']);
    assert.equal(container.dataset.organ, 'brain');
    assert.equal(container.dataset.ready, 'true');

    await mounted.setOrgan('heart');
    assert.deepEqual(heroes().map((child) => child.name), ['heart-hero']);
    assert.equal(mounted.organ, 'heart');

    // Two swaps in flight at once: the loser must throw its own build away,
    // and the second click must not short-circuit against the organ that is
    // still on screen while the first build is still running.
    const [first, second] = await Promise.all([mounted.setOrgan('brain'), mounted.setOrgan('heart')]);
    assert.equal(first, null, 'a superseded build attaches nothing');
    assert.equal(second, 'heart');
    assert.equal(heroes().length, 1);
    assert.deepEqual(heroes().map((child) => child.name), ['heart-hero']);
    assert.equal(mounted.organ, 'heart');

    mounted.destroy();
    assert.equal(heroes().length, 0);
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing hero viewport: the focused 3D viewport rotates, zooms and resets from the keyboard', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  globalThis.window = {
    innerWidth: 1200,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    // The hero ends itself when the page goes away, so it listens here.
    addEventListener() {},
    removeEventListener() {},
  };

  try {
    const FakeViewer = createFakeViewerClass();
    const container = new FakeElement('div');
    const mounted = mountLandingOrganViewport(container, {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
    });
    await mounted.setOrgan('brain');

    const viewer = FakeViewer.instance;
    const initial = viewer.camera.position.clone();
    const press = (key) => {
      let prevented = false;
      for (const listener of container.listeners.get('keydown') ?? []) {
        listener({ key, preventDefault: () => { prevented = true; } });
      }
      assert.equal(prevented, true, `${key} should not scroll the page while the viewport has focus`);
    };

    press('ArrowRight');
    assert.ok(viewer.camera.position.distanceTo(initial) > 0.1);
    const rotatedDistance = viewer.camera.position.distanceTo(viewer.controls.target);

    press('+');
    assert.ok(viewer.camera.position.distanceTo(viewer.controls.target) < rotatedDistance);

    press('Home');
    assert.ok(viewer.camera.position.distanceTo(initial) < 1e-9, 'Home restores the opening pose');
    mounted.destroy();
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});


test('landing hero: the detailed model is not sent down a metered or crawling connection', () => {
  assert.equal(shouldLoadDetail(undefined), true, 'a browser that does not report is given the model');
  assert.equal(shouldLoadDetail({ effectiveType: '4g' }), true);
  assert.equal(shouldLoadDetail({ effectiveType: '3g' }), true);
  assert.equal(shouldLoadDetail({ saveData: true, effectiveType: '4g' }), false, 'data saver is a request');
  assert.equal(shouldLoadDetail({ effectiveType: '2g' }), false);
  assert.equal(shouldLoadDetail({ effectiveType: 'slow-2g' }), false);
});

test('landing hero viewport: only a rendered published scene becomes ready', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  const previousError = console.error;
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  globalThis.window = {
    innerWidth: 1200,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    // The hero ends itself when the page goes away, so it listens here.
    addEventListener() {},
    removeEventListener() {},
  };
  console.error = () => {};

  /** A scene shaped like the real ones: built at once, contents arrive later. */
  const makeSceneClass = (name) => {
    let resolveReady;
    class FakeScene {
      static cameraPose = { position: new THREE.Vector3(0, 1, 9), target: new THREE.Vector3() };
      static framing = { minHorizontalAspect: 1 };
      static allowAutoRotate = false;
      static settle = null;
      constructor({ viewer }) {
        this.viewer = viewer;
        this.root = new THREE.Group();
        this.root.name = name;
        this.ready = new Promise((resolve) => { resolveReady = resolve; });
        FakeScene.settle = resolveReady;
      }
      build() { return this.root; }
      update() {}
      dispose() { FakeScene.disposed = (FakeScene.disposed ?? 0) + 1; }
    }
    return FakeScene;
  };

  try {
    const FakeViewer = createFakeViewerClass();
    const Detailed = makeSceneClass('detailed-brain');
    const container = new FakeElement('div');
    const mounted = mountLandingOrganViewport(container, {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => Detailed,
      detailTimeoutMs: 100,
    });

    await mounted.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    const names = () => FakeViewer.instance.scene.children.map((child) => child.name);

    const builder = FakeViewer.instance.scene.children.find((child) => child.name === 'brain-hero');
    assert.ok(builder, 'the existing builder remains available to this consumer');
    assert.equal(builder.visible, false, 'the builder is not presented as the published model');
    assert.equal(container.dataset.detail, 'loading');
    assert.equal(container.dataset.ready, undefined);
    const staged = FakeViewer.instance.scene.children.find((c) => c.name === 'detailed-brain');
    assert.ok(staged);
    assert.equal(staged.visible, false, 'stage 2 stays hidden until it is ready');

    Detailed.settle();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(container.dataset.detail, 'ready');
    assert.equal(staged.visible, true);
    assert.ok(!names().includes('brain-hero'), 'the builder comes down once it has been replaced');
    assert.equal(mounted.detailScene, 'brain-anatomy');
    assert.ok(FakeViewer.instance.renderCount > 0, 'ready follows a real render call');
    // The scene brought its own lighting rig, so the hero's comes off.
    assert.ok(!names().includes('organ-lights'));

    // A metered connection is never sent the detailed model at all.
    const deferredContainer = new FakeElement('div');
    const cheap = mountLandingOrganViewport(deferredContainer, {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => { throw new Error('must not be reached'); },
      detailAllowed: () => false,
    });
    await cheap.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    assert.equal(cheap.detailScene, null);
    assert.equal(cheap.state, 'deferred');
    assert.equal(deferredContainer.dataset.ready, undefined);
    cheap.destroy();

    // A failed load is explicit and the lightweight builder stays hidden.
    const failingContainer = new FakeElement('div');
    let failingAttempt = 0;
    const failing = mountLandingOrganViewport(failingContainer, {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      detailTimeoutMs: 100,
      loadSceneClass: async () => {
        failingAttempt += 1;
        if (failingAttempt === 1) throw new Error('atlas gone');
        return Detailed;
      },
    });
    await failing.setOrgan('heart', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(failing.detailScene, null);
    assert.equal(failingContainer.dataset.detail, 'error');
    assert.equal(failing.state, 'error');
    assert.equal(
      FakeViewer.instance.scene.children.find((child) => child.name === 'heart-hero')?.visible,
      false
    );

    const retry = failing.retryDetail();
    await new Promise((resolve) => setImmediate(resolve));
    Detailed.settle();
    await retry;
    assert.equal(failingAttempt, 2, 'one click starts one new attempt');
    assert.equal(failing.state, 'ready');
    assert.equal(failing.detailScene, 'brain-anatomy');
    failing.destroy();
    mounted.destroy();
  } finally {
    console.error = previousError;
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing hero viewport: a scene that resolves ready with an error status still fails', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  const previousError = console.error;
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  };
  console.error = () => {};

  class HandledFailure {
    static cameraPose = { position: new THREE.Vector3(0, 1, 9), target: new THREE.Vector3() };
    static framing = { minHorizontalAspect: 1 };
    constructor() {
      this.root = new THREE.Group();
      this.status = { state: 'error', error: new Error('decoded scene unavailable') };
      this.ready = Promise.resolve(this.root);
    }
    build() { return this.root; }
    update() {}
    dispose() {}
  }

  try {
    const mounted = mountLandingOrganViewport(new FakeElement('div'), {
      ViewerClass: createFakeViewerClass(),
      builders: cubeBuilders,
      loadSceneClass: async () => HandledFailure,
      detailTimeoutMs: 100,
    });
    await mounted.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(mounted.state, 'error');
    assert.equal(mounted.detailScene, null);
    mounted.destroy();
  } finally {
    console.error = previousError;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    restoreDocument();
  }
});

test('landing hero viewport: a timed-out late result cannot overwrite the error state', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  const previousError = console.error;
  console.error = () => {};
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  };
  let finish;
  class LateScene {
    static cameraPose = { position: new THREE.Vector3(0, 1, 9), target: new THREE.Vector3() };
    static framing = { minHorizontalAspect: 1 };
    constructor() {
      this.root = new THREE.Group();
      this.ready = new Promise((resolve) => { finish = resolve; });
    }
    build() { return this.root; }
    update() {}
    dispose() {}
  }

  try {
    const container = new FakeElement('div');
    const states = [];
    const mounted = mountLandingOrganViewport(container, {
      ViewerClass: createFakeViewerClass(),
      builders: cubeBuilders,
      loadSceneClass: async () => LateScene,
      detailDelayMs: 2,
      detailTimeoutMs: 8,
      onStateChange: (state, detail) => states.push([state, Boolean(detail.delayed)]),
    });

    await mounted.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(mounted.state, 'error');
    assert.ok(states.some(([state, delayed]) => state === 'loading' && delayed));

    finish();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(mounted.state, 'error', 'a result after the bounded attempt stays stale');
    assert.equal(mounted.detailScene, null);
    mounted.destroy();
  } finally {
    console.error = previousError;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    restoreDocument();
  }
});

test('landing hero viewport: an older model result cannot overwrite the selected model', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  };

  let finishBrain;
  class BrainScene {
    static cameraPose = { position: new THREE.Vector3(0, 1, 9), target: new THREE.Vector3() };
    static framing = { minHorizontalAspect: 1 };
    constructor() {
      this.root = new THREE.Group();
      this.ready = new Promise((resolve) => { finishBrain = resolve; });
    }
    build() { return this.root; }
    update() {}
    dispose() {}
  }
  class HeartScene {
    static cameraPose = BrainScene.cameraPose;
    static framing = BrainScene.framing;
    constructor() {
      this.root = new THREE.Group();
      this.ready = Promise.resolve();
    }
    build() { return this.root; }
    update() {}
    dispose() {}
  }

  try {
    const mounted = mountLandingOrganViewport(new FakeElement('div'), {
      ViewerClass: createFakeViewerClass(),
      builders: cubeBuilders,
      loadSceneClass: async (sceneId) => (
        sceneId === 'brain-anatomy' ? BrainScene : HeartScene
      ),
      detailTimeoutMs: 200,
    });

    await mounted.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    await mounted.setOrgan('heart', { upgradeSceneId: 'heart-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(mounted.organ, 'heart');
    assert.equal(mounted.detailScene, 'heart-anatomy');
    assert.equal(mounted.state, 'ready');

    finishBrain();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(mounted.detailScene, 'heart-anatomy');
    assert.equal(mounted.state, 'ready');
    mounted.destroy();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    restoreDocument();
  }
});

test('language control: the document language follows the visible language', () => {
  const restoreDocument = installFakeDocument();
  document.documentElement = new FakeElement('html');

  try {
    const changes = [];
    const toggle = createLanguageToggle((mode) => changes.push(mode));

    toggle.init();
    assert.equal(document.documentElement.getAttribute('lang'), 'ja');
    assert.equal(toggle.element.textContent, '日本語');

    toggle.element.click();
    assert.equal(document.documentElement.getAttribute('lang'), 'en');
    assert.equal(toggle.element.textContent, 'English');
    assert.deepEqual(changes, ['ja', 'en']);
  } finally {
    restoreDocument();
  }
});

/* The hero fetches several megabytes in the background. A reader who leaves
   before it lands cancels that fetch, and a scene that is not told it was
   abandoned reports the cancellation as a load failure — onto whatever page
   they went to next, because the rejection arrives as the old document goes.
   The scene decides that by asking whether it was disposed, so something has
   to dispose it, and the half that was missing is that a scene still loading
   is not yet `detail` and had no reference anything could reach. */
test('landing hero viewport: leaving the page ends an upgrade that is still loading', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  const listeners = new Map();
  globalThis.window = {
    innerWidth: 1200,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener: (type, handler) => listeners.set(type, handler),
    removeEventListener: (type) => listeners.delete(type),
  };

  class Loading {
    static cameraPose = { position: new THREE.Vector3(0, 1, 9), target: new THREE.Vector3() };
    static framing = { minHorizontalAspect: 1 };
    static disposed = 0;
    constructor() {
      this.root = new THREE.Group();
      this.root.name = 'still-loading';
      // Never settles: this is the scene mid-fetch, which is the whole case.
      this.ready = new Promise(() => {});
    }
    build() { return this.root; }
    update() {}
    dispose() { Loading.disposed += 1; }
  }

  try {
    const FakeViewer = createFakeViewerClass();
    const mounted = mountLandingOrganViewport(new FakeElement('div'), {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => Loading,
    });
    await mounted.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));

    const pageHidden = listeners.get('pagehide');
    assert.ok(pageHidden, 'the hero listens for the page going away');

    // Into the back/forward cache: the page is resumed exactly as it is, so
    // the hero has to still be there when the reader comes back.
    pageHidden({ persisted: true });
    assert.equal(Loading.disposed, 0, 'a bfcached page is paused, not ended');

    pageHidden({ persisted: false });
    assert.equal(Loading.disposed, 1, 'leaving disposes the scene that was still fetching');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    restoreDocument();
  }
});

/* The hero highlights the structure under the pointer and used to say nothing
   about it. These two tests are the two halves of answering "what did I just
   click?": the viewport has to carry the scene's answer out, and the hero has
   to draw it — with a pinned click outranking a hover, because a pointer
   crossing the model must not rewrite the name the reader chose. */
test('landing hero viewport: the scene names the structure under the pointer, pin first', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  document.visibilityState = 'visible';
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  globalThis.window = {
    innerWidth: 1200,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {},
    removeEventListener() {},
  };

  const hippocampus = {
    id: 17,
    name: 'Hippocampus',
    nameJa: '海馬',
    breadcrumb: 'Left › Temporal lobe › Hippocampal formation',
    breadcrumbJa: '左 › 側頭葉 › 海馬体',
    color: '#8fd4c1',
  };
  const thalamus = { id: 9, name: 'Thalamus', nameJa: '視床', breadcrumb: 'Left › Diencephalon' };

  /** A scene shaped like the anatomy scenes: it publishes selection and hover. */
  class NamedScene {
    static cameraPose = { position: new THREE.Vector3(0, 1, 9), target: new THREE.Vector3() };
    static framing = { minHorizontalAspect: 1 };
    static allowAutoRotate = false;
    constructor() {
      this.root = new THREE.Group();
      this.root.name = 'named-brain';
      this.ready = Promise.resolve();
      this.selectionListeners = new Set();
      this.hoverListeners = new Set();
      this.released = 0;
    }
    build() { return this.root; }
    update() {}
    dispose() {}
    getAnatomySelection() { return null; }
    getAnatomyHover() { return null; }
    onAnatomySelection(listener) {
      this.selectionListeners.add(listener);
      return () => { this.released += 1; this.selectionListeners.delete(listener); };
    }
    onAnatomyHover(listener) {
      this.hoverListeners.add(listener);
      return () => { this.released += 1; this.hoverListeners.delete(listener); };
    }
    emitSelection(info) { for (const listener of this.selectionListeners) listener(info); }
    emitHover(info) { for (const listener of this.hoverListeners) listener(info); }
  }

  /** A published scene with no anatomy surface at all — a real possibility. */
  class UnnamedScene {
    static cameraPose = { position: new THREE.Vector3(0, 1, 9), target: new THREE.Vector3() };
    static framing = { minHorizontalAspect: 1 };
    constructor() {
      this.root = new THREE.Group();
      this.root.name = 'unnamed-organ';
      this.ready = Promise.resolve();
    }
    build() { return this.root; }
    update() {}
    dispose() {}
  }

  /** A scene that answers the point the keyboard asks about. */
  let keyedScene = null;
  const keyedSeen = [];
  class KeyedScene extends NamedScene {
    constructor(options) {
      super(options);
      keyedScene = this;
      this.askedAt = [];
    }
    selectAtCanvasPoint(x, y) {
      this.askedAt.push([x, y]);
      this.emitSelection(thalamus);
      return true;
    }
    clearSelection() { this.emitSelection(null); }
  }

  try {
    const FakeViewer = createFakeViewerClass();
    const seen = [];
    const states = [];
    let scene = null;
    const keyboardContainer = new FakeElement('div');
    const mounted = mountLandingOrganViewport(new FakeElement('div'), {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => {
        const Scene = NamedScene;
        return class extends Scene {
          constructor(options) { super(options); scene = this; }
        };
      },
      onStateChange: (state, detail) => states.push([state, detail]),
      onStructureChange: (structure) => seen.push(structure),
    });

    await mounted.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(mounted.detailScene, 'brain-anatomy');
    assert.deepEqual(
      states.at(-1),
      ['ready', { named: true }],
      'the hero is told the model has parts it can name'
    );
    assert.equal(mounted.structure, null, 'nothing is named until the reader points at something');

    // A hover is a preview.
    scene.emitHover(hippocampus);
    assert.equal(seen.at(-1).name, 'Hippocampus');
    assert.equal(seen.at(-1).nameJa, '海馬');
    assert.equal(seen.at(-1).pinned, false);

    // A click pins it, and a hover crossing something else no longer wins.
    scene.emitSelection(hippocampus);
    assert.equal(seen.at(-1).pinned, true);
    scene.emitHover(thalamus);
    assert.equal(seen.at(-1).name, 'Hippocampus', 'a pinned name outranks a hover');
    assert.equal(mounted.structure.pinned, true);

    // An anatomy scene opts out of auto-rotation, so nothing is animating: the
    // frame that shows the highlight has to be asked for.
    FakeViewer.instance.running = false;
    const before = FakeViewer.instance.renderCount;

    // Clicking empty space clears the pin, and the hover shows through again.
    scene.emitSelection(null);
    assert.ok(FakeViewer.instance.renderCount > before, 'a pick repaints a still frame');
    assert.equal(seen.at(-1).name, 'Thalamus');
    assert.equal(seen.at(-1).pinned, false);
    scene.emitHover(null);
    assert.equal(seen.at(-1), null);

    // Swapping organs takes the name with the model it was read off.
    scene.emitSelection(hippocampus);
    const released = scene.released;
    await mounted.setOrgan('heart', { upgradeSceneId: null });
    assert.equal(seen.at(-1), null, 'the outgoing organ does not label the incoming one');
    assert.ok(scene.released > released, 'the scene is let go of, not just forgotten');
    assert.deepEqual(
      states.at(-1),
      ['ready', { named: false }],
      'a lightweight builder has no named parts and must not offer any'
    );

    // A scene whose anatomy surface throws is a scene without names, not a
    // failed model — and it must not be left half-installed either, with the
    // frame hook stepping a scene the error path disposed.
    class ThrowingScene extends UnnamedScene {
      onAnatomySelection() { throw new Error('the atlas has no metadata yet'); }
    }
    const throwing = mountLandingOrganViewport(new FakeElement('div'), {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => ThrowingScene,
      onStateChange: (state, detail) => states.push([state, detail]),
    });
    await throwing.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(states.at(-1), ['ready', { named: false }], 'the model still arrives');
    assert.equal(throwing.detailScene, 'brain-anatomy');
    assert.equal(throwing.structure, null);
    throwing.destroy();

    // A keyboard has no pointer, so the model is asked about the middle of the
    // frame. Without this the card is reachable only by mouse or finger, and
    // the one question the hero exists to answer has an input requirement.
    const keyed = mountLandingOrganViewport(keyboardContainer, {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => KeyedScene,
      onStructureChange: (structure) => keyedSeen.push(structure),
    });
    await keyed.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    const press = (key) => {
      let prevented = false;
      for (const listener of keyboardContainer.listeners.get('keydown') ?? []) {
        listener({ key, preventDefault: () => { prevented = true; } });
      }
      return prevented;
    };

    assert.equal(press('Enter'), true, 'Enter is the hero\'s, not the page\'s');
    assert.deepEqual(
      keyedScene.askedAt,
      [[400, 300]],
      'Enter asks about the middle of the canvas, which is where the aim is drawn'
    );
    assert.equal(keyedSeen.at(-1)?.name, 'Thalamus');
    assert.equal(keyedSeen.at(-1)?.pinned, true);

    assert.equal(press('Escape'), true);
    assert.equal(keyedSeen.at(-1), null, 'Escape clears what Enter named');
    keyed.destroy();

    // A published scene without the anatomy surface is not broken; it simply
    // has no names, and the hero must be able to tell the two apart.
    const plain = mountLandingOrganViewport(new FakeElement('div'), {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => UnnamedScene,
      onStateChange: (state, detail) => states.push([state, detail]),
    });
    await plain.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(states.at(-1), ['ready', { named: false }]);
    assert.equal(plain.structure, null);
    plain.destroy();

    mounted.destroy();
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

/* The hint used to promise "pinch to zoom" to everybody, and a phone cannot
   keep that promise: the canvas hands pinches back to the page on purpose, so
   the hero does not trap the scrolling and zooming of the page it sits in. The
   card had the same problem in the other direction, telling a reader with a
   finger to "click". */
test('landing hero: the instructions describe the input the reader actually has', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { requestAnimationFrame() {} };

  try {
    const listeners = new Set();
    const coarsePointer = {
      matches: true,
      addEventListener: (_type, handler) => listeners.add(handler),
      removeEventListener: (_type, handler) => listeners.delete(handler),
    };
    let options = null;
    const hero = createLandingOrganHero({
      compact: true,
      showOpenLink: false,
      coarsePointer,
      loadViewport: async () => ({
        mountLandingOrganViewport(_container, mountOptions) {
          options = mountOptions;
          return { async setOrgan() { options.onStateChange('ready', { named: true }); }, destroy() {} };
        },
      }),
    });
    await hero.mount();

    const hint = findByClass(hero.element, 'landing-demo-drag-hint')[0];
    const card = findByClass(hero.element, 'landing-demo-structure')[0];
    const gestures = () => collectText(hint).join(' ');

    assert.match(gestures(), /タップ/, 'a finger taps');
    assert.doesNotMatch(gestures(), /ピンチ/, 'a pinch belongs to the page here, and is not promised');
    assert.match(collectText(card).join(' '), /タップすると/);

    // The same page with a mouse: the wording follows the input, and it can
    // change without a reload — a tablet gains a keyboard and a trackpad.
    coarsePointer.matches = false;
    for (const handler of listeners) handler();
    assert.match(gestures(), /クリックで部位名/);
    assert.match(collectText(card).join(' '), /クリックすると/);

    // The screen-reader instructions carry the third input: no pointer at all.
    const instructions = findByClass(hero.element, 'landing-sr-only')
      .find((node) => node.getAttribute('id') === 'landing-demo-viewport-instructions');
    assert.match(collectText(instructions).join(' '), /Enterキーで画面中央の部位/);

    hero.destroy();
    assert.equal(listeners.size, 0, 'the hero stops listening when it ends');
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing hero: the picked structure is named on the model, in both languages', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { requestAnimationFrame() {} };

  try {
    let options = null;
    const hero = createLandingOrganHero({
      compact: true,
      showOpenLink: false,
      loadViewport: async () => ({
        mountLandingOrganViewport(_container, mountOptions) {
          options = mountOptions;
          return {
            async setOrgan() { options.onStateChange('loading', {}); },
            destroy() {},
          };
        },
      }),
    });
    await hero.mount();

    const readout = findByClass(hero.element, 'landing-demo-structure')[0];
    assert.ok(readout, 'the hero has somewhere to put the name');
    assert.equal(readout.hidden, true, 'a model that is still loading names nothing');

    // Ready, with named parts: the card invites the click rather than naming.
    options.onStateChange('ready', { named: true });
    assert.equal(readout.hidden, false);
    assert.equal(readout.dataset.state, 'hint');
    assert.match(collectText(readout).join(' '), /クリックすると、解剖学的な名称/);

    // A hover is a preview of the name.
    options.onStructureChange({
      name: 'Hippocampus',
      nameJa: '海馬',
      breadcrumb: 'Left › Temporal lobe',
      breadcrumbJa: '左 › 側頭葉',
      color: '#8fd4c1',
      pinned: false,
    });
    assert.equal(readout.dataset.state, 'preview');
    const announcement = findByClass(hero.element, 'landing-sr-only')
      .find((node) => node.getAttribute('aria-live') === 'polite');
    assert.ok(announcement, 'a pinned name is announced');
    assert.equal(
      collectText(announcement).join(' ').trim(),
      '',
      'a hover must not queue an announcement per structure the pointer crosses'
    );

    // A click pins it. Both languages are in the DOM, tagged, and CSS hides one.
    options.onStructureChange({
      name: 'Hippocampus',
      nameJa: '海馬',
      breadcrumb: 'Left › Temporal lobe › Hippocampal formation',
      breadcrumbJa: '左 › 側頭葉 › 海馬体',
      color: '#8fd4c1',
      pinned: true,
    });
    assert.equal(readout.dataset.state, 'pinned');
    const names = findByClass(readout, 'landing-demo-structure-name');
    const wheres = findByClass(readout, 'landing-demo-structure-where');
    assert.equal(names[0].getAttribute('lang'), 'en');
    assert.equal(names[0].textContent, 'Hippocampus');
    assert.equal(names[1].textContent, '海馬');
    assert.equal(names[1].getAttribute('lang'), 'ja');
    assert.equal(wheres[0].textContent, 'Left › Temporal lobe › Hippocampal formation');
    assert.equal(wheres[1].textContent, '左 › 側頭葉 › 海馬体');
    assert.equal(
      findByClass(readout, 'landing-demo-structure-swatch')[0].style.getPropertyValue('--landing-structure-color'),
      '#8fd4c1',
      'the card carries the structure’s own colour in the model'
    );
    assert.match(collectText(announcement).join(' '), /選択中: 海馬/);

    // A pointer crossing the model while something is pinned redraws the card
    // with the same name. Replacing a live region's children announces it
    // again even when the words are identical, so the announcement has to be
    // left alone — otherwise a reader hears the pinned name once per structure
    // the pointer passes over, which is the failure this region was split out
    // of the card to avoid.
    const announcementBefore = announcement.children[0];
    for (let crossing = 0; crossing < 4; crossing += 1) {
      options.onStructureChange({
        name: 'Hippocampus',
        nameJa: '海馬',
        breadcrumb: 'Left › Temporal lobe › Hippocampal formation',
        breadcrumbJa: '左 › 側頭葉 › 海馬体',
        color: '#8fd4c1',
        pinned: true,
      });
    }
    assert.equal(
      announcement.children[0],
      announcementBefore,
      'the same name is never announced twice'
    );

    // Two structures can carry one name — the atlas has a middle temporal gyrus
    // in each hemisphere — so pinning the other one is a new announcement.
    options.onStructureChange({ id: 17, name: 'Middle temporal gyrus', nameJa: '中側頭回', pinned: true });
    const leftAnnouncement = announcement.children[0];
    options.onStructureChange({ id: 218, name: 'Middle temporal gyrus', nameJa: '中側頭回', pinned: true });
    assert.notEqual(
      announcement.children[0],
      leftAnnouncement,
      'the same name on a different structure is announced again'
    );

    // A structure that reports no colour clears the swatch rather than wearing
    // the previous structure's: the swatch is what ties the card to the mesh.
    options.onStructureChange({ name: 'Fornix', nameJa: '脳弓', pinned: true });
    assert.equal(
      findByClass(readout, 'landing-demo-structure-swatch')[0]
        .style.getPropertyValue('--landing-structure-color'),
      '',
      'a structure with no colour does not inherit the last one'
    );
    assert.match(collectText(announcement).join(' '), /選択中: 脳弓/);

    // Nothing selected: back to the invitation, and the announcement is dropped.
    options.onStructureChange(null);
    assert.equal(readout.dataset.state, 'hint');
    assert.equal(collectText(announcement).join(' ').trim(), '');

    // A model with no named parts offers no card at all — which is a different
    // thing from a model whose parts are named and none is chosen.
    options.onStateChange('ready', { named: false });
    assert.equal(readout.hidden, true);
    hero.destroy();
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
