import './styles/base.css';
import './styles/ui.css';
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
import './styles/telemetry.css';
import './styles/legal.css';
import { resolveRoute, sameRoute } from './app/router.js';
import { recordSceneVisit } from './app/sceneLibrary.js';

/**
 * Consent, telemetry and the feedback route are loaded after the route is
 * known rather than with the entry chunk. Nothing a visitor is waiting for
 * depends on them, and the entry chunk is the one weight every visitor pays.
 */
const observe = async (options) => {
  const { installObservability } = await import('./app/observability.js');
  return installObservability(options);
};

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');

boot().catch(async (error) => {
  console.error(error);
  ui.textContent = 'Failed to start Medical 3D Lab.';
  // A failure this early is the one nobody hears about otherwise: no surface
  // has mounted, so nothing else has installed error capture yet.
  try {
    const { installTelemetry } = await import('./telemetry/install.js');
    installTelemetry({ surface: 'fallback' }).reporter.capture(error, { handled: false });
  } catch {
    /* reporting a boot failure must not become a second boot failure */
  }
});

async function boot() {
  // Recovery links are product-shell work, not medical scene routes. Supabase's
  // implicit recovery token arrives in the hash, which would otherwise look like
  // an unknown scene until AccessManager consumes it. Keep the return on the
  // WebGL-independent landing shell while the modal finishes the recovery.
  const recoveryIntent = new URLSearchParams(window.location.search).get('account') === 'recovery';
  const route = recoveryIntent ? { kind: 'landing' } : resolveRoute(window.location.hash);

  // Recent history is navigation convenience only: one published scene id, no
  // model controls or personal/clinical state. Storage denial is swallowed by
  // the helper and can never block the free scene from opening.
  if (route.kind === 'scene') recordSceneVisit(route.sceneId);

  // Account/access is product chrome, not part of a medical scene. Start its
  // network work in parallel on every route. A slow auth or billing provider may
  // delay an unlock; it may never delay free/public content.
  const { createAccessManager } = await import('./access/AccessManager.js');
  const access = createAccessManager({ ui });

  // Opening Account is also an explicit "re-check my access" action. This is
  // especially important after returning from Stripe Customer Portal, where a
  // signed webhook can land a moment after the browser.
  access.accountButton.addEventListener('click', () => {
    void access.refresh();
  });

  const accessReady = access.init().catch((error) => {
    console.error('access init', error);
  });

  if (route.kind === 'landing') {
    document.documentElement.dataset.route = 'landing';
    const { createLanding } = await import('./app/Landing.js');
    createLanding({ ui, accountButton: access.accountButton });
    void observe({ ui, surface: 'landing' });
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (resolveRoute(window.location.hash).kind !== 'landing') window.location.reload();
    });
    return;
  }

  if (route.kind === 'trust') {
    // Medical-review state is a product/trust concern and must remain readable
    // even if the browser cannot construct a WebGL context or load a scene.
    document.documentElement.dataset.route = 'trust';
    const { createTrust } = await import('./app/Trust.js');
    await createTrust({ ui, accountButton: access.accountButton });
    void observe({ ui, surface: 'trust' }).then((installed) => installed?.telemetry.record('trust.open', {}));
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (resolveRoute(window.location.hash).kind !== 'trust') window.location.reload();
    });
    return;
  }

  if (route.kind === 'legal') {
    // Cancellation terms, the privacy policy and the commercial disclosure are
    // exactly the pages a person may need on the device that could not start
    // WebGL. They are plain DOM for that reason.
    document.documentElement.dataset.route = 'legal';
    const { createLegal } = await import('./app/Legal.js');
    createLegal({ ui, docId: route.docId, accountButton: access.accountButton });
    void observe({ ui, surface: 'landing' });
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (!sameRoute(window.location.hash, `#/${route.docId}`)) window.location.reload();
    });
    return;
  }

  if (route.kind === 'explorer' || route.kind === 'lab') {
    // Both catalogue surfaces are plain DOM: no renderer, scene module or
    // geometry. The Lab/public split is a catalogue projection, not a second app.
    document.documentElement.dataset.route = 'explorer';
    const { createExplorer } = await import('./app/Explorer.js');
    createExplorer({
      ui,
      accountButton: access.accountButton,
      scope: route.kind === 'lab' ? 'lab' : 'public',
    });
    void observe({ ui, surface: route.kind === 'lab' ? 'lab' : 'explorer' });
    void accessReady;

    // Explorer system jump links are in-page anchors. Every actual app route
    // (scene, landing, public catalogue or Lab) reloads the shell cleanly.
    window.addEventListener('hashchange', () => {
      if (window.location.hash.startsWith('#system-')) return;
      const next = resolveRoute(window.location.hash);
      if (next.kind !== route.kind || next.kind === 'scene') window.location.reload();
    });
    return;
  }

  // Simple loading veil: the first frame has to compile shaders and build geometry.
  const veil = document.createElement('div');
  veil.className = 'loading';
  veil.innerHTML = '<span>building model</span><span class="loading-bar"></span>';
  document.body.append(veil);

  // Start-up is measured from navigation rather than from here, because what
  // a visitor waits through includes the module downloads above.
  const startedAt = performance?.now?.() ?? Date.now();

  try {
    const [{ createApp }, { installAccess }, { resolveSceneId }] = await Promise.all([
      import('./app/App.js'),
      import('./access/installAccess.js'),
      import('./app/sceneRegistry.js'),
    ]);
    const app = await createApp({ stage, ui });
    installAccess({ app, access, ui, sceneId: resolveSceneId() });
    // No await on purpose. Subscribers installed above will receive the paid
    // grants when the parallel auth/entitlement check finishes.
    void accessReady;

    const observability = await observe({
      ui,
      surface: 'scene',
      sceneId: route.sceneId,
      placement: 'rail',
    });
    await reportSceneStart(observability, app, route.sceneId, startedAt);

    requestAnimationFrame(() => {
      veil.classList.add('is-done');
      setTimeout(() => veil.remove(), 500);
    });
  } catch (error) {
    console.error(error);
    veil.remove();
    const { createSceneFailureFallback } = await import('./app/SceneFailureFallback.js');
    createSceneFailureFallback({ ui, sceneId: route.sceneId });

    // A renderer failure is the one thing this product most needs to know
    // about, so the fallback carries its own reporting and its own feedback
    // route. The consent question is not asked here: a visitor who has just
    // lost the 3D view is owed the fallback, not a dialog.
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

/**
 * Which of the declared reasons a renderer failure was.
 *
 * Kept coarse on purpose: the metric answers "how often, and is the fallback
 * catching it", and the detail lives in the redacted diagnostic beside it.
 */
function rendererFailureReason(error) {
  const message = String(error?.message ?? '').toLowerCase();
  if (message.includes('webgl') || message.includes('context')) return 'no_context';
  if (message.includes('fetch') || message.includes('load') || message.includes('404')) return 'asset_error';
  if (error instanceof Error) return 'scene_error';
  return 'unknown';
}

/**
 * Record that a model opened, how long it took, and what the frame budget
 * subsequently had to do about it.
 */
async function reportSceneStart(observability, app, sceneId, startedAt) {
  if (!observability) return;
  const { telemetry, deviceClass } = observability;
  telemetry.record('model.start', { scene: sceneId, surface: 'scene', device: deviceClass });

  const elapsedMs = (performance?.now?.() ?? Date.now()) - startedAt;
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
