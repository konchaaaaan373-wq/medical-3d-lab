import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import {
  HERO_ORGANS,
  heroOrgansForModels,
} from '../data/landingHero.js';
import { BRAND, pageTitle } from '../data/brand.js';
import { ABOUT_ROUTE, FUNCTIONS_ROUTE, LANDING_ROUTE, MODELS_ROUTE } from '../catalog/index.js';
import { LAUNCH_AREAS } from '../catalog/launch.js';
import { PRIORITY_THEMES } from '../data/brainFunctionThemes.js';
import { brandIcon } from '../components/brandIcon.js';
import { createLandingOrganHero } from './landingOrganHero.js';
import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createSiteFooter } from '../components/SiteFooter.js';
import { betaUnlocked } from './releaseGate.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * The front door (ADR 2026-11-24, brain launch).
 *
 * ## What it has to do in five seconds
 *
 * Say what this is — the brain, in three dimensions, tied to MRI — and put it
 * a press away. So, top to bottom: the promise as the page's one `h1`, beside
 * the real brain model, live; the launch's three areas as three entrances
 * (高次脳機能 · 脳解剖 · MRIアトラス, from `catalog/launch.js`, in that order);
 * the priority themes as questions; how it teaches; where its claims come
 * from; the footer.
 *
 * ## An area is always listed; a model is only offered when it is open
 *
 * The three areas are the product's shape, so all three are on the page
 * whatever the release holds — and an area whose model is closed **says so in
 * words** inside its own link instead of being greyed out or dropped. What is
 * never rendered for a closed model is an invitation to open it: the hero's
 * two buttons exist only while the model behind each is in the manifest.
 *
 * ## What it stopped being
 *
 * BYOKI MOTION's front door (ADR 2026-09-30): a wordmark over a 2D field of
 * lanes and points, then the published disease models as cards. The launch
 * publishes no disease model and its subject is one organ, so the hero is
 * that organ's own model again and the flow field is gone
 * (`git log --follow src/app/landingFlowField.js`).
 *
 * Which models are open is read from the public manifest and nothing else.
 * The hero is the brain's viewport and only the brain's, whatever else the
 * manifest holds: a front page about one organ has no chooser.
 */
