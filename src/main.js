import './styles/base.css';
import './styles/ui.css';
import './styles/reel.css';
import './styles/explorer.css';
import { namesScene, resolveRoute } from './app/router.js';

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');

const route = resolveRoute(window.location.hash);

if (route.kind === 'explorer') {
  // The explorer is plain DOM: no renderer, no scene module, no geometry. It
  // has to stay that way — it is the page that lists everything, so anything it
  // pulls in is pulled in for every scene at once.
  //
  // The flag goes on the root element rather than the body: `html` carries
  // `height: 100%` and `overflow: hidden` for the 3D view, and a page that
  // scrolls has to undo both.
  document.documentElement.dataset.route = 'explorer';
  import('./app/Explorer.js')
    .then(({ createExplorer }) => {
      createExplorer({ ui });
      // Only a link to a real scene is a navigation. The explorer's own jump
      // links must not reload the page out from under the reader.
      window.addEventListener('hashchange', () => {
        if (namesScene(window.location.hash)) window.location.reload();
      });
    })
    .catch((error) => {
      console.error(error);
      ui.textContent = 'Failed to load the organ explorer.';
    });
} else {
  // Simple loading veil: the first frame has to compile shaders and build geometry.
  const veil = document.createElement('div');
  veil.className = 'loading';
  veil.innerHTML = '<span>building model</span><span class="loading-bar"></span>';
  document.body.append(veil);

  import('./app/App.js')
    .then(({ createApp }) => createApp({ stage, ui }))
    .then(() => {
      requestAnimationFrame(() => {
        veil.classList.add('is-done');
        setTimeout(() => veil.remove(), 500);
      });
    })
    .catch((error) => {
      console.error(error);
      veil.innerHTML =
        '<span>Failed to start the 3D view.</span><span style="text-transform:none;letter-spacing:0">Please try a WebGL-capable browser.</span>';
    });
}
