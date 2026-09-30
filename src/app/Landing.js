import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import {
  HERO_ORGANS,
  heroOrgansForModels,
} from '../data/landingHero.js';
import { BRAND, pageTitle } from '../data/brand.js';
import { MODELS_ROUTE, SCENES, sceneById } from '../catalog/index.js';
import { isPathologyModelScene, pathologyModelScenes } from '../catalog/pathologyModels.js';
import { createLandingOrganHero } from './landingOrganHero.js';
import { createLandingFlowField } from './landingFlowField.js';
import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createSiteFooter } from '../components/SiteFooter.js';
import { createModelCard } from '../components/ModelCard.js';
import { createWordmark } from '../components/Wordmark.js';
import { patientExplanationScenes } from '../access/patientPurpose.js';
import { betaUnlocked } from './releaseGate.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * BYOKI MOTION's front door (ADR 2026-09-30).
 *
 * ## What it has to do in five seconds
 *
 * Say what this is — models of pathophysiology you move — and put one of them
 * a press away. So, top to bottom: the name and the promise with one action;
 * the published disease models, each as a picture, a name and a question; two
 * short paragraphs on why the models move and whom they speak to; the footer.
 * It is deliberately not a corporate landing page and does not grow sections.
 *
 * ## What it stopped being
 *
 * An anatomy atlas's title over a daily-rotating organ. The organs are not gone —
 * they are the anatomy shelf, one line below the models here and a section of
 * `#/models` — but the page no longer opens on a specimen, because the product
 * is not an atlas. There is no 3D on this page at all: the hero's motion is a
 * 2D field of lanes and points (`landingFlowField.js`), which costs no model
 * download and says "things move and respond" without claiming to be any
 * organ.
 *
 * Which models appear is read from the public manifest and nothing else. Under
 * the preview unlock the list is every disease model, as the other indexes do.
 */
