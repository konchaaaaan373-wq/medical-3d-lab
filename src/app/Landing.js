import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LANDING_ROUTE,
} from '../catalog/index.js';
import {
  MODEL_INFO_ROUTE,
  PUBLIC_MANIFEST,
} from '../catalog/publicManifest.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import {
  HERO_ORGANS,
  heroOrgansForModels,
} from '../data/landingHero.js';
import { createLandingOrganHero } from './landingOrganHero.js';
import { createLandingFlowField } from './landingFlowField.js';
import { betaUnlocked } from './releaseGate.js';
import { el, skipLink } from '../utils/dom.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

const shellLink = (href, en, ja, className = 'landing-button') =>
  el('a', { class: className, href }, dual(en, ja));

function landingSummary(models) {
  if (models.length === 0) {
    return {
      en: 'No 3D anatomy model is available at the moment.',
      ja: '現在利用できる3D解剖モデルはありません。',
    };
  }
  if (models.length === 1 && models[0].organId === 'brain') {
    return {
      en: 'Rotate and zoom the brain to inspect the spatial relationship between its colour-coded structures.',
      ja: '脳を回転・拡大し、色分けされた部位の位置関係を確認できます。',
    };
  }
  return {
    en: 'Rotate and zoom a published organ model to inspect the spatial relationship between its structures.',
    ja: '公開中の臓器を回転・拡大し、部位ごとの位置関係を確認できます。',
  };
}

function modelActionLabel(model) {
  const en = model.organId === 'brain'
    ? 'View the brain'
    : model.organId === 'heart'
      ? 'View the heart'
      : `View ${model.titleEn}`;
  const ja = model.organLabelJa
    ? `${model.organLabelJa}を見る`
    : `${model.titleJa}を見る`;
  return { en, ja };
}

/**
 * Public landing surface.
 *
 * Publication data comes only from the injected PUBLIC_MANIFEST contract. The
 * optional arguments exist for 0/1/2-model fixtures; production callers use
 * the defaults. No poster path is consumed here: the hero is the real model.
 */
export function createLanding({
  ui,
  accountButton = null,
  onRendererFailure = () => {},
  manifest = PUBLIC_MANIFEST,
  heroCandidates = HERO_ORGANS,
} = {}) {
  const models = [...(manifest?.models ?? [])];
  const heroModels = heroOrgansForModels(models, heroCandidates);
  const primaryModel = models[0] ?? null;
  const summary = landingSummary(models);
  const flowField = createLandingFlowField();
  const organHero = heroModels.length
    ? createLandingOrganHero({
        onRendererFailure,
        organs: heroModels,
      })
    : null;

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const primaryAction = primaryModel ? modelActionLabel(primaryModel) : null;
  const modelLinks = models.length > 1
    ? el('nav', {
        class: 'landing-model-switches',
        'aria-label': 'Published anatomy models / 公開中の解剖モデル',
      }, models.map((model) => {
        const label = modelActionLabel(model);
        return shellLink(model.route, label.en, label.ja, 'landing-model-switch');
      }))
    : null;

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
        shellLink(EXPLORER_ROUTE, 'Anatomy models', '解剖モデル', 'landing-nav-link'),
        shellLink(MODEL_INFO_ROUTE, 'Model information', 'モデル情報', 'landing-nav-link'),
        betaUnlocked() ? shellLink(LAB_ROUTE, 'Experimental', '実験モデル', 'landing-nav-link') : null,
      ]),
      el('div', { class: 'landing-nav-actions' }, [accountButton, languageToggle.element]),
    ]),

    el('section', {
      class: 'landing-hero',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
    }, [
      el('header', { class: 'landing-hero-heading' }, [
        el('div', { class: 'landing-hero-copy' }, [
          el('p', { class: 'landing-eyebrow' }, dual('BETA', 'β版')),
          el('h1', { class: 'landing-title' }, dual(
            '3D anatomical models of the human body',
            '人体の3D解剖モデル'
          )),
          el('p', { class: 'landing-hero-summary' }, dual(summary.en, summary.ja)),
          primaryModel
            ? el('div', { class: 'landing-hero-actions' }, [
                shellLink(
                  primaryModel.route,
                  primaryAction.en,
                  primaryAction.ja,
                  'landing-button primary landing-cta'
                ),
                shellLink(
                  primaryModel.modelInfoRoute ?? MODEL_INFO_ROUTE,
                  'Model information',
                  'モデル情報',
                  'landing-button secondary landing-cta'
                ),
              ])
            : el('p', {
                class: 'landing-empty-state',
                role: 'status',
              }, dual(
                'Please check model information for the current publication status.',
                '現在の公開状況はモデル情報から確認できます。'
              )),
        ]),
      ]),
      organHero ? el('div', { class: 'landing-hero-instrument' }, [organHero.element]) : null,
      modelLinks,
    ]),

    el('section', { class: 'landing-method', 'aria-labelledby': 'landing-method-title' }, [
      el('div', { class: 'landing-method-heading' }, [
        el('p', { class: 'landing-section-kicker' }, dual('MODEL INFORMATION', 'モデル情報')),
        el('h2', { id: 'landing-method-title' }, dual(
          'Sources and current review status',
          '出典と現在の確認状況'
        )),
      ]),
      el('p', { class: 'landing-method-copy' }, dual(
        'See the source, licence, revision, represented structures and known limits for each model.',
        '各モデルの出典、ライセンス、revision、表現している構造と限界を確認できます。'
      )),
      shellLink(
        MODEL_INFO_ROUTE,
        'View model information',
        'モデル情報を見る',
        'landing-button secondary landing-cta'
      ),
    ]),

    el('section', { class: 'landing-contact' }, [
      el('h2', {}, dual('Contact', 'お問い合わせ')),
      el('p', {}, dual(
        'Send questions or report a problem with the model.',
        'モデルに関するご質問や不具合をご連絡ください。'
      )),
      shellLink('#/support', 'Contact us', '問い合わせる', 'landing-inline-link'),
    ]),

    el('footer', { class: 'landing-footer' }, [
      el('div', { class: 'landing-footer-brand', text: 'Medical 3D Lab' }),
      el('p', {}, dual(
        'Representative educational models — not for individual diagnosis or treatment decisions.',
        '学習用の代表モデルです。個別の診断・治療判断には使用できません。'
      )),
      el('nav', { class: 'landing-footer-links', 'aria-label': 'Legal and support / 規約・サポート' }, [
        el('a', { class: 'landing-footer-link', href: '#/terms' }, dual('Terms', '利用規約')),
        el('a', { class: 'landing-footer-link', href: '#/privacy' }, dual('Privacy', 'プライバシー')),
        el('a', { class: 'landing-footer-link', href: '#/commerce' }, dual('Commercial disclosure', '特定商取引法に基づく表記')),
        el('a', { class: 'landing-footer-link', href: '#/support' }, dual('Support', 'サポート')),
        shellLink(MODEL_INFO_ROUTE, 'Model information', 'モデル情報', 'landing-footer-link'),
      ]),
    ]),
  ].filter(Boolean));

  ui.append(skipLink(), flowField.element, element);
  languageToggle.init();
  void organHero?.mount();
  document.title = 'Medical 3D Lab — 人体の3D解剖モデル';

  return {
    element,
    organHero,
    destroy() {
      organHero?.destroy();
      flowField.destroy();
      languageToggle.element.remove();
      element.remove();
    },
  };
}

