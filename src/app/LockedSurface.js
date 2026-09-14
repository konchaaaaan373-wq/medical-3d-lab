import { LANDING_ROUTE, sceneById, systemById } from '../catalog/index.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { shellNavAnchors } from '../components/ShellNav.js';
import { openModelDestination } from './shellDestinations.js';
import { el, skipLink } from '../utils/dom.js';

/**
 * What a locked route answers with during the beta.
 *
 * A shared link to a disease model has to keep working as a link: somebody
 * arrives, and the page has to say what they were pointed at, that it is not
 * open yet, and where the models that *are* open live. An error page would do
 * none of those, and a silent redirect to the catalogue would lose the subject
 * they came for.
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

  // Where "go and look at something that works" goes, named from the manifest.
  const openModel = openModelDestination();

  const element = el('main', { class: 'locked-surface', role: 'main' }, [
    el('header', { class: 'locked-nav' }, [
      el('a', { class: 'locked-brand', href: LANDING_ROUTE, 'aria-label': 'Medical 3D Lab home' }, [
        el('span', { class: 'locked-brand-name', text: 'Medical 3D Lab' }),
      ]),
      el('nav', { class: 'locked-nav-links', 'aria-label': 'Site navigation / サイトナビゲーション' },
        shellNavAnchors({ current: null, labUnlocked: false })),
      el('div', { class: 'locked-nav-actions' }, [accountButton, languageToggle.element]),
    ]),

    el('section', {
      class: 'panel locked-card',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
    }, [
      el('p', { class: 'locked-badge' }, [
        el('span', { class: 'lang-en', text: 'In development' }),
        el('span', { class: 'lang-ja', text: '開発中' }),
      ]),
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
      // Two sentences, and neither of them is about how this repository works.
      //
      // What stood here explained publication decisions, geometry provenance and
      // that "everything on screen is a claim" — true, and addressed to us
      // rather than to the person who followed a link to a model that is not
      // ready. It also opened by saying the beta publishes "the brain and the
      // heart", which was simply false: the beta publishes one organ. Nothing
      // here states what is published any more, because the button below names
      // it, and a button cannot drift from the manifest the way a sentence can.
      el('p', { class: 'locked-copy' }, [
        el('span', {
          class: 'lang-en',
          text:
            'This model is still in development. It opens once its medical content '
            + 'and the licence of the material it is built from have been checked.',
        }),
        el('span', {
          class: 'lang-ja',
          text:
            'このモデルは現在開発中です。'
            + '医学的内容と素材ライセンスの確認後に公開します。',
        }),
      ]),
      // One way on, and one way back. There used to be four things here — this
      // pair, a separate "Open now" list of three model links, and the shell row
      // in the header — all of them offering some version of "go to the models".
      // The primary one now goes to the model itself rather than by way of an
      // index holding a single card; `openModelDestination` becomes the index
      // again on its own when a second model opens.
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
