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
  assert.equal(sceneById(heart.sceneId), null);
  assert.equal(HERO_ROTATION.includes(heart), false, 'and it is not shown until that scene exists');

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

    assert.equal(loading.getAttribute('aria-hidden'), 'false');
    assert.equal(loading.getAttribute('role'), 'status');
    assert.equal(loading.getAttribute('aria-live'), 'polite');
    assert.match(loading.children.map((node) => node.textContent).join(' '), /3Dプレビュー/);
    assert.equal(viewport.getAttribute('tabindex'), '-1');
    assert.equal(viewport.getAttribute('role'), 'presentation');
    assert.equal(viewport.getAttribute('aria-hidden'), 'true');
    assert.equal(viewport.getAttribute('aria-label'), '');
    assert.equal(viewport.getAttribute('aria-describedby'), '');
    assert.equal(dragHint.getAttribute('hidden'), '');
    assert.equal(reportedError, rendererError);
  } finally {
    console.error = previousError;
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
      this.renderer = { domElement: { style: {} } };
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
      this.composer = { render() {} };
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

test('landing hero viewport: the detailed model replaces the builder, and a failure keeps it', async () => {
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
    });

    await mounted.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    const names = () => FakeViewer.instance.scene.children.map((child) => child.name);

    // The builder is on screen and the scene is built but not yet shown, so the
    // frame is never empty while the atlas is being fetched.
    assert.ok(names().includes('brain-hero'), 'the builder holds the frame while stage 2 loads');
    assert.equal(container.dataset.detail, 'loading');
    const staged = FakeViewer.instance.scene.children.find((c) => c.name === 'detailed-brain');
    assert.ok(staged);
    assert.equal(staged.visible, false, 'stage 2 stays hidden until it is ready');

    Detailed.settle();
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(container.dataset.detail, 'ready');
    assert.equal(staged.visible, true);
    assert.ok(!names().includes('brain-hero'), 'the builder comes down once it has been replaced');
    assert.equal(mounted.detailScene, 'brain-anatomy');
    // The scene brought its own lighting rig, so the hero's comes off.
    assert.ok(!names().includes('organ-lights'));

    // A metered connection is never sent the detailed model at all.
    const cheap = mountLandingOrganViewport(new FakeElement('div'), {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => { throw new Error('must not be reached'); },
      detailAllowed: () => false,
    });
    await cheap.setOrgan('brain', { upgradeSceneId: 'brain-anatomy' });
    assert.equal(cheap.detailScene, null);
    cheap.destroy();

    // And a failed load leaves the builder exactly where it was, silently.
    const failingContainer = new FakeElement('div');
    const failing = mountLandingOrganViewport(failingContainer, {
      ViewerClass: FakeViewer,
      builders: cubeBuilders,
      loadSceneClass: async () => { throw new Error('atlas gone'); },
    });
    await failing.setOrgan('heart', { upgradeSceneId: 'brain-anatomy' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(failing.detailScene, null);
    assert.equal(failingContainer.dataset.detail, 'unavailable');
    assert.ok(
      FakeViewer.instance.scene.children.some((child) => child.name === 'heart-hero'),
      'a failed upgrade is invisible: the builder is still the model on screen'
    );
    failing.destroy();
    mounted.destroy();
  } finally {
    console.error = previousError;
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
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