/**
 * Focused public surface for the anatomy beta.
 *
 * It intentionally has no search, filters, empty organ categories or prepared
 * cards. With one published model the real model is the catalogue; when the
 * manifest grows, its rows become explicit choices.
 */
export function createPublicModelsExplorer({
  ui,
  accountButton = null,
  manifest,
  heroCandidates = HERO_ORGANS,
} = {}) {
  const models = [...(manifest?.models ?? [])];
  const heroModels = heroOrgansForModels(models, heroCandidates);
  const organHero = heroModels.length
    ? createLandingOrganHero({ organs: heroModels })
    : null;
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const actions = models.map((model) => {
    const label = modelActionLabel(model);
    return el('a', {
      class: 'public-model-link',
      href: model.route,
      dataset: { scene: model.sceneId },
    }, dual(label.en, label.ja));
  });

  const summary = models.length === 0
    ? [
        'No 3D anatomy model is available at the moment.',
        '現在利用できる3D解剖モデルはありません。',
      ]
    : models.length === 1 && models[0].organId === 'brain'
      ? [
          'Rotate and zoom the brain to inspect the spatial relationship between its colour-coded structures.',
          '脳を回転・拡大し、色分けされた部位の位置関係を確認できます。',
        ]
      : [
          'Choose a published organ, then rotate and zoom it to inspect the spatial relationship between its structures.',
          '公開中の臓器を選び、回転・拡大して部位ごとの位置関係を確認できます。',
        ];

  const element = el('main', { class: 'explorer public-models' }, [
    el('header', {
      class: 'panel explorer-header public-models-header',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
    }, [
      el('p', { class: 'eyebrow' }, dual('3D ANATOMY', '3D解剖')),
      el('h1', { class: 'title' }, dual(
        '3D anatomical models of the human body',
        '人体の3D解剖モデル'
      )),
      el('p', { class: 'subtitle' }, dual(summary[0], summary[1])),
      el('div', { class: 'explorer-header-actions' }, [
        el('a', { class: 'explorer-shell-link', href: LANDING_ROUTE }, dual('Home', 'ホーム')),
        el('a', { class: 'explorer-shell-link', href: '#/trust' }, dual('Model information', 'モデル情報')),
        accountButton,
        languageToggle.element,
      ]),
    ]),
    organHero
      ? el('section', {
          class: 'public-models-focus',
          'aria-label': 'Published anatomy model / 公開中の解剖モデル',
        }, [organHero.element])
      : el('section', {
          class: 'panel public-models-empty',
          role: 'status',
        }, [
          el('p', {}, dual(
            'Model links appear only when a 3D anatomy model is available.',
            '利用できる3D解剖モデルがある場合に、モデルへのボタンを表示します。'
          )),
          el('a', { class: 'explorer-shell-link', href: '#/trust' }, dual(
            'View model information',
            'モデル情報を見る'
          )),
        ]),
    models.length > 1
      ? el('nav', {
          class: 'panel public-models-choices',
          'aria-label': 'Published models / 公開中のモデル',
        }, actions)
      : null,
    el('footer', { class: 'panel explorer-footer public-models-footer' }, [
      el('p', {}, dual(
        'Representative educational models — not for individual diagnosis or treatment decisions.',
        '学習用の代表モデルです。個別の診断・治療判断には使用できません。'
      )),
      el('nav', { class: 'public-models-footer-links' }, [
        el('a', { class: 'explorer-shell-link', href: '#/trust' }, dual('Model information', 'モデル情報')),
        el('a', { class: 'explorer-shell-link', href: '#/support' }, dual('Contact', 'お問い合わせ')),
      ]),
    ]),
  ].filter(Boolean));

  ui.append(skipLink(), element);
  languageToggle.init();
  void organHero?.mount();
  document.title = 'Medical 3D Lab — 人体の3D解剖モデル';

  return {
    element,
    organHero,
    destroy() {
      organHero?.destroy();
      languageToggle.element.remove();
      element.remove();
    },
  };
}
