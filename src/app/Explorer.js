import { el, skipLink } from '../utils/dom.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createExplorerSearchControls } from '../components/ExplorerSearchControls.js';
import { createClinicalReviewDetails } from '../components/ClinicalReviewDetails.js';
import { shellNavAnchors } from '../components/ShellNav.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { hasOrganPreview, mountOrganPreview } from './organPreview.js';
import '../styles/clinical-review.css';
import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LAB_SCENES,
  PUBLIC_SCENES,
  organById,
  sceneById,
  sceneRoute,
  statusById,
  systemsWithOrgans,
} from '../catalog/index.js';
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { createPublicModelsExplorer } from './Landing.js';
import { RELEASED_SCENES, isSceneReleased } from '../catalog/release.js';
import { betaUnlocked } from './releaseGate.js';
import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { activeUsesForScene, productBadgesForScene } from '../access/features.js';
import { readSceneLibrary, toggleSceneFavorite } from './sceneLibrary.js';
import {
  emptyOrganMatchesExplorerFilters,
  plannedMatchesExplorerFilters,
  sceneMatchesExplorerFilters,
} from './explorerSearch.js';

/**
 * Catalogue surface shared by the public Organ Explorer and Experimental Lab.
 *
 * Both are projections of the same scene manifest. Public excludes Prototype;
 * Lab includes Prototype (and the declared backlog) explicitly. Public organ
 * previews lazy-load only the reusable overview geometry near the viewport;
 * the catalogue itself stays complete without WebGL.
 *
 * Favorites and recents store scene IDs only — never model controls, patient
 * information, account state or clinical data.
 *
 * Model/product maturity and clinical-review attestation are intentionally two
 * separate trust axes. The former comes from the scene manifest; the latter is
 * read from docs/clinical-reviews/registry.json through clinicalReview.js.
 *
 * @param {{ui:HTMLElement, accountButton?:HTMLElement, scope?:'public'|'lab'}} mounts
 */
