import {
  LANDING_ROUTE,
  sceneById,
  systemById,
} from '../catalog/index.js';
import { openModelDestination } from '../catalog/publicManifest.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';

/**
 * What a locked route answers with during the beta.
 *
 * A shared link to a disease model has to keep working as a link: somebody
 * arrives, and the page has to say what they were pointed at, that it is not
 * open yet, and hand them one model that is. An error page would do none of
 * those, and a silent redirect to the catalogue would lose the subject they
 * came for.
 *
 * **One way out, and it is derived.** The page names no published model in its
 * prose and keeps no list of them: `openModelDestination()` reads the public
 * manifest, so what this page offers changes when the release changes and not
 * when somebody remembers to edit a sentence here.
 *
 * Plain DOM, no WebGL: the whole point is that nothing is built here.
 *
 * @param {{ui:HTMLElement, route:{kind:string, sceneId?:string}, accountButton?:HTMLElement}} mounts
 */
export function createLockedSurface({ ui, route, accountButton = null }) {
  const scene = route.kind === 'scene' ? sceneById(route.sceneId) : null;
  const system = scene ? systemById(scene.system) : null;

  const dual = (en, ja, className = '') => [
    el('span', { class: `${className} lang-en`.trim(), text: en }),
    el('span', { class: `${className} lang-ja`.trim(), text: ja }),
  ];

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const link = (href, en, ja, className = 'locked-link') =>
    el('a', { class: className, href }, dual(en, ja));

  const titleEn = scene?.titleEn ?? (route.kind === 'lab' ? 'Experimental Lab' : 'Medical 3D Lab');
  const titleJa = scene?.titleJa ?? (route.kind === 'lab' ? '実験モデル' : 'Medical 3D Lab');

  // One way out, named by the manifest. This page used to offer three: a primary
  // link to the Explorer, "Home", and a list headed "Open now" — which, with a
  // single model released, was a list of one under a heading, pointing at the
  // same place the primary link reached in two steps. Three controls for two
  // destinations reads as three destinations.
  const openModel = openModelDestination();

  const element = el('main', { class: 'locked-surface', role: 'main' }, [
    el('header', { class: 'locked-nav' }, [
      el('a', { class: 'locked-brand', href: LANDING_ROUTE, 'aria-label': inLanguage('Medical 3D Lab home', 'Medical 3D Lab トップ') }, [
        el('span', { class: 'locked-brand-name', text: 'Medical 3D Lab' }),
      ]),
      el('div', { class: 'locked-nav-actions' }, [accountButton, languageToggle.element]),
    ]),

    el('section', {
      class: 'panel locked-card',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
    }, [
      el('p', { class: 'locked-badge' }, dual('In development', '開発中')),
      system
        ? el('p', { class: 'locked-system' }, dual(system.label, system.labelJa))
        : null,
      el('h1', { class: 'locked-title' }, [
        el('span', { class: 'lang-en', text: titleEn }),
        el('span', { class: 'lang-ja', text: titleJa }),
      ]),
      scene
        ? el('p', { class: 'locked-summary' }, [
            el('span', { class: 'lang-en', text: scene.description }),
            el('span', { class: 'lang-ja', text: scene.descriptionJa }),
          ])
        : null,
      // Two sentences, addressed to the reader. What stood here described the
      // release process to itself — what a publication decision is, that
      // everything on screen is a claim — and named the brain *and the heart*
      // as published while the release opened only the brain. Both problems
      // had the same shape: prose about the product, written by hand, next to
      // a manifest that already knew the answer.
      el('p', { class: 'locked-copy' }, dual(
        'This model is still being built. It will open once its medical content and its asset licences have been checked.',
        'このモデルは現在開発中です。医学的内容と素材ライセンスの確認後に公開します。'
      )),
      el('div', { class: 'locked-actions' }, [
        link(openModel.route, openModel.en, openModel.ja, 'locked-link primary'),
        link(LANDING_ROUTE, 'Home', 'ホームへ'),
      ]),
    ].filter(Boolean)),
  ]);

  ui.classList.add('has-locked-surface');
  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = `${titleEn} — in development / 開発中`;

  return {
    element,
    destroy() {
      languageToggle.element.remove();
      element.remove();
      ui.classList.remove('has-locked-surface');
    },
  };
}
