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
 * WebGL-independent product entry point.
 *
 * The circulation preview calls the same solver as the full scene, but the
 * page itself imports no scene, renderer or Three.js module. The ambient flow
 * field is explicitly decorative and carries no medical value.
 */
export function createLanding({ ui, accountButton = null }) {
  const scenes = orderLandingScenes(PUBLIC_SCENES);
  const diseaseCount = scenes.filter((scene) => scene.disease).length;
  const flowField = createLandingFlowField();
  const circulationDemo = createLandingCirculationDemo();

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
      el('div', { class: 'landing-scene-index' }, [
        el('span', { class: 'landing-scene-number', text: String(index + 1).padStart(2, '0') }),
        el('span', { class: 'landing-scene-system' }, dual(system?.label ?? scene.system, system?.labelJa ?? scene.system)),
      ]),
      el('div', { class: 'landing-scene-heading' }, [
        el('p', { class: 'landing-scene-name' }, dual(scene.titleEn, scene.titleJa)),
        el('h3', { class: 'landing-scene-question' }, dual(presentation.question, presentation.questionJa)),
      ]),
      el('ol', { class: 'landing-signal-chain', 'aria-label': 'Model reading path / モデルの読み筋' },
        presentation.signals.map((signal, signalIndex) =>
          el('li', {}, dual(signal, presentation.signalsJa[signalIndex]))
        )
      ),
      el('div', { class: 'landing-scene-states' }, [
        el('div', { class: 'landing-scene-state' }, [
          el('span', { class: 'landing-state-key' }, dual('Maturity', '実装')),
          stateBadge('maturity', scene.status, maturity?.label ?? scene.status, maturity?.labelJa ?? scene.status),
        ]),
        el('div', { class: 'landing-scene-state' }, [
          el('span', { class: 'landing-state-key' }, dual('Clinical review', '医学レビュー')),
          stateBadge('review', review.status, review.shortEn, review.shortJa),
        ]),
      ]),
      el('span', { class: 'landing-scene-open', 'aria-hidden': 'true', text: '↗' }),
    ]);
  };

  const proofItem = (number, title, titleJa, body, bodyJa) =>
    el('article', { class: 'landing-proof-item' }, [
      el('span', { class: 'landing-proof-number', text: number }),
      el('h3', {}, dual(title, titleJa)),
      el('p', {}, dual(body, bodyJa)),
    ]);

  const accessColumn = ({ label, labelJa, title, titleJa, body, bodyJa, items, paid = false }) =>
    el('article', { class: `landing-access-column${paid ? ' is-professional' : ''}` }, [
      el('div', { class: 'landing-access-label' }, dual(label, labelJa)),
      el('h3', {}, dual(title, titleJa)),
      el('p', {}, dual(body, bodyJa)),
      el('ul', {}, items.map(([en, ja]) => el('li', {}, dual(en, ja)))),
    ]);

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
        shellLink(EXPLORER_ROUTE, 'Models', 'モデル', 'landing-nav-link'),
        shellLink(TRUST_ROUTE, 'Trust', '信頼性', 'landing-nav-link'),
        shellLink(LAB_ROUTE, 'Experimental', '実験モデル', 'landing-nav-link'),
      ]),
      el('div', { class: 'landing-nav-actions' }, [accountButton, languageToggle.element]),
    ]),

    el('section', { class: 'landing-hero', id: 'content', tabindex: '-1', 'data-skip-target': '' }, [
      el('div', { class: 'landing-hero-copy' }, [
        el('p', { class: 'landing-eyebrow' }, dual('MEDICAL MECHANISM LAB', '病態生理を、手で確かめる')),
        el('h1', { class: 'landing-title' }, [
          el('span', { class: 'lang-en', text: 'Physiology makes sense in motion.' }),
          el('span', { class: 'lang-ja landing-title-ja' }, [
            el('span', { class: 'landing-title-line', text: '病態生理は、' }),
            el('span', { class: 'landing-title-line', text: '動かすと' }),
            el('span', { class: 'landing-title-line', text: '見えてくる。' }),
          ]),
        ]),
        el('p', { class: 'landing-lead' }, dual(
          'Pressure, flow and oxygen delivery are connected, but they are not interchangeable. Move a parameter and follow the same solved state through the picture, the numbers and the explanation.',
          '血圧、血流、酸素運搬。ばらばらに覚えがちな値を、ひとつのモデルの動きとしてつなぎ直します。パラメータを動かすと、図・数値・解説が同時に変わります。'
        )),
        el('div', { class: 'landing-hero-actions' }, [
          shellLink('#/circulation', 'Open circulation model', '循環モデルを開く', 'landing-button primary landing-cta'),
          shellLink(EXPLORER_ROUTE, 'See every model', '全モデルを見る', 'landing-button secondary landing-cta'),
        ]),
        el('dl', { class: 'landing-hero-facts' }, [
          el('div', {}, [el('dt', { text: String(scenes.length) }), el('dd', {}, dual('public models', '公開モデル'))]),
          el('div', {}, [el('dt', { text: String(diseaseCount) }), el('dd', {}, dual('disease mechanisms', '病態モデル'))]),
          el('div', {}, [el('dt', { text: 'FREE' }), el('dd', {}, dual('core models, no account', '基本モデル・登録不要'))]),
        ]),
      ]),
      el('div', { class: 'landing-hero-instrument' }, [circulationDemo.element]),
    ]),

    el('section', { class: 'landing-proof', 'aria-labelledby': 'landing-proof-title' }, [
      el('div', { class: 'landing-proof-intro' }, [
        el('p', { class: 'landing-section-kicker' }, dual('HOW TO TRUST THE PICTURE', 'この図を信頼するために')),
        el('h2', { id: 'landing-proof-title' }, dual('One state, all the way through.', '図・数値・解説を、同じ状態から。')),
        shellLink(TRUST_ROUTE, 'Inspect the trust record →', '根拠とレビュー記録を見る →', 'landing-inline-link'),
      ]),
      el('div', { class: 'landing-proof-grid' }, [
        proofItem('01', 'One solved state', '計算状態はひとつ', 'Geometry, readings and copy refer to the same model result.', '形、表示値、解説が、同じモデルの計算結果を参照します。'),
        proofItem('02', 'Limits stay visible', '限界まで見せる', 'Assumptions, omissions and sources remain one click away.', '仮定、省略したもの、参照文献をモデルごとに公開します。'),
        proofItem('03', 'Two trust axes', '成熟度を混ぜない', 'Implementation maturity and clinical review are reported separately.', '実装の成熟度と医学レビューの状態を、別々に表示します。'),
      ]),
    ]),

    el('section', { class: 'landing-section landing-models', 'aria-labelledby': 'landing-models-title' }, [
      el('div', { class: 'landing-section-head' }, [
        el('div', {}, [
          el('p', { class: 'landing-section-kicker' }, dual('PUBLIC MODEL INDEX', '公開モデル')),
          el('h2', { class: 'landing-section-title', id: 'landing-models-title' }, dual(
            'Start with the question you want to answer.',
            '知りたい問いから、モデルを選ぶ。'
          )),
          el('p', { class: 'landing-section-note' }, dual(
            'Every core model is free to open. Maturity does not imply current clinical sign-off.',
            '基本モデルはすべて無料で開けます。実装成熟度は、医学レビュー完了を意味しません。'
          )),
        ]),
        shellLink(EXPLORER_ROUTE, 'Browse by organ →', '臓器から探す →', 'landing-inline-link'),
      ]),
      el('div', { class: 'landing-scene-grid' }, scenes.map(sceneCard)),
    ]),

    el('section', { class: 'landing-access', 'aria-labelledby': 'landing-access-title' }, [
      el('div', { class: 'landing-access-intro' }, [
        el('p', { class: 'landing-section-kicker' }, dual('ACCESS', '利用範囲')),
        el('h2', { class: 'landing-section-title', id: 'landing-access-title' }, dual(
          'The model and its evidence stay open.',
          'モデルも、根拠も、開いておく。'
        )),
        el('p', {}, dual(
          'Professional tools change how the same model is used; they do not hide its medical basis.',
          '有料になるのは、同じモデルを現場で使うための機能です。医学的な根拠そのものは隠しません。'
        )),
      ]),
      el('div', { class: 'landing-access-grid' }, [
        accessColumn({
          label: 'FREE CORE',
          labelJa: '無料',
          title: 'Explore the mechanism',
          titleJa: '機序を動かして理解する',
          body: 'No account required.',
          bodyJa: 'アカウント登録は不要です。',
          items: [
            ['Interactive core model', '基本モデルの操作'],
            ['Mechanism explanation', '機序の解説'],
            ['Sources, assumptions and limits', '文献・仮定・限界'],
          ],
        }),
        accessColumn({
          label: 'PROFESSIONAL WORKFLOW',
          labelJa: 'プロ向け',
          title: 'Use it in an explanation',
          titleJa: '説明・教育の流れに組み込む',
          body: 'Availability follows each model’s clinical-review state.',
          bodyJa: 'モデルごとの医学レビュー状態に応じて提供します。',
          items: [
            ['Patient-facing guided steps', '患者向けの段階解説'],
            ['Medical education exercises', '医学教育用の演習'],
            ['Presenter and handout tools', '提示・配布用ツール'],
          ],
          paid: true,
        }),
      ]),
    ]),

    el('section', { class: 'landing-closing' }, [
      el('div', {}, [
        el('p', { class: 'landing-section-kicker' }, dual('OPEN THE MODEL, OPEN THE METHOD', 'モデルを、根拠ごと開く')),
        el('h2', {}, dual('A beautiful picture is only the beginning.', 'きれいな図で終わらせない。')),
        el('p', {}, dual(
          'Read what is solved, what is illustrative and what remains unreviewed.',
          '何を計算し、どこからが例示で、何が未レビューなのかまで確認できます。'
        )),
      ]),
      el('div', { class: 'landing-closing-actions' }, [
        shellLink(TRUST_ROUTE, 'Review & evidence', 'レビューと根拠', 'landing-button secondary landing-cta'),
        shellLink(LAB_ROUTE, 'Experimental models', '実験モデル', 'landing-button ghost landing-cta'),
      ]),
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
        shellLink(TRUST_ROUTE, 'Model trust', '医学的信頼性', 'landing-footer-link'),
      ]),
    ]),
  ]);

  ui.append(skipLink(), flowField.element, element);
  languageToggle.init();
  document.title = 'Medical 3D Lab — 病態生理を、動かして理解する';

  return {
    element,
    circulationDemo,
    destroy() {
      flowField.destroy();
      languageToggle.element.remove();
      element.remove();
    },
  };
}
