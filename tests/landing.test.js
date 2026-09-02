import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createLanding } from '../src/app/Landing.js';
import {
  circulationDemoSnapshot,
  createLandingCirculationDemo,
} from '../src/app/landingCirculationDemo.js';
import { mountLandingCirculationViewport } from '../src/app/landingCirculationViewport.js';
import {
  LANDING_FLOW_BUDGETS,
  createLandingFlowField,
  landingFlowConfig,
} from '../src/app/landingFlowField.js';
import { PUBLIC_SCENES } from '../src/catalog/index.js';
import { createLanguageToggle } from '../src/components/LanguageToggle.js';
import {
  LANDING_MODEL_ORDER,
  orderLandingScenes,
  validateLandingPresentation,
} from '../src/data/landing.js';
import { CIRCULATION_INTERVENTIONS, solveCirculation } from '../src/models/circulation.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('landing: every public model has one curated question and stays reachable', () => {
  assert.deepEqual(validateLandingPresentation(PUBLIC_SCENES), []);

  const ordered = orderLandingScenes(PUBLIC_SCENES);
  assert.equal(ordered.length, PUBLIC_SCENES.length);
  assert.equal(new Set(ordered.map((scene) => scene.id)).size, PUBLIC_SCENES.length);
  assert.deepEqual(
    ordered.map((scene) => scene.id),
    LANDING_MODEL_ORDER
  );
  assert.equal(ordered[0].id, 'circulation', 'the working hero model also leads the model index');
});

test('landing: circulation read-outs are rounded views of the one model solve', () => {
  for (const intervention of Object.values(CIRCULATION_INTERVENTIONS)) {
    const solved = solveCirculation({ intervention });
    const preview = circulationDemoSnapshot(intervention);
    const metrics = Object.fromEntries(preview.metrics.map((metric) => [metric.id, metric]));

    assert.equal(metrics.map.value, Math.round(solved.meanArterialPressureMmHg));
    assert.equal(Number(metrics.co.value), Number(solved.cardiacOutputLMin.toFixed(1)));
    assert.equal(metrics.do2.value, Math.round(solved.oxygenDeliveryMlMin / 10) * 10);
    assert.match(preview.explanation.en, /MAP|CO|SVR/);
    assert.match(preview.explanation.ja, /MAP|CO|SVR/);
  }
});

