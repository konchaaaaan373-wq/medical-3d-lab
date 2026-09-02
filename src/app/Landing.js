import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  PUBLIC_SCENES,
  sceneRoute,
  statusById,
  systemById,
} from '../catalog/index.js';
import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { landingPresentationFor, orderLandingScenes } from '../data/landing.js';
import { createLandingCirculationDemo } from './landingCirculationDemo.js';
import { createLandingFlowField } from './landingFlowField.js';
import { el, skipLink } from '../utils/dom.js';

const TRUST_ROUTE = '#/trust';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * Product-first landing page. The first viewport is the actual circulation
 * scene, not a mock-up or a description of one.
 */
export function createLanding({ ui, accountButton = null, onRendererFailure = () => {} }) {
  const scenes = orderLandingScenes(PUBLIC_SCENES);
  const flowField = createLandingFlowField();
  const circulationDemo = createLandingCirculationDemo({ onRendererFailure });

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const shellLink = (href, en, ja, className = 'landing-button') =>
    el('a', { class: className, href }, dual(en, ja));

  const stateBadge = (kind, status, en, ja) =>
    el('span', { class: `landing-state-badge is-${kind} is-${status}` }, dual(en, ja));

  const sceneCard = (scene, index) => {
    const maturity = statusById(scene.status);
    const review = clinicalReviewPresentation(scene);
    const system = systemById(scene.system);
    const presentation = landingPresentationFor(scene);

    return el('a', {
      class: 'landing-scene-card',
      href: sceneRoute(scene),
      dataset: { system: scene.system, scene: scene.id },
    }, [
      el('div', { class: 'landing-scene-topline' }, [
        el('span', { class: 'landing-scene-number', text: String(index + 1).padStart(2, '0') }),
        el('span', { class: 'landing-scene-system' }, dual(system?.label ?? scene.system, system?.labelJa ?? scene.system)),
        el('span', { class: 'landing-scene-open', 'aria-hidden': 'true', text: '↗' }),
      ]),
      el('div', { class: 'landing-scene-heading' }, [
        el('h3', { class: 'landing-scene-name' }, dual(presentation.title, presentation.titleJa)),
        el('p', { class: 'landing-scene-summary' }, dual(presentation.question, presentation.questionJa)),
      ]),
      el('ol', { class: 'landing-signal-chain', 'aria-label': 'Model variables / モデルの変数' },
        presentation.signals.map((signal, signalIndex) =>
          el('li', {}, dual(signal, presentation.signalsJa[signalIndex]))
        )
      ),
      el('div', { class: 'landing-scene-states' }, [
        stateBadge(
          'maturity',
          scene.status,
          `Build: ${maturity?.label ?? scene.status}`,
          `実装：${maturity?.labelJa ?? scene.status}`
        ),
        stateBadge('review', review.status, `Clinical: ${review.shortEn}`, `医学：${review.shortJa}`),
      ]),
    ]);
  };

  const element = el('main', { class: 'landing' }, [
    el('header', { class: 'landing-nav' }, [
      el('a', { class: 'landing-brand', href: '#/', 'aria-label': 'Medical 3D Lab home' }, [
        el('span', { class: 'landing-brand-mark', 'aria-hidden': 'true' }, [
          el('span', { text: 'M' }),
          el('i'),
          el('span', { text: '3' }),
        ]),
        el('span', { class: 'landing-brand-name', text: 'Medical 3D Lab' }),
      ]),
      el('nav', { class: 'landing-nav-links', 'aria-label': 'Product navigation / 製品ナビゲーション' }, [
        shellLink(EXPLORER_ROUTE, '3D models', '3Dモデル', 'landing-nav-link'),
        shellLink(TRUST_ROUTE, 'Sources & review', '根拠・レビュー', 'landing-nav-link'),
        shellLink(LAB_ROUTE, 'Experimental', '実験モデル', 'landing-nav-link'),
      ]),
      el('div', { class: 'landing-nav-actions' }, [accountButton, languageToggle.element]),
    ]),

    el('section', { class: 'landing-hero', id: 'content', tabindex: '-1', 'data-skip-target': '' }, [
      el('header', { class: 'landing-hero-heading' }, [
        el('div', {}, [
          el('p', { class: 'landing-eyebrow' }, dual('INTERACTIVE MEDICAL MODELS', '操作できる医学モデル')),
          el('h1', { class: 'landing-title' }, dual(
            '3D models of anatomy and pathophysiology',
            '解剖・病態生理の3Dモデル'
          )),
        ]),
        el('dl', { class: 'landing-hero-facts' }, [
          el('div', {}, [el('dt', { text: String(scenes.length) }), el('dd', {}, dual('models', '公開モデル'))]),
          el('div', {}, [el('dt', {}, dual('FREE', '無料')), el('dd', {}, dual('core models', '基本モデル'))]),
          el('div', {}, [el('dt', {}, dual('NONE', '不要')), el('dd', {}, dual('account', 'アカウント'))]),
        ]),
      ]),
      el('div', { class: 'landing-hero-instrument' }, [circulationDemo.element]),
      el('div', { class: 'landing-hero-actions' }, [
        shellLink('#/circulation', 'Open the circulation model', '循環モデルを全画面で開く', 'landing-button primary landing-cta'),
        shellLink(EXPLORER_ROUTE, 'See all 3D models', '3Dモデルをすべて見る', 'landing-button secondary landing-cta'),
      ]),
    ]),

    el('section', { class: 'landing-section landing-models', 'aria-labelledby': 'landing-models-title' }, [
      el('div', { class: 'landing-section-head' }, [
        el('div', {}, [
          el('p', { class: 'landing-section-kicker' }, dual('3D MODEL INDEX', '3Dモデル')),
          el('h2', { class: 'landing-section-title', id: 'landing-models-title' }, dual(
            '3D model library',
            '3Dモデル一覧'
          )),
        ]),
        shellLink(EXPLORER_ROUTE, 'Filter by organ →', '臓器・領域から探す →', 'landing-inline-link'),
      ]),
      el('div', { class: 'landing-scene-grid' }, scenes.map(sceneCard)),
    ]),

    el('section', { class: 'landing-method', 'aria-labelledby': 'landing-method-title' }, [
      el('div', { class: 'landing-method-heading' }, [
        el('p', { class: 'landing-section-kicker' }, dual('MODEL INFORMATION', 'モデル情報')),
        el('h2', { id: 'landing-method-title' }, dual('Sources, assumptions, limits', '根拠・前提・限界')),
      ]),
      el('ul', { class: 'landing-method-list' }, [
        el('li', {}, dual('Sources', '参照文献')),
        el('li', {}, dual('Assumptions', 'モデルの仮定')),
        el('li', {}, dual('Not represented', '再現していない範囲')),
        el('li', {}, dual('Clinical review status', '医学レビューの状態')),
      ]),
      shellLink(TRUST_ROUTE, 'Open model information', 'モデル情報を確認する', 'landing-button secondary landing-cta'),
    ]),

    el('section', { class: 'landing-closing' }, [
      el('div', {}, [
        el('p', { class: 'landing-section-kicker' }, dual('FREE CORE MODELS', '基本モデルは無料')),
        el('h2', {}, dual('Open one. No account required.', '登録せず、そのまま開けます。')),
      ]),
      shellLink(EXPLORER_ROUTE, 'Open the model index', 'モデル一覧を開く', 'landing-button primary landing-cta'),
    ]),

    el('footer', { class: 'landing-footer' }, [
      el('div', { class: 'landing-footer-brand', text: 'Medical 3D Lab' }),
      el('p', {}, dual(
        'Educational conceptual models — not patient-specific diagnosis or treatment.',
        '教育目的の概念モデルです。個別患者の診断・治療を行うものではありません。'
      )),
      el('nav', { class: 'landing-footer-links', 'aria-label': 'Legal and support / 規約・サポート' }, [
        el('a', { class: 'landing-footer-link', href: '#/terms' }, dual('Terms', '利用規約')),
        el('a', { class: 'landing-footer-link', href: '#/privacy' }, dual('Privacy', 'プライバシー')),
        el('a', { class: 'landing-footer-link', href: '#/commerce' }, dual('Commercial disclosure', '特定商取引法に基づく表記')),
        el('a', { class: 'landing-footer-link', href: '#/support' }, dual('Support', 'サポート')),
        shellLink(TRUST_ROUTE, 'Model information', 'モデル情報', 'landing-footer-link'),
      ]),
    ]),
  ]);

  ui.append(skipLink(), flowField.element, element);
  languageToggle.init();
  void circulationDemo.mount();
  document.title = 'Medical 3D Lab — 解剖・病態生理の3Dモデル';

  return {
    element,
    circulationDemo,
    destroy() {
      circulationDemo.destroy();
      flowField.destroy();
      languageToggle.element.remove();
      element.remove();
    },
  };
}
