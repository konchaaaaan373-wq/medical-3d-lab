import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import {
  ABOUT_ROUTE,
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LANDING_ROUTE,
  MODELS_ROUTE,
  PATIENT_ROUTE,
  organById,
  sceneById,
} from '../catalog/index.js';
import { BRAND } from '../data/brand.js';
import { PURPOSE, PURPOSES, purposeById } from '../app/purpose.js';
import { PUBLIC_MANIFEST, layerOfScene } from '../catalog/publicManifest.js';
import { activeUsesForSceneEntry } from '../access/sceneUses.js';
import { readSceneLibrary, toggleSceneFavorite } from '../app/sceneLibrary.js';
import { resolveRoute } from '../app/router.js';
import { registerHeaderDock } from '../app/headerDock.js';
import { organLayerNavigation } from '../app/modelNavigation.js';
import {
  compactSceneLabel,
  navigationKindGroups,
  navigationUseLabel,
  scenesByOrganForNavigation,
} from '../app/sceneNavigationModel.js';
import { createSiteHeaderMenu } from './SiteMenu.js';
import { brandMark, purposeDestinations } from './ShellHeader.js';
import { createWordmark } from './Wordmark.js';

/**
 * The hash this document is actually showing.
 *
 * Guarded the way `FeedbackPanel` guards the same read: `node --test` has no
 * `window`, and a component that throws in that environment cannot be unit
 * tested at all. In a browser this is always `window.location.hash`; the
 * fallback only exists for the test runner, and `resolveRoute('')` reads as
 * the landing page — never `'scene'` — so it fails the current-scene checks
 * below safely rather than by accident.
 */
const currentHash = () => (typeof window === 'undefined' ? '' : (window.location?.hash ?? ''));

/**
 * The header on a 3D model.
 *
 * ## Its structure, left to right
 *
 * | zone | what | why there |
 * | --- | --- | --- |
 * | who | the mark and the BYOKI MOTION wordmark | the way home; the same name as every other screen |
 * | where | on an anatomy model: organs, then the organ's layers. On a disease model: Models · About | anatomy is navigated by organ; a disease model is not |
 * | you | language, account | in the row when it is wide, in the menu when it is not |
 * | menu | ☰ | everything else the site has, in layers |
 *
 * The same zones, in the same order, as `ShellHeader` on the reading surfaces.
 * Only the middle changes between them, because only the middle is about the
 * screen you are on.
 *
 * ## Organ, then layer
 *
 * The row used to carry one chip per published model, named by its organ —
 * until the heart had two, when both fell back to their titles and the row
 * read `脳 / 触れて学ぶ心臓の解剖 / 心拍出量 / 肺 / 肝臓`: organs and models on
 * one level, and on a phone the lungs and liver off the end of it. Now the row
 * is organs, always one short word each, and the organ you are on opens a
 * second level beside it (below it, on a phone) naming its layers:
 * `解剖 · 機序 心拍出量`. `organLayerNavigation` owns that shape.
 *
 * `groups` is already projected by `sceneRegistry`, so this component never
 * widens the release boundary; the rows come from `PUBLIC_MANIFEST`, which can
 * only hold what the release opened.
 */
/**
 * @param {object} options
 * @param {ReadonlyArray<object>} options.groups
 * @param {string} options.currentId
 * @param {boolean} [options.showLab]
 * @param {ReadonlyArray<object>} [options.models]
 * @param {{available: boolean, onChange?: (purpose: string) => void}} [options.purpose]
 *   whether this model offers patient explanation beside medical education
 *   (`src/access/patientPurpose.js`). Only then does the header carry a purpose
 *   switch and say which purpose the location is in; a model with one purpose
 *   keeps the header it had.
 */
