import { el, skipLink } from '../utils/dom.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createExplorerSearchControls } from '../components/ExplorerSearchControls.js';
import { prefersReducedMotion } from '../utils/motion.js';
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
 * Lab includes Prototype (and the declared backlog) explicitly. Neither route
 * imports Three.js or a scene module.
 *
 * Favorites and recents store scene IDs only — never model controls, patient
 * information, account state or clinical data.
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
    const link = el('a', { class: 'explorer-scene', href: sceneRoute(scene) }, [
      el('span', { class: 'explorer-scene-title' }, [
        el('span', { class: 'lang-en', text: scene.titleEn }),
        el('span', { class: 'lang-ja', text: scene.titleJa }),
        badge(scene.status),
      ]),
      productBadges(scene),
      el('span', { class: 'explorer-scene-note' }, [
        el('span', { class: 'lang-en', text: scene.description }),
        el('span', { class: 'lang-ja', text: scene.descriptionJa }),
      ]),
    ]);
    const element = el('div', { class: 'explorer-scene-shell' }, [link, favoriteButtonFor(scene)]);
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

    const element = el('div', { class: `explorer-organ${organ.scenes.length ? '' : ' is-empty'}` }, [
      el('h3', { class: 'explorer-organ-name' }, [
        el('span', { class: 'lang-en', text: organ.label }),
        el('span', { class: 'lang-ja', text: organ.labelJa }),
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
  // `tabindex="-1"` so that following the skip link actually moves focus, not
  // just the scroll position — without it the next Tab returns to the header.
  if (sections[0]) {
    sections[0].id = 'content';
    sections[0].setAttribute('tabindex', '-1');
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

  let activeFilters = { query: '', mode: 'all', status: 'all' };

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
        'Explore medically reviewed and model-backed views of anatomy and pathophysiology. Work in progress lives in the Lab.',
        '医学レビュー済みの解剖・病態モデルを掲載しています。開発中のモデルは実験室で確認できます。',
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
            : 'Educational conceptual models. Prototype work is intentionally separated into the Experimental Lab.',
        }),
        el('span', {
          class: 'lang-ja',
          text: isLab
            ? 'Labは意図的に実験段階です。Prototypeには簡略化された解剖や仮の動きが含まれ、レビュー済み医学モデルとして解釈しないでください。'
            : '教育目的の概念モデルです。Prototypeは公開カタログから分離し、Experimental Labに掲載しています。',
        }),
      ]),
    ]),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  syncLibrary();
  applyFilters();

  // Slash is a conventional catalogue-search shortcut and is otherwise unused
  // on this plain-DOM route. Do not steal it from a text field.
  window.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    search.focus();
  });

  document.title = isLab
    ? 'Experimental Lab — Medical 3D Lab'
    : 'Organ explorer — Medical 3D Lab';

  return { element, route: isLab ? LAB_ROUTE : EXPLORER_ROUTE, search };

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
      activeFilters.query.trim() !== '' || activeFilters.mode !== 'all' || activeFilters.status !== 'all';
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
