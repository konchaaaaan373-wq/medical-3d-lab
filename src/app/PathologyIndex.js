import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { SCENES, sceneById, sceneRoute } from '../catalog/index.js';
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { sceneCardText, sceneOpenLabel, sceneReviewBadge, sceneStatusBadge } from '../components/SceneCardParts.js';
import { PATHOLOGY_CATEGORY, pathologyModelScenes } from '../catalog/pathologyModels.js';
import { betaUnlocked } from './releaseGate.js';
import '../styles/clinical-review.css';
import '../styles/pathology-index.css';

/**
 * `#/pathology` — the models the breadcrumb "病態モデル ＞ 心拍出量" goes back to.
 *
 * It exists so that "病態モデル" in a mechanism scene's breadcrumb is a place
 * rather than a word: the reader is told what kind of model they are looking
 * at, and pressing the name of that kind shows the others of it.
 *
 * Deliberately small. The cards are built from the same parts as the
 * Explorer's (`SceneCardParts.js`, `explorer.css`), on the Explorer's ground.
 * Which scenes appear is read from the public manifest — the one list every
 * surface that tells a visitor what is published reads — or, on a preview
 * build, every scene, as the scene switcher does. Nothing here decides what is
 * published.
 *
 * @param {{ui: HTMLElement, accountButton?: HTMLElement|null, scenes?: ReadonlyArray<object>}} options
 */
export function createPathologyIndex({ ui, accountButton = null, scenes = null }) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  const published = () => PUBLIC_MANIFEST.models.map((model) => sceneById(model.sceneId)).filter(Boolean);
  const listed = pathologyModelScenes(scenes ?? (safeUnlocked() ? SCENES : published()));

  const element = el('main', { class: 'explorer is-public is-pathology' }, [
    createShellHeader({ current: null, accountButton, languageToggle: languageToggle.element }),
    el('header', { class: 'panel explorer-header' }, [
      el('h1', { class: 'title' }, [
        el('span', { class: 'lang-en', text: PATHOLOGY_CATEGORY.en }),
        el('span', { class: 'lang-ja', text: PATHOLOGY_CATEGORY.ja }),
      ]),
      el('p', { class: 'subtitle' }, [
        el('span', {
          class: 'lang-en',
          text: 'Models that compute how a change in one condition moves the rest. The anatomy models are on the home page.',
        }),
        el('span', {
          class: 'lang-ja',
          text: '条件を 1 つ変えると何がどう動くかを計算するモデルです。解剖モデルはホームにあります。',
        }),
      ]),
    ]),
    el('section', {
      class: 'explorer-system pathology-list',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
      'aria-label': inLanguage(PATHOLOGY_CATEGORY.en, PATHOLOGY_CATEGORY.ja),
    }, [
      listed.length
        ? el('div', { class: 'explorer-scenes' }, listed.map(card))
        : el('p', { class: 'explorer-empty', role: 'status' }, [
            el('span', { class: 'lang-en', text: 'No disease model is open in this release.' }),
            el('span', { class: 'lang-ja', text: 'この版で公開している病態モデルはありません。' }),
          ]),
    ]),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = `${PATHOLOGY_CATEGORY.en} — Medical 3D Lab`;
  return {
    element,
    scenes: listed,
    destroy() {
      element.remove();
    },
  };
}

function card(scene) {
  return el('a', { class: 'explorer-scene', href: sceneRoute(scene), dataset: { scene: scene.id } }, [
    el('span', { class: 'explorer-scene-kicker' }, [
      sceneStatusBadge(scene.status),
      scene.status === 'prototype' ? null : sceneReviewBadge(scene),
    ]),
    ...sceneCardText(scene),
    el('span', { class: 'explorer-scene-footer' }, [sceneOpenLabel()]),
  ]);
}

/** `node --test` has no `window`; the safe answer is "not unlocked". */
function safeUnlocked() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}