export function createSceneSwitcher({
  groups,
  currentId,
  showLab = true,
  models = PUBLIC_MANIFEST?.models ?? [],
  purpose = { available: false },
}) {
  const scenes = groups.flatMap((group) => group.scenes);
  if (!scenes.length) return null;
  const hasChoices = scenes.length > 1;

  const currentScene = scenes.find((scene) => scene.id === currentId) ?? scenes[0];
  const currentGroup =
    groups.find((group) => group.scenes.some((scene) => scene.id === currentScene.id)) ?? groups[0];
  const isLab = currentScene.status === 'prototype';
  const currentOrgan = organById(currentScene.organ);
  const currentShort = compactSceneLabel(currentScene);

  const ui = document.getElementById('ui');
  ui?.classList.add('has-global-scene-nav');

  const bilingual = (en, ja, className = '') =>
    el('span', { class: className }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja ?? en }),
    ]);

  // --------------------------------------------------------------- where

  const navigation = organLayerNavigation(models, currentScene.id);
  const onPublishedModel = Boolean(navigation.currentModel);
  /**
   * Whether this model is anatomy — named structures — rather than a disease
   * model. Only anatomy is navigated organ by organ (ADR 2026-09-30): a
   * reader on 心拍出量 is in a model about a circulation, and a row of
   * 脳 心臓 肺 肝臓 above it told them they were in an organ atlas. The disease
   * model reaches its organ's anatomy from its own title card instead
   * (「解剖を確認」).
   */
  const catalogueScene = sceneById(currentScene.id) ?? currentScene;
  const isAnatomy = (navigation.currentModel?.layer ?? layerOfScene(catalogueScene)) === 'anatomy';

  /**
   * The organs, as one press each.
   *
   * The organ chip is the organ, not a model: it goes to the organ's first
   * layer, which is its anatomy. So it says `aria-current="page"` only when
   * the organ has one model and this is it; when the organ has several, the
   * layer row names the page and the organ says `true` — "you are inside this
   * one" — which is what that value is for.
   */
  const organStrip = isAnatomy && onPublishedModel && navigation.organs.length > 1
    ? el(
        'div',
        {
          class: 'global-nav-strip',
          role: 'group',
          'aria-label': inLanguage('Organs', '臓器'),
        },
        navigation.organs.map((organ) => {
          const here = organ.current;
          const single = organ.models.length === 1;
          return el(
            'a',
            {
              class: `global-nav-strip-link${here ? ' is-current' : ''}`,
              href: organ.route,
              'data-organ': organ.organId,
              ...(here ? { 'aria-current': single ? 'page' : 'true' } : {}),
            },
            [
              el('span', { class: 'lang-en', text: organ.name.en }),
              el('span', { class: 'lang-ja', text: organ.name.ja }),
            ]
          );
        })
      )
    : null;

  /**
   * The layers of the organ on screen — only when there is a choice.
   *
   * One model, one layer, nothing to switch between: a lone chip reading 解剖
   * would be a control with no job, and the title card already says what the
   * model is. Two or more, and this is where the reader chooses between the
   * anatomy and what sits on it.
   */
  const layerModels = navigation.currentOrgan?.models ?? [];
  const layerRow = isAnatomy && onPublishedModel && layerModels.length > 1
    ? el(
        'div',
        {
          class: 'global-nav-layers',
          role: 'group',
          'aria-label': inLanguage(
            `${navigation.currentOrgan.name.en} models`,
            `${navigation.currentOrgan.name.ja}のモデル`
          ),
        },
        [
          // Whose layers these are, said in the row. Placed after the organs,
          // a bare `›` pointed at whichever organ came last — 「肝臓 › 解剖
          // 機序 心拍出量」 read as the liver's. Hidden from assistive tech,
          // which has the group's own name for the same thing.
          el('span', { class: 'global-nav-layers-owner', 'aria-hidden': 'true' }, [
            el('span', { class: 'lang-en', text: navigation.currentOrgan.name.en }),
            el('span', { class: 'lang-ja', text: navigation.currentOrgan.name.ja }),
          ]),
          ...layerModels.map((model) =>
          el(
            'a',
            {
              class: `global-nav-layer-link is-${model.layer}${model.current ? ' is-current' : ''}`,
              href: model.route,
              ...(model.current ? { 'aria-current': 'page' } : {}),
            },
            [
              model.showKind ? bilingual(model.kind.en, model.kind.ja, 'global-nav-layer-kind') : null,
              bilingual(model.name.en, model.name.ja, 'global-nav-layer-name'),
            ]
          )
          ),
        ]
      )
    : null;

  // Where the strip cannot mark anything — a prototype under the preview unlock
  // — a breadcrumb says where the reader is instead.
  const organEn = currentOrgan?.label ?? currentGroup.label;
  const organJa = currentOrgan?.labelJa ?? currentGroup.labelJa;
  const sceneEn = currentShort.en && currentShort.en !== organEn ? currentShort.en : '';
  const sceneJa = currentShort.ja && currentShort.ja !== organJa ? currentShort.ja : '';
  const breadcrumb = (parts, lang) => {
    const visible = parts.filter(Boolean);
    const children = [];
    visible.forEach((part, index) => {
      if (index) children.push(el('span', { class: 'global-nav-current-separator', 'aria-hidden': 'true', text: '›' }));
      children.push(el('span', { class: 'global-nav-current-part', text: part }));
    });
    return el('span', { class: `global-nav-current-label lang-${lang}` }, children);
  };
  // A disease model's header carries the product's own top level. Where it is
  // (病態モデル › 循環 › the model) is the title card's first line, beside the
  // model it names, rather than a second copy up here.
  // A model with two purposes keeps its purpose-rooted location (医学教育 › …
  // / 患者説明 › the question) — that is how the switch beside it says which
  // side the reader is on (F-226).
  const productNav = !isAnatomy && !purpose?.available
    ? el('div', { class: 'global-nav-product', role: 'group', 'aria-label': inLanguage('Product', 'サイト') }, [
        el('a', { class: 'global-nav-product-link', href: MODELS_ROUTE }, [bilingual('Models', 'モデル')]),
        el('a', { class: 'global-nav-product-link', href: ABOUT_ROUTE }, [bilingual('About', 'About')]),
      ])
    : null;
  const currentLocation = organStrip
    ?? productNav
    ?? el('div', { class: 'global-nav-current', 'aria-label': 'Current model / 現在のモデル' }, [
      breadcrumb([currentGroup.label, organEn, sceneEn], 'en'),
      breadcrumb([currentGroup.labelJa, organJa, sceneJa], 'ja'),
    ]);

  // ------------------------------------------------------------ purpose

  /**
   * Which purpose the location is in, and the switch between the two.
   *
   * Only on a model that offers both (`purpose.available`). There, the
   * location reads from the purpose down, the way the reader explores it:
   *
   * - 医学教育 › 循環器 › 心臓 › 心不全 — by system, organ and model; the root
   *   goes back to the model index.
   * - 患者説明 › <the question the explanation answers> — by question; the root
   *   goes back to the list of questions (`#/patient`).
   *
   * The switch beside it is two buttons that say which is on, not two links:
   * pressing one changes how *this* model is explained and keeps the model
   * and the viewpoint (`?purpose=`, `src/app/purpose.js`). Going to the other
   * list is what the root of the location is for.
   */
  const dualPurpose = Boolean(purpose?.available);
  const purposeLabel = (id) => {
    const entry = purposeById(id);
    return [el('span', { class: 'lang-en', text: entry.en }), el('span', { class: 'lang-ja', text: entry.ja })];
  };
  // Where each side's root goes is the reading header's rule, read rather than
  // restated: this said `#/` (or `#/organs` with the preview unlock) while the
  // reading header's 医療者向け said `#/models` — two links for one side.
  const purposeRoute = (id) => purposeDestinations().find((item) => item.id === id)?.route ?? PATIENT_ROUTE;
  const purposeRootLink = (id) =>
    el(
      'a',
      {
        class: `global-nav-purpose-root is-${id}`,
        href: purposeRoute(id),
      },
      purposeLabel(id)
    );
  const separator = () => el('span', { class: 'global-nav-current-separator', 'aria-hidden': 'true', text: '›' });

  // Education: the root goes before whatever the location already was. The
  // organ strip is itself the education side's way of exploring, so it keeps
  // its row; the breadcrumb gains the purpose it is in.
  const educationRoot = dualPurpose && !organStrip
    ? el('span', { class: 'global-nav-purpose-trail is-education' }, [purposeRootLink(PURPOSE.EDUCATION), separator()])
    : null;
  if (educationRoot) currentLocation.prepend(educationRoot);

  const questionEn = el('span', { class: 'global-nav-current-part lang-en' });
  const questionJa = el('span', { class: 'global-nav-current-part lang-ja' });
  const patientLocation = dualPurpose
    ? el(
        'div',
        {
          class: 'global-nav-current is-patient',
          'aria-label': inLanguage('Current explanation', '現在の説明'),
          hidden: '',
        },
        [
          purposeRootLink(PURPOSE.PATIENT),
          separator(),
          el('span', { class: 'global-nav-current-label global-nav-question', 'aria-current': 'page' }, [
            questionEn,
            questionJa,
          ]),
        ]
      )
    : null;

  const purposeButtons = new Map();
  const purposeSwitch = dualPurpose
    ? el(
        'div',
        {
          class: 'global-nav-purpose',
          role: 'group',
          'aria-label': inLanguage('Purpose', '目的'),
        },
        PURPOSES.map((entry) => {
          // Named for the reader — Medical | Patient — rather than for the use;
          // the location beside it still says 医学教育 / 患者説明.
          const button = el(
            'button',
            {
              class: `global-nav-purpose-option is-${entry.id}`,
              type: 'button',
              'aria-pressed': 'false',
              dataset: { purpose: entry.id },
              on: { click: () => purpose.onChange?.(entry.id) },
            },
            [el('span', { class: 'lang-en', text: entry.audience.en }), el('span', { class: 'lang-ja', text: entry.audience.ja })]
          );
          purposeButtons.set(entry.id, button);
          return button;
        })
      )
    : null;

  /**
   * Show the location for `current`, and press its button.
   *
   * `question` is the patient explanation's own title, which arrives with the
   * guide index after the header is built; until it does, the model's title
   * stands in for it rather than an empty crumb.
   *
   * @param {{current: string, question?: {en?: string, ja?: string}|null}} state
   */
  function setPurpose({ current, question = null }) {
    if (!dualPurpose) return;
    const patient = current === PURPOSE.PATIENT;
    for (const [id, button] of purposeButtons) {
      const on = id === current;
      button.setAttribute('aria-pressed', String(on));
      button.classList.toggle('is-current', on);
    }
    questionEn.textContent = question?.en || currentScene.label || currentScene.titleEn || '';
    questionJa.textContent = question?.ja || currentScene.labelJa || currentScene.titleJa || '';
    patientLocation.hidden = !patient;
    currentLocation.hidden = patient;
    if (layerRow) layerRow.hidden = patient;
    element.classList.toggle('is-purpose-patient', patient);
    element.classList.toggle('is-purpose-education', !patient);
    ui?.classList.toggle('has-layer-row', Boolean(layerRow) && !patient);
  }

  /**
   * Whether the row already reaches every model this document can open.
   *
   * In the beta it does, and then a model list in the menu is the "second door
   * onto the same room" the old `モデル ⌄` drawer was — beside a row of the
   * same organs under the same names. Under the preview unlock `scenes` is the
   * whole catalogue and this is false, so the menu carries it.
   */
  const reachableByRow = new Set(
    organStrip || layerRow
      ? navigation.organs.flatMap((organ) => organ.models.map((model) => model.sceneId))
      : []
  );
  const rowIsTheCatalogue = reachableByRow.size > 0 && scenes.every((scene) => reachableByRow.has(scene.id));

  // --------------------------------------------------------- the catalogue

  const favoriteButton = el('button', {
    class: 'global-nav-favorite',
    type: 'button',
    'aria-pressed': 'false',
    // Toggling a favourite changes the list in this menu; closing on it would
    // hide the change it just made.
    'data-menu-keep-open': '',
  });

  const favoriteList = el('div', { class: 'global-nav-favorite-list' });
  const favoriteSection = el('section', { class: 'global-nav-favorites', hidden: '' }, [
    el('h3', { class: 'global-nav-favorites-title' }, [bilingual('Favorites', 'お気に入り')]),
    favoriteList,
  ]);

  /**
   * How many reachable models can be listed flat before the list stops being a
   * shortcut and becomes a second catalogue (F-111). Past it the accordion is
   * the better shape and this section takes itself away. A preview build is
   * over the line by an order of magnitude and never sees it.
   */
  const FLAT_MODEL_LIST_MAX = 16;

  const sceneLink = (scene) => {
    const isCurrent = scene.id === currentScene.id;
    const use = navigationUseLabel(scene, activeUsesForSceneEntry(scene));
    return el(
      'a',
      {
        class: `global-nav-scene${isCurrent ? ' is-current' : ''}`,
        href: `#/${scene.slug ?? scene.id}`,
        'aria-current': isCurrent ? 'page' : null,
      },
      [
        el('span', { class: 'global-nav-scene-copy' }, [
          bilingual(scene.label, scene.labelJa, 'global-nav-scene-name'),
          bilingual(use.en, use.ja, 'global-nav-scene-meta'),
        ]),
        isCurrent
          ? el('span', { class: 'global-nav-current-check', 'aria-hidden': 'true', text: '✓' })
          : null,
      ]
    );
  };

  // Every model the menu can reach, flat, above the accordion. `scenes` is
  // already projected by `sceneRegistry`, so this widens nothing.
  const flatModels = scenes.length > 1 && scenes.length <= FLAT_MODEL_LIST_MAX ? scenes : [];
  const modelSection = el(
    'section',
    { class: 'global-nav-models', ...(flatModels.length ? {} : { hidden: '' }) },
    [
      el('h3', { class: 'global-nav-models-title' }, [bilingual('All models', 'すべてのモデル')]),
      el('div', { class: 'global-nav-model-list' }, flatModels.map((scene) => sceneLink(scene))),
    ]
  );

  const kindGroup = (kind) =>
    el('div', { class: `global-nav-kind-group is-${kind.id}` }, [
      el('h5', { class: 'global-nav-kind-heading' }, [bilingual(kind.label, kind.labelJa)]),
      ...kind.scenes.map((scene) => sceneLink(scene)),
    ]);

  const organSection = (organ) =>
    el(
      'section',
      { class: `global-nav-organ${organ.id === currentScene.organ ? ' is-current' : ''}` },
      [
        el('h4', { class: 'global-nav-organ-name' }, [bilingual(organ.label, organ.labelJa)]),
        el('div', { class: 'global-nav-scenes' }, navigationKindGroups(organ).map(kindGroup)),
      ]
    );

  // The menu's own section heading is an h2, so the accordion's systems are the
  // level below it, then organs, then kinds.
  const systemDetails = [];
  const systemSection = (group) => {
    const organs = scenesByOrganForNavigation(group.scenes, organById);
    const isCurrent = group.id === currentGroup.id;
    const details = el('details', {
      class: `global-nav-system-section${isCurrent ? ' is-current' : ''}`,
      ...(isCurrent ? { open: '' } : {}),
    }, [
      el('summary', { class: 'global-nav-system-summary' }, [
        el('span', {
          class: 'global-nav-system-heading',
          role: 'heading',
          'aria-level': '3',
        }, [bilingual(group.label, group.labelJa)]),
        el('span', { class: 'global-nav-system-chevron', 'aria-hidden': 'true', text: '⌄' }),
      ]),
      el('div', { class: 'global-nav-system-organs' }, organs.map(organSection)),
    ]);
    systemDetails.push(details);
    return details;
  };

  const list = el('div', { class: 'global-nav-list' }, [modelSection, ...groups.map(systemSection)]);

  // The index this scene lives under, and the other one. Reached only with the
  // preview unlock: in the beta `#/organs` is the landing page and the lab is
  // closed, so neither is a destination and the catalogue is not rendered.
  //
  // The first link names the tab this scene already lives under: `isLab` (the
  // scene's own status, not a guess at the URL) is the split that decides
  // "Lab index" or "Model index", so `aria-current="page"` on it is that
  // declaration read back to assistive tech.
  const primaryFooterHref = isLab ? LAB_ROUTE : EXPLORER_ROUTE;
  const primaryFooterLink = el(
    'a',
    { class: 'global-nav-footer-link', href: primaryFooterHref },
    [bilingual(isLab ? 'Lab index' : 'Model index', isLab ? '実験モデル一覧' : 'モデル一覧')]
  );
  const footerLinks = [primaryFooterLink];
  if (showLab) {
    footerLinks.push(
      el('a', {
        class: 'global-nav-footer-link is-secondary',
        href: isLab ? EXPLORER_ROUTE : LAB_ROUTE,
      }, [
        bilingual(isLab ? 'Public models' : 'Experimental Lab', isLab ? '公開モデル' : '実験モデル'),
      ])
    );
  }
  const footer = el('nav', {
    class: 'global-nav-footer',
    'aria-label': 'Model lists / モデル一覧',
  }, footerLinks);

  /**
   * Keep the footer's tab claim honest.
   *
   * `resolveRoute` — not a string check on the hash — confirms this document is
   * still a scene page before the footer link claims to be the current tab;
   * `#/organs` and its `#/explore` alias resolve to the same kind. Re-run on
   * `hashchange` rather than once at mount: this component outlives a hash
   * change that does not reload the document (`?structure=1` to
   * `?structure=2` is the same route on purpose — see `sameRoute`), so a stale
   * `aria-current` would otherwise survive it.
   */
  function updateFooterCurrent() {
    const onScenePage = resolveRoute(currentHash()).kind === 'scene';
    if (onScenePage) primaryFooterLink.setAttribute('aria-current', 'page');
    else primaryFooterLink.removeAttribute('aria-current');
  }
  updateFooterCurrent();
  // Guarded on the method, not only on `window` existing: `beta-release.test.js`
  // walks every surface's rendered links against a `window` stubbed down to
  // just `matchMedia`.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', updateFooterCurrent);
  }

  const catalogue = rowIsTheCatalogue
    ? null
    : [
        el('div', { class: 'global-nav-catalogue-head' }, [
          el('p', { class: 'global-nav-panel-intro' }, [bilingual(
            'Choose a body system, then an organ and model.',
            '身体の系統を選び、臓器・モデルへ進みます。'
          )]),
          favoriteButton,
        ]),
        favoriteSection,
        list,
        footer,
      ];

  // --------------------------------------------------------------- the menu

  // No page links: the publication record left the menu with the header's
  // link to it (2026-09-27). The catalogue's own footer keeps the gated indexes
  // for the preview unlock.
  const header = createSiteHeaderMenu({
    id: 'scene-navigation-panel',
    models: catalogue,
  });
  const { menu } = header;

  // ---------------------------------------------------------------- who

  // The way home: the mark and the wordmark (ADR 2026-09-30). It was the icon
  // alone (owner's decision, 2026-09-27, replacing `← M/3 Medical 3D Lab |
  // ホーム`); the name came back because BYOKI MOTION is a word a reader has
  // to learn, and the model screen is where most of them arrive. On a phone
  // with an organ row the name gives its room back and the mark stays. The
  // link's accessible name and tooltip say where it goes, destination first.
  const brand = el(
    'a',
    {
      class: 'global-nav-brand',
      href: LANDING_ROUTE,
      title: inLanguage(`Home — ${BRAND.name}`, `トップへ戻る — ${BRAND.name}`),
      'aria-label': inLanguage(`Home — ${BRAND.name}`, `トップへ戻る — ${BRAND.name}`),
    },
    [brandMark('global-nav-brand-mark'), createWordmark({ size: 'sm', className: 'global-nav-brand-name' })]
  );

  const element = el(
    'nav',
    {
      class:
        `global-scene-nav has-site-menu${isLab ? ' is-lab' : ' is-public'}${hasChoices ? '' : ' is-single'}` +
        (organStrip ? ' has-model-strip' : '') +
        (layerRow ? ' has-layer-row' : '') +
        (dualPurpose ? ' has-purpose' : '') +
        (isAnatomy ? ' is-anatomy' : ' is-disease-model'),
      // Names the landmark, rather than repeating the brand.
      'aria-label': inLanguage('Site navigation', 'サイトナビゲーション'),
    },
    [
      brand,
      currentLocation,
      patientLocation,
      layerRow,
      purposeSwitch,
      header.utilities,
      menu.trigger,
      menu.backdrop,
      menu.panel,
    ]
  );
  // A header with a second row is taller on a phone, and the panels below it
  // start where it ends — `#ui` reads the class to reserve the room.
  ui?.classList.toggle('has-layer-row', Boolean(layerRow));
  if (dualPurpose) setPurpose({ current: PURPOSE.EDUCATION });

  registerHeaderDock(element, { dock: header.dock });

  // One body system is open at a time on every viewport. This keeps a fourteen-
  // system catalogue scannable, and the current system starts open.
  for (const details of systemDetails) {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      for (const other of systemDetails) {
        if (other !== details) other.open = false;
      }
    });
  }

  function renderLibrary(library = readSceneLibrary()) {
    const saved = library.favorites
      .map((id) => scenes.find((scene) => scene.id === id))
      .filter(Boolean);
    const currentSaved = library.favorites.includes(currentScene.id);

    favoriteButton.textContent = currentSaved ? '★' : '☆';
    favoriteButton.setAttribute('aria-pressed', String(currentSaved));
    favoriteButton.setAttribute(
      'aria-label',
      currentSaved
        ? 'Remove current model from favorites / お気に入りから外す'
        : 'Add current model to favorites / お気に入りに追加'
    );
    favoriteButton.title = currentSaved
      ? 'Remove from favorites / お気に入りから外す'
      : 'Add to favorites / お気に入りに追加';

    favoriteList.replaceChildren(
      ...saved.map((scene) =>
        el('a', { class: 'global-nav-favorite-link', href: `#/${scene.slug ?? scene.id}` }, [
          el('span', { class: 'global-nav-favorite-star', 'aria-hidden': 'true', text: '★' }),
          bilingual(scene.label, scene.labelJa, 'global-nav-favorite-name'),
        ])
      )
    );
    favoriteSection.hidden = saved.length === 0;
  }

  favoriteButton.addEventListener('click', () => {
    renderLibrary(toggleSceneFavorite(currentScene.id));
  });

  // Opening the menu opens the body system you are in, and shows your row.
  menu.onToggle((open) => {
    if (!open) return;
    const currentSystem = systemDetails.find((details) => details.classList.contains('is-current'));
    if (currentSystem && !systemDetails.some((details) => details.open)) currentSystem.open = true;
    requestAnimationFrame(() => {
      menu.panel.querySelector('.global-nav-scene.is-current')?.scrollIntoView?.({ block: 'nearest' });
    });
  });

  // Native navigation controls own their keyboard events rather than leaking to
  // the model's global Space/Escape/letter shortcuts.
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.isOpen) {
      event.preventDefault();
      menu.close({ restoreFocus: true });
    }
    event.stopPropagation();
  });

  renderLibrary();

  /**
   * Open the strip showing where you are.
   *
   * The row can be wider than the header on a narrow phone, and the current
   * organ is not always first in it. `scrollLeft` rather than `scrollIntoView`:
   * the latter is free to scroll every scrollable ancestor, and the nearest one
   * here is the page.
   */
  function centreCurrentChip() {
    if (!organStrip) return;
    const here = organStrip.querySelector('.global-nav-strip-link.is-current');
    if (!here || typeof organStrip.scrollLeft !== 'number') return;
    const centred = here.offsetLeft - (organStrip.clientWidth - here.offsetWidth) / 2;
    organStrip.scrollLeft = Math.max(0, centred);
  }
  if (organStrip && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(centreCurrentChip);
  }

  return {
    element,
    menu,
    /** Put a site control (language, account, feedback) in this header. */
    dock: header.dock,
    /** Say which purpose the location is in (a no-op on a one-purpose model). */
    setPurpose,
    close: () => menu.close(),
  };
}
