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
  // not just a dead end. Anything released will do; the first three are the
  // brain and the two organs beside it in catalogue order.
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
            'Medical 3D Lab is in beta. The organ models — anatomy and normal motion — are open now. '
            + 'Models that put numbers on a disease stay closed until their model layer, evidence and '
            + 'clinical review are finished, because a number is a claim and this one is not ready to make.',
        }),
        el('span', {
          class: 'lang-ja',
          text:
            'Medical 3D Lab は現在β版です。解剖と正常な動きを見る臓器モデルは公開しています。'
            + '病態に数値を与えるモデルは、モデル層・根拠・医学レビューが揃うまで公開しません。'
            + '数値は主張であり、まだその準備ができていないためです。',
        }),
      ]),
      el('div', { class: 'locked-actions' }, [
        link(EXPLORER_ROUTE, 'Open the organ models', '臓器モデルを見る', 'locked-link primary'),
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
