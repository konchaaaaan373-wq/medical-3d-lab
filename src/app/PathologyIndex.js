import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createSiteFooter } from '../components/SiteFooter.js';
import { createModelCard } from '../components/ModelCard.js';
import { ANATOMY_ROUTE, EXPLORER_ROUTE, SCENES, sceneById } from '../catalog/index.js';
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { PATHOLOGY_CATEGORY, pathologyModelScenes } from '../catalog/pathologyModels.js';
import { pageTitle } from '../data/brand.js';
import { betaUnlocked } from './releaseGate.js';
import '../styles/pathology-index.css';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * `#/models` — BYOKI MOTION's "Models" (and `#/pathology`, its old address).
 *
 * Two shelves, not two products (ADR 2026-09-30):
 *
 * 1. **Disease models** — the product. Each is a picture, a name and a
 *    question (`ModelCard.js`); the whole card is the way in.
 * 2. **Anatomy** — the structures those models point at, by name. A row of
 *    organs in small type, because it is where a reader goes when a model
 *    needs it, not what they came for. The organ chooser with a live model is
 *    one press further (`#/anatomy`).
 *
 * It is still the place "病態モデル" in a mechanism scene's breadcrumb goes
 * back to, so the reader who presses the kind of model they are in sees the
 * others of it first.
 *
 * Which models appear is read from the public manifest — the one list every
 * surface that tells a visitor what is published reads — or, on a preview
 * build, every disease model, as the scene switcher does. Nothing here decides
 * what is published.
 *
 * @param {{ui: HTMLElement, accountButton?: HTMLElement|null, scenes?: ReadonlyArray<object>, manifest?: typeof PUBLIC_MANIFEST}} options
 */
export function createPathologyIndex({ ui, accountButton = null, scenes = null, manifest = PUBLIC_MANIFEST }) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  const unlocked = safeUnlocked();
  const published = () => manifest.models.map((model) => sceneById(model.sceneId)).filter(Boolean);
  const listed = pathologyModelScenes(scenes ?? (unlocked ? SCENES : published()));
  const anatomy = manifest.models.filter((model) => model.layer === 'anatomy');

  const element = el('main', { class: 'bm-page bm-models-index is-pathology' }, [
    createShellHeader({ current: 'models', accountButton, languageToggle: languageToggle.element }),
    el('header', { class: 'bm-page-head' }, [
      el('h1', { class: 'bm-page-title' }, dual('Models', 'モデル')),
      el('p', { class: 'bm-page-lead' }, dual(
        'Move a condition and watch the body respond — then see why it changed.',
        '条件を動かすと、身体が反応して状態が変わる。その理由まで、1つの画面で。'
      )),
    ]),
    el('section', {
      class: 'bm-section bm-shelf pathology-list',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
      'aria-labelledby': 'bm-shelf-disease',
    }, [
      el('h2', { class: 'bm-section-title', id: 'bm-shelf-disease' }, dual(PATHOLOGY_CATEGORY.en, PATHOLOGY_CATEGORY.ja)),
      listed.length
        ? el('div', { class: `bm-model-list${listed.length === 1 ? ' is-single' : ''}` },
            listed.map((scene, index) => createModelCard(scene, { headingLevel: 3, feature: index === 0 })))
        : el('p', { class: 'bm-empty explorer-empty', role: 'status' }, dual(
            'No disease model is open in this release.',
            'この版で公開している病態モデルはありません。'
          )),
    ]),
    anatomy.length || unlocked
      ? el('section', { class: 'bm-section bm-shelf is-anatomy', 'aria-labelledby': 'bm-shelf-anatomy' }, [
          el('h2', { class: 'bm-section-title', id: 'bm-shelf-anatomy' }, dual('Anatomy', '解剖')),
          el('p', { class: 'bm-shelf-lead' }, dual(
            'Where a disease model points, by name — for when a model needs it.',
            '病態モデルが指す場所を、名前で確かめるための解剖です。'
          )),
          el('ul', { class: 'bm-anatomy-list', 'aria-label': inLanguage('Anatomy models', '解剖モデル') }, anatomy.map((model) =>
            el('li', {}, [
              el('a', { class: 'bm-anatomy-item', href: model.route }, [
                el('span', { class: 'bm-anatomy-organ' }, dual(model.organLabel, model.organLabelJa)),
                el('span', { class: 'bm-anatomy-title' }, dual(model.titleEn, model.titleJa)),
              ]),
            ])
          )),
          el('a', { class: 'bm-section-link', href: unlocked ? EXPLORER_ROUTE : ANATOMY_ROUTE }, dual(
            unlocked ? 'Every organ (preview) →' : 'Choose an organ and look →',
            unlocked ? 'すべての臓器（プレビュー） →' : '臓器を選んで見る →'
          )),
        ])
      : null,
    createSiteFooter(),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = pageTitle(inLanguage('Models', 'モデル'));
  return {
    element,
    scenes: listed,
    destroy() {
      element.remove();
    },
  };
}

/** `node --test` has no `window`; the safe answer is "not unlocked". */
function safeUnlocked() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}