export function createLanding({
  ui,
  accountButton = null,
  manifest = PUBLIC_MANIFEST,
  patientScenes = safePatientScenes(),
  scenes = null,
} = {}) {
  const models = [...(manifest?.models ?? [])];
  const diseaseModels = scenes ?? diseaseModelScenes(models);
  // By the category rule every surface uses (`pathologyModels.js`), read off
  // the catalogue entry rather than trusted from the row.
  const anatomyModels = models.filter((model) => !isPathologyModelScene(sceneById(model.sceneId)));
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  const flow = safeFlowField();

  const hero = el('section', {
    class: 'bm-hero',
    id: 'content',
    tabindex: '-1',
    'data-skip-target': '',
    'aria-labelledby': 'bm-hero-title',
  }, [
    flow ? el('div', { class: 'bm-hero-motion', 'aria-hidden': 'true' }, [flow.element]) : null,
    el('div', { class: 'bm-hero-copy' }, [
      el('h1', { class: 'bm-hero-title', id: 'bm-hero-title' }, [createWordmark({ size: 'xl' })]),
      el('p', { class: 'bm-hero-tagline' }, dual(BRAND.tagline.en, BRAND.tagline.ja)),
      // English on both sides: it is the product's one-line definition, and
      // the Japanese reader is shown it as the name's gloss.
      el('p', { class: 'bm-hero-definition', lang: 'en', text: BRAND.description }),
      el('a', { class: 'bm-cta', href: MODELS_ROUTE }, [
        ...dual('See the models', 'モデルを見る'),
        el('span', { class: 'bm-cta-arrow', 'aria-hidden': 'true', text: '→' }),
      ]),
    ]),
  ].filter(Boolean));

  const element = el('main', { class: 'bm-landing' }, [
    createShellHeader({
      current: 'home',
      accountButton,
      languageToggle: languageToggle.element,
      models,
    }),
    hero,
    el('section', { class: 'bm-section bm-models', 'aria-labelledby': 'bm-models-title' }, [
      el('header', { class: 'bm-section-head' }, [
        el('h2', { class: 'bm-section-title', id: 'bm-models-title' }, dual('Disease models', '病態モデル')),
        diseaseModels.length > 1
          ? el('a', { class: 'bm-section-link', href: MODELS_ROUTE }, dual('All models →', 'すべてのモデル →'))
          : null,
      ]),
      diseaseModels.length
        ? el('div', { class: `bm-model-list${diseaseModels.length === 1 ? ' is-single' : ''}` },
            diseaseModels.map((scene, index) => createModelCard(scene, { headingLevel: 3, feature: index === 0 })))
        : el('p', { class: 'bm-empty', role: 'status' }, dual(
            'Disease models will appear here as they are published.',
            '公開した病態モデルから、ここに表示します。'
          )),
      anatomyModels.length ? anatomyLine(anatomyModels) : null,
    ]),
    el('section', { class: 'bm-section bm-concept', 'aria-labelledby': 'bm-concept-title' }, [
      el('h2', { class: 'bm-concept-title', id: 'bm-concept-title' }, dual(
        'Disease does not stand still.',
        '病態は、静止していない。'
      )),
      el('div', { class: 'bm-concept-body' }, [
        el('p', {}, dual(
          'A condition changes, the body responds, and an intervention changes it again. In BYOKI MOTION you move that chain of cause and effect yourself.',
          '状態が変わり、身体が反応し、介入によってさらに変化する。BYOKI MOTIONでは、その因果関係を自分で動かして理解します。'
        )),
        el('ol', { class: 'bm-loop', 'aria-label': inLanguage('How a model is used', 'モデルの使い方') },
          [
            ['Look', '見る'],
            ['Move', '動かす'],
            ['The state changes', '状態が変わる'],
            ['See why', 'なぜ変わったかが分かる'],
          ].map(([en, ja], index) =>
            el('li', { class: `bm-loop-step${index === 2 ? ' is-change' : ''}` }, dual(en, ja))
          )),
      ]),
    ]),
    audienceSection(patientScenes),
    createSiteFooter(),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  // Sized to the hero once the hero has a size.
  if (flow) {
    flow.attach(hero);
  }
  document.title = pageTitle();

  return {
    element,
    destroy() {
      flow?.destroy();
      languageToggle.element.remove();
      element.remove();
    },
  };
}

/**
 * The disease models the manifest opens, as catalogue entries, in its order.
 * Under the preview unlock: every disease model in the catalogue.
 *
 * @param {ReadonlyArray<import('../catalog/publicManifest.js').PublicModel>} models
 */
function diseaseModelScenes(models) {
  if (safeUnlocked()) return pathologyModelScenes(SCENES);
  return pathologyModelScenes(models.map((model) => sceneById(model.sceneId)).filter(Boolean));
}

/**
 * The anatomy, as one line under the models: it is there when a model needs
 * it, and it is not what the page is about.
 *
 * @param {ReadonlyArray<object>} anatomyModels
 */
function anatomyLine(anatomyModels) {
  return el('nav', { class: 'bm-anatomy-line', 'aria-label': inLanguage('Anatomy', '解剖') }, [
    el('span', { class: 'bm-anatomy-lead' }, dual('Check the anatomy', '解剖を確認する')),
    el('span', { class: 'bm-anatomy-organs' }, anatomyModels.map((model) =>
      el('a', { class: 'bm-anatomy-link', href: model.route }, dual(model.organLabel, model.organLabelJa))
    )),
  ]);
}

/**
 * Medical | Patient, said in two short columns.
 *
 * The switch itself is in the header, and only where a model offers the
 * patient side — which, on the released product, none yet does: a patient
 * explanation opens only after the model's current medical review
 * (`patientPurpose.js`). So this says that, rather than describing a switch
 * the reader cannot find.
 *
 * @param {ReadonlyArray<object>} patientScenes
 */
function audienceSection(patientScenes) {
  const offered = patientScenes.length > 0;
  return el('section', { class: 'bm-section bm-audience', 'aria-labelledby': 'bm-audience-title' }, [
    el('h2', { class: 'bm-section-title', id: 'bm-audience-title' }, dual('One model, two readers', 'ひとつのモデル、ふたつの読み手')),
    el('div', { class: 'bm-audience-columns' }, [
      el('div', { class: 'bm-audience-column is-medical' }, [
        el('h3', { class: 'bm-audience-name' }, dual('Medical', '医療者向け')),
        el('p', {}, dual(
          'The mechanism in clinical terms — preload, afterload, SVR — with the figures the model computes and where its numbers came from.',
          '前負荷・後負荷・SVR といった用語と、モデルが計算した数値、その出どころまで。機序を、医学の言葉で。'
        )),
      ]),
      el('div', { class: 'bm-audience-column is-patient' }, [
        el('h3', { class: 'bm-audience-name' }, dual('Patient', '患者向け')),
        el('p', {}, dual(
          'The same model and the same motion, told in plain words: what happens in the body, and what it means.',
          '同じモデル、同じ動きを、平易な言葉で。からだの中で何が起きて、それが何を意味するのか。'
        )),
        offered
          ? null
          : el('p', { class: 'bm-audience-note' }, dual(
              'Patient explanations open model by model, after each has passed a current medical review.',
              '患者向けの説明は、医学レビューを終えたモデルから順に公開します。'
            )),
      ]),
    ]),
  ]);
}

/** The hero's field, or nothing where a canvas cannot be made (tests, old browsers). */
function safeFlowField() {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    let field = null;
    return {
      element: el('div', { class: 'bm-hero-motion-slot' }),
      attach(host) {
        field = createLandingFlowField({ host });
        this.element.replaceChildren(field.element);
        // The hero is in the document now; measure it after its first layout.
        globalThis.requestAnimationFrame?.(() => field?.resize?.());
      },
      destroy() {
        field?.destroy();
      },
    };
  } catch {
    return null;
  }
}

/** `node --test` has no `window`; the safe answers are "not unlocked" and "none". */
function safeUnlocked() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}

function safePatientScenes() {
  try {
    return patientExplanationScenes();
  } catch {
    return [];
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
