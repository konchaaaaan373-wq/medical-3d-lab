import './styles/base.css';
import './styles/reading-surface.css';
import './styles/ui.css';
import './styles/anatomy-panel.css';
import './styles/anatomy-shell-presentation.css';
import './styles/public-diagnostics.css';
import './styles/navigation.css';
import './styles/scene-library.css';
import './styles/access.css';
import './styles/subscription-access.css';
import './styles/pricing-access.css';
import './styles/patient-presentation.css';
import './styles/patient-fullscreen.css';
import './styles/education-access.css';
import './styles/reel.css';
import './styles/explorer.css';
import './styles/explorer-search.css';
import './styles/access-explorer.css';
import './styles/landing.css';
import './styles/trust.css';
import './styles/scene-fallback.css';
import './styles/locked.css';
import './styles/telemetry.css';
import './styles/legal.css';
import { isInPageAnchor, resolveRoute, sameRoute } from './app/router.js';
import { routeOpen } from './app/releaseGate.js';
import { recordSceneVisit } from './app/sceneLibrary.js';

const observe = async (options) => {
  const { installObservability } = await import('./app/observability.js');
  return installObservability(options);
};

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');

boot().catch(async (error) => {
  console.error(error);
  ui.textContent = 'Failed to start Medical 3D Lab.';
  try {
    const { installTelemetry } = await import('./telemetry/install.js');
    installTelemetry({ surface: 'fallback' }).reporter.capture(error, { handled: false });
  } catch {
    /* reporting a boot failure must not become a second boot failure */
  }
});