test('landing: the preview preserves the model’s intended comparison', () => {
  const baseline = circulationDemoSnapshot(CIRCULATION_INTERVENTIONS.BASELINE);
  const fluid = circulationDemoSnapshot(CIRCULATION_INTERVENTIONS.FLUID);
  const dobutamine = circulationDemoSnapshot(CIRCULATION_INTERVENTIONS.DOBUTAMINE);
  const changes = (snapshot) => snapshot.metrics.map((metric) => metric.change?.id ?? null);

  assert.deepEqual(changes(baseline), [null, null, null]);
  assert.deepEqual(changes(fluid), ['up', 'up', 'up']);
  assert.deepEqual(changes(dobutamine), ['flat', 'up', 'up']);
  assert.ok(dobutamine.flowDurationSeconds < baseline.flowDurationSeconds);
  assert.ok(dobutamine.vesselCalibrePx > baseline.vesselCalibrePx);
  assert.ok(dobutamine.resistanceOpacity < baseline.resistanceOpacity);
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

test('landing: the shell stays readable while the hero dynamically mounts the real 3D scene', () => {
  const landing = read('src/app/Landing.js');
  const demo = read('src/app/landingCirculationDemo.js');
  const viewport = read('src/app/landingCirculationViewport.js');
  const flow = read('src/app/landingFlowField.js');
  const css = read('src/styles/landing.css');

  for (const source of [landing, demo, flow]) {
    assert.doesNotMatch(source, /from ['"]three['"]|\/scenes\//);
  }
  assert.match(demo, /solveCirculation/);
  assert.match(demo, /import\('\.\/landingCirculationViewport\.js'\)/);
  assert.match(viewport, /CirculationScene/);
  assert.match(viewport, /Viewer/);
  assert.match(viewport, /setModelControl\('intervention'/);
  assert.match(viewport, /IntersectionObserver/);
  assert.match(viewport, /viewer\.stop\(\)/);
  assert.match(viewport, /viewer\.composer\.render\(\)/);
  assert.match(viewport, /document\.visibilityState/);
  assert.match(viewport, /SceneClass\.allowAutoRotate !== false/);
  assert.match(viewport, /style\.touchAction = 'pan-y pinch-zoom'/);
  assert.match(viewport, /catch \(error\) \{\s*disposeAll\(\);\s*throw error;/);
  assert.match(landing, /clinicalReviewPresentation/);
  assert.match(landing, /scenes\.map\(sceneCard\)/);
  assert.match(landing, /解剖・病態生理の3Dモデル/);
  assert.doesNotMatch(landing, /病態生理は、|モデルも、根拠も、開いておく。|正確な基本モデル|レビュー済みモデルから/);
  assert.doesNotMatch(css, /overflow:\s*hidden/);
  assert.doesNotMatch(css, /touch-action:\s*none/);
  assert.match(css, /touch-action:\s*pan-y pinch-zoom/);
  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.landing-demo-viewport canvas/);
  assert.match(css, /\.landing-demo-state\.is-selected/);
});

test('landing: the plain-DOM route mounts every model and its working hero controls', () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {};

  try {
    const ui = new FakeElement('div');
    const mounted = createLanding({ ui });
    const cards = findByClass(mounted.element, 'landing-scene-card');
    const controls = findByClass(mounted.element, 'landing-demo-state');
    const values = findByClass(mounted.element, 'landing-demo-metric-value');
    const viewports = findByClass(mounted.element, 'landing-demo-viewport');

    assert.equal(cards.length, PUBLIC_SCENES.length);
    assert.equal(viewports.length, 1);
    assert.equal(controls.length, 3);
    assert.equal(controls[0].getAttribute('aria-pressed'), 'true');
    assert.deepEqual(values.map((node) => node.textContent), ['70', '3.6', '510']);

    controls[2].click();
    assert.equal(controls[0].getAttribute('aria-pressed'), 'false');
    assert.equal(controls[2].getAttribute('aria-pressed'), 'true');
    assert.deepEqual(values.map((node) => node.textContent), ['71', '5.1', '710']);
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
    const demo = createLandingCirculationDemo({ loadViewport });
    const pending = demo.mount();
    demo.destroy();
    finishLoading({
      mountLandingCirculationViewport() {
        mountCount += 1;
        return { setIntervention() {}, destroy() {} };
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

test('landing: a failed 3D preview exposes its fallback message', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  const previousError = console.error;
  globalThis.window = { requestAnimationFrame() {} };
  console.error = () => {};

  try {
    const demo = createLandingCirculationDemo({
      loadViewport: () => Promise.reject(new Error('no WebGL')),
    });
    await demo.mount();
    const loading = findByClass(demo.element, 'landing-demo-loading')[0];

    assert.equal(loading.getAttribute('aria-hidden'), 'false');
    assert.equal(loading.getAttribute('role'), 'status');
    assert.equal(loading.getAttribute('aria-live'), 'polite');
    assert.match(loading.children.map((node) => node.textContent).join(' '), /3Dプレビュー/);
  } finally {
    console.error = previousError;
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('landing: a scene that fails during setup releases the partial viewer', () => {
  let viewerDisposed = 0;
  let sceneDisposed = 0;
  const container = { dataset: {} };

  class FailingViewer {
    constructor() {
      this.renderer = { domElement: { style: {} } };
      this.scene = { add() {} };
    }

    dispose() {
      viewerDisposed += 1;
    }
  }

  class FailingScene {
    constructor() {}

    build() {
      throw new Error('failed midway through scene build');
    }

    dispose() {
      sceneDisposed += 1;
    }
  }

  assert.throws(
    () => mountLandingCirculationViewport(container, {
      ViewerClass: FailingViewer,
      SceneClass: FailingScene,
    }),
    /failed midway/
  );
  assert.equal(sceneDisposed, 1);
  assert.equal(viewerDisposed, 1);
  assert.equal(container.dataset.ready, undefined);
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
