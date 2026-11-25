import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createSiteFooter } from '../components/SiteFooter.js';
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { launchAreaById } from '../catalog/launch.js';
import { sceneById, sceneRoute } from '../catalog/index.js';
import { FUNCTION_THEMES } from '../data/brainFunctionThemes.js';
import { pageTitle } from '../data/brand.js';
import { betaUnlocked } from './releaseGate.js';

/**
 * `#/functions` — the higher-brain-function entrance.
 *
 * The launch puts higher brain function at the centre of the product (ADR
 * 2026-11-24), and the model that carries it — `higher-brain-function` — is
 * alpha with its medical review pending, so the release gate holds it closed in
 * a production build. This page is how both of those are true at once without
 * either being fudged:
 *
 * - it is a **document**, always open, that says what the area teaches as a
 *   set of questions (`src/data/brainFunctionThemes.js` — questions, never
 *   which-structure-does-what);
 * - it reads the public manifest to decide whether the model can be opened, and
 *   where it cannot, it says so in words and points at what *is* open — the
 *   anatomy and the MRI atlas — instead of offering a link to a closed door.
 *
 * Nothing here imports the function model. The shell must not: a static import
 * would carry an unpublished model into the production bundle
 * (`tests/anatomy-function-link.test.js`).
 */

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

function themeOf(hash) {
  const [route, query] = String(hash).split('?');
  if (!/^#\/?(functions|higher-function)$/.test(route.trim()) || !query) return null;
  return new URLSearchParams(query).get('theme');
}

function safeUnlocked() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}

