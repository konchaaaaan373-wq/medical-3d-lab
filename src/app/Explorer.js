import { el, skipLink } from '../utils/dom.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createExplorerSearchControls } from '../components/ExplorerSearchControls.js';
import { createClinicalReviewDetails } from '../components/ClinicalReviewDetails.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { hasOrganPreview, mountOrganPreview } from './organPreview.js';
import '../styles/clinical-review.css';
import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LAB_SCENES,
  LANDING_ROUTE,
  PUBLIC_SCENES,
  sceneById,
  sceneRoute,
  statusById,
  systemsWithOrgans,
} from '../catalog/index.js';
import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { productBadgesForScene } from '../access/features.js';
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
export function createExplorer({ ui, accountButton = null, scope = 'public' }) {
  const isLab = scope === 'lab';
  const scopedScenes = isLab ? LAB_SCENES : PUBLIC_SCENES;
  const scopedIds = new Set(scopedScenes.map((scene) => scene.id));
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
  const textbookTitles = Object.freeze({
    'amyloid-beta': ['Amyloid-β aggregation in Alzheimer disease', 'Alzheimer病：アミロイドβ凝集'],
    circulation: ['Low cardiac output and oxygen delivery', '低心拍出量と酸素供給'],
    'pulmonary-edema': ['Pulmonary oedema', '肺水腫'],
    'renal-filtration': ['AKI, CKD and nephrotic syndrome', 'AKI・CKD・ネフローゼ症候群'],
  });

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

  const useBadges = (scene) =>
    el(
      'span',
      { class: 'explorer-use-badges', 'aria-label': 'Intended uses / 想定用途' },
      (scene.uses ?? ['education']).map((id) => {
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

  const sceneCard = (scene, system, organ) => {
    const title = textbookTitles[scene.id] ?? [scene.titleEn, scene.titleJa];
    const link = el('a', { class: 'explorer-scene', href: sceneRoute(scene) }, [
      el('span', { class: 'explorer-scene-kicker' }, [
        bilingual(
          scene.disease ? 'Pathophysiology' : 'Anatomy & physiology',
          scene.disease ? '病態モデル' : '解剖・生理',
          'explorer-scene-kind'
        ),
        badge(scene.status),
      ]),
      el('span', { class: 'explorer-scene-title' }, [
        el('span', { class: 'lang-en', text: title[0] }),
        el('span', { class: 'lang-ja', text: title[1] }),
      ]),
      el('span', { class: 'explorer-scene-note' }, [
        el('span', { class: 'lang-en', text: scene.description }),
        el('span', { class: 'lang-ja', text: scene.descriptionJa }),
      ]),
      el('span', { class: 'explorer-scene-footer' }, [
        useBadges(scene),
        bilingual('Open model', 'モデルを開く', 'explorer-scene-open'),
      ]),
      el('span', { class: 'explorer-scene-trust' }, [productBadges(scene), reviewBadge(scene)]),
    ]);
    const children = [link, favoriteButtonFor(scene)];
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
        preview
          ? bilingual(
              'Slow 3D orientation preview · pauses on hover',
              '3D概観・ゆっくり自動回転（触れると停止）',
              'explorer-preview-caption'
            )
          : null,
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

  const headerActions = el('div', { class: 'explorer-header-actions' }, [
    el('a', { class: 'explorer-shell-link', href: LANDING_ROUTE }, [
      el('span', { class: 'lang-en', text: 'Home' }),
      el('span', { class: 'lang-ja', text: 'ホーム' }),
    ]),
    el('a', { class: 'explorer-shell-link', href: isLab ? EXPLORER_ROUTE : LAB_ROUTE }, [
      el('span', { class: 'lang-en', text: isLab ? 'Public models' : 'Lab' }),
      el('span', { class: 'lang-ja', text: isLab ? '公開モデル' : '実験室' }),
    ]),
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

  const headerTitle = isLab
    ? ['Experimental Lab', '実験モデル']
    : ['Organ explorer', '臓器エクスプローラ'];
  const subtitle = isLab
    ? [
        'Prototype scenes and planned questions live here, explicitly separated from the public catalogue.',
        'Prototypeシーンと開発予定の問いを、公開カタログから明確に分離して掲載します。',
      ]
    : [
        'Explore anatomy and pathophysiology with model maturity and clinical-review status shown separately. Work in progress lives in the Lab.',
        '解剖・病態モデルを、モデル成熟度と医学レビュー状態を分けて確認できます。開発中のモデルは実験室に掲載します。',
      ];

  const productKey = isLab
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
            'A calm visual story with plain language and only the controls needed for conversation.',
            '平易な言葉と必要最小限の操作で、患者さんとの会話に使える説明。'),
          useLane('02', 'Medical education', '医学教育',
            'Mechanism, comparison, prediction and feedback from one internally consistent model.',
            '1つの整合したモデルで、機序・比較・予測・フィードバックまで学ぶ。'),
          useLane('03', 'Clinical application', '臨床応用',
            'Case-based mechanism review is available. Patient-specific dosing or recommendations require a separate validated product and are not enabled here.',
            '症例ベースの機序確認まで。DOBなどの患者別用量調整・推奨は、別の検証済み製品として扱い、ここでは有効化しません。',
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
            : 'Educational conceptual models. Clinical-review attestation is shown separately from product/model maturity; Prototype work is kept in the Experimental Lab.',
        }),
        el('span', {
          class: 'lang-ja',
          text: isLab
            ? 'Labは意図的に実験段階です。Prototypeには簡略化された解剖や仮の動きが含まれ、レビュー済み医学モデルとして解釈しないでください。'
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
