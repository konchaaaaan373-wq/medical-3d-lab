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
import { resolveRoute } from './app/router.js';
import { recordSceneVisit } from './app/sceneLibrary.js';

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');

boot().catch((error) => {
  console.error(error);
  ui.textContent = 'Failed to start Medical 3D Lab.';
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
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (resolveRoute(window.location.hash).kind !== 'trust') window.location.reload();
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
    requestAnimationFrame(() => {
      veil.classList.add('is-done');
      setTimeout(() => veil.remove(), 500);
    });
  } catch (error) {
    console.error(error);
    veil.remove();
    const { createSceneFailureFallback } = await import('./app/SceneFailureFallback.js');
    createSceneFailureFallback({ ui, sceneId: route.sceneId });
  }
}
