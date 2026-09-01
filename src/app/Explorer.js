import { el } from '../utils/dom.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createExplorerSearchControls } from '../components/ExplorerSearchControls.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { EXPLORER_ROUTE, sceneRoute, statusById, systemsWithOrgans } from '../catalog/index.js';
import { productBadgesForScene } from '../access/features.js';
import {
  emptyOrganMatchesExplorerFilters,
  plannedMatchesExplorerFilters,
  sceneMatchesExplorerFilters,
} from './explorerSearch.js';

/**
 * The organ explorer: the whole catalogue on one page.
 *
 * Deliberately plain DOM and no Three.js. Opening this page must not build a
 * single piece of geometry — the scene modules stay unloaded until one is
 * chosen, which is the difference between a catalogue that can grow to a
 * hundred entries and one that cannot.
 *
 * It draws itself from `src/catalog/`, so a new scene appears here the moment
 * it is registered. Organs with no scene yet are still listed: the gap is
 * information, and hiding it would quietly turn the backlog invisible.
 *
 * Search is also catalogue-driven. Matching never imports a scene module; it
 * reads only manifest/taxonomy/product metadata, so a 100-scene catalogue does
 * not turn the Explorer into a 100-scene JavaScript bundle.
 *
 * @param {{ ui: HTMLElement, accountButton?: HTMLElement }} mounts
 */
export function createExplorer({ ui, accountButton = null }) {
  const systems = systemsWithOrgans();
  const organViews = [];
  const systemViews = new Map();
  const jumpLinks = new Map();

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
      productBadgesForScene(scene).map((entry) =>
        el('span', { class: `explorer-access-badge is-${entry.kind}` }, [
          entry.kind === 'paid'
            ? el('span', { class: 'explorer-access-lock', 'aria-hidden': 'true', text: '◇' })
            : null,
          el('span', { class: 'lang-en', text: entry.label }),
          el('span', { class: 'lang-ja', text: entry.labelJa }),
        ])
      )
    );

  const sceneCard = (scene, system, organ) => {
    const element = el('a', { class: 'explorer-scene', href: sceneRoute(scene) }, [
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
    return { scene, system, organ, element };
  };

  /** A disease scene that is declared but not built. Shown, not hidden. */
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

  // Build the catalogue records before the search control. Its first update can
  // therefore filter the complete catalogue without waiting for anything else.
  const sections = systems.map(systemSection);
  const totalScenes = new Set(systems.flatMap((system) => system.scenes.map((scene) => scene.id))).size;

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const headerActions = el('div', { class: 'explorer-header-actions' }, [
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
  const search = createExplorerSearchControls({
    onChange: (filters) => {
      activeFilters = filters;
      applyFilters();
    },
  });

  const element = el('div', { class: 'explorer' }, [
    el('header', { class: 'panel explorer-header' }, [
      el('p', { class: 'eyebrow', text: 'medical-3d-lab' }),
      el('h1', { class: 'title' }, [
        el('span', { class: 'lang-en', text: 'Organ explorer' }),
        el('span', { class: 'lang-ja', text: '臓器エクスプローラ' }),
      ]),
      el('p', { class: 'subtitle' }, [
        el('span', {
          class: 'lang-en',
          text: 'Make invisible physiology visible, interactive and understandable — across the whole body.',
        }),
        el('span', { class: 'lang-ja', text: '見えない病態生理を、3D で動かして理解する — 全身を対象に。' }),
      ]),
      el('div', { class: 'explorer-product-key' }, [
        el('span', { class: 'explorer-access-badge is-free' }, [
          el('span', { class: 'lang-en', text: 'Core model stays free' }),
          el('span', { class: 'lang-ja', text: '基本モデルは無料' }),
        ]),
        el('span', { class: 'explorer-product-note' }, [
          el('span', { class: 'lang-en', text: 'Patient and Education badges mark optional paid professional-use modes.' }),
          el('span', { class: 'lang-ja', text: '患者説明・医学教育の表示は、追加の有料プロフェッショナル機能があるシーンです。' }),
        ]),
      ]),
      search.element,
      jump,
      headerActions,
    ]),
    noResults,
    ...sections,
    el('footer', { class: 'panel explorer-footer' }, [
      el('p', {}, [
        el('span', {
          class: 'lang-en',
          text:
            'Educational conceptual models. Scenes marked Prototype are stylised shapes with placeholder motion and have not been anatomically validated.',
        }),
        el('span', {
          class: 'lang-ja',
          text:
            '教育目的の概念モデルです。Prototype 表示のシーンは簡略化された形状と仮の動きで構成され、解剖学的な検証は受けていません。',
        }),
      ]),
    ]),
  ]);

  ui.append(element);
  languageToggle.init();
  applyFilters();

  // Slash is a conventional catalogue-search shortcut and is otherwise unused
  // on this plain-DOM route. Do not steal it from a text field.
  window.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    search.focus();
  });

  document.title = 'Organ explorer — medical-3d-lab';

  return { element, route: EXPLORER_ROUTE, search };

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
  }
}
