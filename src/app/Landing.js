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
import { NECO_LINKS } from '../data/necoLinks.js';
import { createLandingOrganHero } from './landingOrganHero.js';
import { betaUnlocked } from './releaseGate.js';
import { el, skipLink } from '../utils/dom.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

const shellLink = (href, en, ja, className = 'landing-button') =>
  el('a', { class: className, href }, dual(en, ja));

const externalLink = (href, en, ja, className = 'landing-external-link') =>
  el('a', {
    class: className,
    href,
    target: '_blank',
    rel: 'noopener noreferrer',
  }, [
    ...dual(en, ja),
    el('span', { class: 'landing-external-mark', 'aria-hidden': 'true', text: '↗' }),
    ...dual('Opens in a new tab', '新しいタブで開きます', 'landing-sr-only'),
  ]);

const operatorCredit = (className) => externalLink(
  NECO_LINKS.operator,
  'Operated by Neco Inc.',
  '運営：株式会社Neco',
  className
);

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
  const organHero = heroModels.length
    ? createLandingOrganHero({
        onRendererFailure,
        organs: heroModels,
        compact: true,
        showOpenLink: false,
      })
    : null;

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

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
          el('p', { class: 'landing-eyebrow' }, dual('Public beta', '公開β')),
          el('h1', { class: 'landing-title' }, dual(
            '3D anatomical models of the human body',
            '人体の3D解剖モデル'
          )),
          el('p', { class: 'landing-hero-summary' }, dual(summary.en, summary.ja)),
          primaryModel
            ? null
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
      organHero
        ? el('div', { class: 'landing-hero-actions' }, [
            organHero.actionElement,
            shellLink(
              primaryModel.modelInfoRoute ?? MODEL_INFO_ROUTE,
              'Model information',
              'モデル情報',
              'landing-model-info-link landing-cta'
            ),
          ])
        : null,
    ]),

    el('section', { class: 'landing-method', 'aria-labelledby': 'landing-method-title' }, [
      el('div', { class: 'landing-method-heading' }, [
        el('h2', { id: 'landing-method-title' }, dual(
          'Check the model before using it',
          'モデルについて確認する'
        )),
      ]),
      el('p', { class: 'landing-method-copy' }, dual(
        'See the source, licence, revision, represented structures and known limits for each model.',
        '各モデルの出典、ライセンス、revision、表現している構造と限界を確認できます。'
      )),
      el('nav', { class: 'landing-method-links', 'aria-label': 'Model information and support / モデル情報・サポート' }, [
        shellLink(
          MODEL_INFO_ROUTE,
          'View model information',
          'モデル情報を見る',
          'landing-method-link is-primary landing-cta'
        ),
        shellLink('#/support', 'Report a problem', '不具合を連絡する', 'landing-method-link'),
      ]),
    ]),

    el('section', { class: 'landing-neco', 'aria-labelledby': 'landing-neco-title' }, [
      el('div', { class: 'landing-neco-heading' }, [
        operatorCredit('landing-neco-operator'),
        el('h2', { id: 'landing-neco-title' }, dual(
          'Support for doctors and medical institutions',
          '医師の働き方・採用のご相談'
        )),
      ]),
      el('p', { class: 'landing-neco-copy' }, dual(
        'Neco, the operator of Medical 3D Lab, supports doctors considering their work and careers, and medical institutions recruiting doctors.',
        '運営する株式会社Necoは、医師の転職・働き方の相談と、医療機関の採用を支援しています。'
      )),
      el('nav', { class: 'landing-neco-links', 'aria-label': 'Neco services / Necoの相談窓口' }, [
        externalLink(
          NECO_LINKS.doctor,
          'For doctors: discuss work and opportunities',
          '医師の方：働き方・求人について相談する'
        ),
        externalLink(
          NECO_LINKS.medicalInstitution,
          'For medical institutions: discuss doctor recruitment',
          '医療機関の方：医師の採用について相談する'
        ),
      ]),
    ]),

    el('footer', { class: 'landing-footer' }, [
      el('div', { class: 'landing-footer-identity' }, [
        el('div', { class: 'landing-footer-brand', text: 'Medical 3D Lab' }),
        operatorCredit('landing-footer-operator'),
      ]),
      el('p', { class: 'landing-footer-boundary' }, dual(
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
    ? createLandingOrganHero({
        organs: heroModels,
        compact: true,
        showOpenLink: false,
        // The page heading already names the sole model. Keep an in-canvas
        // identity only when the manifest actually offers a choice.
        showIdentity: models.length > 1,
      })
    : null;
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
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
  const heading = models.length === 1
    ? [models[0].titleEn, models[0].titleJa]
    : ['3D anatomical models', '3D解剖モデル'];

  const element = el('main', { class: 'explorer public-models' }, [
    el('header', {
      class: 'explorer-header public-models-header',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
    }, [
      el('div', { class: 'public-models-appbar' }, [
        el('a', { class: 'public-models-brand', href: LANDING_ROUTE, text: 'Medical 3D Lab' }),
        el('nav', { class: 'explorer-header-actions', 'aria-label': 'Model navigation / モデルナビゲーション' }, [
          el('a', { class: 'explorer-shell-link', href: '#/trust' }, dual('Model information', 'モデル情報')),
          accountButton,
          languageToggle.element,
        ]),
      ]),
      el('p', { class: 'eyebrow' }, dual(
        models.length === 0 ? 'Publication status' : '3D anatomy model',
        models.length === 0 ? '公開状況' : '3D解剖モデル'
      )),
      el('h1', { class: 'title' }, dual(heading[0], heading[1])),
      el('p', { class: 'subtitle' }, dual(summary[0], summary[1])),
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
    organHero
      ? el('nav', {
          class: 'public-models-actions',
          'aria-label': 'Selected model actions / 選択中モデルの操作',
        }, [
          organHero.actionElement,
          el('a', { class: 'explorer-shell-link', href: MODEL_INFO_ROUTE }, dual(
            'Model information',
            'モデル情報'
          )),
        ])
      : null,
    el('footer', { class: 'explorer-footer public-models-footer' }, [
      el('div', { class: 'public-models-footer-copy' }, [
        operatorCredit('public-models-operator'),
        el('p', {}, dual(
          'Representative educational models — not for individual diagnosis or treatment decisions.',
          '学習用の代表モデルです。個別の診断・治療判断には使用できません。'
        )),
      ]),
      el('nav', { class: 'public-models-footer-links', 'aria-label': 'Legal and support / 規約・サポート' }, [
        el('a', { class: 'explorer-shell-link', href: '#/trust' }, dual('Model information', 'モデル情報')),
        el('a', { class: 'explorer-shell-link', href: '#/terms' }, dual('Terms', '利用規約')),
        el('a', { class: 'explorer-shell-link', href: '#/privacy' }, dual('Privacy', 'プライバシー')),
        el('a', { class: 'explorer-shell-link', href: '#/commerce' }, dual('Commercial disclosure', '特定商取引法に基づく表記')),
        el('a', { class: 'explorer-shell-link', href: '#/support' }, dual('Support', 'サポート')),
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