export function createExplorer({
  ui,
  accountButton = null,
  scope = 'public',
  publicManifest = PUBLIC_MANIFEST,
} = {}) {
  const isLab = scope === 'lab';
  const beta = !isLab && !betaUnlocked();
  if (beta) {
    return createPublicModelsExplorer({
      ui,
      accountButton,
      manifest: publicManifest,
    });
  }
  // During the beta the public catalogue is what the release opens, and nothing
  // else. It used to be the *whole* catalogue with the unopened models listed
  // as "to be updated", so that the roadmap stayed visible — but the roadmap
  // then outnumbered the product twenty-six to one, and an index that is mostly
  // things you cannot have is not an index. The unopened work keeps being
  // built, stays in the repository, and is visible to a developer through the
  // preview unlock; `#/trust` still lists every model's review state, opened or
  // not. `PUBLIC_SCENES` keeps its own meaning for when the beta ends.
  const scopedScenes = isLab ? LAB_SCENES : beta ? RELEASED_SCENES : PUBLIC_SCENES;
  // Favourites and recents are shortcuts, so they only ever hold models this
  // reader can open. A model the release is holding back would be a link into
  // the "to be updated" page, offered as if it were somewhere they had been.
  // In the public scope that is already true of `scopedScenes`; the check stays
  // because Lab is scoped by status rather than by the release.
  const scopedIds = new Set(
    scopedScenes.filter((scene) => isLab || isSceneReleased(scene)).map((scene) => scene.id)
  );
  const systems = systemsWithOrgans(scopedScenes, {
    includePlanned: isLab,
    includeEmptyOrgans: false,
  });
  const organViews = [];
  const systemViews = new Map();
  const jumpLinks = new Map();
  const favoriteButtons = new Map();
  const previewMounts = [];
  const previewCleanups = [];

  const bilingual = (en, ja, className = '') =>
    el('span', { class: className }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja }),
    ]);

  const badge = (statusId) => {
    const status = statusById(statusId);
    if (!status?.badge) return null;
    return el('span', { class: `status-badge is-${statusId}`, title: status.note }, [
      el('span', { class: 'lang-en', text: status.label }),
      el('span', { class: 'lang-ja', text: status.labelJa }),
    ]);
  };

  const reviewBadge = (scene) => {
    if (isLab) return null;
    const review = clinicalReviewPresentation(scene);
    return el(
      'span',
      {
        class: `status-badge clinical-review-badge is-${review.status}`,
        title: 'Clinical-review attestation is tracked separately from model maturity.',
      },
      [
        el('span', { class: 'lang-en', text: review.en }),
        el('span', { class: 'lang-ja', text: review.ja }),
      ]
    );
  };

  const productBadges = (scene) =>
    el(
      'span',
      { class: 'explorer-access', 'aria-label': 'Available product modes' },
      productBadgesForScene(scene).map((entry) => {
        const labelEn = entry.kind === 'paid' ? `${entry.label} (paid)` : 'Core model (free)';
        const labelJa = entry.kind === 'paid' ? `${entry.labelJa}（有料）` : '基本モデル（無料）';
        return el('span', { class: `explorer-access-badge is-${entry.kind}` }, [
          el('span', { class: 'lang-en', text: labelEn }),
          el('span', { class: 'lang-ja', text: labelJa }),
        ]);
      })
    );

  const useLabels = Object.freeze({
    patient: ['Patient explanation', '患者説明'],
    education: ['Medical education', '医学教育'],
    'clinical-learning': ['Clinical case learning', '臨床ケース学習'],
  });

  // Only uses a reader may act on today. A declared-but-gated patient use is
  // explained once, in the three-uses section, never printed on a card.
  const useBadges = (scene) =>
    el(
      'span',
      { class: 'explorer-use-badges', 'aria-label': 'Available uses / 利用できる用途' },
      activeUsesForScene(scene).map((id) => {
        const labels = useLabels[id];
        return labels
          ? el('span', { class: `explorer-use-badge is-${id}` }, [
              el('span', { class: 'lang-en', text: labels[0] }),
              el('span', { class: 'lang-ja', text: labels[1] }),
            ])
          : null;
      }).filter(Boolean)
    );

  function favoriteButtonFor(scene) {
    const button = el('button', {
      class: 'explorer-favorite-toggle',
      type: 'button',
      'aria-pressed': 'false',
      on: {
        click: (event) => {
          event.preventDefault();
          event.stopPropagation();
          syncLibrary(toggleSceneFavorite(scene.id));
        },
      },
    });
    if (!favoriteButtons.has(scene.id)) favoriteButtons.set(scene.id, new Set());
    favoriteButtons.get(scene.id).add(button);
    return button;
  }

  /**
   * One model in the catalogue.
   *
   * Every card here is openable. During the beta the public scope is the
   * released set, and Lab's scope is the prototypes it exists to hold, so
   * there is no third state for this to render.
   *
   * There used to be one: a model the release had not opened kept its card as
   * a `span` rather than an anchor, so that the catalogue still said what was
   * being built. That was the roadmap-in-the-index design, and it went with
   * the anatomy beta — twenty-six dashed cards ahead of one real one is not an
   * index. `#/trust` still lists every model's review state, opened or not.
   */
  const sceneCard = (scene, system, organ) => {
    const body = [
      el('span', { class: 'explorer-scene-kicker' }, [
        bilingual(
          scene.disease ? 'Pathophysiology' : 'Anatomy & physiology',
          scene.disease ? '病態モデル' : '解剖・生理',
          'explorer-scene-kind'
        ),
        badge(scene.status),
      ]),
      el('span', { class: 'explorer-scene-title' }, [
        el('span', { class: 'lang-en', text: scene.titleEn }),
        el('span', { class: 'lang-ja', text: scene.titleJa }),
      ]),
      scene.storyTitleEn
        ? bilingual(scene.storyTitleEn, scene.storyTitleJa, 'explorer-scene-story')
        : null,
      el('span', { class: 'explorer-scene-note' }, [
        el('span', { class: 'lang-en', text: scene.description }),
        el('span', { class: 'lang-ja', text: scene.descriptionJa }),
      ]),
      el('span', { class: 'explorer-scene-footer' }, [
        useBadges(scene),
        bilingual('Open model', 'モデルを開く', 'explorer-scene-open'),
      ]),
      el('span', { class: 'explorer-scene-trust' }, [productBadges(scene), reviewBadge(scene)]),
    ].filter(Boolean);

    const card = el('a', { class: 'explorer-scene', href: sceneRoute(scene) }, body);
    const children = [card, favoriteButtonFor(scene)];
    if (!isLab) children.push(createClinicalReviewDetails(scene));
    const element = el('div', { class: 'explorer-scene-shell' }, children);
    return { scene, system, organ, element };
  };

  /** Declared but not built: visible only in Lab, never as a public model. */
  const plannedCard = (planned, system, organ) => {
    const element = el('span', { class: 'explorer-scene is-planned' }, [
      el('span', { class: 'explorer-scene-title' }, [
        el('span', { class: 'lang-en', text: planned.titleEn }),
        el('span', { class: 'lang-ja', text: planned.titleJa }),
        el('span', { class: 'status-badge is-planned' }, [
          el('span', { class: 'lang-en', text: 'Planned' }),
          el('span', { class: 'lang-ja', text: '予定' }),
        ]),
      ]),
    ]);
    return { planned, system, organ, element };
  };

  const organRow = (organ, system) => {
    const scenes = organ.scenes.map((scene) => sceneCard(scene, system, organ));
    const planned = organ.planned.map((entry) => plannedCard(entry, system, organ));
    const empty =
      scenes.length === 0 && planned.length === 0
        ? {
            system,
            organ,
            element: el('span', { class: 'explorer-scene is-planned' }, [
              el('span', { class: 'explorer-scene-title' }, [
                el('span', { class: 'lang-en', text: 'No scene yet' }),
                el('span', { class: 'lang-ja', text: 'シーン未実装' }),
              ]),
            ]),
          }
        : null;

    const preview = !isLab && hasOrganPreview(organ.id)
      ? el('div', {
          class: `explorer-organ-preview is-${organ.id}`,
          'aria-hidden': 'true',
          'data-organ': organ.id,
        }, [el('span', { class: 'explorer-preview-placeholder', text: organ.labelJa })])
      : null;
    if (preview) previewMounts.push({ element: preview, organId: organ.id });

    const diseaseCount = organ.scenes.filter((scene) => scene.disease).length;
    const element = el('div', { class: `explorer-organ${organ.scenes.length ? '' : ' is-empty'}` }, [
      el('div', { class: 'explorer-organ-identity' }, [
        el('div', { class: 'explorer-organ-heading' }, [
          el('h3', { class: 'explorer-organ-name' }, [
            el('span', { class: 'lang-ja', text: organ.labelJa }),
            el('span', { class: 'lang-en', text: organ.label }),
          ]),
          diseaseCount
            ? bilingual(
                `${diseaseCount} pathophysiology model${diseaseCount === 1 ? '' : 's'}`,
                `病態モデル ${diseaseCount}件`,
                'explorer-organ-model-count'
              )
            : null,
        ]),
        preview,
        preview ? previewCaption() : null,
      ]),
      el('div', { class: 'explorer-scenes' }, [
        ...scenes.map((record) => record.element),
        ...planned.map((record) => record.element),
        empty?.element,
      ]),
    ]);

    const view = { system, organ, element, scenes, planned, empty };
    organViews.push(view);
    return view;
  };

  const systemSection = (system) => {
    const organs = system.organs.map((organ) => organRow(organ, system));
    const count = el('span', { class: 'explorer-count', text: String(system.scenes.length) });
    const element = el('section', { class: 'explorer-system', id: `system-${system.id}` }, [
      el('h2', { class: 'explorer-system-name' }, [
        el('span', { class: 'lang-en', text: system.label }),
        el('span', { class: 'lang-ja', text: system.labelJa }),
        count,
      ]),
      ...organs.map((view) => view.element),
    ]);
    systemViews.set(system.id, { system, organs, element, count });
    return element;
  };

  const sections = systems.map(systemSection);
  // The skip link targets the first catalogue section, so it lands past the
  // search and the jump links rather than on the header.
  //
  // It must **not** take that section's id: every section already carries
  // `system-<id>`, which its own jump pill scrolls to. Overwriting the first
  // one with `content` left that pill pointing at an element that no longer
  // existed, so the first system in the catalogue was the one system you could
  // not jump to. The skip link is given the id the section already has.
  const skipTargetId = sections[0]?.id ?? null;
  if (sections[0]) {
    sections[0].setAttribute('tabindex', '-1');
    sections[0].setAttribute('data-skip-target', '');
  }
  const totalScenes = scopedScenes.length;

  let searchControls = null;
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
    searchControls?.setLanguage(mode);
  });

  // The shell's own destinations, in the shell's own words. Which one is
  // missing says where you are, and Lab is offered only when the release gate
  // has already opened it — during the beta it is a locked route.
  const headerActions = el('div', { class: 'explorer-header-actions' }, [
    ...shellNavAnchors({
      current: isLab ? 'lab' : 'models',
      labUnlocked: !beta,
      className: 'explorer-shell-link',
    }),
    accountButton,
    languageToggle.element,
  ]);

  const jump = el(
    'nav',
    { class: 'explorer-jump', 'aria-label': 'Body systems' },
    systems.map((system) => {
      const link = el(
        'a',
        {
          class: 'scene-pill',
          href: `#system-${system.id}`,
          on: {
            click: (event) => {
              event.preventDefault();
              document.getElementById(`system-${system.id}`)?.scrollIntoView({
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                block: 'start',
              });
            },
          },
        },
        [
          el('span', { class: 'lang-en', text: system.label }),
          el('span', { class: 'lang-ja', text: system.labelJa }),
        ]
      );
      jumpLinks.set(system.id, link);
      return link;
    })
  );

  const noResults = el('section', { class: 'panel explorer-no-results', hidden: '' }, [
    el('strong', { class: 'lang-en', text: 'No matching scenes' }),
    el('strong', { class: 'lang-ja', text: '該当するシーンがありません' }),
    el('span', { class: 'lang-en', text: 'Try a broader term or clear one of the filters.' }),
    el('span', { class: 'lang-ja', text: '検索語を短くするか、フィルタを解除してください。' }),
  ]);

  let activeFilters = { query: '', mode: 'all', status: 'all', review: 'all' };

  const favoriteShelfItems = el('div', { class: 'explorer-library-items' });
  const recentShelfItems = el('div', { class: 'explorer-library-items' });
  const favoriteShelf = el('section', { class: 'explorer-library-group', hidden: '' }, [
    el('h2', { class: 'explorer-library-title' }, [
      el('span', { class: 'lang-en', text: 'Favorites' }),
      el('span', { class: 'lang-ja', text: 'お気に入り' }),
    ]),
    favoriteShelfItems,
  ]);
  const recentShelf = el('section', { class: 'explorer-library-group', hidden: '' }, [
    el('h2', { class: 'explorer-library-title' }, [
      el('span', { class: 'lang-en', text: 'Recently viewed' }),
      el('span', { class: 'lang-ja', text: '最近見たシーン' }),
    ]),
    recentShelfItems,
  ]);
  const libraryShelf = el('section', { class: 'panel explorer-library', hidden: '' }, [
    favoriteShelf,
    recentShelf,
  ]);

  const search = createExplorerSearchControls({
    scope,
    onChange: (filters) => {
      activeFilters = filters;
      applyFilters();
    },
  });
  searchControls = search;

  // The organs there is actually something to open, named from the manifest.
  // "brain and heart" printed over one brain model is the claim this avoids.
  const betaOrganLabels = PUBLIC_MANIFEST.organs.map((organId) => organById(organId));
  const betaOrgansEn = betaOrganLabels
    .map((organ, index) => organ?.label?.toLowerCase() ?? PUBLIC_MANIFEST.organs[index])
    .join(' and ');
  const betaOrgansJa = betaOrganLabels
    .map((organ, index) => organ?.labelJa ?? PUBLIC_MANIFEST.organs[index])
    .join('と');

  const headerTitle = isLab
    ? ['Experimental Lab', '実験モデル']
    : ['Organ explorer', '臓器エクスプローラ'];
  const subtitle = isLab
    ? [
        'Prototype scenes and planned questions live here, explicitly separated from the public catalogue.',
        'Prototypeシーンと開発予定の問いを、公開カタログから明確に分離して掲載します。',
      ]
    : beta
      ? [
          `Beta: 3D anatomy — free, no account. Open now: the ${betaOrgansEn}. The beta is aiming at the brain and the heart, and it publishes each one when its anatomy is finished, never a disease model in its place. The disease and physiology models are still being built and are not listed here.`,
          `β版：3D解剖モデルです（無料・登録不要）。いま公開しているのは${betaOrgansJa}。目標は脳と心臓の2つで、解剖が仕上がったものから公開します——代わりに病態モデルを出すことはしません。病態・生理のモデルは開発中で、ここには載せていません。`,
        ]
      : [
          'Explore anatomy and pathophysiology with model maturity and clinical-review status shown separately. Work in progress lives in the Lab.',
          '解剖・病態モデルを、モデル成熟度と医学レビュー状態を分けて確認できます。開発中のモデルは実験室に掲載します。',
        ];

  const productKey = beta
    ? el('div', { class: 'explorer-product-key is-beta' }, [
        el('span', { class: 'explorer-access-badge is-free' }, [
          el('span', { class: 'lang-en', text: `Beta — ${betaOrgansEn} anatomy` }),
          el('span', { class: 'lang-ja', text: `β版 — ${betaOrgansJa}の解剖を公開中` }),
        ]),
        bilingual(
          'An open model has its mesh, its licence and its sources on the record, and a publication decision tied to the exact file being served. Model maturity and clinical review are shown separately on every card, because they are different claims.',
          '公開しているモデルは、メッシュの出典とライセンスを記録し、実際に配信しているファイルに結びつけた公開判断を持つものです。実装の成熟度と医学レビューの状態は、別々の主張なのでカードに別々に表示します。',
          'explorer-product-note'
        ),
      ])
    : isLab
    ? el('div', { class: 'explorer-product-key is-lab' }, [
        el('span', { class: 'explorer-access-badge is-lab' }, [
          el('span', { class: 'lang-en', text: 'Experimental' }),
          el('span', { class: 'lang-ja', text: '実験段階' }),
        ]),
        bilingual(
          'Prototype motion/geometry may be schematic and is not presented as medically reviewed content.',
          'Prototypeの形状・動きは模式的で、医学的レビュー済みコンテンツとしては提示しません。',
          'explorer-product-note'
        ),
      ])
    : el('div', { class: 'explorer-product-key' }, [
        el('span', { class: 'explorer-access-badge is-free' }, [
          el('span', { class: 'lang-en', text: 'Core models are free' }),
          el('span', { class: 'lang-ja', text: '基本モデルは無料' }),
        ]),
        bilingual(
          'Some professional tools for patient explanation and medical education require a subscription.',
          '患者説明・医学教育向けの一部機能は有料です。',
          'explorer-product-note'
        ),
        bilingual(
          'Model maturity and versioned clinical review are different trust signals and are shown separately on each card.',
          'モデルの成熟度と、版を固定した医学レビューは別のTrust指標として各カードに表示します。',
          'explorer-product-note'
        ),
      ]);

  const useLanes = isLab
    ? null
    : el('section', { class: 'explorer-use-lanes', 'aria-label': 'Three product uses' }, [
        el('div', { class: 'explorer-use-lanes-heading' }, [
          bilingual('Three ways to use the models', '3つの使い方', 'explorer-use-lanes-title'),
          bilingual(
            'The same physiology needs a different explanation and safety boundary for each setting.',
            '同じ病態でも、用途ごとに説明の深さと安全境界を分けます。',
            'explorer-use-lanes-note'
          ),
        ]),
        el('div', { class: 'explorer-use-lane-grid' }, [
          useLane('01', 'Patient explanation', '患者説明',
            'A calm visual story with plain language and only the controls needed for conversation. Shown on a model only after a versioned clinical review; models still under review carry no patient badge.',
            '平易な言葉と必要最小限の操作で、患者さんとの会話に使える説明。版を固定した医学レビュー完了後にモデルごとに有効化し、レビュー未完了のモデルには患者説明バッジを表示しません。'),
          useLane('02', 'Medical education', '医学教育',
            'Mechanism, comparison, prediction and feedback from one internally consistent model.',
            '1つの整合したモデルで、機序・比較・予測・フィードバックまで学ぶ。'),
          useLane('03', 'Clinical case learning', '臨床ケース学習',
            'Currently limited to case-based review of mechanism. Patient-specific dose adjustment (for example dobutamine, DOB), treatment recommendation, diagnosis, severity grading and decision support are not provided in this product. Any future clinical decision support would be a separately validated product.',
            '現在提供するのは症例ベースの機序確認までです。患者別の用量調整（ドブタミン（DOB）など）、治療推奨、診断、重症度判定、意思決定支援は本製品では提供しません。将来の臨床意思決定支援は、別途検証された製品として扱います。',
            'is-clinical'),
        ]),
      ]);

  // A `main` landmark, not a `div`: the Explorer is the page on this route, and
  // a screen reader's landmark list is how somebody reaches it without tabbing
  // through the header. The skip link targets the first catalogue section
  // rather than this element, so it lands past the search and the jump links.
  const element = el('main', { class: `explorer${isLab ? ' is-lab' : ' is-public'}` }, [
    el('header', { class: 'panel explorer-header' }, [
      el('p', { class: 'eyebrow', text: 'medical-3d-lab' }),
      el('h1', { class: 'title' }, [
        el('span', { class: 'lang-en', text: headerTitle[0] }),
        el('span', { class: 'lang-ja', text: headerTitle[1] }),
      ]),
      el('p', { class: 'subtitle' }, [
        el('span', { class: 'lang-en', text: subtitle[0] }),
        el('span', { class: 'lang-ja', text: subtitle[1] }),
      ]),
      productKey,
      useLanes,
      search.element,
      jump,
      headerActions,
    ]),
    libraryShelf,
    noResults,
    ...sections,
    el('footer', { class: 'panel explorer-footer' }, [
      el('p', {}, [
        el('span', {
          class: 'lang-en',
          text: isLab
            ? 'Lab is intentionally experimental. Prototype scenes may use stylised anatomy or placeholder motion and must not be read as reviewed medical models.'
            : beta
              ? 'Educational conceptual models. Model maturity and versioned clinical review are different trust signals and are shown separately on every open card. The models still being built are not listed here; Sources & review records the state of every one of them, opened or not.'
              : 'Educational conceptual models. Clinical-review attestation is shown separately from product/model maturity; Prototype work is kept in the Experimental Lab.',
        }),
        el('span', {
          class: 'lang-ja',
          text: isLab
            ? 'Labは意図的に実験段階です。Prototypeには簡略化された解剖や仮の動きが含まれ、レビュー済み医学モデルとして解釈しないでください。'
            : beta
              ? '教育目的の概念モデルです。モデルの成熟度と、版を固定した医学レビューは別のTrust指標として各カードに表示します。開発中のモデルはここには載せていません。公開・未公開を問わず、全モデルのレビュー状態は「根拠・レビュー」で確認できます。'
              : '教育目的の概念モデルです。医学レビューの状態はモデル成熟度とは別に表示し、PrototypeはExperimental Labに分離しています。',
        }),
      ]),
    ]),
  ]);

  // No sections means an empty shelf, and nothing to skip to. A skip link
  // pointing at an element that does not exist falls through to the browser's
  // default, which is the hash navigation this whole fix exists to prevent.
  ui.append(...(skipTargetId ? [skipLink(skipTargetId)] : []), element);
  languageToggle.init();
  syncLibrary();
  applyFilters();
  if (!isLab) {
    for (const mount of previewMounts) {
      previewCleanups.push(mountOrganPreview(mount.element, mount.organId));
    }
  }

  // Slash is a conventional catalogue-search shortcut and is otherwise unused
  // on this plain-DOM route. Do not steal it from a text field.
  const searchShortcut = (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    search.focus();
  };
  window.addEventListener('keydown', searchShortcut);

  document.title = isLab
    ? 'Experimental Lab — Medical 3D Lab'
    : 'Organ explorer — Medical 3D Lab';

  return {
    element,
    route: isLab ? LAB_ROUTE : EXPLORER_ROUTE,
    search,
    dispose() {
      window.removeEventListener('keydown', searchShortcut);
      while (previewCleanups.length) previewCleanups.pop()?.();
    },
  };

  /**
   * What the preview actually does on this device, so the caption never
   * promises a rotation the reader asked not to see, or a hover a touch screen
   * cannot make.
   */
  function previewCaption() {
    const caption = el('span', { class: 'explorer-preview-caption' });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia?.('(pointer: coarse)');
    const render = () => {
      const [en, ja] = reduced?.matches
        ? ['Still 3D orientation preview (reduced motion)', '3D概観・静止画（動きを減らす設定を反映）']
        : coarse?.matches
          ? ['Slow 3D orientation preview · pauses while touched', '3D概観・ゆっくり自動回転（触れている間は停止）']
          : ['Slow 3D orientation preview · pauses on hover', '3D概観・ゆっくり自動回転（ポインタを重ねると停止）'];
      caption.replaceChildren(
        el('span', { class: 'lang-en', text: en }),
        el('span', { class: 'lang-ja', text: ja })
      );
    };
    render();
    reduced?.addEventListener?.('change', render);
    coarse?.addEventListener?.('change', render);
    previewCleanups.push(() => {
      reduced?.removeEventListener?.('change', render);
      coarse?.removeEventListener?.('change', render);
    });
    return caption;
  }

  function useLane(number, titleEn, titleJa, noteEn, noteJa, className = '') {
    return el('article', { class: `explorer-use-lane ${className}`.trim() }, [
      el('span', { class: 'explorer-use-lane-number', text: number }),
      bilingual(titleEn, titleJa, 'explorer-use-lane-title'),
      bilingual(noteEn, noteJa, 'explorer-use-lane-note'),
    ]);
  }

  function libraryShortcut(scene, recent = false) {
    return el('a', { class: 'explorer-library-link', href: sceneRoute(scene) }, [
      el('span', {
        class: 'explorer-library-mark',
        'aria-hidden': 'true',
        text: recent ? '↺' : '★',
      }),
      el('span', { class: 'explorer-library-name' }, [
        el('span', { class: 'lang-en', text: scene.titleEn }),
        el('span', { class: 'lang-ja', text: scene.titleJa }),
      ]),
      badge(scene.status),
    ]);
  }

  function syncLibrary(library = readSceneLibrary()) {
    const saved = new Set(library.favorites.filter((id) => scopedIds.has(id)));
    for (const [sceneId, buttons] of favoriteButtons) {
      const isSaved = saved.has(sceneId);
      for (const button of buttons) {
        button.textContent = isSaved ? '★' : '☆';
        button.setAttribute('aria-pressed', String(isSaved));
        button.setAttribute(
          'aria-label',
          isSaved ? 'Remove from favorites / お気に入りから外す' : 'Add to favorites / お気に入りに追加'
        );
        button.title = isSaved ? 'Remove from favorites / お気に入りから外す' : 'Add to favorites / お気に入りに追加';
      }
    }

    const favorites = library.favorites
      .filter((id) => scopedIds.has(id))
      .map(sceneById)
      .filter(Boolean);
    const recent = library.recent
      .filter((id) => scopedIds.has(id) && !saved.has(id))
      .map(sceneById)
      .filter(Boolean);

    favoriteShelfItems.replaceChildren(...favorites.map((scene) => libraryShortcut(scene)));
    recentShelfItems.replaceChildren(...recent.map((scene) => libraryShortcut(scene, true)));
    favoriteShelf.hidden = favorites.length === 0;
    recentShelf.hidden = recent.length === 0;

    const filtering =
      activeFilters.query.trim() !== '' ||
      activeFilters.mode !== 'all' ||
      activeFilters.status !== 'all' ||
      activeFilters.review !== 'all';
    libraryShelf.hidden = filtering || (favorites.length === 0 && recent.length === 0);
  }

  function applyFilters() {
    const visibleSceneIds = new Set();
    const visiblePlannedIds = new Set();
    let visibleBacklog = 0;

    for (const view of organViews) {
      let organVisible = false;

      for (const record of view.scenes) {
        const matches = sceneMatchesExplorerFilters(record, activeFilters);
        record.element.hidden = !matches;
        if (matches) {
          organVisible = true;
          visibleSceneIds.add(record.scene.id);
        }
      }

      for (const record of view.planned) {
        const matches = plannedMatchesExplorerFilters(record, activeFilters);
        record.element.hidden = !matches;
        if (matches) {
          organVisible = true;
          visiblePlannedIds.add(record.planned.id ?? record.planned.slug ?? `${record.system.id}:${record.organ.id}:${record.planned.titleEn}`);
        }
      }

      if (view.empty) {
        const matches = emptyOrganMatchesExplorerFilters(view.empty, activeFilters);
        view.empty.element.hidden = !matches;
        if (matches) {
          organVisible = true;
          visibleBacklog += 1;
        }
      }

      view.element.hidden = !organVisible;
    }

    for (const [systemId, view] of systemViews) {
      const visibleIds = new Set();
      let systemVisible = false;
      for (const organ of view.organs) {
        if (!organ.element.hidden) systemVisible = true;
        for (const record of organ.scenes) {
          if (!record.element.hidden) visibleIds.add(record.scene.id);
        }
      }
      view.element.hidden = !systemVisible;
      view.count.textContent = String(visibleIds.size);
      const link = jumpLinks.get(systemId);
      if (link) link.hidden = !systemVisible;
    }

    const anythingVisible = visibleSceneIds.size + visiblePlannedIds.size + visibleBacklog > 0;
    noResults.hidden = anythingVisible;
    search.setCount({
      visible: visibleSceneIds.size,
      total: totalScenes,
      planned: visiblePlannedIds.size,
    });
    syncLibrary();
  }
}
