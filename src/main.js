import './styles/base.css';
import './styles/ui.css';
import './styles/navigation.css';
import './styles/access.css';
import './styles/subscription-access.css';
import './styles/pricing-access.css';
import './styles/education-progress.css';
import './styles/patient-presentation.css';
import './styles/education-access.css';
import './styles/reel.css';
import './styles/explorer.css';
import './styles/access-explorer.css';
import { namesScene, resolveRoute } from './app/router.js';

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');

boot().catch((error) => {
  console.error(error);
  ui.textContent = 'Failed to start Medical 3D Lab.';
});

async function boot() {
  const route = resolveRoute(window.location.hash);

  // Account/access is product chrome, not part of a medical scene. Start its
  // network work in parallel on both the Explorer and 3D routes. A slow auth or
  // billing provider may delay an unlock; it may never delay free content.
  const { createAccessManager } = await import('./access/AccessManager.js');
  const access = createAccessManager({ ui });
  const accessReady = access.init().catch((error) => {
    console.error('access init', error);
  });

  if (route.kind === 'explorer') {
    document.documentElement.dataset.route = 'explorer';
    const { createExplorer } = await import('./app/Explorer.js');
    createExplorer({ ui, accountButton: access.accountButton, access });
    void accessReady;
    window.addEventListener('hashchange', () => {
      if (namesScene(window.location.hash)) window.location.reload();
    });
    return;
  }

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
    void accessReady;
    requestAnimationFrame(() => {
      veil.classList.add('is-done');
      setTimeout(() => veil.remove(), 500);
    });
  } catch (error) {
    console.error(error);
    veil.innerHTML =
      '<span>Failed to start the 3D view.</span><span style="text-transform:none;letter-spacing:0">Please try a WebGL-capable browser.</span>';
  }
}