export function createFunctionsIndex({
  ui,
  accountButton = null,
  focusId = null,
  manifest = PUBLIC_MANIFEST,
  themes = FUNCTION_THEMES,
  unlocked = safeUnlocked(),
} = {}) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  const models = [...(manifest?.models ?? [])];
  const open = new Set(models.map((model) => model.sceneId));
  const area = launchAreaById('functions');
  const model = area ? sceneById(area.sceneId) : null;
  const modelOpen = Boolean(model) && (unlocked || open.has(model.id));
  const anatomy = launchAreaById('anatomy');
  const mri = launchAreaById('mri');
  const reachable = (item) => Boolean(item?.route) && (unlocked || open.has(item.sceneId));

  const status = modelOpen
    ? el('div', { class: 'lab-fn-status is-open' }, [
        el('p', {}, dual(
          'The function model is open. It is an alpha model with its medical review still pending, and it says so on its own page.',
          '機能モデルを開けます。アルファ版で、医学レビューは未完了です（モデルの画面にも表示しています）。'
        )),
        el('a', { class: 'lab-cta', href: sceneRoute(model) }, [
          ...dual('Open the function model', '機能モデルを開く'),
          el('span', { class: 'lab-cta-arrow', 'aria-hidden': 'true', text: '→' }),
        ]),
      ])
    : el('div', { class: 'lab-fn-status is-pending', role: 'note' }, [
        el('p', { class: 'lab-fn-status-title' }, dual(
          'The function model is not published yet',
          '機能モデルは、まだ公開していません'
        )),
        el('p', {}, dual(
          'It is implemented and it runs, but no clinician has reviewed it, and a model that says which pathway carries which function is not something to publish on an engineer’s word. Until that review is recorded, the structures themselves can be studied in the anatomy and on MRI.',
          'モデルは実装済みで動きますが、医師によるレビューがまだ済んでいません。「どの経路がどの機能を担うか」を述べるモデルを、レビューなしに公開することはしていません。レビューが記録されるまでは、構造そのものを脳解剖と MRI で学べます。'
        )),
        el('p', { class: 'lab-fn-status-links' }, [
          reachable(anatomy) ? el('a', { class: 'lab-cta is-quiet', href: anatomy.route }, dual(anatomy.en, anatomy.ja)) : null,
          reachable(mri) ? el('a', { class: 'lab-cta is-quiet', href: mri.route }, dual(mri.en, mri.ja)) : null,
        ].filter(Boolean)),
      ]);

  const themeItem = (theme) => {
    const covered = theme.tasks.length > 0;
    return el('li', {
      class: `lab-fn-theme${theme.priority ? ' is-priority' : ''}`,
      id: `theme-${theme.id}`,
      tabindex: '-1',
    }, [
      el('h3', { class: 'lab-fn-theme-name' }, dual(theme.en, theme.ja)),
      el('p', { class: 'lab-fn-theme-question' }, dual(theme.questionEn, theme.questionJa)),
      el('p', { class: 'lab-fn-theme-state' }, covered
        ? dual(
            modelOpen
              ? `In the model: ${theme.tasks.length} task${theme.tasks.length === 1 ? '' : 's'} you can trace and interrupt.`
              : `In the model (${theme.tasks.length} task${theme.tasks.length === 1 ? '' : 's'}) — opens with it.`,
            modelOpen
              ? `モデルに収載：経路をたどり、切って確かめられる課題が ${theme.tasks.length} 件。`
              : `モデルに収載済み（課題 ${theme.tasks.length} 件）。モデルの公開と同時に開きます。`
          )
        : dual('Planned — not in the model yet.', '今後追加します（モデルには未収載）。')),
    ]);
  };

  const element = el('main', { class: 'bm-page lab-functions' }, [
    createShellHeader({ current: 'functions', accountButton, languageToggle: languageToggle.element }),
    el('header', { class: 'bm-page-head', id: 'content', tabindex: '-1', 'data-skip-target': '' }, [
      el('h1', { class: 'bm-page-title' }, dual('Higher brain function', '高次脳機能')),
      el('p', { class: 'bm-page-lead' }, dual(
        'Language, memory, attention, executive function. The model behind this area does not treat a function as a label on a region: it draws each one as a route through several named structures and the fibres between them, and asks what is lost when that route is cut.',
        '言語、記憶、注意、遂行機能。この領域のモデルは、機能を「領域に貼るラベル」として扱いません。機能を、名前の付いた複数の構造とその間をつなぐ線維を通る経路として描き、経路のどこが切れると何が失われるかを考えます。'
      )),
    ]),
    status,
    el('section', { class: 'lab-section lab-fn-themes', 'aria-labelledby': 'lab-fn-themes-title' }, [
      el('h2', { class: 'lab-section-title', id: 'lab-fn-themes-title' }, dual('Themes', '学習テーマ')),
      el('ul', { class: 'lab-fn-theme-list' }, themes.map(themeItem)),
    ]),
    el('section', { class: 'lab-section lab-fn-limits', 'aria-labelledby': 'lab-fn-limits-title' }, [
      el('h2', { class: 'lab-section-title', id: 'lab-fn-limits-title' }, dual('What this does not say', 'このモデルが言わないこと')),
      el('ul', { class: 'lab-fn-limit-list' }, [
        ['It is one representative right-handed brain. Language dominance, and much else, varies between people.',
          '代表的な右利きの脳 1 つです。言語の優位半球をはじめ、個人差は扱いません。'],
        ['It is not a lesion localiser: a set of symptoms does not uniquely determine a place, and nothing here should be read back onto a patient or a scan.',
          '病巣同定の道具ではありません。症状の組み合わせから部位が一意に決まるわけではなく、ここでの読みを患者や画像に当てはめないでください。'],
        ['A region is not a function. In the model one structure can sit on several routes, and a coloured region on an atlas says nothing about what it does.',
          '領域は機能ではありません。モデルでは 1 つの構造が複数の経路に載ることがあり、アトラスで色の付いた領域は、その働きについて何も述べていません。'],
        ['Individual association bundles and functional areas cannot be told apart on an ordinary structural MRI. Where they are drawn, they are drawn from an atlas, as a reference.',
          '個々の連合線維束や機能領域は、通常の構造 MRI では見分けられません。描くときは、アトラスに基づく参考表示として区別します。'],
      ].map(([en, ja]) => el('li', {}, dual(en, ja)))),
    ]),
    createSiteFooter(),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = pageTitle(inLanguage('Higher brain function', '高次脳機能'));

  const openTheme = (id) => {
    const target = themes.some((theme) => theme.id === id) ? element.querySelector(`#theme-${id}`) : null;
    if (!target) return;
    globalThis.requestAnimationFrame?.(() => {
      target.scrollIntoView?.({ block: 'center' });
      target.focus?.({ preventScroll: true });
    });
  };
  openTheme(focusId);
  // A theme link pressed on this page changes only the query, which the shell
  // treats as the same page and does not rebuild — so the page answers itself.
  const onHash = () => openTheme(themeOf(globalThis.location?.hash ?? ''));
  globalThis.addEventListener?.('hashchange', onHash);

  return {
    element,
    destroy() {
      globalThis.removeEventListener?.('hashchange', onHash);
      languageToggle.element.remove();
      element.remove();
    },
  };
}