async function boot() {
  const recoveryIntent = new URLSearchParams(window.location.search).get('account') === 'recovery';
  const route = recoveryIntent ? { kind: 'landing' } : resolveRoute(window.location.hash);
  const open = routeOpen(route);

  if (open && route.kind === 'scene') recordSceneVisit(route.sceneId);

  const { createAccessManager } = await import('./access/AccessManager.js');
  const access = createAccessManager({ ui });
  access.accountButton.addEventListener('click', () => {
    void access.refresh({ reconcile: true });
  });
  const accessReady = access.init().catch((error) => {
    console.error('access init', error);
  });

  if (!open) {
    document.documentElement.dataset.route = 'locked';
    const { createLockedSurface } = await import('./app/LockedSurface.js');
    createLockedSurface({ ui, route, accountButton: access.accountButton });
    void observe({ ui, surface: 'landing' });
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (isInPageAnchor(window.location.hash)) return;
      window.location.reload();
    });
    return;
  }

  if (route.kind === 'landing') {
    document.documentElement.dataset.route = 'landing';
    const { createLanding } = await import('./app/Landing.js');
    const observabilityReady = observe({ ui, surface: 'landing' });
    createLanding({
      ui,
      accountButton: access.accountButton,
      onRendererFailure: async (error, context) => {
        const observability = await observabilityReady;
        observability?.reporter.captureRendererFailure(error, {
          scene: context?.sceneId ?? 'landing-hero',
          device: observability.deviceClass,
          reason: rendererFailureReason(error),
          fallbackShown: true,
        });
      },
    });
    void observabilityReady;
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (isInPageAnchor(window.location.hash)) return;
      if (resolveRoute(window.location.hash).kind !== 'landing') window.location.reload();
    });
    return;
  }

  if (route.kind === 'trust') {
    document.documentElement.dataset.route = 'trust';
    const { createTrust } = await import('./app/Trust.js');
    await createTrust({ ui, accountButton: access.accountButton });
    void observe({ ui, surface: 'trust' }).then((installed) => installed?.telemetry.record('trust.open', {}));
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (isInPageAnchor(window.location.hash)) return;
      if (resolveRoute(window.location.hash).kind !== 'trust') window.location.reload();
    });
    return;
  }

  if (route.kind === 'legal') {
    document.documentElement.dataset.route = 'legal';
    const { createLegal } = await import('./app/Legal.js');
    createLegal({ ui, docId: route.docId, accountButton: access.accountButton });
    void observe({ ui, surface: 'landing' });
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (isInPageAnchor(window.location.hash)) return;
      if (!sameRoute(window.location.hash, `#/${route.docId}`)) window.location.reload();
    });
    return;
  }

  if (route.kind === 'explorer' || route.kind === 'lab') {
    document.documentElement.dataset.route = 'explorer';
    const { createExplorer } = await import('./app/Explorer.js');
    createExplorer({
      ui,
      accountButton: access.accountButton,
      scope: route.kind === 'lab' ? 'lab' : 'public',
    });
    void observe({ ui, surface: route.kind === 'lab' ? 'lab' : 'explorer' });
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (isInPageAnchor(window.location.hash)) return;
      const next = resolveRoute(window.location.hash);
      if (next.kind !== route.kind || next.kind === 'scene') window.location.reload();
    });
    return;
  }

  document.documentElement.dataset.route = 'scene';

  const veil = document.createElement('div');
  veil.className = 'loading';
  veil.innerHTML = '<span>building model</span><span class="loading-bar"></span>';
  document.body.append(veil);

  const fallbackStartedAt = Date.now();
  const elapsedSinceNavigation = () =>
    typeof performance?.now === 'function' ? performance.now() : Date.now() - fallbackStartedAt;

  try {
    const [{ createApp }, { installAccess }, { resolveSceneId }] = await Promise.all([
      import('./app/App.js'),
      import('./access/installAccess.js'),
      import('./app/sceneRegistry.js'),
    ]);
    const app = await createApp({ stage, ui });
    installAccess({ app, access, ui, sceneId: resolveSceneId() });
    void accessReady;

    // The shared anatomy implementation owns the actual panel and its state.
    // Work only opts its presentation adapter in when that real panel exists.
    let anatomyPresentation = null;
    if (ui.querySelector('.anatomy-panel')) {
      ui.dataset.anatomy = 'yes';
      const { mountAnatomyShellPresentation } = await import('./app/anatomyShellPresentation.js');
      anatomyPresentation = mountAnatomyShellPresentation({ ui });
    }

    // App's model shortcuts live on window. Let controls inside the UI handle
    // their own Space/Enter/arrows first instead of bubbling those keys into the
    // model playback/camera shortcuts. This does not prevent the control's own
    // default action because the guard is a bubbling listener on its ancestor.
    const interactiveTags = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);
    const stopUiShortcutLeak = (event) => {
      for (let node = event.target; node && node !== ui.parentElement; node = node.parentElement) {
        if (interactiveTags.has(node.tagName) ||
            node.getAttribute?.('contenteditable') === 'true' ||
            node.getAttribute?.('role') === 'dialog') {
          event.stopPropagation();
          return;
        }
        if (node === ui) return;
      }
    };
    ui.addEventListener('keydown', stopUiShortcutLeak);

    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      ui.removeEventListener('keydown', stopUiShortcutLeak);
      anatomyPresentation?.destroy?.();
      delete ui.dataset.anatomy;
    }, { once: true });

    const observability = await observe({
      ui,
      surface: 'scene',
      sceneId: route.sceneId,
      placement: 'rail',
    });
    await reportSceneStart(observability, app, route.sceneId, elapsedSinceNavigation);

    requestAnimationFrame(() => {
      veil.classList.add('is-done');
      setTimeout(() => veil.remove(), 500);
    });
  } catch (error) {
    console.error(error);
    veil.remove();
    const [{ createSceneFailureFallback }, { createPublicDiagnosticCopyControl }] = await Promise.all([
      import('./app/SceneFailureFallback.js'),
      import('./app/publicDiagnosticCopyControl.js'),
    ]);
    const fallback = createSceneFailureFallback({ ui, sceneId: route.sceneId });
    const diagnostic = createPublicDiagnosticCopyControl({
      getContext: () => ({
        modelId: route.sceneId,
        language: ui.dataset.lang ?? 'ja',
        state: rendererFailureReason(error),
      }),
    });
    fallback.element.querySelector('.scene-fallback-card')?.append(diagnostic.element);

    window.addEventListener('hashchange', () => {
      if (isInPageAnchor(window.location.hash)) return;
      window.location.reload();
    });

    const observability = await observe({
      ui,
      surface: 'fallback',
      sceneId: route.sceneId,
      askConsent: false,
    });
    observability?.reporter.captureRendererFailure(error, {
      scene: route.sceneId,
      device: observability.deviceClass,
      reason: rendererFailureReason(error),
      fallbackShown: true,
    });
  }
}

function rendererFailureReason(error) {
  const message = String(error?.message ?? '').toLowerCase();
  if (message.includes('webgl') || message.includes('context')) return 'no_context';
  if (message.includes('fetch') || message.includes('load') || message.includes('404')) return 'asset_error';
  if (error instanceof Error) return 'scene_error';
  return 'unknown';
}

async function reportSceneStart(observability, app, sceneId, elapsedSinceNavigation) {
  if (!observability) return;
  const { telemetry, deviceClass } = observability;
  telemetry.record('model.start', { scene: sceneId, surface: 'scene', device: deviceClass });

  const elapsedMs = elapsedSinceNavigation();
  const { evaluateStartup } = await import('./app/performanceBudget.js');
  const startup = evaluateStartup(elapsedMs, deviceClass);
  telemetry.record('model.ready', {
    scene: sceneId,
    device: deviceClass,
    elapsedMs: startup.elapsedMs,
    withinBudget: startup.withinBudget,
  });

  app?.viewer?.onQuality?.((transition, report) => {
    telemetry.record('model.quality', {
      scene: sceneId,
      device: deviceClass,
      tier: transition.to,
      direction: transition.direction,
      ...(report.meanFps == null ? {} : { meanFps: report.meanFps }),
    });
  });
}
