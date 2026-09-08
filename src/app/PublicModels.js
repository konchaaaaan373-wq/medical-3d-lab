import { LANDING_ROUTE } from '../catalog/index.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { HERO_ORGANS, heroOrgansForModels } from '../data/landingHero.js';
import { el, skipLink } from '../utils/dom.js';
import { createLandingOrganHero } from './landingOrganHero.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

function modelAction(model) {
  return {
    en: model.organId === 'brain' ? 'View the brain' : model.organId === 'heart' ? 'View the heart' : `View ${model.titleEn}`,
    ja: model.organLabelJa ? `${model.organLabelJa}を見る` : `${model.titleJa}を見る`,
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
    const label = modelAction(model);
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