export function createLanding({
  ui,
  accountButton = null,
  manifest = PUBLIC_MANIFEST,
  onRendererFailure = () => {},
  areas = LAUNCH_AREAS,
  themes = PRIORITY_THEMES,
} = {}) {
  const models = [...(manifest?.models ?? [])];
  const open = new Set(models.map((model) => model.sceneId));
  const unlocked = safeUnlocked();
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  // The hero is the real brain model, live — not a picture of it. It is the
  // brain's hero viewport and only the brain's: a launch about one organ has
  // no chooser. Mounted after the page is on screen (`mount()` below), and the
  // model itself arrives by dynamic import, so the copy, the three entrances
  // and the footer render on a browser that cannot start WebGL at all.
  const heroModels = heroOrgansForModels(models).filter((entry) => entry.organ === 'brain');
  const organHero = heroModels.length ? safeOrganHero(heroModels, onRendererFailure) : null;

  const area = (id) => areas.find((item) => item.id === id) ?? null;
  const anatomy = area('anatomy');
  const mri = area('mri');
  /** Whether an area's own model can be opened in this build. */
  const isOpen = (item) => Boolean(item) && (unlocked || open.has(item.sceneId));

  const hero = el('section', {
    class: 'lab-hero',
    id: 'content',
    tabindex: '-1',
    'data-skip-target': '',
    'aria-labelledby': 'lab-hero-title',
  }, [
    el('div', { class: 'lab-hero-copy' }, [
      el('p', { class: 'lab-hero-kicker' }, dual('Brain · 3D × MRI', '脳 · 3D × MRI')),
      el('h1', { class: 'lab-hero-title', id: 'lab-hero-title' }, dual(BRAND.tagline.en, BRAND.tagline.ja)),
      el('p', { class: 'lab-hero-lead' }, dual(BRAND.description, BRAND.descriptionJa)),
      el('div', { class: 'lab-hero-actions' }, [
        anatomy?.route && isOpen(anatomy)
          ? el('a', { class: 'lab-cta', href: anatomy.route }, [
              ...dual('Open the brain in 3D', '脳を 3D で開く'),
              el('span', { class: 'lab-cta-arrow', 'aria-hidden': 'true', text: '→' }),
            ])
          : null,
        mri?.route && isOpen(mri)
          ? el('a', { class: 'lab-cta is-quiet', href: mri.route }, dual('MRI atlas', 'MRIアトラス'))
          : null,
      ].filter(Boolean)),
    ]),
    organHero
      ? el('div', { class: 'lab-hero-model', 'aria-label': inLanguage('Live 3D brain model', '操作できる脳の3Dモデル') }, [
          organHero.element,
        ])
      : el('div', { class: 'lab-hero-model is-mark', 'aria-hidden': 'true' }, [brandIcon(el, 'lab-hero-mark')]),
  ]);

  const entrances = el('section', { class: 'lab-section lab-areas', 'aria-labelledby': 'lab-areas-title' }, [
    el('h2', { class: 'visually-hidden', id: 'lab-areas-title' }, dual('Three ways in', '3 つの入口')),
    el('ol', { class: 'lab-area-list' }, areas.map((item, index) =>
      el('li', { class: `lab-area is-${item.id}` }, [
        el('a', { class: 'lab-area-link', href: item.route ?? LANDING_ROUTE }, [
          el('span', { class: 'lab-area-index', 'aria-hidden': 'true', text: String(index + 1).padStart(2, '0') }),
          el('span', { class: 'lab-area-name' }, dual(item.en, item.ja)),
          el('span', { class: 'lab-area-line' }, dual(item.lineEn, item.lineJa)),
          // Said in words, not by greying the link out: the area is real and
          // its page opens; what is not open yet is the model behind it.
          isOpen(item)
            ? el('span', { class: 'lab-area-go', 'aria-hidden': 'true', text: '→' })
            : el('span', { class: 'lab-area-status' }, item.id === 'functions'
                ? dual('Model awaiting medical review', 'モデルは医学レビュー前（未公開）')
                : dual('Opening soon', '公開準備中')),
        ]),
      ])
    )),
  ]);

  const themeSection = el('section', { class: 'lab-section lab-themes', 'aria-labelledby': 'lab-themes-title' }, [
    el('header', { class: 'lab-section-head' }, [
      el('h2', { class: 'lab-section-title', id: 'lab-themes-title' }, dual('Start from a question', '問いから始める')),
      el('a', { class: 'lab-section-link', href: FUNCTIONS_ROUTE }, dual('All themes →', 'すべてのテーマ →')),
    ]),
    el('ul', { class: 'lab-theme-list' }, themes.map((theme) =>
      el('li', { class: 'lab-theme' }, [
        el('a', { class: 'lab-theme-link', href: `${FUNCTIONS_ROUTE}?theme=${theme.id}` }, [
          el('span', { class: 'lab-theme-name' }, dual(theme.en, theme.ja)),
          el('span', { class: 'lab-theme-question' }, dual(theme.questionEn, theme.questionJa)),
        ]),
      ])
    )),
  ]);

  const features = el('section', { class: 'lab-section lab-features', 'aria-labelledby': 'lab-features-title' }, [
    el('h2', { class: 'lab-section-title', id: 'lab-features-title' }, dual('How it teaches', 'このサービスの学び方')),
    el('ul', { class: 'lab-feature-list' }, [
      [
        'Point at it by name', '名前で指せる',
        'Every structure is a separate, named part. Click it on the model or pick it from the list — the two always agree.',
        'すべての構造が、名前の付いた別々の部分です。モデルを押しても一覧から選んでも、同じものを指します。',
      ],
      [
        '3D and MRI, the same place', '3D と MRI が同じ場所を指す',
        'In the MRI atlas, choose a structure in 3D and the three planes move to it; choose it on a slice and the 3D lights up. The 3D surfaces and the colours on the slices are drawn from one set of labels in one coordinate space.',
        'MRI アトラスでは、3D で構造を選ぶと三断面がそこへ動き、断面で選ぶと 3D が光ります。3D の面と断面の色分けを、同じラベル・同じ座標から描いています。',
      ],
      [
        'Where each claim came from', '主張の出どころが見える',
        'Every model carries its sources, its licence, what it can answer and what it cannot — and says plainly when a medical review is still pending.',
        'どのモデルも、出典・ライセンス・答えられること・答えられないことを持ち、医学レビューが未完了ならそう表示します。',
      ],
    ].map(([en, ja, bodyEn, bodyJa]) =>
      el('li', { class: 'lab-feature' }, [
        el('h3', { class: 'lab-feature-name' }, dual(en, ja)),
        el('p', { class: 'lab-feature-body' }, dual(bodyEn, bodyJa)),
      ])
    )),
  ]);

  const grounds = el('section', { class: 'lab-section lab-grounds', 'aria-labelledby': 'lab-grounds-title' }, [
    el('h2', { class: 'lab-section-title', id: 'lab-grounds-title' }, dual('Evidence, sources and limits', '医学的根拠・データ出典・利用上の注意')),
    el('div', { class: 'lab-grounds-body' }, [
      el('p', {}, dual(
        'These are representative educational models, not any one person\u2019s brain. They are not for diagnosis, for localising a lesion in a patient, or for treatment decisions.',
        '学習用の代表モデルで、特定の個人の脳ではありません。診断、患者の病変局在の判定、治療の判断には使えません。'
      )),
      el('p', {}, dual(
        'The MRI is the MNI ICBM 152 (2009c) average template with the CerebrA labels; the 3D anatomy is built from published atlases. Each asset is listed with its source, version and licence.',
        'MRI は MNI ICBM 152（2009c）平均テンプレートと CerebrA ラベル、3D 解剖は公開アトラスから作っています。素材ごとに取得元・版・ライセンスを記録しています。'
      )),
      el('p', { class: 'lab-grounds-links' }, [
        el('a', { href: `${ABOUT_ROUTE}?section=evidence` }, dual('How evidence is handled', '根拠の扱い')),
        ...models.map((model) =>
          el('a', { href: model.modelInfoRoute }, dual(`${model.titleEn}: sources and limits`, `${model.titleJa}：出典と限界`))
        ),
      ]),
    ]),
  ]);

  const element = el('main', { class: 'bm-landing lab-landing' }, [
    createShellHeader({
      current: 'home',
      accountButton,
      languageToggle: languageToggle.element,
      models,
    }),
    hero,
    entrances,
    themeSection,
    features,
    grounds,
    createSiteFooter(),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  void organHero?.mount();
  document.title = pageTitle();

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

/** The hero model, or nothing — a page that cannot build it is still a page. */
function safeOrganHero(organs, onRendererFailure) {
  try {
    return createLandingOrganHero({
      organs,
      compact: true,
      showOpenLink: false,
      showIdentity: false,
      onRendererFailure,
    });
  } catch {
    return null;
  }
}

function safeUnlocked() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}

/**
 * The anatomy shelf — `#/anatomy` (and `#/organs`, `#/explore`) in the beta.
 *
 * Organs by name, one live model at a time, chosen from a row of organs. It
 * was the landing page's hero until the BYOKI MOTION rebrand moved the front
 * door to the disease models (ADR 2026-09-30); it is kept whole, because the
 * anatomy is a product layer with its own quality bar (`CLAUDE.md`), and a
 * disease model's 「解剖を確認」 lands here or on the organ's own model.
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
          'The structures a disease model points at, by name. Choose an organ, then rotate and zoom it to see where each part lies.',
          '病態モデルが指す場所を、名前で確かめるための解剖です。臓器を選び、回転・拡大して部位の位置関係を確認できます。',
        ];
  const heading = models.length === 1
    ? [models[0].titleEn, models[0].titleJa]
    : ['Anatomy', '解剖'];

  const element = el('main', { class: 'explorer public-models' }, [
    createShellHeader({
      current: 'models',
      accountButton,
      languageToggle: languageToggle.element,
      models,
    }),
    el('header', {
      class: 'explorer-header public-models-header',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
    }, [
      el('nav', { class: 'eyebrow bm-trail', 'aria-label': inLanguage('Breadcrumb', '現在地') }, [
        el('a', { class: 'bm-trail-parent', href: MODELS_ROUTE }, dual('Models', 'モデル')),
        el('span', { class: 'bm-trail-separator', 'aria-hidden': 'true', text: '/' }),
        el('span', {}, dual(
          models.length === 0 ? 'Publication status' : 'Anatomy',
          models.length === 0 ? '公開状況' : '解剖'
        )),
      ]),
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
          el('a', { class: 'explorer-shell-link', href: '#/' }, dual(
            'Back to the top page',
            'トップへ戻る'
          )),
        ]),
    organHero
      ? el('nav', {
          class: 'public-models-actions',
          'aria-label': 'Selected model actions / 選択中モデルの操作',
        }, [
          organHero.actionElement,
          organHero.infoElement,
        ])
      : null,
    createSiteFooter(),
  ].filter(Boolean));

  ui.append(skipLink(), element);
  languageToggle.init();
  void organHero?.mount();
  document.title = pageTitle('解剖 / Anatomy');

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
