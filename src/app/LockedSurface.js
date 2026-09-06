import {
  EXPLORER_ROUTE,
  LANDING_ROUTE,
  sceneById,
  sceneRoute,
  systemById,
} from '../catalog/index.js';
import { RELEASED_SCENES } from '../catalog/release.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
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

  // Three open models to land on rather than one, so the page is a way in and
  // not just a dead end. Anything released will do; the first three in
  // catalogue order are the brain atlas and two of the heart models.
  const suggestions = RELEASED_SCENES.slice(0, 3);

  const element = el('main', { class: 'locked-surface', role: 'main' }, [
    el('header', { class: 'locked-nav' }, [
      el('a', { class: 'locked-brand', href: LANDING_ROUTE, 'aria-label': 'Medical 3D Lab home' }, [
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
      el('p', { class: 'locked-badge' }, [
        el('span', { class: 'lang-en', text: 'TO BE UPDATED' }),
        el('span', { class: 'lang-ja', text: 'TO BE UPDATED — 準備中' }),
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
      el('p', { class: 'locked-copy' }, [
        el('span', {
          class: 'lang-en',
          text:
            'Medical 3D Lab is in beta. The brain and the heart are open; the rest of the catalogue '
            + 'is still being finished. A model is opened once it has a model layer, an evidence '
            + 'dossier and a model card behind it — not before, because everything on screen is a claim.',
        }),
        el('span', {
          class: 'lang-ja',
          text:
            'Medical 3D Lab は現在β版です。公開しているのは脳と心臓のモデルで、'
            + 'ほかは準備中です。モデル層・根拠資料・モデルカードが揃ってから公開します。'
            + '画面に出るものはすべて主張だからです。',
        }),
      ]),
      el('div', { class: 'locked-actions' }, [
        link(EXPLORER_ROUTE, 'Open the models that are ready', '公開中のモデルを見る', 'locked-link primary'),
        link(LANDING_ROUTE, 'Home', 'ホーム'),
      ]),
      suggestions.length
        ? el('div', { class: 'locked-suggestions' }, [
            el('p', { class: 'locked-suggestions-title' }, dual('Open now', 'いま見られるモデル')),
            el('ul', { class: 'locked-suggestion-list' }, suggestions.map((released) =>
              el('li', {}, [
                el('a', { class: 'locked-suggestion', href: sceneRoute(released) }, [
                  el('span', { class: 'lang-en', text: released.titleEn }),
                  el('span', { class: 'lang-ja', text: released.titleJa }),
                ]),
              ])
            )),
          ])
        : null,
    ].filter(Boolean)),
  ]);

  ui.classList.add('has-locked-surface');
  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = `${titleEn} — to be updated / 準備中`;

  return {
    element,
    destroy() {
      languageToggle.element.remove();
      element.remove();
      ui.classList.remove('has-locked-surface');
    },
  };
}
