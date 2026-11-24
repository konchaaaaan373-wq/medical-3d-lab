import { SCENES, sceneById as catalogueSceneById, sceneRoute } from '../catalog/index.js';
import { RELEASED_SCENES } from '../catalog/release.js';
import { launchAreaById } from '../catalog/launch.js';
import { betaUnlocked, routeOpen } from './releaseGate.js';
import { resolveRoute, structureOf } from './router.js';
import { hashWithParam } from './hashQuery.js';
import { resolveSceneId, systemsWithScenes } from './sceneRegistry.js';
import { installDeparture } from './departure.js';
import { openingMessage } from './destinationName.js';
import { backgroundPresetById } from './inspection.js';
import { Viewer } from './Viewer.js';
import { createSceneSwitcher } from '../components/SceneSwitcher.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createTitleCard } from '../components/TitleCard.js';
import { createModelScopePanel } from '../components/ModelScopePanel.js';
import '../styles/atlas-layout.css';

/**
 * The shell for an atlas: a workbench that fills the page under the header.
 *
 * `App.js` hands a scene here when it declares `layout: 'atlas'`, before it
 * makes a renderer — the same hand-off `LessonShell.js` receives. What every
 * scene shares is kept: the site header, the title card with its maturity and
 * clinical-review marks, the scope panel inside 「このモデルについて」, and the way
 * out (`installDeparture`). What the model shell builds around a full-screen
 * canvas — console, rail, stages, labels — is not built, because none of it is
 * what this page is: a list, a 3D view and three image planes side by side.
 *
 * This file knows nothing about MRI. The scene builds the workbench
 * (`scene.mountWorkbench`); the shell gives it a host element, a way to make a
 * `Viewer` inside whatever element it chooses, and the route.
 *
 * The renderer is the scene's to create, and late: the planes are usable as
 * soon as the volume arrives, and a browser with no WebGL still gets them.
 *
 * @param {{ scene: object, meta: object, entry: object, ui: HTMLElement }} options
 */
export async function mountAtlasShell({ scene, meta, entry, ui }) {
  const sceneSwitcher = createSceneSwitcher({
    groups: systemsWithScenes(betaUnlocked() ? SCENES : RELEASED_SCENES),
    currentId: resolveSceneId(),
    showLab: betaUnlocked(),
    purpose: { available: false, onChange: () => {} },
  });
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  sceneSwitcher?.dock?.('language', languageToggle.element);

  const titleCard = createTitleCard(meta);
  const scopePanel = meta.modelScope ? createModelScopePanel(meta.modelScope) : null;
  const trustFold = titleCard.querySelector('.title-trust-fold');
  if (scopePanel && trustFold) {
    const host = trustFold.querySelector('.title-about-body') ?? trustFold;
    const badges = host.querySelector('.title-trust-badges');
    const close = host.querySelector('.title-about-close');
    scopePanel.embedIn(trustFold, host);
    if (badges) host.append(badges);
    if (close) host.append(close);
  }

  const host = document.createElement('div');
  host.className = 'atlas-host';
  const top = document.createElement('div');
  top.className = 'atlas-top';
  top.append(titleCard);
  ui.append(...[sceneSwitcher?.element, top, host].filter(Boolean));
  languageToggle.init();
  ui.dataset.view = 'atlas';

  // The workbench stands on the dark stage whatever the reader's last
  // background was: an MRI is read on black.
  const ground = backgroundPresetById('graphite') ?? backgroundPresetById();
  document.documentElement.style.setProperty('--page-ground', ground.backdrop.bottom);

  const anatomy = launchAreaById('anatomy');
  const anatomyScene = anatomy ? catalogueSceneById(anatomy.sceneId) : null;
  const anatomyOpen = anatomyScene && routeOpen(resolveRoute(sceneRoute(anatomyScene)));

  const workbench = await scene.mountWorkbench({
    host,
    createViewer: (container) => {
      const viewer = new Viewer(container, { bloom: false });
      viewer.setBackgroundPreset(ground.id);
      return viewer;
    },
    openingStructureId: structureOf(window.location.hash),
    anatomyRoute: anatomyOpen ? sceneRoute(anatomyScene) : null,
    // The address follows the selection, so a structure can be linked to —
    // replaced, not pushed: twenty clicks are not twenty steps of Back.
    onSelection: (structure) => {
      const next = hashWithParam(window.location.hash, 'structure', structure?.id ?? null);
      if (next !== window.location.hash) window.history.replaceState(window.history.state, '', next);
    },
  });

  // The workbench's own bar — the view tabs — stands beside the title rather
  // than under it: on this page height is what the planes are made of.
  const bar = workbench.element.querySelector('.mri-bar');
  if (bar) top.append(bar);

  installDeparture({
    shownHash: window.location.hash,
    language: ui.dataset.lang === 'en' ? 'en' : 'ja',
    describe: (hash) => openingMessage(hash, ui.dataset.lang === 'en' ? 'en' : 'ja', { open: routeOpen(resolveRoute(hash)) }),
    onDepart: () => {
      workbench.pause();
      return () => workbench.resume();
    },
  });

  window.__app = {
    scene,
    meta,
    entry,
    header: sceneSwitcher,
    titleCard,
    /** The atlas, for a check: its state and the actions a reader has. */
    atlas: workbench,
    get viewer() {
      return workbench.viewer;
    },
  };
  return window.__app;
}
