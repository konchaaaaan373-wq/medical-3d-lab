import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { SCENES, sceneRoute } from '../catalog/index.js';
import { statusById } from '../catalog/taxonomy.js';
import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { RELEASED_SCENES } from '../catalog/release.js';
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
 * Deliberately small. The cards are the Explorer's (`explorer.css`), on the
 * Explorer's ground, and which scenes appear is the release gate's decision —
 * the released set, or everything on a preview build, as the scene switcher
 * does. Nothing here decides what is published.
 *
 * @param {{ui: HTMLElement, accountButton?: HTMLElement|null, scenes?: ReadonlyArray<object>}} options
 */
export function createPathologyIndex({ ui, accountButton = null, scenes = null }) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  const listed = pathologyModelScenes(scenes ?? (safeUnlocked() ? SCENES : RELEASED_SCENES));

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
  const status = statusById(scene.status);
  const review = scene.status === 'prototype' ? null : clinicalReviewPresentation(scene);
  return el('a', { class: 'explorer-scene', href: sceneRoute(scene), dataset: { scene: scene.id } }, [
    el('span', { class: 'explorer-scene-kicker' }, [
      status?.badge
        ? el('span', { class: `status-badge is-${scene.status}`, title: inLanguage(status.note, status.noteJa ?? status.note) }, [
            el('span', { class: 'lang-en', text: status.label }),
            el('span', { class: 'lang-ja', text: status.labelJa }),
          ])
        : null,
      review
        ? el('span', { class: `status-badge clinical-review-badge is-${review.status}` }, [
            el('span', { class: 'lang-en', text: review.en }),
            el('span', { class: 'lang-ja', text: review.ja }),
          ])
        : null,
    ]),
    el('span', { class: 'explorer-scene-title' }, [
      el('span', { class: 'lang-en', text: scene.titleEn }),
      el('span', { class: 'lang-ja', text: scene.titleJa }),
    ]),
    el('span', { class: 'explorer-scene-note' }, [
      el('span', { class: 'lang-en', text: scene.description }),
      el('span', { class: 'lang-ja', text: scene.descriptionJa }),
    ]),
    el('span', { class: 'explorer-scene-footer' }, [
      el('span', { class: 'explorer-scene-open' }, [
        el('span', { class: 'lang-en', text: 'Open model' }),
        el('span', { class: 'lang-ja', text: 'モデルを開く' }),
      ]),
    ]),
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
