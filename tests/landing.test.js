import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { createLanding } from '../src/app/Landing.js';
import { createLandingOrganHero } from '../src/app/landingOrganHero.js';
import { mountLandingOrganViewport } from '../src/app/landingOrganViewport.js';
import {
  LANDING_FLOW_BUDGETS,
  createLandingFlowField,
  landingFlowConfig,
} from '../src/app/landingFlowField.js';
import { SCENES, organById, sceneById } from '../src/catalog/index.js';
import { LOCKED_SCENES, RELEASED_SCENES, isSceneReleased } from '../src/catalog/release.js';
import { hasOrganModel } from '../src/app/organModels.js';
import { createLanguageToggle } from '../src/components/LanguageToggle.js';
import {
  LANDING_MODEL_ORDER,
  orderLandingScenes,
  validateLandingPresentation,
} from '../src/data/landing.js';
import { HERO_ORGANS, featuredHeroOrgan, heroRotationDay } from '../src/data/landingHero.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('landing: every listed model has one curated question and stays reachable', () => {
  assert.deepEqual(validateLandingPresentation(SCENES), []);

  const ordered = orderLandingScenes(SCENES);
  assert.equal(ordered.length, SCENES.length);
  assert.equal(new Set(ordered.map((scene) => scene.id)).size, SCENES.length);
  assert.deepEqual(
    ordered.map((scene) => scene.id),
    LANDING_MODEL_ORDER
  );
  assert.equal(ordered[0].id, 'brain-anatomy', 'the beta leads with an organ model, not a disease model');

  // The open models come first. A visitor who stops reading part way down has
  // still only seen models they can actually open.
  const firstLocked = ordered.findIndex((scene) => !isSceneReleased(scene));
  const lastOpen = ordered.reduce((last, scene, index) => (isSceneReleased(scene) ? index : last), -1);
  assert.ok(firstLocked > lastOpen, 'released models must not be interleaved with locked ones');
});

test('landing hero: the featured organ is a pure function of the date, and starts on the brain', () => {
  const day = (offset) => new Date(Date.UTC(2026, 8, 6 + offset));

  assert.equal(heroRotationDay(day(0)), 0);
  assert.equal(featuredHeroOrgan(day(0)).organ, 'brain', 'the rotation opens on the brain');

  // Same date, same organ — twice, and from a different clock time on that day.
  assert.equal(
    featuredHeroOrgan(new Date(Date.UTC(2026, 8, 8, 3, 14))).organ,
    featuredHeroOrgan(new Date(Date.UTC(2026, 8, 8, 21, 47))).organ
  );

  // One full turn covers every organ exactly once, then repeats.
  const cycle = HERO_ORGANS.map((_, offset) => featuredHeroOrgan(day(offset)).organ);
  assert.deepEqual(new Set(cycle).size, HERO_ORGANS.length);
  assert.equal(featuredHeroOrgan(day(HERO_ORGANS.length)).organ, cycle[0]);

  // A clock set before the epoch still lands on a real organ rather than
  // indexing off the front of the rotation.
  assert.ok(featuredHeroOrgan(day(-3))?.organ);
});

test('landing hero: every rotation entry is a real organ that opens a released model', () => {
  assert.equal(HERO_ORGANS[0].organ, 'brain');
  for (const entry of HERO_ORGANS) {
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
  assert.match(landing, /clinicalReviewPresentation/);
  assert.match(landing, /scenes\.map\(sceneCard\)/);
  assert.match(landing, /解剖・病態生理の3Dモデル/);
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
  assert.match(css, /\.landing-scene-card\.is-locked/);
});

test('landing: the plain-DOM route lists every model, opens the released ones and works the hero', () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {};

  try {
    const ui = new FakeElement('div');
    const mounted = createLanding({ ui });
    const cards = findByClass(mounted.element, 'landing-scene-card');
    const locked = cards.filter((card) => card.classList.contains('is-locked'));
    const controls = findByClass(mounted.element, 'landing-demo-state');
    const viewports = findByClass(mounted.element, 'landing-demo-viewport');

    assert.equal(cards.length, SCENES.length, 'the index lists what is coming as well as what is open');
    assert.equal(locked.length, LOCKED_SCENES.length);
    assert.ok(RELEASED_SCENES.length > 0);

    for (const card of cards) {
      const isLocked = card.classList.contains('is-locked');
      // A locked card is not an anchor at all, so there is no click to disable.
      assert.equal(card.tagName, isLocked ? 'DIV' : 'A', card.dataset.scene);
      assert.equal(isLocked, !isSceneReleased(sceneById(card.dataset.scene)));
    }

    assert.equal(viewports.length, 1);
    assert.equal(viewports[0].getAttribute('role'), 'region');
    assert.equal(viewports[0].getAttribute('tabindex'), '0');
    assert.equal(viewports[0].getAttribute('aria-describedby'), 'landing-demo-viewport-instructions');

    assert.equal(controls.length, HERO_ORGANS.length);
    const featured = featuredHeroOrgan();
    const featuredIndex = HERO_ORGANS.indexOf(featured);
    assert.equal(controls[featuredIndex].getAttribute('aria-pressed'), 'true');

    const other = (featuredIndex + 1) % HERO_ORGANS.length;
    controls[other].click();
    assert.equal(controls[featuredIndex].getAttribute('aria-pressed'), 'false');
    assert.equal(controls[other].getAttribute('aria-pressed'), 'true');
    assert.equal(mounted.organHero.organ, HERO_ORGANS[other].organ);
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

    void hero.setOrgan('lungs');
    assert.equal(hero.organ, 'lungs');
    assert.equal(badge.hidden, true, 'a hand-picked organ is not today’s model');
    assert.equal(link.getAttribute('href'), '#/breathing-lungs');
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
